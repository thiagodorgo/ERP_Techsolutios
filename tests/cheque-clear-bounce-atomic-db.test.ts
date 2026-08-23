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
import { expectChequeLedgerCoherent } from "./helpers/financial-ledger.js";

const connectionString = process.env.DATABASE_URL;
// Nome único desta suíte (um processo por arquivo no `node --test`) — escopo da barreira (B-5).
const applicationName = buildApplicationName("cheque-clear-bounce");

// -----------------------------------------------------------------------------------------------
// B-O6R-02 F5 (Ω6R-DIN-003 / QUA-003) — clear/bounce do CHEQUE em transação única, sob Postgres
// REAL, duas conexões e barreira determinística (fila de lock em pg_stat_activity, nunca sleep cego).
//
// O defeito medido: transição (tx A) → postEntry (tx B) → attach (tx C), com rollback best-effort
// `.catch(() => {})` — queda entre as etapas deixava dinheiro movimentado sem vínculo recuperável.
// A cura (F5): trava SHARED de período + re-check, transição CAS (mutex preservado; perdedor → 409),
// lançamento e vínculo NUMA transação; o código de compensação foi DELETADO — falha → o cheque volta
// ao estado anterior PELO BANCO.
//
//   · G5 — falha REAL injetada (fechamento de período de verdade, pelo serviço de fechamento do
//     produto): clear → 422 period_closed com o cheque intacto em 'deposited' e ZERO lançamento;
//     bounce-após-clear → 422 com o cheque intacto em 'cleared', vínculo preservado e ZERO contra.
//   · G6 — clear × clear e clear × bounce com barreira: o vencedor (peças do produto em conexão
//     crua, ordem do produto) segura a tx pós-transição; o perdedor REAL bloqueia no row lock do
//     cheque; ao commitar, o CAS re-avaliado casa 0 linhas → 409 transition_conflict. Invariante:
//     cleared ⇔ cleared_entry_id ⇔ o lançamento existe (e é exatamente UM).
//
// A LIÇÃO DO #357: a suíte FIXA CORE_SAAS_PERSISTENCE=prisma ela mesma, ANTES de importar a
// aplicação, e o bootstrap ASSERTA o modo (drill D7: remover a fixação = vermelho no assert).
//
// Disciplina: tenant descartável por teste, asserções ESCOPADAS aos ids do próprio teste, teardown
// escopado em ordem de FK — nenhuma sentença sobre a base inteira.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("Cheque atômico sob Postgres exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação. Drill D7 remove ESTA linha → o assert de modo reprova.
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  // B-5 (ciclo 2 · C3): tag da suíte na URL antes de `src/database/prisma.ts` lê-la no import.
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("G5 — período fechado DE VERDADE: clear → 422 period_closed, cheque intacto em 'deposited', ZERO lançamento", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g5a");
      const { tenantId, chequeId } = seed;
      await h.chequeService.deposit(seed.actor, chequeId);

      // A falha injetada é REAL: o serviço de fechamento do produto fecha a competência CORRENTE —
      // exatamente o que o re-check in-tx do clear vai encontrar.
      const period = h.deriveCompetencia(new Date());
      const closed = await h.closeService.close(seed.closeActor, period, {});
      assert.equal(closed.record.status, "closed");

      await assert.rejects(
        h.chequeService.clear(seed.actor, chequeId),
        (error: unknown) => isDomainError(error, 422, "period_closed"),
      );

      const cheque = await client.cheque.findFirst({ where: { tenant_id: tenantId, id: chequeId } });
      assert.ok(cheque);
      assert.equal(cheque.status, "deposited", "o cheque fica EXATAMENTE no estado anterior");
      assert.equal(cheque.cleared_entry_id, null);
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: tenantId } }),
        0,
        "zero lançamento órfão — nada meio-postado sobrevive",
      );
    } finally {
      await teardown(h);
    }
  });

  test("G5 — bounce-após-clear com período fechado: 422, cheque intacto em 'cleared', vínculo preservado, ZERO contra-lançamento", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g5b");
      const { tenantId, chequeId } = seed;
      await h.chequeService.deposit(seed.actor, chequeId);
      const cleared = await h.chequeService.clear(seed.actor, chequeId);
      assert.equal(cleared.status, "cleared");
      assert.ok(cleared.clearedEntryId, "o clear íntegro vincula o lançamento");

      const period = h.deriveCompetencia(new Date());
      const closed = await h.closeService.close(seed.closeActor, period, {});
      assert.equal(closed.record.status, "closed");

      await assert.rejects(
        h.chequeService.bounce(seed.actor, chequeId, { reason: "sem fundos" }),
        (error: unknown) => isDomainError(error, 422, "period_closed"),
      );

      const cheque = await client.cheque.findFirst({ where: { tenant_id: tenantId, id: chequeId } });
      assert.ok(cheque);
      assert.equal(cheque.status, "cleared", "a devolução que falhou não pode deixar o cheque meio-devolvido");
      assert.equal(cheque.cleared_entry_id, cleared.clearedEntryId);
      assert.equal(cheque.bounce_entry_id, null);
      assert.equal(cheque.bounce_reason, null, "nem o motivo da transição desfeita pode sobreviver ao rollback");
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: tenantId } }),
        1,
        "só o lançamento da compensação — zero contra-lançamento órfão",
      );
    } finally {
      await teardown(h);
    }
  });

  // [C2/P3 · Ω6R-DIN-011] O ATAQUE DA JUNTA, sob Postgres real, agora RECUSADO. Medido em e4e914a:
  //   cheque +100 compensado -> reverse do lancamento: PERMITIDO -> bounce: PERMITIDO
  //     | saldo clear=100 reverse=0 bounce=-100 | cheque.status=bounced
  // 200 devolvidos num cheque de 100. A asserção que importa é o NET dos lançamentos vivos, não a
  // existência da linha: no defeito a linha existia e o dinheiro já tinha voltado.
  test("G14 — ataque: reverse/delete do lançamento de compensação → 422 cheque_entry_immutable; net = +100 e o bounce leva a 0, nunca −100", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g14-ataque");
      const { tenantId, chequeId, accountId } = seed;
      await h.chequeService.deposit(seed.actor, chequeId);
      const cleared = await h.chequeService.clear(seed.actor, chequeId);
      assert.ok(cleared.clearedEntryId);
      assert.equal((await h.entryService.balance(seed.actor, accountId)).balance, 1500);

      // (1) as DUAS portas da superfície de lançamentos recusam.
      await assert.rejects(
        h.entryService.reverse(seed.actor, cleared.clearedEntryId!),
        (error: unknown) => isDomainError(error, 422, "cheque_entry_immutable"),
      );
      await assert.rejects(
        h.entryService.delete(seed.actor, cleared.clearedEntryId!),
        (error: unknown) => isDomainError(error, 422, "cheque_entry_immutable"),
      );

      // (2) o cheque não saiu de 'cleared' e o razão continua valendo +1500 (era 0 depois do reverse).
      const afterAttack = await expectChequeLedger(h.client, tenantId, chequeId, "depois do ataque recusado");
      assert.equal(afterAttack.status, "cleared");
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: tenantId, deleted_at: null } }),
        1,
        "nenhuma contrapartida pode ter sido criada, e a compensação não pode ter sido apagada",
      );
      assert.equal((await h.entryService.balance(seed.actor, accountId)).balance, 1500);

      // (3) a máquina de estados é a única porta — e ela leva a ZERO.
      const bounced = await h.chequeService.bounce(seed.actor, chequeId, { reason: "sem fundos" });
      assert.equal(bounced.status, "bounced");
      await expectChequeLedger(h.client, tenantId, chequeId, "depois do bounce");
      assert.equal(
        (await h.entryService.balance(seed.actor, accountId)).balance,
        0,
        "líquido ZERO — no head reprovado esta linha valia −1500 (devolução em dobro)",
      );
    } finally {
      await teardown(h);
    }
  });

  // [C2/P3] A TERCEIRA PERNA do invariante — `net(...) ∈ { ±valor (cleared), 0 (bounced), SEM
  // LANÇAMENTO (demais) }`. As duas primeiras já são exercidas (G6/G14); esta não era exercida por
  // teste nenhum, e um ramo de helper que ninguém executa é um ramo que ninguém sabe se funciona.
  // Cobre também o bounce SEM clear (deposited→bounced), que não move caixa.
  test("G15 — cheque que nunca compensou não tem lançamento vinculado: registered, deposited, bounce-sem-clear e cancelled valem ZERO", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g15-sem-caixa");
      const { tenantId, chequeId, accountId } = seed;

      await expectChequeLedger(client, tenantId, chequeId, "recém-registrado");
      await h.chequeService.deposit(seed.actor, chequeId);
      await expectChequeLedger(client, tenantId, chequeId, "depositado (ainda não compensou)");

      // deposited→bounced: devolvido sem NUNCA ter compensado — zero lançamento, não um par que se anula.
      const bounced = await h.chequeService.bounce(seed.actor, chequeId, { reason: "sem fundos" });
      assert.equal(bounced.status, "bounced");
      assert.equal(bounced.bounceEntryId, undefined, "bounce sem clear não posta contra-lançamento");
      await expectChequeLedger(client, tenantId, chequeId, "devolvido sem ter compensado");
      assert.equal(
        await client.financialEntry.count({ where: { tenant_id: tenantId, deleted_at: null } }),
        0,
        "nenhum caixa foi movido em todo o ciclo",
      );
      assert.equal((await h.entryService.balance(seed.actor, accountId)).balance, 0);

      // E o outro terminal sem dinheiro: registered→cancelled.
      const outro = await h.chequeService.create(seed.actor, {
        direction: "received",
        cheque_number: "000555",
        bank: "Banco G15",
        amount: 900,
        account_id: accountId,
      });
      const cancelado = await h.chequeService.cancel(seed.actor, outro.id);
      assert.equal(cancelado.status, "cancelled");
      await expectChequeLedger(client, tenantId, outro.id, "cancelado");
    } finally {
      await teardown(h);
    }
  });

  test("G6 — clear × clear com barreira: perdedor bloqueia no cheque e sai 409; invariante cleared ⇔ cleared_entry_id ⇔ entry existe", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g6a");
      const { tenantId, chequeId } = seed;
      await h.chequeService.deposit(seed.actor, chequeId);

      const winner = await holdWinningClear(h, seed);

      // PERDEDOR REAL — o clear do produto. O pré-check vê 'deposited' (o flip do vencedor está
      // uncommitted → invisível) e ele BLOQUEIA no row lock do cheque, dentro da transição CAS.
      let loserSettled = false;
      const loserOutcome = captureSettled(h.chequeService.clear(seed.actor, chequeId)).then((outcome) => {
        loserSettled = true;
        return outcome;
      });
      await waitForOwnBlockedStatement(client, {
        applicationName,
        fragment: "cheques",
        label: "perdedor bloqueado na transição CAS do cheque",
      });
      assert.equal(loserSettled, false, "o perdedor TEM de estar bloqueado no row lock do cheque");

      winner.release();
      expectAllFulfilled([await winner.outcome], "transação do clear vencedor");

      // Ao destravar, o CAS re-avaliado vê status='cleared' ≠ 'deposited' → 0 linhas → 409.
      assert.equal(
        isDomainError(expectRejected(await loserOutcome, "clear perdedor"), 409, "transition_conflict"),
        true,
        "o clear perdedor tem de morrer com 409 transition_conflict",
      );

      await assertClearedInvariant(client, tenantId, chequeId, winner.entryId);
    } finally {
      await teardown(h);
    }
  });

  test("G6 — clear × bounce com barreira: o bounce que perde a corrida sai 409 e não posta nada", async () => {
    const h = await bootstrap(connection);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g6b");
      const { tenantId, chequeId } = seed;
      await h.chequeService.deposit(seed.actor, chequeId);

      const winner = await holdWinningClear(h, seed);

      // PERDEDOR REAL — bounce. O pré-check vê 'deposited' → ramo SEM dinheiro (CAS deposited→bounced),
      // que bloqueia no mesmo row lock e, ao destravar, casa 0 linhas → 409.
      let loserSettled = false;
      const loserOutcome = captureSettled(h.chequeService.bounce(seed.actor, chequeId, { reason: "sem fundos" })).then((outcome) => {
        loserSettled = true;
        return outcome;
      });
      await waitForOwnBlockedStatement(client, {
        applicationName,
        fragment: "cheques",
        label: "bounce perdedor bloqueado na transição CAS",
      });
      assert.equal(loserSettled, false, "o bounce TEM de estar bloqueado no row lock do cheque");

      winner.release();
      expectAllFulfilled([await winner.outcome], "transação do clear vencedor");

      assert.equal(
        isDomainError(expectRejected(await loserOutcome, "bounce perdedor"), 409, "transition_conflict"),
        true,
        "o bounce perdedor tem de morrer com 409 transition_conflict",
      );

      const cheque = await assertClearedInvariant(client, tenantId, chequeId, winner.entryId);
      assert.equal(cheque.bounce_entry_id, null, "o bounce perdedor não pode ter postado nada");
      assert.equal(cheque.bounce_reason, null);
      assert.equal(await client.financialEntry.count({ where: { tenant_id: tenantId, category: "cheque_bounce" } }), 0);
    } finally {
      await teardown(h);
    }
  });
}

