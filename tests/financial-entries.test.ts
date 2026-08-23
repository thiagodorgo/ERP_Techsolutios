import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  getMemoryFinancialAccountRepositoryForTests,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import { getMemoryChequeRepositoryForTests } from "../src/modules/cheques/index.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  getMemoryFinancialTitleRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import {
  FinancialEntryError,
  FinancialEntryService,
  createMemoryFinancialEntryService,
  getMemoryFinancialEntryRepositoryForTests,
  parseOccurredAt,
  resetFinancialEntryRuntimeForTests,
  type AccountReader,
  type FinancialEntryActorContext,
} from "../src/modules/financial-entries/index.js";
import {
  createMemoryFinancialUnitOfWork,
  type FinancialUnitOfWork,
  type FinancialUowContext,
  type FinancialUowResolver,
} from "../src/modules/financial-uow/index.js";
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

// ---------- P-Ω4-COMPETENCIA-TZ — competência do LANÇAMENTO no fuso de negócio (UTC-3) ----------
// occurred_at é a base da competência do lançamento (mesma máquina do título). Um lançamento de fim de
// mês em horário BR precisa cair no mês BRASILEIRO — não no mês UTC — para respeitar o chokepoint por
// competência do Ω4-6. parseOccurredAt ancora date-only à meia-noite BR-local (não UTC-midnight).
test("parseOccurredAt + deriveCompetencia: fronteira de fuso do lançamento", () => {
  // Instante UTC de agosto que é 31/07 23h BRT → julho.
  assert.equal(deriveCompetencia(parseOccurredAt("2026-08-01T02:00:00Z")), "2026-07");
  // date-only não cruza a fronteira do dia (BR-local).
  assert.equal(deriveCompetencia(parseOccurredAt("2026-07-01")), "2026-07"); // 1º dia — jamais junho
  assert.equal(deriveCompetencia(parseOccurredAt("2026-07-31")), "2026-07"); // último dia do mês
});

test("create: occurred_at date-only 2026-07-01 → competência 2026-07 (fim-a-fim, não junho)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, {
    account_id: account.id,
    direction: "in",
    amount: 10,
    payment_method: "pix",
    occurred_at: "2026-07-01",
  });
  assert.equal(entry.competencia, "2026-07");
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

test("[pós-análise A1] DELETE de lançamento já ESTORNADO → 422 (não desbalança o saldo); saldo intacto", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx, { opening_balance: 0 });
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 200, payment_method: "pix" });
  await entries.reverse(ctx, entry.id); // saldo volta a 0 (in 200 + out 200)
  await assert.rejects(
    () => entries.delete(ctx, entry.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "reversal_pair_immutable",
  );
  assert.equal((await entries.balance(ctx, account.id)).balance, 0); // NÃO virou −200
});

test("[pós-análise A1/B1] o contra-lançamento do estorno é imutável: DELETE e REVERSE dele → 422", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx, { opening_balance: 0 });
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 200, payment_method: "pix" });
  const contra = await entries.reverse(ctx, entry.id);
  await assert.rejects(
    () => entries.delete(ctx, contra.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "reversal_pair_immutable",
  );
  await assert.rejects(
    () => entries.reverse(ctx, contra.id), // não estorna um estorno
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "reversal_pair_immutable",
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

// ---------------------------------------------------------------- estorno de LIQUIDAÇÃO (B-O6R-02 F4, Ω6R-DIN-002)
// O estorno de um lançamento de liquidação passou a DEVOLVER o pagamento ao título NA MESMA unidade:
// paid_amount decrementa e o status recalcula (total → open; parcial → partially_paid). Antes, o caixa
// era revertido e o título continuava pago — as duas verdades incompatíveis do achado.

test("ESTORNO de liquidação TOTAL devolve o pagamento: paid_amount volta a 0 e o título REABRE (open)", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 250 }));
  const payment = await entries.payTitle(ctx, title.id, { amount: 250, account_id: account.id, payment_method: "pix" });
  assert.equal((await titles.get(ctx, title.id)).status, "paid");

  const contra = await entries.reverse(ctx, payment.id);
  assert.equal(contra.reversalOf, payment.id);
  assert.equal(contra.direction, "out");
  // A contrapartida nasce SEM title_id (não duplica a contagem da liquidação).
  assert.equal(contra.titleId, undefined);

  const refreshed = await titles.get(ctx, title.id);
  assert.equal(refreshed.paidAmount, 0, "o pagamento devolvido tem de sair do título");
  assert.equal(refreshed.status, "open", "título totalmente devolvido reabre");
});

