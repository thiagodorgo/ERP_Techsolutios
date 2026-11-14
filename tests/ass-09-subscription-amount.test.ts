import assert from "node:assert/strict";
import test from "node:test";

import { daysInPeriod } from "../src/modules/subscription-billing/statements/statement.engine.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import {
  StatementService,
  type StatementInputs,
  type StatementInputsProvider,
} from "../src/modules/subscription-billing/statements/statement.service.js";
import type { StatementAuditEvent, SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";
import { formatCents } from "../src/modules/subscription-billing/overview/overview-money.js";
import { alertFor } from "../src/modules/subscription-billing/overview/overview.engine.js";
import {
  SubscriptionAmountError,
  subscriptionAmountOf,
  type SubscriptionAmountRuntime,
} from "../src/modules/subscription-billing/overview/subscription-amount.js";
import type { SubscriptionAmount } from "../src/modules/subscription-billing/overview/overview.types.js";

// B-ASS-09 · F3 — a assinatura do período de cada organização (plano v2 §3 P3; §6 C3: R-SUB-1..7). Valores sintéticos.
//
// BASE (Q5 = RECOMENDAÇÃO, D-DONO-1311-RECOMENDACOES, decisão do dono de 13/11 ~23:20 SP): a assinatura do mês é o valor
// ANTES de abater o crédito (`totalCents + creditsAppliedCents` do demonstrativo); o total do demonstrativo e o crédito usado
// vêm SEPARADOS. Nunca o caixa (`paidCents`).
//
// MUTAÇÕES LITERAIS QUE ESTE ARQUIVO MATA:
//   M-SUB-1  `BigInt(statement.totalCents + statement.creditsAppliedCents)` → `BigInt(statement.totalCents)` → T-SUB-1, T-SUB-7
//   M-SUB-7  `BigInt(statement.totalCents + statement.creditsAppliedCents)` → `BigInt(statement.paidCents)` → T-SUB-7
//   M-SUB-2  `return projectAmount(runtime, tenantId, period);` → `return fromStatement((await runtime.service.close({
//            tenantId, period, now, actorId: "overview", source: "manual" })).statement)`                → T-SUB-2
//   M-SUB-3  `case "paid":` → `case "paid":` + `case "cancelled":` (o cancelado cai no ramo do fechado)       → T-SUB-3
//   M-SUB-4  `{ source: "statement_reopened", estimate: true }` → `… estimate: false }`                       → T-SUB-4
//   M-SUB-5  `subscriptionAmountCents: null,` → `subscriptionAmountCents: 0n,`                               → T-SUB-5
//   M-SUB-6  apagar `if (statement && statement.status !== "open") return fromStatement(statement);`        → T-SUB-6

const TENANT = "tenant-a";
const OTHER = "tenant-b";
// 2 de novembro, 09:00 em São Paulo: outubro já encerrou, novembro é o mês corrente.
const NOW = new Date("2026-11-02T12:00:00.000Z");

function readyInputs(period: string, monthlyPriceCents: number): StatementInputs {
  const lastDay = daysInPeriod(period);
  return {
    kind: "ready",
    subscriptionId: "sub-1",
    planVersionId: "ver-1",
    addonPlanVersionId: null,
    computation: {
      daysInMonth: lastDay,
      segments: [{ subscriptionId: "sub-1", planVersionId: "ver-1", fromDay: 1, toDay: lastDay, monthlyPriceCents }],
      terms: { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 1_500, extraGbPriceCents: 250 },
      measurements: { usersPeak: 3, storagePeakMilliGb: 1_000, trackedVehicles: 0 },
      perVehiclePriceCents: null,
    },
    daysMeasured: lastDay,
    gaps: [],
    dueDays: 10,
  };
}

function setup(resolve?: StatementInputsProvider["resolve"]) {
  const repository = new InMemoryStatementRepository(() => NOW);
  const events: StatementAuditEvent[] = [];
  const calls: Array<{ readonly tenantId: string; readonly period: string }> = [];
  const inputs: StatementInputsProvider = {
    async resolve(tenantId, period, options) {
      calls.push({ tenantId, period });
      return resolve ? resolve(tenantId, period, options) : readyInputs(period, 19_990);
    },
  };
  const service = new StatementService(repository, inputs, {
    async record(event) {
      events.push(event);
    },
  });
  const runtime: SubscriptionAmountRuntime = { repository, inputs, service };
  return { repository, runtime, events, calls };
}

/** Grava um demonstrativo no estado pedido (pela porta do repositório, como o fechamento faria). */
async function seed(
  repository: InMemoryStatementRepository,
  tenantId: string,
  period: string,
  patch: Partial<SubscriptionStatement>,
): Promise<SubscriptionStatement> {
  return repository.transaction(tenantId, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId, period });
    return tx.saveStatement({ ...statement, ...patch });
  });
}

