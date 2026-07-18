import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import {
  FinancialAccountError,
  type FinancialAccountActorContext,
} from "../src/modules/financial-accounts/financial-account.types.js";

function actor(tenantId = randomUUID()): FinancialAccountActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: ["financial_accounts:read", "financial_accounts:create", "financial_accounts:update"],
  };
}

function service() {
  resetFinancialAccountRuntimeForTests();
  return createMemoryFinancialAccountService();
}

test("cria Conta com dados completos e registra createdBy do ator", async () => {
  const svc = service();
  const ctx = actor();
  const account = await svc.create(ctx, {
    name: "Caixa Matriz",
    kind: "bank",
    currency: "BRL",
    opening_balance: 1500.5,
    bank_name: "Banco do Brasil",
    agency: "0001",
    account_number: "12345-6",
    document: "12.345.678/0001-90",
    notes: "Conta principal",
  });
  assert.equal(account.name, "Caixa Matriz");
  assert.equal(account.kind, "bank");
  assert.equal(account.currency, "BRL");
  assert.equal(account.openingBalance, 1500.5);
  assert.equal(account.bankName, "Banco do Brasil");
  assert.equal(account.status, "active");
  assert.equal(account.isActive, true);
  assert.equal(account.createdBy, ctx.userId);
});

test("defaults: kind=cash, currency=BRL, openingBalance=0", async () => {
  const svc = service();
  const account = await svc.create(actor(), { name: "Caixa" });
  assert.equal(account.kind, "cash");
  assert.equal(account.currency, "BRL");
  assert.equal(account.openingBalance, 0);
  assert.equal(account.bankName, undefined);
});

test("nome duplicado entre contas ATIVAS do mesmo tenant → 409 duplicate_account", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Conta Igual" });
  await assert.rejects(
    () => svc.create(ctx, { name: "Conta Igual" }),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 409 && e.reason === "duplicate_account",
  );
});

test("recriar o mesmo nome após soft-delete → OK (unique parcial WHERE is_active=true)", async () => {
  const svc = service();
  const ctx = actor();
  const first = await svc.create(ctx, { name: "Conta Reciclada" });
  await svc.delete(ctx, first.id);
  const recreated = await svc.create(ctx, { name: "Conta Reciclada" });
  assert.equal(recreated.name, "Conta Reciclada");
  assert.equal(recreated.isActive, true);
  assert.notEqual(recreated.id, first.id);
});

test("name vazio → 400 required_field", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), {}),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 400 && e.reason === "required_field",
  );
});

test("kind fora da allowlist → 400 invalid_kind", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "X", kind: "credit" }),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 400 && e.reason === "invalid_kind",
  );
});

test("currency fora da allowlist (USD) → 400 invalid_currency", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Y", currency: "USD" }),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 400 && e.reason === "invalid_currency",
  );
});

test("opening_balance negativo → 400 (saldo devedor é lançamento, não abertura)", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Z", opening_balance: -1 }),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 400 && e.reason === "invalid_opening_balance",
  );
});

test("opening_balance é arredondado para 2 casas (sem float drift)", async () => {
  const svc = service();
  const ctx = actor();
  const account = await svc.create(ctx, { name: "Preciso", opening_balance: 1234.567 });
  assert.equal(account.openingBalance, 1234.57);
  const clean = await svc.create(ctx, { name: "Limpo", opening_balance: 0.1 + 0.2 });
  assert.equal(clean.openingBalance, 0.3);
});

test("opening_balance acima do teto Decimal(12,2) → 422 opening_balance_overflow", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.create(actor(), { name: "Estouro", opening_balance: 10000000000 }),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 422 && e.reason === "opening_balance_overflow",
  );
});

test("get retorna a conta do próprio tenant", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { name: "Detalhe" });
  const fetched = await svc.get(ctx, created.id);
  assert.equal(fetched.id, created.id);
  assert.equal(fetched.name, "Detalhe");
});