test("ESTORNO de liquidação PARCIAL: título volta a partially_paid com o paid_amount decrementado", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 100 }));
  await entries.payTitle(ctx, title.id, { amount: 40, account_id: account.id, payment_method: "pix" });
  const second = await entries.payTitle(ctx, title.id, { amount: 60, account_id: account.id, payment_method: "pix" });
  assert.equal((await titles.get(ctx, title.id)).status, "paid");

  await entries.reverse(ctx, second.id);
  const refreshed = await titles.get(ctx, title.id);
  assert.equal(refreshed.paidAmount, 40, "só o pagamento estornado sai do título");
  assert.equal(refreshed.status, "partially_paid");
});

test("ESTORNO de liquidação: 2º estorno → 409 already_reversed e o título NÃO decrementa de novo", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 100 }));
  const payment = await entries.payTitle(ctx, title.id, { amount: 100, account_id: account.id, payment_method: "pix" });
  await entries.reverse(ctx, payment.id);

  await assert.rejects(
    () => entries.reverse(ctx, payment.id),
    (e: unknown) => isDomainError(e, 409, "already_reversed"),
  );
  const refreshed = await titles.get(ctx, title.id);
  assert.equal(refreshed.paidAmount, 0, "um único decremento — nunca duplo");
  assert.equal(refreshed.status, "open");
  // Exatamente 1 contrapartida ativa apontando o original.
  assert.equal(
    (await entries.list(ctx, {})).items.filter((item) => item.reversalOf === payment.id).length,
    1,
  );
});

test("ESTORNO de liquidação com restore rejeitado → 409 fail-closed e NADA commita", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 100 }));
  const payment = await entries.payTitle(ctx, title.id, { amount: 40, account_id: account.id, payment_method: "pix" });
  const titleBefore = await titles.get(ctx, title.id);
  const originalBefore = await entries.get(ctx, payment.id);

  const memoryUow = createMemoryFinancialUnitOfWork({
    titles: getMemoryFinancialTitleRepositoryForTests(),
    entries: getMemoryFinancialEntryRepositoryForTests(),
    cheques: getMemoryChequeRepositoryForTests(),
    periodCloses: getMemoryFinancialPeriodCloseRepositoryForTests(),
  });
  const faultUow: FinancialUnitOfWork = {
    async run<T>(tenantId: string, work: (uowCtx: FinancialUowContext) => Promise<T>): Promise<T> {
      return memoryUow.run(tenantId, async (uowCtx) => {
        const faultTitles = new Proxy(uowCtx.titles, {
          get(target, property, receiver) {
            if (property === "restorePaymentGuarded") {
              return async () => undefined;
            }
            const member = Reflect.get(target, property, receiver);
            return typeof member === "function" ? member.bind(target) : member;
          },
        });
        return work({ ...uowCtx, titles: faultTitles });
      });
    },
  };
  const resolveFaultUow: FinancialUowResolver = async () => faultUow;
  const accountReader: AccountReader = {
    async findAccount(tenantId, accountId) {
      const found = await getMemoryFinancialAccountRepositoryForTests().findById(tenantId, accountId);
      if (!found) return undefined;
      return {
        id: found.id,
        currency: found.currency,
        isActive: found.isActive,
        openingBalance: found.openingBalance,
      };
    },
  };
  const entriesWithRestoreFault = new FinancialEntryService(
    getMemoryFinancialEntryRepositoryForTests(),
    getMemoryFinancialPeriodCloseRepositoryForTests(),
    accountReader,
    () => Promise.resolve(createMemoryFinancialTitleService()),
    resolveFaultUow,
  );

  await assert.rejects(
    () => entriesWithRestoreFault.reverse(ctx, payment.id),
    (e: unknown) => isDomainError(e, 409, "title_restore_conflict"),
  );
  // Fail-closed: a contrapartida NÃO pode sobreviver sem o título restaurado (senão DIN-002 renasce).
  assert.equal((await entries.list(ctx, {})).items.filter((item) => item.reversalOf === payment.id).length, 0);
  const titleAfter = await titles.get(ctx, title.id);
  assert.equal(titleAfter.deletedAt, undefined, "o título continua ativo");
  assert.equal(titleAfter.paidAmount, titleBefore.paidAmount, "paid_amount volta ao valor anterior");
  assert.equal(titleAfter.status, titleBefore.status, "o status do título não muda");
  const originalAfter = await entries.get(ctx, payment.id);
  assert.equal(originalAfter.deletedAt, undefined, "o lançamento original continua ativo");
  assert.deepEqual(originalAfter, originalBefore, "o lançamento original continua inalterado");
});

