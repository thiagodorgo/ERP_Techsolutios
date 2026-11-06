import assert from "node:assert/strict";
import test from "node:test";

import { daysInPeriod } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import {
  StatementService,
  upToDateStatus,
  type StatementInputs,
  type StatementInputsProvider,
} from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementError, type StatementAuditEvent, type SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";

// B-ASS-04 · F2/F3 — regras de estado (§4.4 regras 1–12), "em dia" e créditos (G7), com dublê em memória.
//
// MUTAÇÕES QUE ESTE ARQUIVO MATA (plano): fechar com data UTC em vez de SP → T-ST-10 vermelho; baixar em `open` →
// T-ST-14 vermelho; `/reverse` em pagamento de provedor → T-ST-42 vermelho; `<` por `<=` no grace → T-ST-24 vermelho;
// o job fechar `reopened` → T-ST-45 vermelho; ajuste sem piso → T-ST-51 vermelho; descartar o excedente → T-ST-53 vermelho.

const TENANT = "tenant-a";
const OTHER = "tenant-b";

function readyInputs(overrides: Partial<{ monthlyPriceCents: number; usersPeak: number; daysMeasured: number; planVersionId: string; period: string }> = {}): StatementInputs {
  const lastDay = daysInPeriod(overrides.period ?? "2026-10");
  return {
    kind: "ready",
    subscriptionId: "sub-1",
    planVersionId: overrides.planVersionId ?? "ver-1",
    addonPlanVersionId: null,
    computation: {
      daysInMonth: lastDay,
      segments: [{ subscriptionId: "sub-1", planVersionId: overrides.planVersionId ?? "ver-1", fromDay: 1, toDay: lastDay, monthlyPriceCents: overrides.monthlyPriceCents ?? 31_000 }],
      terms: { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 1_500, extraGbPriceCents: 250 },
      measurements: { usersPeak: overrides.usersPeak ?? 10, storagePeakMilliGb: 0, trackedVehicles: 0 },
      perVehiclePriceCents: null,
    },
    daysMeasured: overrides.daysMeasured ?? 31,
    gaps: [],
    dueDays: 10,
  };
}

function setup(provider?: StatementInputsProvider) {
  const repository = new InMemoryStatementRepository(() => new Date("2026-11-02T12:00:00Z"));
  const events: StatementAuditEvent[] = [];
  const calls: Array<{ tenantId: string; pinned: string | null }> = [];
  const inputs: StatementInputsProvider = provider ?? {
    async resolve(tenantId, _period, options) {
      calls.push({ tenantId, pinned: options.pinnedPlanVersionId });
      return readyInputs();
    },
  };
  const service = new StatementService(repository, inputs, { async record(event) { events.push(event); } });
  return { repository, service, events, calls };
}

// 1º de novembro às 00:30 em São Paulo = 03:30 UTC.
const NOV_1_0030_SP = new Date("2026-11-01T03:30:00Z");
// 31 de outubro às 23:30 em São Paulo = 1º de novembro às 02:30 UTC.
const OCT_31_2330_SP = new Date("2026-11-01T02:30:00Z");

async function closedStatement(service: StatementService, total = 31_000): Promise<SubscriptionStatement> {
  void total;
  const outcome = await service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: null, source: "job" });
  assert.equal(outcome.kind, "closed");
  return (outcome as { statement: SubscriptionStatement }).statement;
}

async function rejects(promise: Promise<unknown>, reason: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof StatementError && error.reason === reason);
}

test("T-ST-9 · fechar o mês corrente → 422 period_not_ended", async () => {
  const { service } = setup();
  await rejects(service.close({ tenantId: TENANT, period: "2026-11", now: NOV_1_0030_SP, actorId: null, source: "job" }), "period_not_ended");
});

test("T-ST-10 · borda de fuso: 1º às 00:30 SP já encerra outubro; 31/10 às 23:30 SP (já 1º/11 em UTC) não", async () => {
  const { service } = setup();
  await rejects(service.close({ tenantId: TENANT, period: "2026-10", now: OCT_31_2330_SP, actorId: null, source: "job" }), "period_not_ended");
  const outcome = await service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: null, source: "job" });
  assert.equal(outcome.kind, "closed");
});

