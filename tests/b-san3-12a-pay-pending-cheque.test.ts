import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  getMemoryFinancialAccountRepositoryForTests,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import {
  FinancialEntryService,
  createMemoryFinancialEntryService,
  getMemoryFinancialEntryRepositoryForTests,
  resetFinancialEntryRuntimeForTests,
  type AccountReader,
} from "../src/modules/financial-entries/index.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import {
  ChequeService,
  createMemoryChequeService,
  getMemoryChequeRepositoryForTests,
  resetChequeRuntimeForTests,
} from "../src/modules/cheques/index.js";
import type { ChequeActorContext } from "../src/modules/cheques/cheque.types.js";
import {
  createDefaultFinancialUnitOfWork,
  type FinancialUnitOfWork,
  type FinancialUowResolver,
} from "../src/modules/financial-uow/index.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — §4.2 do plano v3 (memória). A recusa da baixa manual com cheque vinculado PENDENTE, a regra do
// valor exato no vínculo e a corrida `pay × vincular` com barreira determinística nos dois pontos (A1–A4, A8, A19,
// A25). Dono, 24/10: "server recusa, mas ja direciona para trocar a vinculacao do cheque por outro meio de
// pagamento"; 25/10: "Só cheque do valor exato (Recomendado)".
// O dublê de memória NÃO é evidência de atomicidade (a prova real é `tests/b-san3-12a-pay-link-race-db.test.ts`);
// aqui se prova a semântica observável e a ordem das checagens.
// -----------------------------------------------------------------------------------------------

process.env.CORE_SAAS_PERSISTENCE = "memory";

function actor(tenantId = randomUUID()): ChequeActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: [
      "financial_accounts:read", "financial_accounts:create", "financial_titles:read", "financial_titles:create",
      "financial_titles:update", "financial_entries:read", "financial_entries:create", "financial_entries:update",
      "cheques:read", "cheques:create", "cheques:update",
    ],
  };
}

const ADMIN_EXTRA = ["cheques:unlink_title", "financial_entries:unreconcile"] as const;

function admin(tenantId: string): ChequeActorContext {
  const base = actor(tenantId);
  return { ...base, roles: ["tenant_admin"], permissions: [...base.permissions, ...ADMIN_EXTRA] };
}

