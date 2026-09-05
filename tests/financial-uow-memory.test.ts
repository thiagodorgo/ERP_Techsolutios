import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  getMemoryChequeRepositoryForTests,
  resetChequeRuntimeForTests,
} from "../src/modules/cheques/cheque.service.js";
import {
  getMemoryFinancialEntryRepositoryForTests,
  resetFinancialEntryRuntimeForTests,
} from "../src/modules/financial-entries/financial-entry.service.js";
import { periodClosedError } from "../src/modules/financial-titles/financial-title.repository.js";
import {
  getMemoryFinancialPeriodCloseRepositoryForTests,
  getMemoryFinancialTitleRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/financial-title.service.js";
import { createMemoryFinancialUnitOfWork } from "../src/modules/financial-uow/financial-uow.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 (F1) — o RUNNER DE MEMÓRIA da porta de Unit of Work é um DUBLÊ HONESTO: mutex por tenant
// + undo-log por snapshot tenant-escopado. Ele NÃO é evidência de atomicidade (a prova real das
// garantias é a suíte -db contra Postgres, duas conexões e barreira) — mas infraestrutura sem teste
// nenhum é dívida: este arquivo prova que o dublê FAZ o que o contrato da porta promete (desfazer
// no erro, serializar por tenant, re-checar período), para os fluxos de memória (F3+) confiarem nele.
// -----------------------------------------------------------------------------------------------

function freshUow() {
  resetFinancialTitleRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetChequeRuntimeForTests();
  const titles = getMemoryFinancialTitleRepositoryForTests();
  const entries = getMemoryFinancialEntryRepositoryForTests();
  const cheques = getMemoryChequeRepositoryForTests();
  const periodCloses = getMemoryFinancialPeriodCloseRepositoryForTests();
  return { uow: createMemoryFinancialUnitOfWork({ titles, entries, cheques, periodCloses }), titles, entries, cheques, periodCloses };
}

function titleInput(tenantId: string) {
  const now = new Date();
  return {
    tenantId,
    direction: "receivable",
    partyType: "customer",
    partyName: "Cliente UoW",
    amount: 100,
    currency: "BRL",
    issueDate: now,
    dueDate: now,
    status: "open",
    competencia: "2026-01",
  };
}

test("undo-log: work que lança DEPOIS de escrever desfaz a escrita (título e lançamento)", async () => {
  const { uow, titles, entries } = freshUow();
  const tenantId = randomUUID();

  // Linha pré-existente: o undo NÃO pode apagá-la (restaura o estado anterior, não "zera o tenant").
  const preExisting = await titles.create(titleInput(tenantId));

  await assert.rejects(
    uow.run(tenantId, async (ctx) => {
      await ctx.titles.create(titleInput(tenantId));
      await ctx.entries.create({
        tenantId,
        accountId: randomUUID(),
        direction: "in",
        amount: 40,
        currency: "BRL",
        paymentMethod: "pix",
        occurredAt: new Date(),
        competencia: "2026-01",
      });
      throw new Error("falha no meio da unidade");
    }),
    /falha no meio da unidade/,
  );

  const survivingTitles = await titles.list({ tenantId, includeDeleted: true, limit: 50, offset: 0 });
  assert.equal(survivingTitles.total, 1, "o título criado dentro da unidade que falhou não pode sobreviver");
  assert.equal(survivingTitles.items[0].id, preExisting.id, "a linha pré-existente sobrevive intacta");
  const survivingEntries = await entries.list({ tenantId, includeDeleted: true, limit: 50, offset: 0 });
  assert.equal(survivingEntries.total, 0, "o lançamento criado dentro da unidade que falhou não pode sobreviver");
});

// B-O6R-02 F5 — o undo-log cobre também o CHEQUE (a unidade do clear/bounce muda status do cheque +
// cria lançamento; a falha tem de devolver o cheque ao estado anterior, como o rollback do Postgres faz).
test("undo-log do cheque: work que lança depois da transição devolve o cheque ao estado anterior", async () => {
  const { uow, cheques } = freshUow();
  const tenantId = randomUUID();
  const cheque = await cheques.create({
    tenantId,
    accountId: randomUUID(),
    direction: "received",
    chequeNumber: "000777",
    bank: "Banco UoW",
    amount: 50,
    currency: "BRL",
  });
  const deposited = await cheques.transition({ tenantId, chequeId: cheque.id, fromStatus: "registered", toStatus: "deposited" });
  assert.equal(deposited?.status, "deposited");

  await assert.rejects(
    uow.run(tenantId, async (ctx) => {
      const reserved = await ctx.cheques.transition({ tenantId, chequeId: cheque.id, fromStatus: "deposited", toStatus: "cleared" });
      assert.equal(reserved?.status, "cleared");
      throw new Error("falha depois da transição");
    }),
    /falha depois da transição/,
  );

  assert.equal((await cheques.findById(tenantId, cheque.id))?.status, "deposited", "o cheque volta ao estado anterior");
});

// M1 (ciclo 2 · C4) — O TESTE DISCRIMINANTE do journal. Achado menor da J-B-O6R-02-ciclo1: o
// rollback restaurava o SNAPSHOT DO TENANT INTEIRO, então escrita commitada FORA da unidade,
// enquanto ela estava em voo, era DESTRUÍDA — e o comentário na fonte afirmava que o mutex "faz as
// vezes da trava", o que para este caso é falso (o mutex serializa unidades, não impede escrita
// direta no repositório). Só memória, mas o job `backend` roda em memória.
//
// Este caso é o que separa "desfaz o que a unidade escreveu" de "volta o tenant no tempo": ele fica
// VERMELHO com snapshot-restore integral (drill D13) e verde com o journal.
test("[M1] rollback desfaz SÓ o que a unidade escreveu: linha criada FORA dela, durante o voo, sobrevive", async () => {
  const { uow, titles, entries } = freshUow();
  const tenantId = randomUUID();
  const preExisting = await titles.create(titleInput(tenantId));

  let forasteiroId = "";
  await assert.rejects(
    uow.run(tenantId, async (ctx) => {
      // A unidade escreve o SEU título...
      const dentro = await ctx.titles.create(titleInput(tenantId));
      assert.ok(dentro.id);

      // ...e, no meio do voo, alguém commita direto no repositório (fora da unidade). É o que as
      // próprias suítes fazem ao preparar fixture, e o que o snapshot integral apagava.
      const forasteiro = await titles.create(titleInput(tenantId));
      forasteiroId = forasteiro.id;
      const outroLancamento = await entries.create({
        tenantId,
        accountId: randomUUID(),
        direction: "in",
        amount: 12,
        currency: "BRL",
        paymentMethod: "pix",
        occurredAt: new Date(),
        competencia: "2026-01",
      });
      assert.ok(outroLancamento.id);

      throw new Error("falha depois da escrita alheia");
    }),
    /falha depois da escrita alheia/,
  );

  const sobreviventes = await titles.list({ tenantId, includeDeleted: true, limit: 50, offset: 0 });
  const ids = sobreviventes.items.map((item) => item.id).sort();
  assert.deepEqual(
    ids,
    [preExisting.id, forasteiroId].sort(),
    "sobrevivem a linha pré-existente E a escrita alheia; morre SÓ o que a unidade criou",
  );
  assert.equal(
    (await entries.list({ tenantId, includeDeleted: true, limit: 50, offset: 0 })).total,
    1,
    "o lançamento escrito fora da unidade também sobrevive ao rollback dela",
  );
});

test("[M1] rollback devolve a before-image de linha PRÉ-EXISTENTE que a unidade mutou", async () => {
  const { uow, titles } = freshUow();
  const tenantId = randomUUID();
  const alvo = await titles.create(titleInput(tenantId));

  await assert.rejects(
    uow.run(tenantId, async (ctx) => {
      const pago = await ctx.titles.applyPaymentGuarded({ tenantId, financialTitleId: alvo.id, amount: 30 });
      assert.ok(pago, "o CAS tem de casar dentro da unidade");
      assert.equal(pago.paidAmount, 30);
      throw new Error("falha depois de mutar linha pré-existente");
    }),
    /falha depois de mutar linha pré-existente/,
  );

  const depois = await titles.findById(tenantId, alvo.id);
  assert.equal(depois?.paidAmount, 0, "a mutação da unidade desfaz — o journal guarda a before-image");
  assert.equal(depois?.status, "open");
});

test("undo-log é tenant-escopado: falha do tenant A não toca as linhas do tenant B", async () => {
  const { uow, titles } = freshUow();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const ofB = await titles.create(titleInput(tenantB));

  await assert.rejects(
    uow.run(tenantA, async (ctx) => {
      await ctx.titles.create(titleInput(tenantA));
      throw new Error("boom");
    }),
    /boom/,
  );

  assert.equal((await titles.list({ tenantId: tenantA, includeDeleted: true, limit: 10, offset: 0 })).total, 0);
  const remainingB = await titles.list({ tenantId: tenantB, includeDeleted: true, limit: 10, offset: 0 });
  assert.equal(remainingB.total, 1);
  assert.equal(remainingB.items[0].id, ofB.id);
});

test("mutex por tenant: duas unidades do MESMO tenant não se entrelaçam; tenants distintos não se bloqueiam", async () => {
  const { uow } = freshUow();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const timeline: string[] = [];

  let releaseFirst!: () => void;
  const firstMayFinish = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = uow.run(tenantA, async () => {
    timeline.push("A1:in");
    await firstMayFinish; // segura a unidade ABERTA — a segunda do MESMO tenant tem de esperar aqui.
    timeline.push("A1:out");
  });
  const second = uow.run(tenantA, async () => {
    timeline.push("A2:in");
  });
  // Tenant B NÃO espera o mutex do tenant A.
  await uow.run(tenantB, async () => {
    timeline.push("B1:in");
  });

  assert.deepEqual(timeline, ["A1:in", "B1:in"], "A2 não pode entrar enquanto A1 está aberta; B1 entra livre");
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(timeline, ["A1:in", "B1:in", "A1:out", "A2:in"], "A2 só entra depois de A1 fechar");
});

test("mutex sobrevive a unidade que FALHA: a próxima do mesmo tenant roda normalmente", async () => {
  const { uow, titles } = freshUow();
  const tenantId = randomUUID();

  await assert.rejects(
    uow.run(tenantId, async () => {
      throw new Error("primeira falha");
    }),
    /primeira falha/,
  );

  const created = await uow.run(tenantId, (ctx) => ctx.titles.create(titleInput(tenantId)));
  assert.equal((await titles.findById(tenantId, created.id))?.id, created.id, "a fila do tenant não fica presa após falha");
});

test("assertPeriodOpenShared: período fechado lança o erro da fábrica e a unidade desfaz", async () => {
  const { uow, titles, periodCloses } = freshUow();
  const tenantId = randomUUID();
  periodCloses.setPeriodStatus(tenantId, "2026-01", "closed");

  await assert.rejects(
    uow.run(tenantId, async (ctx) => {
      await ctx.titles.create(titleInput(tenantId));
      // Re-check DENTRO da unidade (DIN-008 em dublê): fechado → lança → o create acima desfaz.
      await ctx.assertPeriodOpenShared("2026-01", periodClosedError);
    }),
    (error: unknown) =>
      typeof error === "object" && error !== null && (error as { reason?: string }).reason === "period_closed",
  );

  assert.equal(
    (await titles.list({ tenantId, includeDeleted: true, limit: 10, offset: 0 })).total,
    0,
    "nada da unidade que bateu no período fechado pode sobreviver",
  );

  periodCloses.setPeriodStatus(tenantId, "2026-01", "reopened");
  await uow.run(tenantId, (ctx) => ctx.assertPeriodOpenShared("2026-01", periodClosedError));
});
