import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  countBlockedStatements,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("title-status-cas");

if (!connectionString) {
  test("CAS de estado do título exige DATABASE_URL e banco migrado", { skip: "Defina DATABASE_URL." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("K11-db: changeStatus do repositório casa o estado lido", async () => {
    await withHarness(connection, "repo", async (h, s) => {
      const changed = await h.repo.changeStatus({ tenantId: s.tenantId, financialTitleId: s.titleId, fromStatus: "open", status: "scheduled" });
      assert.equal(changed?.status, "scheduled");
      const stale = await h.repo.changeStatus({ tenantId: s.tenantId, financialTitleId: s.titleId, fromStatus: "open", status: "cancelled" });
      assert.equal(stale, undefined);
      assert.equal((await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } })).status, "scheduled");
    });
  });

  test("K11-db: pagamento vencedor impede transição manual incompatível", async () => {
    await withHarness(connection, "paid", async (h, s) => {
      await h.entryService.payTitle(s.actor, s.titleId, { account_id: s.accountId, amount: 100, payment_method: "pix" });
      await assert.rejects(
        () => h.titleService.changeStatus(s.actor, s.titleId, { status: "cancelled" }),
        (e) => domain(e, 422, "invalid_status_transition"),
      );
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid");
      assert.equal(Number(title.paid_amount), 100);
    });
  });

  test("K11-db: CAS incremental recusa segunda liquidação e não sobrescreve", async () => {
    await withHarness(connection, "incremental", async (h, s) => {
      assert.equal((await h.repo.applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: s.titleId, amount: 100 }))?.status, "paid");
      assert.equal(await h.repo.applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: s.titleId, amount: 1 }), undefined);
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid");
      assert.equal(Number(title.paid_amount), 100);
    });
  });

  test("K11-db: restauração guardada permite a propriedade clear → bounce", async () => {
    await withHarness(connection, "restore", async (h, s) => {
      assert.equal((await h.repo.applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: s.titleId, amount: 100 }))?.status, "paid");
      assert.equal((await h.repo.restorePaymentGuarded({ tenantId: s.tenantId, financialTitleId: s.titleId, amount: 100 }))?.status, "open");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "open");
      assert.equal(Number(title.paid_amount), 0);
    });
  });

  test("K11-db: transições sequenciais válidas permanecem disponíveis", async () => {
    await withHarness(connection, "sequential", async (h, s) => {
      assert.equal((await h.titleService.changeStatus(s.actor, s.titleId, { status: "scheduled" })).status, "scheduled");
      assert.equal((await h.titleService.changeStatus(s.actor, s.titleId, { status: "open" })).status, "open");
      assert.equal((await h.titleService.changeStatus(s.actor, s.titleId, { status: "in_dispute" })).status, "in_dispute");
      assert.equal((await h.titleService.changeStatus(s.actor, s.titleId, { status: "open" })).status, "open");
      assert.equal((await h.titleService.changeStatus(s.actor, s.titleId, { status: "cancelled" })).status, "cancelled");
    });
  });
  // ---------------------------------------------------------------------------------------------
  // B-SAN3-20 — retomada (Claude Opus cobrindo o Codex): as barreiras de K11 (D8a). Vencedor = peças do produto na
  // ordem do produto, em transação SEGURADA depois do CAS do título (row lock); perdedor = o serviço REAL
  // `FinancialTitleService.changeStatus`, observado BLOQUEADO no UPDATE em `pg_stat_activity` antes de liberar.
  // ---------------------------------------------------------------------------------------------

  test("K11-db (T-K11a, barreira — a sonda r2 refeita): clear vinculado segurado × changeStatus(open→cancelled) → 422 invalid_status_transition; título paid 100, cheque cleared, lançamento com title_id", async () => {
    await withHarness(connection, "k11a", async (h, s) => {
      const chequeId = await linkedDepositedCheque(h, s);
      const winner = await holdWinner(h, s, "linked-clear", chequeId);
      const loser = settle(h.titleService.changeStatus(s.actor, s.titleId, { status: "cancelled" }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "changeStatus perdedor no UPDATE do título" });
      assert.equal(loser.settled(), false, "o perdedor TEM de estar bloqueado no row lock do título");
      winner.release();
      await winner.done;
      expectRefusedOutcome(await loser.outcome, 422, "invalid_status_transition", "changeStatus perdedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid", "nunca o estado da r2 (cancelled com paid_amount 100)");
      assert.equal(Number(title.paid_amount), 100);
      const cheque = await h.client.cheque.findUniqueOrThrow({ where: { id: chequeId } });
      assert.equal(cheque.status, "cleared");
      const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s.tenantId } });
      assert.equal(entries.length, 1);
      assert.equal(entries[0]?.title_id, s.titleId);
    });
  });

  test("K11-db (T-K11b, barreira): payTitle(pix) segurado × changeStatus(open→cancelled) → 422 invalid_status_transition (classe pré-existente fechada pelo mesmo CAS)", async () => {
    await withHarness(connection, "k11b", async (h, s) => {
      const winner = await holdWinner(h, s, "pay-pix");
      const loser = settle(h.titleService.changeStatus(s.actor, s.titleId, { status: "cancelled" }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "changeStatus perdedor atrás do pix" });
      assert.equal(loser.settled(), false);
      winner.release();
      await winner.done;
      expectRefusedOutcome(await loser.outcome, 422, "invalid_status_transition", "changeStatus perdedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "paid");
      assert.equal(Number(title.paid_amount), 100);
    });
  });

  test("K11-db (T-K11c): depois da corrida de T-K11a, o bounce do cheque restaura o título (restorePaymentGuarded casa 1) — título open, saldo líquido 0", async () => {
    await withHarness(connection, "k11c", async (h, s) => {
      const chequeId = await linkedDepositedCheque(h, s);
      const winner = await holdWinner(h, s, "linked-clear", chequeId);
      const loser = settle(h.titleService.changeStatus(s.actor, s.titleId, { status: "cancelled" }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "changeStatus perdedor no UPDATE do título" });
      winner.release();
      await winner.done;
      expectRefusedOutcome(await loser.outcome, 422, "invalid_status_transition", "changeStatus perdedor");
      const bounced = await h.chequeService.bounce(s.actor, chequeId, { reason: "sem fundos" });
      assert.equal(bounced.status, "bounced");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.status, "open", "a devolução prometida por D3 continua possível");
      assert.equal(Number(title.paid_amount), 0);
      const balance = await h.entryService.balance(s.actor, s.accountId);
      assert.equal(balance.balance, 0);
    });
  });

  test("K11-db (T-K11h, barreira): status × status — a retentativa com o estado fresco vence quando a transição segue válida; estado mudado duas vezes → 409 title_status_conflict (sem girar)", async () => {
    // (1) Um vencedor: open→scheduled segurado; o perdedor (→cancelled) lê open, bloqueia, relê scheduled e a
    //     transição scheduled→cancelled continua válida → a retentativa única vence.
    await withHarness(connection, "k11h-retry", async (h, s) => {
      const winner = await holdWinner(h, s, "status-scheduled");
      const loser = settle(h.titleService.changeStatus(s.actor, s.titleId, { status: "cancelled" }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "changeStatus perdedor atrás de open→scheduled" });
      winner.release();
      await winner.done;
      const outcome = await loser.outcome;
      assert.equal(outcome.rejected, false, `a retentativa com o estado fresco tinha de vencer (${JSON.stringify((outcome.error as Error)?.message)})`);
      assert.equal((await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } })).status, "cancelled");
    });
    // (2) Três mudanças forçadas: open→scheduled (W1) e scheduled→in_dispute (W2, na fila atrás do perdedor). O perdedor
    //     casa 0 em open, relê scheduled, tenta de novo, bloqueia em W2 e casa 0 de novo → 409, nunca uma 3ª tentativa.
    await withHarness(connection, "k11h-409", async (h, s) => {
      const first = await holdWinner(h, s, "status-scheduled");
      const loser = settle(h.titleService.changeStatus(s.actor, s.titleId, { status: "cancelled" }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "perdedor atrás de W1" });
      const second = await holdWinner(h, s, "status-in-dispute-after-scheduled");
      await waitForBlockedCount(h, "financial_titles", 2, "perdedor e W2 na fila de W1");
      first.release();
      await first.done;
      await second.updated;
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "retentativa do perdedor atrás de W2" });
      assert.equal(loser.settled(), false);
      second.release();
      await second.done;
      expectRefusedOutcome(await loser.outcome, 409, "title_status_conflict", "changeStatus perdedor (estado mudou duas vezes)");
      assert.equal((await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } })).status, "in_dispute");
    });
  });
}

