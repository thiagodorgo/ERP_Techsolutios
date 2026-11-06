// B-ASS-03 · F4 — T-MED-db-8 (R-MED-9): a constante censurada do medidor casa com o catálogo vivo
// (`relforcerowsecurity = true` ∩ coluna `tenant_id` NOT NULL, schema `public`) e as tabelas globais
// excluídas não aparecem nela. A mutação proibida é derivar "toda tabela com tenant_id" do DMMF.
import "dotenv/config";

import assert from "node:assert/strict";
import test, { after } from "node:test";

import { CENSORED_TENANT_TABLES } from "../src/modules/subscription-billing/metering/censored-tables.js";

const connectionString = process.env.DATABASE_URL;
const EXCLUDED = new Set(["cloud_charge_rules", "roles", "platform_audit_logs"]);

if (!connectionString) {
  test("B-ASS-03 · censo exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL para executar T-MED-db-8.",
  });
} else {
  let adminPromise: ReturnType<typeof bootstrap> | undefined;
  const bootstrap = async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
  };
  const admin = (): ReturnType<typeof bootstrap> => (adminPromise ??= bootstrap());

  after(async () => {
    if (!adminPromise) return;
    const client = await adminPromise;
    await client.$disconnect();
  });

  test("T-MED-db-8 · a constante censurada casa com o catálogo vivo e exclui as tabelas globais", async () => {
    const client = await admin();
    const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(`
      SELECT c.relname AS name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relforcerowsecurity = true
         AND a.attname = 'tenant_id'
         AND NOT a.attisdropped
         AND a.attnotnull
       ORDER BY c.relname`);
    const naive = rows.map((row) => row.name);
    const expected = naive.filter((name) => !EXCLUDED.has(name)).sort();
    const actual = [...CENSORED_TENANT_TABLES].sort();

    const missing = expected.filter((name) => !actual.includes(name));
    const extra = actual.filter((name) => !expected.includes(name));
    assert.deepEqual(
      actual,
      expected,
      `censo divergente — faltando: [${missing.join(", ")}]; sobrando: [${extra.join(", ")}]`,
    );

    for (const name of EXCLUDED) {
      assert.ok(!actual.includes(name), `tabela global ${name} não pode estar na lista censurada`);
    }
  });
}