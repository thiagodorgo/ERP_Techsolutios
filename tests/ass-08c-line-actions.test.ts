// B-ASS-08c2 (item 60) · `P-579-LINERULE-NAO-EXAUSTIVA` (plano §4.15, §5.6): a AÇÃO da tabela das linhas `charge_create` é lida
// por um `switch` exaustivo nas 3 decisões (o refechamento, a marcação imediata e o reopen), com o ramo final `unreachable`.
// LR-0 prende o comportamento de HOJE pela matriz inteira (6 status da linha × 10 estados da cobrança × 3 decisões), escrita
// LITERAL aqui e NÃO importada (a lição do A1 da Emenda 1 do conserto da J-579). LR-1: uma ação forjada em tempo de execução faz
// as 3 decisões lançarem `line_rule_action_unhandled` (falha fechado), em vez de cair num ramo permissivo.
import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARGE_CREATE_LINE_RULES,
  eagerPlan,
  refechamentoPlan,
  reopenLiveCheck,
} from "../src/modules/subscription-billing/statements/statement-charge-lines.js";

type Row = readonly [line: string, charge: string, refecha: string, eager: string, reopen: string];

/** [status da linha, estado da cobrança da linha, refechamento, marcação imediata (skippable:cancel), reopen (inFlight:liveCharge)].
 * O refechamento: `refuse:<http>:<motivo>` ou `proceed:<skipPending>:<skipSentTerminal>`. Gerada UMA vez do código de antes da
 * F14 (`revisoes/b-ass-08c2/sondas/f14-matriz.mts`, fora do repositório) e colada aqui. */
