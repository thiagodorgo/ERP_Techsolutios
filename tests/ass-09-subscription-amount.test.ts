import assert from "node:assert/strict";
import test from "node:test";

import {
  daysInPeriod,
  recompute,
  snapshotOf,
  type StatementComputationInput,
  type StatementSnapshot,
} from "../src/modules/subscription-billing/statements/statement.engine.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import {
  StatementService,
  type StatementInputs,
  type StatementInputsProvider,
} from "../src/modules/subscription-billing/statements/statement.service.js";
import type {
  StatementAuditEvent,
  StatementSnapshotEnvelope,
  SubscriptionStatement,
} from "../src/modules/subscription-billing/statements/statement.types.js";
import { formatCents } from "../src/modules/subscription-billing/overview/overview-money.js";
import { alertFor } from "../src/modules/subscription-billing/overview/overview.engine.js";
import {
  SubscriptionAmountError,
  subscriptionAmountOf,
  type SubscriptionAmountRuntime,
} from "../src/modules/subscription-billing/overview/subscription-amount.js";
import type { SubscriptionAmount } from "../src/modules/subscription-billing/overview/overview.types.js";

// B-ASS-09 · F3 e F3b — a assinatura do período de cada organização (plano v2 §3 P3; §6 C3: R-SUB-1..7; Emenda 2.1 §2).
// Valores sintéticos.
//
// BASE (Q5 = RECOMENDAÇÃO, D-DONO-1311-RECOMENDACOES, decisão do dono de 13/11 ~23:20 SP): a assinatura do mês é o valor
// ANTES de abater o crédito, isto é, o total gravado mais o crédito do retrato do fechamento (Emenda 2.1 §2.2); o total do
// demonstrativo e o crédito usado vêm SEPARADOS, e o crédito exibido sai da mesma fonte (o retrato). Nunca o caixa.
// Retrato ausente (nulo ou sem a chave `latest`) ou que não reproduz o total gravado: falha fechada, sem número.
//
// MUTAÇÕES LITERAIS QUE ESTE ARQUIVO MATA:
//   M-SUB-1  `BigInt(statement.totalCents + latest.creditsAppliedCents)` → `BigInt(statement.totalCents)`
//            → T-SUB-1 ("900.00"), T-SUB-4, T-SUB-7, T-SUB-8 ("50.00"), T-SUB-9 (o refechado sai "50.00")
//   M-SUB-7  `BigInt(statement.totalCents + latest.creditsAppliedCents)` → `BigInt(statement.paidCents)`
//            → T-SUB-1 ("0.00"), T-SUB-4, T-SUB-7, T-SUB-8, T-SUB-9
//   M-SUB-8  `BigInt(statement.totalCents + latest.creditsAppliedCents)` → `BigInt(statement.totalCents + statement.creditsAppliedCents)`
//            → T-SUB-8 ("50.00"), T-SUB-9 ("150.00"); controle: T-SUB-1 a T-SUB-7 seguem verdes
//   M-SUB-9  `creditsAppliedCents: BigInt(latest.creditsAppliedCents),` → `creditsAppliedCents: BigInt(statement.creditsAppliedCents),`
//            → T-SUB-8 (creditsApplied "0.00"), T-SUB-9 ("50.00")
//   M-SUB-10 apagar `if (latest == null) throw snapshotMissing();` → T-SUB-10 (sai um TypeError, não o SubscriptionAmountError)
//   M-SUB-11 apagar `if (recompute(latest) !== statement.totalCents) throw snapshotMismatch();` → T-SUB-11 (Missing expected rejection.)
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

/** Os insumos sintéticos do fechamento: um trecho do mês inteiro a `monthlyPriceCents`, sem excedente nem rastreamento. */
function computationOf(period: string, monthlyPriceCents: number): Omit<StatementComputationInput, "adjustmentsCents" | "creditsAppliedCents"> {
  const lastDay = daysInPeriod(period);
  return {
    daysInMonth: lastDay,
    segments: [{ subscriptionId: "sub-1", planVersionId: "ver-1", fromDay: 1, toDay: lastDay, monthlyPriceCents }],
    terms: { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 1_500, extraGbPriceCents: 250 },
    measurements: { usersPeak: 3, storagePeakMilliGb: 1_000, trackedVehicles: 0 },
    perVehiclePriceCents: null,
  };
}

