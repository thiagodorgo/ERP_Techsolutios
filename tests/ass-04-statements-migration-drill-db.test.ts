// B-ASS-04 · R-ST-11 — drill da M3 (`20260898000000_ass04_subscription_statements`): up em base própria,
// down em transação única, atomicidade por prefixo, RLS ENABLE+FORCE nas 4 tabelas e isolamento entre
// organizações sob papel NOSUPERUSER NOBYPASSRLS (T-ST-db-5 parcial).
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const M3 = "20260898000000_ass04_subscription_statements";
const TABLES = [
  "subscription_statements",
  "subscription_statement_payments",
  "subscription_credits",
  "tenant_billing_profiles",
] as const;
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
  const lines = migrationSql(M3).split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- down"));
  assert.ok(start >= 0, "M3 contém o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|DELETE)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

function inClause(): string {
  return TABLES.map((table) => `'${table}'`).join(", ");
}

async function catalog(db: any): Promise<{ tables: number; forced: number; policies: number }> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (${inClause()})) AS tables,
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN (${inClause()}) AND c.relrowsecurity AND c.relforcerowsecurity) AS forced,
      (SELECT count(*)::int FROM pg_policies WHERE tablename IN (${inClause()})
        AND qual LIKE '%app.current_tenant_id%' AND with_check LIKE '%app.current_tenant_id%') AS policies`,
  )) as Array<{ tables: number; forced: number; policies: number }>;
  return rows[0]!;
}

if (!connectionString) {
  test("B-ASS-04 · drill M3 exige DATABASE_URL e CREATE DATABASE", {
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

  test("M3 drill: migrate deploy aplica as 4 tabelas, UNIQUEs e RLS ENABLE+FORCE", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass04_m3_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
      M3,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 1);
    assert.deepEqual(await catalog(db), { tables: 4, forced: 4, policies: 4 });
  });

  test("M3 drill: down em transação única não toca tabelas preexistentes e o re-up converge", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.equal(down.length, 5, "runbook down da M3 tem quatro DROP e um DELETE escopado");
    await db.$transaction(down.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), { tables: 0, forced: 0, policies: 0 });
    const sentinel = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'tenants' AND c.relkind = 'r'`,
    )) as Array<{ n: number }>;
    assert.equal(sentinel[0]!.n, 1, "tabela anterior ao bloco permanece");
    const statements = bodyStatements(M3);
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), { tables: 4, forced: 4, policies: 4 });
  });

  test("M3 drill: todo prefixo quebrado é atômico", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((sql) => db.$executeRawUnsafe(sql)));
    const statements = bodyStatements(M3);
    assert.ok(statements.length >= 8, "M3 tem uma sequência material de DDL");
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM ass04_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql) => db.$executeRawUnsafe(sql))));
      assert.deepEqual(
        await catalog(db),
        { tables: 0, forced: 0, policies: 0 },
        `prefixo k=${k} não deixa resíduo`,
      );
    }
  });

  test("M3 drill: RLS — papel NOSUPERUSER NOBYPASSRLS sem GUC vê zero; com o GUC de A não vê B", async () => {
    assert.ok(db, "depende do deploy");
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });

    const insertTenant = async (tag: string): Promise<{ tenantId: string; statementId: string }> => {
      const slug = `ass04-rls-${tag}-${randomUUID().slice(0, 8)}`;
      const tenants = (await db.$queryRawUnsafe(
        `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
        slug,
      )) as Array<{ id: string }>;
      const tenantId = tenants[0]!.id;
      const statements = (await db.$queryRawUnsafe(
        `INSERT INTO subscription_statements
           (tenant_id, period, segments, users_included, users_peak, users_extra,
            storage_included_gb, storage_peak_gb, storage_extra_gb, tracked_vehicles,
            days_in_month, days_measured, extra_user_price, extra_gb_price,
            base_amount, users_extra_amount, storage_extra_amount, tracking_amount,
            adjustments_amount, credits_applied_amount, total_amount, snapshot)
         VALUES ($1::uuid, '2026-10', '[]'::jsonb, 0, 0, 0, 0, 0, 0, 0, 31, 31, 0, 0,
                 0, 0, 0, 0, 0, 0, 0, '{"latest": null, "history": []}'::jsonb)
         RETURNING id`,
        tenantId,
      )) as Array<{ id: string }>;
      const statementId = statements[0]!.id;
      await db.$executeRawUnsafe(
        `INSERT INTO subscription_statement_payments (tenant_id, statement_id, source, amount, applied_amount, paid_at)
         VALUES ($1::uuid, $2::uuid, 'manual', 10.00, 10.00, now())`,
        tenantId,
        statementId,
      );
      await db.$executeRawUnsafe(
        `INSERT INTO subscription_credits (tenant_id, origin_statement_id, amount, reason)
         VALUES ($1::uuid, $2::uuid, 1.00, 'overpayment')`,
        tenantId,
        statementId,
      );
      await db.$executeRawUnsafe(
        `INSERT INTO tenant_billing_profiles (tenant_id) VALUES ($1::uuid)`,
        tenantId,
      );
      return { tenantId, statementId };
    };

    const a = await insertTenant("a");
    const b = await insertTenant("b");

    const role = await createEphemeralRole(db, target.toString());
    try {
      const posture = (await role.client.$queryRawUnsafe(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
      )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }]);

      for (const table of TABLES) {
        const empty = (await role.client.$queryRawUnsafe(
          `SELECT count(*)::int AS n FROM ${table}`,
        )) as Array<{ n: number }>;
        assert.equal(empty[0]!.n, 0, `sem GUC, ${table} devolve zero linhas`);
      }

      const { withTenantRls } = await import("../src/database/rls.js");
      for (const table of TABLES) {
        const viaA = await withTenantRls(role.client, a.tenantId, async (tx: any) => {
          const rows = (await tx.$queryRawUnsafe(`SELECT tenant_id FROM ${table} ORDER BY tenant_id`)) as Array<{
            tenant_id: string;
          }>;
          return rows;
        });
        assert.equal(viaA.length, 1, `GUC de A vê exatamente uma linha de ${table}`);
        assert.deepEqual(viaA.map((row) => row.tenant_id), [a.tenantId], `GUC de A nunca vê linha de B em ${table}`);

        const viaB = await withTenantRls(role.client, b.tenantId, async (tx: any) => {
          const rows = (await tx.$queryRawUnsafe(`SELECT tenant_id FROM ${table} ORDER BY tenant_id`)) as Array<{
            tenant_id: string;
          }>;
          return rows;
        });
        assert.equal(viaB.length, 1, `GUC de B vê exatamente uma linha de ${table}`);
        assert.deepEqual(viaB.map((row) => row.tenant_id), [b.tenantId], `GUC de B nunca vê linha de A em ${table}`);
      }
    } finally {
      await role.drop();
    }
  });
}
