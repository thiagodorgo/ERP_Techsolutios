import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import pino from "pino";

import { createTraccarForwardAuthenticator } from "../src/integrations/traccar/traccar-forward-auth.js";
import { createTraccarIngestApp, TRACCAR_INGEST_PATH } from "../src/integrations/traccar/traccar-ingest.app.js";
import { createTraccarIngestLimiter } from "../src/integrations/traccar/traccar-rate-limit.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · taxa e concorrência da ingestão (plano v2.1 §4.6; A2-11; MUT-30). Token bucket por processo
// (20/s sustentadas, rajada de 100) e no máximo 10 em processamento; relógio injetado, sem dependência nova.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8");
const SECRET = "rate-limit-forward-secret-0123456789-abcdefghij";

function limiter(start = 1_000_000) {
  let now = start;
  const instance = createTraccarIngestLimiter({
    ratePerSecond: 20,
    burst: 100,
    maxConcurrency: 1_000,
    now: () => now,
  });
  return { instance, advance: (ms: number) => (now += ms) };
}

test("taxa: a rajada de 100 passa e a 101ª é recusada (429)", { timeout: 30_000 }, () => {
  const { instance } = limiter();
  for (let index = 0; index < 100; index++) {
    const slot = instance.tryEnter();
    assert.equal(slot.ok, true, `a ${index + 1}ª da rajada devia passar`);
    if (slot.ok) slot.release();
  }
  const extra = instance.tryEnter();
  assert.equal(extra.ok, false);
  if (!extra.ok) assert.equal(extra.reason, "rate");
});

test("taxa: depois de 1 s, 20 novas passam e a 21ª não", { timeout: 30_000 }, () => {
  const { instance, advance } = limiter();
  for (let index = 0; index < 100; index++) {
    const slot = instance.tryEnter();
    if (slot.ok) slot.release();
  }
  assert.equal(instance.tryEnter().ok, false);
  advance(1_000);
  for (let index = 0; index < 20; index++) {
    const slot = instance.tryEnter();
    assert.equal(slot.ok, true, `a ${index + 1}ª depois de 1 s devia passar`);
    if (slot.ok) slot.release();
  }
  assert.equal(instance.tryEnter().ok, false);
});

test("concorrência: com 10 em processamento, a 11ª é recusada (429)", { timeout: 30_000 }, () => {
  let now = 0;
  const instance = createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10, now: () => now });
  const held = [];
  for (let index = 0; index < 10; index++) {
    const slot = instance.tryEnter();
    assert.equal(slot.ok, true);
    held.push(slot);
  }
  const eleventh = instance.tryEnter();
  assert.equal(eleventh.ok, false);
  if (!eleventh.ok) assert.equal(eleventh.reason, "concurrency");
  now += 1;
});

test("concorrência: liberada uma vaga, a seguinte passa", { timeout: 30_000 }, () => {
  const instance = createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10, now: () => 0 });
  const held: Array<{ ok: true; release: () => void }> = [];
  for (let index = 0; index < 10; index++) {
    const slot = instance.tryEnter();
    assert.ok(slot.ok);
    held.push(slot);
  }
  assert.equal(instance.tryEnter().ok, false);
  held[0]!.release();
  held[0]!.release(); // liberar duas vezes não abre vaga extra
  const next = instance.tryEnter();
  assert.equal(next.ok, true);
  assert.equal(instance.tryEnter().ok, false, "liberação dupla não pode abrir duas vagas");
});

// Conserto do 503 (pré-revisão do #426, Achado 1): o 503 por tempo esgotado sai antes de o trabalho terminar. Se a vaga
// voltasse no `finish` da resposta, `maxConcurrency` limitaria respostas, não trabalho: uma 2ª requisição entraria com
// a 1ª ainda rodando no banco. A vaga cobre a requisição E o trabalho que ela disparou.
test("concorrência: a vaga só volta quando o TRABALHO termina, não quando o 503 por tempo é enviado", { timeout: 30_000 }, async () => {
  let finishFirstWork!: () => void;
  const firstWorkMayEnd = new Promise<void>((resolve) => {
    finishFirstWork = resolve;
  });
  let calls = 0;
  const instance = createTraccarIngestLimiter({ ratePerSecond: 1_000, burst: 1_000, maxConcurrency: 1 });
  const app = createTraccarIngestApp({
    authenticator: createTraccarForwardAuthenticator({ current: SECRET }),
    limiter: instance,
    // Serviço falso que IGNORA o prazo, como o trabalho real que segue no banco depois do 503.
    ingest: async () => {
      calls += 1;
      if (calls === 1) await firstWorkMayEnd;
      return { kind: "stored" };
    },
    instanceKey: "erp-dev",
    timeoutMs: 100,
    logger: pino({ level: "silent" }),
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  const send = async () => {
    const response = await fetch(`http://127.0.0.1:${port}${TRACCAR_INGEST_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
      body: FIXTURE,
    });
    await response.arrayBuffer();
    return response.status;
  };
  try {
    assert.equal(await send(), 503, "a 1ª estoura o prazo");
    assert.equal(instance.inFlight(), 1, "o trabalho da 1ª ainda roda: a vaga continua ocupada depois do 503");
    assert.equal(await send(), 429, "com o trabalho da 1ª no ar, a 2ª não entra");
    assert.equal(calls, 1, "a 2ª nem chegou ao serviço");

    finishFirstWork();
    for (let spin = 0; spin < 100 && instance.inFlight() !== 0; spin++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(instance.inFlight(), 0, "o trabalho terminou: a vaga voltou");
    assert.equal(await send(), 204, "com a vaga de volta, a seguinte passa");
    assert.equal(calls, 2);
  } finally {
    finishFirstWork();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