// ------------------------------------------- delete de LIQUIDAÇÃO recusa (B-O6R-02 ciclo 2 · C1)
// P1 — desfazer o caixa de uma liquidação devolve o pagamento ao título na MESMA unidade (reverse)
//      ou é RECUSADO (delete → 422), em TODO caminho da API que desfaz.
// P2 — nenhuma sequência de chamadas deixa título com paid_amount > 0 sem lançamento vivo que o
//      sustente, e todo título alcançável pela API tem ROTA DE SAÍDA.
// O defeito (Ω6R-DIN-010, medido em e4e914a): DELETE do lançamento de liquidação era ACEITO — o caixa
// voltava, o título ficava paid=40, e depois nem se apagava (422 title_has_payments) nem se estornava
// (404 entry_not_found). Um estado sem saída, criado por uma chamada HTTP com a permissão de quem paga.

test("[C1/P1] DELETE de lançamento de LIQUIDAÇÃO → 422 settlement_entry_immutable; título e lançamento INTACTOS", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 100 }));
  const payment = await entries.payTitle(ctx, title.id, { amount: 40, account_id: account.id, payment_method: "pix" });
  const balanceBefore = await entries.balance(ctx, account.id);

  await assert.rejects(
    () => entries.delete(ctx, payment.id),
    (e: unknown) => isDomainError(e, 422, "settlement_entry_immutable"),
  );

  // Nada se moveu: nem o lançamento, nem o título, nem o caixa.
  const entryAfter = await entries.get(ctx, payment.id);
  assert.equal(entryAfter.deletedAt, undefined, "o lançamento de liquidação continua vivo");
  assert.equal(entryAfter.titleId, title.id);
  const titleAfter = await titles.get(ctx, title.id);
  assert.equal(titleAfter.paidAmount, 40, "o título não pode perder nem ganhar pagamento numa recusa");
  assert.equal(titleAfter.status, "partially_paid");
  assert.deepEqual(await entries.balance(ctx, account.id), balanceBefore, "o saldo da conta não se move");
});

test("[C1/P2] ROTA DE SAÍDA: pay → delete RECUSADO → reverse → paid=0/open → delete do TÍTULO aceito", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const title = await titles.create(ctx, receivableBody({ amount: 100 }));
  const payment = await entries.payTitle(ctx, title.id, { amount: 40, account_id: account.id, payment_method: "pix" });

  // (1) o caminho errado é recusado — e é aqui que o estado sem saída deixava de ser alcançável.
  await assert.rejects(
    () => entries.delete(ctx, payment.id),
    (e: unknown) => isDomainError(e, 422, "settlement_entry_immutable"),
  );
  // (2) enquanto o título tem pagamento, apagá-lo continua (corretamente) recusado.
  await assert.rejects(
    () => titles.delete(ctx, title.id),
    (e: unknown) => isDomainError(e, 422, "title_has_payments"),
  );
  // (3) a ÚNICA porta que desfaz: o estorno devolve o pagamento na mesma unidade.
  await entries.reverse(ctx, payment.id);
  const reopened = await titles.get(ctx, title.id);
  assert.equal(reopened.paidAmount, 0);
  assert.equal(reopened.status, "open");
  // (4) e então o título volta a ser apagável — a saída existe, ponta a ponta.
  const removed = await titles.delete(ctx, title.id);
  assert.notEqual(removed.deletedAt, undefined, "com paid_amount = 0 o título volta a ser removível");
});

