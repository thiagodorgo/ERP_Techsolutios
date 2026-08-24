import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { getMemoryChequeRepositoryForTests, resetChequeRuntimeForTests } from "../src/modules/cheques/index.js";
import {
  getMemoryFinancialEntryRepositoryForTests,
  resetFinancialEntryRuntimeForTests,
} from "../src/modules/financial-entries/index.js";
import {
  getMemoryFinancialPeriodCloseRepositoryForTests,
  getMemoryFinancialTitleRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import {
  CHEQUE_REPO_KIND,
  ENTRY_REPO_KIND,
  TITLE_REPO_KIND,
  createMemoryFinancialUnitOfWork,
  resetFinancialUowRuntimeForTests,
  type FinancialUowContext,
  type UowMemberKind,
} from "../src/modules/financial-uow/index.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 3 · C3 (P7) — A CLASSIFICAÇÃO JULGADA POR EXECUÇÃO.
//
// O ataque do ciclo 2, medido pela junta: transformar dois mutadores journaled em DELEGAÇÃO PURA
// (inclusive `restorePaymentGuarded`) deixava a suíte **203/203 VERDE**. O journal do runner de
// memória prometia rollback e não tinha quem o cobrasse; a única "verificação" era o comentário
// dizendo que a lista se conferia lendo o arquivo.
//
// Este harness cobra. O mecanismo é UM SÓ para os dois kinds, e é o próprio contrato da unidade:
//
//   invoca o membro DENTRO de uma unidade que ABORTA depois
//     -> `write` journaled : o rollback devolve a before-image  -> estado IDÊNTICO -> verde
//     -> `write` sem journal: a mutação sobrevive ao aborto      -> estado DIFERENTE -> VERMELHO
//     -> `read` de verdade : nada mudou para desfazer            -> estado IDÊNTICO -> verde
//     -> `read` que MUTA   : ninguém journalou, a mutação fica   -> estado DIFERENTE -> VERMELHO
//
// O estado é o snapshot dos TRÊS repositórios (`snapshotTenantForUow`, que os três expõem).
//
// EXAUSTIVIDADE HERDADA DO COMPILADOR: o harness itera OS MAPAS de `src/`, não uma lista própria.
// Membro novo entra pelo `satisfies` (TS1360 se faltar) e, chegando aqui sem fixture, o caso
// FALHA — fail-closed em runtime. Um harness com lista própria seria a terceira lista manual do
// bloco, e listas manuais que precisam concordar são o defeito que este ciclo existe para fechar.
// -----------------------------------------------------------------------------------------------

const TENANT = "00000000-0000-4000-8000-0000000000c3";
const OUTRO_TENANT = "00000000-0000-4000-8000-0000000000c4";
const ATOR = "00000000-0000-4000-8000-0000000000ab";

/** Sinal de aborto da unidade: erro próprio, para não confundir com falha real do membro. */
class AbortUnitOfWork extends Error {
  constructor() {
    super("aborto deliberado do harness P7");
  }
}

type Seed = { readonly titleId: string; readonly entryId: string; readonly chequeId: string; readonly accountId: string };

function repos() {
  return {
    titles: getMemoryFinancialTitleRepositoryForTests(),
    entries: getMemoryFinancialEntryRepositoryForTests(),
    cheques: getMemoryChequeRepositoryForTests(),
    periodCloses: getMemoryFinancialPeriodCloseRepositoryForTests(),
  };
}

function resetAll(): void {
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
  resetFinancialUowRuntimeForTests();
}

/** O estado observável do tenant nos TRÊS repositórios — a grandeza que o aborto tem de preservar. */
function snapshotAll(tenantId: string): string {
  const { titles, entries, cheques } = repos();
  const stable = (rows: readonly { id: string }[]) =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id)).map((row) => JSON.parse(JSON.stringify(row)));
  return JSON.stringify({
    titles: stable(titles.snapshotTenantForUow(tenantId)),
    entries: stable(entries.snapshotTenantForUow(tenantId)),
    cheques: stable(cheques.snapshotTenantForUow(tenantId)),
  });
}

