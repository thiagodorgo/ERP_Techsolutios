import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MIGRATION = "prisma/migrations/20260901000000_impound_process_regime_snapshot/migration.sql";

export function splitNaive(sql: string): string[] {
  return sql.split(";").map((part) => part.trim()).filter(Boolean);
}

export function splitRespectingDollarQuotes(sql: string): string[] {
  const out: string[] = [];
  let start = 0;
  let dollarTag: string | undefined;
  for (let i = 0; i < sql.length; i += 1) {
    if (sql[i] === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        if (!dollarTag) dollarTag = match[0];
        else if (dollarTag === match[0]) dollarTag = undefined;
        i += match[0].length - 1;
        continue;
      }
    }
    if (sql[i] === ";" && !dollarTag) {
      out.push(sql.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  const tail = sql.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter((statement) => statement && !statement.startsWith("-- ROLLBACK"));
}

test("B-O6R-12 C4-C7/C14/C16/C23: migração é transacional, segura e reversível", () => {
  const sql = readFileSync(MIGRATION, "utf8").replace(/\r\n/g, "\n");
  const statements = splitRespectingDollarQuotes(sql.split("\n-- ROLLBACK")[0]!);
  assert.equal(statements.length, 10, `BEGIN + 8 sentenças + COMMIT; achei ${statements.length}`);
  assert.match(statements[0]!, /BEGIN;/);
  assert.match(statements.at(-1)!, /COMMIT;/);
  assert.match(sql, /impound_processes_tenant_id_regime_daily_service_catalog_i_fkey/);
  assert.doesNotMatch(sql, /impound_processes_tenant_id_regime_daily_service_catalog_id_fkey/);
  assert.match(sql, /SET search_path = pg_catalog, public/);
  assert.match(sql, /FROM public\."jurisdiction_profiles"/);
  assert.match(sql, /PERFORM set_config\('app\.current_tenant_id', v_tenant::text, true\)/);
  assert.match(sql, /CREATE TRIGGER "impound_processes_regime_immutable"/);
  assert.match(sql, /ERRCODE = 'foreign_key_violation'/);
  assert.match(sql, /ALTER TABLE "impound_processes" ALTER COLUMN "regime_scope" DROP NOT NULL/);
});
