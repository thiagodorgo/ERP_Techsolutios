import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { connect, type AddressInfo } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import pino from "pino";

import { envSchema } from "../src/config/env.js";
import { createTraccarForwardAuthenticator } from "../src/integrations/traccar/traccar-forward-auth.js";
import {
  createTraccarIngestApp,
  TRACCAR_INGEST_PATH,
  type TraccarIngestHandler,
} from "../src/integrations/traccar/traccar-ingest.app.js";
import { startTraccarIngestListenerIfEnabled } from "../src/integrations/traccar/traccar-ingest.bootstrap.js";
import {
  createTraccarIngestionService,
  type TraccarIngestionService,
} from "../src/integrations/traccar/traccar-ingestion.service.js";
import { createTraccarIngestLimiter } from "../src/integrations/traccar/traccar-rate-limit.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · listener PRÓPRIO da ingestão (plano v2.1 §4.1, §4.6; B-01, A2-02, A2-11).
// O app público (`src/app.ts`) não tem rota do Traccar; o app de ingestão é outro Express, outra porta, só no host
// pedido, desligado por padrão, e a falha do `listen` dele não derruba o processo.
// -----------------------------------------------------------------------------------------------

process.env.LOG_LEVEL = "silent";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET = "listener-forward-secret-0123456789-abcdefghij";
const FIXTURE = readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8");
const silent = pino({ level: "silent" });

function ingestApp(
  overrides: { ingest?: TraccarIngestHandler; burst?: number; maxConcurrency?: number; now?: () => number; timeoutMs?: number } = {},
) {
  const calls: unknown[] = [];
  const ingest: TraccarIngestHandler =
    overrides.ingest ??
    (async (command) => {
      calls.push(command);
      return { kind: "stored" };
    });
  const app = createTraccarIngestApp({
    authenticator: createTraccarForwardAuthenticator({ current: SECRET }),
    limiter: createTraccarIngestLimiter({
      ratePerSecond: 20,
      burst: overrides.burst ?? 100,
      maxConcurrency: overrides.maxConcurrency ?? 10,
      now: overrides.now,
    }),
    ingest,
    instanceKey: "erp-dev",
    timeoutMs: overrides.timeoutMs ?? 2_000,
    logger: silent,
  });
  return { app, calls };
}

async function listen(app: Express): Promise<{ server: Server; base: string }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${port}` };
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", () => resolve()));
  const { port } = probe.address() as AddressInfo;
  await close(probe);
  return port;
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function post(base: string, pathname: string, body: string, headers: Record<string, string> = {}) {
  return fetch(`${base}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET, ...headers },
    body,
  });
}

function rawPost(base: string, pathname: string, body: string): Promise<number> {
  const url = new URL(base);
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest(
      {
        host: url.hostname,
        port: Number(url.port),
        method: "POST",
        path: pathname,
        headers: {
          "content-type": "application/json",
          "x-traccar-forward-token": SECRET,
          "content-length": Buffer.byteLength(body),
        },
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode ?? 0));
      },
    );
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

async function publicApp(): Promise<{ server: Server; base: string; seed: { tenantId: string; userId: string } }> {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "Org Listener Traccar" });
  const user = core.createUser({
    tenantId: tenant.id,
    name: "Técnico Listener",
    email: "trc-listener-operator@example.com",
    roles: ["operator"],
  });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const { server, base } = await listen(app);
  return { server, base, seed: { tenantId: tenant.id, userId: user.id } };
}

function baseEnv(overrides: Record<string, string | undefined>) {
  return {
    NODE_ENV: "test",
    TRACCAR_INGEST_ENABLED: "true",
    TRACCAR_INSTANCE_KEY: "erp-dev",
    TRACCAR_FORWARD_SECRET_CURRENT: SECRET,
    ...overrides,
  };
}

function traccarIssues(input: Record<string, string | undefined>): string[] {
  const result = envSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join(".")).filter((name) => name.startsWith("TRACCAR_"));
}

const PRODUCTION_BASE = {
  NODE_ENV: "production",
  JWT_SECRET: "prod-jwt-secret-for-env-test-only",
  JWT_REFRESH_SECRET: "prod-jwt-refresh-secret-for-env-test-only",
  CORS_ORIGIN: "https://erp.example.com",
  PORTAL_SESSION_SECRET: "prod-portal-session-secret-for-env-test",
  PORTAL_LOG_SECRET: "prod-portal-log-secret-for-env-test",
  PORTAL_AUTHORITY_SESSION_SECRET: "prod-portal-authority-secret-for-env-test",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000000",
  PORTAL_CORS_ORIGIN: "https://portal.example.com",
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://runtime:x@db.internal:5432/erp",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.internal:6379",
};