function resetAll(): void {
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

const memoryAccountReader: AccountReader = {
  async findAccount(tenantId, accountId) {
    const account = await getMemoryFinancialAccountRepositoryForTests().findById(tenantId, accountId);
    return account ? { id: account.id, currency: account.currency, isActive: account.isActive, openingBalance: account.openingBalance } : undefined;
  },
};

/** UoW de memória que CONTA as unidades abertas e deixa o teste intercalar trabalho antes/dentro delas. */
function countingUow(hooks: { beforeRun?: () => Promise<void>; insideRun?: () => Promise<void> } = {}) {
  const counter = { runs: 0 };
  const resolve: FinancialUowResolver = async () => {
    const real = await createDefaultFinancialUnitOfWork();
    const wrapped: FinancialUnitOfWork = {
      async run(tenantId, work) {
        counter.runs += 1;
        await hooks.beforeRun?.();
        return real.run(tenantId, async (ctx) => {
          await hooks.insideRun?.();
          return work(ctx);
        });
      },
    };
    return wrapped;
  };
  return { counter, resolve };
}

function entryServiceWith(resolveUow: FinancialUowResolver): FinancialEntryService {
  return new FinancialEntryService(
    getMemoryFinancialEntryRepositoryForTests(),
    getMemoryFinancialPeriodCloseRepositoryForTests(),
    memoryAccountReader,
    () => Promise.resolve(createMemoryFinancialTitleService()),
    resolveUow,
  );
}

function chequeServiceWith(resolveUow: FinancialUowResolver): ChequeService {
  return new ChequeService(getMemoryChequeRepositoryForTests(), memoryAccountReader, resolveUow);
}

async function seed(amount = 100, direction: "receivable" | "payable" = "receivable") {
  resetAll();
  const ctx = actor();
  const accounts = createMemoryFinancialAccountService();
  const titles = createMemoryFinancialTitleService();
  const entries = createMemoryFinancialEntryService();
  const cheques = createMemoryChequeService();
  const account = await accounts.create(ctx, { name: `Conta ${randomUUID()}` });
  const title = await titles.create(ctx, {
    direction,
    party_type: direction === "receivable" ? "customer" : "supplier",
    party_name: "Parte SAN3-12a",
    amount,
    issue_date: "2026-10-24",
    due_date: "2026-11-24",
    account_id: account.id,
  });
  return { ctx, accounts, titles, entries, cheques, account, title };
}

function chequeBody(accountId: string, titleId: string | undefined, amount = 100, direction: "received" | "issued" = "received") {
  return { account_id: accountId, title_id: titleId, direction, cheque_number: `S312A-${randomUUID().slice(0, 10)}`, bank: "Banco 12a", amount };
}

function domain(error: unknown, statusCode: number, reason: string): boolean {
  return typeof error === "object" && error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason;
}

const pix = (accountId: string, amount = 100) => ({ account_id: accountId, amount, payment_method: "pix" });

// ------------------------------------------------------------------ A1

for (const state of ["registered", "deposited"] as const) {
  test(`A1: /pay de título com cheque ${state} vinculado → 422 title_has_pending_cheque com o próximo passo; nada criado; nenhuma transação aberta`, async () => {
    const s = await seed();
    const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
    if (state === "deposited") await s.cheques.deposit(s.ctx, cheque.id);
    const { counter, resolve } = countingUow();
    const svc = entryServiceWith(resolve);

    let caught: unknown;
    await assert.rejects(() => svc.payTitle(s.ctx, s.title.id, pix(s.account.id)), (error) => {
      caught = error;
      return domain(error, 422, "title_has_pending_cheque");
    });
    const details = (caught as { details?: Record<string, unknown> }).details;
    assert.deepEqual(details?.chequeIds, [cheque.id]);
    assert.equal(details?.pendingAmount, 100);
    assert.equal(details?.nextStep, "unlink_cheque");
    assert.equal(details?.requiredPermission, "cheques:unlink_title");
    assert.equal(counter.runs, 0, "o fast-fail recusa ANTES de abrir a unidade");
    assert.equal((await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 })).total, 0);
    assert.equal((await s.titles.get(s.ctx, s.title.id)).paidAmount, 0);
  });
}

// ------------------------------------------------------------------ A2

test("A2: título sem cheque, ou com cheque cleared/bounced/cancelled vinculado, baixa normalmente (201)", async () => {
  for (const state of ["none", "cleared", "bounced", "cancelled"] as const) {
    const s = await seed();
    if (state !== "none") {
      // Fixture direta no repositório (o estado terminal de um cheque vinculado SEM ter liquidado o título): é o
      // predicado do conjunto pendente que está sob prova, não o fluxo que leva até ele.
      const repo = getMemoryChequeRepositoryForTests();
      const created = await repo.create({
        tenantId: s.ctx.tenantId, accountId: s.account.id, titleId: s.title.id, direction: "received",
        chequeNumber: `A2-${state}`, bank: "Banco 12a", amount: 100, currency: "BRL",
      });
      if (state === "cancelled") {
        await repo.transition({ tenantId: s.ctx.tenantId, chequeId: created.id, fromStatus: "registered", toStatus: "cancelled" });
      } else {
        await repo.transition({ tenantId: s.ctx.tenantId, chequeId: created.id, fromStatus: "registered", toStatus: "deposited" });
        await repo.transition({ tenantId: s.ctx.tenantId, chequeId: created.id, fromStatus: "deposited", toStatus: state });
      }
    }
    const entry = await s.entries.payTitle(s.ctx, s.title.id, pix(s.account.id));
    assert.equal(entry.titleId, s.title.id, `${state}: baixa por pix liquidou`);
    assert.equal((await s.titles.get(s.ctx, s.title.id)).status, "paid", `${state}: título pago`);
  }
});

// ------------------------------------------------------------------ A3

test("A3: precedência — title_has_pending_cheque vence period_closed (o fast-fail decide antes do período)", async () => {
  const s = await seed();
  await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(s.ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(() => s.entries.payTitle(s.ctx, s.title.id, pix(s.account.id)), (e) => domain(e, 422, "title_has_pending_cheque"));
});

test("A3: precedência — cheque_required vence title_has_pending_cheque (payment_method=check com cheque pendente)", async () => {
  const s = await seed();
  await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await assert.rejects(
    () => s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "check" }),
    (e) => domain(e, 422, "cheque_required"),
  );
});

