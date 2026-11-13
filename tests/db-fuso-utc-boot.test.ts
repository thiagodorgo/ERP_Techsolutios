import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertDatabaseSessionTimezoneUtc,
  SessionTimezoneProbeError,
  type SessionTimezoneBootstrapClient,
  type SessionTimezoneBootstrapLogger,
} from "../src/database/session-timezone.bootstrap.js";
import {
  DATABASE_SESSION_TIMEZONE_NOT_UTC,
  DatabaseSessionTimezoneError,
} from "../src/database/session-timezone.js";
import { startTraccarIngestListenerIfEnabled } from "../src/integrations/traccar/traccar-ingest.bootstrap.js";

type LogEntry = { readonly level: "info" | "warn" | "error"; readonly payload: Record<string, unknown>; readonly message: string };

function spyLogger(): { logger: SessionTimezoneBootstrapLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    logger: {
      info: (payload, message) => entries.push({ level: "info", payload, message }),
      warn: (payload, message) => entries.push({ level: "warn", payload, message }),
      error: (payload, message) => entries.push({ level: "error", payload, message }),
    },
  };
}

function serializeEntries(entries: LogEntry[]): string {
  return JSON.stringify(entries, (_key, value) => {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    return value;
  });
}

function fakeClient(answer: () => unknown): {
  client: SessionTimezoneBootstrapClient;
  calls: () => number;
  disconnects: () => number;
} {
  let calls = 0;
  let disconnects = 0;

  return {
    client: {
      async $queryRawUnsafe<T>(): Promise<T> {
        calls += 1;
        const value = answer();
        if (value instanceof Error) throw value;
        return value as T;
      },
      async $disconnect(): Promise<void> {
        disconnects += 1;
      },
    },
    calls: () => calls,
    disconnects: () => disconnects,
  };
}

function connectionError(): Error {
  const error = new Error(
    "\nInvalid `prisma.$queryRawUnsafe()` invocation:\n\n\nRaw query failed. Code: `N/A`. Message: `Can't reach database server at db.interno.exemplo.com:5432`",
  );
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code: "P2010", meta: { driverAdapterError: { cause: { kind: "DatabaseNotReachable" } } } });
  return error;
}

const SENTINEL_HOST = "h0st-sentinela";
const SENTINEL_PORT = "5439";
const SENTINEL_USER = "us3r-sentinela";
const SENTINEL_PASSWORD = "s3nha-sentinela";

function sentinelAuthError(): Error {
  const error = new Error(
    `Raw query failed. Code: \`28P01\`. Message: \`authentication failed for user "${SENTINEL_USER}" (password ${SENTINEL_PASSWORD}) at ${SENTINEL_HOST}:${SENTINEL_PORT}\``,
  );
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code: "P2010", meta: { driverAdapterError: { cause: { kind: "DatabaseAccessDenied" } } } });
  return error;
}
for (const timezone of ["UTC", "Etc/UTC"]) {
  test(`B1 · aceita \`${timezone}\` e loga o veredito`, async () => {
    const fake = fakeClient(() => [{ tz: timezone }]);
    const { logger, entries } = spyLogger();

    await assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => fake.client });

    assert.equal(fake.calls(), 1);
    assert.equal(fake.disconnects(), 0, "sessão em UTC não desconecta o client que o app vai usar");
    const verdict = entries.find((entry) => entry.message === "database session timezone verified");
    assert.ok(verdict, JSON.stringify(entries));
    assert.deepEqual(verdict.payload, { guard: "timezone", timezone });
  });
}

for (const timezone of ["America/Sao_Paulo", "Europe/London", "GMT0"]) {
  test(`B2 · recusa \`${timezone}\``, async () => {
    const fake = fakeClient(() => [{ tz: timezone }]);
    const { logger, entries } = spyLogger();

    await assert.rejects(
      () => assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => fake.client }),
      (error: unknown) => {
        assert.ok(error instanceof DatabaseSessionTimezoneError, String(error));
        assert.equal(error.code, DATABASE_SESSION_TIMEZONE_NOT_UTC);
        assert.equal(error.timezone, timezone);
        return true;
      },
    );
    assert.equal(fake.disconnects(), 1, "a recusa tem de fechar a conexão");
    const refusal = entries.find((entry) => entry.level === "error");
    assert.ok(refusal, JSON.stringify(entries));
    assert.deepEqual(refusal.payload, { guard: "timezone", timezone });
  });
}