test("listener: o app público não serve a rota de ingestão, nem com token válido", { timeout: 30_000 }, async () => {
  const { server, base } = await publicApp();
  try {
    for (const pathname of [TRACCAR_INGEST_PATH, "/api/v1/internal/traccar/positions", "/api/v1/ingest/traccar/v1/positions"]) {
      const response = await post(base, pathname, FIXTURE);
      assert.ok(response.status >= 400, `${pathname} respondeu ${response.status} no app público`);
      await response.arrayBuffer();
    }
  } finally {
    await close(server);
  }
});

test("listener: `src/app.ts` não menciona o Traccar", { timeout: 30_000 }, () => {
  const text = readFileSync(path.join(ROOT, "src", "app.ts"), "utf8");
  assert.doesNotMatch(text, /traccar/i);
});

test("listener: o app de ingestão responde 404 a GET no caminho e a POST em outro caminho", { timeout: 30_000 }, async () => {
  const { app, calls } = ingestApp();
  const { server, base } = await listen(app);
  try {
    const get = await fetch(`${base}${TRACCAR_INGEST_PATH}`, { headers: { "x-traccar-forward-token": SECRET } });
    assert.equal(get.status, 404);
    assert.deepEqual(await get.json(), { error: { code: "NOT_FOUND" } });
    const other = await post(base, "/api/v1/field-locations/latest", FIXTURE);
    assert.equal(other.status, 404);
    await other.arrayBuffer();
    assert.equal(calls.length, 0);
  } finally {
    await close(server);
  }
});

test("listener: não emite Access-Control-Allow-Origin", { timeout: 30_000 }, async () => {
  const { app } = ingestApp();
  const { server, base } = await listen(app);
  try {
    const preflight = await fetch(`${base}${TRACCAR_INGEST_PATH}`, {
      method: "OPTIONS",
      headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
    });
    assert.equal(preflight.headers.get("access-control-allow-origin"), null);
    await preflight.arrayBuffer();
    const real = await post(base, TRACCAR_INGEST_PATH, FIXTURE, { origin: "https://evil.example" });
    assert.equal(real.headers.get("access-control-allow-origin"), null);
    await real.arrayBuffer();
  } finally {
    await close(server);
  }
});

test("listener: query string dá 400 sem chamar o serviço, mesmo com token válido", { timeout: 30_000 }, async () => {
  const { app, calls } = ingestApp();
  const { server, base } = await listen(app);
  try {
    const response = await post(base, `${TRACCAR_INGEST_PATH}?token=${SECRET}`, FIXTURE);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: { code: "query_not_allowed" } });
    // `fetch` descarta o `?` vazio; o socket cru manda a linha de requisição exatamente como está.
    assert.equal(await rawPost(base, `${TRACCAR_INGEST_PATH}?`, FIXTURE), 400, "query vazia (só o `?`) também é query");
    assert.equal(calls.length, 0);
  } finally {
    await close(server);
  }
});

test("listener: com a flag desligada o bootstrap não escuta", { timeout: 30_000 }, async () => {
  const port = await freePort();
  const result = await startTraccarIngestListenerIfEnabled({
    logger: silent,
    config: { enabled: false, host: "127.0.0.1", port },
    createIngestApp: async () => ingestApp().app,
  });
  assert.equal(result.status, "disabled");
  assert.equal(await canConnect(port), false, "nada pode escutar na porta de ingestão com a flag desligada");
});

test("listener: ligado, escuta exatamente no host e na porta pedidos", { timeout: 30_000 }, async () => {
  const port = await freePort();
  const result = await startTraccarIngestListenerIfEnabled({
    logger: silent,
    config: { enabled: true, host: "127.0.0.1", port },
    createIngestApp: async () => ingestApp().app,
  });
  assert.equal(result.status, "listening");
  if (result.status !== "listening") return;
  try {
    const address = result.server.address() as AddressInfo;
    assert.equal(address.address, "127.0.0.1");
    assert.equal(address.port, port);
    const response = await post(`http://127.0.0.1:${port}`, TRACCAR_INGEST_PATH, FIXTURE);
    assert.equal(response.status, 204);
  } finally {
    await close(result.server);
  }
});