// ---------- harness ----------

type Harness = Awaited<ReturnType<typeof bootstrap>>;
type Seed = Awaited<ReturnType<typeof seedTenant>>;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { setTenantRlsContext, withTenantRls },
    { acquirePeriodLockShared },
    { deriveCompetencia },
    { PrismaChequeRepository },
    { PrismaFinancialEntryRepository },
    { createDefaultChequeService },
    { createDefaultFinancialEntryService },
    { FinancialPeriodCloseService },
    { PrismaFinancialPeriodCloseStore },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/database/financial-period-lock.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/cheques/cheque-prisma.repository.js"),
    import("../src/modules/financial-entries/financial-entry-prisma.repository.js"),
    import("../src/modules/cheques/cheque.service.js"),
    import("../src/modules/financial-entries/financial-entry.service.js"),
    import("../src/modules/financial-period-closes/financial-period-close.service.js"),
    import("../src/modules/financial-period-closes/financial-period-close-prisma.repository.js"),
  ]);

  // ASSERT DO MODO (lição do #357): sem a fixação do topo, num processo memory este assert reprova.
  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  // A tag TEM de ter chegado ao backend: barreira escopada que nunca casa nada é cegueira nova.
  await assertApplicationNamePropagated(client, applicationName);
  const chequeService = await createDefaultChequeService();
  // C2 — o ataque do G14 vem pela superficie de LANCAMENTOS (reverse/delete), entao ela precisa
  // estar no arnes: e exatamente a porta que desfazia o dinheiro do cheque por fora da maquina.
  const entryService = await createDefaultFinancialEntryService();
  const closeService = new FinancialPeriodCloseService(new PrismaFinancialPeriodCloseStore(client));

  return {
    client,
    chequeService,
    entryService,
    closeService,
    deriveCompetencia,
    setTenantRlsContext,
    withTenantRls,
    acquirePeriodLockShared,
    PrismaChequeRepository,
    PrismaFinancialEntryRepository,
    tenantIds: [] as string[],
  };
}

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seedTenant(h: Harness, tag: string) {
  const { client } = h;
  const marca = `${tag}-${suffix()}`;
  const tenant = await client.tenant.create({
    data: { name: `Cheque atômico ${marca}`, slug: `cheque-atomic-${marca}` },
  });
  h.tenantIds.push(tenant.id);

  const user = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({
      data: { tenant_id: tenant.id, name: "Financeiro cheque-atomic", email: `cheque-atomic-${marca}@example.com` },
    }),
  );
  const account = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.financialAccount.create({
      data: { tenant_id: tenant.id, name: `Conta ${marca}`, kind: "cash", currency: "BRL", is_active: true },
    }),
  );
  const cheque = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.cheque.create({
      data: {
        tenant_id: tenant.id,
        account_id: account.id,
        direction: "received",
        cheque_number: `77${suffix().slice(-4)}`,
        bank: "Banco Atômico",
        amount: 1500,
        currency: "BRL",
        status: "registered",
      },
    }),
  );

  // O clear/bounce exige a permissão financeira forte (assertCanMoveMoney) — o ator carrega
  // financial_entries:create como o ator finance das provas de memória.
  const actor = {
    tenantId: tenant.id,
    userId: user.id,
    roles: ["finance" as const],
    permissions: [
      "cheques:read" as const,
      "cheques:create" as const,
      "cheques:update" as const,
      "financial_entries:create" as const,
    ],
  };
  return {
    tenantId: tenant.id,
    userId: user.id,
    accountId: account.id,
    chequeId: cheque.id,
    chequeNumber: cheque.cheque_number,
    actor,
    closeActor: { tenantId: tenant.id, userId: user.id, roles: [], permissions: [] },
  };
}