function readyInputs(period: string, monthlyPriceCents: number): StatementInputs {
  return {
    kind: "ready",
    subscriptionId: "sub-1",
    planVersionId: "ver-1",
    addonPlanVersionId: null,
    computation: computationOf(period, monthlyPriceCents),
    daysMeasured: daysInPeriod(period),
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
  const settlement = new StatementSettlementService(repository, service);
  const runtime: SubscriptionAmountRuntime = { repository, inputs, service };
  return { repository, runtime, service, settlement, events, calls };
}

/** O retrato que o fechamento grava para os insumos sintéticos a `priceCents`, com `creditsAppliedCents` aplicado. */
function closingSnapshot(period: string, priceCents: number, creditsAppliedCents: number): StatementSnapshot {
  return snapshotOf({ ...computationOf(period, priceCents), daysInMonth: daysInPeriod(period), adjustmentsCents: 0, creditsAppliedCents });
}

/**
 * Grava um demonstrativo no estado pedido (pela porta do repositório, como o fechamento faria). Todo status que não seja
 * `open` leva o retrato do fechamento coerente com a linha (Emenda 2.1 §2.4): os insumos sintéticos com preço = total +
 * crédito, e a fixture confere que o retrato reproduz o total gravado.
 */
async function seed(
  repository: InMemoryStatementRepository,
  tenantId: string,
  period: string,
  patch: Partial<SubscriptionStatement>,
): Promise<SubscriptionStatement> {
  return repository.transaction(tenantId, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId, period });
    const row = { ...statement, ...patch };
    if (row.status === "open") return tx.saveStatement(row);
    const latest = closingSnapshot(period, row.totalCents + row.creditsAppliedCents, row.creditsAppliedCents);
    assert.equal(recompute(latest), row.totalCents, "o retrato da fixture reproduz o total gravado");
    return tx.saveStatement({ ...row, snapshot: { ...row.snapshot, latest } });
  });
}

