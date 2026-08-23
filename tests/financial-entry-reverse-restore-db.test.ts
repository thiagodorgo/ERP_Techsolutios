import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  expectAllFulfilled,
  expectRejected,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;
// Nome único desta suíte (um processo por arquivo no `node --test`) — escopo da barreira.
const applicationName = buildApplicationName("reverse-restore");

// -----------------------------------------------------------------------------------------------
// B-O6R-02 F4 (Ω6R-DIN-002 / QUA-003) — o ESTORNO devolve o pagamento, sob Postgres REAL, duas
// conexões e barreira determinística (fila de lock observada em pg_stat_activity, nunca sleep cego).
//
// O defeito medido: o estorno criava a contrapartida e NÃO devolvia paid_amount nem o status — o
// caixa dizia "dinheiro devolvido" e o título continuava pago (duas verdades incompatíveis).
// A cura (F4), numa ÚNICA transação: trava SHARED de período → SELECT ... FOR UPDATE do lançamento
// ORIGINAL → re-check de reversão ativa → contrapartida (SEM title_id) → restorePaymentGuarded no
// título (paid_amount decrementa; status recalcula: = 0 → open, parcial → partially_paid).
//
//   · G3  — estorno de liquidação TOTAL: contrapartida + devolução + reabertura, atômico.
//   · G3b — estorno de liquidação PARCIAL → partially_paid com o paid_amount decrementado.
//   · G4  — dupla reversão com barreira: o vencedor (peças do produto em conexão crua) segura a tx
//     com o FOR UPDATE do original; o perdedor REAL bloqueia nesse row lock; ao commitar, o re-check
//     DENTRO da tx o mata com 409 already_reversed — exatamente 1 contrapartida, decremento ÚNICO.
//     (O índice parcial financial_entries_reversal_of_active_key é BACKSTOP: se o FOR UPDATE/re-check
//     sumirem — drill D2b — quem acusa é o índice, com 409 de OUTRA razão, e a asserção de razão
//     deste teste fica vermelha.)
//
// A LIÇÃO DO #357: a suíte FIXA CORE_SAAS_PERSISTENCE=prisma ela mesma, ANTES de importar a
// aplicação, e o bootstrap ASSERTA o modo (drill D7: remover a fixação = vermelho no assert).
//
// A LIÇÃO DO CICLO 1 (B-5, ciclo 2 · C3): esta era a suíte que derrubava o lote na forma do job, com
// `unhandledRejection` no G4 — a promessa do perdedor podia liquidar ANTES de o teste anexar o
// handler. Agora o handler é anexado NA CRIAÇÃO (`captureSettled`), e a barreira só aceita statement
// bloqueado das conexões DESTA suíte (`application_name` carimbado na DATABASE_URL, abaixo).
//
// Disciplina: tenant descartável por teste, asserções ESCOPADAS aos ids do próprio teste, teardown
// escopado em ordem de FK — nenhuma sentença sobre a base inteira.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Estorno com devolução sob Postgres exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação. Drill D7 remove ESTA linha → o assert de modo reprova.
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  // Mesmo ponto, mesma razão: a tag da suíte tem de estar na URL ANTES de `src/database/prisma.ts`
  // ser importado (ele lê process.env.DATABASE_URL no import). Um processo por arquivo → tag por suíte.
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("G3 — estorno de liquidação TOTAL: contrapartida sem title_id + paid_amount devolvido + título REABERTO, atômico", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g3", 250);
      const { tenantId, accountId, titleId } = seed;

      const payment = await h.entryService.payTitle(seed.actor, titleId, {
        account_id: accountId,
        amount: 250,
        payment_method: "pix",
      });
      const paidTitle = await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } });
      assert.equal(paidTitle?.status, "paid");

      const contra = await h.entryService.reverse(seed.actor, payment.id);
      assert.equal(contra.reversalOf, payment.id);
      assert.equal(contra.direction, "out");
      assert.equal(contra.titleId, undefined, "a contrapartida nasce SEM title_id (não duplica a contagem da liquidação)");

      const contraRow = await client.financialEntry.findFirst({ where: { tenant_id: tenantId, id: contra.id } });
      assert.ok(contraRow);
      assert.equal(contraRow.title_id, null);
      assert.equal(contraRow.reversal_of, payment.id);

      const restored = await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } });
      assert.ok(restored);
      assert.equal(Number(restored.paid_amount), 0, "o pagamento devolvido tem de sair do título");
      assert.equal(restored.status, "open", "título totalmente devolvido REABRE");
      // Só a liquidação original conta contra o título.
      assert.equal(await client.financialEntry.count({ where: { tenant_id: tenantId, title_id: titleId } }), 1);
    } finally {
      await teardown(h);
    }
  });

  test("G12 (histórico G3b) — estornar a última parcela deixa a primeira e status partially_paid", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g3b", 100);
      const { tenantId, accountId, titleId } = seed;

      await h.entryService.payTitle(seed.actor, titleId, { account_id: accountId, amount: 40, payment_method: "pix" });
      const second = await h.entryService.payTitle(seed.actor, titleId, { account_id: accountId, amount: 60, payment_method: "pix" });
      assert.equal(
        (await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } }))?.status,
        "paid",
      );

      await h.entryService.reverse(seed.actor, second.id);
      const partial = await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } });
      assert.ok(partial);
      assert.equal(Number(partial.paid_amount), 40, "só o pagamento estornado sai do título");
      assert.equal(partial.status, "partially_paid");
    } finally {
      await teardown(h);
    }
  });

  test("G4 — dupla reversão com barreira: perdedor bloqueia no FOR UPDATE do original e sai 409 already_reversed; exatamente 1 contrapartida, decremento ÚNICO", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g4", 100);
      const { tenantId, accountId, titleId, userId } = seed;

      const payment = await h.entryService.payTitle(seed.actor, titleId, {
        account_id: accountId,
        amount: 100,
        payment_method: "pix",
      });

      const occurredAt = new Date();
      const period = h.deriveCompetencia(occurredAt);

      // VENCEDOR emulado por conexão crua com as PEÇAS DO PRODUTO na ORDEM DO PRODUTO: advisory
      // shared → FOR UPDATE do original → re-check → contrapartida → restore guardado. A transação
      // fica ABERTA — o row lock do original é o que o reverse real do perdedor vai encontrar.
      let releaseWinner!: () => void;
      const winnerMayCommit = new Promise<void>((resolve) => {
        releaseWinner = resolve;
      });
      let signalWinnerReady!: () => void;
      const winnerReady = new Promise<void>((resolve) => {
        signalWinnerReady = resolve;
      });
      const winnerTx = client.$transaction(
        async (tx) => {
          await h.setTenantRlsContext(tx, tenantId);
          await h.acquirePeriodLockShared(tx, tenantId, period);
          const entryRepo = new h.PrismaFinancialEntryRepository(tx);
          const locked = await entryRepo.findByIdForUpdate(tenantId, payment.id);
          assert.ok(locked, "o vencedor trava o lançamento original");
          assert.equal(await entryRepo.findActiveReversalOf(tenantId, payment.id), undefined);
          await entryRepo.create({
            tenantId,
            accountId,
            direction: "out",
            amount: 100,
            currency: "BRL",
            paymentMethod: "pix",
            occurredAt,
            competencia: period,
            description: `Estorno de ${payment.id}`,
            reversalOf: payment.id,
            createdBy: userId,
            updatedBy: userId,
          });
          const restored = await new h.PrismaFinancialTitleRepository(tx).restorePaymentGuarded({
            tenantId,
            financialTitleId: titleId,
            amount: 100,
            updatedBy: userId,
          });
          assert.ok(restored, "o restore guardado do vencedor tem de casar 1 linha");
          assert.equal(restored.paidAmount, 0);
          assert.equal(restored.status, "open");
          signalWinnerReady();
          await winnerMayCommit;
        },
        { timeout: 30000, maxWait: 10000 },
      );
      // CAPTURA-LIQUIDADA (C3.1): handler anexado AGORA, no mesmo tique da criação — a promessa é
      // segurada através de vários `await`s abaixo, e sem isto uma rejeição no meio do caminho vira
      // `unhandledRejection` e derruba o PROCESSO inteiro do lote.
      const winnerOutcome = captureSettled(winnerTx);
      await winnerReady;

      // PERDEDOR REAL — o reverse do produto. O pré-check de reversão ativa MISSA (a contrapartida do
      // vencedor está uncommitted → invisível) e ele BLOQUEIA no FOR UPDATE do original, dentro da tx.
      let loserSettled = false;
      const loserOutcome = captureSettled(h.entryService.reverse(seed.actor, payment.id)).then((outcome) => {
        loserSettled = true;
        return outcome;
      });
      await waitForOwnBlockedStatement(client, {
        applicationName,
        fragment: "financial_entries",
        label: "perdedor bloqueado no FOR UPDATE do original",
      });
      assert.equal(loserSettled, false, "o perdedor TEM de estar bloqueado no row lock do original");

      releaseWinner();
      expectAllFulfilled([await winnerOutcome], "transação do vencedor");

      // Ao destravar, o re-check DENTRO da transação vê a contrapartida commitada → 409 already_reversed.
      // (Razão EXATA importa: se o FOR UPDATE/re-check sumirem — drill D2b — quem mata é o ÍNDICE
      // parcial, com outra razão, e esta asserção fica vermelha.)
      assert.equal(
        isDomainError(expectRejected(await loserOutcome, "perdedor do estorno duplo"), 409, "already_reversed"),
        true,
        "o perdedor tem de morrer com 409 already_reversed — a razão exata é o que distingue o re-check do backstop do índice",
      );

      // Exatamente 1 contrapartida ativa; decremento ÚNICO (paid_amount 0, nunca negativo/duplo).
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: tenantId, reversal_of: payment.id, deleted_at: null } }),
        1,
        "exatamente UMA contrapartida ativa do original",
      );
      const title = await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } });
      assert.ok(title);
      assert.equal(Number(title.paid_amount), 0, "decremento ÚNICO — o perdedor não pode ter devolvido de novo");
      assert.equal(title.status, "open");
    } finally {
      await teardown(h);
    }
  });

  test("G3 — falha injetada após contrapartida e antes do restore faz rollback de ambos", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g3-fault", 100);
      const payment = await h.entryService.payTitle(seed.actor, seed.titleId, {
        account_id: seed.accountId, amount: 100, payment_method: "pix",
      });
      await assert.rejects(client.$transaction(async (tx) => {
        await h.setTenantRlsContext(tx, seed.tenantId);
        const period = h.deriveCompetencia(new Date());
        await h.acquirePeriodLockShared(tx, seed.tenantId, period);
        const repo = new h.PrismaFinancialEntryRepository(tx);
        const locked = await repo.findByIdForUpdate(seed.tenantId, payment.id);
        assert.ok(locked);
        await repo.create({
          tenantId: seed.tenantId, accountId: seed.accountId, direction: "out", amount: 100,
          currency: "BRL", paymentMethod: "pix", occurredAt: new Date(), competencia: period,
          reversalOf: payment.id, createdBy: seed.userId, updatedBy: seed.userId,
        });
        throw new Error("fault_after_counter_before_restore");
      }), /fault_after_counter_before_restore/);
      assert.equal(await client.financialEntry.count({ where: { tenant_id: seed.tenantId, reversal_of: payment.id } }), 0);
      const title = await client.financialTitle.findUnique({ where: { id: seed.titleId } });
      assert.equal(Number(title?.paid_amount), 100);
      assert.equal(title?.status, "paid");
    } finally { await teardown(h); }
  });

  test("G4 — dupla reversão de uma parcela entre múltiplos pagamentos restaura uma única vez", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g4-partial", 100);
      const first = await h.entryService.payTitle(seed.actor, seed.titleId, { account_id: seed.accountId, amount: 40, payment_method: "pix" });
      await h.entryService.payTitle(seed.actor, seed.titleId, { account_id: seed.accountId, amount: 60, payment_method: "pix" });
      const results = await Promise.allSettled([
        h.entryService.reverse(seed.actor, first.id),
        h.entryService.reverse(seed.actor, first.id),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      assert.ok(rejected);
      assert.equal(isDomainError(rejected.reason, 409, "already_reversed"), true);
      assert.equal(await client.financialEntry.count({ where: { tenant_id: seed.tenantId, reversal_of: first.id } }), 1);
      const title = await client.financialTitle.findUnique({ where: { id: seed.titleId } });
      assert.equal(Number(title?.paid_amount), 60);
      assert.equal(title?.status, "partially_paid");
    } finally { await teardown(h); }
  });

  test("G12 (histórico G3b) — estornar a primeira parcela deixa a última e status partially_paid", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g12-first", 100);
      const first = await h.entryService.payTitle(seed.actor, seed.titleId, { account_id: seed.accountId, amount: 40, payment_method: "pix" });
      await h.entryService.payTitle(seed.actor, seed.titleId, { account_id: seed.accountId, amount: 60, payment_method: "pix" });
      await h.entryService.reverse(seed.actor, first.id);
      const title = await client.financialTitle.findUnique({ where: { id: seed.titleId } });
      assert.equal(Number(title?.paid_amount), 60);
      assert.equal(title?.status, "partially_paid");
    } finally { await teardown(h); }
  });
}