function shown(amount: SubscriptionAmount) {
  const cents = (value: bigint | null) => (value === null ? null : formatCents(value));
  return {
    subscriptionAmount: cents(amount.subscriptionAmountCents),
    statementTotal: cents(amount.statementTotalCents),
    creditsApplied: cents(amount.creditsAppliedCents),
    subscriptionBasis: amount.subscriptionBasis,
    source: amount.source,
    skipReason: amount.skipReason,
    estimate: amount.estimate,
  };
}

test("T-SUB-1 · fechado, total 900.00 e crédito aplicado 100.00 → a assinatura do mês é 1000.00 (antes do crédito), e os dois números vêm separados", async () => {
  const { repository, runtime } = setup();
  await seed(repository, TENANT, "2026-10", { status: "closed", totalCents: 90_000, creditsAppliedCents: 10_000, paidCents: 0 });
  const amount = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW });
  assert.deepEqual(shown(amount), {
    subscriptionAmount: "1000.00",
    statementTotal: "900.00",
    creditsApplied: "100.00",
    subscriptionBasis: "before_credits",
    source: "statement",
    skipReason: null,
    estimate: false,
  });
  // A escolha da base muda o alerta, e o teste a trava: custo 750.00 sobre 1000.00 é 75 % (abaixo de 80 %) → "none";
  // na base líquida (900.00) seria 83 % → "warning".
  assert.equal(alertFor(amount.subscriptionAmountCents, 75_000n), "none");
  // `paid` segue o mesmo ramo.
  await seed(repository, OTHER, "2026-10", { status: "paid", totalCents: 50_000, creditsAppliedCents: 0, paidCents: 50_000 });
  assert.equal(shown(await subscriptionAmountOf(runtime, { tenantId: OTHER, period: "2026-10", now: NOW })).subscriptionAmount, "500.00");
});

test("T-SUB-2 · sem demonstrativo (ou com a linha aberta) → projeção 199.90, estimativa, e nada é gravado", async () => {
  const { repository, runtime, events, calls } = setup();
  const amount = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW });
  assert.deepEqual(shown(amount), {
    subscriptionAmount: "199.90",
    statementTotal: null,
    creditsApplied: null,
    subscriptionBasis: "before_credits",
    source: "projection",
    skipReason: null,
    estimate: true,
  });
  assert.deepEqual(calls, [{ tenantId: TENANT, period: "2026-10" }]);
  assert.equal((await repository.listStatements(TENANT)).length, 0, "a projeção não grava demonstrativo");
  assert.equal(events.length, 0, "a projeção não grava trilha");

  // A linha `open` (a que o fechamento deixa quando pula a organização) também projeta, e não muda.
  const open = await seed(repository, OTHER, "2026-10", {});
  assert.equal(open.status, "open");
  const projected = await subscriptionAmountOf(runtime, { tenantId: OTHER, period: "2026-10", now: NOW });
  assert.equal(projected.source, "projection");
  assert.equal(formatCents(projected.subscriptionAmountCents!), "199.90");
  const rows = await repository.listStatements(OTHER);
  assert.deepEqual(rows.map((row) => row.status), ["open"]);
  assert.equal(events.length, 0);
});

test("T-SUB-3 · cancelado → 0.00 (cancelled); com custo 10.00 o alerta é crítico", async () => {
  const { repository, runtime } = setup();
  await seed(repository, TENANT, "2026-10", { status: "cancelled", totalCents: 50_000, creditsAppliedCents: 0 });
  const amount = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW });
  assert.equal(shown(amount).subscriptionAmount, "0.00");
  assert.equal(amount.source, "cancelled");
  assert.equal(amount.estimate, false);
  assert.equal(alertFor(amount.subscriptionAmountCents, 1_000n), "critical");
});