test("listener: porta de ingestão igual a PORT ou a PORTAL_PORT reprova o env", { timeout: 30_000 }, () => {
  assert.deepEqual(traccarIssues(baseEnv({ PORT: "3000", TRACCAR_INGEST_PORT: "3000" })), ["TRACCAR_INGEST_PORT"]);
  assert.deepEqual(traccarIssues(baseEnv({ PORTAL_PORT: "3100", TRACCAR_INGEST_PORT: "3100" })), ["TRACCAR_INGEST_PORT"]);
  assert.deepEqual(traccarIssues(baseEnv({ TRACCAR_INGEST_PORT: "3200" })), []);
});

test("listener: flag ligada sem instance key ou sem segredo de 32+ reprova; em produção o default de dev reprova", { timeout: 30_000 }, () => {
  assert.ok(traccarIssues(baseEnv({ TRACCAR_INSTANCE_KEY: undefined })).includes("TRACCAR_INSTANCE_KEY"));
  assert.ok(traccarIssues(baseEnv({ TRACCAR_INSTANCE_KEY: "Erp Dev" })).includes("TRACCAR_INSTANCE_KEY"));
  assert.ok(traccarIssues(baseEnv({ TRACCAR_FORWARD_SECRET_CURRENT: undefined })).includes("TRACCAR_FORWARD_SECRET_CURRENT"));
  assert.ok(traccarIssues(baseEnv({ TRACCAR_FORWARD_SECRET_CURRENT: "a".repeat(31) })).includes("TRACCAR_FORWARD_SECRET_CURRENT"));
  assert.deepEqual(traccarIssues(baseEnv({ TRACCAR_FORWARD_SECRET_CURRENT: "a".repeat(32) })), []);
  const production = { ...PRODUCTION_BASE, TRACCAR_INGEST_ENABLED: "true", TRACCAR_INSTANCE_KEY: "erp-prod" };
  assert.ok(
    traccarIssues({ ...production, TRACCAR_FORWARD_SECRET_CURRENT: "dev-only-traccar-forward-secret-change-me" }).includes(
      "TRACCAR_FORWARD_SECRET_CURRENT",
    ),
  );
  assert.ok(traccarIssues({ ...production }).includes("TRACCAR_FORWARD_SECRET_CURRENT"), "produção sem segredo não boota");
  assert.deepEqual(traccarIssues({ ...production, TRACCAR_FORWARD_SECRET_CURRENT: SECRET }), []);
  assert.deepEqual(traccarIssues({ NODE_ENV: "production", ...PRODUCTION_BASE }), [], "flag desligada não exige nada");
});