/** Fixture comum: uma linha viva em cada repositório, para os membros terem em que mexer. */
async function seed(): Promise<Seed> {
  const { titles, entries, cheques } = repos();
  const accountId = randomUUID();
  const title = await titles.create({
    tenantId: TENANT,
    direction: "receivable",
    partyType: "customer",
    partyName: "Cliente P7",
    amount: 500,
    currency: "BRL",
    issueDate: new Date("2026-08-01T12:00:00.000Z"),
    dueDate: new Date("2026-09-01T12:00:00.000Z"),
    status: "open",
    competencia: "2026-08",
    accountId,
    createdBy: ATOR,
    updatedBy: ATOR,
  });
  const entry = await entries.create({
    tenantId: TENANT,
    accountId,
    direction: "in",
    amount: 100,
    currency: "BRL",
    paymentMethod: "pix",
    occurredAt: new Date("2026-08-02T12:00:00.000Z"),
    competencia: "2026-08",
    createdBy: ATOR,
    updatedBy: ATOR,
  });
  const cheque = await cheques.create({
    tenantId: TENANT,
    accountId,
    direction: "received",
    chequeNumber: "000P7",
    bank: "Banco P7",
    amount: 300,
    currency: "BRL",
    createdBy: ATOR,
    updatedBy: ATOR,
  });
  return { titleId: title.id, entryId: entry.id, chequeId: cheque.id, accountId };
}

type Invoke = (ctx: FinancialUowContext, s: Seed) => Promise<unknown>;

/**
 * PRÉ-CONDIÇÃO FORA DA UNIDADE — e este detalhe é a diferença entre o harness provar algo e se
 * enganar. Alguns membros só são invocáveis a partir de um estado (não se estorna pagamento que não
 * foi feito; não se vincula lançamento a cheque que não compensou). Construir esse estado DENTRO da
 * unidade, com outro membro journaled, MASCARA o membro sob teste: o journal já guardou a
 * before-image daquela linha por causa do irmão, e o rollback a devolve mesmo que o membro sob teste
 * não journale nada. O drill D19a pegou exatamente isso na primeira versão deste arquivo.
 *
 * Por isso a pré-condição roda no repositório BASE, ANTES do snapshot: dentro da unidade, cada
 * membro é o ÚNICO a tocar a linha dele.
 */
const PREPARES: Record<string, (s: Seed) => Promise<void>> = {
  "titles.restorePaymentGuarded": async (s) => {
    await repos().titles.applyPaymentGuarded({ tenantId: TENANT, financialTitleId: s.titleId, amount: 100 });
  },
  "cheques.attachClearingEntry": async (s) => {
    const { cheques } = repos();
    await cheques.transition({ tenantId: TENANT, chequeId: s.chequeId, fromStatus: "registered", toStatus: "deposited" });
    await cheques.transition({ tenantId: TENANT, chequeId: s.chequeId, fromStatus: "deposited", toStatus: "cleared" });
  },
  "cheques.attachBounceEntry": async (s) => {
    const { cheques } = repos();
    await cheques.transition({ tenantId: TENANT, chequeId: s.chequeId, fromStatus: "registered", toStatus: "deposited" });
    await cheques.transition({ tenantId: TENANT, chequeId: s.chequeId, fromStatus: "deposited", toStatus: "bounced" });
  },
};

// ------------------------------------------------------------------ tabelas de invocação

const TITLE_CALLS: Record<string, Invoke> = {
  create: (ctx) =>
    ctx.titles.create({
      tenantId: TENANT,
      direction: "payable",
      partyType: "supplier",
      partyName: "Fornecedor P7",
      amount: 10,
      currency: "BRL",
      issueDate: new Date("2026-08-03T12:00:00.000Z"),
      dueDate: new Date("2026-09-03T12:00:00.000Z"),
      status: "open",
      competencia: "2026-08",
    }),
  update: (ctx, s) => ctx.titles.update({ tenantId: TENANT, financialTitleId: s.titleId, description: "mexido pelo P7" }),
  changeStatus: (ctx, s) => ctx.titles.changeStatus({ tenantId: TENANT, financialTitleId: s.titleId, status: "cancelled" }),
  applyPayment: (ctx, s) =>
    ctx.titles.applyPayment({ tenantId: TENANT, financialTitleId: s.titleId, paidAmount: 50, status: "partially_paid" }),
  applyPaymentGuarded: (ctx, s) => ctx.titles.applyPaymentGuarded({ tenantId: TENANT, financialTitleId: s.titleId, amount: 50 }),
  // O membro do ATAQUE do ciclo 2: era ele que virava delegação pura sem ninguém notar. O pagamento
  // que ele estorna é preparado FORA da unidade (ver PREPARES) — dentro dela, este membro é o único
  // a tocar o título, senão o journal do irmão o mascararia.
  restorePaymentGuarded: (ctx, s) => ctx.titles.restorePaymentGuarded({ tenantId: TENANT, financialTitleId: s.titleId, amount: 25 }),
  softDelete: (ctx, s) => ctx.titles.softDelete(TENANT, s.titleId, ATOR),
  list: (ctx) => ctx.titles.list({ tenantId: TENANT, includeDeleted: true, limit: 100, offset: 0 }),
  findById: (ctx, s) => ctx.titles.findById(TENANT, s.titleId),
  findActiveByWorkOrder: (ctx) => ctx.titles.findActiveByWorkOrder(TENANT, randomUUID(), "receivable"),
  findActiveBySource: (ctx) => ctx.titles.findActiveBySource(TENANT, "fuel", randomUUID(), "payable"),
  findByIdForUpdate: (ctx, s) => ctx.titles.findByIdForUpdate(TENANT, s.titleId),
};

