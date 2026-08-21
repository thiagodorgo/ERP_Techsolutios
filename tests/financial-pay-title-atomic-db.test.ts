import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// -----------------------------------------------------------------------------------------------
// B-O6R-02 F3 (Ω6R-DIN-001 / QUA-003) — payTitle ATÔMICO sob Postgres REAL, duas conexões e
// barreira determinística (fila de lock observada em pg_stat_activity, nunca sleep cego).
//
// O defeito medido: assertPayable (tx A) → entry.create (tx B) → applyPayment (tx C). Corrida sem
// client_action_id → DOIS lançamentos, saldo da conta inflado, título consistente por sorte.
// A cura (F3): trava SHARED de período → re-check → lançamento → applyPaymentGuarded (CAS), tudo
// numa transação. O par que fecha a corrida:
//   (a) o UPDATE do título é CONDICIONAL (paid_amount + X <= amount AND status not in paid/cancelled)
//       — o perdedor bloqueia no row lock do vencedor e re-avalia o predicado contra a tupla NOVA
//       (READ COMMITTED/EvalPlanQual) → casa 0 linhas;
//   (b) o lançamento do perdedor vive NA MESMA transação — o 422 aborta e ele morre junto.
//
//   · G1 — vencedor (emulado por conexão crua com as MESMAS peças do produto, na MESMA ordem) segura
//     a transação pós-CAS; o perdedor REAL (service payTitle) bloqueia no título; vencedor commita →
//     perdedor 422 overpayment e ZERO lançamento órfão.
//   · G2 — replay do client_action_id → 409 duplicate_payment ANTES de qualquer mutação do título
//     (P2002 dentro da transação → aborta → contagens inalteradas).
//
// A LIÇÃO DO #357: o job `backend` da CI tem DATABASE_URL e roda em CORE_SAAS_PERSISTENCE=memory —
// esta suíte FIXA o modo ela mesma, ANTES de importar a aplicação, e o bootstrap ASSERTA o modo
// (drill D7: remover a fixação deixa a suíte vermelha no assert, nunca silenciosamente verde).
//
// Disciplina: tenant descartável por teste, asserções ESCOPADAS aos ids do próprio teste, teardown
// escopado em ordem de FK — nenhuma sentença sobre a base inteira.
// -----------------------------------------------------------------------------------------------

