import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createMemoryFinancialAccountService } from "../src/modules/financial-accounts/financial-account.service.js";
import {
  FinancialTitleError,
  assertStatusTransition,
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  isTitleOverdue,
  resetFinancialTitleRuntimeForTests,
  type FinancialTitleActorContext,
} from "../src/modules/financial-titles/index.js";

function actor(tenantId = randomUUID()): FinancialTitleActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: ["financial_titles:read", "financial_titles:create", "financial_titles:update"],
  };
}

function service() {
  resetFinancialTitleRuntimeForTests();
  return createMemoryFinancialTitleService();
}

// Corpo mínimo válido de um título (a receber). Sobrescreva o que o caso precisa.
function receivable(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    direction: "receivable",
    party_type: "customer",
    party_name: "Cliente Alfa",
    amount: 1500.5,
    due_date: "2026-08-10",
    issue_date: "2026-07-10",
    ...overrides,
  };
}

test("cria título a RECEBER com dados completos, paid_amount=0, status open e createdBy do ator", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable({ document: "NF-e 123", category: "servico", description: "Guincho" }));
  assert.equal(title.direction, "receivable");
  assert.equal(title.partyType, "customer");
  assert.equal(title.partyName, "Cliente Alfa");
  assert.equal(title.amount, 1500.5);
  assert.equal(title.currency, "BRL");
  assert.equal(title.paidAmount, 0);
  assert.equal(title.status, "open");
  assert.equal(title.competencia, "2026-07");
  assert.equal(title.document, "NF-e 123");
  assert.equal(title.createdBy, ctx.userId);
});

test("cria título a PAGAR (payable/supplier)", async () => {
  const svc = service();
  const title = await svc.create(actor(), receivable({ direction: "payable", party_type: "supplier", party_name: "Fornecedor Beta" }));
  assert.equal(title.direction, "payable");
  assert.equal(title.partyType, "supplier");
});

test("competencia é DERIVADA do issue_date (2026-07-10 → 2026-07), nunca do corpo", async () => {
  const svc = service();
  const title = await svc.create(actor(), receivable({ issue_date: "2026-07-10", competencia: "1999-12" }));
  assert.equal(title.competencia, "2026-07");
  assert.equal(deriveCompetencia(new Date("2026-12-31T00:00:00Z")), "2026-12");
});

test("amount = 0 → 400 invalid_amount; amount negativo → 400 invalid_amount", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ amount: 0 })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_amount",
  );
  await assert.rejects(
    () => svc.create(actor(), receivable({ amount: -5 })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_amount",
  );
});

test("due_date ausente → 400 due_date_required", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ due_date: undefined })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "due_date_required",
  );
});

test("currency fora da allowlist (USD) → 400 invalid_currency", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ currency: "USD" })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_currency",
  );
});

test("direction inválido → 400 invalid_direction", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ direction: "both" })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_direction",
  );
});

test("party_type inválido → 400 invalid_party_type", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ party_type: "vendor" })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_party_type",
  );
});

test("party_name ausente → 400 party_name_required", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ party_name: "  " })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "party_name_required",
  );
});

test("amount acima do teto Decimal(12,2) → 422 amount_overflow", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ amount: 10000000000 })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "amount_overflow",
  );
});

test("paid_amount do corpo é IGNORADO (nasce 0, dirigido por pagamentos no Ω4-4)", async () => {
  const svc = service();
  const title = await svc.create(actor(), receivable({ paid_amount: 999 }));
  assert.equal(title.paidAmount, 0);
});

test("amount é arredondado para 2 casas (sem float drift)", async () => {
  const svc = service();
  const title = await svc.create(actor(), receivable({ amount: 1234.567 }));
  assert.equal(title.amount, 1234.57);
});

test("status inicial 'scheduled' aceito (paid_amount continua 0)", async () => {
  const svc = service();
  const title = await svc.create(actor(), receivable({ status: "scheduled" }));
  assert.equal(title.status, "scheduled");
  assert.equal(title.paidAmount, 0);
});

test("status inicial 'paid' no create → 400 invalid_status (paid é dirigido por pagamentos)", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), receivable({ status: "paid" })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_status",
  );
});

test("create com account_id VÁLIDO do tenant → OK", async () => {
  const svc = service();
  const ctx = actor();
  const accounts = createMemoryFinancialAccountService();
  const account = await accounts.create(ctx, { name: `Caixa ${randomUUID()}` });
  const title = await svc.create(ctx, receivable({ account_id: account.id }));
  assert.equal(title.accountId, account.id);
});