test("[C1] precedência do DELETE: entry_reconciled e reversal_pair_immutable vêm ANTES de settlement_entry_immutable", async () => {
  const { entries, accounts, titles } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);

  // Liquidação CONCILIADA: a imutabilidade da conciliação decide primeiro.
  const titleA = await titles.create(ctx, receivableBody({ amount: 100 }));
  const conciliada = await entries.payTitle(ctx, titleA.id, { amount: 10, account_id: account.id, payment_method: "pix" });
  await entries.reconcile(ctx, conciliada.id, { reconciled: true });
  await assert.rejects(
    () => entries.delete(ctx, conciliada.id),
    (e: unknown) => isDomainError(e, 422, "entry_reconciled"),
  );

  // Liquidação JÁ ESTORNADA: o par de estorno decide antes da liquidação.
  const titleB = await titles.create(ctx, receivableBody({ amount: 100 }));
  const estornada = await entries.payTitle(ctx, titleB.id, { amount: 10, account_id: account.id, payment_method: "pix" });
  await entries.reverse(ctx, estornada.id);
  await assert.rejects(
    () => entries.delete(ctx, estornada.id),
    (e: unknown) => isDomainError(e, 422, "reversal_pair_immutable"),
  );
});

test("[C1] o guard é ESTREITO: lançamento AVULSO (sem title_id) continua deletável", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const avulso = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 30, payment_method: "pix" });

  const removed = await entries.delete(ctx, avulso.id);
  assert.notEqual(removed.deletedAt, undefined, "o delete de avulso não pode ser vítima colateral do guard");
  assert.equal((await entries.list(ctx, {})).total, 0);
});

// ---------------------------------------------------------------- conciliação (reconcile) [Ω4-5]
// Paridade InMemory×Prisma é ESTRUTURAL (mesmo contrato de repo/DTO/erros); a suíte roda só em memory
// (CORE_SAAS_PERSISTENCE=memory) — o caminho Prisma da conciliação não é exercido sem banco, idêntico a
// P-Ω4-4-EDGES e aos vizinhos Ω4-1..4-4.

test("reconcile happy: flag+divergence+ref e carimbo server-side (reconciledAt/By)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  const reconciled = await entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: "value", reconciliation_ref: "EXT-123" });
  assert.equal(reconciled.reconciled, true);
  assert.equal(reconciled.divergenceType, "value");
  assert.equal(reconciled.reconciliationRef, "EXT-123");
  assert.equal(reconciled.reconciledAt instanceof Date, true);
  assert.equal(reconciled.reconciledBy, ctx.userId);
  // [validador BAIXA] conciliar é META-DADO: NÃO muta amount/direction nem o saldo da conta (só marca).
  assert.equal(reconciled.amount, 100);
  assert.equal(reconciled.direction, "in");
  assert.equal((await entries.balance(ctx, account.id)).balance, 100);
});

test("reconcile LIMPO (sem divergence) → ok, divergenceType undefined mas carimbado", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  const reconciled = await entries.reconcile(ctx, entry.id, { reconciled: true });
  assert.equal(reconciled.reconciled, true);
  assert.equal(reconciled.divergenceType, undefined);
  assert.equal(reconciled.reconciledAt instanceof Date, true);
});

test("cada divergence_type válido {value,date} é aceito", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  for (const v of ["value", "date"] as const) {
    const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
    const reconciled = await entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: v });
    assert.equal(reconciled.divergenceType, v);
  }
});

test("divergence_type FORA da allowlist → 400 (foo, e os removidos missing/duplicate)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  for (const bad of ["foo", "missing", "duplicate"]) {
    const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
    await assert.rejects(
      () => entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: bad }),
      (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_divergence_type",
    );
  }
});

test("reconciled AUSENTE (write-path estrito) → 400 invalid_reconciled", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  await assert.rejects(
    () => entries.reconcile(ctx, entry.id, {}),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 400 && e.reason === "invalid_reconciled",
  );
});

test("DESCONCILIAR (reconciled=false) limpa divergence/ref/at/by", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  await entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: "date", reconciliation_ref: "X" });
  const undone = await entries.reconcile(ctx, entry.id, { reconciled: false });
  assert.equal(undone.reconciled, false);
  assert.equal(undone.divergenceType, undefined);
  assert.equal(undone.reconciliationRef, undefined);
  assert.equal(undone.reconciledAt, undefined);
  assert.equal(undone.reconciledBy, undefined);
});