/** Grava a linha EXATAMENTE como pedida, sem montar retrato: só para as linhas inconsistentes do T-SUB-10 e do T-SUB-11. */
async function seedInconsistent(
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

async function rowOf(repository: InMemoryStatementRepository, tenantId: string, period: string): Promise<SubscriptionStatement> {
  const row = (await repository.listStatements(tenantId)).find((statement) => statement.period === period);
  assert.ok(row, `há linha de ${period}`);
  return row;
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

test("T-SUB-8 · estorno do pagamento que gerou um crédito já aplicado (caminho real): outubro segue 100.00 / 50.00 / 50.00, como antes do estorno", async () => {
  // Preço por mês; mês sem preço → o fechamento pula a organização e deixa a linha `open` (o caminho real da linha aberta).
  const prices = new Map<string, number>([["2026-09", 10_000]]);
  const { repository, runtime, service, settlement } = setup(async (_tenantId, period) => {
    const price = prices.get(period);
    return price === undefined ? { kind: "skip", reason: "plan_without_price" } : readyInputs(period, price);
  });

  // Setembro fecha 100.00 e recebe 150.00 do provedor: aplica 100.00, e os 50.00 de sobra viram crédito `open`.
  const sepClose = await service.close({ tenantId: TENANT, period: "2026-09", now: NOW, actorId: "admin", source: "manual" });
  assert.equal(sepClose.kind, "closed");
  const september = await rowOf(repository, TENANT, "2026-09");
  assert.deepEqual([september.status, september.totalCents], ["closed", 10_000]);
  const sepPaid = await settlement.settle({ tenantId: TENANT, statementId: september.id, source: "asaas", externalChargeId: "ch-sep", paidCents: 15_000, method: null, now: NOW });
  assert.equal(sepPaid.kind, "settled");
  assert.ok(sepPaid.kind === "settled" && sepPaid.credit, "a sobra virou crédito");
  const credit = sepPaid.credit;
  assert.deepEqual([credit.status, credit.amountCents], ["open", 5_000]);

  // Outubro ainda sem preço: o fechamento pula e deixa a linha `open`; o crédito é aplicado a ela; outubro fecha com 50.00.
  const skipped = await service.close({ tenantId: TENANT, period: "2026-10", now: NOW, actorId: "admin", source: "manual" });
  assert.equal(skipped.kind, "skipped");
  const octOpen = await rowOf(repository, TENANT, "2026-10");
  assert.equal(octOpen.status, "open");
  await service.applyCredit({ tenantId: TENANT, creditId: credit.id, statementId: octOpen.id, actorId: "admin", now: NOW });
  prices.set("2026-10", 10_000);
  const octClose = await service.close({ tenantId: TENANT, period: "2026-10", now: NOW, actorId: "admin", source: "manual" });
  assert.equal(octClose.kind, "closed");
  const octPaid = await settlement.settle({ tenantId: TENANT, statementId: octOpen.id, source: "asaas", externalChargeId: "ch-oct", paidCents: 5_000, method: null, now: NOW });
  assert.equal(octPaid.kind, "settled");
  const beforeRow = await rowOf(repository, TENANT, "2026-10");
  assert.deepEqual([beforeRow.status, beforeRow.totalCents, beforeRow.paidCents, beforeRow.creditsAppliedCents], ["paid", 5_000, 5_000, 5_000]);
  const before = shown(await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW }));
  assert.deepEqual([before.subscriptionAmount, before.statementTotal, before.creditsApplied], ["100.00", "50.00", "50.00"]);

  // O estorno total do pagamento de setembro (o que gerou o crédito), pelo serviço de verdade.
  const reversal = await settlement.applyReversal({ tenantId: TENANT, statementId: september.id, externalChargeId: "ch-sep", reversedCents: 15_000, kind: "refund", now: NOW });
  assert.ok("creditReversed" in reversal, "o estorno foi aplicado");
  // Pré-condições (o estado que o estorno deixa, sem nada montado à mão): crédito da linha 0, total 5000.
  assert.equal(reversal.creditReversed, true);
  const afterRow = await rowOf(repository, TENANT, "2026-10");
  assert.deepEqual([afterRow.status, afterRow.totalCents, afterRow.creditsAppliedCents], ["paid", 5_000, 0]);

  const oct = shown(await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW }));
  assert.deepEqual(
    { subscriptionAmount: oct.subscriptionAmount, statementTotal: oct.statementTotal, creditsApplied: oct.creditsApplied },
    { subscriptionAmount: "100.00", statementTotal: "50.00", creditsApplied: "50.00" },
  );
  assert.deepEqual([oct.subscriptionAmount, oct.statementTotal, oct.creditsApplied], [before.subscriptionAmount, before.statementTotal, before.creditsApplied]);
  const sep = shown(await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-09", now: NOW }));
  assert.equal(sep.subscriptionAmount, "100.00");
});