const ENTRY_CALLS: Record<string, Invoke> = {
  create: (ctx, s) =>
    ctx.entries.create({
      tenantId: TENANT,
      accountId: s.accountId,
      direction: "out",
      amount: 7,
      currency: "BRL",
      paymentMethod: "pix",
      occurredAt: new Date("2026-08-04T12:00:00.000Z"),
      competencia: "2026-08",
    }),
  update: (ctx, s) => ctx.entries.update({ tenantId: TENANT, financialEntryId: s.entryId, description: "mexido pelo P7" }),
  reconcile: (ctx, s) =>
    ctx.entries.reconcile({
      tenantId: TENANT,
      financialEntryId: s.entryId,
      reconciled: true,
      divergenceType: null,
      reconciliationRef: "P7",
      reconciledAt: new Date("2026-08-05T12:00:00.000Z"),
      reconciledBy: ATOR,
    }),
  softDelete: (ctx, s) => ctx.entries.softDelete(TENANT, s.entryId, ATOR),
  list: (ctx) => ctx.entries.list({ tenantId: TENANT, includeDeleted: true, limit: 100, offset: 0 }),
  findById: (ctx, s) => ctx.entries.findById(TENANT, s.entryId),
  findActiveReversalOf: (ctx, s) => ctx.entries.findActiveReversalOf(TENANT, s.entryId),
  findByIdForUpdate: (ctx, s) => ctx.entries.findByIdForUpdate(TENANT, s.entryId),
  sumByAccount: (ctx, s) => ctx.entries.sumByAccount(TENANT, s.accountId),
};

const CHEQUE_CALLS: Record<string, Invoke> = {
  create: (ctx, s) =>
    ctx.cheques.create({
      tenantId: TENANT,
      accountId: s.accountId,
      direction: "issued",
      chequeNumber: "000P7B",
      bank: "Banco P7",
      amount: 20,
      currency: "BRL",
    }),
  update: (ctx, s) => ctx.cheques.update({ tenantId: TENANT, chequeId: s.chequeId, notes: "mexido pelo P7" }),
  transition: (ctx, s) =>
    ctx.cheques.transition({ tenantId: TENANT, chequeId: s.chequeId, fromStatus: "registered", toStatus: "deposited" }),
  softDelete: (ctx, s) => ctx.cheques.softDelete(TENANT, s.chequeId, ATOR),
  // Cheque já em 'cleared'/'bounced' pela PREPARES, fora da unidade: aqui o attach é o único a mexer.
  attachClearingEntry: (ctx, s) => ctx.cheques.attachClearingEntry(TENANT, s.chequeId, s.entryId, ATOR),
  attachBounceEntry: (ctx, s) => ctx.cheques.attachBounceEntry(TENANT, s.chequeId, s.entryId, ATOR),
  list: (ctx) => ctx.cheques.list({ tenantId: TENANT, includeDeleted: true, limit: 100, offset: 0 }),
  findById: (ctx, s) => ctx.cheques.findById(TENANT, s.chequeId),
  findActiveByLinkedEntry: (ctx, s) => ctx.cheques.findActiveByLinkedEntry(TENANT, s.entryId),
};

// ------------------------------------------------------------------ o harness

const REPOSITORIES = [
  { nome: "titles", kinds: TITLE_REPO_KIND as Record<string, UowMemberKind>, calls: TITLE_CALLS },
  { nome: "entries", kinds: ENTRY_REPO_KIND as Record<string, UowMemberKind>, calls: ENTRY_CALLS },
  { nome: "cheques", kinds: CHEQUE_REPO_KIND as Record<string, UowMemberKind>, calls: CHEQUE_CALLS },
] as const;

let exercidos = 0;
let testReset = 0;

