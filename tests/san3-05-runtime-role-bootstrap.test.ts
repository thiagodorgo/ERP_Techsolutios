import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertRuntimeDatabaseRoleIfEnforced,
  RuntimeRoleProbeError,
  type RuntimeRoleBootstrapClient,
  type RuntimeRoleBootstrapLogger,
} from "../src/database/runtime-role.bootstrap.js";
import { RUNTIME_ROLE_CAN_BYPASS_RLS, RUNTIME_ROLE_GUARD_SQL, RuntimeRoleGuardError } from "../src/database/runtime-role.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-05 — T2 e T4 do plano v3 (sem banco).
//
// T2 (A8): o DEFAULT da trava por ambiente vive no EXPORT de `src/config/env.ts` (`production` → `enforce`;
// `test`/`development` → `skip`). Um teste que reescreve a regra em vez de LER o export fica verde com o
// export mutado (a classe do `P-O6R-07B-TESTE-DO-DEFAULT-CEGO-AO-EXPORT`). Por isso o valor é lido de um
// PROCESSO FILHO que importa o módulo real, num diretório temporário vazio (o `config()` do dotenv no topo do
// `env.ts` lê o `.env` do cwd — com o cwd no repositório, o `.env` de desenvolvimento do dono entraria na
// medição), com o ambiente zerado mais o baseline de produção válido.
//
// T4: o bootstrap com o client INJETADO (fake): sem `enforce` não sonda e loga; postura limpa passa; escape
// lança E desconecta; erro de conexão repete com espera dobrando e recusa com erro SANITIZADO (a mensagem do
// driver traz host:porta); erro que não é de conexão não repete.
// -----------------------------------------------------------------------------------------------

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TSX_LOADER = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
const ENV_MODULE = pathToFileURL(path.join(REPO_ROOT, "src/config/env.ts")).href;

const PROD_OK: Record<string, string> = {
  NODE_ENV: "production",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
};

/** O que o EXPORT do `env.ts` resolve para a chave, lido de um processo filho com o ambiente dado. */
function readExportedGuard(childEnv: Record<string, string>): { status: number | null; stdout: string; stderr: string } {
  const cwd = mkdtempSync(path.join(tmpdir(), "san3-05-env-"));

  try {
    const inherited: Record<string, string> = {};
    for (const key of ["PATH", "HOME", "SystemRoot", "TEMP", "TMP"]) {
      const value = process.env[key];
      if (value !== undefined) inherited[key] = value;
    }
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        TSX_LOADER,
        "-e",
        `import(${JSON.stringify(ENV_MODULE)}).then((m) => console.log("GUARD=" + m.env.NODE_ENV + ":" + m.env.DATABASE_RUNTIME_ROLE_GUARD), (e) => { console.log("ISSUES=" + (e.issues ?? []).map((i) => i.path.join(".")).join(",")); process.exit(3); })`,
      ],
      { cwd, env: { ...inherited, ...childEnv }, encoding: "utf8", timeout: 60_000 },
    );

    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("T2 · produção sem a variável → o EXPORT resolve `enforce` (processo filho, módulo real)", () => {
  const run = readExportedGuard(PROD_OK);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /^GUARD=production:enforce$/m);
});

test("T2 · produção com `enforce` explícito → `enforce`", () => {
  const run = readExportedGuard({ ...PROD_OK, DATABASE_RUNTIME_ROLE_GUARD: "enforce" });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /^GUARD=production:enforce$/m);
});

test("T2 · produção com `skip` → o import do env.ts RECUSA no caminho DATABASE_RUNTIME_ROLE_GUARD", () => {
  const run = readExportedGuard({ ...PROD_OK, DATABASE_RUNTIME_ROLE_GUARD: "skip" });
  assert.equal(run.status, 3, run.stdout + run.stderr);
  assert.match(run.stdout, /^ISSUES=.*\bDATABASE_RUNTIME_ROLE_GUARD\b/m);
});

