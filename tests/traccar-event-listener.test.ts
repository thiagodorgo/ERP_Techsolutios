import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Express } from "express";
import pino from "pino";

import type { TraccarEventCommand } from "../src/integrations/traccar/traccar-event.adapter.js";
import { createTraccarForwardAuthenticator, type TraccarForwardAuthenticator } from "../src/integrations/traccar/traccar-forward-auth.js";
import {
  createTraccarIngestApp,
  TRACCAR_EVENT_INGEST_PATH,
  TRACCAR_INGEST_PATH,
  type TraccarEventIngestHandler,
  type TraccarIngestHandler,
} from "../src/integrations/traccar/traccar-ingest.app.js";
import { createTraccarIngestLimiter } from "../src/integrations/traccar/traccar-rate-limit.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-02 · suíte C — a rota `POST /ingest/traccar/v1/events` no listener PRÓPRIO da ingestão (plano v2 §5.2, §6.6;
// C-06, C-07, C-22): só no app de ingestão, a mesma cadeia e a mesma ordem da rota de posição, o MESMO autenticador, um
// limitador PRÓPRIO, e `ignored` = 204 sem chamar o serviço. Sem banco.
// -----------------------------------------------------------------------------------------------

process.env.LOG_LEVEL = "silent";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET = "event-listener-forward-secret-0123456789-abcdef";
const POSITION = readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8");
const EVENT_TEXT = readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "event-ignition-on.json"), "utf8");
const silent = pino({ level: "silent" });

function eventWith(mutate: (body: Record<string, Record<string, unknown>>) => void = () => undefined): string {
  const body = JSON.parse(EVENT_TEXT) as Record<string, Record<string, unknown>>;
  mutate(body);
  return JSON.stringify(body);
}

function ingestApp(
  overrides: {
    ingestEvent?: TraccarEventIngestHandler;
    ingest?: TraccarIngestHandler;
    positionBurst?: number;
    eventBurst?: number;
    authenticator?: TraccarForwardAuthenticator;
    timeoutMs?: number;
  } = {},
) {
  const eventCalls: TraccarEventCommand[] = [];
  const positionCalls: unknown[] = [];
  const app = createTraccarIngestApp({
    authenticator: overrides.authenticator ?? createTraccarForwardAuthenticator({ current: SECRET }),
    limiter: createTraccarIngestLimiter({ ratePerSecond: 20, burst: overrides.positionBurst ?? 100, maxConcurrency: 10, now: () => 0 }),
    eventLimiter: createTraccarIngestLimiter({ ratePerSecond: 20, burst: overrides.eventBurst ?? 100, maxConcurrency: 10, now: () => 0 }),
    ingest:
      overrides.ingest ??
      (async (command) => {
        positionCalls.push(command);
        return { kind: "stored" };
      }),
    ingestEvent:
      overrides.ingestEvent ??
      (async (command) => {
        eventCalls.push(command);
        return { kind: "stored" };
      }),
    instanceKey: "erp-dev",
    timeoutMs: overrides.timeoutMs ?? 2_000,
    logger: silent,
  });
  return { app, eventCalls, positionCalls };
}

async function listen(app: Express): Promise<{ server: Server; base: string }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${port}` };
}
const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

async function post(base: string, pathname: string, body: string, headers: Record<string, string> = {}): Promise<number> {
  const response = await fetch(`${base}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET, ...headers },
    body,
  });
  await response.arrayBuffer();
  return response.status;
}

async function withApp<T>(built: ReturnType<typeof ingestApp>, work: (base: string) => Promise<T>): Promise<T> {
  const { server, base } = await listen(built.app);
  try {
    return await work(base);
  } finally {
    await close(server);
  }
}

test("listener de evento: a rota chama ingestEvent com o comando canônico", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT), 204);
  });
  assert.equal(built.eventCalls.length, 1);
  assert.equal(built.eventCalls[0]!.kind, "ignition_on");
  assert.equal(built.eventCalls[0]!.instanceKey, "erp-dev");
  assert.equal(built.positionCalls.length, 0);
});