// ------------------------------------------------------------------ A4 (memória) — pay × vincular

test("A4 (b, memória): o vínculo commita DEPOIS do fast-fail do pay e ANTES do lock do título → o re-check recusa; nada criado", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, undefined));
  // Barreira 1: o pay passou o fast-fail (nenhum cheque pendente) e está entrando na unidade; aqui o vínculo commita.
  const { resolve } = countingUow({
    beforeRun: async () => {
      await s.cheques.update(s.ctx, cheque.id, { title_id: s.title.id });
    },
  });
  const svc = entryServiceWith(resolve);
  await assert.rejects(() => svc.payTitle(s.ctx, s.title.id, pix(s.account.id)), (e) => domain(e, 422, "title_has_pending_cheque"));
  assert.equal((await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 })).total, 0, "nenhum lançamento");
  assert.equal((await s.titles.get(s.ctx, s.title.id)).paidAmount, 0, "título intocado");
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).titleId, s.title.id, "o vínculo ficou (venceu)");
});

test("A4 (c, memória): o pay trava primeiro → o vínculo espera, relê o título pago sob o lock e sai 422 title_already_paid", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, undefined));
  let linkOutcome: Promise<unknown> | undefined;
  // Barreira 2: DENTRO da unidade do pay (o mutex do tenant já é dele) o vínculo é disparado; o fast-fail dele vê o
  // título ainda aberto e ele entra na fila do mutex — só roda depois do commit do pay.
  const { resolve } = countingUow({
    insideRun: async () => {
      linkOutcome = s.cheques.update(s.ctx, cheque.id, { title_id: s.title.id }).then(
        () => ({ rejected: false as const }),
        (error: unknown) => ({ rejected: true as const, error }),
      );
      await new Promise((r) => setImmediate(r));
    },
  });
  const svc = entryServiceWith(resolve);
  await svc.payTitle(s.ctx, s.title.id, pix(s.account.id));
  const outcome = (await linkOutcome) as { rejected: boolean; error?: unknown };
  assert.equal(outcome.rejected, true, "o vínculo perdedor tinha de recusar");
  assert.ok(domain(outcome.error, 422, "title_already_paid"), `motivo: ${JSON.stringify(outcome.error)}`);
  // Invariante final: nunca "título pago por outro meio E cheque pendente vinculado".
  assert.equal((await s.titles.get(s.ctx, s.title.id)).status, "paid");
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).titleId, undefined);
});

// ------------------------------------------------------------------ A25 (memória)

test("A25 (memória): vincular cheque roda em UMA unidade (create e PATCH) — contador de uow.run = 1 por vínculo; sem título = 0", async () => {
  const s = await seed(300);
  const { counter, resolve } = countingUow();
  const cheques = chequeServiceWith(resolve);
  await cheques.create(s.ctx, chequeBody(s.account.id, undefined, 50));
  assert.equal(counter.runs, 0, "cheque sem título não abre unidade");
  await cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 300));
  assert.equal(counter.runs, 1, "vincular no create = 1 unidade");
  const other = await s.titles.create(s.ctx, {
    direction: "receivable", party_type: "customer", party_name: "Outro", amount: 50, issue_date: "2026-10-24", due_date: "2026-11-24",
  });
  const loose = await cheques.create(s.ctx, chequeBody(s.account.id, undefined, 50));
  await cheques.update(s.ctx, loose.id, { title_id: other.id });
  assert.equal(counter.runs, 2, "vincular no PATCH = 1 unidade");
});

// ------------------------------------------------------------------ A8

test("A8: /pay logo depois do unlink-title → 201 (o título voltou a ser liquidável por outro meio)", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await assert.rejects(() => s.entries.payTitle(s.ctx, s.title.id, pix(s.account.id)), (e) => domain(e, 422, "title_has_pending_cheque"));
  const result = await s.cheques.unlinkTitle(admin(s.ctx.tenantId), cheque.id, { justification: "cliente pagou por pix no balcão" });
  assert.equal(result.cheque.titleId, undefined);
  const entry = await s.entries.payTitle(s.ctx, s.title.id, pix(s.account.id));
  assert.equal(entry.titleId, s.title.id);
  assert.equal((await s.titles.get(s.ctx, s.title.id)).status, "paid");
});

