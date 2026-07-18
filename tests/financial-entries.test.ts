import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import {
  createMemoryFinancialTitleService,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import {
  FinancialEntryError,
  createMemoryFinancialEntryService,
  resetFinancialEntryRuntimeForTests,
  type FinancialEntryActorContext,
} from "../src/modules/financial-entries/index.js";
import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// A liquidação delega os guards de ESTADO do título ao módulo de títulos → esses erros são
// FinancialTitleError (cancelado/pago/overpayment/404), enquanto conta/moeda/idempotência são
// FinancialEntryError. Ambos renderizam idêntico via HTTP (statusCode+reason). Checagem class-agnostic.
function isDomainError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason
  );
}

function actor(tenantId = randomUUID()): FinancialEntryActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: ["financial_entries:read", "financial_entries:create", "financial_entries:update"],
  };
}

function resetAll(): void {
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

function setup() {
  resetAll();
  return {
    entries: createMemoryFinancialEntryService(),
    accounts: createMemoryFinancialAccountService(),
    titles: createMemoryFinancialTitleService(),
  };
}

async function activeAccount(
  accounts: ReturnType<typeof createMemoryFinancialAccountService>,
  ctx: FinancialEntryActorContext,
  overrides: Record<string, unknown> = {},
) {
  return accounts.create(ctx, { name: `Caixa ${randomUUID()}`, ...overrides });
}

function receivableBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    direction: "receivable",
    party_type: "customer",
    party_name: "Cliente Alfa",
    amount: 1000,
    due_date: "2026-08-10",
    issue_date: "2026-07-10",
    ...overrides,
  };
}

// ---------------------------------------------------------------- lançamento avulso (create)

test("lançamento IN avulso: happy path (conta ativa, competencia derivada, reconciled=false)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, {
    account_id: account.id,
    direction: "in",
    amount: 100.5,
    payment_method: "pix",
    occurred_at: "2026-05-10T12:00:00.000Z",
    category: "servico",
    description: "Recebimento avulso",
  });
  assert.equal(entry.direction, "in");
  assert.equal(entry.amount, 100.5);
  assert.equal(entry.currency, "BRL");
  assert.equal(entry.paymentMethod, "pix");
  assert.equal(entry.accountId, account.id);
  assert.equal(entry.titleId, undefined);
  assert.equal(entry.competencia, "2026-05");
  assert.equal(entry.reconciled, false);
  assert.equal(entry.category, "servico");
  assert.equal(entry.createdBy, ctx.userId);
});

test("lançamento OUT avulso: happy path", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "out", amount: 42, payment_method: "cash" });
  assert.equal(entry.direction, "out");
  assert.equal(entry.paymentMethod, "cash");
});

test("amount <= 0 → 400 invalid_amount; negativo → 400", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  for (const amount of [0, -5]) {
    await assert.rejects(
      () => entries.create(ctx, { account_id: account.id, direction: "in", amount, payment_method: "pix" }),
      (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_amount",
    );
  }
});

test("amount acima do teto Decimal(12,2) → 422 amount_overflow", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "in", amount: 10_000_000_000, payment_method: "pix" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "amount_overflow",
  );
});

test("payment_method inválido → 400 invalid_payment_method; direction inválido → 400 invalid_direction", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "crypto" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_payment_method",
  );
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "both", amount: 10, payment_method: "pix" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_direction",
  );
});

test("conta INEXISTENTE → 400 invalid_account_reference", async () => {
  const { entries } = setup();
  const ctx = actor();
  await assert.rejects(
    () => entries.create(ctx, { account_id: randomUUID(), direction: "in", amount: 10, payment_method: "pix" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_account_reference",
  );
});

test("conta INATIVA → 422 account_inactive", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await accounts.delete(ctx, account.id); // desativa (is_active=false)
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "account_inactive",
  );
});

test("currency divergente da conta (USD vs BRL) → 422 currency_mismatch; malformada → 400 invalid_currency", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", currency: "USD" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "currency_mismatch",
  );
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", currency: "US" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_currency",
  );
});

