import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import {
  createMemoryFinancialTitleService,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  getMemoryFinancialTitleRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
  FinancialTitleError,
} from "../src/modules/financial-titles/index.js";
import {
  createMemoryFinancialEntryService,
  getMemoryFinancialEntryRepositoryForTests,
  resetFinancialEntryRuntimeForTests,
  FinancialEntryError,
} from "../src/modules/financial-entries/index.js";
import {
  FinancialPeriodCloseError,
  FinancialPeriodCloseService,
  computeMaterialSnapshot,
  createMemoryFinancialPeriodCloseService,
  resetFinancialPeriodCloseRuntimeForTests,
  type FinancialPeriodCloseActorContext,
  type FinancialPeriodCloseStore,
} from "../src/modules/financial-period-closes/index.js";

function actor(tenantId = randomUUID()): FinancialPeriodCloseActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: ["financial_period:read", "financial_period:close", "financial_period:reopen"],
  };
}

function resetAll(): void {
  resetFinancialPeriodCloseRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

function setup() {
  resetAll();
  return {
    periods: createMemoryFinancialPeriodCloseService(),
    titles: createMemoryFinancialTitleService(),
    entries: createMemoryFinancialEntryService(),
    accounts: createMemoryFinancialAccountService(),
    titleRepo: getMemoryFinancialTitleRepositoryForTests(),
    entryRepo: getMemoryFinancialEntryRepositoryForTests(),
    closeRepo: getMemoryFinancialPeriodCloseRepositoryForTests(),
  };
}

function receivable(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { direction: "receivable", party_type: "customer", party_name: "Cliente", amount: 1000, due_date: "2026-09-10", issue_date: "2026-07-10", ...overrides };
}
function payable(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { direction: "payable", party_type: "supplier", party_name: "Fornecedor", amount: 400, due_date: "2026-09-10", issue_date: "2026-07-10", ...overrides };
}

// 1 — fecha computa snapshot MATERIAL + informativo e vira o status.
test("close: computa snapshot (material+informativo) e vira status open→closed", async () => {
  const { periods, titles, entries, accounts } = setup();
  const ctx = actor();
  const account = await accounts.create(ctx, { name: `Caixa ${randomUUID()}` });
  await titles.create(ctx, receivable({ amount: 1000 }));
  await titles.create(ctx, payable({ amount: 400 }));
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 250, payment_method: "pix", occurred_at: "2026-07-05T12:00:00-03:00" });
  await entries.create(ctx, { account_id: account.id, direction: "out", amount: 100, payment_method: "pix", occurred_at: "2026-07-06T12:00:00-03:00" });

  const { record, meta } = await periods.close(ctx, "2026-07", {});
  assert.equal(record.status, "closed");
  assert.ok(record.closedAt instanceof Date);
  assert.equal(record.closedBy, ctx.userId);
  assert.equal(meta.forced, false);

  const snap = record.snapshot!.latest;
  assert.deepEqual(snap.material.titles.receivable, { count: 1, sumAmount: 1000 });
  assert.deepEqual(snap.material.titles.payable, { count: 1, sumAmount: 400 });
  assert.deepEqual(snap.material.entries.in, { count: 1, sumAmount: 250 });
  assert.deepEqual(snap.material.entries.out, { count: 1, sumAmount: 100 });
  assert.equal(snap.material.entries.net, 150);
  assert.equal(snap.balance.receivableOpen, 1000);
  assert.equal(snap.balance.payableOpen, 400);
  assert.equal(snap.forced, false);
});

// 3 (M2) — escrita em 'closing' bloqueia título E lançamento (o ramo defensivo do guard).
test("guard M2: período 'closing' bloqueia CREATE de título e lançamento → 422 period_closed", async () => {
  const { titles, entries, accounts, closeRepo } = setup();
  const ctx = actor();
  const account = await accounts.create(ctx, { name: `Caixa ${randomUUID()}` });
  closeRepo.setPeriodStatus(ctx.tenantId, "2026-07", "closing");
  await assert.rejects(
    () => titles.create(ctx, receivable()),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "period_closed",
  );
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", occurred_at: "2026-07-10T12:00:00-03:00" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "period_closed",
  );
});

// 4 — reconcile em período FECHADO PASSA (exento do chokepoint) e NÃO altera o snapshot congelado (M1).
test("reconcile em período FECHADO passa e não altera o snapshot congelado", async () => {
  const { periods, entries, accounts, entryRepo, closeRepo } = setup();
  const ctx = actor();
  const account = await accounts.create(ctx, { name: `Caixa ${randomUUID()}` });
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix", occurred_at: "2026-07-05T12:00:00-03:00" });
  const { record } = await periods.close(ctx, "2026-07", {});
  const frozenMaterial = record.snapshot!.latest.material;

  // reconcile atravessa período fechado (não chama o guard).
  const reconciled = await entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: "value" });
  assert.equal(reconciled.reconciled, true);
  // snapshot congelado inalterado (frozen).
  const reread = await periods.get(ctx, "2026-07");
  assert.deepEqual(reread.record!.snapshot!.latest.material, frozenMaterial);
  // re-derivação MATERIAL das linhas vivas continua batendo apesar do reconcile mexer em reconciled_at/updated_at.
  const liveEntries = await entryRepo.findByCompetencia(ctx.tenantId, "2026-07");
  assert.deepEqual(computeMaterialSnapshot([], liveEntries.map((e) => ({ direction: e.direction, amount: e.amount, reconciled: e.reconciled }))).entries, frozenMaterial.entries);
  assert.equal(closeRepo.findRow(ctx.tenantId, "2026-07")!.status, "closed");
});