// VENCEDOR do clear emulado por conexão crua com as PEÇAS DO PRODUTO na ORDEM DO PRODUTO (advisory
// shared de período → transição CAS → lançamento → vínculo), transação SEGURA aberta até `release()`.
// Enquanto pendente, o flip é INVISÍVEL (READ COMMITTED) — o perdedor real passa o pré-check e
// bloqueia no row lock do cheque.
async function holdWinningClear(h: Harness, seed: Seed) {
  const { client } = h;
  const occurredAt = new Date();
  const period = h.deriveCompetencia(occurredAt);

  let release!: () => void;
  const mayCommit = new Promise<void>((resolve) => {
    release = resolve;
  });
  let signalReady!: (entryId: string) => void;
  const ready = new Promise<string>((resolve) => {
    signalReady = resolve;
  });
  const tx = client.$transaction(
    async (txClient) => {
      await h.setTenantRlsContext(txClient, seed.tenantId);
      await h.acquirePeriodLockShared(txClient, seed.tenantId, period);
      const chequeRepo = new h.PrismaChequeRepository(txClient);
      const reserved = await chequeRepo.transition({
        tenantId: seed.tenantId,
        chequeId: seed.chequeId,
        fromStatus: "deposited",
        toStatus: "cleared",
        clearedEntryId: null,
        updatedBy: seed.userId,
      });
      assert.ok(reserved, "o vencedor tem de ganhar a transição CAS");
      const entry = await new h.PrismaFinancialEntryRepository(txClient).create({
        tenantId: seed.tenantId,
        accountId: seed.accountId,
        direction: "in",
        amount: 1500,
        currency: "BRL",
        paymentMethod: "check",
        category: "cheque_clearing",
        occurredAt,
        competencia: period,
        description: `Compensação de cheque ${seed.chequeNumber}`,
        createdBy: seed.userId,
        updatedBy: seed.userId,
      });
      const linked = await chequeRepo.attachClearingEntry(seed.tenantId, seed.chequeId, entry.id, seed.userId);
      assert.ok(linked, "o vencedor vincula o lançamento na mesma transação");
      signalReady(entry.id);
      await mayCommit;
    },
    { timeout: 30000, maxWait: 10000 },
  );
  // CAPTURA-LIQUIDADA (C3.1) ANTES do primeiro `await`: a transação do vencedor é segurada pelos
  // testes por vários `await`s, e sem handler anexado aqui uma rejeição vira `unhandledRejection`.
  const outcome = captureSettled(tx);
  const entryId = await ready;
  return { outcome, release, entryId };
}

