import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedStatement,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";
import type { FinancialUnitOfWork } from "../src/modules/financial-uow/index.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a, ciclo 2 — A29 do plano de resolução (`B-SAN3-12-plano.md`, "Ciclo 2 (12a)", E2.1) contra o PostgreSQL REAL.
// O defeito que a junta achou (C4-03, C4-04): o PATCH do valor e o DELETE do título liam o conjunto "cheque pendente do
// título" FORA da transação que grava, e a escrita standalone não relia nada sob o lock — um vínculo que commitava no
// meio deixava título de 150 (ou apagado) com cheque de 100 pendente vinculado.
//   A29-a  PATCH amount × vínculo em voo  → o PATCH bloqueia no FOR UPDATE da unidade, relê e sai 422 title_has_pending_cheque;
//   A29-b  vínculo × PATCH amount em voo  → o vínculo bloqueia, relê o valor novo e sai 422 cheque_amount_mismatch (controle);
//   A29-c  DELETE × vínculo em voo        → o DELETE bloqueia, relê e sai 422 title_has_pending_cheque (a prova concorrente
//                                           que fecha P-SAN3-20-DELETE-TITULO-COM-CHEQUE);
//   A29-d  vínculo × DELETE em voo        → o vínculo bloqueia e sai invalid_title_reference (controle);
//   A29-g  N=20 rodadas sem barreira de cada par (regressão; a prova é a barreira de a/c);
//   A29-h  o período fecha entre o fast-fail e a unidade → a trava SHARED da unidade recusa (period_closed).
// O vencedor é SQL próprio numa transação aberta (o portão decide o commit); o perdedor é o SERVIÇO Prisma. Nunca relógio:
// a barreira é `waitForOwnBlockedStatement`, escopada pelo `application_name` da suíte. Nenhuma corrida termina em deadlock.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("b-san3-12a-title-mutation-race");