// 8/D1 (money-crítico) — paga um título de julho em agosto → a re-derivação MATERIAL de julho AINDA bate com o
// snapshot congelado (paid_amount/status ficam FORA do material). O bug do plano original falharia aqui.
test("D1: pagamento cross-mês NÃO quebra a re-derivação material do período fechado", async () => {
  const { periods, titles, entries, accounts, titleRepo } = setup();
  const ctx = actor();
  const account = await accounts.create(ctx, { name: `Caixa ${randomUUID()}` });
  const title = await titles.create(ctx, receivable({ amount: 1000 }));

  const { record } = await periods.close(ctx, "2026-07", {});
  const frozenMaterial = record.snapshot!.latest.material;
  assert.equal(record.snapshot!.latest.titles.receivable.sumPaid, 0); // no fechamento, nada pago

  // recebe o título de julho em AGOSTO (competência aberta) → applyPayment muta paid_amount/status do título de julho.
  await entries.payTitle(ctx, title.id, { account_id: account.id, amount: 400, payment_method: "pix", occurred_at: "2026-08-15T12:00:00-03:00" });
  const liveJuly = await titleRepo.findByCompetencia(ctx.tenantId, "2026-07");
  assert.equal(liveJuly[0].paidAmount, 400);
  assert.equal(liveJuly[0].status, "partially_paid");

  // re-derivação MATERIAL das linhas vivas de julho segue idêntica ao snapshot congelado (o pagamento cross-mês
  // não alterou amount/direction/count; o lançamento nasceu em agosto).
  const rederived = computeMaterialSnapshot(
    liveJuly.map((t) => ({ id: t.id, direction: t.direction, amount: t.amount, paidAmount: t.paidAmount, status: t.status })),
    [],
  );
  assert.deepEqual(rederived, frozenMaterial);
});