// ------------------------------------- arnês das barreiras -------------------------------------

type SettledOutcome = { readonly rejected: boolean; readonly error: unknown };

function settle(promise: Promise<unknown>) {
  let done = false;
  const outcome: Promise<SettledOutcome> = promise.then(
    () => ({ rejected: false, error: undefined }),
    (error: unknown) => ({ rejected: true, error }),
  ).finally(() => {
    done = true;
  });
  return { outcome, settled: () => done };
}

function expectRefusedOutcome(outcome: SettledOutcome, statusCode: number, reason: string, what: string): void {
  assert.ok(outcome.rejected, `${what}: tinha de RECUSAR e aceitou`);
  assert.ok(
    domain(outcome.error, statusCode, reason),
    `${what}: motivo errado — esperava ${statusCode}/${reason}, veio ${JSON.stringify({
      statusCode: (outcome.error as { statusCode?: unknown })?.statusCode,
      reason: (outcome.error as { reason?: unknown })?.reason,
      message: (outcome.error as Error)?.message,
    })}`,
  );
}

async function waitForBlockedCount(h: Harness, fragment: string, minimum: number, label: string): Promise<void> {
  const deadline = Date.now() + 15000;
  for (;;) {
    if ((await countBlockedStatements(h.client, { fragment, applicationName })) >= minimum) return;
    if (Date.now() > deadline) assert.fail(`timeout esperando ${minimum} statements bloqueados em ${fragment} — ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function linkedDepositedCheque(h: Harness, s: Seed): Promise<string> {
  const cheque = await h.chequeService.create(s.actor, {
    account_id: s.accountId, title_id: s.titleId, direction: "received", cheque_number: `K11-${Math.random().toString(16).slice(2, 10)}`,
    bank: "Banco K11", amount: 100,
  });
  await h.chequeService.deposit(s.actor, cheque.id);
  return cheque.id;
}

type WinnerKind = "linked-clear" | "pay-pix" | "status-scheduled" | "status-in-dispute-after-scheduled";

async function holdWinner(h: Harness, s: Seed, kind: WinnerKind, chequeId?: string) {
  const occurredAt = new Date();
  const period = h.deriveCompetencia(occurredAt);
  let release!: () => void;
  const mayCommit = new Promise<void>((resolve) => {
    release = resolve;
  });
  let markUpdated!: () => void;
  const updated = new Promise<void>((resolve) => {
    markUpdated = resolve;
  });
  let ready!: () => void;
  const isReady = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const tx = h.client.$transaction(
    async (txClient: any) => {
      await h.setTenantRlsContext(txClient, s.tenantId);
      const titles = new h.PrismaFinancialTitleRepository(txClient);
      if (kind === "linked-clear") {
        await h.acquirePeriodLockShared(txClient, s.tenantId, period);
        const cheques = new h.PrismaChequeRepository(txClient);
        const reserved = await cheques.transition({ tenantId: s.tenantId, chequeId: chequeId!, fromStatus: "deposited", toStatus: "cleared", clearedEntryId: null, updatedBy: s.actor.userId });
        assert.ok(reserved?.titleId);
        const entry = await new h.PrismaFinancialEntryRepository(txClient).create({
          tenantId: s.tenantId, accountId: s.accountId, titleId: reserved.titleId, direction: "in", amount: 100, currency: "BRL",
          paymentMethod: "check", category: "cheque_clearing", occurredAt, competencia: period, createdBy: s.actor.userId, updatedBy: s.actor.userId,
        });
        assert.ok(await titles.applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: reserved.titleId, amount: 100, updatedBy: s.actor.userId }));
        assert.ok(await cheques.attachClearingEntry(s.tenantId, chequeId!, entry.id, s.actor.userId));
        ready();
      } else if (kind === "pay-pix") {
        await h.acquirePeriodLockShared(txClient, s.tenantId, period);
        await new h.PrismaFinancialEntryRepository(txClient).create({
          tenantId: s.tenantId, accountId: s.accountId, titleId: s.titleId, direction: "in", amount: 100, currency: "BRL",
          paymentMethod: "pix", occurredAt, competencia: period, createdBy: s.actor.userId, updatedBy: s.actor.userId,
        });
        assert.ok(await titles.applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: s.titleId, amount: 100, updatedBy: s.actor.userId }));
        ready();
      } else if (kind === "status-scheduled") {
        assert.ok(await titles.changeStatus({ tenantId: s.tenantId, financialTitleId: s.titleId, fromStatus: "open", status: "scheduled" }));
        ready();
      } else {
        // W2: entra na fila atrás de W1 (e do perdedor). O predicado aceita a versão VISÍVEL no snapshot (open — W1 ainda
        // não commitou), senão o scan nem a consideraria e W2 não entraria na fila; quando W1 commita, a re-checagem
        // (EvalPlanQual) roda sobre a tupla nova (scheduled) e casa.
        const pending = txClient.$executeRawUnsafe(
          `UPDATE financial_titles SET status = 'in_dispute' WHERE tenant_id = $1::uuid AND id = $2::uuid AND status IN ('open', 'scheduled')`,
          s.tenantId,
          s.titleId,
        );
        ready();
        assert.equal(await pending, 1, "W2 casa a tupla que W1 deixou (scheduled)");
        markUpdated();
      }
      await mayCommit;
    },
    { timeout: 30000, maxWait: 10000 },
  );
  const settled = settle(tx);
  let holding = false;
  await Promise.race([
    isReady.then(() => {
      holding = true;
    }),
    settled.outcome.then((o) => {
      if (!holding) assert.fail(`o vencedor morreu antes de segurar: ${String((o.error as Error)?.message ?? o.error)}`);
    }),
  ]);
  return {
    release,
    updated,
    done: settled.outcome.then((o) => {
      assert.equal(o.rejected, false, `transação do vencedor: ${String((o.error as Error)?.message ?? o.error)}`);
    }),
  };
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;
type Seed = Awaited<ReturnType<typeof seed>>;

async function bootstrap(connection: string) {
  const [
    { PrismaPg }, { PrismaClient }, { env }, { setTenantRlsContext, withTenantRls }, { acquirePeriodLockShared }, titles, entries, cheques,
    { PrismaFinancialTitleRepository }, { PrismaChequeRepository }, { PrismaFinancialEntryRepository },
  ] = await Promise.all([
    import("@prisma/adapter-pg"), import("@prisma/client"), import("../src/config/env.js"), import("../src/database/rls.js"),
    import("../src/database/financial-period-lock.js"),
    import("../src/modules/financial-titles/index.js"), import("../src/modules/financial-entries/index.js"),
    import("../src/modules/cheques/index.js"),
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
    import("../src/modules/cheques/cheque-prisma.repository.js"),
    import("../src/modules/financial-entries/financial-entry-prisma.repository.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  return {
    client,
    withTenantRls,
    setTenantRlsContext,
    acquirePeriodLockShared,
    PrismaFinancialTitleRepository,
    PrismaChequeRepository,
    PrismaFinancialEntryRepository,
    deriveCompetencia: titles.deriveCompetencia,
    titleService: await titles.createDefaultFinancialTitleService(),
    entryService: await entries.createDefaultFinancialEntryService(),
    chequeService: await cheques.createDefaultChequeService(),
    repo: new PrismaFinancialTitleRepository(client),
    tenantIds: [] as string[],
  };
}

async function withHarness(connection: string, tag: string, work: (h: Harness, s: Seed) => Promise<void>) {
  const h = await bootstrap(connection);
  try {
    await work(h, await seed(h, tag));
  } finally {
    await teardown(h);
  }
}

async function seed(h: Harness, tag: string) {
  const mark = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tenant = await h.client.tenant.create({ data: { name: `CAS ${mark}`, slug: `cas-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: {
    tenant_id: tenant.id, name: "Financeiro CAS", email: `${mark}@example.com`,
  } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: {
    tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true,
  } }));
  const title = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: {
    tenant_id: tenant.id, direction: "receivable", party_type: "customer", party_name: `Cliente ${mark}`,
    amount: 100, currency: "BRL", issue_date: new Date(), due_date: new Date(), paid_amount: 0,
    status: "open", competencia: h.deriveCompetencia(new Date()),
  } }));
  return {
    tenantId: tenant.id,
    titleId: title.id,
    accountId: account.id,
    // B-SAN3-20 (retomada): o cheque vinculado de K11a/c compensa e devolve — exige a permissão de mover caixa.
    actor: {
      tenantId: tenant.id,
      userId: user.id,
      roles: ["finance" as const],
      permissions: ["cheques:read" as const, "cheques:create" as const, "cheques:update" as const, "financial_entries:create" as const],
    },
  };
}

function domain(error: unknown, statusCode: number, reason: string): boolean {
  return typeof error === "object" && error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason;
}

async function teardown(h: Harness) {
  try {
    for (const tenantId of h.tenantIds) {
      await h.client.$executeRawUnsafe("delete from cheques where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_titles where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_accounts where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from audit_logs where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from users where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from tenants where id=$1::uuid", tenantId);
    }
  } finally {
    await h.client.$disconnect();
  }
}