test("listener: a rota móvel recusa `source: \"traccar\"` com 400 invalid_source", { timeout: 30_000 }, async () => {
  const { server, base, seed } = await publicApp();
  try {
    const response = await fetch(`${base}/api/v1/mobile/field-locations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": seed.tenantId,
        "x-user-id": seed.userId,
        "x-role": "operator",
      },
      body: JSON.stringify({ latitude: -23.5, longitude: -46.6, source: "traccar" }),
    });
    const text = await response.text();
    assert.equal(response.status, 400);
    assert.match(text, /invalid_source/);
  } finally {
    await close(server);
  }
});

test("listener: host que não existe na máquina dá `bind_failed` e o app público segue respondendo", { timeout: 30_000 }, async () => {
  const { server, base } = await publicApp();
  try {
    const result = await startTraccarIngestListenerIfEnabled({
      logger: silent,
      config: { enabled: true, host: "192.0.2.1", port: await freePort() },
      createIngestApp: async () => ingestApp().app,
    });
    assert.equal(result.status, "bind_failed");
    if (result.status === "bind_failed") assert.match(result.code, /^E[A-Z]+$/);
    const health = await fetch(`${base}/api/v1/health`);
    assert.equal(health.status, 200, "o app público, no mesmo processo, continua no ar");
    await health.arrayBuffer();
  } finally {
    await close(server);
  }
});

test("listener: corpo de 64 KiB + 1 dá 413", { timeout: 30_000 }, async () => {
  const { app, calls } = ingestApp();
  const { server, base } = await listen(app);
  try {
    const padding = " ".repeat(64 * 1024 + 1 - FIXTURE.length);
    const body = FIXTURE + padding;
    assert.equal(Buffer.byteLength(body), 64 * 1024 + 1);
    const response = await post(base, TRACCAR_INGEST_PATH, body);
    assert.equal(response.status, 413);
    await response.arrayBuffer();
    const atLimit = await post(base, TRACCAR_INGEST_PATH, FIXTURE + " ".repeat(64 * 1024 - FIXTURE.length));
    assert.equal(atLimit.status, 204, "64 KiB exatos passam");
    assert.equal(calls.length, 1);
  } finally {
    await close(server);
  }
});

test("listener: `Content-Type: text/plain` dá 415", { timeout: 30_000 }, async () => {
  const { app, calls } = ingestApp();
  const { server, base } = await listen(app);
  try {
    const response = await post(base, TRACCAR_INGEST_PATH, FIXTURE, { "content-type": "text/plain" });
    assert.equal(response.status, 415);
    await response.arrayBuffer();
    assert.equal(calls.length, 0);
  } finally {
    await close(server);
  }
});

test("listener: a 101ª requisição numa rajada dá 429", { timeout: 30_000 }, async () => {
  // Relógio parado: a rajada inteira acontece "no mesmo instante", sem reposição de ficha entre as requisições.
  const { app } = ingestApp({ burst: 100, maxConcurrency: 1_000, now: () => 0 });
  const { server, base } = await listen(app);
  try {
    const statuses: number[] = [];
    for (let index = 0; index < 101; index++) {
      const response = await post(base, TRACCAR_INGEST_PATH, FIXTURE);
      statuses.push(response.status);
      await response.arrayBuffer();
    }
    assert.equal(statuses.slice(0, 100).filter((status) => status === 204).length, 100);
    assert.equal(statuses[100], 429);
  } finally {
    await close(server);
  }
});

test("listener: TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL a mais de 72 h reprova o env", { timeout: 30_000 }, () => {
  const previous = "previous-forward-secret-0123456789-zyxw";
  const hours = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
  assert.deepEqual(
    traccarIssues(baseEnv({ TRACCAR_FORWARD_SECRET_PREVIOUS: previous, TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL: hours(71) })),
    [],
  );
  assert.ok(
    traccarIssues(baseEnv({ TRACCAR_FORWARD_SECRET_PREVIOUS: previous, TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL: hours(73) })).includes(
      "TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL",
    ),
  );
  assert.ok(
    traccarIssues(baseEnv({ TRACCAR_FORWARD_SECRET_PREVIOUS: previous, TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL: hours(-1) })).includes(
      "TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL",
    ),
  );
  assert.ok(
    traccarIssues(baseEnv({ TRACCAR_FORWARD_SECRET_PREVIOUS: previous })).includes("TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL"),
  );
});

// Conserto do 503 (pré-revisão do #426, Achado 1). A PROPRIEDADE, medida por fora, sem depender de como o listener e o
// serviço combinam o prazo entre si:
//   - 503 por tempo ⇒ NADA gravado, nem na hora nem depois (o trabalho que segue rodando não pode gravar);
//   - gravação já em curso quando o tempo esgota ⇒ a resposta diz o desfecho real, nunca 503 com dado gravado;
//   - a vaga do limitador só volta quando o TRABALHO termina, mesmo com o cliente já desconectado.
// Os dois primeiros usam o SERVIÇO REAL de ingestão (`TraccarIngestionService`) com a descoberta e o executor falsos: o
// caminho exercido é o do dispositivo não mapeado, cuja quarentena é a única gravação (uma instrução em autocommit no
// `client`). O executor falso conta as gravações; nada aqui sabe o nome da API do prazo — o listener só repassa os
// argumentos ao serviço.
function recordingExecutor(writeDelayMs = 0): { client: PrismaClient; writes: string[] } {
  const writes: string[] = [];
  const client = {
    async $queryRaw(strings: TemplateStringsArray) {
      if (writeDelayMs > 0) await pause(writeDelayMs);
      writes.push(strings.join("?").trim().split(/\s+/).slice(0, 3).join(" "));
      return [{ id: "q-1" }];
    },
    $transaction() {
      throw new Error("a fase 2 não roda neste teste: o dispositivo não está mapeado");
    },
  };
  return { client: client as unknown as PrismaClient, writes };
}

function unmappedService(client: PrismaClient, discoveryDelayMs = 0): { service: TraccarIngestionService; discoveryEnded: () => boolean } {
  let ended = false;
  const service = createTraccarIngestionService({
    client,
    timeoutMs: 3_000,
    resolver: { maxTenants: 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 },
    discoveryPorts: {
      countActiveTenants: async () => 1,
      listActiveTenantIds: async () => ["00000000-0000-4000-8000-000000000001"],
      findBoundTenant: async () => {
        if (discoveryDelayMs > 0) await pause(discoveryDelayMs);
        ended = true;
        return null; // nenhuma organização tem o dispositivo → quarentena `unmapped_device`
      },
    },
  });
  return { service, discoveryEnded: () => ended };
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("listener: 503 por tempo esgotado ⇒ nada gravado, nem depois de o trabalho terminar", { timeout: 30_000 }, async () => {
  const { client, writes } = recordingExecutor();
  const { service, discoveryEnded } = unmappedService(client, 300); // a descoberta passa do prazo de 100 ms
  let work: Promise<unknown> | undefined;
  const { app } = ingestApp({
    ingest: (...args: Parameters<TraccarIngestHandler>) => {
      const running = service.ingest(...args);
      work = running;
      return running;
    },
    timeoutMs: 100,
  });
  const { server, base } = await listen(app);
  try {
    const response = await post(base, TRACCAR_INGEST_PATH, FIXTURE);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: { code: "unavailable" } });
    assert.equal(discoveryEnded(), false, "controle: o 503 saiu com o trabalho ainda rodando");
  } finally {
    await close(server);
  }
  assert.ok(work, "o serviço foi chamado");
  await work!.catch(() => undefined); // espera o FIM do trabalho, não só a resposta
  assert.equal(discoveryEnded(), true, "controle: o trabalho foi até o fim");
  assert.deepEqual(writes, [], "nenhuma quarentena gravada depois do 503");
});

test("listener: gravação já em curso quando o tempo esgota ⇒ a resposta diz o desfecho real (202), nunca 503", { timeout: 30_000 }, async () => {
  const { client, writes } = recordingExecutor(300); // a gravação começa no prazo e termina depois dele
  const { service } = unmappedService(client);
  const { app } = ingestApp({
    ingest: (...args: Parameters<TraccarIngestHandler>) => service.ingest(...args),
    timeoutMs: 100,
  });
  const { server, base } = await listen(app);
  try {
    const response = await post(base, TRACCAR_INGEST_PATH, FIXTURE);
    await response.arrayBuffer();
    assert.equal(writes.length, 1, "a quarentena FOI gravada");
    assert.equal(response.status, 202, "gravado ⇒ não pode ser 503 (o Traccar acharia que nada foi gravado)");
  } finally {
    await close(server);
  }
});

test("listener: a vaga só volta quando o TRABALHO termina, mesmo com o cliente desconectado", { timeout: 30_000 }, async () => {
  let started!: () => void;
  const workStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  let finishWork!: () => void;
  const workMayEnd = new Promise<void>((resolve) => {
    finishWork = resolve;
  });
  let calls = 0;
  const limiter = createTraccarIngestLimiter({ ratePerSecond: 1_000, burst: 1_000, maxConcurrency: 1 });
  const app = createTraccarIngestApp({
    authenticator: createTraccarForwardAuthenticator({ current: SECRET }),
    limiter,
    // Trabalho que IGNORA o cliente e o prazo, como o real que segue no banco.
    ingest: async () => {
      calls += 1;
      if (calls === 1) {
        started();
        await workMayEnd;
      }
      return { kind: "stored" };
    },
    instanceKey: "erp-dev",
    timeoutMs: 2_000,
    logger: silent,
  });
  const { server, base } = await listen(app);
  try {
    const abort = new AbortController();
    const aborted = fetch(`${base}${TRACCAR_INGEST_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-traccar-forward-token": SECRET },
      body: FIXTURE,
      signal: abort.signal,
    }).catch(() => undefined);
    void aborted;
    await workStarted;
    abort.abort(); // o cliente desiste: o servidor vê `close` com o trabalho ainda rodando
    await pause(150);
    assert.equal(limiter.inFlight(), 1, "o trabalho ainda roda: a vaga continua ocupada depois do `close`");
    const second = await post(base, TRACCAR_INGEST_PATH, FIXTURE);
    await second.arrayBuffer();
    assert.equal(second.status, 429, "com o trabalho no ar, a seguinte não entra");

    finishWork();
    for (let spin = 0; spin < 100 && limiter.inFlight() !== 0; spin++) await pause(10);
    assert.equal(limiter.inFlight(), 0, "o trabalho terminou: a vaga voltou");
    const third = await post(base, TRACCAR_INGEST_PATH, FIXTURE);
    await third.arrayBuffer();
    assert.equal(third.status, 204, "com a vaga de volta, a seguinte passa");
  } finally {
    finishWork();
    server.closeAllConnections();
    await close(server);
  }
});