test("B3 · recusa fuso vazio", async () => {
  const fake = fakeClient(() => [{ tz: "" }]);
  const { logger, entries } = spyLogger();

  await assert.rejects(
    () => assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => fake.client }),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseSessionTimezoneError, String(error));
      assert.equal(error.code, DATABASE_SESSION_TIMEZONE_NOT_UTC);
      return true;
    },
  );
  assert.equal(fake.disconnects(), 1);
  const refusal = entries.find((entry) => entry.level === "error");
  assert.ok(refusal);
  assert.deepEqual(refusal.payload, { guard: "timezone", timezone: "" });
});
test("B4 · erro de CONEXÃO: 5 sondas, esperas 2s/4s/8s/16s, recusa sanitizada e $disconnect", async () => {
  const fake = fakeClient(() => connectionError());
  const { logger, entries } = spyLogger();
  const waits: number[] = [];

  await assert.rejects(
    () =>
      assertDatabaseSessionTimezoneUtc({
        logger,
        loadClient: async () => fake.client,
        sleep: async (ms) => {
          waits.push(ms);
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof SessionTimezoneProbeError, String(error));
      assert.equal(error.code, "SESSION_TIMEZONE_PROBE_FAILED");
      assert.equal(error.attempts, 5);
      assert.equal(error.driverKind, "DatabaseNotReachable");
      assert.doesNotMatch(error.message, /db\.interno\.exemplo\.com|5432/);
      return true;
    },
  );
  assert.equal(fake.calls(), 5);
  assert.deepEqual(waits, [2_000, 4_000, 8_000, 16_000]);
  assert.equal(fake.disconnects(), 1);
  assert.doesNotMatch(serializeEntries(entries), /db\.interno\.exemplo\.com|5432|postgresql:\/\//);
});
test("B5 · erro que NÃO é de conexão: 1 sonda só; log e mensagem sem host/porta/usuário/senha", async () => {
  const fake = fakeClient(() => sentinelAuthError());
  const { logger, entries } = spyLogger();
  const waits: number[] = [];

  await assert.rejects(
    () =>
      assertDatabaseSessionTimezoneUtc({
        logger,
        loadClient: async () => fake.client,
        sleep: async (ms) => {
          waits.push(ms);
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof SessionTimezoneProbeError, String(error));
      assert.equal(error.sqlState, "28P01");
      assert.equal(error.attempts, 1);
      assert.equal(error.driverKind, "DatabaseAccessDenied");
      assert.doesNotMatch(error.message, new RegExp(`${SENTINEL_HOST}|${SENTINEL_PORT}|${SENTINEL_USER}|${SENTINEL_PASSWORD}`));
      return true;
    },
  );
  assert.equal(fake.calls(), 1);
  assert.deepEqual(waits, []);
  assert.equal(fake.disconnects(), 1);
  assert.doesNotMatch(serializeEntries(entries), new RegExp(`${SENTINEL_HOST}|${SENTINEL_PORT}|${SENTINEL_USER}|${SENTINEL_PASSWORD}`));
});

test("B6 · server.ts chama a trava de fuso depois do papel e antes de createCoreSaasService", () => {
  const source = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
  const roleCall = source.indexOf("assertRuntimeDatabaseRoleIfEnforced({ logger })");
  const timezoneCall = source.indexOf("assertDatabaseSessionTimezoneUtc({ logger })");
  const serviceCall = source.indexOf("createCoreSaasService()");

  assert.notEqual(roleCall, -1, "server.ts deve chamar a trava de papel");
  assert.notEqual(timezoneCall, -1, "server.ts deve chamar a trava de fuso");
  assert.notEqual(serviceCall, -1, "server.ts deve criar o serviço");
  assert.ok(roleCall < timezoneCall, "a trava de fuso vem depois da trava de papel");
  assert.ok(timezoneCall < serviceCall, "a trava de fuso vem antes de createCoreSaasService");
});

test("B7 · listener do Traccar recusa banco fora de UTC → timezone_refused, loga só o código", async () => {
  const { logger, entries } = spyLogger();
  let appCreated = false;

  const result = await startTraccarIngestListenerIfEnabled({
    logger: logger as unknown as Parameters<typeof startTraccarIngestListenerIfEnabled>[0]["logger"],
    config: { enabled: true, host: "127.0.0.1", port: 0 },
    probeTimezone: async () => {
      throw new DatabaseSessionTimezoneError("America/Sao_Paulo");
    },
    createIngestApp: async () => {
      appCreated = true;
      throw new Error("não devia chegar aqui");
    },
  });

  assert.deepEqual(result, { status: "timezone_refused" });
  assert.equal(appCreated, false, "fora de UTC o listener não cria o app nem sobe");
  const refusal = entries.find((entry) => entry.level === "error");
  assert.ok(refusal, JSON.stringify(entries));
  assert.deepEqual(refusal.payload, { code: DATABASE_SESSION_TIMEZONE_NOT_UTC });
});