if (!connectionString) {
  test("B-SAN3-12a corridas PATCH/DELETE do título × vínculo exigem DATABASE_URL e banco migrado", {
    skip: "Defina DATABASE_URL e aplique as migrations.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("A29-a (db, barreira): vínculo em voo × PATCH amount → o PATCH passa o fast-fail, BLOQUEIA no FOR UPDATE do título e sai 422 title_has_pending_cheque; FINAL amount=100 com 1 pendente", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a29a");
      const winner = holdWinner(h, s.tenantId, async (tx) => {
        await lockTitle(tx, s);
        await insertLinkedCheque(tx, s, 100);
      });
      await reached(winner);
      const loser = captureSettled(h.titleService.update(s.actor, s.titleId, { amount: 150 }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "PATCH perdedor no FOR UPDATE do título" });
      winner.gate.release();
      const won = await winner.done;
      assert.equal(won.status, "fulfilled", `vencedor: ${describe(won)}`);
      const lost = await loser;
      expectNoDeadlock(lost);
      expectReason(lost, 422, "title_has_pending_cheque", "PATCH perdedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(Number(title.amount), 100, "o valor não mudou");
      assert.equal(title.deleted_at, null);
      assert.equal(await pendingCount(h, s), 1, "o vínculo venceu e ficou");
    } finally {
      await teardown(h);
    }
  });

  test("A29-b (db, barreira, controle): PATCH amount=150 em voo × vínculo → o vínculo BLOQUEIA no FOR UPDATE e sai 422 cheque_amount_mismatch; FINAL amount=150 e 0 pendentes", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a29b");
      const winner = holdWinner(h, s.tenantId, async (tx) => {
        await lockTitle(tx, s);
        await tx.$executeRaw`UPDATE financial_titles SET amount = 150 WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.titleId}::uuid`;
      });
      await reached(winner);
      const loser = captureSettled(h.chequeService.create(s.actor, chequeBody(s, s.titleId)));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "vínculo perdedor no FOR UPDATE do título" });
      winner.gate.release();
      assert.equal((await winner.done).status, "fulfilled");
      const lost = await loser;
      expectNoDeadlock(lost);
      expectReason(lost, 422, "cheque_amount_mismatch", "vínculo perdedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(Number(title.amount), 150);
      assert.equal(await pendingCount(h, s), 0, "o vínculo perdedor não gravou");
    } finally {
      await teardown(h);
    }
  });

  test("A29-c (db, barreira): vínculo em voo × DELETE do título → o DELETE BLOQUEIA no FOR UPDATE e sai 422 title_has_pending_cheque; FINAL título vivo com 1 pendente", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a29c");
      const winner = holdWinner(h, s.tenantId, async (tx) => {
        await lockTitle(tx, s);
        await insertLinkedCheque(tx, s, 100);
      });
      await reached(winner);
      const loser = captureSettled(h.titleService.delete(s.actor, s.titleId));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "DELETE perdedor no FOR UPDATE do título" });
      winner.gate.release();
      assert.equal((await winner.done).status, "fulfilled");
      const lost = await loser;
      expectNoDeadlock(lost);
      expectReason(lost, 422, "title_has_pending_cheque", "DELETE perdedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(title.deleted_at, null, "o título não foi apagado");
      assert.equal(await pendingCount(h, s), 1);
    } finally {
      await teardown(h);
    }
  });

  test("A29-d (db, barreira, controle): DELETE em voo × vínculo → o vínculo BLOQUEIA e sai invalid_title_reference; FINAL título apagado e 0 pendentes", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a29d");
      const winner = holdWinner(h, s.tenantId, async (tx) => {
        await lockTitle(tx, s);
        await tx.$executeRaw`UPDATE financial_titles SET deleted_at = now() WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.titleId}::uuid`;
      });
      await reached(winner);
      const loser = captureSettled(h.chequeService.create(s.actor, chequeBody(s, s.titleId)));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "vínculo perdedor no FOR UPDATE do título apagado" });
      winner.gate.release();
      assert.equal((await winner.done).status, "fulfilled");
      const lost = await loser;
      expectNoDeadlock(lost);
      // O status medido é 400 (`invalidTitleReferenceError`, cheque.repository.ts); o plano cita "422" — o `reason` é o critério.
      expectReason(lost, 400, "invalid_title_reference", "vínculo perdedor");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.notEqual(title.deleted_at, null);
      assert.equal(await pendingCount(h, s), 0);
    } finally {
      await teardown(h);
    }
  });

  for (const op of ["update", "delete"] as const) {
    test(`A29-g (db, N=20, sem barreira): Promise.all([vincular, ${op === "update" ? "PATCH amount=150" : "DELETE"}]) → toda rodada termina com um ok e um 422/400 do conjunto; nunca título mudado/apagado com cheque pendente`, async () => {
      const h = await bootstrap(connection);
      try {
        const s = await seed(h, `a29g-${op}`);
        const allowed = new Map([["title_has_pending_cheque", 422], ["cheque_amount_mismatch", 422], ["invalid_title_reference", 400]]);
        for (let round = 0; round < 20; round += 1) {
          const titleId = await newTitle(h, s, `g-${op}-${round}`);
          const mutate = op === "update" ? h.titleService.update(s.actor, titleId, { amount: 150 }) : h.titleService.delete(s.actor, titleId);
          const outcomes = await Promise.all([captureSettled(h.chequeService.create(s.actor, chequeBody(s, titleId))), captureSettled(mutate)]);
          const ok = outcomes.filter((o) => o.status === "fulfilled").length;
          assert.equal(ok, 1, `rodada ${round}: exatamente um vence (${outcomes.map(describe).join(" | ")})`);
          for (const outcome of outcomes) {
            if (outcome.status === "fulfilled") continue;
            expectNoDeadlock(outcome);
            const error = (outcome as { reason: { statusCode?: number; reason?: string } }).reason;
            assert.equal(allowed.get(error?.reason ?? ""), error?.statusCode, `rodada ${round}: perdedor fora do conjunto (${describe(outcome)})`);
          }
          const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: titleId } });
          const pending = await h.client.cheque.count({ where: { tenant_id: s.tenantId, title_id: titleId, deleted_at: null, status: { in: ["registered", "deposited"] } } });
          const changed = Number(title.amount) !== 100 || title.deleted_at !== null;
          assert.ok(!(changed && pending > 0), `rodada ${round}: estado proibido — amount=${Number(title.amount)} apagado=${title.deleted_at !== null} com ${pending} pendente(s)`);
        }
      } finally {
        await teardown(h);
      }
    });
  }

  test("A29-h (db): o período fecha DEPOIS do fast-fail e ANTES da unidade → PATCH e DELETE saem 422 period_closed pela trava SHARED da unidade; nada gravado", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a29h");
      const competencia = h.deriveCompetencia(new Date());
      const closeBeforeUnit = () => h.titleServiceWith(async () => {
        await h.withTenantRls(h.client, s.tenantId, (tx) => tx.financialPeriodClose.create({ data: { tenant_id: s.tenantId, period: competencia, status: "closed" } as never }));
      });
      expectReason(await captureSettled(closeBeforeUnit().update(s.actor, s.titleId, { amount: 150 })), 422, "period_closed", "PATCH com o período fechado no meio");
      await h.client.$executeRawUnsafe("delete from financial_period_closes where tenant_id=$1::uuid", s.tenantId);
      expectReason(await captureSettled(closeBeforeUnit().delete(s.actor, s.titleId)), 422, "period_closed", "DELETE com o período fechado no meio");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(Number(title.amount), 100);
      assert.equal(title.deleted_at, null);
    } finally {
      await teardown(h);
    }
  });
}