if (!connectionString) {
  test("payTitle atômico sob Postgres exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação (todos os imports abaixo são dinâmicos; o primeiro deles
  // congela src/config/env.ts). Drill D7 remove ESTA linha → o assert de modo fica vermelho.
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";

  test("G1 — corrida sem chave: perdedor bloqueia no título, sai 422 overpayment e ZERO lançamento órfão", async () => {
    const h = await bootstrap(connectionString);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g1");
      const { tenantId, accountId, titleId, userId } = seed;
      const occurredAt = new Date();
      const period = h.deriveCompetencia(occurredAt);

      // VENCEDOR emulado por conexão crua com as PEÇAS DO PRODUTO na ORDEM DO PRODUTO (advisory
      // shared → insert do lançamento → CAS do título) — e a transação fica ABERTA pós-CAS: o row
      // lock do título é exatamente o que o payTitle real do perdedor vai encontrar.
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
          await new h.PrismaFinancialEntryRepository(tx).create({
            tenantId,
            accountId,
            titleId,
            direction: "in",
            amount: 60,
            currency: "BRL",
            paymentMethod: "pix",
            occurredAt,
            competencia: period,
            createdBy: userId,
            updatedBy: userId,
          });
          const applied = await new h.PrismaFinancialTitleRepository(tx).applyPaymentGuarded({
            tenantId,
            financialTitleId: titleId,
            amount: 60,
            updatedBy: userId,
          });
          assert.ok(applied, "o CAS do vencedor tem de casar 1 linha");
          assert.equal(applied.paidAmount, 60);
          assert.equal(applied.status, "partially_paid");
          signalWinnerReady();
          await winnerMayCommit;
        },
        { timeout: 30000, maxWait: 10000 },
      );
      await winnerReady;

      // PERDEDOR REAL — o payTitle do produto. Passa os pré-checks (o commit do vencedor ainda não
      // existe em READ COMMITTED), cria o lançamento NA transação e BLOQUEIA no CAS do título.
      let loserSettled = false;
      const loserPromise = h.entryService
        .payTitle(seed.actor, titleId, {
          account_id: accountId,
          amount: 60,
          payment_method: "pix",
          occurred_at: occurredAt.toISOString(),
        })
        .finally(() => {
          loserSettled = true;
        });
      await waitForBlockedStatement(client, "financial_titles", "perdedor bloqueado no CAS do título");
      assert.equal(loserSettled, false, "o perdedor TEM de estar bloqueado no row lock do título — nunca commitado");

      releaseWinner();
      await winnerTx;

      // O perdedor acorda, o predicado re-avaliado contra a tupla nova casa 0 linhas, a classificação
      // (FOR UPDATE) decide overpayment e o 422 aborta a transação — o lançamento dele morre junto.
      await assert.rejects(loserPromise, (error: unknown) => isDomainError(error, 422, "overpayment"));

      // ZERO órfão — escopado ao tenant descartável deste teste.
      const survivingEntries = await client.financialEntry.findMany({ where: { tenant_id: tenantId } });
      assert.equal(survivingEntries.length, 1, "só o lançamento do vencedor pode sobreviver (era 2 no defeito DIN-001)");
      assert.equal(survivingEntries[0].title_id, titleId);
      assert.equal(Number(survivingEntries[0].amount), 60);

      const title = await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } });
      assert.ok(title);
      assert.equal(Number(title.paid_amount), 60, "um ÚNICO incremento");
      assert.equal(title.status, "partially_paid");
    } finally {
      await teardown(h);
    }
  });

  test("G2 — replay do client_action_id → 409 duplicate_payment ANTES de qualquer mutação do título", async () => {
    const h = await bootstrap(connectionString);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g2");
      const { tenantId, accountId, titleId } = seed;
      const clientActionId = randomUUID();
      const body = { account_id: accountId, amount: 40, payment_method: "pix", client_action_id: clientActionId };

      const first = await h.entryService.payTitle(seed.actor, titleId, body);
      assert.equal(first.titleId, titleId);

      await assert.rejects(
        h.entryService.payTitle(seed.actor, titleId, body),
        (error: unknown) => isDomainError(error, 409, "duplicate_payment"),
      );

      // Contagens INALTERADAS: o P2002 estourou dentro da transação, antes do CAS do título.
      assert.equal(await client.financialEntry.count({ where: { tenant_id: tenantId } }), 1);
      const title = await client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: titleId } });
      assert.ok(title);
      assert.equal(Number(title.paid_amount), 40, "o replay não pode duplo-incrementar");
      assert.equal(title.status, "partially_paid");
    } finally {
      await teardown(h);
    }
  });

  test("G1 — vencedor quita; perdedor concorrente sai title_already_paid e não deixa órfão", async () => {
    const h = await bootstrap(connectionString);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g1-paid");
      const occurredAt = new Date();
      const period = h.deriveCompetencia(occurredAt);
      let release!: () => void;
      const mayCommit = new Promise<void>((resolve) => { release = resolve; });
      let ready!: () => void;
      const locked = new Promise<void>((resolve) => { ready = resolve; });
      const winner = client.$transaction(async (tx) => {
        await h.setTenantRlsContext(tx, seed.tenantId);
        await h.acquirePeriodLockShared(tx, seed.tenantId, period);
        await new h.PrismaFinancialEntryRepository(tx).create({
          tenantId: seed.tenantId, accountId: seed.accountId, titleId: seed.titleId, direction: "in",
          amount: 100, currency: "BRL", paymentMethod: "pix", occurredAt, competencia: period,
          createdBy: seed.userId, updatedBy: seed.userId,
        });
        const applied = await new h.PrismaFinancialTitleRepository(tx).applyPaymentGuarded({
          tenantId: seed.tenantId, financialTitleId: seed.titleId, amount: 100, updatedBy: seed.userId,
        });
        assert.equal(applied?.status, "paid");
        ready();
        await mayCommit;
      }, { timeout: 30000, maxWait: 10000 });
      await locked;
      const loser = h.entryService.payTitle(seed.actor, seed.titleId, {
        account_id: seed.accountId, amount: 1, payment_method: "pix", occurred_at: occurredAt.toISOString(),
      });
      await waitForBlockedStatement(client, "financial_titles", "perdedor bloqueado atrás da quitação");
      release();
      await winner;
      await assert.rejects(loser, (error: unknown) => isDomainError(error, 422, "title_already_paid"));
      assert.equal(await client.financialEntry.count({ where: { tenant_id: seed.tenantId } }), 1);
      const title = await client.financialTitle.findUnique({ where: { id: seed.titleId } });
      assert.equal(Number(title?.paid_amount), 100);
      assert.equal(title?.status, "paid");
    } finally { await teardown(h); }
  });

  test("G2 — duas requisições concorrentes com a mesma chave produzem uma única mutação", async () => {
    const h = await bootstrap(connectionString);
    const { client } = h;
    try {
      const seed = await seedTenant(h, "g2-concurrent");
      const key = randomUUID();
      const body = { account_id: seed.accountId, amount: 40, payment_method: "pix", client_action_id: key };
      const results = await Promise.allSettled([
        h.entryService.payTitle(seed.actor, seed.titleId, body),
        h.entryService.payTitle(seed.actor, seed.titleId, body),
      ]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      assert.ok(rejected);
      assert.equal(isDomainError(rejected.reason, 409, "duplicate_payment"), true);
      assert.equal(await client.financialEntry.count({ where: { tenant_id: seed.tenantId } }), 1);
      const title = await client.financialTitle.findUnique({ where: { id: seed.titleId } });
      assert.equal(Number(title?.paid_amount), 40);
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

  // ASSERT DO MODO (lição do #357): esta suíte só é prova no caminho prisma. Sem a fixação lá em
  // cima (drill D7), num processo memory este assert reprova — a suíte NUNCA "passa" em memória.
  assert.equal(
    env.CORE_SAAS_PERSISTENCE,
    "prisma",
    "assert do modo: a suíte fixa CORE_SAAS_PERSISTENCE=prisma ela mesma; rodar em memory é verde-cego",
  );

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
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

async function seedTenant(h: Harness, tag: string) {
  const { client } = h;
  const marca = `${tag}-${suffix()}`;
  const tenant = await client.tenant.create({
    data: { name: `Pay atômico ${marca}`, slug: `pay-atomic-${marca}` },
  });
  h.tenantIds.push(tenant.id);

  const user = await h.withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({
      data: { tenant_id: tenant.id, name: "Financeiro pay-atomic", email: `pay-atomic-${marca}@example.com` },
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
        amount: 100,
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

// Barreira DETERMINÍSTICA por pg_stat_activity: um statement de OUTRO backend (pid distinto),
// esperando LOCK, cujo texto toca a tabela-alvo. Cobre o caminho íntegro (UPDATE do CAS bloqueado no
// row lock) E os mutantes dos drills (INSERT bloqueado em unique, CAS fora da tx) — o vermelho dos
// drills vem das ASSERÇÕES de estado, nunca de timeout de barreira.
async function waitForBlockedStatement(
  client: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  tableFragment: string,
  label: string,
): Promise<void> {
  const deadline = Date.now() + 15000;
  for (;;) {
    const rows = (await client.$queryRaw`
      SELECT count(*)::int AS waiting
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
        AND wait_event_type = 'Lock'
        AND state = 'active'
        AND query ILIKE ${`%${tableFragment}%`}
    `) as Array<{ waiting: number }>;
    if ((rows[0]?.waiting ?? 0) >= 1) return;
    if (Date.now() > deadline) {
      assert.fail(`timeout (15s) esperando statement bloqueado em ${tableFragment} — ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// Teardown ESCOPADO aos tenants descartáveis desta execução, em ordem de FK — nunca sentença sobre a
// base inteira (P-JUNTA-LIMPEZA-BASE-VIVA).
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
