// B-ASS-08c1c, conserto da J-579 (plano do conserto §3.2, §3.4 e §4.1; Emenda 1 A1) — a tabela-verdade do estado da cobrança e a
// das linhas `charge_create`, PURAS (sem banco). Prendem: os VALORES da tabela (CR-0, a matriz 10 × 4 escrita aqui, não
// importada), as chaves exaustivas (CR-1), as 3 decisões contra a tabela (CR-2), os 2 sítios PROIBIDOS que leem `pending` direto
// (CR-3), o UNIQUE parcial da migração (CR-4), a lista SQL gerada (CR-5) e o estado desconhecido falhando fechado (CR-6).
//
// Mutações donas: M-CLS-NR (CR-6), M-CLS-TERM (CR-6), M-CLS-DISP-TERM (CR-0), M-EAGER-RULE (CR-2).
import assert from "node:assert/strict";
import test from "node:test";

import { CHARGE_RULES, chargeRule, chargeStatesWhere, sqlStatusList, type ChargeRule } from "../src/modules/subscription-billing/charges/charge-rules.js";
import { toClientPaymentView } from "../src/modules/subscription-billing/charges/charge-view.js";
import type { SubscriptionStatementCharge } from "../src/modules/subscription-billing/charges/charges.types.js";
import { OUTBOX_STATUSES, type BillingOutboxRow } from "../src/modules/subscription-billing/outbox/outbox.types.js";
import { CHARGE_CREATE_LINE_RULES, eagerPlan, refechamentoPlan, reopenLiveCheck } from "../src/modules/subscription-billing/statements/statement-charge-lines.js";
import { fullAmountChargeNotice } from "../src/modules/subscription-billing/statements/statements.platform.routes.js";
import { CHARGE_STATUSES, type ChargeStatus, type SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";

// A matriz da §3.2 do plano do conserto, LITERAL (a ordem das colunas: cancelTarget, terminal, occupiesSlot, payable).
const EXPECTED: Record<ChargeStatus, ChargeRule> = {
  none: { cancelTarget: true, terminal: false, occupiesSlot: false, payable: false },
  pending: { cancelTarget: true, terminal: false, occupiesSlot: true, payable: true },
  confirmed: { cancelTarget: false, terminal: false, occupiesSlot: true, payable: false },
  failed: { cancelTarget: true, terminal: false, occupiesSlot: false, payable: false },
  cancelled: { cancelTarget: false, terminal: true, occupiesSlot: false, payable: false },
  partially_refunded: { cancelTarget: false, terminal: false, occupiesSlot: false, payable: false },
  refunded: { cancelTarget: false, terminal: true, occupiesSlot: false, payable: false },
  chargeback_disputed: { cancelTarget: false, terminal: false, occupiesSlot: false, payable: false },
  charged_back: { cancelTarget: false, terminal: true, occupiesSlot: false, payable: false },
  needs_review: { cancelTarget: true, terminal: false, occupiesSlot: false, payable: false },
};

const QUESTIONS = ["cancelTarget", "terminal", "occupiesSlot", "payable"] as const;

function sentLine(externalId: string): BillingOutboxRow {
  const at = new Date("2026-12-01T12:00:00.000Z");
  return {
    id: "00000000-0000-4000-8000-0000000000a1",
    tenantId: "t",
    statementId: "s",
    kind: "charge_create",
    provider: "asaas",
    idempotencyKey: "charge_create:s:1",
    providerIdempotencyKey: "k",
    payload: { amountCents: 10000, dueDate: "2026-12-20", method: "pix" },
    status: "SENT",
    skipReason: null,
    claimedAt: null,
    claimedBy: null,
    attemptStartedAt: null,
    attempts: 1,
    nextAttemptAt: null,
    lastError: null,
    externalId,
    occurredAt: at,
    createdAt: at,
    updatedAt: at,
  };
}

function charge(status: ChargeStatus, externalChargeId = "pay_cr"): SubscriptionStatementCharge {
  return { id: `c_${status}`, tenantId: "t", statementId: "s", provider: "asaas", externalChargeId, status, payUrl: "https://pay.example/cr", pixCopyPaste: "000", boletoLine: null, boletoUrl: null, dueDate: "2026-12-20", createdAt: new Date(), cancelledAt: null };
}

function statement(paidCents: number): SubscriptionStatement {
  return { id: "s", tenantId: "t", period: "2026-11", status: "closed", chargeStatus: "none", invoiceStatus: "none", totalCents: 10000, paidCents, dueDate: "2026-12-20" } as unknown as SubscriptionStatement;
}

test("CR-0 (Emenda 1 A1): os VALORES de CHARGE_RULES são exatamente a matriz 10 × 4 do plano (escrita aqui, não importada)", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(CHARGE_RULES).map(([state, rule]) => [state, { ...rule }])), EXPECTED);
});