// ------------------------------------------------------------------------------------------- arnês

type Gate = { readonly reached: Promise<void>; readonly release: () => void; readonly arrive: () => void; readonly wait: Promise<void> };

function holdGate(): Gate {
  let arrive!: () => void;
  let release!: () => void;
  const reachedPromise = new Promise<void>((resolve) => (arrive = resolve));
  const wait = new Promise<void>((resolve) => (release = resolve));
  return { reached: reachedPromise, release, arrive, wait };
}

type TxClient = { $executeRaw: (q: TemplateStringsArray, ...v: unknown[]) => Promise<number>; $queryRaw: (q: TemplateStringsArray, ...v: unknown[]) => Promise<unknown> };
type Winner = { readonly gate: Gate; readonly done: Promise<SettledOutcome<unknown>> };

/** O VENCEDOR: SQL próprio numa transação aberta com o contexto do tenant; o portão decide quando commita. */
function holdWinner(h: Harness, tenantId: string, statements: (tx: TxClient) => Promise<void>): Winner {
  const gate = holdGate();
  const done = captureSettled(
    h.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      await statements(tx as unknown as TxClient);
      gate.arrive();
      await gate.wait;
    }, { maxWait: 10_000, timeout: 60_000 }),
  );
  return { gate, done };
}

async function reached(winner: Winner): Promise<void> {
  await Promise.race([
    winner.gate.reached,
    winner.done.then((outcome) => {
      throw new Error(`o vencedor terminou antes da barreira: ${describe(outcome)}`);
    }),
  ]);
}

async function lockTitle(tx: TxClient, s: Seed): Promise<void> {
  await tx.$queryRaw`SELECT id FROM financial_titles WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.titleId}::uuid FOR UPDATE`;
}

async function insertLinkedCheque(tx: TxClient, s: Seed, amount: number): Promise<void> {
  const number = `W12A-${Math.random().toString(16).slice(2, 12)}`;
  await tx.$executeRaw`
    INSERT INTO cheques (tenant_id, account_id, direction, cheque_number, bank, amount, currency, status, title_id)
    VALUES (${s.tenantId}::uuid, ${s.accountId}::uuid, 'received', ${number}, 'Banco 12a', ${amount}::numeric(12,2), 'BRL', 'registered', ${s.titleId}::uuid)
  `;
}

function describe(outcome: SettledOutcome<unknown>): string {
  return outcome.status === "fulfilled" ? "fulfilled" : String((outcome.reason as { reason?: string; message?: string })?.reason ?? (outcome.reason as Error)?.message ?? outcome.reason);
}