test("get de conta de OUTRO tenant → 404 account_not_found (não vaza existência)", async () => {
  const svc = service();
  const owner = actor();
  const created = await svc.create(owner, { name: "Do dono" });
  const intruder = actor();
  await assert.rejects(
    () => svc.get(intruder, created.id),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 404 && e.reason === "account_not_found",
  );
});

test("get de conta inexistente → 404", async () => {
  const svc = service();
  await assert.rejects(
    () => svc.get(actor(), randomUUID()),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 404,
  );
});

test("patch altera nome e registra updatedBy do ator", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { name: "Antigo" });
  const editor: FinancialAccountActorContext = { ...ctx, userId: randomUUID() };
  const updated = await svc.update(editor, created.id, { name: "Novo", kind: "wallet" });
  assert.equal(updated.name, "Novo");
  assert.equal(updated.kind, "wallet");
  assert.equal(updated.updatedBy, editor.userId);
  assert.equal(updated.createdBy, ctx.userId);
});

test("patch renomeando para nome de outra conta ATIVA → 409 duplicate_account", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Conta A" });
  const b = await svc.create(ctx, { name: "Conta B" });
  await assert.rejects(
    () => svc.update(ctx, b.id, { name: "Conta A" }),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 409 && e.reason === "duplicate_account",
  );
});

test("patch de conta de outro tenant → 404", async () => {
  const svc = service();
  const owner = actor();
  const created = await svc.create(owner, { name: "Só do dono" });
  await assert.rejects(
    () => svc.update(actor(), created.id, { notes: "x" }),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 404,
  );
});

test("DELETE lógico: some da lista, is_active=false e status=inactive", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { name: "Excluir" });
  const removed = await svc.delete(ctx, created.id);
  assert.equal(removed.isActive, false);
  assert.equal(removed.status, "inactive");
  const list = await svc.list(ctx, {});
  assert.equal(list.total, 0);
  // Ainda existe para leitura direta (não é delete físico).
  const stillThere = await svc.get(ctx, created.id);
  assert.equal(stillThere.isActive, false);
});

test("re-delete de conta já inativa → 404", async () => {
  const svc = service();
  const ctx = actor();
  const created = await svc.create(ctx, { name: "Duas vezes" });
  await svc.delete(ctx, created.id);
  await assert.rejects(
    () => svc.delete(ctx, created.id),
    (e: unknown) => e instanceof FinancialAccountError && e.statusCode === 404,
  );
});

test("list exclui inativos por padrão; includeInactive traz todos", async () => {
  const svc = service();
  const ctx = actor();
  const ativa = await svc.create(ctx, { name: "Ativa" });
  const inativa = await svc.create(ctx, { name: "Inativa" });
  await svc.delete(ctx, inativa.id);
  const actives = await svc.list(ctx, {});
  assert.equal(actives.total, 1);
  assert.equal(actives.items[0]!.id, ativa.id);
  const all = await svc.list(ctx, { includeInactive: true });
  assert.equal(all.total, 2);
});

test("list filtra por kind", async () => {
  const svc = service();
  const ctx = actor();
  await svc.create(ctx, { name: "Cofre", kind: "cash" });
  await svc.create(ctx, { name: "Itaú", kind: "bank" });
  await svc.create(ctx, { name: "PicPay", kind: "wallet" });
  const banks = await svc.list(ctx, { kind: "bank" });
  assert.equal(banks.total, 1);
  assert.equal(banks.items[0]!.name, "Itaú");
});

test("isolamento: a lista de um tenant NUNCA contém contas de outro (2 tenants em memória)", async () => {
  const svc = service();
  const a = actor();
  const b = actor();
  await svc.create(a, { name: "Conta A-1" });
  await svc.create(a, { name: "Conta A-2" });
  await svc.create(b, { name: "Conta B-1" });
  const listA = await svc.list(a, {});
  const listB = await svc.list(b, {});
  assert.equal(listA.total, 2);
  assert.equal(listB.total, 1);
  assert.equal(listB.items[0]!.name, "Conta B-1");
});
