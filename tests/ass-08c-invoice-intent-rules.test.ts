// B-ASS-08c2 (item 60) · as regras PURAS da intenção de nota (plano de abertura §4.1 item 4, §4.4, §4.9; §5.6 IR-0 a IR-4).
// Sem banco, sem rede, sem relógio. A matriz do IR-0 é LITERAL aqui (não importada): ela prende os VALORES da tabela.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  INVOICE_BACKFILL_CUTOFF,
  INVOICE_ISSUE_LINE_RULES,
  backlogCategory,
  invoiceIntentDecision,
  invoiceLineSqlList,
  invoiceLineStatesWhere,
  seqOfIdempotencyKey,
  type InvoiceIntentDecisionInput,
  type InvoiceIntentLine,
} from "../src/modules/subscription-billing/invoices/invoice-intent-rules.js";
import { OUTBOX_STATUSES, type OutboxStatus } from "../src/modules/subscription-billing/outbox/outbox.types.js";

const RULES_SOURCE = readFileSync(new URL("../src/modules/subscription-billing/invoices/invoice-intent-rules.ts", import.meta.url), "utf8");
const ID = "00000000-0000-4000-8000-000000000001";
const PAID_AT = new Date("2026-11-12T12:00:00.000Z");
const BEFORE = new Date(PAID_AT.getTime() - 1000);
const AFTER = new Date(PAID_AT.getTime() + 1000);
const CUTOFF = new Date("2026-11-11T09:43:45.000Z");

const line = (status: OutboxStatus, seq: number, occurredAt: Date, kind: InvoiceIntentLine["kind"] = "invoice_issue"): InvoiceIntentLine => ({
  kind,
  status,
  idempotencyKey: `${kind}:${ID}:${seq}`,
  occurredAt,
  skipReason: null,
});

function decide(overrides: Partial<InvoiceIntentDecisionInput> & { statement?: Partial<InvoiceIntentDecisionInput["statement"]> } = {}) {
  const { statement, ...rest } = overrides;
  return invoiceIntentDecision({
    statement: { status: "paid", totalCents: 10_000, paidAt: PAID_AT, ...statement },
    lines: [],
    live: false,
    maxInvoiceSeq: 0,
    mode: "auto",
    ...rest,
  });
}

test("IR-0: INVOICE_ISSUE_LINE_RULES = a matriz 6 × 2 LITERAL (status da fila × em voo / em conferência)", () => {
  const LITERAL: Record<string, { inFlight: boolean; inReview: boolean }> = {
    PENDING: { inFlight: true, inReview: false },
    PROCESSING: { inFlight: true, inReview: false },
    SENT: { inFlight: false, inReview: false },
    FAILED: { inFlight: false, inReview: false },
    NEEDS_REVIEW: { inFlight: false, inReview: true },
    SKIPPED: { inFlight: false, inReview: false },
  };
  assert.deepEqual(Object.keys(INVOICE_ISSUE_LINE_RULES).sort(), [...OUTBOX_STATUSES].sort(), "uma linha por status da fila, nem mais nem menos");
  for (const status of OUTBOX_STATUSES) assert.deepEqual({ ...INVOICE_ISSUE_LINE_RULES[status] }, LITERAL[status], status);
  assert.deepEqual(invoiceLineStatesWhere("inFlight"), ["PENDING", "PROCESSING"]);
  assert.deepEqual(invoiceLineStatesWhere("inReview"), ["NEEDS_REVIEW"]);
  assert.equal(invoiceLineSqlList("inFlight"), "'PENDING', 'PROCESSING'", "a lista SQL é GERADA da tabela");
  assert.equal(invoiceLineSqlList("inReview"), "'NEEDS_REVIEW'");
  assert.match(RULES_SOURCE, /as const satisfies \{ readonly \[S in OutboxStatus\]: InvoiceLineRule \}/, "a tabela é exaustiva pelo `satisfies`");
});