function expectReason(outcome: SettledOutcome<unknown>, statusCode: number, reason: string, label: string): void {
  assert.equal(outcome.status, "rejected", `${label}: era para recusar e passou`);
  const error = (outcome as { reason: { statusCode?: number; reason?: string } }).reason;
  assert.equal(error?.statusCode, statusCode, `${label}: status (${describe(outcome)})`);
  assert.equal(error?.reason, reason, `${label}: motivo`);
}

/** R2 do plano: nenhuma das corridas termina em deadlock (ordem de travas período → título → leitura de cheques). */
function expectNoDeadlock(outcome: SettledOutcome<unknown>): void {
  if (outcome.status === "fulfilled") return;
  const reason = outcome.reason as { message?: string; code?: string };
  assert.doesNotMatch(`${reason?.code ?? ""} ${reason?.message ?? ""}`, /40P01|deadlock detected/i, "a corrida terminou em deadlock");
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;
type Seed = Awaited<ReturnType<typeof seed>>;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { withTenantRls },
    cheques,
    titles,
    { createPrismaFinancialTitleRepository, createPrismaFinancialPeriodCloseRepository },
    { createPrismaFinancialUnitOfWork },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/cheques/index.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
    import("../src/modules/financial-uow/financial-uow-prisma.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  const [titleRepository, periodCloseRepository, realUow] = await Promise.all([
    createPrismaFinancialTitleRepository(),
    createPrismaFinancialPeriodCloseRepository(),
    createPrismaFinancialUnitOfWork(),
  ]);
  // O serviço de títulos REAL com um gancho entre o fast-fail e a unidade (o período fecha ali — A29-h).
  const titleServiceWith = (beforeRun: () => Promise<void>) =>
    new titles.FinancialTitleService(titleRepository, periodCloseRepository, async () => true, async (): Promise<FinancialUnitOfWork> => ({
      run: async (tenantId, work) => {
        await beforeRun();
        return realUow.run(tenantId, work);
      },
    }));
  return {
    client,
    withTenantRls,
    deriveCompetencia: titles.deriveCompetencia,
    chequeService: await cheques.createDefaultChequeService(),
    titleService: await titles.createDefaultFinancialTitleService(),
    titleServiceWith,
    tenantIds: [] as string[],
  };
}

function titleData(tenantId: string, party: string, competencia: string) {
  return {
    tenant_id: tenantId, direction: "receivable", party_type: "customer", party_name: party, amount: 100, currency: "BRL",
    issue_date: new Date(), due_date: new Date(), paid_amount: 0, status: "open", competencia,
  };
}

async function newTitle(h: Harness, s: Seed, tag: string): Promise<string> {
  const title = await h.withTenantRls(h.client, s.tenantId, (tx) => tx.financialTitle.create({ data: titleData(s.tenantId, `Parte ${tag}`, h.deriveCompetencia(new Date())) }));
  return title.id;
}

async function seed(h: Harness, tag: string) {
  const mark = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tenant = await h.client.tenant.create({ data: { name: `SAN312a ${mark}`, slug: `san312a-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro 12a", email: `${mark}@example.com` } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: {
    tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true,
  } }));
  const title = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: titleData(tenant.id, `Parte ${mark}`, h.deriveCompetencia(new Date())) }));
  const permissions = ["cheques:read", "cheques:create", "cheques:update", "financial_titles:read", "financial_titles:update"] as const;
  return {
    tenantId: tenant.id,
    accountId: account.id,
    titleId: title.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: ["finance" as const], permissions: [...permissions] },
  };
}

function chequeBody(s: Seed, titleId: string) {
  return { account_id: s.accountId, title_id: titleId, direction: "received", cheque_number: `M12A-${Math.random().toString(16).slice(2, 12)}`, bank: "Banco 12a", amount: 100 };
}

async function pendingCount(h: Harness, s: Seed): Promise<number> {
  return h.client.cheque.count({ where: { tenant_id: s.tenantId, title_id: s.titleId, deleted_at: null, status: { in: ["registered", "deposited"] } } });
}

async function teardown(h: Harness): Promise<void> {
  try {
    for (const tenantId of h.tenantIds) {
      await h.client.$executeRawUnsafe("delete from cheques where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_titles where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_period_closes where tenant_id=$1::uuid", tenantId);
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
