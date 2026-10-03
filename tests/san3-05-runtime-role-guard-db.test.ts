import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import net, { type AddressInfo } from "node:net";
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

function runRoleScript(
  urlText: string,
  role: string,
  roleSecret: string,
  overrides: Record<string, string> = {},
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bash", [ROLE_SCRIPT], {
    cwd: REPO_ROOT,
    env: psqlEnv(urlText, {
      DB_RUNTIME_ROLE: role,
      DB_RUNTIME_PASSWORD: roleSecret,
      ...overrides,
    }),
    encoding: "utf8",
    timeout: 60_000,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  assert.doesNotMatch(stdout + stderr, new RegExp(roleSecret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  return { status: result.status, stdout, stderr };
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
  DATABASE_RUNTIME_ROLE_GUARD: "enforce",
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
        assert.doesNotMatch(JSON.stringify(cleanLog.entries), /postgresql:\/\/|password|127\.0\.0\.1|55405/i);

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
        assert.doesNotMatch(JSON.stringify(refusedLog.entries), /postgresql:\/\/|password|127\.0\.0\.1|55405/i);
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

    await suite.test("T8d · REPLICATION, papel de servidor e view de dono que escapa são recusados", async () => {
      const repl = token("s305_repl");
      const program = token("s305_program");
      const viewer = token("s305_viewer");
      const readAll = token("s305_readall");
      const table = token("s305_vtable");
      const view = token("s305_view");
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
        `INSERT INTO public.${ident(table)} VALUES ('a'), ('b'), ('marcador')`,
        `CREATE VIEW public.${ident(view)} AS SELECT * FROM public.${ident(table)}`,
        `GRANT SELECT ON public.${ident(view)} TO ${ident(viewer)}`,
      ]);
      try {
        const replication = await posture(urlForRole(connectionString, repl, secrets.get(repl)!));
        findEscape(replication.escapes as Escape[], "atributo", repl);
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
            `SELECT count(*)::bigint AS n FROM public.${ident(view)}`,
          );
          assert.equal(Number(visible[0]!.n), 3);
          const filtered = await readAllClient.$queryRawUnsafe<Array<{ n: bigint }>>(
            `SELECT count(*)::bigint AS n FROM public.${ident(table)}`,
          );
          assert.equal(Number(filtered[0]!.n), 0);
        } finally {
          await Promise.all([programClient.$disconnect(), viewerClient.$disconnect(), readAllClient.$disconnect()]);
        }
      } finally {
        await catalog(admin, [
          `DROP VIEW IF EXISTS public.${ident(view)}`,
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

      const runtime = token("s305_runtime");
      const runtimeSecret = secret();
      try {
        const first = runRoleScript(connectionString, runtime, runtimeSecret);
        assert.equal(first.status, 0, first.stdout + first.stderr);
        assert.match(first.stdout, new RegExp(`^${runtime}\\|f\\|f\\|f\\|f\\|0\\|0\\|115$`, "m"));
        const second = runRoleScript(connectionString, runtime, secret());
        assert.equal(second.status, 0, second.stdout + second.stderr);

        const viewTable = token("s305_script_t");
        const view = token("s305_script_v");
        await catalog(admin, [
          `CREATE TABLE public.${ident(viewTable)} (id int)`,
          `ALTER TABLE public.${ident(viewTable)} ENABLE ROW LEVEL SECURITY`,
          `ALTER TABLE public.${ident(viewTable)} FORCE ROW LEVEL SECURITY`,
          `CREATE VIEW public.${ident(view)} AS SELECT * FROM public.${ident(viewTable)}`,
          `GRANT SELECT ON public.${ident(view)} TO ${ident(runtime)}`,
        ]);
        const mode6 = runRoleScript(connectionString, runtime, secret());
        assert.equal(mode6.status, 3, mode6.stdout + mode6.stderr);
        assert.match(mode6.stderr, /MODO 6/);
        await catalog(admin, [
          `REVOKE SELECT ON public.${ident(view)} FROM ${ident(runtime)}`,
          `DROP VIEW public.${ident(view)}`,
          `DROP TABLE public.${ident(viewTable)}`,
        ]);

        const noCreate = token("s305_nocr");
        const noCreateSecret = secret();
        await createLogin(admin, noCreate, noCreateSecret);
        try {
          const denied = runRoleScript(
            urlForRole(connectionString, noCreate, noCreateSecret),
            token("s305_target"),
            secret(),
          );
          assert.equal(denied.status, 3, denied.stdout + denied.stderr);
          assert.match(denied.stderr, /MODO 1/);
        } finally {
          await dropRole(admin, noCreate);
        }

        const mode0 = runRoleScript(connectionString, runtime, secret(), { PGOPTIONS: "-c log_statement=all" });
        assert.equal(mode0.status, 3, mode0.stdout + mode0.stderr);
        assert.match(mode0.stderr, /MODO 0/);
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

    await suite.test("T15 · boot real recusa super antes do Redis e aceita papel limpo", async () => {
      const [portA, portalA, portB, portalB] = await Promise.all([
        reserveFreePort(),
        reserveFreePort(),
        reserveFreePort(),
        reserveFreePort(),
      ]);
      const adminBoot = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ...PROD_BASE,
          DATABASE_URL: connectionString,
          PORT: String(portA),
          PORTAL_PORT: String(portalA),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      const started = Date.now();
      const refused = await waitFor(
        adminBoot,
        (stdout, stderr) => (stdout + stderr).includes("Failed to start ERP Techsolutions API"),
        30_000,
      );
      const refusedText = refused.stdout + refused.stderr;
      assert.ok(Date.now() - started <= 15_000);
      assert.match(refusedText, /RUNTIME_ROLE_CAN_BYPASS_RLS/);
      const firstFailure = refusedText
        .split(/\r?\n/)
        .find((line) => line.includes("Failed to start ERP Techsolutions API"));
      assert.match(firstFailure ?? "", /RUNTIME_ROLE_CAN_BYPASS_RLS/);
      assert.doesNotMatch(refusedText.split("Failed to start ERP Techsolutions API")[0] ?? "", /Redis|job worker/i);
      if (adminBoot.exitCode === null) adminBoot.kill("SIGKILL");

      const clean = token("s305_boot");
      const cleanSecret = secret();
      await createLogin(admin, clean, cleanSecret);
      const cleanUrl = urlForRole(connectionString, clean, cleanSecret);
      const cleanBoot = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          ...PROD_BASE,
          DATABASE_URL: cleanUrl,
          PORT: String(portB),
          PORTAL_PORT: String(portalB),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      try {
        const accepted = await waitFor(
          cleanBoot,
          (stdout, stderr) => (stdout + stderr).includes("runtime database role verified"),
          15_000,
        );
        assert.match(accepted.stdout + accepted.stderr, /"escapes":0/);
        assert.doesNotMatch(accepted.stdout + accepted.stderr, /postgresql:\/\/|password/i);
      } finally {
        if (cleanBoot.exitCode === null) cleanBoot.kill("SIGTERM");
        await new Promise<void>((resolve) => {
          if (cleanBoot.exitCode !== null) resolve();
          else cleanBoot.once("close", () => resolve());
          setTimeout(() => {
            if (cleanBoot.exitCode === null) cleanBoot.kill("SIGKILL");
          }, 3_000).unref();
        });
        await dropRole(admin, clean);
      }
    });

    await admin.$disconnect();
  },
);
