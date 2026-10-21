import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { Writable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";

import pino from "pino";

import { createTraccarForwardAuthenticator } from "../src/integrations/traccar/traccar-forward-auth.js";
import {
  createTraccarIngestApp,
  TRACCAR_EVENT_INGEST_PATH,
  type TraccarEventIngestHandler,
} from "../src/integrations/traccar/traccar-ingest.app.js";
import { createTraccarIngestLimiter } from "../src/integrations/traccar/traccar-rate-limit.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · suíte D — logs da rota de eventos sem segredo, sem coordenada da posição anexada e sem o `type` cru (plano v2
// §5.2, §9.2; C-03, C-08). Logger `pino` REAL com destino em memória; segredo, coordenada e tipo sentinelas.
// O `ignored` é CONTADO: uma linha estruturada `{outcome:"ignored", reason}` — nunca o tipo.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET_SENTINEL = "SENTINELA-SEGREDO-TRC02-7a6b5c4d3e2f1a0b9c8d";
const COORD_DIGITS = "3917264";
const TYPE_SENTINEL = "tipoSentinelaTRCdois";

function body(mutate: (value: Record<string, Record<string, unknown>>) => void = () => undefined): string {
  const value = JSON.parse(
    readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "event-ignition-on.json"), "utf8"),
  ) as Record<string, Record<string, unknown>>;
  value.position!.latitude = -23.5391726;
  value.position!.longitude = -46.6391726;
  mutate(value);
  return JSON.stringify(value);
}

function memoryLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { logger: pino({ level: "info" }, stream), text: () => lines.join(""), lines };
}

async function scenario(ingestEvent: TraccarEventIngestHandler, payload: string, options: { timeoutMs?: number } = {}) {
  const { logger, text, lines } = memoryLogger();
  const app = createTraccarIngestApp({
    authenticator: createTraccarForwardAuthenticator({ current: SECRET_SENTINEL }),
    limiter: createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
    eventLimiter: createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
    ingest: async () => ({ kind: "stored" }),
    ingestEvent,
    instanceKey: "erp-dev",
    timeoutMs: options.timeoutMs ?? 2_000,
    logger,
  });
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${TRACCAR_EVENT_INGEST_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET_SENTINEL },
      body: payload,
    });
    await response.arrayBuffer();
    await new Promise((resolve) => setImmediate(resolve));
    return { status: response.status, log: text(), lines };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function assertClean(result: { status: number; log: string }, expected: number): void {
  assert.equal(result.status, expected);
  assert.match(result.log, new RegExp(`"statusCode":${expected}`), "o desfecho tem de aparecer no log (o teste não pode passar vazio)");
  assert.ok(!result.log.includes(SECRET_SENTINEL), "o segredo apareceu no log");
  assert.ok(!result.log.includes(COORD_DIGITS), "a coordenada da posição anexada apareceu no log");
  assert.ok(!result.log.includes(TYPE_SENTINEL), "o type cru apareceu no log");
  assert.ok(!/x-traccar-forward-token/i.test(result.log), "nome de header no log");
}

test("logs de evento: 204 (gravado) sem segredo, coordenada nem type", { timeout: 30_000 }, async () => {
  assertClean(await scenario(async () => ({ kind: "stored" }), body()), 204);
});

test("logs de evento: 202 (quarentena) sem segredo, coordenada nem type", { timeout: 30_000 }, async () => {
  assertClean(await scenario(async () => ({ kind: "quarantined", reason: "unmapped_device" }), body()), 202);
});

test("logs de evento: 422 (type fora do padrão, com o sentinela) sem segredo, coordenada nem type", { timeout: 30_000 }, async () => {
  assertClean(await scenario(async () => ({ kind: "stored" }), body((value) => (value.event!.type = `${TYPE_SENTINEL}-1`))), 422);
});

test("logs de evento: 503 (serviço estoura o tempo) sem segredo, coordenada nem type", { timeout: 30_000 }, async () => {
  const slow: TraccarEventIngestHandler = () => new Promise((resolve) => setTimeout(() => resolve({ kind: "stored" }), 400));
  assertClean(await scenario(slow, body(), { timeoutMs: 100 }), 503);
});

test("logs de evento: ignored é CONTADO numa linha {outcome:\"ignored\", reason} e o type cru nunca aparece", { timeout: 30_000 }, async () => {
  let called = 0;
  const result = await scenario(async () => {
    called += 1;
    return { kind: "stored" };
  }, body((value) => (value.event!.type = TYPE_SENTINEL)));
  assertClean(result, 204);
  assert.equal(called, 0);
  const counted = result.lines.map((line) => JSON.parse(line) as Record<string, unknown>).filter((line) => line.outcome === "ignored");
  assert.equal(counted.length, 1, "uma linha contada");
  assert.equal(counted[0]!.reason, "unknown_type");
  const alarm = await scenario(async () => ({ kind: "stored" }), body((value) => {
    value.event!.type = "alarm";
    value.event!.attributes = { alarm: TYPE_SENTINEL };
  }));
  assertClean(alarm, 204);
  const alarmLines = alarm.lines.map((line) => JSON.parse(line) as Record<string, unknown>).filter((line) => line.outcome === "ignored");
  assert.deepEqual(alarmLines.map((line) => line.reason), ["unknown_alarm"]);
});
