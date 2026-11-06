// B-ASS-05 · R-VLT-9 — drill da M4 (`20260899000000_ass05_billing_vault`): up em base própria, down em transação
// única, atomicidade por prefixo, as travas do banco (um segredo vivo por slot, IV de 12 e authTag de 16 bytes,
// listas fechadas) e a prova de que o papel de runtime (NOSUPERUSER NOBYPASSRLS) LÊ e ESCREVE nas 3 tabelas
// globais pelos repositórios Prisma — a trava G-DB-ROLE não as bloqueia (`tenants` é o precedente).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const M4 = "20260899000000_ass05_billing_vault";
const TABLES = ["billing_provider_configs", "billing_provider_credentials", "platform_audit_logs"] as const;
const migrationSql = (): string =>
  readFileSync(path.join(ROOT, "prisma", "migrations", M4, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

function bodyStatements(): string[] {
  return migrationSql()
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/;\s*$/, "").trim())
    .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
}

function downStatements(): string[] {
  const lines = migrationSql().split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- down"));
  assert.ok(start >= 0, "M4 contém o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|DELETE)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

async function tableCount(db: any): Promise<number> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (${TABLES.map((t) => `'${t}'`).join(", ")})`,
  )) as Array<{ n: number }>;
  return rows[0]!.n;
}

if (!connectionString) {
  test("B-ASS-05 · drill M4 exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill da migração.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  let admin: any;
  let db: any;
  let databaseName: string | undefined;
  let url = "";

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("M4 drill: migrate deploy aplica as 3 tabelas, sem RLS (globais, exceção declarada)", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass05_m4_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    url = target.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    const applied = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      M4,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 1);
    assert.equal(await tableCount(db), 3);
    const rls = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_class WHERE relname IN (${TABLES.map((t) => `'${t}'`).join(", ")}) AND (relrowsecurity OR relforcerowsecurity)`,
    )) as Array<{ n: number }>;
    assert.equal(rls[0]!.n, 0, "as 3 são globais: sem RLS");
  });

  test("M4 drill: as travas do banco — um segredo vivo por slot, IV/authTag no tamanho, listas fechadas", async () => {
    assert.ok(db, "depende do deploy");
    const insert = (id: string, kind: string, iv = 12, tag = 16, revoked = false) =>
      db.$executeRawUnsafe(
        `INSERT INTO billing_provider_credentials (id, provider, environment, kind, ciphertext, iv, auth_tag, key_version, fingerprint, last4, revoked_at)
         VALUES ($1::uuid, 'asaas', 'sandbox', $2, '\\x01'::bytea, $3::bytea, $4::bytea, 1, '0123456789abcdef', 'ABCD', $5)`,
        id, kind, randomBytes(iv), randomBytes(tag), revoked ? new Date() : null,
      );
    await insert(randomUUID(), "api_token");
    await insert(randomUUID(), "webhook_secret");
    await insert(randomUUID(), "api_token", 12, 16, true);
    await assert.rejects(insert(randomUUID(), "api_token"), /unique|duplicate|23505/i, "segunda viva do mesmo kind");
    await assert.rejects(insert(randomUUID(), "api_token", 11), /check|23514/i, "IV de 11 bytes");
    await assert.rejects(insert(randomUUID(), "certificate", 12, 15), /check|23514/i, "authTag de 15 bytes");
    await assert.rejects(insert(randomUUID(), "password"), /check|23514/i, "kind fora da lista");
    await assert.rejects(
      db.$executeRawUnsafe(`INSERT INTO billing_provider_configs (provider, kind) VALUES ('pagseguro', 'payment')`),
      /check|23514/i,
      "provedor fora do catálogo",
    );
    await db.$executeRawUnsafe(`DELETE FROM billing_provider_credentials`);
  });

  test("M4 drill (R-VLT-9): o papel de runtime lê e escreve nas 3 tabelas pelos repositórios Prisma", async () => {
    assert.ok(db, "depende do deploy");
    const role = await createEphemeralRole(db, url);
    try {
      const posture = (await role.client.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }]);
      const { PrismaCredentialRepository, PrismaProviderConfigRepository } = await import("../src/modules/subscription-billing/vault/vault.prisma-runtime.js");
      const { PrismaPlatformAuditWriter } = await import("../src/modules/subscription-billing/platform-audit/platform-audit.prisma.js");
      const { buildVaultRuntime } = await import("../src/modules/subscription-billing/vault/vault.factory.js");
      const { EnvVaultKeyProvider } = await import("../src/modules/subscription-billing/vault/vault-keys.js");
      const runtime = buildVaultRuntime({
        credentials: new PrismaCredentialRepository(role.client),
        configs: new PrismaProviderConfigRepository(role.client),
        audit: new PrismaPlatformAuditWriter(role.client),
        keys: new EnvVaultKeyProvider({ BILLING_VAULT_KEY: randomBytes(32).toString("base64"), BILLING_VAULT_KEY_VERSION: "1" }),
      });
      await runtime.providers.updateSettings("asaas", { environment: "sandbox", settings: {} });
      await runtime.vault.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: "SECRET-ABC123-XYZ" }, actorId: null });
      await runtime.vault.setCredential({ provider: "asaas", environment: "sandbox", credential: { kind: "api_token", secret: "SECRET-ABC123-XY2" }, actorId: null });
      assert.equal((await runtime.vault.readSecretForProvider("asaas", "sandbox", "api_token"))!.reveal(), "SECRET-ABC123-XY2");
      const counts = (await db.$queryRawUnsafe(
        `SELECT (SELECT count(*) FROM billing_provider_configs)::int AS configs,
                (SELECT count(*) FROM billing_provider_credentials)::int AS credentials,
                (SELECT count(*) FROM billing_provider_credentials WHERE revoked_at IS NULL)::int AS live,
                (SELECT count(*) FROM platform_audit_logs)::int AS audit`,
      )) as Array<Record<string, number>>;
      assert.deepEqual(counts[0], { configs: 1, credentials: 2, live: 1, audit: 3 });
      const leak = (await db.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM billing_provider_credentials WHERE position(convert_to('SECRET', 'UTF8') in ciphertext) > 0`,
      )) as Array<{ n: number }>;
      assert.equal(leak[0]!.n, 0, "o banco só tem ciphertext");
      const audit = (await db.$queryRawUnsafe(`SELECT metadata::text AS m FROM platform_audit_logs`)) as Array<{ m: string }>;
      assert.equal(audit.some((row) => row.m.includes("SECRET")), false, "a trilha não carrega o segredo");
    } finally {
      await role.drop();
    }
  });

  test("M4 drill: down em transação única não toca tabelas preexistentes e o re-up converge", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.equal(down.length, 4, "runbook down da M4 tem três DROP e um DELETE escopado");
    await db.$transaction(down.map((sql: string) => db.$executeRawUnsafe(sql)));
    assert.equal(await tableCount(db), 0);
    const sentinel = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'tenants' AND c.relkind = 'r'`,
    )) as Array<{ n: number }>;
    assert.equal(sentinel[0]!.n, 1, "tabela anterior ao bloco permanece");
    await db.$transaction(bodyStatements().map((sql: string) => db.$executeRawUnsafe(sql)));
    assert.equal(await tableCount(db), 3);
  });

  test("M4 drill: todo prefixo quebrado é atômico", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((sql: string) => db.$executeRawUnsafe(sql)));
    const statements = bodyStatements();
    assert.ok(statements.length >= 7, "M4 tem uma sequência material de DDL");
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM ass05_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql: string) => db.$executeRawUnsafe(sql))));
      assert.equal(await tableCount(db), 0, `prefixo k=${k} não deixa resíduo`);
    }
  });
}
