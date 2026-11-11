// B-ASS-08 · F12 — drill da M5 (`20260900000000_ass08_billing_outbox`): up em base própria, down em transação única,
// atomicidade por prefixo, RLS ENABLE+FORCE nas 3 tabelas de organização (billing_outbox,
// subscription_statement_invoices, subscription_statement_charges) e isolamento sob papel NOSUPERUSER NOBYPASSRLS.
// As 3 globais (billing_webhook_events, billing_statement_refs, billing_invoice_sequences) existem e NÃO são FORCE RLS.
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
const M5 = "20260900000000_ass08_billing_outbox";
const TABLES_ALL = [
  "billing_outbox",
  "billing_webhook_events",
  "billing_statement_refs",
  "subscription_statement_invoices",
  "subscription_statement_charges",
  "billing_invoice_sequences",
] as const;
const TABLES_RLS = ["billing_outbox", "subscription_statement_invoices", "subscription_statement_charges"] as const;
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
  const lines = migrationSql(M5).split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- down"));
  assert.ok(start >= 0, "M5 contém o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|DELETE)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

function inClause(tables: readonly string[]): string {
  return tables.map((table) => `'${table}'`).join(", ");
}

async function catalog(db: any): Promise<{ tables: number; forced: number; policies: number }> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (${inClause(TABLES_ALL)})) AS tables,
      (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN (${inClause(TABLES_RLS)}) AND c.relrowsecurity AND c.relforcerowsecurity) AS forced,
      (SELECT count(*)::int FROM pg_policies WHERE tablename IN (${inClause(TABLES_RLS)})
        AND qual LIKE '%app.current_tenant_id%' AND with_check LIKE '%app.current_tenant_id%') AS policies`,
  )) as Array<{ tables: number; forced: number; policies: number }>;
  return rows[0]!;
}

if (!connectionString) {
  test("B-ASS-08 · drill M5 exige DATABASE_URL e CREATE DATABASE", {
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

  test("M5 drill: migrate deploy aplica as 6 tabelas e RLS ENABLE+FORCE só nas 3 de organização", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_ass08_m5_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
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
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      M5,
    )) as Array<{ n: number }>;
    assert.equal(applied[0]!.n, 1);
    assert.deepEqual(await catalog(db), { tables: 6, forced: 3, policies: 3 });
    // As 3 globais NÃO têm FORCE RLS.
    const globals = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN ('billing_webhook_events','billing_statement_refs','billing_invoice_sequences')
        AND (c.relrowsecurity OR c.relforcerowsecurity)`,
    )) as Array<{ n: number }>;
    assert.equal(globals[0]!.n, 0, "as globais não são RLS");
  });

  test("M5 drill: down em transação única não toca tabelas preexistentes e o re-up converge", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.equal(down.length, 7, "runbook down da M5 tem seis DROP e um DELETE escopado");
    await db.$transaction(down.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), { tables: 0, forced: 0, policies: 0 });
    const sentinel = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'subscription_statements' AND c.relkind = 'r'`,
    )) as Array<{ n: number }>;
    assert.equal(sentinel[0]!.n, 1, "tabela anterior ao bloco permanece");
    const statements = bodyStatements(M5);
    await db.$transaction(statements.map((sql) => db.$executeRawUnsafe(sql)));
    assert.deepEqual(await catalog(db), { tables: 6, forced: 3, policies: 3 });
  });

  test("M5 drill: todo prefixo quebrado é atômico", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((sql) => db.$executeRawUnsafe(sql)));
    const statements = bodyStatements(M5);
    assert.ok(statements.length >= 20, "M5 tem uma sequência material de DDL");
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM ass08_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((sql) => db.$executeRawUnsafe(sql))));
      assert.deepEqual(await catalog(db), { tables: 0, forced: 0, policies: 0 }, `prefixo k=${k} não deixa resíduo`);
    }
  });

  test("M5 drill: RLS — papel NOSUPERUSER NOBYPASSRLS sem GUC vê zero; com o GUC de A não vê B", async () => {
    assert.ok(db, "depende do deploy");
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target.toString() },
      stdio: "pipe",
    });

    const insertTenant = async (tag: string): Promise<{ tenantId: string }> => {
      const slug = `ass08-rls-${tag}-${randomUUID().slice(0, 8)}`;
      const tenants = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)) as Array<{ id: string }>;
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
        `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key)
         VALUES ($1::uuid, $2::uuid, 'charge_create', 'asaas', $3, gen_random_uuid())`,
        tenantId,
        statementId,
        `charge_create:${statementId}:1`,
      );
      await db.$executeRawUnsafe(
        `INSERT INTO subscription_statement_invoices (tenant_id, statement_id, provider, external_ref)
         VALUES ($1::uuid, $2::uuid, 'focusnfe', $3)`,
        tenantId,
        statementId,
        `focusnfe:${statementId}:1`,
      );
      await db.$executeRawUnsafe(
        `INSERT INTO subscription_statement_charges (tenant_id, statement_id, provider, external_charge_id)
         VALUES ($1::uuid, $2::uuid, 'asaas', $3)`,
        tenantId,
        statementId,
        `pay_${tag}_${statementId.slice(0, 8)}`,
      );
      return { tenantId };
    };

    const a = await insertTenant("a");
    const b = await insertTenant("b");

    const role = await createEphemeralRole(db, target.toString());
    try {
      const posture = (await role.client.$queryRawUnsafe(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
      )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }]);

      for (const table of TABLES_RLS) {
        const empty = (await role.client.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${table}`)) as Array<{ n: number }>;
        assert.equal(empty[0]!.n, 0, `sem GUC, ${table} devolve zero linhas`);
      }

      const { withTenantRls } = await import("../src/database/rls.js");
      for (const table of TABLES_RLS) {
        const viaA = await withTenantRls(role.client, a.tenantId, async (tx: any) => {
          return (await tx.$queryRawUnsafe(`SELECT tenant_id FROM ${table} ORDER BY tenant_id`)) as Array<{ tenant_id: string }>;
        });
        assert.deepEqual(viaA.map((row) => row.tenant_id), [a.tenantId], `GUC de A só vê A em ${table}`);
        const viaB = await withTenantRls(role.client, b.tenantId, async (tx: any) => {
          return (await tx.$queryRawUnsafe(`SELECT tenant_id FROM ${table} ORDER BY tenant_id`)) as Array<{ tenant_id: string }>;
        });
        assert.deepEqual(viaB.map((row) => row.tenant_id), [b.tenantId], `GUC de B só vê B em ${table}`);
      }
    } finally {
      await role.drop();
    }
  });
}