test("T-ST-11 · fechamento idempotente: 2× em série → 1 linha, history 1, a 2ª diz alreadyClosed", async () => {
  const { service, repository } = setup();
  await closedStatement(service);
  const second = await service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: null, source: "job" });
  assert.equal(second.alreadyClosed, true);
  const rows = await repository.listStatements(TENANT);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.snapshot.history.length, 1);
});

test("T-ST-11b · 2× em paralelo → 1 linha e nenhum erro", async () => {
  const { service, repository } = setup();
  const [a, b] = await Promise.all([
    service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: null, source: "job" }),
    service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: null, source: "job" }),
  ]);
  assert.deepEqual([a.kind, b.kind].sort(), ["already_closed", "closed"]);
  assert.equal((await repository.listStatements(TENANT)).length, 1);
});

test("T-ST-12 · vencimento = fechamento + 10 dias; sem medição → warning no_usage_measured; total 0 → paid com zero_total", async () => {
  const { service } = setup({ async resolve() { return readyInputs({ daysMeasured: 0 }); } });
  const statement = await closedStatement(service);
  assert.equal(statement.dueDate, "2026-11-11");
  assert.equal(statement.snapshot.warning, "no_usage_measured");

  const zero = setup({ async resolve() { return readyInputs({ monthlyPriceCents: 0 }); } });
  const zeroStatement = await closedStatement(zero.service);
  assert.equal(zeroStatement.status, "paid");
  assert.equal(zeroStatement.snapshot.zeroTotal, true);
});

test("T-ST-13 · organização sem assinatura, de sistema ou plano sem preço → skipped com o motivo, sem linha fechada", async () => {
  for (const reason of ["no_subscription", "platform_organization", "plan_without_price"] as const) {
    const { service } = setup({ async resolve() { return { kind: "skip", reason }; } });
    const outcome = await service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: null, source: "job" });
    assert.deepEqual([outcome.kind, (outcome as { reason?: string }).reason], ["skipped", reason]);
  }
});

test("T-ST-14 · baixa só em closed: em open → 422 statement_not_closed", async () => {
  const { service, repository } = setup({ async resolve() { return { kind: "skip", reason: "no_subscription" }; } });
  await service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: null, source: "job" });
  const open = (await repository.listStatements(TENANT))[0]!;
  assert.equal(open.status, "open");
  await rejects(service.recordManualPayment({ tenantId: TENANT, statementId: open.id, amountCents: 100, method: null, note: null, actorId: "u", now: NOV_1_0030_SP }), "statement_not_closed");
});

test("T-ST-15 · baixa parcial mantém closed e o saldo; o resto fecha paid; acima do saldo → 422", async () => {
  const { service } = setup();
  const statement = await closedStatement(service);
  const partial = await service.recordManualPayment({ tenantId: TENANT, statementId: statement.id, amountCents: 10_000, method: "pix", note: null, actorId: "u", now: NOV_1_0030_SP });
  assert.equal(partial.statement.status, "closed");
  assert.equal(partial.statement.paidCents, 10_000);
  await rejects(service.recordManualPayment({ tenantId: TENANT, statementId: statement.id, amountCents: 30_000, method: null, note: null, actorId: "u", now: NOV_1_0030_SP }), "amount_exceeds_balance");
  const rest = await service.recordManualPayment({ tenantId: TENANT, statementId: statement.id, amountCents: 21_000, method: null, note: null, actorId: "u", now: NOV_1_0030_SP });
  assert.equal(rest.statement.status, "paid");
});

test("T-ST-16/17 · estorno manual: exige motivo, devolve o saldo e paid volta a closed; 2× → 422", async () => {
  const { service } = setup();
  const statement = await closedStatement(service);
  const { payment } = await service.recordManualPayment({ tenantId: TENANT, statementId: statement.id, amountCents: 31_000, method: null, note: null, actorId: "u", now: NOV_1_0030_SP });
  await rejects(service.reverseManualPayment({ tenantId: TENANT, paymentId: payment.id, reason: " ", actorId: "u", now: NOV_1_0030_SP }), "reason_required");
  const reversed = await service.reverseManualPayment({ tenantId: TENANT, paymentId: payment.id, reason: "lançado errado", actorId: "u", now: NOV_1_0030_SP });
  assert.equal(reversed.statement.status, "closed");
  assert.equal(reversed.statement.paidCents, 0);
  await rejects(service.reverseManualPayment({ tenantId: TENANT, paymentId: payment.id, reason: "de novo", actorId: "u", now: NOV_1_0030_SP }), "payment_already_reversed");
});