test("listener de evento: o app PÚBLICO não serve a rota de eventos, nem com token válido", { timeout: 60_000 }, async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const { server, base } = await listen(app);
  try {
    for (const pathname of [TRACCAR_EVENT_INGEST_PATH, "/api/v1/ingest/traccar/v1/events", "/api/v1/internal/traccar/events"]) {
      const status = await post(base, pathname, EVENT_TEXT);
      assert.ok(status >= 400, `${pathname} respondeu ${status} no app público`);
    }
  } finally {
    await close(server);
  }
  assert.doesNotMatch(readFileSync(path.join(ROOT, "src", "app.ts"), "utf8"), /traccar/i);
});

test("listener de evento: query string → 400 sem chamar o serviço", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    assert.equal(await post(base, `${TRACCAR_EVENT_INGEST_PATH}?token=${SECRET}`, EVENT_TEXT), 400);
  });
  assert.equal(built.eventCalls.length, 0);
});

test("listener de evento: 401 com header ausente, valor errado, header repetido ou Authorization", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    const noHeader = await fetch(`${base}${TRACCAR_EVENT_INGEST_PATH}`, { method: "POST", headers: { "content-type": "application/json" }, body: EVENT_TEXT });
    await noHeader.arrayBuffer();
    assert.equal(noHeader.status, 401);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT, { "x-traccar-forward-token": "x".repeat(SECRET.length) }), 401);
    const repeated = await fetch(`${base}${TRACCAR_EVENT_INGEST_PATH}`, {
      method: "POST",
      headers: [
        ["content-type", "application/json"],
        ["x-traccar-forward-token", SECRET],
        ["x-traccar-forward-token", SECRET],
      ],
      body: EVENT_TEXT,
    });
    await repeated.arrayBuffer();
    assert.equal(repeated.status, 401);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT, { authorization: `Bearer ${SECRET}` }), 401);
  });
  assert.equal(built.eventCalls.length, 0);
});

test("listener de evento: Content-Type text/plain → 415", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT, { "content-type": "text/plain" }), 415);
  });
  assert.equal(built.eventCalls.length, 0);
});

test("listener de evento: corpo de 64 KiB + 1 → 413", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    const padding = "x".repeat(64 * 1024 + 1);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, eventWith((body) => (body.event.pad = padding as never))), 413);
  });
  assert.equal(built.eventCalls.length, 0);
});