test("conta de OUTRO tenant → 400 invalid_account_reference (isolamento)", async () => {
  const { entries, accounts } = setup();
  const owner = actor();
  const intruder = actor();
  const account = await activeAccount(accounts, owner);
  await assert.rejects(
    () => entries.create(intruder, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_account_reference",
  );
});

// ---------------------------------------------------------------- saldo / extrato

test("saldo = opening + Σin − Σout, com DELETADOS excluídos (backend SOMA)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx, { opening_balance: 1000 });
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 200, payment_method: "pix" });
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 50, payment_method: "cash" });
  const out = await entries.create(ctx, { account_id: account.id, direction: "out", amount: 30, payment_method: "cash" });

  const before = await entries.balance(ctx, account.id);
  assert.equal(before.openingBalance, 1000);
  assert.equal(before.in, 250);
  assert.equal(before.out, 30);
  assert.equal(before.balance, 1220);

  await entries.delete(ctx, out.id);
  const after = await entries.balance(ctx, account.id);
  assert.equal(after.in, 250);
  assert.equal(after.out, 0);
  assert.equal(after.balance, 1250);
});

test("balance de conta inexistente → 404 account_not_found", async () => {
  const { entries } = setup();
  await assert.rejects(
    () => entries.balance(actor(), randomUUID()),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 404 && e.reason === "account_not_found",
  );
});

test("extrato: filtra por account_id, direction e category", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const a = await activeAccount(accounts, ctx);
  const b = await activeAccount(accounts, ctx);
  await entries.create(ctx, { account_id: a.id, direction: "in", amount: 10, payment_method: "pix", category: "servico" });
  await entries.create(ctx, { account_id: a.id, direction: "out", amount: 5, payment_method: "cash", category: "despesa" });
  await entries.create(ctx, { account_id: b.id, direction: "in", amount: 99, payment_method: "pix" });

  assert.equal((await entries.list(ctx, { account_id: a.id })).total, 2);
  assert.equal((await entries.list(ctx, { account_id: a.id, direction: "out" })).total, 1);
  assert.equal((await entries.list(ctx, { category: "servico" })).total, 1);
});

test("extrato: filtra por janela de occurred_at (from/to)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", occurred_at: "2026-05-10T00:00:00.000Z" });
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 20, payment_method: "pix", occurred_at: "2026-09-10T00:00:00.000Z" });
  const window = await entries.list(ctx, { from: "2026-05-01", to: "2026-06-01" });
  assert.equal(window.total, 1);
  assert.equal(window.items[0]!.amount, 10);
});

test("isolamento: extrato de um tenant NUNCA contém lançamentos de outro", async () => {
  const { entries, accounts } = setup();
  const a = actor();
  const b = actor();
  const accA = await activeAccount(accounts, a);
  const accB = await activeAccount(accounts, b);
  await entries.create(a, { account_id: accA.id, direction: "in", amount: 10, payment_method: "pix" });
  await entries.create(b, { account_id: accB.id, direction: "in", amount: 20, payment_method: "pix" });
  assert.equal((await entries.list(a, {})).total, 1);
  assert.equal((await entries.list(b, {})).total, 1);
});

// ---------------------------------------------------------------- delete lógico / patch

test("DELETE lógico: some do extrato; re-delete → 404; includeDeleted traz de volta", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  const removed = await entries.delete(ctx, entry.id);
  assert.equal(removed.deletedAt instanceof Date, true);
  assert.equal((await entries.list(ctx, {})).total, 0);
  await assert.rejects(
    () => entries.delete(ctx, entry.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 404,
  );
  assert.equal((await entries.list(ctx, { includeDeleted: true })).total, 1);
});

test("PATCH edita category/description; PATCH em deletado → 404", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  const updated = await entries.update(ctx, entry.id, { category: "nova", description: "obs" });
  assert.equal(updated.category, "nova");
  assert.equal(updated.description, "obs");
  assert.equal(updated.amount, 10); // amount imutável

  await entries.delete(ctx, entry.id);
  await assert.rejects(
    () => entries.update(ctx, entry.id, { category: "x" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 404,
  );
});

// ---------------------------------------------------------------- chokepoint (período fechado)

test("chokepoint: período fechado bloqueia CREATE → 422 period_closed", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2026-05", "closed");
  await assert.rejects(
    () => entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", occurred_at: "2026-05-10T00:00:00.000Z" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "period_closed",
  );
});