// ---------- harness ----------

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { setTenantRlsContext, withTenantRls },
    { acquirePeriodLockShared },
    { deriveCompetencia },
    { PrismaFinancialTitleRepository },
    { PrismaFinancialEntryRepository },
    { createDefaultFinancialEntryService },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/database/financial-period-lock.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
    import("../src/modules/financial-entries/financial-entry-prisma.repository.js"),
    import("../src/modules/financial-entries/financial-entry.service.js"),
  ]);

  // ASSERT DO MODO (lição do #357): sem a fixação do topo, num processo memory este assert reprova.
  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  // A tag TEM de ter chegado ao backend: uma barreira escopada que nunca casa nada ficaria "verde"
  // por não esperar, e o teste voltaria a ser cego (agora do outro lado).
  await assertApplicationNamePropagated(client, applicationName);
  const entryService = await createDefaultFinancialEntryService();

  return {
    client,
    entryService,
    deriveCompetencia,
    setTenantRlsContext,
    withTenantRls,
    acquirePeriodLockShared,
    PrismaFinancialTitleRepository,
    PrismaFinancialEntryRepository,
    tenantIds: [] as string[],
  };
}

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seedTenant(h: Harness, tag: string, titleAmount: number) {
  const { client } = h;
  const marca = `${tag}-${suffix()}`;
  const tenant = await client.tenant.create({
    data: { name: `Reverse restore ${marca}`, slug: `reverse-restore-${marca}` },
  });
  h.tenantIds.push(tenant.id);

  const user = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({
      data: { tenant_id: tenant.id, name: "Financeiro reverse-restore", email: `reverse-restore-${marca}@example.com` },
    }),
  );
  const account = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.financialAccount.create({
      data: { tenant_id: tenant.id, name: `Conta ${marca}`, kind: "cash", currency: "BRL", is_active: true },
    }),
  );
  const title = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.financialTitle.create({
      data: {
        tenant_id: tenant.id,
        direction: "receivable",
        party_type: "customer",
        party_name: `Cliente ${marca}`,
        amount: titleAmount,
        currency: "BRL",
        issue_date: new Date(),
        due_date: new Date(),
        paid_amount: 0,
        status: "open",
        competencia: h.deriveCompetencia(new Date()),
      },
    }),
  );

  return {
    tenantId: tenant.id,
    userId: user.id,
    accountId: account.id,
    titleId: title.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: [], permissions: [] },
  };
}

function isDomainError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason
  );
}

// A barreira DETERMINÍSTICA mudou de casa: `tests/helpers/pg-barrier.ts`, agora ESCOPADA por
// `application_name` (B-5). A versão cluster-wide que vivia aqui aceitava statement bloqueado de
// QUALQUER suíte do lote. Cobre o caminho íntegro (SELECT ... FOR UPDATE bloqueado) E os mutantes
// dos drills (INSERT bloqueado no unique parcial) — o vermelho dos drills vem das ASSERÇÕES.

// Teardown ESCOPADO aos tenants descartáveis desta execução, em ordem de FK.
async function teardown(h: Harness): Promise<void> {
  const { client } = h;
  try {
    for (const tenantId of h.tenantIds) {
      await client.$executeRawUnsafe("delete from financial_entries where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from financial_titles where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from financial_period_closes where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from financial_accounts where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from audit_logs where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from users where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from tenants where id = $1::uuid", tenantId);
    }
  } finally {
    await client.$disconnect();
  }
}