test("listener de evento: JSON inválido → 400 invalid_json", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    const response = await fetch(`${base}${TRACCAR_EVENT_INGEST_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
      body: "{ não é json",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: { code: "invalid_json" } });
  });
});

test("listener de evento: rajada de POSIÇÕES esgota o bucket delas e o evento ainda entra (bucket por rota)", { timeout: 30_000 }, async () => {
  const built = ingestApp({ positionBurst: 1 });
  await withApp(built, async (base) => {
    assert.equal(await post(base, TRACCAR_INGEST_PATH, POSITION), 204);
    assert.equal(await post(base, TRACCAR_INGEST_PATH, POSITION), 429);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT), 204);
  });
  assert.equal(built.eventCalls.length, 1);
});

test("listener de evento: chave reservada → 422 sem chamar o serviço", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, eventWith((body) => (body.event.tenantId = "x" as never))), 422);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, eventWith((body) => (body.device.token = "x" as never))), 422);
  });
  assert.equal(built.eventCalls.length, 0);
});

test("listener de evento: ignored → 204 SEM chamar ingestEvent; e 503 por tempo com a porta de commit fechada", { timeout: 30_000 }, async () => {
  const built = ingestApp();
  await withApp(built, async (base) => {
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, eventWith((body) => (body.event.type = "geofenceEnter" as never))), 204);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, eventWith((body) => (body.event.attributes = { alarm: "naoExiste" } as never, (body.event.type = "alarm" as never)))), 204);
  });
  assert.equal(built.eventCalls.length, 0, "ignored nunca chega ao serviço");

  let claimed: boolean | undefined;
  let finished!: () => void;
  const done = new Promise<void>((resolve) => (finished = resolve));
  const slow = ingestApp({
    timeoutMs: 100,
    ingestEvent: async (_command, deadline) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      claimed = deadline.claimCommit();
      finished();
      return { kind: "stored" };
    },
  });
  await withApp(slow, async (base) => {
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT), 503);
  });
  await done;
  assert.equal(claimed, false, "depois do 503 a porta de commit está fechada: nada é gravado");
});

test("listener de evento: rajada de EVENTOS esgota o bucket deles (ignored conta) e a posição entra; o app de produção cria dois limitadores", { timeout: 60_000 }, async () => {
  const built = ingestApp({ eventBurst: 2 });
  await withApp(built, async (base) => {
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, eventWith((body) => (body.event.type = "geofenceEnter" as never))), 204);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT), 204);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT), 429, "o ignored consumiu a 1ª ficha");
    assert.equal(await post(base, TRACCAR_INGEST_PATH, POSITION), 204);
  });

  // O app de PRODUÇÃO (createTraccarIngestAppFromEnv), num processo filho com TRACCAR_INGEST_BURST=1 e banco inalcançável:
  // se os dois limitadores fossem o mesmo, o evento depois de uma posição levaria 429.
  const probe = `
    const { createTraccarIngestAppFromEnv } = await import("./src/integrations/traccar/traccar-ingestion.service.ts");
    const { createServer } = await import("node:http");
    const pino = (await import("pino")).default;
    const app = await createTraccarIngestAppFromEnv({ logger: pino({ level: "silent" }) });
    const server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = "http://127.0.0.1:" + server.address().port;
    const fs = await import("node:fs");
    const send = async (path, body) => {
      const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", "x-traccar-forward-token": process.env.TRACCAR_FORWARD_SECRET_CURRENT }, body });
      await r.arrayBuffer();
      return r.status;
    };
    const position = fs.readFileSync("infra/traccar/fixtures/6.16.0/position-osmand.json", "utf8");
    const event = fs.readFileSync("infra/traccar/fixtures/6.16.0/event-ignition-on.json", "utf8");
    const statuses = [await send("${TRACCAR_INGEST_PATH}", position), await send("${TRACCAR_INGEST_PATH}", position), await send("${TRACCAR_EVENT_INGEST_PATH}", event), await send("${TRACCAR_EVENT_INGEST_PATH}", event)];
    console.log("STATUSES " + JSON.stringify(statuses));
    server.close();
    process.exit(0);
  `;
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", probe], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 45_000,
    env: {
      ...process.env,
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      DATABASE_URL: "postgresql://nobody:nobody@127.0.0.1:1/none",
      TRACCAR_INGEST_ENABLED: "true",
      TRACCAR_INSTANCE_KEY: "erp-dev",
      TRACCAR_FORWARD_SECRET_CURRENT: SECRET,
      TRACCAR_INGEST_BURST: "1",
      TRACCAR_INGEST_RATE_PER_SECOND: "0.001",
      TRACCAR_INGEST_TIMEOUT_MS: "1500",
    },
  });
  const line = /STATUSES (\[.*\])/.exec(child.stdout ?? "")?.[1];
  assert.ok(line, `o processo filho não respondeu: ${(child.stderr ?? "").slice(-600)}`);
  const statuses = JSON.parse(line) as number[];
  assert.equal(statuses[1], 429, "2ª posição: o bucket de posições esgotou");
  assert.notEqual(statuses[2], 429, "1º evento: o bucket de eventos é OUTRO");
  assert.equal(statuses[3], 429, "2º evento: o bucket de eventos esgotou");
});

test("listener de evento: a rota usa o MESMO autenticador injetado — uma chamada por requisição, nas duas rotas", { timeout: 30_000 }, async () => {
  const real = createTraccarForwardAuthenticator({ current: SECRET });
  let calls = 0;
  const spy: TraccarForwardAuthenticator = (input) => {
    calls += 1;
    return real(input);
  };
  const built = ingestApp({ authenticator: spy });
  await withApp(built, async (base) => {
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT), 204);
    assert.equal(calls, 1);
    assert.equal(await post(base, TRACCAR_EVENT_INGEST_PATH, EVENT_TEXT, { "x-traccar-forward-token": "errado".padEnd(SECRET.length, "0") }), 401);
    assert.equal(calls, 2);
    assert.equal(await post(base, TRACCAR_INGEST_PATH, POSITION), 204);
    assert.equal(calls, 3);
  });
});