test("chokepoint: período fechado bloqueia UPDATE e DELETE → 422 period_closed", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", occurred_at: "2026-05-10T00:00:00.000Z" });
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2026-05", "closed");
  await assert.rejects(
    () => entries.update(ctx, entry.id, { category: "x" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "period_closed",
  );
  await assert.rejects(
    () => entries.delete(ctx, entry.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "period_closed",
  );
});

test("chokepoint tenant-scoped: fechamento do tenant A não afeta B", async () => {
  const { entries, accounts } = setup();
  const a = actor();
  const b = actor();
  const accB = await activeAccount(accounts, b);
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(a.tenantId, "2026-05", "closed");
  const entry = await entries.create(b, { account_id: accB.id, direction: "in", amount: 10, payment_method: "pix", occurred_at: "2026-05-10T00:00:00.000Z" });
  assert.equal(entry.competencia, "2026-05");
});

// ---------------------------------------------------------------- estorno

test("ESTORNO cria contra-lançamento (direção invertida, reversal_of setado); saldo volta ao anterior", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx, { opening_balance: 500 });
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 200, payment_method: "pix" });
  assert.equal((await entries.balance(ctx, account.id)).balance, 700);

  const contra = await entries.reverse(ctx, entry.id);
  assert.equal(contra.direction, "out");
  assert.equal(contra.amount, 200);
  assert.equal(contra.reversalOf, entry.id);
  assert.equal(contra.accountId, account.id);
  // saldo volta ao anterior (200 in + 200 out = 0 líquido).
  assert.equal((await entries.balance(ctx, account.id)).balance, 500);
});

test("ESTORNO idempotente: estornar o mesmo 2× → 409 already_reversed", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  await entries.reverse(ctx, entry.id);
  await assert.rejects(
    () => entries.reverse(ctx, entry.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 409 && e.reason === "already_reversed",
  );
});

test("ESTORNO de lançamento inexistente/cross-tenant → 404", async () => {
  const { entries, accounts } = setup();
  const owner = actor();
  const account = await activeAccount(accounts, owner);
  const entry = await entries.create(owner, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  await assert.rejects(
    () => entries.reverse(actor(), entry.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 404,
  );
});

// ---------------------------------------------------------------- liquidação (pay)

test("LIQUIDAÇÃO parcial: title → partially_paid, paid_amount incrementado; entry com title_id e direction 'in'", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 1000 }));

  const entry = await entries.payTitle(ctx, title.id, { amount: 400, account_id: account.id, payment_method: "pix" });
  assert.equal(entry.titleId, title.id);
  assert.equal(entry.direction, "in"); // receivable → dinheiro entra
  assert.equal(entry.amount, 400);
  assert.equal(entry.accountId, account.id);

  const refreshed = await titles.get(ctx, title.id);
  assert.equal(refreshed.paidAmount, 400);
  assert.equal(refreshed.status, "partially_paid");
});

test("LIQUIDAÇÃO total: title → paid", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 250 }));
  await entries.payTitle(ctx, title.id, { amount: 250, account_id: account.id, payment_method: "cash" });
  const refreshed = await titles.get(ctx, title.id);
  assert.equal(refreshed.status, "paid");
  assert.equal(refreshed.paidAmount, 250);
});

test("LIQUIDAÇÃO de PAYABLE: dinheiro SAI (direction 'out')", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ direction: "payable", party_type: "supplier", party_name: "Fornecedor", amount: 100 }));
  const entry = await entries.payTitle(ctx, title.id, { amount: 100, account_id: account.id, payment_method: "transfer" });
  assert.equal(entry.direction, "out");
});

test("LIQUIDAÇÃO overpayment (paid_amount+amount > amount) → 422 overpayment; NÃO cria lançamento", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 100 }));
  await assert.rejects(
    () => entries.payTitle(ctx, title.id, { amount: 150, account_id: account.id, payment_method: "pix" }),
    (e: unknown) => isDomainError(e, 422, "overpayment"),
  );
  // nenhum lançamento foi criado (guard antes da escrita).
  assert.equal((await entries.list(ctx, {})).total, 0);
});

test("LIQUIDAÇÃO de título CANCELADO → 422 title_cancelled; JÁ PAGO → 422 title_already_paid", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);

  const cancelled = await titles.create(ctx, receivableBody({ amount: 100 }));
  await titles.changeStatus(ctx, cancelled.id, { status: "cancelled" });
  await assert.rejects(
    () => entries.payTitle(ctx, cancelled.id, { amount: 10, account_id: account.id, payment_method: "pix" }),
    (e: unknown) => isDomainError(e, 422, "title_cancelled"),
  );

  const paid = await titles.create(ctx, receivableBody({ amount: 100 }));
  await entries.payTitle(ctx, paid.id, { amount: 100, account_id: account.id, payment_method: "pix" });
  await assert.rejects(
    () => entries.payTitle(ctx, paid.id, { amount: 1, account_id: account.id, payment_method: "pix" }),
    (e: unknown) => isDomainError(e, 422, "title_already_paid"),
  );
});