test("T-SUB-4 · reaberto → o valor gravado, com estimativa e fonte statement_reopened", async () => {
  const { repository, runtime, calls } = setup();
  await seed(repository, TENANT, "2026-10", { status: "reopened", totalCents: 30_000, creditsAppliedCents: 1_000 });
  const amount = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW });
  assert.deepEqual(
    [shown(amount).subscriptionAmount, shown(amount).statementTotal, amount.source, amount.estimate],
    ["310.00", "300.00", "statement_reopened", true],
  );
  assert.equal(calls.length, 0, "o reaberto lê a linha gravada, não projeta");
});

test("T-SUB-5 · sem assinatura → null (none, com o motivo) e o alerta é no_subscription, nunca crítico", async () => {
  for (const reason of ["no_subscription", "plan_without_price"] as const) {
    const { runtime } = setup(async () => ({ kind: "skip", reason }));
    const amount = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW });
    assert.deepEqual(
      [amount.subscriptionAmountCents, amount.statementTotalCents, amount.creditsAppliedCents, amount.source, amount.skipReason, amount.estimate],
      [null, null, null, "none", reason, false],
    );
    assert.equal(alertFor(amount.subscriptionAmountCents, 1_000n), "no_subscription", reason);
  }
});

test("T-SUB-6 · mês encerrado não projeta: todas com demonstrativo fechado → 0 chamadas a inputs.resolve", async () => {
  const { repository, runtime, calls } = setup();
  await seed(repository, TENANT, "2026-10", { status: "closed", totalCents: 10_000 });
  await seed(repository, OTHER, "2026-10", { status: "paid", totalCents: 20_000, paidCents: 20_000 });
  for (const tenantId of [TENANT, OTHER]) await subscriptionAmountOf(runtime, { tenantId, period: "2026-10", now: NOW });
  assert.equal(calls.length, 0);
});

test("T-SUB-7 · dois meses, crédito de sobra: setembro 100.00 e outubro 100.00 (50.00 da conta + 50.00 de crédito); somados, 200.00", async () => {
  const { repository, runtime } = setup();
  // Setembro: assinatura 100.00 paga com 150.00; a sobra de 50.00 vira crédito (`overpayment`).
  const september = await seed(repository, TENANT, "2026-09", { status: "paid", totalCents: 10_000, paidCents: 10_000, creditsAppliedCents: 0 });
  await repository.transaction(TENANT, (tx) =>
    tx.insertCredit({ tenantId: TENANT, originStatementId: september.id, originPaymentId: null, amountCents: 5_000, reason: "overpayment", createdBy: null }),
  );
  // Outubro: assinatura 100.00, o crédito de 50.00 abate, e a conta fica em 50.00, ainda não paga.
  await seed(repository, TENANT, "2026-10", { status: "closed", totalCents: 5_000, creditsAppliedCents: 5_000, paidCents: 0 });

  const sep = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-09", now: NOW });
  const oct = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW });
  assert.deepEqual([shown(sep).subscriptionAmount, shown(sep).creditsApplied], ["100.00", "0.00"]);
  assert.deepEqual([shown(oct).subscriptionAmount, shown(oct).statementTotal, shown(oct).creditsApplied], ["100.00", "50.00", "50.00"]);
  // Somados, os dois meses dão o contratado (200.00), que é também o que entrou no caixa (150.00 + 50.00 de outubro ainda a
  // receber); os 50.00 pagos a mais contam uma vez só, em outubro, o mês que eles pagaram.
  assert.equal(formatCents(sep.subscriptionAmountCents! + oct.subscriptionAmountCents!), "200.00");
  assert.equal(formatCents(sep.statementTotalCents! + oct.statementTotalCents!), "150.00");
});

test("F3 apoio · período inválido ou no futuro (SP) é recusado antes de qualquer leitura", async () => {
  const { runtime, calls } = setup();
  await assert.rejects(
    subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-13", now: NOW }),
    (error: unknown) => error instanceof SubscriptionAmountError && error.reason === "invalid_period",
  );
  await assert.rejects(
    subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-12", now: NOW }),
    (error: unknown) => error instanceof SubscriptionAmountError && error.reason === "period_in_future",
  );
  // O mês corrente (novembro) projeta.
  const current = await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-11", now: NOW });
  assert.equal(current.source, "projection");
  assert.equal(calls.length, 1);
});
