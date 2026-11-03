import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { LIVE_LINK_STATUSES } from "../src/modules/impound-payments/impound-payment.types.js";

// B-PATIO-REC-01 F4 — T-DOM-26 (emenda F-1, v3 §4.8 item 5). Ambiente [SB]: sem banco. A constante `LIVE_LINK_STATUSES` (que
// o repositório em memória usa para imitar a UNIQUE) tem de ser IGUAL à lista do `WHERE` da UNIQUE parcial do link aberto no
// `migration.sql` da M-REC-1, extraída por parse. Se alguém puser `funds_held`/`disputed` na UNIQUE (a forma de antes do
// fechamento), uma transição de dinheiro colidiria com a irmã (23505) e o dinheiro ficaria sem destino.

const MIGRATION = new URL("../prisma/migrations/20260890000000_impound_payment_intents/migration.sql", import.meta.url);

function liveLinkWhereList(sql: string): string[] {
  const statements = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter((statement) => /^CREATE UNIQUE INDEX "impound_payment_intents_live_link_key"/.test(statement));
  assert.equal(statements.length, 1, "a UNIQUE parcial do link aberto precisa existir exatamente uma vez na M-REC-1");
  const match = /WHERE "status" IN \(([^)]*)\)$/.exec(statements[0]!);
  assert.ok(match, `WHERE da UNIQUE fora da forma esperada: ${statements[0]}`);
  return match[1]!.split(",").map((item) => item.trim().replace(/^'|'$/g, ""));
}

test("T-DOM-26 · LIVE_LINK_STATUSES = a lista do WHERE da UNIQUE do link aberto na M-REC-1 (P-REC-27)", () => {
  const fromSql = liveLinkWhereList(readFileSync(MIGRATION, "utf8"));
  assert.deepEqual([...fromSql].sort(), [...LIVE_LINK_STATUSES].sort());
  assert.deepEqual([...LIVE_LINK_STATUSES].sort(), ["cancel_requested", "pending"]);
});