test("[pós-análise B4] re-reconcile SOBRESCREVE a divergência; e reafirmar sem divergência LIMPA-a (semântica PUT)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  const v = await entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: "value", reconciliation_ref: "EXT-1" });
  assert.equal(v.divergenceType, "value");
  const d = await entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: "date" }); // sobrescreve
  assert.equal(d.divergenceType, "date");
  assert.equal(d.reconciliationRef, undefined); // não reenviado → limpo (write-path resolve os 5 campos)
  const clean = await entries.reconcile(ctx, entry.id, { reconciled: true }); // reafirma sem divergência → limpa
  assert.equal(clean.reconciled, true);
  assert.equal(clean.divergenceType, undefined);
});

test("reconcile de lançamento DELETADO → 404", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  await entries.delete(ctx, entry.id);
  await assert.rejects(
    () => entries.reconcile(ctx, entry.id, { reconciled: true }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 404,
  );
});

test("reconcile inexistente/cross-tenant → 404 (isolamento)", async () => {
  const { entries, accounts } = setup();
  const owner = actor();
  const account = await activeAccount(accounts, owner);
  const entry = await entries.create(owner, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  await assert.rejects(
    () => entries.reconcile(actor(), entry.id, { reconciled: true }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 404,
  );
});

// DECISÃO (endurecida pelo ataque, D-Ω4-5-RECONCILE-META): conciliação é META-DADO e ATRAVESSA período
// fechado (não altera a soma da competência; o extrato chega DEPOIS do fechamento). Coerente com
// D-Ω4-POS-FECHAMENTO. Inverte o teste-guia original que esperava 422 period_closed.
test("reconcile em período FECHADO → SUCESSO (meta-dado; não gated pelo chokepoint)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix", occurred_at: "2026-05-10T00:00:00.000Z" });
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2026-05", "closed");
  const reconciled = await entries.reconcile(ctx, entry.id, { reconciled: true, divergence_type: "value" });
  assert.equal(reconciled.reconciled, true);
  assert.equal(reconciled.reconciledAt instanceof Date, true);
});

test("[fix P-Ω4-4-REVERSE-MUTABLE] reverse de lançamento CONCILIADO → 422 entry_reconciled; nenhum contra criado", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  await entries.reconcile(ctx, entry.id, { reconciled: true });
  await assert.rejects(
    () => entries.reverse(ctx, entry.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "entry_reconciled",
  );
  assert.equal((await entries.list(ctx, {})).total, 1); // só o original; nenhum contra-lançamento
});

test("conciliar → desconciliar → reverse volta a funcionar (contra-lançamento out)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  await entries.reconcile(ctx, entry.id, { reconciled: true });
  await entries.reconcile(ctx, entry.id, { reconciled: false });
  const contra = await entries.reverse(ctx, entry.id);
  assert.equal(contra.direction, "out");
  assert.equal(contra.reversalOf, entry.id);
});

test("update e delete de lançamento CONCILIADO → 422 entry_reconciled (assertMutable)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  await entries.reconcile(ctx, entry.id, { reconciled: true });
  await assert.rejects(
    () => entries.update(ctx, entry.id, { category: "x" }),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "entry_reconciled",
  );
  await assert.rejects(
    () => entries.delete(ctx, entry.id),
    (e: unknown) => e instanceof FinancialEntryError && e.statusCode === 422 && e.reason === "entry_reconciled",
  );
});

// DECISÃO (item 6): conciliar é sobre o EXTRATO bancário → um lançamento de par de estorno (o original
// estornado E o próprio contra-lançamento) PODE ser conciliado (ambos aparecem no extrato).
test("conciliar lançamento de par de estorno (original E contra) é PERMITIDO", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const entry = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" });
  const contra = await entries.reverse(ctx, entry.id);
  assert.equal((await entries.reconcile(ctx, entry.id, { reconciled: true })).reconciled, true);
  assert.equal((await entries.reconcile(ctx, contra.id, { reconciled: true })).reconciled, true);
});

test("extrato: filtra por reconciled=true|false", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const a = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 20, payment_method: "pix" });
  await entries.reconcile(ctx, a.id, { reconciled: true });
  assert.equal((await entries.list(ctx, { reconciled: true })).total, 1);
  assert.equal((await entries.list(ctx, { reconciled: false })).total, 1);
});

test("extrato: filtra por divergence_type", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const a = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  const b = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 20, payment_method: "pix" });
  await entries.reconcile(ctx, a.id, { reconciled: true, divergence_type: "value" });
  await entries.reconcile(ctx, b.id, { reconciled: true, divergence_type: "date" });
  assert.equal((await entries.list(ctx, { divergence_type: "value" })).total, 1);
});