test("T-ST-42 · /reverse em pagamento de provedor → 422 use_refund", async () => {
  const { service } = setup();
  const statement = await closedStatement(service);
  const { payment } = await service.recordProviderPayment({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", amountCents: 31_000, method: "pix", now: NOV_1_0030_SP });
  await rejects(service.reverseManualPayment({ tenantId: TENANT, paymentId: payment.id, reason: "x", actorId: "u", now: NOV_1_0030_SP }), "use_refund");
});

test("T-ST-18/19 · auditoria: cada escrita grava a ação certa, metadata só com ids, status e centavos", async () => {
  const { service, events } = setup();
  const statement = await closedStatement(service);
  await service.recordManualPayment({ tenantId: TENANT, statementId: statement.id, amountCents: 1_000, method: null, note: "nota livre do operador", actorId: "u", now: NOV_1_0030_SP });
  assert.deepEqual(events.map((e) => e.action), ["subscription_statement.closed", "subscription_statement.payment_recorded"]);
  for (const event of events) {
    assert.equal(event.tenantId, TENANT);
    const text = JSON.stringify(event.metadata);
    assert.doesNotMatch(text, /nota livre|token|password|secret|document|cnpj|email/i);
  }
});

test("T-ST-45 · o job NUNCA fecha um reaberto (3 ciclos); só o fechamento manual refecha, com a MESMA versão (G4, G5)", async () => {
  const { service, repository, calls } = setup();
  const statement = await closedStatement(service);
  const reopened = await service.reopen({ tenantId: TENANT, statementId: statement.id, reason: "medição corrigida", actorId: "u", now: NOV_1_0030_SP });
  assert.equal(reopened.status, "reopened");
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const outcome = await service.close({ tenantId: TENANT, period: "2026-10", now: new Date(NOV_1_0030_SP.getTime() + cycle * 6 * 3_600_000), actorId: null, source: "job" });
    assert.equal(outcome.kind, "skipped");
  }
  assert.equal((await repository.listStatements(TENANT))[0]!.status, "reopened");
  const manual = await service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: "u", source: "manual" });
  assert.equal(manual.kind, "closed");
  assert.equal(calls.at(-1)!.pinned, "ver-1", "refechar usa a versão gravada no snapshot");
});

test("T-ST-46/47/48 · reabrir: com pagamento → 422; com cobrança pending → 422; com nota authorized → 422", async () => {
  const paid = setup();
  const s1 = await closedStatement(paid.service);
  await paid.service.recordManualPayment({ tenantId: TENANT, statementId: s1.id, amountCents: 1_000, method: null, note: null, actorId: "u", now: NOV_1_0030_SP });
  await rejects(paid.service.reopen({ tenantId: TENANT, statementId: s1.id, reason: "x", actorId: "u", now: NOV_1_0030_SP }), "statement_has_payments");

  const pending = setup();
  const s2 = await closedStatement(pending.service);
  pending.repository.setChannelState(s2.id, { chargeStatus: "pending" });
  await rejects(pending.service.reopen({ tenantId: TENANT, statementId: s2.id, reason: "x", actorId: "u", now: NOV_1_0030_SP }), "statement_charge_pending");

  const invoiced = setup();
  const s3 = await closedStatement(invoiced.service);
  invoiced.repository.setChannelState(s3.id, { invoiceStatus: "authorized" });
  await rejects(invoiced.service.reopen({ tenantId: TENANT, statementId: s3.id, reason: "x", actorId: "u", now: NOV_1_0030_SP }), "invoice_outstanding");
});

