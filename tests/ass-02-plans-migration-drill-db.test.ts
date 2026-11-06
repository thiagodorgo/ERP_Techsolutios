import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const M1 = "20260893000000_ass02_subscription_plans";
const M1B = "20260894000000_ass02_platform_billing_permissions";
const migrationPath = (name: string): string =>
  path.join(ROOT, "prisma", "migrations", name, "migration.sql");
const migrationSql = (name: string): string =>
  readFileSync(migrationPath(name), "utf8").replace(/\r\n/g, "\n");

function bodyStatements(name: string): string[] {
  return migrationSql(name)
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/;\s*$/, "").trim())
    .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
}

function downStatements(name: string): string[] {
  const lines = migrationSql(name).split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- down"));
  assert.ok(start >= 0, `${name} contém o runbook down`);
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|DELETE)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

function m1DownStatements(): string[] {
  return downStatements(M1);
}

// B-ASS-04: a M3 tem FK para as tabelas da M1 (o demonstrativo aponta a assinatura e a versão do plano). O rollback
// real é em ordem inversa: primeiro o down de quem depende da M1, depois o da M1.
const M1_DEPENDENTS = ["20260898000000_ass04_subscription_statements"];

if (!connectionString) {
  test("B-ASS-02 · drill M1/M1b exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill das migrações.",
  });
} else {
  let admin: any;
  let db: any;
  let databaseName: string | undefined;

  async function catalog(): Promise<{
    tables: number;
    forced: number;
    policies: number;
    activeIndexes: number;
  }> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT
        (SELECT count(*)::int FROM pg_class WHERE relkind = 'r' AND relname = ANY($1::text[])) AS tables,
        (SELECT count(*)::int FROM pg_class WHERE relname = ANY($2::text[]) AND relrowsecurity AND relforcerowsecurity) AS forced,
        (SELECT count(*)::int FROM pg_policies WHERE tablename = ANY($2::text[])
          AND qual LIKE '%app.current_tenant_id%' AND with_check LIKE '%app.current_tenant_id%') AS policies,
        (SELECT count(*)::int FROM pg_indexes WHERE indexname = ANY($3::text[])) AS "activeIndexes"`,
      ["subscription_plans", "subscription_plan_versions", "tenant_subscriptions", "tenant_subscription_addons"],
      ["tenant_subscriptions", "tenant_subscription_addons"],
      ["tenant_subscriptions_tenant_id_active_key", "tenant_subscription_addons_tenant_id_subscription_active_key"],
    )) as Array<{ tables: number; forced: number; policies: number; activeIndexes: number }>;
    return rows[0]!;
  }

  const applyBody = async (name: string): Promise<void> => {
    await db.$transaction(bodyStatements(name).map((sql) => db.$executeRawUnsafe(sql)));
  };

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.$disconnect();
  });

  test("M1 drill: migrate deploy aplica tabelas, índices parciais e RLS completo", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass02_m1_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }) });
    const applied = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations
        WHERE migration_name = ANY($1::text[]) AND finished_at IS NOT NULL`,
      [M1, M1B, "20260895000000_ass02_seed_subscription_plans"],
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 3);
    assert.deepEqual(await catalog(), { tables: 4, forced: 2, policies: 2, activeIndexes: 2 });
  });

  test("M1 drill: down em transação única não toca tabelas preexistentes e o re-up converge", async () => {
    assert.ok(db, "depende do deploy");
    const down = m1DownStatements();
    assert.equal(down.length, 5, "runbook down da M1 tem quatro DROP e um DELETE escopado");
    for (const dependent of M1_DEPENDENTS) {
      await db.$transaction(downStatements(dependent).map((sql) => db.$executeRawUnsafe(sql)));
    }
    await db.$transaction(down.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(), { tables: 0, forced: 0, policies: 0, activeIndexes: 0 });
    const sentinel = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_class WHERE relname = 'tenants' AND relkind = 'r'`,
    )) as Array<{ n: number }>;
    assert.equal(sentinel[0]!.n, 1, "tabela anterior ao bloco permanece");
    await applyBody(M1);
    assert.deepEqual(await catalog(), { tables: 4, forced: 2, policies: 2, activeIndexes: 2 });
  });

  test("M1 drill: todo prefixo quebrado é atômico", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(m1DownStatements().slice(0, 4).map((sql) => db.$executeRawUnsafe(sql)));
    const statements = bodyStatements(M1);
    assert.ok(statements.length >= 20, "M1 tem uma sequência material de DDL");
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM ass02_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql) => db.$executeRawUnsafe(sql))));
      assert.deepEqual(
        await catalog(),
        { tables: 0, forced: 0, policies: 0, activeIndexes: 0 },
        `prefixo k=${k} não deixa resíduo`,
      );
    }
    await applyBody(M1);
  });

  test("M1b drill: duas permissões convergem e são concedidas ao super_admin", async () => {
    assert.ok(db, "depende do deploy");
    await db.$executeRawUnsafe(
      `INSERT INTO roles (key, name, scope) VALUES ('super_admin', 'Super Admin', 'system')`,
    );
    await applyBody(M1B);
    await applyBody(M1B);
    const rows = (await db.$queryRawUnsafe(
      `SELECT p.key, count(rp.id)::int AS grants
         FROM permissions p
         LEFT JOIN role_permissions rp ON rp.permission_id = p.id
         LEFT JOIN roles r ON r.id = rp.role_id AND r.key = 'super_admin'
        WHERE p.key = ANY($1::text[])
        GROUP BY p.key ORDER BY p.key`,
      ["platform:billing:manage", "platform:billing:read"],
    )) as Array<{ key: string; grants: number }>;
    assert.deepEqual(rows, [
      { key: "platform:billing:manage", grants: 1 },
      { key: "platform:billing:read", grants: 1 },
    ]);
  });
}