test("LIQUIDAÇÃO idempotente: replay com o mesmo client_action_id → 409 duplicate_payment; título NÃO duplo-incrementa", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 1000 }));
  const cid = randomUUID();

  await entries.payTitle(ctx, title.id, { amount: 300, account_id: account.id, payment_method: "pix", client_action_id: cid });
  await assert.rejects(
    () => entries.payTitle(ctx, title.id, { amount: 300, account_id: account.id, payment_method: "pix", client_action_id: cid }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 409 && e.reason === "duplicate_payment",
  );
  // um único lançamento; título incrementado UMA vez.
  assert.equal((await entries.list(ctx, {})).total, 1);
  assert.equal((await titles.get(ctx, title.id)).paidAmount, 300);
});

test("LIQUIDAÇÃO de título cross-tenant → 404 (não vaza existência)", async () => {
  const { entries, accounts, titles } = setup();
  const owner = actor();
  const intruder = actor();
  const account = await activeAccount(accounts, intruder);
  const title = await titles.create(owner, receivableBody({ amount: 100 }));
  await assert.rejects(
    () => entries.payTitle(intruder, title.id, { amount: 10, account_id: account.id, payment_method: "pix" }),
    (e: unknown) => isDomainError(e, 404, "title_not_found"),
  );
});

test("LIQUIDAÇÃO com conta inativa → 422 account_inactive (não muta o título)", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await accounts.delete(ctx, account.id);
  const title = await titles.create(ctx, receivableBody({ amount: 100 }));
  await assert.rejects(
    () => entries.payTitle(ctx, title.id, { amount: 10, account_id: account.id, payment_method: "pix" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "account_inactive",
  );
  assert.equal((await titles.get(ctx, title.id)).paidAmount, 0);
});

// ================================================================ rotas (RBAC + DTO §2.8 + fluxo)

test("[rota] POST /financial-entries cria com finance → 201; DTO omite tenant_id; reconciled=false", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const created = await requestJson(baseUrl, "/api/v1/financial-entries", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { account_id: account.id, direction: "in", amount: 123.45, payment_method: "pix", reconciled: true },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.direction, "in");
    assert.equal(created.body.data.amount, 123.45);
    assert.equal(created.body.data.reconciled, false); // corpo ignora reconciled
    assert.equal(created.body.data.active, true);
    assert.equal(created.body.data.tenantId, undefined);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.ok(created.body.data.id);
  });
});

test("[rota] fluxo liquidação: POST /financial-titles/:id/pay → 201 e título vira partially_paid; GET balance computa", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA, { opening_balance: 500 });
    const title = await createTitle(baseUrl, seed.tenantA, { amount: 1000 });

    const pay = await requestJson(baseUrl, `/api/v1/financial-titles/${title.id}/pay`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { amount: 400, account_id: account.id, payment_method: "pix" },
    });
    assert.equal(pay.status, 201);
    assert.equal(pay.body.data.titleId, title.id);
    assert.equal(pay.body.data.direction, "in");

    const refreshed = await requestJson(baseUrl, `/api/v1/financial-titles/${title.id}`, { headers: authHeaders(seed.tenantA, "finance") });
    assert.equal(refreshed.body.data.status, "partially_paid");
    assert.equal(refreshed.body.data.paidAmount, 400);

    const balance = await requestJson(baseUrl, `/api/v1/financial-accounts/${account.id}/balance`, { headers: authHeaders(seed.tenantA, "finance") });
    assert.equal(balance.status, 200);
    assert.equal(balance.body.data.openingBalance, 500);
    assert.equal(balance.body.data.in, 400);
    assert.equal(balance.body.data.balance, 900);
  });
});

test("[rota] estorno: POST /financial-entries/:id/reverse → 201 contra-lançamento (out, reversalOf)", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const entry = await requestJson(baseUrl, "/api/v1/financial-entries", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" },
    });
    const reversed = await requestJson(baseUrl, `/api/v1/financial-entries/${entry.body.data.id}/reverse`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(reversed.status, 201);
    assert.equal(reversed.body.data.direction, "out");
    assert.equal(reversed.body.data.reversalOf, entry.body.data.id);
  });
});

test("[rota] idempotência da liquidação via API: replay mesmo client_action_id → 409 duplicate_payment", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const title = await createTitle(baseUrl, seed.tenantA, { amount: 500 });
    const cid = randomUUID();
    const first = await requestJson(baseUrl, `/api/v1/financial-titles/${title.id}/pay`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { amount: 200, account_id: account.id, payment_method: "pix", client_action_id: cid },
    });
    assert.equal(first.status, 201);
    const replay = await requestJson(baseUrl, `/api/v1/financial-titles/${title.id}/pay`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { amount: 200, account_id: account.id, payment_method: "pix", client_action_id: cid },
    });
    assert.equal(replay.status, 409);
    assert.equal(replay.body.error.reason, "duplicate_payment");
  });
});