test("T-SUB-9 · crédito aplicado a um demonstrativo reaberto (caminho real): reaberto 100.00 / 100.00 / 0.00, refechado 100.00 / 50.00 / 50.00", async () => {
  const { repository, runtime, service, settlement } = setup(async (_tenantId, period) => readyInputs(period, 10_000));

  // O crédito de 50.00 nasce de verdade: setembro fecha 100.00 e recebe 150.00 do provedor.
  await service.close({ tenantId: TENANT, period: "2026-09", now: NOW, actorId: "admin", source: "manual" });
  const september = await rowOf(repository, TENANT, "2026-09");
  const sepPaid = await settlement.settle({ tenantId: TENANT, statementId: september.id, source: "asaas", externalChargeId: "ch-sep", paidCents: 15_000, method: null, now: NOW });
  assert.ok(sepPaid.kind === "settled" && sepPaid.credit, "a sobra virou crédito");
  const credit = sepPaid.credit;

  // Outubro fecha 100.00 sem crédito; é reaberto; o crédito de 50.00 é aplicado à linha reaberta.
  const octClose = await service.close({ tenantId: TENANT, period: "2026-10", now: NOW, actorId: "admin", source: "manual" });
  assert.equal(octClose.kind, "closed");
  const october = await rowOf(repository, TENANT, "2026-10");
  assert.deepEqual([october.status, october.totalCents, october.creditsAppliedCents], ["closed", 10_000, 0]);
  await service.reopen({ tenantId: TENANT, statementId: october.id, reason: "ajuste do crédito", actorId: "admin", now: NOW });
  await service.applyCredit({ tenantId: TENANT, creditId: credit.id, statementId: october.id, actorId: "admin", now: NOW });
  const reopenedRow = await rowOf(repository, TENANT, "2026-10");
  assert.deepEqual([reopenedRow.status, reopenedRow.totalCents, reopenedRow.creditsAppliedCents], ["reopened", 10_000, 5_000]);

  const reopened = shown(await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW }));
  assert.deepEqual(
    [reopened.subscriptionAmount, reopened.statementTotal, reopened.creditsApplied, reopened.source, reopened.estimate],
    ["100.00", "100.00", "0.00", "statement_reopened", true],
  );

  // Refecha (manual): o crédito entra no total e no retrato.
  const reclose = await service.close({ tenantId: TENANT, period: "2026-10", now: NOW, actorId: "admin", source: "manual" });
  assert.equal(reclose.kind, "closed");
  const reclosed = shown(await subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW }));
  assert.deepEqual(
    [reclosed.subscriptionAmount, reclosed.statementTotal, reclosed.creditsApplied, reclosed.source, reclosed.estimate],
    ["100.00", "50.00", "50.00", "statement", false],
  );
});

test("T-SUB-10 · demonstrativo gravado sem retrato (nos 4 status, e sem a chave `latest`) → statement_snapshot_missing, nenhum número", async () => {
  const { repository, runtime } = setup();
  const cases: Array<{ readonly label: string; readonly patch: Partial<SubscriptionStatement> }> = [
    { label: "closed", patch: { status: "closed", totalCents: 10_000 } },
    { label: "paid", patch: { status: "paid", totalCents: 10_000, paidCents: 10_000 } },
    { label: "reopened", patch: { status: "reopened", totalCents: 10_000 } },
    { label: "cancelled", patch: { status: "cancelled", totalCents: 10_000 } },
    // A-E21-1: JSONB `{"history": []}` (só por SQL manual) deixa `snapshot.latest` ausente, não nulo.
    { label: "closed sem a chave latest", patch: { status: "closed", totalCents: 10_000, snapshot: { history: [] } as unknown as StatementSnapshotEnvelope } },
  ];
  for (const [index, { label, patch }] of cases.entries()) {
    const tenantId = `tenant-sem-retrato-${index}`;
    const row = await seedInconsistent(repository, tenantId, "2026-10", patch);
    assert.equal(row.snapshot.latest ?? null, null, `${label}: a linha não tem retrato`);
    await assert.rejects(
      subscriptionAmountOf(runtime, { tenantId, period: "2026-10", now: NOW }),
      (error: unknown) => {
        assert.ok(error instanceof SubscriptionAmountError, `${label}: saiu ${String(error)}`);
        assert.equal(error.reason, "statement_snapshot_missing", label);
        return true;
      },
      label,
    );
  }
});

test("T-SUB-11 · retrato que não reproduz o total gravado (total recalculado sem o retrato) → statement_snapshot_mismatch", async () => {
  const { repository, runtime } = setup();
  const latest = closingSnapshot("2026-10", 10_000, 5_000);
  assert.equal(recompute(latest), 5_000, "o retrato diz 50.00");
  await seedInconsistent(repository, TENANT, "2026-10", { status: "closed", totalCents: 10_000, creditsAppliedCents: 0, snapshot: { latest, history: [] } });
  await assert.rejects(subscriptionAmountOf(runtime, { tenantId: TENANT, period: "2026-10", now: NOW }), (error: unknown) => {
    assert.ok(error instanceof SubscriptionAmountError, `saiu ${String(error)}`);
    assert.equal(error.reason, "statement_snapshot_mismatch");
    return true;
  });
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