// ------------------------------------------------------------------ A19 — só o valor exato

test("A19: vincular cheque de 40 a título de saldo 100 → 422 cheque_amount_mismatch (com os dois números); 100 → vincula", async () => {
  const s = await seed(100);
  let caught: unknown;
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 40)), (error) => {
    caught = error;
    return domain(error, 422, "cheque_amount_mismatch");
  });
  assert.deepEqual((caught as { details?: unknown }).details, { chequeAmount: 40, openBalance: 100 });
  const exact = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 100));
  assert.equal(exact.titleId, s.title.id);
});

test("A19: depois de baixa parcial de 60, cheque de 40 vincula e de 100 é recusado; o PATCH que vincula segue a mesma regra", async () => {
  const s = await seed(100);
  await s.entries.payTitle(s.ctx, s.title.id, pix(s.account.id, 60));
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 100)), (e) => domain(e, 422, "overpayment"));
  const loose = await s.cheques.create(s.ctx, chequeBody(s.account.id, undefined, 30));
  await assert.rejects(() => s.cheques.update(s.ctx, loose.id, { title_id: s.title.id }), (e) => domain(e, 422, "cheque_amount_mismatch"));
  assert.equal((await s.cheques.get(s.ctx, loose.id)).titleId, undefined, "o PATCH recusado não vinculou");
  const forty = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 40));
  assert.equal(forty.titleId, s.title.id);
});

test("A19: centavos — cheque de 33.33 casa com saldo 33.33 (roundMoney), não com 33.34", async () => {
  const s = await seed(100);
  await s.entries.payTitle(s.ctx, s.title.id, pix(s.account.id, 66.67));
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 33.34)), (e) => domain(e, 422, "overpayment"));
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 33.32)), (e) => domain(e, 422, "cheque_amount_mismatch"));
  const ok = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, 33.33));
  assert.equal(ok.titleId, s.title.id);
});

// ------------------------------------------------------------------ A21 — o título com cheque pendente não muda o valor nem some

test("A21: PATCH {amount} e DELETE do título com cheque pendente → 422 title_has_pending_cheque; PATCH só de descrição → 200", async () => {
  const s = await seed(100);
  await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await assert.rejects(() => s.titles.update(s.ctx, s.title.id, { amount: 150 }), (e) => domain(e, 422, "title_has_pending_cheque"));
  await assert.rejects(() => s.titles.delete(s.ctx, s.title.id), (e) => domain(e, 422, "title_has_pending_cheque"));
  const described = await s.titles.update(s.ctx, s.title.id, { description: "só texto" });
  assert.equal(described.description, "só texto");
  assert.equal(described.amount, 100);
});

test("A21: sem cheque pendente (sem cheque, ou depois do desvínculo) o título muda o valor e se apaga como hoje", async () => {
  const s = await seed(100);
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.unlinkTitle(admin(s.ctx.tenantId), cheque.id, { justification: "troca para pagamento por pix" });
  const updated = await s.titles.update(s.ctx, s.title.id, { amount: 150 });
  assert.equal(updated.amount, 150);
  const removed = await s.titles.delete(s.ctx, s.title.id);
  assert.equal(removed.deletedAt != null, true);
});

test("A2/A21: cross-tenant — o cheque pendente de OUTRA organização não recusa a baixa nem o PATCH daqui", async () => {
  const s = await seed(100);
  const intruder = actor();
  const accounts = createMemoryFinancialAccountService();
  const foreignAccount = await accounts.create(intruder, { name: `Conta ${randomUUID()}` });
  // cheque estranho apontando (por fixture direta) para o id do título daqui: não é o mesmo tenant.
  await getMemoryChequeRepositoryForTests().create({
    tenantId: intruder.tenantId, accountId: foreignAccount.id, titleId: s.title.id, direction: "received",
    chequeNumber: "X-TENANT", bank: "Banco 12a", amount: 100, currency: "BRL",
  });
  await s.titles.update(s.ctx, s.title.id, { amount: 120 });
  const entry = await s.entries.payTitle(s.ctx, s.title.id, pix(s.account.id, 120));
  assert.equal(entry.titleId, s.title.id);
});