test("[rota][RBAC] finance/tenant_admin/super_admin criam (201) e leem (200)", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    for (const role of ["finance", "tenant_admin", "super_admin"] as const) {
      const account = await createAccount(baseUrl, seed.tenantA, {}, role);
      const created = await requestJson(baseUrl, "/api/v1/financial-entries", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" },
      });
      assert.equal(created.status, 201, `POST as ${role}`);
      const list = await requestJson(baseUrl, "/api/v1/financial-entries", { headers: authHeaders(seed.tenantA, role) });
      assert.equal(list.status, 200, `GET as ${role}`);
    }
  });
});

test("[rota][RBAC] manager/auditor/viewer leem (200) mas 403 em POST/pay/reverse/DELETE", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const title = await createTitle(baseUrl, seed.tenantA, { amount: 100 });
    const entry = await requestJson(baseUrl, "/api/v1/financial-entries", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" },
    });
    const id = entry.body.data.id;

    for (const role of ["manager", "auditor", "viewer"] as const) {
      assert.equal((await requestJson(baseUrl, "/api/v1/financial-entries", { headers: authHeaders(seed.tenantA, role) })).status, 200, `GET as ${role}`);
      assert.equal(
        (await requestJson(baseUrl, "/api/v1/financial-entries", {
          method: "POST",
          headers: authHeaders(seed.tenantA, role),
          body: { account_id: account.id, direction: "in", amount: 5, payment_method: "pix" },
        })).status,
        403,
        `POST as ${role}`,
      );
      assert.equal(
        (await requestJson(baseUrl, `/api/v1/financial-titles/${title.id}/pay`, {
          method: "POST",
          headers: authHeaders(seed.tenantA, role),
          body: { amount: 5, account_id: account.id, payment_method: "pix" },
        })).status,
        403,
        `pay as ${role}`,
      );
      assert.equal(
        (await requestJson(baseUrl, `/api/v1/financial-entries/${id}/reverse`, { method: "POST", headers: authHeaders(seed.tenantA, role) })).status,
        403,
        `reverse as ${role}`,
      );
      assert.equal(
        (await requestJson(baseUrl, `/api/v1/financial-entries/${id}`, { method: "DELETE", headers: authHeaders(seed.tenantA, role) })).status,
        403,
        `DELETE as ${role}`,
      );
    }
  });
});

test("[rota][RBAC] operator/inventory/field_technician/support → 403 em tudo (nem leem)", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    for (const role of ["operator", "inventory", "field_technician", "support"] as const) {
      assert.equal((await requestJson(baseUrl, "/api/v1/financial-entries", { headers: authHeaders(seed.tenantA, role) })).status, 403, `GET as ${role}`);
    }
  });
});

test("[rota][RBAC] requisição anônima → 403", async () => {
  await withFinancialEntryApi(async ({ baseUrl }) => {
    const anon = await requestJson(baseUrl, "/api/v1/financial-entries", { method: "POST", body: { direction: "in", amount: 10, payment_method: "pix" } });
    assert.equal(anon.status, 403);
  });
});

// ---------------------------------------------------------------- harness (espelho de financial-titles-routes)

type SeedData = { readonly tenantA: Tenant; readonly tenantB: Tenant };
type FinancialEntryApiContext = { readonly baseUrl: string; readonly seed: SeedData };

async function withFinancialEntryApi(callback: (context: FinancialEntryApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant Financial Entries A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "Tenant Financial Entries B", modules: ["dashboard", "finance"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB } });
  } finally {
    await closeServer(server);
    resetAll();
  }
}

async function createAccount(baseUrl: string, tenant: Tenant, overrides: Record<string, unknown> = {}, role = "finance") {
  const res = await requestJson(baseUrl, "/api/v1/financial-accounts", {
    method: "POST",
    headers: authHeaders(tenant, role),
    body: { name: `Caixa ${randomUUID()}`, ...overrides },
  });
  assert.equal(res.status, 201, "createAccount");
  return res.body.data as { id: string };
}

async function createTitle(baseUrl: string, tenant: Tenant, overrides: Record<string, unknown> = {}) {
  const res = await requestJson(baseUrl, "/api/v1/financial-titles", {
    method: "POST",
    headers: authHeaders(tenant, "finance"),
    body: { direction: "receivable", party_type: "customer", party_name: "Cliente", amount: 100, due_date: "2026-08-10", ...overrides },
  });
  assert.equal(res.status, 201, "createTitle");
  return res.body.data as { id: string };
}

function authHeaders(tenant: Tenant, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": randomUUID(), "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