const MATRIX: readonly Row[] = [
    ["PENDING", "none", "proceed:1:0", "1:0", "false:false"],
    ["PENDING", "pending", "proceed:1:0", "1:0", "false:true"],
    ["PENDING", "confirmed", "proceed:1:0", "1:0", "false:true"],
    ["PENDING", "failed", "proceed:1:0", "1:0", "false:false"],
    ["PENDING", "cancelled", "proceed:1:0", "1:0", "false:false"],
    ["PENDING", "partially_refunded", "proceed:1:0", "1:0", "false:false"],
    ["PENDING", "refunded", "proceed:1:0", "1:0", "false:false"],
    ["PENDING", "chargeback_disputed", "proceed:1:0", "1:0", "false:false"],
    ["PENDING", "charged_back", "proceed:1:0", "1:0", "false:false"],
    ["PENDING", "needs_review", "proceed:1:0", "1:0", "false:false"],
    ["PROCESSING", "none", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["PROCESSING", "pending", "refuse:409:charge_in_flight", "0:0", "true:true"],
    ["PROCESSING", "confirmed", "refuse:409:charge_in_flight", "0:0", "true:true"],
    ["PROCESSING", "failed", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["PROCESSING", "cancelled", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["PROCESSING", "partially_refunded", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["PROCESSING", "refunded", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["PROCESSING", "chargeback_disputed", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["PROCESSING", "charged_back", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["PROCESSING", "needs_review", "refuse:409:charge_in_flight", "0:0", "true:false"],
    ["SENT", "none", "refuse:422:charge_already_exists", "0:1", "false:true"],
    ["SENT", "pending", "refuse:422:charge_already_exists", "0:1", "false:true"],
    ["SENT", "confirmed", "refuse:422:charge_already_exists", "0:0", "false:true"],
    ["SENT", "failed", "refuse:422:charge_already_exists", "0:1", "false:true"],
    ["SENT", "cancelled", "proceed:0:1", "0:0", "false:false"],
    ["SENT", "partially_refunded", "refuse:422:charge_already_exists", "0:0", "false:true"],
    ["SENT", "refunded", "proceed:0:1", "0:0", "false:false"],
    ["SENT", "chargeback_disputed", "refuse:422:charge_already_exists", "0:0", "false:true"],
    ["SENT", "charged_back", "proceed:0:1", "0:0", "false:false"],
    ["SENT", "needs_review", "refuse:422:charge_already_exists", "0:1", "false:true"],
    ["FAILED", "none", "proceed:0:0", "0:0", "false:false"],
    ["FAILED", "pending", "proceed:0:0", "0:0", "false:true"],
    ["FAILED", "confirmed", "proceed:0:0", "0:0", "false:true"],
    ["FAILED", "failed", "proceed:0:0", "0:0", "false:false"],
    ["FAILED", "cancelled", "proceed:0:0", "0:0", "false:false"],
    ["FAILED", "partially_refunded", "proceed:0:0", "0:0", "false:false"],
    ["FAILED", "refunded", "proceed:0:0", "0:0", "false:false"],
    ["FAILED", "chargeback_disputed", "proceed:0:0", "0:0", "false:false"],
    ["FAILED", "charged_back", "proceed:0:0", "0:0", "false:false"],
    ["FAILED", "needs_review", "proceed:0:0", "0:0", "false:false"],
    ["NEEDS_REVIEW", "none", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["NEEDS_REVIEW", "pending", "refuse:422:outbox_needs_review", "0:0", "false:true"],
    ["NEEDS_REVIEW", "confirmed", "refuse:422:outbox_needs_review", "0:0", "false:true"],
    ["NEEDS_REVIEW", "failed", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["NEEDS_REVIEW", "cancelled", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["NEEDS_REVIEW", "partially_refunded", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["NEEDS_REVIEW", "refunded", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["NEEDS_REVIEW", "chargeback_disputed", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["NEEDS_REVIEW", "charged_back", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["NEEDS_REVIEW", "needs_review", "refuse:422:outbox_needs_review", "0:0", "false:false"],
    ["SKIPPED", "none", "proceed:0:0", "0:0", "false:false"],
    ["SKIPPED", "pending", "proceed:0:0", "0:0", "false:true"],
    ["SKIPPED", "confirmed", "proceed:0:0", "0:0", "false:true"],
    ["SKIPPED", "failed", "proceed:0:0", "0:0", "false:false"],
    ["SKIPPED", "cancelled", "proceed:0:0", "0:0", "false:false"],
    ["SKIPPED", "partially_refunded", "proceed:0:0", "0:0", "false:false"],
    ["SKIPPED", "refunded", "proceed:0:0", "0:0", "false:false"],
    ["SKIPPED", "chargeback_disputed", "proceed:0:0", "0:0", "false:false"],
    ["SKIPPED", "charged_back", "proceed:0:0", "0:0", "false:false"],
    ["SKIPPED", "needs_review", "proceed:0:0", "0:0", "false:false"],
];

function decide(lineStatus: string, chargeStatus: string): Row {
  const line = { kind: "charge_create", status: lineStatus, provider: "asaas", externalId: "ch1" } as never;
  const charge = { provider: "asaas", externalChargeId: "ch1", status: chargeStatus } as never;
  const r = refechamentoPlan([line], [charge]);
  const e = eagerPlan([line], [charge]);
  const o = reopenLiveCheck([line], [charge]);
  return [
    lineStatus,
    chargeStatus,
    r.kind === "refuse" ? `refuse:${r.httpStatus}:${r.reason}` : `proceed:${r.skipPending.length}:${r.skipSentTerminal.length}`,
    `${e.skippable.length}:${e.cancelTargets.length}`,
    `${o.inFlight}:${o.liveCharge}`,
  ];
}

test("LR-0: as 3 decisões das linhas charge_create, pela matriz LITERAL 6 × 10 (60 linhas), batem com as funções", () => {
  assert.equal(MATRIX.length, 60, "6 status da linha × 10 estados da cobrança");
  assert.equal(new Set(MATRIX.map((row) => `${row[0]}|${row[1]}`)).size, 60, "sem par repetido");
  for (const row of MATRIX) assert.deepEqual(decide(row[0], row[1]), row, `linha ${row[0]} × cobrança ${row[1]}`);
});

test("LR-1: uma ação forjada por as never → as 3 decisões lançam line_rule_action_unhandled (falha fechado)", () => {
  const table = CHARGE_CREATE_LINE_RULES as unknown as Record<string, { refecha: string; eager: string; reopen: string }>;
  const original = table.SENT!;
  const line = { kind: "charge_create", status: "SENT", provider: "asaas", externalId: "ch1" } as never;
  const charge = { provider: "asaas", externalChargeId: "ch1", status: "pending" } as never;
  try {
    table.SENT = { ...original, refecha: "forjada" as never };
    assert.throws(() => refechamentoPlan([line], [charge]), /line_rule_action_unhandled/, "o refechamento");
    table.SENT = { ...original, eager: "forjada" as never };
    assert.throws(() => eagerPlan([line], [charge]), /line_rule_action_unhandled/, "a marcação imediata");
    table.SENT = { ...original, reopen: "forjada" as never };
    assert.throws(() => reopenLiveCheck([line], [charge]), /line_rule_action_unhandled/, "o reopen");
  } finally {
    table.SENT = original;
  }
  assert.equal(decide("SENT", "pending")[2], "refuse:422:charge_already_exists", "a tabela voltou ao normal");
});
