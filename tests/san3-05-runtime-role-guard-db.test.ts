import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net, { type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  assertRuntimeDatabaseRoleIfEnforced,
  type RuntimeRoleBootstrapLogger,
} from "../src/database/runtime-role.bootstrap.js";
import {
  probeRuntimeRolePosture,
  RUNTIME_ROLE_CAN_BYPASS_RLS,
  RUNTIME_ROLE_GUARD_SQL,
  RuntimeRoleGuardError,
} from "../src/database/runtime-role.js";
import {
  dropEphemeralRoleResilient,
  withRoleCatalogLock,
} from "./helpers/auth-identity-fixture.js";

// B-SAN3-05 — T5–T9, T8b–T8d, T14a/b e T15 do plano v3.
// Toda escrita de catálogo fica dentro de `withRoleCatalogLock`; o teardown reutiliza o arnês resiliente.
// Credenciais são aleatórias, vivem só no processo e nunca entram em mensagem de asserção, stdout ou argv.

const connectionString = process.env.DATABASE_URL;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROLE_SCRIPT = path.join(REPO_ROOT, "scripts", "db-runtime-role.sh");
const SAFE_NAME = /^[a-z][a-z0-9_]+$/;

type Escape = {
  readonly via: "atributo" | "posse" | "view";
  readonly rolname: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
  readonly is_self: boolean;
  readonly objetos: number | null;
};

function token(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

function secret(): string {
  return `s305-${randomBytes(18).toString("base64url")}`;
}

function ident(value: string): string {
  assert.match(value, SAFE_NAME);
  return `"${value}"`;
}

function literal(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function urlForRole(base: string, role: string, roleSecret: string, setRole?: string): string {
  const url = new URL(base);
  url.username = role;
  url.password = roleSecret;
  if (setRole) url.searchParams.set("options", `-c role=${setRole}`);
  return url.toString();
}

function prismaFor(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

async function catalog(admin: PrismaClient, statements: readonly string[]): Promise<void> {
  await withRoleCatalogLock(admin, async (tx) => {
    for (const statement of statements) await tx.$executeRawUnsafe(statement);
  });
}

async function createLogin(
  admin: PrismaClient,
  role: string,
  roleSecret: string,
  attributes = "NOSUPERUSER NOBYPASSRLS NOREPLICATION NOCREATEDB NOCREATEROLE NOINHERIT",
): Promise<void> {
  await catalog(admin, [
    `CREATE ROLE ${ident(role)} LOGIN PASSWORD ${literal(roleSecret)} ${attributes}`,
    `GRANT USAGE ON SCHEMA public TO ${ident(role)}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ident(role)}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ident(role)}`,
  ]);
}

async function dropRole(admin: PrismaClient, role: string): Promise<void> {
  await dropEphemeralRoleResilient(admin, role);
}

async function posture(url: string): Promise<Awaited<ReturnType<typeof probeRuntimeRolePosture>>> {
  const client = prismaFor(url);
  try {
    return await probeRuntimeRolePosture(client);
  } finally {
    await client.$disconnect();
  }
}

function findEscape(rows: readonly Escape[], via: Escape["via"], role: string): Escape {
  const found = rows.find((row) => row.via === via && row.rolname === role);
  assert.ok(found, `escape ${via}/${role} não encontrado: ${JSON.stringify(rows)}`);
  return found;
}

async function reserveFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function psqlEnv(urlText: string, overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  const url = new URL(urlText);
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1),
    ...overrides,
  };
}

type ChildResult = { status: number | null; stdout: string; stderr: string; timedOut: boolean };

async function spawnCommand(
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs: number; stdin?: string },
): Promise<ChildResult> {
  const child = spawn(command, [...args], {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => (stdout += chunk));
  child.stderr.on("data", (chunk: string) => (stderr += chunk));
  child.stdin.end(options.stdin);

  return await new Promise<ChildResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr, timedOut });
    });
  });
}

async function runCatalogCommand(
  admin: PrismaClient,
  command: string,
  args: readonly string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; stdin?: string },
): Promise<ChildResult> {
  return await withRoleCatalogLock(admin, async () => {
    return await spawnCommand(command, args, { ...options, timeoutMs: 20_000 });
  });
}