for (const nodeEnv of ["test", "development"]) {
  test(`T2 · ${nodeEnv} sem a variável → o EXPORT resolve \`skip\``, () => {
    const run = readExportedGuard({ NODE_ENV: nodeEnv });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, new RegExp(`^GUARD=${nodeEnv}:skip$`, "m"));
  });
}

// ─────────────────────────────── T4 — o bootstrap com client injetado ───────────────────────────────

type LogEntry = { readonly level: "info" | "warn" | "error"; readonly payload: Record<string, unknown>; readonly message: string };

function spyLogger(): { logger: RuntimeRoleBootstrapLogger; entries: LogEntry[] } {
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

const IDENTITY = [{ session_user_name: "app_rt", current_user_name: "app_rt" }];

function fakeClient(answer: (sql: string, identityCall: number) => unknown): {
  client: RuntimeRoleBootstrapClient;
  identityCalls: () => number;
  guardCalls: () => number;
  disconnects: () => number;
} {
  let identity = 0;
  let guard = 0;
  let disconnects = 0;

  return {
    client: {
      async $queryRawUnsafe<T>(sql: string): Promise<T> {
        if (sql === RUNTIME_ROLE_GUARD_SQL) guard += 1;
        else identity += 1;
        const value = answer(sql, identity);
        if (value instanceof Error) throw value;
        return value as T;
      },
      async $disconnect(): Promise<void> {
        disconnects += 1;
      },
    },
    identityCalls: () => identity,
    guardCalls: () => guard,
    disconnects: () => disconnects,
  };
}

function unreachable(): Error {
  const error = new Error(
    "\nInvalid `prisma.$queryRawUnsafe()` invocation:\n\n\nRaw query failed. Code: `N/A`. Message: `Can't reach database server at db.interno.exemplo.com:5432`",
  );
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code: "P2010", meta: { driverAdapterError: { cause: { kind: "DatabaseNotReachable" } } } });
  return error;
}

function accessDenied(): Error {
  const error = new Error(
    "\nInvalid `prisma.$queryRawUnsafe()` invocation:\n\n\nRaw query failed. Code: `28P01`. Message: `authentication failed for user at db.interno.exemplo.com`",
  );
  error.name = "PrismaClientKnownRequestError";
  Object.assign(error, { code: "P2010", meta: { driverAdapterError: { cause: { kind: "DatabaseAccessDenied" } } } });
  return error;
}

test("T4 · sem enforce: não sonda, devolve {enforced:false} e deixa UMA linha info (nunca mudo)", async () => {
  const { logger, entries } = spyLogger();
  let loaded = 0;
  const result = await assertRuntimeDatabaseRoleIfEnforced({
    enforce: false,
    logger,
    loadClient: async () => {
      loaded += 1;
      return fakeClient(() => []).client;
    },
  });

  assert.deepEqual(result, { enforced: false });
  assert.equal(loaded, 0, "sem enforce o client nem é carregado");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.level, "info");
  assert.match(entries[0]!.message, /skip/);
});

test("T4 · sem opção explícita, o default do processo de teste (NODE_ENV≠production) é skip", async () => {
  const { logger, entries } = spyLogger();
  const result = await assertRuntimeDatabaseRoleIfEnforced({ logger, loadClient: async () => assert.fail("não devia carregar") });
  assert.deepEqual(result, { enforced: false });
  assert.equal(entries.length, 1);
});

test("T4 · postura limpa: passa, e o veredito loga session_user, current_user e escapes: 0 — nada além", async () => {
  const fake = fakeClient((sql) => (sql === RUNTIME_ROLE_GUARD_SQL ? [] : IDENTITY));
  const { logger, entries } = spyLogger();
  const result = await assertRuntimeDatabaseRoleIfEnforced({ enforce: true, logger, loadClient: async () => fake.client });

  assert.equal(result.enforced, true);
  assert.equal(fake.disconnects(), 0, "postura limpa não desconecta o client que o app vai usar");
  const verdict = entries.find((entry) => entry.message === "runtime database role verified");
  assert.ok(verdict, JSON.stringify(entries));
  assert.deepEqual(verdict.payload, { guard: "enforce", session_user: "app_rt", current_user: "app_rt", escapes: 0 });
});