test("IR-1: invoiceIntentDecision, um caso por ramo, nos dois modos, com e sem corte (vale o primeiro que casar)", () => {
  // 1. não pago / valor zero
  assert.deepEqual(decide({ statement: { status: "closed" } }), { kind: "none", reason: "not_paid" });
  assert.deepEqual(decide({ statement: { status: "closed" }, mode: "operator" }), { kind: "none", reason: "not_paid" });
  assert.deepEqual(decide({ statement: { totalCents: 0 } }), { kind: "none", reason: "zero_total" });
  // 2. nota viva
  assert.deepEqual(decide({ live: true }), { kind: "none", reason: "live_invoice" });
  assert.deepEqual(decide({ live: true, mode: "operator" }), { kind: "none", reason: "live_invoice" });
  // 3. linha em voo, de QUALQUER época, nos dois modos (a regra "uma só")
  for (const status of ["PENDING", "PROCESSING"] as const) {
    assert.deepEqual(decide({ lines: [line(status, 1, BEFORE)] }), { kind: "none", reason: "in_flight" }, `${status} de outra época`);
    assert.deepEqual(decide({ lines: [line(status, 1, BEFORE)], mode: "operator" }), { kind: "none", reason: "in_flight" }, `${status}, operador`);
  }
  // 4. só no modo operador: linha em conferência
  assert.deepEqual(decide({ lines: [line("NEEDS_REVIEW", 1, BEFORE)], mode: "operator" }), { kind: "none", reason: "in_review" });
  assert.deepEqual(decide({ lines: [line("NEEDS_REVIEW", 1, BEFORE)], mode: "auto" }), { kind: "create", seq: 2 }, "no modo auto, a conferência de OUTRA época não barra");
  // 5. só no modo auto: a época já tem a sua intenção, qualquer que seja o desfecho (a regra da época)
  for (const status of ["SENT", "FAILED", "NEEDS_REVIEW", "SKIPPED"] as const) {
    assert.deepEqual(decide({ lines: [line(status, 1, PAID_AT)] }), { kind: "none", reason: "epoch_has_intent" }, `${status} no instante do pago`);
    assert.deepEqual(decide({ lines: [line(status, 1, AFTER)] }), { kind: "none", reason: "epoch_has_intent" }, `${status} depois do pago`);
  }
  assert.deepEqual(decide({ lines: [line("SENT", 1, AFTER)], mode: "operator" }), { kind: "create", seq: 2 }, "o operador reemite com o seq seguinte");
  // sem `paidAt` (falha fechado): toda linha conta como da época
  assert.deepEqual(decide({ statement: { paidAt: null }, lines: [line("SENT", 1, BEFORE)] }), { kind: "none", reason: "epoch_has_intent" });
  // 6. só com corte
  assert.deepEqual(decide({ cutoff: CUTOFF, statement: { paidAt: new Date(CUTOFF.getTime() - 1000) } }), { kind: "none", reason: "before_cutoff" });
  assert.deepEqual(decide({ cutoff: CUTOFF, statement: { paidAt: CUTOFF } }), { kind: "create", seq: 1 }, "no corte: entra");
  assert.deepEqual(decide({ cutoff: CUTOFF, statement: { paidAt: new Date(CUTOFF.getTime() + 1000) } }), { kind: "create", seq: 1 });
  assert.deepEqual(decide({ cutoff: CUTOFF, statement: { paidAt: null } }), { kind: "none", reason: "before_cutoff" }, "sem `paidAt` e com corte: falha fechado");
  assert.deepEqual(decide({ statement: { paidAt: new Date(CUTOFF.getTime() - 1000) } }), { kind: "create", seq: 1 }, "sem corte (baixa, provedor, operador), o corte não se aplica");
  // 7. criar
  assert.deepEqual(decide(), { kind: "create", seq: 1 });
  assert.deepEqual(decide({ mode: "operator" }), { kind: "create", seq: 1 });
  // a ordem: a nota viva vence a linha em voo; a linha em voo vence a época e o corte
  assert.deepEqual(decide({ live: true, lines: [line("PENDING", 1, AFTER)] }), { kind: "none", reason: "live_invoice" });
  assert.deepEqual(decide({ lines: [line("PENDING", 1, AFTER)], cutoff: CUTOFF, statement: { paidAt: new Date(CUTOFF.getTime() - 1000) } }), { kind: "none", reason: "in_flight" });
  // linhas de outros `kind` não contam
  assert.deepEqual(decide({ lines: [line("PENDING", 1, AFTER, "invoice_cancel"), line("PENDING", 1, AFTER, "charge_create")] }), { kind: "create", seq: 1 });
});

test("IR-2: seq = 1 + max(o maior seq das linhas invoice_issue, maxInvoiceSeq), lido da idempotency_key", () => {
  assert.equal(seqOfIdempotencyKey(`invoice_issue:${ID}:1`), 1);
  assert.equal(seqOfIdempotencyKey(`invoice_issue:${ID}:12`), 12);
  assert.equal(seqOfIdempotencyKey(`invoice_issue:${ID}:x`), 0, "chave fora da forma não conta");
  assert.equal(seqOfIdempotencyKey(`invoice_issue:${ID}:0`), 0);
  assert.equal(seqOfIdempotencyKey("sem-forma"), 0);
  assert.deepEqual(decide({ lines: [line("SENT", 1, BEFORE), line("FAILED", 3, BEFORE)], maxInvoiceSeq: 2 }), { kind: "create", seq: 4 }, "a linha manda");
  assert.deepEqual(decide({ lines: [line("SENT", 1, BEFORE)], maxInvoiceSeq: 5 }), { kind: "create", seq: 6 }, "a nota manda");
  assert.deepEqual(decide({ lines: [], maxInvoiceSeq: 0 }), { kind: "create", seq: 1 });
  // o seq NÃO vem do payload: uma linha com payload.seq mentiroso não muda a conta (o tipo nem o carrega)
  assert.deepEqual(decide({ lines: [{ ...line("SENT", 2, BEFORE), payload: { seq: 9 } } as InvoiceIntentLine] }), { kind: "create", seq: 3 });
});