async function runRoleScript(
  admin: PrismaClient,
  urlText: string,
  role: string,
  roleSecret: string,
  overrides: Record<string, string> = {},
): Promise<ChildResult> {
  const result = await runCatalogCommand(admin, "bash", [ROLE_SCRIPT], {
    cwd: REPO_ROOT,
    env: psqlEnv(urlText, {
      DB_RUNTIME_ROLE: role,
      DB_RUNTIME_PASSWORD: roleSecret,
      ...overrides,
    }),
  });
  assert.equal(result.timedOut, false, "o script do papel excedeu a janela menor que a transação da trava");
  assert.doesNotMatch(
    result.stdout + result.stderr,
    new RegExp(roleSecret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  return result;
}

function runPsqlReadOnly(
  urlText: string,
  args: readonly string[],
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bash", ["-c", 'exec psql "$@"', "psql", ...args], {
    env: psqlEnv(urlText),
    encoding: "utf8",
    timeout: 60_000,
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function runCatalogPsql(admin: PrismaClient, urlText: string, args: readonly string[]): Promise<ChildResult> {
  return await runCatalogCommand(admin, "bash", ["-c", 'exec psql "$@"', "psql", ...args], {
    env: psqlEnv(urlText),
  });
}

function loggerSpy(): { logger: RuntimeRoleBootstrapLogger; entries: unknown[] } {
  const entries: unknown[] = [];
  return {
    entries,
    logger: {
      info: (payload, message) => entries.push({ level: "info", payload, message }),
      warn: (payload, message) => entries.push({ level: "warn", payload, message }),
      error: (payload, message) => entries.push({ level: "error", payload, message }),
    },
  };
}

function connectionParts(urlText: string): {
  hostname: string;
  port: string;
  username: string;
  password: string;
  database: string;
} {
  const url = new URL(urlText);
  return {
    hostname: url.hostname,
    port: url.port || "5432",
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  };
}

function assertConnectionSecretsAbsent(serialized: string, urls: readonly string[]): void {
  assert.doesNotMatch(serialized, /postgresql:\/\/|password/i);
  for (const urlText of urls) {
    const parts = connectionParts(urlText);
    for (const [label, value] of Object.entries(parts)) {
      if (label === "username" || value.length === 0) continue;
      assert.equal(serialized.includes(value), false, `${label} da conexão apareceu no log`);
    }
  }
}

function assertRoleNamesOnlyInIdentityFields(value: unknown, urls: readonly string[]): void {
  const usernames = urls.map((urlText) => connectionParts(urlText).username).filter(Boolean);
  const visit = (current: unknown, key: string | null): void => {
    if (typeof current === "string") {
      for (const username of usernames) {
        if (!current.includes(username)) continue;
        const allowedIdentityValue =
          (key === "session_user" || key === "current_user" || key === "rolname") && current === username;
        assert.equal(allowedIdentityValue, true, `nome de papel apareceu no campo não-identitário ${key ?? "<raiz>"}`);
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item) => visit(item, key));
      return;
    }
    if (typeof current === "object" && current !== null) {
      for (const [childKey, child] of Object.entries(current)) visit(child, childKey);
    }
  };
  visit(value, null);
}

function assertConnectionLogsSafe(entries: readonly unknown[], urls: readonly string[]): void {
  assertConnectionSecretsAbsent(JSON.stringify(entries), urls);
  assertRoleNamesOnlyInIdentityFields(entries, urls);
}

async function waitFor(
  child: ReturnType<typeof spawn>,
  predicate: (stdout: string, stderr: string) => boolean,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => (stdout += chunk));
  child.stderr?.on("data", (chunk: string) => (stderr += chunk));
  return await new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (predicate(stdout, stderr)) finish();
      else if (Date.now() - started >= timeoutMs) fail();
    }, 50);
    const onClose = (): void => {
      if (predicate(stdout, stderr)) finish();
      else fail();
    };
    const finish = (): void => {
      clearInterval(poll);
      child.off("close", onClose);
      resolve({ stdout, stderr });
    };
    const fail = (): void => {
      clearInterval(poll);
      child.off("close", onClose);
      reject(new Error(`condição de boot não apareceu em ${timeoutMs}ms\nstdout=${stdout}\nstderr=${stderr}`));
    };
    child.once("close", onClose);
  });
}

function startBackend(env: NodeJS.ProcessEnv): ReturnType<typeof spawn> {
  return spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForCloseCode(child: ReturnType<typeof spawn>, timeoutMs: number): Promise<number | null> {
  if (child.exitCode !== null) return child.exitCode;
  return await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off("close", onClose);
      reject(new Error(`processo filho não encerrou em ${timeoutMs}ms`));
    }, timeoutMs);
    const onClose = (code: number | null): void => {
      clearTimeout(timer);
      resolve(code);
    };
    child.once("close", onClose);
  });
}

async function stopChild(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  try {
    await waitForCloseCode(child, 3_000);
  } catch {
    if (child.exitCode === null) child.kill("SIGKILL");
    await waitForCloseCode(child, 3_000);
  }
}

const PROD_BASE = {
  NODE_ENV: "production",
  JWT_SECRET: "s305-jwt-production-value",
  JWT_REFRESH_SECRET: "s305-refresh-production-value",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "s305-portal-session-production-value",
  PORTAL_LOG_SECRET: "s305-portal-log-production-value",
  PORTAL_AUTHORITY_SESSION_SECRET: "s305-authority-production-value",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
  CORE_SAAS_PERSISTENCE: "prisma",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://192.0.2.1:6379",
  LOG_LEVEL: "info",
} as const;

