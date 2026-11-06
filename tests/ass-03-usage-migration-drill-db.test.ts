// B-ASS-03 · R-MED-7 — drill da M2 (`20260896000000_ass03_tenant_usage_daily`): up em base própria,
// down em transação única, atomicidade por prefixo e RLS ENABLE+FORCE.
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
const M2 = "20260896000000_ass03_tenant_usage_daily";
const migrationPath = (name: string): string => path.join(ROOT, "prisma", "migrations", name, "migration.sql");
const migrationSql = (name: string): string => readFileSync(migrationPath(name), "utf8").replace(/\r\n/g, "\n");

function bodyStatements(name: string): string[] {
  return migrationSql(name)
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/;\s*$/, "").trim())
    .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
}

function downStatements(): string[] {
  const lines = migrationSql(M2).split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- down"));
  assert.ok(start >= 0, "M2 contém o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|DELETE)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

async function catalog(db: any): Promise<{ tables: number; forced: number; policies: number }> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'tenant_usage_daily') AS tables,
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'tenant_usage_daily' AND c.relrowsecurity AND c.relforcerowsecurity) AS forced,
      (SELECT count(*)::int FROM pg_policies WHERE tablename = 'tenant_usage_daily'
        AND qual LIKE '%app.current_tenant_id%' AND with_check LIKE '%app.current_tenant_id%') AS policies`,
  )) as Array<{ tables: number; forced: number; policies: number }>;
  return rows[0]!;
}

if (!connectionString) {
  test("B-ASS-03 · drill M2 exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill da migração.",
  });
} else {
  let admin: any;
  let db: any;
  let databaseName: string | undefined;

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.$disconnect();
  });

  test("M2 drill: migrate deploy aplica tabela, UNIQUE e RLS ENABLE+FORCE", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass03_m2_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
        WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      M2,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 1);
    assert.deepEqual(await catalog(db), { tables: 1, forced: 1, policies: 1 });
  });

  test("M2 drill: down em transação única não toca tabelas preexistentes e o re-up converge", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.equal(down.length, 2, "runbook down da M2 tem um DROP e um DELETE escopado");
    await db.$transaction(down.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), { tables: 0, forced: 0, policies: 0 });
    const sentinel = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'tenants' AND c.relkind = 'r'`,
    )) as Array<{ n: number }>;
    assert.equal(sentinel[0]!.n, 1, "tabela anterior ao bloco permanece");
    const statements = bodyStatements(M2);
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), { tables: 1, forced: 1, policies: 1 });
  });

  test("M2 drill: todo prefixo quebrado é atômico", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((sql) => db.$executeRawUnsafe(sql)));
    const statements = bodyStatements(M2);
    assert.ok(statements.length >= 4, "M2 tem uma sequência material de DDL");
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM ass03_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql) => db.$executeRawUnsafe(sql))));
      assert.deepEqual(
        await catalog(db),
        { tables: 0, forced: 0, policies: 0 },
        `prefixo k=${k} não deixa resíduo`,
      );
    }
  });
}