for (const repositorio of REPOSITORIES) {
  for (const [membro, kind] of Object.entries(repositorio.kinds)) {
    if (kind === "test_reset") {
      testReset += 1;
      test(`[P7][${repositorio.nome}.${membro}] classificado test_reset: o contexto journaled NÃO o expõe`, async () => {
        resetAll();
        await seed();
        const uow = createMemoryFinancialUnitOfWork(repos());
        await uow.run(TENANT, async (ctx) => {
          const alvo = ctx[repositorio.nome] as unknown as Record<string, unknown>;
          assert.equal(
            alvo[membro],
            undefined,
            `${repositorio.nome}.${membro} é test-only e NÃO pode chegar ao contexto da unidade — ` +
              "expor um reset dentro de uma transação dá a qualquer chamador o poder de apagar o tenant sem journal.",
          );
        });
      });
      continue;
    }

    exercidos += 1;
    test(`[P7][${repositorio.nome}.${membro}] classificado ${kind}: unidade abortada devolve o estado IDÊNTICO`, async () => {
      const invoke = repositorio.calls[membro];
      assert.ok(
        invoke,
        `${repositorio.nome}.${membro} está classificado em src/ e não tem fixture de invocação aqui. ` +
          "Membro novo entra pelo compilador E ganha o caso que o exercita — silenciar aqui é o ataque do ciclo 2.",
      );

      resetAll();
      const s = await seed();
      // Pré-condição FORA da unidade e ANTES do snapshot — senão o journal do membro que a constrói
      // mascara o membro sob teste (o D19a pegou isso na primeira versão deste harness).
      await PREPARES[`${repositorio.nome}.${membro}`]?.(s);
      const antes = snapshotAll(TENANT);
      const uow = createMemoryFinancialUnitOfWork(repos());

      await assert.rejects(
        () =>
          uow.run(TENANT, async (ctx) => {
            await invoke(ctx, s);
            // O ABORTO: tudo que a unidade escreveu tem de desaparecer.
            throw new AbortUnitOfWork();
          }),
        (error: unknown) => error instanceof AbortUnitOfWork,
        `${repositorio.nome}.${membro}: o aborto do harness tem de sair pela unidade`,
      );

      const depois = snapshotAll(TENANT);
      assert.equal(
        depois,
        antes,
        kind === "write"
          ? `${repositorio.nome}.${membro} está classificado WRITE e o aborto NÃO desfez o que ele escreveu. ` +
              "Ou o delegador virou delegação pura (sem `remember`), ou a before-image é gravada DEPOIS da mutação. " +
              "É exatamente o ataque que a junta do ciclo 2 fez ficar 203/203 verde."
          : `${repositorio.nome}.${membro} está classificado READ e MUTOU estado. ` +
              "Leitura não muda nada; se ela muda, ou a classificação está errada, ou o membro está.",
      );
    });
  }
}

test("[P7] a cobertura do harness é a contagem MEDIDA dos contratos: 30 membros write/read + 3 test_reset", () => {
  assert.equal(exercidos, 30, `o harness exerceu ${exercidos} membros write/read (medido nos contratos: 12+9+9 = 30)`);
  assert.equal(testReset, 3, `o harness asseverou ${testReset} membros test_reset ausentes do contexto (esperado 3)`);
});

test("[P7] o rollback é ESCOPADO: escrita de OUTRO tenant durante a unidade sobrevive ao aborto", () => {
  // Contraprova do harness: se o rollback voltasse o mundo inteiro, todo caso acima daria verde por
  // um motivo errado (destruição total também produz "estado idêntico" para o tenant medido).
  // Aqui o snapshot medido é o do OUTRO tenant, e ele tem de PERMANECER escrito.
  return (async () => {
    resetAll();
    const s = await seed();
    const uow = createMemoryFinancialUnitOfWork(repos());
    const { titles } = repos();

    await assert.rejects(
      () =>
        uow.run(TENANT, async (ctx) => {
          await ctx.titles.update({ tenantId: TENANT, financialTitleId: s.titleId, description: "some no aborto" });
          // Escrita DIRETA no repositório, de outro tenant, no meio da unidade em voo.
          await titles.create({
            tenantId: OUTRO_TENANT,
            direction: "receivable",
            partyType: "customer",
            partyName: "Vizinho",
            amount: 1,
            currency: "BRL",
            issueDate: new Date("2026-08-06T12:00:00.000Z"),
            dueDate: new Date("2026-09-06T12:00:00.000Z"),
            status: "open",
            competencia: "2026-08",
          });
          throw new AbortUnitOfWork();
        }),
      (error: unknown) => error instanceof AbortUnitOfWork,
    );

    assert.equal(
      titles.snapshotTenantForUow(OUTRO_TENANT).length,
      1,
      "o rollback é escopado ao tenant da unidade — linha de outro tenant não pode ser destruída por ele",
    );
    assert.equal(
      (await titles.findById(TENANT, s.titleId))?.description,
      undefined,
      "e o que a unidade escreveu no PRÓPRIO tenant continua sendo desfeito",
    );
  })();
});