test(
  "B-SAN3-05 · o papel de runtime não contorna FORCE RLS",
  { skip: !connectionString, timeout: 180_000 },
  async (suite) => {
    assert.ok(connectionString);
    const admin = prismaFor(connectionString);

    await suite.test("T5/T6/T9 · papel limpo passa; postgres recusa; log não expõe conexão", async () => {
      const clean = token("s305_clean");
      const cleanSecret = secret();
      await createLogin(admin, clean, cleanSecret);
      const cleanClient = prismaFor(urlForRole(connectionString, clean, cleanSecret));
      const cleanLog = loggerSpy();
      try {
        const ok = await assertRuntimeDatabaseRoleIfEnforced({
          enforce: true,
          logger: cleanLog.logger,
          loadClient: async () => cleanClient,
        });
        assert.equal(ok.enforced, true);
        const cleanUrl = urlForRole(connectionString, clean, cleanSecret);
        assertConnectionLogsSafe(cleanLog.entries, [connectionString, cleanUrl]);

        const refusedLog = loggerSpy();
        await assert.rejects(
          () =>
            assertRuntimeDatabaseRoleIfEnforced({
              enforce: true,
              logger: refusedLog.logger,
              loadClient: async () => admin,
            }),
          (error: unknown) => {
            assert.ok(error instanceof RuntimeRoleGuardError);
            assert.equal(error.code, RUNTIME_ROLE_CAN_BYPASS_RLS);
            const self = findEscape(error.escapes as Escape[], "atributo", "postgres");
            assert.equal(self.is_self, true);
            assert.equal(self.rolsuper, true);
            return true;
          },
        );
        assertConnectionLogsSafe(refusedLog.entries, [connectionString]);

        const parts = connectionParts(cleanUrl);
        assert.throws(
          () => assertConnectionLogsSafe([...cleanLog.entries, { database_host: parts.hostname }], [cleanUrl]),
          /hostname da conexão apareceu no log/,
        );
        assert.throws(
          () => assertConnectionLogsSafe([...cleanLog.entries, { database_secret: parts.password }], [cleanUrl]),
          /password|conexão apareceu no log/i,
        );
        assert.throws(
          () => assertConnectionLogsSafe([...cleanLog.entries, { database_user: parts.username }], [cleanUrl]),
          /campo não-identitário database_user/,
        );
      } finally {
        await cleanClient.$disconnect();
        await dropRole(admin, clean);
      }
    });

    await suite.test("T7/T8 · super renomeado e pertença direta, NOINHERIT, cadeia e SET FALSE recusam", async () => {
      const superRole = token("s305_super");
      const bypass = token("s305_bypass");
      const middle = token("s305_mid");
      const apps = [token("s305_appd"), token("s305_appn"), token("s305_appc"), token("s305_apps")];
      const secrets = new Map<string, string>([superRole, ...apps].map((role) => [role, secret()]));
      await catalog(admin, [
        `CREATE ROLE ${ident(superRole)} LOGIN PASSWORD ${literal(secrets.get(superRole)!)} SUPERUSER NOBYPASSRLS`,
        `CREATE ROLE ${ident(bypass)} NOLOGIN BYPASSRLS`,
        `CREATE ROLE ${ident(middle)} NOLOGIN NOSUPERUSER NOBYPASSRLS`,
        ...apps.map((role) =>
          `CREATE ROLE ${ident(role)} LOGIN PASSWORD ${literal(secrets.get(role)!)} NOSUPERUSER NOBYPASSRLS NOINHERIT`,
        ),
        `GRANT ${ident(bypass)} TO ${ident(apps[0]!)}`,
        `GRANT ${ident(bypass)} TO ${ident(apps[1]!)}`,
        `GRANT ${ident(bypass)} TO ${ident(middle)}`,
        `GRANT ${ident(middle)} TO ${ident(apps[2]!)}`,
        `GRANT ${ident(bypass)} TO ${ident(apps[3]!)} WITH SET FALSE`,
      ]);
      try {
        const renamed = await posture(urlForRole(connectionString, superRole, secrets.get(superRole)!));
        const self = findEscape(renamed.escapes as Escape[], "atributo", superRole);
        assert.equal(self.is_self, true);
        assert.equal(self.rolsuper, true);
        for (const role of apps) {
          const result = await posture(urlForRole(connectionString, role, secrets.get(role)!));
          const inherited = findEscape(result.escapes as Escape[], "atributo", bypass);
          assert.equal(inherited.is_self, false);
        }
      } finally {
        for (const role of apps) await dropRole(admin, role);
        await dropRole(admin, middle);
        await dropRole(admin, bypass);
        await dropRole(admin, superRole);
      }
    });

    await suite.test("T8b/T8c · posse e session_user continuam visíveis depois de SET ROLE", async () => {
      const owner = token("s305_owner");
      const member = token("s305_member");
      const clean = token("s305_setrole");
      const table = token("s305_force");
      const ownerSecret = secret();
      const memberSecret = secret();
      const cleanSecret = secret();
      await catalog(admin, [
        `CREATE ROLE ${ident(owner)} LOGIN PASSWORD ${literal(ownerSecret)} NOSUPERUSER NOBYPASSRLS`,
        `CREATE ROLE ${ident(member)} LOGIN PASSWORD ${literal(memberSecret)} NOSUPERUSER NOBYPASSRLS NOINHERIT`,
        `CREATE ROLE ${ident(clean)} NOLOGIN NOSUPERUSER NOBYPASSRLS`,
        `CREATE TABLE public.${ident(table)} (id int primary key)`,
        `ALTER TABLE public.${ident(table)} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE public.${ident(table)} FORCE ROW LEVEL SECURITY`,
        `ALTER TABLE public.${ident(table)} OWNER TO ${ident(owner)}`,
        `GRANT ${ident(owner)} TO ${ident(member)}`,
        `GRANT ${ident(clean)} TO ${ident(member)}`,
      ]);
      try {
        const direct = await posture(urlForRole(connectionString, owner, ownerSecret));
        assert.equal(findEscape(direct.escapes as Escape[], "posse", owner).is_self, true);
        const inherited = await posture(urlForRole(connectionString, member, memberSecret));
        assert.equal(findEscape(inherited.escapes as Escape[], "posse", owner).is_self, false);
        const switched = await posture(urlForRole(connectionString, member, memberSecret, clean));
        assert.equal(findEscape(switched.escapes as Escape[], "posse", owner).is_self, false);
        const switchedSuper = await posture(urlForRole(connectionString, "postgres", new URL(connectionString).password, clean));
        assert.equal(findEscape(switchedSuper.escapes as Escape[], "atributo", "postgres").is_self, true);
      } finally {
        await catalog(admin, [
          `ALTER TABLE public.${ident(table)} OWNER TO postgres`,
          `DROP TABLE public.${ident(table)}`,
        ]);
        await dropRole(admin, member);
        await dropRole(admin, owner);
        await dropRole(admin, clean);
      }
    });

    await suite.test("T8c · três semi-mutantes session_user→current_user perdem exatamente a via do login", async () => {
      const clean = token("s305_mclean");
      const bypass = token("s305_mbypass");
      const owner = token("s305_mowner");
      const loginBypass = token("s305_mblogin");
      const loginOwner = token("s305_mologin");
      const loginView = token("s305_mvlogin");
      const tableOwner = token("s305_motable");
      const tableView = token("s305_mvtable");
      const view = token("s305_mview");
      const credentials = new Map([loginBypass, loginOwner, loginView].map((role) => [role, secret()]));
      await catalog(admin, [
        `CREATE ROLE ${ident(clean)} NOLOGIN NOSUPERUSER NOBYPASSRLS`,
        `CREATE ROLE ${ident(bypass)} NOLOGIN BYPASSRLS`,
        `CREATE ROLE ${ident(owner)} NOLOGIN NOSUPERUSER NOBYPASSRLS`,
        ...[loginBypass, loginOwner, loginView].map(
          (role) =>
            `CREATE ROLE ${ident(role)} LOGIN PASSWORD ${literal(credentials.get(role)!)} NOSUPERUSER NOBYPASSRLS NOINHERIT`,
        ),
        `GRANT ${ident(clean)} TO ${ident(loginBypass)}, ${ident(loginOwner)}, ${ident(loginView)}`,
        `GRANT ${ident(bypass)} TO ${ident(loginBypass)}`,
        `GRANT ${ident(owner)} TO ${ident(loginOwner)}`,
        `CREATE TABLE public.${ident(tableOwner)} (id int)`,
        `ALTER TABLE public.${ident(tableOwner)} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE public.${ident(tableOwner)} FORCE ROW LEVEL SECURITY`,
        `ALTER TABLE public.${ident(tableOwner)} OWNER TO ${ident(owner)}`,
        `CREATE TABLE public.${ident(tableView)} (id int)`,
        `ALTER TABLE public.${ident(tableView)} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE public.${ident(tableView)} FORCE ROW LEVEL SECURITY`,
        `CREATE VIEW public.${ident(view)} AS SELECT * FROM public.${ident(tableView)}`,
        `GRANT SELECT ON public.${ident(view)} TO ${ident(loginView)}`,
      ]);
      const cases = [
        {
          login: loginBypass,
          via: "atributo" as const,
          role: bypass,
          from: "pg_has_role(session_user, r.oid, 'MEMBER')",
        },
        {
          login: loginOwner,
          via: "posse" as const,
          role: owner,
          from: "pg_has_role(session_user, c.relowner, 'MEMBER')",
        },
        {
          login: loginView,
          via: "view" as const,
          role: "postgres",
          from: "has_table_privilege(session_user, v.oid, 'SELECT')",
        },
      ];
      try {
        for (const item of cases) {
          const client = prismaFor(urlForRole(connectionString, item.login, credentials.get(item.login)!, clean));
          try {
            const original = await probeRuntimeRolePosture(client);
            findEscape(original.escapes as Escape[], item.via, item.role);
            assert.ok(RUNTIME_ROLE_GUARD_SQL.includes(item.from));
            const mutant = RUNTIME_ROLE_GUARD_SQL.replace(item.from, "false");
            const rows = await client.$queryRawUnsafe<Escape[]>(mutant);
            assert.equal(
              rows.some((row) => row.via === item.via && row.rolname === item.role),
              false,
              `o semi-mutante da via ${item.via} deveria perder o escape do session_user`,
            );
          } finally {
            await client.$disconnect();
          }
        }
      } finally {
        await catalog(admin, [
          `DROP VIEW IF EXISTS public.${ident(view)}`,
          `DROP TABLE IF EXISTS public.${ident(tableView)}`,
          `ALTER TABLE public.${ident(tableOwner)} OWNER TO postgres`,
          `DROP TABLE IF EXISTS public.${ident(tableOwner)}`,
        ]);
        for (const role of [loginBypass, loginOwner, loginView, owner, bypass, clean]) await dropRole(admin, role);
      }
    });

    await suite.test("T8d · REPLICATION exercível, papel de servidor e view transitiva são recusados", async () => {
      const repl = token("s305_repl");
      const program = token("s305_program");
      const viewer = token("s305_viewer");
      const readAll = token("s305_readall");
      const table = token("s305_vtable");
      const innerView = token("s305_view_i");
      const outerView = token("s305_view_o");
      const slot = token("s305_slot");
      const secrets = new Map([repl, program, viewer, readAll].map((role) => [role, secret()]));
      await catalog(admin, [
        `CREATE ROLE ${ident(repl)} LOGIN PASSWORD ${literal(secrets.get(repl)!)} REPLICATION NOSUPERUSER NOBYPASSRLS`,
        `CREATE ROLE ${ident(program)} LOGIN PASSWORD ${literal(secrets.get(program)!)} NOSUPERUSER NOBYPASSRLS`,
        `CREATE ROLE ${ident(viewer)} LOGIN PASSWORD ${literal(secrets.get(viewer)!)} NOSUPERUSER NOBYPASSRLS`,
        `CREATE ROLE ${ident(readAll)} LOGIN PASSWORD ${literal(secrets.get(readAll)!)} NOSUPERUSER NOBYPASSRLS`,
        `GRANT pg_execute_server_program TO ${ident(program)}`,
        `GRANT pg_read_all_data TO ${ident(readAll)}`,
        `CREATE TABLE public.${ident(table)} (value text)`,
        `ALTER TABLE public.${ident(table)} ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE public.${ident(table)} FORCE ROW LEVEL SECURITY`,
        `INSERT INTO public.${ident(table)} VALUES ('a'), ('b')`,
        `CREATE VIEW public.${ident(innerView)} AS SELECT * FROM public.${ident(table)}`,
        `CREATE VIEW public.${ident(outerView)} AS SELECT * FROM public.${ident(innerView)}`,
        `GRANT SELECT ON public.${ident(outerView)} TO ${ident(viewer)}`,
      ]);
      try {
        const replication = await posture(urlForRole(connectionString, repl, secrets.get(repl)!));
        findEscape(replication.escapes as Escape[], "atributo", repl);
        const replicationUrl = urlForRole(connectionString, repl, secrets.get(repl)!);
        const replicationClient = prismaFor(replicationUrl);
        try {
          const created = await replicationClient.$queryRawUnsafe<Array<{ slot_name: string }>>(
            `SELECT slot_name FROM pg_create_physical_replication_slot(${literal(slot)})`,
          );
          assert.equal(created[0]?.slot_name, slot, "a porta REPLICATION precisa criar um slot físico real");
          await replicationClient.$executeRawUnsafe(
            `DO $$ BEGIN PERFORM pg_drop_replication_slot(${literal(slot)}); END $$`,
          );
        } finally {
          await replicationClient.$disconnect();
        }
        await catalog(admin, [`ALTER ROLE ${ident(repl)} NOREPLICATION`]);
        const deniedReplicationClient = prismaFor(replicationUrl);
        try {
          await assert.rejects(
            deniedReplicationClient.$queryRawUnsafe(
              `SELECT slot_name FROM pg_create_physical_replication_slot(${literal(slot)})`,
            ),
            /42501|permission denied to use replication slots/i,
            "sem REPLICATION, a mesma porta deve recusar por privilégio",
          );
        } finally {
          await deniedReplicationClient.$disconnect();
        }
        const serverRole = await posture(urlForRole(connectionString, program, secrets.get(program)!));
        findEscape(serverRole.escapes as Escape[], "atributo", "pg_execute_server_program");
        const viaView = await posture(urlForRole(connectionString, viewer, secrets.get(viewer)!));
        assert.equal(findEscape(viaView.escapes as Escape[], "view", "postgres").objetos, 1);
        const readAllPosture = await posture(urlForRole(connectionString, readAll, secrets.get(readAll)!));
        findEscape(readAllPosture.escapes as Escape[], "view", "postgres");

        const programClient = prismaFor(urlForRole(connectionString, program, secrets.get(program)!));
        const viewerClient = prismaFor(urlForRole(connectionString, viewer, secrets.get(viewer)!));
        const readAllClient = prismaFor(urlForRole(connectionString, readAll, secrets.get(readAll)!));
        try {
          const copied = await programClient.$queryRawUnsafe<Array<{ line: string }>>(
            `COPY (SELECT 'porta-programa') TO PROGRAM 'cat >/dev/null'`,
          );
          assert.ok(Array.isArray(copied));
          const visible = await viewerClient.$queryRawUnsafe<Array<{ n: bigint }>>(
            `SELECT count(*)::bigint AS n FROM public.${ident(outerView)}`,
          );
          assert.equal(Number(visible[0]!.n), 2);
          const filtered = await readAllClient.$queryRawUnsafe<Array<{ n: bigint }>>(
            `SELECT count(*)::bigint AS n FROM public.${ident(table)}`,
          );
          assert.equal(Number(filtered[0]!.n), 0);
        } finally {
          await Promise.all([programClient.$disconnect(), viewerClient.$disconnect(), readAllClient.$disconnect()]);
        }
      } finally {
        await admin.$executeRawUnsafe(
          `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = ${literal(slot)}) THEN PERFORM pg_drop_replication_slot(${literal(slot)}); END IF; END $$`,
        );
        await catalog(admin, [
          `DROP VIEW IF EXISTS public.${ident(outerView)}`,
          `DROP VIEW IF EXISTS public.${ident(innerView)}`,
          `DROP TABLE IF EXISTS public.${ident(table)}`,
        ]);
        for (const role of [program, viewer, readAll, repl]) await dropRole(admin, role);
      }
    });

    await suite.test("T14a/b · o procedimento converge, é idempotente e falha fechado nos modos nomeados", async () => {
      const psql = spawnSync("bash", ["-c", "psql --version"], {
        encoding: "utf8",
        timeout: 10_000,
      });
      assert.equal(psql.status, 0, `psql: ausente — pré-requisito da suíte -db\n${psql.stderr ?? ""}`);
      assert.match(psql.stdout ?? "", /psql \(PostgreSQL\) 16\./, "T14b exige psql 16");
      const roleScriptSource = readFileSync(ROLE_SCRIPT, "utf8");
      assert.match(roleScriptSource, /\\password :"role"/);
      assert.match(roleScriptSource, /password_encryption=scram-sha-256/);
      assert.doesNotMatch(roleScriptSource, /san3\.password|:'password'|set_config\([^\n]*password/i);
      assert.doesNotMatch(roleScriptSource, /ALTER ROLE %I WITH PASSWORD %L/);

      const runtime = token("s305_runtime");
      const runtimeSecret = secret();
      try {
        const first = await runRoleScript(admin, connectionString, runtime, runtimeSecret);
        assert.equal(first.status, 0, first.stdout + first.stderr);
        assert.match(first.stdout, new RegExp(`^${runtime}\\|f\\|f\\|f\\|f\\|0\\|0\\|115$`, "m"));
        const firstPassword = await admin.$queryRawUnsafe<Array<{ rolpassword: string | null }>>(
          `SELECT rolpassword FROM pg_authid WHERE rolname = ${literal(runtime)}`,
        );
        assert.match(firstPassword[0]?.rolpassword ?? "", /^SCRAM-SHA-256\$/);
        const secondSecret = secret();
        const second = await runRoleScript(admin, connectionString, runtime, secondSecret, {
          PGOPTIONS: "-c password_encryption=md5",
        });
        assert.equal(second.status, 0, second.stdout + second.stderr);
        const secondPassword = await admin.$queryRawUnsafe<Array<{ rolpassword: string | null }>>(
          `SELECT rolpassword FROM pg_authid WHERE rolname = ${literal(runtime)}`,
        );
        assert.match(secondPassword[0]?.rolpassword ?? "", /^SCRAM-SHA-256\$/);
        const secondLogin = prismaFor(urlForRole(connectionString, runtime, secondSecret));
        try {
          assert.equal((await probeRuntimeRolePosture(secondLogin)).escapes.length, 0);
        } finally {
          await secondLogin.$disconnect();
        }

        const viewTable = token("s305_script_t");
        const innerView = token("s305_script_vi");
        const outerView = token("s305_script_vo");
        await catalog(admin, [
          `CREATE TABLE public.${ident(viewTable)} (id int)`,
          `ALTER TABLE public.${ident(viewTable)} ENABLE ROW LEVEL SECURITY`,
          `ALTER TABLE public.${ident(viewTable)} FORCE ROW LEVEL SECURITY`,
          `CREATE VIEW public.${ident(innerView)} AS SELECT * FROM public.${ident(viewTable)}`,
          `CREATE VIEW public.${ident(outerView)} AS SELECT * FROM public.${ident(innerView)}`,
          `GRANT SELECT ON public.${ident(outerView)} TO ${ident(runtime)}`,
        ]);
        try {
          const mode6 = await runRoleScript(admin, connectionString, runtime, secret());
          assert.equal(mode6.status, 3, mode6.stdout + mode6.stderr);
          assert.match(mode6.stderr, /MODO 6/);
        } finally {
          await catalog(admin, [
            `REVOKE SELECT ON public.${ident(outerView)} FROM ${ident(runtime)}`,
            `DROP VIEW IF EXISTS public.${ident(outerView)}`,
            `DROP VIEW IF EXISTS public.${ident(innerView)}`,
            `DROP TABLE IF EXISTS public.${ident(viewTable)}`,
          ]);
        }

        const noCreate = token("s305_nocr");
        const noCreateSecret = secret();
        await createLogin(admin, noCreate, noCreateSecret);
        try {
          const denied = await runRoleScript(
            admin,
            urlForRole(connectionString, noCreate, noCreateSecret),
            token("s305_target"),
            secret(),
          );
          assert.equal(denied.status, 3, denied.stdout + denied.stderr);
          assert.match(denied.stderr, /MODO 1/);
        } finally {
          await dropRole(admin, noCreate);
        }

        const loggingAll = await runRoleScript(admin, connectionString, runtime, secret(), {
          PGOPTIONS: "-c log_statement=all",
        });
        assert.equal(loggingAll.status, 0, loggingAll.stdout + loggingAll.stderr);
        assert.doesNotMatch(loggingAll.stderr, /MODO 0/);

        const migrator = token("s305_migrator");
        const migratorSecret = secret();
        const badAttribute = token("s305_mode2");
        const foreignTables = token("s305_mode3");
        const foreignRole = token("s305_mode4");
        const stickyRole = token("s305_mode5");
        const stickyBypass = token("s305_sticky");
        await catalog(admin, [
          `CREATE ROLE ${ident(migrator)} LOGIN PASSWORD ${literal(migratorSecret)} CREATEROLE NOSUPERUSER NOBYPASSRLS`,
          `CREATE ROLE ${ident(badAttribute)} LOGIN BYPASSRLS`,
          `CREATE ROLE ${ident(foreignTables)} LOGIN NOSUPERUSER NOBYPASSRLS`,
          `CREATE ROLE ${ident(foreignRole)} LOGIN NOSUPERUSER NOBYPASSRLS`,
          `CREATE ROLE ${ident(stickyRole)} LOGIN NOSUPERUSER NOBYPASSRLS`,
          `CREATE ROLE ${ident(stickyBypass)} NOLOGIN BYPASSRLS`,
          `GRANT ${ident(badAttribute)} TO ${ident(migrator)} WITH ADMIN OPTION`,
          `GRANT ${ident(foreignTables)} TO ${ident(migrator)} WITH ADMIN OPTION`,
          `GRANT ${ident(stickyRole)} TO ${ident(migrator)} WITH ADMIN OPTION`,
          `GRANT ${ident(stickyBypass)} TO ${ident(stickyRole)}`,
        ]);
        const migratorUrl = urlForRole(connectionString, migrator, migratorSecret);
        try {
          const mode2 = await runRoleScript(admin, migratorUrl, badAttribute, secret(), {
            DB_MIGRATOR_ROLE: migrator,
          });
          assert.equal(mode2.status, 3, mode2.stdout + mode2.stderr);
          assert.match(mode2.stderr, /MODO 2.*BYPASSRLS/s);

          const mode3 = await runRoleScript(admin, migratorUrl, foreignTables, secret(), {
            DB_MIGRATOR_ROLE: migrator,
          });
          assert.equal(mode3.status, 3, mode3.stdout + mode3.stderr);
          assert.match(mode3.stderr, /MODO 3/);

          const mode4 = await runRoleScript(admin, migratorUrl, foreignRole, secret(), {
            DB_MIGRATOR_ROLE: migrator,
          });
          assert.equal(mode4.status, 3, mode4.stdout + mode4.stderr);
          assert.match(mode4.stderr, /MODO 4/);

          const mode5 = await runRoleScript(admin, migratorUrl, stickyRole, secret(), {
            DB_MIGRATOR_ROLE: migrator,
          });
          assert.equal(mode5.status, 3, mode5.stdout + mode5.stderr);
          assert.match(mode5.stderr, /MODO 5/);
        } finally {
          for (const role of [foreignRole, foreignTables, badAttribute, stickyRole, stickyBypass, migrator]) {
            await dropRole(admin, role);
          }
        }

        const chainBypass = token("s305_chain_b");
        const chainMiddle = token("s305_chain_m");
        await catalog(admin, [
          `CREATE ROLE ${ident(chainBypass)} NOLOGIN BYPASSRLS`,
          `CREATE ROLE ${ident(chainMiddle)} NOLOGIN NOSUPERUSER NOBYPASSRLS`,
          `GRANT ${ident(chainBypass)} TO ${ident(chainMiddle)}`,
          `GRANT ${ident(chainMiddle)} TO ${ident(runtime)}`,
        ]);
        try {
          const chain = await runRoleScript(admin, connectionString, runtime, secret());
          assert.equal(chain.status, 0, chain.stdout + chain.stderr);
          const memberships = await admin.$queryRawUnsafe<Array<{ n: bigint }>>(
            `SELECT count(*)::bigint AS n FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = ${literal(runtime)})`,
          );
          assert.equal(Number(memberships[0]!.n), 0, "o primeiro salto da cadeia precisa ser revogado");
        } finally {
          await dropRole(admin, chainMiddle);
          await dropRole(admin, chainBypass);
        }

        const replicationRole = token("s305_script_repl");
        await catalog(admin, [
          `CREATE ROLE ${ident(replicationRole)} NOLOGIN REPLICATION NOSUPERUSER NOBYPASSRLS`,
          `GRANT ${ident(replicationRole)} TO ${ident(runtime)}`,
        ]);
        try {
          const replicationMembership = await runRoleScript(admin, connectionString, runtime, secret());
          assert.equal(replicationMembership.status, 0, replicationMembership.stdout + replicationMembership.stderr);
          const membership = await admin.$queryRawUnsafe<Array<{ member: boolean }>>(`
            SELECT pg_has_role(
              (SELECT oid FROM pg_roles WHERE rolname = ${literal(runtime)}),
              (SELECT oid FROM pg_roles WHERE rolname = ${literal(replicationRole)}),
              'MEMBER'
            ) AS member
          `);
          assert.equal(membership[0]!.member, false, "pertença a papel REPLICATION precisa ser revogada");
        } finally {
          await dropRole(admin, replicationRole);
        }

        const rollbackRole = token("s305_rollback");
        const rollbackTable = token("s305_rollback_t");
        const rollbackBypass = token("s305_rollback_b");
        await catalog(admin, [
          `CREATE ROLE ${ident(rollbackRole)} LOGIN SUPERUSER BYPASSRLS CREATEDB REPLICATION`,
          `CREATE ROLE ${ident(rollbackBypass)} NOLOGIN BYPASSRLS`,
          `GRANT ${ident(rollbackBypass)} TO ${ident(rollbackRole)}`,
          `CREATE TABLE public.${ident(rollbackTable)} (id int)`,
          `ALTER TABLE public.${ident(rollbackTable)} ENABLE ROW LEVEL SECURITY`,
          `ALTER TABLE public.${ident(rollbackTable)} FORCE ROW LEVEL SECURITY`,
          `ALTER TABLE public.${ident(rollbackTable)} OWNER TO ${ident(rollbackRole)}`,
        ]);
        try {
          const rollback = await runRoleScript(admin, connectionString, rollbackRole, secret());
          assert.equal(rollback.status, 3, rollback.stdout + rollback.stderr);
          assert.match(rollback.stderr, /posse:.*MODO 3/s);
          const beforeFix = await admin.$queryRawUnsafe<
            Array<{ rolsuper: boolean; rolbypassrls: boolean; rolreplication: boolean; rolcreatedb: boolean; member: boolean }>
          >(`
            SELECT r.rolsuper, r.rolbypassrls, r.rolreplication, r.rolcreatedb,
                   pg_has_role(r.oid, b.oid, 'MEMBER') AS member
            FROM pg_roles r CROSS JOIN pg_roles b
            WHERE r.rolname = ${literal(rollbackRole)} AND b.rolname = ${literal(rollbackBypass)}
          `);
          assert.deepEqual(beforeFix[0], {
            rolsuper: true,
            rolbypassrls: true,
            rolreplication: true,
            rolcreatedb: true,
            member: true,
          });
          await catalog(admin, [`ALTER TABLE public.${ident(rollbackTable)} OWNER TO postgres`]);
          const fixed = await runRoleScript(admin, connectionString, rollbackRole, secret());
          assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
          assert.match(
            fixed.stdout,
            new RegExp(`^${rollbackRole}\\|f\\|f\\|f\\|f\\|0\\|0\\|`, "m"),
            "atributos convergem",
          );
        } finally {
          await catalog(admin, [
            `ALTER TABLE IF EXISTS public.${ident(rollbackTable)} OWNER TO postgres`,
            `DROP TABLE IF EXISTS public.${ident(rollbackTable)}`,
          ]);
          await dropRole(admin, rollbackRole);
          await dropRole(admin, rollbackBypass);
        }

        const argvDir = mkdtempSync(path.join(tmpdir(), "s305-argv-"));
        const argvFile = path.join(argvDir, "argv.txt");
        const shim = path.join(argvDir, "psql");
        const argvSecret = secret();
        try {
          writeFileSync(
            shim,
            '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$SAN3_ARGV_FILE"\ncat >/dev/null\nexit 0\n',
            "utf8",
          );
          chmodSync(shim, 0o755);
          const shimmed = await runRoleScript(admin, connectionString, token("s305_argv"), argvSecret, {
            PATH: `${argvDir}${path.delimiter}${process.env.PATH ?? ""}`,
            SAN3_ARGV_FILE: argvFile,
          });
          assert.equal(shimmed.status, 0, shimmed.stdout + shimmed.stderr);
          const argv = readFileSync(argvFile, "utf8");
          assert.doesNotMatch(argv, new RegExp(argvSecret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
          assert.doesNotMatch(argv, /-v\s+password=/);
        } finally {
          rmSync(argvDir, { recursive: true, force: true });
        }

        const migratorOk = token("s305_migok");
        const migratorOkSecret = secret();
        const runtimeOk = token("s305_rtok");
        const database = token("s305_db");
        await catalog(admin, [
          `CREATE ROLE ${ident(migratorOk)} LOGIN PASSWORD ${literal(migratorOkSecret)} CREATEROLE NOSUPERUSER NOBYPASSRLS`,
        ]);
        const created = await runCatalogPsql(admin, connectionString, [
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          `CREATE DATABASE ${ident(database)} OWNER ${ident(migratorOk)}`,
        ]);
        assert.equal(created.status, 0, created.stdout + created.stderr);
        const databaseUrl = new URL(urlForRole(connectionString, migratorOk, migratorOkSecret));
        databaseUrl.pathname = `/${database}`;
        try {
          const provisioned = await runRoleScript(admin, databaseUrl.toString(), runtimeOk, secret(), {
            DB_MIGRATOR_ROLE: migratorOk,
          });
          assert.equal(provisioned.status, 0, provisioned.stdout + provisioned.stderr);
          assert.match(provisioned.stdout, new RegExp(`^${runtimeOk}\\|f\\|f\\|f\\|f\\|0\\|0\\|0$`, "m"));
          const future = await runCatalogPsql(admin, databaseUrl.toString(), [
            "-X",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            "CREATE TABLE public.future_default (id serial primary key)",
          ]);
          assert.equal(future.status, 0, future.stdout + future.stderr);
          const adminDatabaseUrl = new URL(connectionString);
          adminDatabaseUrl.pathname = `/${database}`;
          const privileges = runPsqlReadOnly(adminDatabaseUrl.toString(), [
            "-X",
            "-At",
            "-c",
            `SELECT has_table_privilege(${literal(runtimeOk)}, 'public.future_default', 'SELECT,INSERT,UPDATE,DELETE'), has_sequence_privilege(${literal(runtimeOk)}, 'public.future_default_id_seq', 'USAGE,SELECT')`,
          ]);
          assert.equal(privileges.status, 0, privileges.stdout + privileges.stderr);
          assert.match(privileges.stdout, /^t\|t$/m);
        } finally {
          await withRoleCatalogLock(admin, async () => {
            const terminated = runPsqlReadOnly(connectionString, [
              "-X",
              "-At",
              "-c",
              `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${literal(database)} AND pid <> pg_backend_pid()`,
            ]);
            assert.equal(terminated.status, 0, terminated.stdout + terminated.stderr);
          });
          const dropped = await runCatalogPsql(admin, connectionString, [
            "-X",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            `DROP DATABASE ${ident(database)}`,
          ]);
          assert.equal(dropped.status, 0, dropped.stdout + dropped.stderr);
          await dropRole(admin, runtimeOk);
          await dropRole(admin, migratorOk);
        }
      } finally {
        await dropRole(admin, runtime);
      }

      const missing = spawnSync("bash", [ROLE_SCRIPT], {
        cwd: REPO_ROOT,
        env: psqlEnv(connectionString, { DB_RUNTIME_PASSWORD: "", DB_RUNTIME_ROLE: token("s305_missing") }),
        encoding: "utf8",
        timeout: 10_000,
      });
      assert.notEqual(missing.status, 0, "senha ausente precisa propagar falha no bash/entrypoint");
    });

    await suite.test(
      "T14c · filhos escritores respeitam a trava única e a guarda estrutural é fechada",
      { timeout: 45_000 },
      async () => {
        const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
        const catalogHelperStart = source.indexOf("async function runCatalogCommand(");
        const roleHelperStart = source.indexOf("async function runRoleScript(");
        const psqlHelperStart = source.indexOf("async function runCatalogPsql(");
        assert.ok(catalogHelperStart >= 0 && roleHelperStart > catalogHelperStart && psqlHelperStart > roleHelperStart);
        const catalogHelper = source.slice(catalogHelperStart, roleHelperStart);
        const roleHelper = source.slice(roleHelperStart, source.indexOf("function runPsqlReadOnly(", roleHelperStart));
        const psqlHelper = source.slice(psqlHelperStart, source.indexOf("async function waitFor(", psqlHelperStart));
        assert.match(catalogHelper, /withRoleCatalogLock\(admin/);
        assert.match(roleHelper, /runCatalogCommand\(admin, "bash", \[ROLE_SCRIPT\]/);
        assert.doesNotMatch(roleHelper, /spawnCommand\(/);
        assert.match(psqlHelper, /runCatalogCommand\(admin, "bash"/);
        assert.equal((source.match(/\bspawnCommand\(/g) ?? []).length, 2);
        assert.equal((source.match(/\brunCatalogCommand\(/g) ?? []).length, 4);
        assert.equal((source.match(/\bROLE_SCRIPT\b/g) ?? []).length, 5);
        assert.equal((source.match(/\bspawn\(/g) ?? []).length, 2);
        assert.equal((source.match(/\bspawnSync\(/g) ?? []).length, 3);

        const heldClient = prismaFor(connectionString);
        const observer = prismaFor(connectionString);
        const role = token("s305_canary");
        const roleSecret = secret();
        let releaseLock: (() => void) | undefined;
        let announceLocked: (() => void) | undefined;
        const locked = new Promise<void>((resolve) => (announceLocked = resolve));
        const release = new Promise<void>((resolve) => (releaseLock = resolve));
        let holder: Promise<void> | undefined;
        let action: Promise<ChildResult> | undefined;
        try {
          holder = withRoleCatalogLock(heldClient, async () => {
            announceLocked?.();
            await release;
          });
          await locked;
          action = runRoleScript(admin, connectionString, role, roleSecret);
          await new Promise((resolve) => setTimeout(resolve, 400));
          const beforeRelease = await observer.$queryRawUnsafe<Array<{ n: bigint }>>(
            `SELECT count(*)::bigint AS n FROM pg_roles WHERE rolname = ${literal(role)}`,
          );
          assert.equal(Number(beforeRelease[0]!.n), 0, "nenhum efeito de catálogo pode preceder a trava");
          releaseLock?.();
          await holder;
          const result = await action;
          assert.equal(result.timedOut, false);
          assert.equal(result.status, 0, result.stdout + result.stderr);
          const afterRelease = await observer.$queryRawUnsafe<Array<{ n: bigint }>>(
            `SELECT count(*)::bigint AS n FROM pg_roles WHERE rolname = ${literal(role)}`,
          );
          assert.equal(Number(afterRelease[0]!.n), 1);
        } finally {
          releaseLock?.();
          await holder?.catch(() => undefined);
          await action?.catch(() => undefined);
          await dropRole(admin, role);
          await Promise.all([heldClient.$disconnect(), observer.$disconnect()]);
        }
      },
    );

    await suite.test(
      "T15 · boot real recusa super antes do Redis e aceita papel limpo",
      { timeout: 90_000 },
      async () => {
        const refuseBoot = async (guard: "default" | "explicit"): Promise<void> => {
          const [port, portalPort] = await Promise.all([reserveFreePort(), reserveFreePort()]);
          const env: NodeJS.ProcessEnv = {
            ...process.env,
            ...PROD_BASE,
            DATABASE_URL: connectionString,
            PORT: String(port),
            PORTAL_PORT: String(portalPort),
          };
          if (guard === "explicit") env.DATABASE_RUNTIME_ROLE_GUARD = "enforce";
          else delete env.DATABASE_RUNTIME_ROLE_GUARD;
          const child = startBackend(env);
          const started = Date.now();
          try {
            const refused = await waitFor(
              child,
              (stdout, stderr) => (stdout + stderr).includes("Failed to start ERP Techsolutions API"),
              15_000,
            );
            const refusedText = refused.stdout + refused.stderr;
            assert.ok(Date.now() - started <= 15_000);
            assert.match(refusedText, /RUNTIME_ROLE_CAN_BYPASS_RLS/);
            const firstFailure = refusedText
              .split(/\r?\n/)
              .find((line) => line.includes("Failed to start ERP Techsolutions API"));
            assert.match(firstFailure ?? "", /RUNTIME_ROLE_CAN_BYPASS_RLS/);
            assert.doesNotMatch(
              refusedText.split("Failed to start ERP Techsolutions API")[0] ?? "",
              /Redis|job worker/i,
            );
            assertConnectionSecretsAbsent(refusedText, [connectionString]);
            assert.equal(await waitForCloseCode(child, 5_000), 1, `boot ${guard} precisa sair com código 1`);
          } finally {
            await stopChild(child);
          }
        };

        await refuseBoot("explicit");
        await refuseBoot("default");

        const clean = token("s305_boot");
        const cleanSecret = secret();
        await createLogin(admin, clean, cleanSecret);
        const cleanUrl = urlForRole(connectionString, clean, cleanSecret);
        const [port, portalPort] = await Promise.all([reserveFreePort(), reserveFreePort()]);
        const cleanEnv: NodeJS.ProcessEnv = {
          ...process.env,
          ...PROD_BASE,
          DATABASE_URL: cleanUrl,
          PORT: String(port),
          PORTAL_PORT: String(portalPort),
        };
        delete cleanEnv.DATABASE_RUNTIME_ROLE_GUARD;
        const cleanBoot = startBackend(cleanEnv);
        try {
          const accepted = await waitFor(
            cleanBoot,
            (stdout, stderr) => (stdout + stderr).includes("runtime database role verified"),
            15_000,
          );
          const acceptedText = accepted.stdout + accepted.stderr;
          assert.match(acceptedText, /"escapes":0/);
          assertConnectionSecretsAbsent(acceptedText, [cleanUrl]);
        } finally {
          await stopChild(cleanBoot);
          await dropRole(admin, clean);
        }
      },
    );

    await admin.$disconnect();
  },
);