test("extrato: filtro reconciled LENIENTE (valor inválido é ignorado, não 400)", async () => {
  const { entries, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" });
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 20, payment_method: "pix" });
  assert.equal((await entries.list(ctx, { reconciled: "xyz" })).total, 2);
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

// [C1/P1] O achado da junta era uma CHAMADA HTTP, com a mesma permissão de quem paga — a prova tem
// de ser HTTP também, com envelope e reason exatos (o serviço podia recusar e a rota traduzir errado).
test("[rota][C1] DELETE /financial-entries/:id de LIQUIDAÇÃO → 422 settlement_entry_immutable; título e caixa intactos", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA, { opening_balance: 0 });
    const title = await createTitle(baseUrl, seed.tenantA, { amount: 100 });
    const pay = await requestJson(baseUrl, `/api/v1/financial-titles/${title.id}/pay`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { amount: 40, account_id: account.id, payment_method: "pix" },
    });
    assert.equal(pay.status, 201);

    const removed = await requestJson(baseUrl, `/api/v1/financial-entries/${pay.body.data.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(removed.status, 422, "o DELETE da liquidação era 200 no head e4e914a — é o achado Ω6R-DIN-010");
    assert.equal(removed.body.error.reason, "settlement_entry_immutable");
    assert.match(String(removed.body.error.message), /reverse/i, "a mensagem tem de apontar o remédio");
    assert.equal(removed.body.error.tenantId, undefined, "§2.8: erro não vaza tenant");
    assert.equal(removed.body.error.tenant_id, undefined);

    // O caixa NÃO voltou (era 40 → 0 no defeito) e o título segue com o pagamento.
    const balance = await requestJson(baseUrl, `/api/v1/financial-accounts/${account.id}/balance`, {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(balance.body.data.balance, 40, "o saldo tem de continuar 40 — o dinheiro não some pela recusa");
    const refreshed = await requestJson(baseUrl, `/api/v1/financial-titles/${title.id}`, {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(refreshed.body.data.paidAmount, 40);
    assert.equal(refreshed.body.data.status, "partially_paid");
  });
});

// [C2/P3 · Ω6R-DIN-011] O ataque da junta ponta a ponta POR HTTP, que é como ele foi medido: cheque
// de +100 compensado → reverse do lançamento de compensação → bounce. Dava 200 devolvidos num cheque
// de 100. A recusa tem de acontecer na ROTA, não só no serviço.
test("[rota][C2] reverse do lançamento de COMPENSAÇÃO → 422 cheque_entry_immutable; bounce leva a líquido ZERO, nunca −100", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA, { opening_balance: 0 });
    const headers = authHeaders(seed.tenantA, "finance");

    const cheque = await requestJson(baseUrl, "/api/v1/cheques", {
      method: "POST",
      headers,
      body: { direction: "received", cheque_number: "000999", bank: "Banco Ataque", amount: 100, account_id: account.id },
    });
    assert.equal(cheque.status, 201);
    const chequeId = cheque.body.data.id as string;
    assert.equal((await requestJson(baseUrl, `/api/v1/cheques/${chequeId}/deposit`, { method: "POST", headers })).status, 200);
    const cleared = await requestJson(baseUrl, `/api/v1/cheques/${chequeId}/clear`, { method: "POST", headers });
    assert.equal(cleared.status, 200);
    const clearingEntryId = cleared.body.data.clearedEntryId as string;
    assert.ok(clearingEntryId);

    const balanceAfterClear = await requestJson(baseUrl, `/api/v1/financial-accounts/${account.id}/balance`, { headers });
    assert.equal(balanceAfterClear.body.data.balance, 100);

    // O ATAQUE: era 201 no head e4e914a.
    const reversed = await requestJson(baseUrl, `/api/v1/financial-entries/${clearingEntryId}/reverse`, { method: "POST", headers });
    assert.equal(reversed.status, 422, "estornar a compensação por fora da máquina do cheque era ACEITO — é o Ω6R-DIN-011");
    assert.equal(reversed.body.error.reason, "cheque_entry_immutable");
    assert.equal(reversed.body.error.tenantId, undefined, "§2.8: erro não vaza tenant");

    // O DELETE da mesma linha é a outra porta, e recusa igual.
    const deleted = await requestJson(baseUrl, `/api/v1/financial-entries/${clearingEntryId}`, { method: "DELETE", headers });
    assert.equal(deleted.status, 422);
    assert.equal(deleted.body.error.reason, "cheque_entry_immutable");

    // O cheque não se moveu, e o caixa também não.
    const stillCleared = await requestJson(baseUrl, `/api/v1/cheques/${chequeId}`, { headers });
    assert.equal(stillCleared.body.data.status, "cleared");
    assert.equal(
      (await requestJson(baseUrl, `/api/v1/financial-accounts/${account.id}/balance`, { headers })).body.data.balance,
      100,
      "as recusas não podem ter devolvido nada",
    );

    // E a única porta que desfaz leva a ZERO — no defeito, esta linha dava −100.
    const bounced = await requestJson(baseUrl, `/api/v1/cheques/${chequeId}/bounce`, {
      method: "POST",
      headers,
      body: { reason: "sem fundos" },
    });
    assert.equal(bounced.status, 200);
    assert.equal(bounced.body.data.status, "bounced");
    assert.equal(
      (await requestJson(baseUrl, `/api/v1/financial-accounts/${account.id}/balance`, { headers })).body.data.balance,
      0,
      "líquido ZERO: 200 devolvidos num cheque de 100 era o achado",
    );
  });
});

test("[rota] PATCH /financial-entries/:id/reconcile finance → 200; DTO §2.8 (sem tenant_id)", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const entry = await requestJson(baseUrl, "/api/v1/financial-entries", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { account_id: account.id, direction: "in", amount: 50, payment_method: "pix" },
    });
    const reconciled = await requestJson(baseUrl, `/api/v1/financial-entries/${entry.body.data.id}/reconcile`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { reconciled: true, divergence_type: "value", reconciliation_ref: "EXT-9" },
    });
    assert.equal(reconciled.status, 200);
    assert.equal(reconciled.body.data.reconciled, true);
    assert.equal(reconciled.body.data.divergenceType, "value");
    assert.equal(reconciled.body.data.reconciliationRef, "EXT-9");
    assert.ok(reconciled.body.data.reconciledAt);
    assert.equal(reconciled.body.data.tenantId, undefined);
    assert.equal(reconciled.body.data.tenant_id, undefined);
  });
});

test("[rota] reverse de lançamento CONCILIADO via API → 422 entry_reconciled (fix e2e)", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const entry = await requestJson(baseUrl, "/api/v1/financial-entries", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { account_id: account.id, direction: "in", amount: 100, payment_method: "pix" },
    });
    await requestJson(baseUrl, `/api/v1/financial-entries/${entry.body.data.id}/reconcile`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { reconciled: true },
    });
    const reversed = await requestJson(baseUrl, `/api/v1/financial-entries/${entry.body.data.id}/reverse`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(reversed.status, 422);
    assert.equal(reversed.body.error.reason, "entry_reconciled");
  });
});

test("[rota][RBAC] reconcile: finance/tenant_admin/super_admin → 200", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const entry = await requestJson(baseUrl, "/api/v1/financial-entries", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" },
    });
    for (const role of ["finance", "tenant_admin", "super_admin"] as const) {
      const res = await requestJson(baseUrl, `/api/v1/financial-entries/${entry.body.data.id}/reconcile`, {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, role),
        body: { reconciled: true },
      });
      assert.equal(res.status, 200, `reconcile as ${role}`);
    }
  });
});

test("[rota][RBAC] reconcile: papéis sem update → 403", async () => {
  await withFinancialEntryApi(async ({ baseUrl, seed }) => {
    const account = await createAccount(baseUrl, seed.tenantA);
    const entry = await requestJson(baseUrl, "/api/v1/financial-entries", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { account_id: account.id, direction: "in", amount: 10, payment_method: "pix" },
    });
    const id = entry.body.data.id;
    for (const role of ["manager", "auditor", "viewer", "operator", "inventory", "field_technician", "support"] as const) {
      const res = await requestJson(baseUrl, `/api/v1/financial-entries/${id}/reconcile`, {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, role),
        body: { reconciled: true },
      });
      assert.equal(res.status, 403, `reconcile as ${role}`);
    }
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