// Invariante do F5: cleared ⇔ cleared_entry_id preenchido ⇔ o lançamento vinculado EXISTE — e a
// compensação é exatamente UMA (nunca dupla-postagem).
async function assertClearedInvariant(
  client: Harness["client"],
  tenantId: string,
  chequeId: string,
  expectedEntryId: string,
) {
  const cheque = await client.cheque.findFirst({ where: { tenant_id: tenantId, id: chequeId } });
  assert.ok(cheque);
  assert.equal(cheque.status, "cleared");
  assert.equal(cheque.cleared_entry_id, expectedEntryId, "o vínculo é do vencedor");
  const linkedEntry = await client.financialEntry.findFirst({ where: { tenant_id: tenantId, id: expectedEntryId } });
  assert.ok(linkedEntry, "o lançamento vinculado existe");
  assert.equal(
    await client.financialEntry.count({ where: { tenant_id: tenantId, category: "cheque_clearing" } }),
    1,
    "exatamente UMA compensação postada",
  );
  // B-O6R-02 ciclo 2 · C2 — EXISTÊNCIA não basta, e foi essa a raiz que a junta nomeou no B-3: o
  // ataque deixava a linha viva e o dinheiro já devolvido. A partir daqui o invariante é de EFEITO.
  await expectChequeLedger(client, tenantId, chequeId, "invariante do clear vencedor");
  return cheque;
}