test("T4 · escape: lança RuntimeRoleGuardError (RUNTIME_ROLE_CAN_BYPASS_RLS) E chama $disconnect", async () => {
  const escape = { via: "atributo", rolname: "app_rt", rolsuper: false, rolbypassrls: true, is_self: true, objetos: null };
  const fake = fakeClient((sql) => (sql === RUNTIME_ROLE_GUARD_SQL ? [escape] : IDENTITY));
  const { logger, entries } = spyLogger();

  await assert.rejects(
    () => assertRuntimeDatabaseRoleIfEnforced({ enforce: true, logger, loadClient: async () => fake.client }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeRoleGuardError);
      assert.equal(error.code, RUNTIME_ROLE_CAN_BYPASS_RLS);
      assert.deepEqual(error.escapes, [escape]);
      assert.match(error.message, /^RUNTIME_ROLE_CAN_BYPASS_RLS: /);
      return true;
    },
  );
  assert.equal(fake.disconnects(), 1, "a recusa tem de fechar a conexão — senão o processo não sai");
  const refusal = entries.find((entry) => entry.level === "error");
  assert.ok(refusal);
  assert.deepEqual(refusal.payload.escapes, [escape]);
});

test("T4 · erro de CONEXÃO: 5 sondas, esperas 2s/4s/8s/16s, recusa com erro SANITIZADO e $disconnect", async () => {
  const fake = fakeClient(() => unreachable());
  const { logger, entries } = spyLogger();
  const waits: number[] = [];

  await assert.rejects(
    () =>
      assertRuntimeDatabaseRoleIfEnforced({
        enforce: true,
        logger,
        loadClient: async () => fake.client,
        sleep: async (ms) => {
          waits.push(ms);
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeRoleProbeError);
      assert.equal(error.code, "RUNTIME_ROLE_PROBE_FAILED");
      assert.equal(error.attempts, 5);
      assert.equal(error.driverKind, "DatabaseNotReachable");
      assert.doesNotMatch(error.message, /db\.interno\.exemplo\.com|5432/, "a mensagem do driver traz host:porta e não sobe");
      return true;
    },
  );
  assert.equal(fake.identityCalls(), 5);
  assert.deepEqual(waits, [2_000, 4_000, 8_000, 16_000]);
  assert.equal(fake.disconnects(), 1);
  assert.doesNotMatch(JSON.stringify(entries), /db\.interno\.exemplo\.com|postgresql:\/\//);
});

test("T4 · erro de conexão que se resolve na 3ª sonda → passa (esperas 2s e 4s)", async () => {
  const fake = fakeClient((sql, call) => (call < 3 ? unreachable() : sql === RUNTIME_ROLE_GUARD_SQL ? [] : IDENTITY));
  const waits: number[] = [];
  const result = await assertRuntimeDatabaseRoleIfEnforced({
    enforce: true,
    loadClient: async () => fake.client,
    sleep: async (ms) => {
      waits.push(ms);
    },
  });

  assert.equal(result.enforced, true);
  assert.deepEqual(waits, [2_000, 4_000]);
});

test("T4 · erro que NÃO é de conexão (credencial recusada, 28P01) → uma sonda só, recusa sanitizada", async () => {
  const fake = fakeClient(() => accessDenied());
  const waits: number[] = [];

  await assert.rejects(
    () =>
      assertRuntimeDatabaseRoleIfEnforced({
        enforce: true,
        loadClient: async () => fake.client,
        sleep: async (ms) => {
          waits.push(ms);
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeRoleProbeError);
      assert.equal(error.sqlState, "28P01");
      assert.equal(error.attempts, 1);
      assert.doesNotMatch(error.message, /db\.interno\.exemplo\.com/);
      return true;
    },
  );
  assert.equal(fake.identityCalls(), 1);
  assert.deepEqual(waits, []);
  assert.equal(fake.disconnects(), 1);
});