test("CR-1: as chaves de CHARGE_RULES são CHARGE_STATUSES, e as de CHARGE_CREATE_LINE_RULES são OUTBOX_STATUSES (igualdade de conjunto)", () => {
  assert.deepEqual(Object.keys(CHARGE_RULES).sort(), [...CHARGE_STATUSES].sort());
  assert.deepEqual(Object.keys(CHARGE_CREATE_LINE_RULES).sort(), [...OUTBOX_STATUSES].sort());
});

test("CR-2: para cada estado, as 3 decisões puras concordam com a tabela (uma linha SENT e a cobrança no estado)", () => {
  for (const state of CHARGE_STATUSES) {
    const rule = CHARGE_RULES[state];
    const lines = [sentLine("pay_cr")];
    const charges = [charge(state)];
    assert.equal(eagerPlan(lines, charges).cancelTargets.length, rule.cancelTarget ? 1 : 0, `eagerPlan × ${state}`);
    const refecha = refechamentoPlan(lines, charges);
    assert.equal(refecha.kind === "refuse" && refecha.reason === "charge_already_exists", !rule.terminal, `refechamentoPlan × ${state}`);
    assert.equal(reopenLiveCheck(lines, charges).liveCharge, !rule.terminal || rule.occupiesSlot, `reopenLiveCheck × ${state}`);
  }
});

test("CR-3: os 2 sítios PROIBIDOS que leem `pending` direto (a visão do cliente e o aviso Q4) concordam com `payable`", () => {
  for (const state of CHARGE_STATUSES) {
    const payable = CHARGE_RULES[state].payable;
    assert.equal(toClientPaymentView(statement(0), charge(state)) !== null, payable, `toClientPaymentView × ${state}`);
    assert.equal(fullAmountChargeNotice(statement(3000), [charge(state)]) === "full_amount_charge_open", payable, `fullAmountChargeNotice × ${state}`);
  }
});

test("CR-4: só `pending` é pagável (o UNIQUE parcial da migração assume uma por demonstrativo)", () => {
  assert.deepEqual(
    chargeStatesWhere("payable"),
    ["pending"],
    "o UNIQUE parcial de `20260900000000_ass08_billing_outbox` (`WHERE status = 'pending'`) assume uma pagável por demonstrativo; mudar `payable` exige migração",
  );
});

test("CR-5: a lista SQL é a gerada da tabela, para as 4 perguntas", () => {
  for (const question of QUESTIONS) {
    assert.equal(sqlStatusList(question), chargeStatesWhere(question).map((state) => `'${state}'`).join(", "), question);
  }
});

test("CR-6: o estado desconhecido falha fechado (alvo de cancelamento, não terminal); os 3 pagos não são alvo", () => {
  for (const rule of [CHARGE_RULES.needs_review, CHARGE_RULES.failed, CHARGE_RULES.none, chargeRule(undefined)]) {
    assert.equal(rule.cancelTarget, true);
    assert.equal(rule.terminal, false);
  }
  for (const state of ["confirmed", "partially_refunded", "chargeback_disputed"] as const) assert.equal(CHARGE_RULES[state].cancelTarget, false, state);
});