test("T-ST-49/50 · cancelar closed sem pagamento → cancelled; com nota viva → 422; ajuste em closed → 422", async () => {
  const { service, repository } = setup();
  const statement = await closedStatement(service);
  await rejects(service.adjust({ tenantId: TENANT, statementId: statement.id, deltaCents: -100, note: "x", actorId: "u", now: NOV_1_0030_SP }), "statement_not_adjustable");
  repository.setChannelState(statement.id, { invoiceStatus: "pending" });
  await rejects(service.cancel({ tenantId: TENANT, statementId: statement.id, reason: "x", actorId: "u", now: NOV_1_0030_SP }), "invoice_outstanding");
  repository.setChannelState(statement.id, { invoiceStatus: "none" });
  const cancelled = await service.cancel({ tenantId: TENANT, statementId: statement.id, reason: "cliente saiu", actorId: "u", now: NOV_1_0030_SP });
  assert.equal(cancelled.status, "cancelled");
});

test("T-ST-51/52 · ajuste em reaberto: abaixo de zero → 422 adjustment_exceeds_total; dentro do piso → refecha com o ajuste", async () => {
  const { service } = setup();
  const statement = await closedStatement(service);
  await service.reopen({ tenantId: TENANT, statementId: statement.id, reason: "desconto combinado", actorId: "u", now: NOV_1_0030_SP });
  await rejects(service.adjust({ tenantId: TENANT, statementId: statement.id, deltaCents: -40_000, note: "desconto", actorId: "u", now: NOV_1_0030_SP }), "adjustment_exceeds_total");
  await service.adjust({ tenantId: TENANT, statementId: statement.id, deltaCents: -1_000, note: "desconto", actorId: "u", now: NOV_1_0030_SP });
  const reclosed = await service.close({ tenantId: TENANT, period: "2026-10", now: NOV_1_0030_SP, actorId: "u", source: "manual" });
  assert.equal((reclosed as { statement: SubscriptionStatement }).statement.totalCents, 30_000);
});

test("T-ST-21..28, 43, 44 · em dia: a matriz de casos (grace 5, charged_back, reopened e paid não contam)", () => {
  const today = new Date("2026-11-20T15:00:00Z"); // 20/11 em SP
  const s = (patch: Partial<SubscriptionStatement>): SubscriptionStatement =>
    ({ status: "closed", chargeStatus: "none", totalCents: 1_000, paidCents: 0, dueDate: "2026-11-11", ...patch }) as SubscriptionStatement;
  assert.equal(upToDateStatus([], today).upToDate, true, "sem demonstrativo");
  assert.equal(upToDateStatus([s({ dueDate: "2026-11-25" })], today).upToDate, true, "dentro do prazo");
  assert.equal(upToDateStatus([s({ dueDate: "2026-11-15" })], today).upToDate, true, "vencido há 5 dias (dentro do grace)");
  const overdue = upToDateStatus([s({ dueDate: "2026-11-14" })], today);
  assert.deepEqual(overdue, { upToDate: false, overdueSince: "2026-11-14" }, "vencido há 6 dias");
  assert.equal(upToDateStatus([s({ dueDate: "2026-11-01", paidCents: 500 })], today).upToDate, false, "parcial vencido");
  assert.equal(upToDateStatus([s({ status: "paid", paidCents: 1_000, dueDate: "2026-10-01" })], today).upToDate, true, "paid");
  assert.equal(upToDateStatus([s({ status: "cancelled", dueDate: "2026-10-01" })], today).upToDate, true, "cancelled");
  assert.equal(upToDateStatus([s({ status: "paid", paidCents: 1_000 }), s({ dueDate: "2026-11-01" })], today).upToDate, false, "um pago e um vencido");
  assert.equal(upToDateStatus([s({ status: "paid", paidCents: 1_000, chargeStatus: "charged_back" })], today).upToDate, false, "charged_back derruba (G9)");
  assert.equal(upToDateStatus([s({ status: "paid", paidCents: 1_000, chargeStatus: "chargeback_disputed" })], today).upToDate, true, "chargeback_disputed não derruba (D3)");
  assert.equal(upToDateStatus([s({ status: "reopened", dueDate: "2026-10-01" })], today).upToDate, true, "reopened vencido não conta");
});