test("IR-3: o corte é o instante do merge de a0979f51 (#530), literal, e o comentário o cita", () => {
  assert.equal(INVOICE_BACKFILL_CUTOFF.toISOString(), "2026-11-11T09:43:45.000Z");
  assert.match(RULES_SOURCE, /a0979f51/);
  assert.match(RULES_SOURCE, /D-DONO-TODAS-RECOMENDACOES-1111/);
  assert.match(RULES_SOURCE, /export const INVOICE_BACKFILL_CUTOFF = new Date\("2026-11-11T09:43:45\.000Z"\);/, "constante literal, sem env");
  assert.doesNotMatch(RULES_SOURCE, /process\.env|from "\.\.\/\.\.\/\.\.\/config\/env/, "o módulo puro não lê env");
});

test("IR-4: backlogCategory, um caso por categoria, e a precedência", () => {
  const paid = { status: "paid" as const, totalCents: 10_000, paidAt: PAID_AT };
  const epoch = (status: OutboxStatus, seq = 1, skipReason: "provider_disabled" | null = null) => ({ status, skipReason, occurredAt: AFTER, seq });
  const old = (status: OutboxStatus, seq = 1) => ({ status, skipReason: null, occurredAt: BEFORE, seq });
  // live_on_unpaid: nota viva num demonstrativo que não está pago (estorno de só uma parte; recusa do cancelamento)
  assert.equal(backlogCategory({ statement: { ...paid, status: "closed" }, live: true, cutoff: CUTOFF }), "live_on_unpaid");
  assert.equal(backlogCategory({ statement: { ...paid, status: "closed" }, live: true, lastLine: epoch("NEEDS_REVIEW"), cutoff: CUTOFF }), "live_on_unpaid", "precede todas");
  // before_cutoff: pago antes do corte, sem intenção da época
  const early = { ...paid, paidAt: new Date(CUTOFF.getTime() - 1000) };
  assert.equal(backlogCategory({ statement: early, live: false, cutoff: CUTOFF }), "before_cutoff");
  assert.equal(backlogCategory({ statement: early, live: false, lastLine: { ...old("SENT"), occurredAt: new Date(CUTOFF.getTime() - 5000) }, cutoff: CUTOFF }), "before_cutoff", "linha de época anterior não conta");
  // awaiting_provider: intenção da época PENDING com provider_disabled
  assert.equal(backlogCategory({ statement: paid, live: false, lastLine: epoch("PENDING", 1, "provider_disabled"), cutoff: CUTOFF }), "awaiting_provider");
  assert.equal(backlogCategory({ statement: early, live: false, lastLine: { ...epoch("PENDING", 1, "provider_disabled"), occurredAt: early.paidAt }, cutoff: CUTOFF }), "awaiting_provider", "com intenção da época, o corte não se aplica");
  // needs_review: intenção da época NEEDS_REVIEW ou FAILED, ou nota da época rejeitada
  assert.equal(backlogCategory({ statement: paid, live: false, lastLine: epoch("NEEDS_REVIEW"), cutoff: CUTOFF }), "needs_review");
  assert.equal(backlogCategory({ statement: paid, live: false, lastLine: epoch("FAILED"), cutoff: CUTOFF }), "needs_review");
  assert.equal(backlogCategory({ statement: paid, live: false, lastLine: epoch("SENT", 2), lastInvoice: { seq: 2, status: "rejected" }, cutoff: CUTOFF }), "needs_review");
  assert.equal(backlogCategory({ statement: paid, live: false, lastLine: epoch("SENT", 2), lastInvoice: { seq: 1, status: "rejected" }, cutoff: CUTOFF }), null, "a nota rejeitada de OUTRA época não é desta");
  // no_intent: pago desde o corte, sem intenção da época
  assert.equal(backlogCategory({ statement: paid, live: false, cutoff: CUTOFF }), "no_intent");
  assert.equal(backlogCategory({ statement: paid, live: false, lastLine: old("SENT"), cutoff: CUTOFF }), "no_intent", "a linha da época anterior não conta");
  // o resto não aparece
  assert.equal(backlogCategory({ statement: paid, live: false, lastLine: epoch("PENDING"), cutoff: CUTOFF }), null, "em voo");
  assert.equal(backlogCategory({ statement: paid, live: true, lastLine: epoch("SENT"), cutoff: CUTOFF }), null, "nota viva sobre pago");
  assert.equal(backlogCategory({ statement: paid, live: true, lastLine: epoch("NEEDS_REVIEW"), cutoff: CUTOFF }), null, "nota viva sobre pago, mesmo com a linha em conferência");
  assert.equal(backlogCategory({ statement: { ...paid, status: "closed" }, live: false, cutoff: CUTOFF }), null, "não pago sem nota viva");
  assert.equal(backlogCategory({ statement: { ...paid, totalCents: 0 }, live: false, cutoff: CUTOFF }), null, "valor zero não tem nota");
});
