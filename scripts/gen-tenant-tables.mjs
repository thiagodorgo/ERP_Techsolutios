#!/usr/bin/env node
// B-ASS-03 · F4 — gerador da constante censurada do medidor (R-MED-9).
// Conecta ao Postgres (DATABASE_URL) e escreve `src/modules/subscription-billing/metering/censored-tables.ts`
// com as tabelas do schema `public` que têm `relforcerowsecurity = true` E coluna `tenant_id` NOT NULL,
// exceto as globalmente excluídas: cloud_charge_rules, roles, platform_audit_logs.
// Regenerar: DATABASE_URL=postgresql://... node scripts/gen-tenant-tables.mjs

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("gen-tenant-tables: DATABASE_URL ausente");
  process.exit(1);
}

const EXCLUDED = new Set(["cloud_charge_rules", "roles", "platform_audit_logs"]);

const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("@prisma/client");
const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

try {
  const rows = await admin.$queryRawUnsafe(`
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
  const tables = rows.map((row) => row.name).filter((name) => !EXCLUDED.has(name));
  const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/modules/subscription-billing/metering/censored-tables.ts");
  const lines = [
    "// B-ASS-03 · F4 — constante censurada do medidor, GERADA por `node scripts/gen-tenant-tables.mjs`.",
    "// Não editar à mão. Tabelas do schema `public` com `relforcerowsecurity = true` E `tenant_id` NOT NULL,",
    "// exceto cloud_charge_rules / roles / platform_audit_logs (R-MED-9).",
    "export const CENSORED_TENANT_TABLES = [",
    ...tables.map((name) => `  "${name}",`),
    "] as const;",
    "",
  ];
  writeFileSync(target, lines.join("\n"), "utf8");
  console.log(`gen-tenant-tables: ${tables.length} tabelas gravadas em ${target}`);
} finally {
  await admin.$disconnect();
}