test("T-ST-53 · provedor paga 120 num saldo de 100 → aplica 100, crédito 20 overpayment (nada se perde)", async () => {
  const { service, repository } = setup({ async resolve() { return readyInputs({ monthlyPriceCents: 10_000 }); } });
  const statement = await closedStatement(service);
  const { payment, credit, statement: after } = await service.recordProviderPayment({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", amountCents: 12_000, method: "pix", now: NOV_1_0030_SP });
  assert.equal(payment.appliedCents, 10_000);
  assert.equal(after.status, "paid");
  assert.equal(credit!.amountCents, 2_000);
  assert.equal(credit!.reason, "overpayment");
  assert.equal((await repository.listCredits(TENANT)).length, 1);
});

test("T-ST-54/55 · pagamento em cancelled → crédito inteiro paid_after_cancel; após baixa manual total → paid_after_manual_settlement", async () => {
  const cancelled = setup();
  const s1 = await closedStatement(cancelled.service);
  await cancelled.service.cancel({ tenantId: TENANT, statementId: s1.id, reason: "x", actorId: "u", now: NOV_1_0030_SP });
  const r1 = await cancelled.service.recordProviderPayment({ tenantId: TENANT, statementId: s1.id, source: "asaas", externalChargeId: "p", amountCents: 31_000, method: null, now: NOV_1_0030_SP });
  assert.deepEqual([r1.payment.appliedCents, r1.credit!.amountCents, r1.credit!.reason], [0, 31_000, "paid_after_cancel"]);

  const settled = setup();
  const s2 = await closedStatement(settled.service);
  await settled.service.recordManualPayment({ tenantId: TENANT, statementId: s2.id, amountCents: 31_000, method: null, note: null, actorId: "u", now: NOV_1_0030_SP });
  const r2 = await settled.service.recordProviderPayment({ tenantId: TENANT, statementId: s2.id, source: "mercadopago", externalChargeId: "q", amountCents: 31_000, method: null, now: NOV_1_0030_SP });
  assert.equal(r2.credit!.reason, "paid_after_manual_settlement");
});

test("T-ST-56/57/58 · aplicar crédito num reaberto abate no refechamento; write-off exige motivo; crédito de outra organização = 404", async () => {
  const { service } = setup({ async resolve() { return readyInputs({ monthlyPriceCents: 10_000 }); } });
  const statement = await closedStatement(service);
  const { credit } = await service.recordProviderPayment({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "p1", amountCents: 12_000, method: null, now: NOV_1_0030_SP });
  await rejects(service.applyCredit({ tenantId: OTHER, creditId: credit!.id, statementId: statement.id, actorId: "u", now: NOV_1_0030_SP }), "credit_not_found");
  await rejects(service.writeOffCredit({ tenantId: TENANT, creditId: credit!.id, note: "", actorId: "u" }), "note_required");
  const written = await service.writeOffCredit({ tenantId: TENANT, creditId: credit!.id, note: "valor irrisório", actorId: "u" });
  assert.equal(written.status, "written_off");
});

test("T-ST-56b · crédito aplicado entra como credits_applied e abate o total do refechamento", async () => {
  const { service } = setup({ async resolve(_t, period) { return readyInputs({ monthlyPriceCents: 10_000, period }); } });
  const october = await closedStatement(service);
  const { credit } = await service.recordProviderPayment({ tenantId: TENANT, statementId: october.id, source: "asaas", externalChargeId: "p2", amountCents: 12_000, method: null, now: NOV_1_0030_SP });
  const novemberNow = new Date("2026-12-01T03:30:00Z");
  const { statement: novemberOpen } = await service["repository"].transaction(TENANT, (tx) => tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" }));
  await service.applyCredit({ tenantId: TENANT, creditId: credit!.id, statementId: novemberOpen.id, actorId: "u", now: novemberNow });
  const november = await service.close({ tenantId: TENANT, period: "2026-11", now: novemberNow, actorId: null, source: "job" });
  assert.equal((november as { statement: SubscriptionStatement }).statement.totalCents, 10_000 - 2_000);
});