// 5 — reabrir exige reason; após reopen a escrita volta a gravar.
test("reopen: exige reason; closed→reopened; escrita na competência volta a gravar", async () => {
  const { periods, titles } = setup();
  const ctx = actor();
  await titles.create(ctx, receivable());
  await periods.close(ctx, "2026-07", {});

  await assert.rejects(
    () => periods.reopen(ctx, "2026-07", {}),
    (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 400 && e.reason === "reason_required",
  );
  const reopened = await periods.reopen(ctx, "2026-07", { reason: "ajuste contábil" });
  assert.equal(reopened.status, "reopened");
  assert.equal(reopened.reopenReason, "ajuste contábil");
  assert.ok(reopened.reopenedAt instanceof Date);
  // reopened é escrivível (isPeriodClosed=false): create na competência passa.
  const title = await titles.create(ctx, receivable({ party_name: "Pós-reopen" }));
  assert.equal(title.competencia, "2026-07");
});

// 6 — reopen de não-fechado → 422 (open e inexistente).
test("reopen de período não-fechado (open/inexistente) → 422 period_not_closed", async () => {
  const { periods, titles } = setup();
  const ctx = actor();
  // inexistente
  await assert.rejects(
    () => periods.reopen(ctx, "2026-07", { reason: "x" }),
    (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 422 && e.reason === "period_not_closed",
  );
  // aberto (só uma escrita, sem fechamento)
  await titles.create(ctx, receivable());
  await assert.rejects(
    () => periods.reopen(ctx, "2026-07", { reason: "x" }),
    (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 422 && e.reason === "period_not_closed",
  );
});

// 7 — fechar 2× → 409.
test("fechar 2× a mesma competência → 409 period_already_closed", async () => {
  const { periods, titles } = setup();
  const ctx = actor();
  await titles.create(ctx, receivable());
  await periods.close(ctx, "2026-07", {});
  await assert.rejects(
    () => periods.close(ctx, "2026-07", {}),
    (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 409 && e.reason === "period_already_closed",
  );
});

// 8 — pendência BLOQUEANTE (in_dispute) → 422 sem force; force:true → 200 forced + reason obrigatório (e/ataque).
test("pendência bloqueante (in_dispute): 422 sem force; force exige reason e grava forced=true", async () => {
  const { periods, titles } = setup();
  const ctx = actor();
  const title = await titles.create(ctx, receivable());
  await titles.changeStatus(ctx, title.id, { status: "in_dispute" });

  await assert.rejects(
    () => periods.close(ctx, "2026-07", {}),
    (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 422 && e.reason === "pending_items_block_close",
  );
  // force sem reason → 400 reason_required (e/ataque).
  await assert.rejects(
    () => periods.close(ctx, "2026-07", { force: true }),
    (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 400 && e.reason === "reason_required",
  );
  const { record, meta } = await periods.close(ctx, "2026-07", { force: true, reason: "sobreposição justificada" });
  assert.equal(record.status, "closed");
  assert.equal(record.snapshot!.latest.forced, true);
  assert.equal(record.snapshot!.latest.pending.blocking.inDisputeTitles, 1);
  assert.equal(meta.forced, true);
  assert.deepEqual(meta.overriddenDisputeTitleIds, [title.id]); // ids sobrepostos p/ auditoria (server-side)
});

// (d/ataque) — snapshot IMUTÁVEL/versionado: reopen+reclose PRESERVA o histórico (não sobrescreve).
test("reopen+reclose preserva a trilha imutável (snapshot.history append-only)", async () => {
  const { periods, titles } = setup();
  const ctx = actor();
  await titles.create(ctx, receivable({ amount: 1000 }));
  const first = await periods.close(ctx, "2026-07", {});
  assert.equal(first.record.snapshot!.history.length, 1);

  await periods.reopen(ctx, "2026-07", { reason: "correção" });
  await titles.create(ctx, receivable({ amount: 500, party_name: "Novo" }));
  const second = await periods.close(ctx, "2026-07", {});
  assert.equal(second.record.snapshot!.history.length, 2);
  // a prova do 1º fechamento (sumAmount 1000) segue intacta no history[0].
  assert.equal(second.record.snapshot!.history[0].material.titles.receivable.sumAmount, 1000);
  assert.equal(second.record.snapshot!.history[1].material.titles.receivable.sumAmount, 1500);
  assert.equal(second.record.snapshot!.latest.material.titles.receivable.sumAmount, 1500);
});

// 13 — paridade: o snapshot material do caminho InMemory == função pura sobre as MESMAS linhas.
test("paridade: snapshot material do fechamento == computeMaterialSnapshot das mesmas linhas", async () => {
  const { periods, titles, entries, accounts, titleRepo, entryRepo } = setup();
  const ctx = actor();
  const account = await accounts.create(ctx, { name: `Caixa ${randomUUID()}` });
  await titles.create(ctx, receivable({ amount: 700 }));
  await titles.create(ctx, payable({ amount: 300 }));
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 90, payment_method: "pix", occurred_at: "2026-07-02T12:00:00-03:00" });

  const { record } = await periods.close(ctx, "2026-07", {});
  const liveTitles = (await titleRepo.findByCompetencia(ctx.tenantId, "2026-07")).map((t) => ({ id: t.id, direction: t.direction, amount: t.amount, paidAmount: t.paidAmount, status: t.status }));
  const liveEntries = (await entryRepo.findByCompetencia(ctx.tenantId, "2026-07")).map((e) => ({ direction: e.direction, amount: e.amount, reconciled: e.reconciled }));
  assert.deepEqual(record.snapshot!.latest.material, computeMaterialSnapshot(liveTitles, liveEntries));
});

// 14 — atomicidade: se o WRITE do flip falhar, NADA persiste e o período segue open (snapshot não persiste só).
test("atomicidade: falha no persist do flip → nada gravado, período segue open", async () => {
  const { titles, closeRepo } = setup();
  const ctx = actor();
  await titles.create(ctx, receivable());

  // store que roda o evaluate (congela o snapshot em memória) mas LANÇA antes de persistir.
  const faultyStore: FinancialPeriodCloseStore = {
    find: () => Promise.resolve(undefined),
    list: () => Promise.resolve({ items: [], total: 0 }),
    loadCompetencia: () => Promise.resolve({ titles: [], entries: [] }),
    close: async (_t, _p, evaluate) => {
      evaluate({ existing: undefined, titles: [], entries: [] });
      throw new Error("persist failed");
    },
    reopen: () => Promise.reject(new Error("nope")),
  };
  const service = new FinancialPeriodCloseService(faultyStore);
  await assert.rejects(() => service.close(ctx, "2026-07", {}), /persist failed/);
  // nada persistiu no singleton compartilhado → guard não bloqueia, status open.
  assert.equal(closeRepo.findRow(ctx.tenantId, "2026-07"), undefined);
  assert.equal(await closeRepo.isPeriodClosed(ctx.tenantId, "2026-07"), false);
});

// 15 — invalid_period em close/reopen/get.
test("invalid_period: close/reopen/get com :period malformado → 400", async () => {
  const { periods } = setup();
  const ctx = actor();
  for (const bad of ["2026-13", "2026-7", "abc", "2026-00"]) {
    await assert.rejects(
      () => periods.close(ctx, bad, {}),
      (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 400 && e.reason === "invalid_period",
    );
    await assert.rejects(
      () => periods.reopen(ctx, bad, { reason: "x" }),
      (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 400 && e.reason === "invalid_period",
    );
    await assert.rejects(
      () => periods.get(ctx, bad),
      (e: unknown) => e instanceof FinancialPeriodCloseError && e.statusCode === 400 && e.reason === "invalid_period",
    );
  }
});