test("create com account_id de OUTRO tenant → 400 invalid_account_reference", async () => {
  const svc = service();
  const owner = actor();
  const intruder = actor();
  const accounts = createMemoryFinancialAccountService();
  const account = await accounts.create(owner, { name: `Conta ${randomUUID()}` });
  await assert.rejects(
    () => svc.create(intruder, receivable({ account_id: account.id })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_account_reference",
  );
});

test("máquina: open→scheduled OK", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  const moved = await svc.changeStatus(ctx, title.id, { status: "scheduled" });
  assert.equal(moved.status, "scheduled");
  assert.equal(moved.updatedBy, ctx.userId);
});

test("máquina: open→cancelled OK (cancelar título)", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  const cancelled = await svc.changeStatus(ctx, title.id, { status: "cancelled", reason: "duplicado" });
  assert.equal(cancelled.status, "cancelled");
});

test("máquina: open→paid MANUAL → 422 invalid_status_transition (paid não é destino manual)", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  await assert.rejects(
    () => svc.changeStatus(ctx, title.id, { status: "paid" }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
});

test("máquina: open→partially_paid MANUAL → 422 (dirigido por pagamentos)", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  await assert.rejects(
    () => svc.changeStatus(ctx, title.id, { status: "partially_paid" }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
});

test("máquina: scheduled→in_dispute OK e in_dispute→open OK", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  await svc.changeStatus(ctx, title.id, { status: "scheduled" });
  const disputed = await svc.changeStatus(ctx, title.id, { status: "in_dispute" });
  assert.equal(disputed.status, "in_dispute");
  const reopened = await svc.changeStatus(ctx, title.id, { status: "open" });
  assert.equal(reopened.status, "open");
});

test("máquina: cancelled é TERMINAL → 422 em qualquer saída", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  await svc.changeStatus(ctx, title.id, { status: "cancelled" });
  await assert.rejects(
    () => svc.changeStatus(ctx, title.id, { status: "open" }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
});

test("máquina (unidade): paid e cancelled terminais → 422 (assertStatusTransition)", () => {
  assert.throws(
    () => assertStatusTransition("paid", "open"),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
  assert.throws(
    () => assertStatusTransition("cancelled", "scheduled"),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
});

test("máquina: transição inexistente (in_dispute→scheduled) → 422", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  await svc.changeStatus(ctx, title.id, { status: "in_dispute" });
  await assert.rejects(
    () => svc.changeStatus(ctx, title.id, { status: "scheduled" }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
});

test("changeStatus com status desconhecido → 400 invalid_status", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable());
  await assert.rejects(
    () => svc.changeStatus(ctx, title.id, { status: "frozen" }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_status",
  );
});

test("get retorna o título do próprio tenant; inexistente → 404", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, receivable());
  const fetched = await svc.get(ctx, created.id);
  assert.equal(fetched.id, created.id);
  await assert.rejects(
    () => svc.get(ctx, randomUUID()),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 404 && e.reason === "title_not_found",
  );
});

test("get de título de OUTRO tenant → 404 (não vaza existência)", async () => {
  const svc = service();
  const owner = actor();
  const created = await svc.create(owner, receivable());
  await assert.rejects(
    () => svc.get(actor(), created.id),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 404 && e.reason === "title_not_found",
  );
});

test("PATCH edita amount/due_date/party_name e registra updatedBy", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, receivable());
  const editor: FinancialTitleActorContext = { ...ctx, userId: randomUUID() };
  const updated = await svc.update(editor, created.id, { amount: 250.25, due_date: "2026-09-01", party_name: "Cliente Renomeado" });
  assert.equal(updated.amount, 250.25);
  assert.equal(updated.partyName, "Cliente Renomeado");
  assert.equal(new Date(updated.dueDate).toISOString().slice(0, 10), "2026-09-01");
  assert.equal(updated.updatedBy, editor.userId);
});

test("PATCH NÃO altera direction/status/competencia/party_type (imutáveis pós-create)", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, receivable());
  const updated = await svc.update(ctx, created.id, {
    direction: "payable",
    status: "paid",
    party_type: "supplier",
    competencia: "2000-01",
    amount: 777,
  });
  assert.equal(updated.direction, "receivable");
  assert.equal(updated.status, "open");
  assert.equal(updated.partyType, "customer");
  assert.equal(updated.competencia, "2026-07");
  assert.equal(updated.amount, 777);
});

test("PATCH de amount que estoura Decimal(12,2) → 422 amount_overflow", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, receivable());
  await assert.rejects(
    () => svc.update(ctx, created.id, { amount: 100_000_000_000 }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "amount_overflow",
  );
});

test("PATCH em título deletado → 404 (simétrico ao re-delete)", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, receivable());
  await svc.delete(ctx, created.id);
  await assert.rejects(
    () => svc.update(ctx, created.id, { amount: 10 }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 404,
  );
});

test("PATCH de título de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const created = await svc.create(owner, receivable());
  await assert.rejects(
    () => svc.update(actor(), created.id, { amount: 10 }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 404,
  );
});