// Carrega os lançamentos VIVOS vinculados ao cheque (as DUAS pontas) e assere o líquido contra o
// status. `deleted_at: null` é o ponto: um lançamento apagado não sustenta dinheiro nenhum.
async function expectChequeLedger(client: Harness["client"], tenantId: string, chequeId: string, label: string) {
  const cheque = await client.cheque.findFirst({ where: { tenant_id: tenantId, id: chequeId } });
  assert.ok(cheque, `${label}: o cheque tem de existir`);
  const linkedIds = [cheque.cleared_entry_id, cheque.bounce_entry_id].filter((id): id is string => id != null);
  const rows = linkedIds.length
    ? await client.financialEntry.findMany({ where: { tenant_id: tenantId, id: { in: linkedIds }, deleted_at: null } })
    : [];
  expectChequeLedgerCoherent({
    status: cheque.status,
    direction: cheque.direction,
    amount: Number(cheque.amount),
    entries: rows.map((row) => ({ direction: row.direction, amount: Number(row.amount) })),
    label,
  });
  return cheque;
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
// `application_name` (B-5) — a versão cluster-wide daqui aceitava statement bloqueado de qualquer
// suíte do lote. O vermelho dos drills segue vindo das ASSERÇÕES de estado, nunca de timeout.

// Teardown ESCOPADO aos tenants descartáveis desta execução, em ordem de FK.
async function teardown(h: Harness): Promise<void> {
  const { client } = h;
  try {
    for (const tenantId of h.tenantIds) {
      await client.$executeRawUnsafe("delete from cheques where tenant_id = $1::uuid", tenantId);
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