test("DELETE lógico: some da lista; re-delete → 404", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, receivable());
  const removed = await svc.delete(ctx, created.id);
  assert.equal(removed.deletedAt instanceof Date, true);
  const list = await svc.list(ctx, {});
  assert.equal(list.total, 0);
  await assert.rejects(
    () => svc.delete(ctx, created.id),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 404,
  );
  // includeDeleted traz de volta.
  const all = await svc.list(ctx, { includeDeleted: true });
  assert.equal(all.total, 1);
});

test("list filtra por direction e por status", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, receivable({ direction: "receivable" }));
  await svc.create(ctx, receivable({ direction: "payable", party_type: "supplier", party_name: "F" }));
  const payables = await svc.list(ctx, { direction: "payable" });
  assert.equal(payables.total, 1);
  assert.equal(payables.items[0]!.direction, "payable");

  const b = await svc.create(ctx, receivable());
  await svc.changeStatus(ctx, b.id, { status: "scheduled" });
  const scheduled = await svc.list(ctx, { status: "scheduled" });
  assert.equal(scheduled.total, 1);
  assert.equal(scheduled.items[0]!.status, "scheduled");
});

test("list filtra por due-range (from/to)", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, receivable({ due_date: "2026-08-10" }));
  await svc.create(ctx, receivable({ due_date: "2026-12-20" }));
  const window = await svc.list(ctx, { from: "2026-08-01", to: "2026-09-01" });
  assert.equal(window.total, 1);
  assert.equal(new Date(window.items[0]!.dueDate).toISOString().slice(0, 10), "2026-08-10");
});

test("overdue DERIVADO: vencido+não-final=true; futuro=false; cancelado=false; e filtro ?overdue=", async () => {
  const svc = service();
  const ctx = actor();
  const past = await svc.create(ctx, receivable({ due_date: "2020-01-10", issue_date: "2020-01-01" }));
  const future = await svc.create(ctx, receivable({ due_date: "2999-01-10", issue_date: "2020-01-01" }));
  const cancelledPast = await svc.create(ctx, receivable({ due_date: "2020-02-10", issue_date: "2020-02-01" }));
  await svc.changeStatus(ctx, cancelledPast.id, { status: "cancelled" });

  assert.equal(isTitleOverdue(past.status, past.dueDate), true);
  assert.equal(isTitleOverdue(future.status, future.dueDate), false);
  assert.equal(isTitleOverdue("cancelled", new Date("2020-02-10")), false);

  const overdue = await svc.list(ctx, { overdue: true });
  assert.equal(overdue.total, 1);
  assert.equal(overdue.items[0]!.id, past.id);

  const notOverdue = await svc.list(ctx, { overdue: false });
  assert.equal(notOverdue.total, 2);
});

test("isolamento: a lista de um tenant NUNCA contém títulos de outro (3 tenants)", async () => {
  const svc = service();
  const a = actor();
  const b = actor();
  const c = actor();
  await svc.create(a, receivable({ party_name: "A-1" }));
  await svc.create(a, receivable({ party_name: "A-2" }));
  await svc.create(b, receivable({ party_name: "B-1" }));
  await svc.create(c, receivable({ party_name: "C-1" }));
  assert.equal((await svc.list(a, {})).total, 2);
  assert.equal((await svc.list(b, {})).total, 1);
  assert.equal((await svc.list(c, {})).total, 1);
});

// ---------- CHOKEPOINT (assertPeriodOpen) — competência fechada bloqueia TODA escrita ----------

test("chokepoint: período fechado bloqueia CREATE → 422 period_closed", async () => {
  const svc = service();
  const ctx = actor();
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2026-07", "closed");
  await assert.rejects(
    () => svc.create(ctx, receivable({ issue_date: "2026-07-10" })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "period_closed",
  );
});

test("chokepoint: período fechado bloqueia UPDATE, changeStatus e DELETE → 422 period_closed", async () => {
  const svc = service();
  const ctx = actor();
  const title = await svc.create(ctx, receivable({ issue_date: "2026-07-10" }));
  // Fecha a competência DEPOIS de criar (competencia = 2026-07).
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2026-07", "closed");
  await assert.rejects(
    () => svc.update(ctx, title.id, { amount: 200 }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "period_closed",
  );
  await assert.rejects(
    () => svc.changeStatus(ctx, title.id, { status: "scheduled" }),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "period_closed",
  );
  await assert.rejects(
    () => svc.delete(ctx, title.id),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "period_closed",
  );
});

test("chokepoint: período de OUTRA competência fechado NÃO bloqueia (guard é por competência)", async () => {
  const svc = service();
  const ctx = actor();
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2025-01", "closed");
  const title = await svc.create(ctx, receivable({ issue_date: "2026-07-10" }));
  assert.equal(title.competencia, "2026-07");
});
