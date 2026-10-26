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
// B-SAN3-12a — as corridas do §4.2/§4.3 do plano v3 contra o PostgreSQL REAL, com barreira determinística:
//   A4 (b)  o vínculo commita DEPOIS do fast-fail do pay e ANTES do lock do título → o re-check (sob o lock) recusa;
//   A4 (c)  o pay trava primeiro → o vínculo bloqueia no FOR UPDATE do título e relê o título pago → title_already_paid;
//   A4-bis  clear × pay → o perdedor sai com {title_has_pending_cheque, title_already_paid}; invariante final;
//   A25     vincular roda em UMA transação que trava a linha do título (pg_locks + sonda NOWAIT 55P03);
//   A5-bis  unlink-title × clear → exatamente um vence; e o CAS do desvínculo casa 0 linhas se o título lido mudou.
// Invariante final de todas: NUNCA "título pago por outro meio E cheque pendente vinculado".
// A barreira é escopada por `application_name` (helpers/pg-barrier): só statement da PRÓPRIA suíte a satisfaz.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("b-san3-12a-pay-link-race");

if (!connectionString) {
  test("B-SAN3-12a corridas pay × vincular exigem DATABASE_URL e banco migrado", {
    skip: "Defina DATABASE_URL e aplique as migrations.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("A4 (b, db): o vínculo commita entre o fast-fail e o lock do pay → 422 title_has_pending_cheque; nada criado; o vínculo fica", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a4b");
      const loose = await h.chequeService.create(s.actor, chequeBody(s, undefined));
      // Barreira 1 (determinística): o pay já passou o fast-fail (nenhum cheque pendente) e vai abrir a unidade;
      // AQUI o vínculo commita na transação dele.
      const pay = h.entryServiceWith(async () => {
        await h.chequeService.update(s.actor, loose.id, { title_id: s.titleId });
      });
      const outcome = await captureSettled(pay.payTitle(s.actor, s.titleId, pix(s)));
      expectReason(outcome, 422, "title_has_pending_cheque", "pay perdedor");
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s.tenantId } }), 0, "nenhum lançamento");
      const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
      assert.equal(Number(title.paid_amount), 0);
      const cheque = await h.client.cheque.findUniqueOrThrow({ where: { id: loose.id } });
      assert.equal(cheque.title_id, s.titleId, "o vínculo venceu e ficou");
      await expectInvariant(h, s);
    } finally {
      await teardown(h);
    }
  });

  test("A4 (c, db): o pay trava o título primeiro → o vínculo BLOQUEIA no FOR UPDATE do título e sai 422 title_already_paid", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a4c");
      const loose = await h.chequeService.create(s.actor, chequeBody(s, undefined));
      const gate = holdGate();
      // O pay REAL roda a unidade inteira e segura o commit (barreira 2) com o título travado e já pago.
      const pay = captureSettled(h.entryServiceHolding(gate).payTitle(s.actor, s.titleId, pix(s)));
      await gate.reached;
      const link = captureSettled(h.chequeService.update(s.actor, loose.id, { title_id: s.titleId }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_titles", label: "vínculo perdedor no FOR UPDATE do título" });
      gate.release();
      const payOutcome = await pay;
      assert.equal(payOutcome.status, "fulfilled", `pay vencedor: ${describe(payOutcome)}`);
      expectReason(await link, 422, "title_already_paid", "vínculo perdedor");
      const cheque = await h.client.cheque.findUniqueOrThrow({ where: { id: loose.id } });
      assert.equal(cheque.title_id, null, "o vínculo perdedor não gravou");
      await expectInvariant(h, s);
    } finally {
      await teardown(h);
    }
  });

  test("A4-bis (db): clear × pay — com o clear em voo o pay sai title_has_pending_cheque; com o clear commitado, title_already_paid; invariante final", async () => {
    const h = await bootstrap(connection);
    try {
      // (i) clear segurado com a transição feita e o título liquidado, sem commit.
      const s1 = await seed(h, "a4bis-i");
      const c1 = await h.chequeService.create(s1.actor, chequeBody(s1, s1.titleId));
      await h.chequeService.deposit(s1.actor, c1.id);
      const gate = holdGate();
      const clear = captureSettled(h.chequeServiceHolding(gate).clear(s1.actor, c1.id));
      await gate.reached;
      expectReason(await captureSettled(h.entryService.payTitle(s1.actor, s1.titleId, pix(s1))), 422, "title_has_pending_cheque", "pay com clear em voo");
      gate.release();
      assert.equal((await clear).status, "fulfilled", "clear vencedor");
      await expectInvariant(h, s1);
      const t1 = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s1.titleId } });
      assert.equal(t1.status, "paid");
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s1.tenantId } }), 1, "um lançamento só (o da compensação)");

      // (ii) clear commitado antes do pay.
      const s2 = await seed(h, "a4bis-ii");
      const c2 = await h.chequeService.create(s2.actor, chequeBody(s2, s2.titleId));
      await h.chequeService.deposit(s2.actor, c2.id);
      await h.chequeService.clear(s2.actor, c2.id);
      expectReason(await captureSettled(h.entryService.payTitle(s2.actor, s2.titleId, pix(s2))), 422, "title_already_paid", "pay depois do clear");
      await expectInvariant(h, s2);
    } finally {
      await teardown(h);
    }
  });

  test("A25 (db): vincular trava a linha do título na transação do vínculo — RowShareLock em financial_titles e NOWAIT 55P03 enquanto ela está aberta", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a25");
      const gate = holdGate();
      const create = captureSettled(h.chequeServiceHolding(gate).create(s.actor, chequeBody(s, s.titleId)));
      await gate.reached;
      const locks = (await h.client.$queryRaw`
        SELECT count(*)::int AS n FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
         WHERE l.relation = 'financial_titles'::regclass AND l.mode = 'RowShareLock' AND a.application_name = ${applicationName}
           AND l.pid <> pg_backend_pid()
      `) as Array<{ n: number }>;
      assert.ok((locks[0]?.n ?? 0) >= 1, "a transação do vínculo tem o RowShareLock do SELECT … FOR UPDATE em financial_titles");
      const probe = await captureSettled(h.client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '2s'");
        return tx.$queryRawUnsafe(`SELECT id FROM financial_titles WHERE id = '${s.titleId}'::uuid FOR UPDATE NOWAIT`);
      }));
      assert.equal(probe.status, "rejected", "a linha do título está travada pelo vínculo");
      assert.match(String((probe as { reason: unknown }).reason), /55P03|could not obtain lock|lock_not_available/i);
      gate.release();
      assert.equal((await create).status, "fulfilled");
    } finally {
      await teardown(h);
    }
  });

  test("A5-bis (db): unlink-title × clear — com o clear em voo o unlink bloqueia e sai 409 cheque_write_conflict; unlink primeiro → o clear posta caixa SEM título e o título segue liquidável", async () => {
    const h = await bootstrap(connection);
    try {
      const s1 = await seed(h, "a5bis-i");
      const c1 = await h.chequeService.create(s1.actor, chequeBody(s1, s1.titleId));
      await h.chequeService.deposit(s1.actor, c1.id);
      const gate = holdGate();
      const clear = captureSettled(h.chequeServiceHolding(gate).clear(s1.actor, c1.id));
      await gate.reached;
      const unlink = captureSettled(h.chequeService.unlinkTitle(s1.admin, c1.id, { justification: "troca para pix no balcão" }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "cheques", label: "unlink perdedor no CAS do cheque" });
      gate.release();
      assert.equal((await clear).status, "fulfilled");
      expectReason(await unlink, 409, "cheque_write_conflict", "unlink perdedor");
      const after1 = await h.client.cheque.findUniqueOrThrow({ where: { id: c1.id } });
      assert.equal(after1.status, "cleared");
      assert.equal(after1.title_id, s1.titleId);

      const s2 = await seed(h, "a5bis-ii");
      const c2 = await h.chequeService.create(s2.actor, chequeBody(s2, s2.titleId));
      await h.chequeService.deposit(s2.actor, c2.id);
      const unlinked = await h.chequeService.unlinkTitle(s2.admin, c2.id, { justification: "troca para pix no balcão" });
      assert.equal(unlinked.warning, "cheque_still_depositable");
      await h.chequeService.clear(s2.actor, c2.id);
      const entries = await h.client.financialEntry.findMany({ where: { tenant_id: s2.tenantId } });
      assert.equal(entries.length, 1);
      assert.equal(entries[0]?.title_id, null, "o clear depois do desvínculo posta caixa SEM título (R-res-3)");
      const t2 = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s2.titleId } });
      assert.equal(t2.status, "open", "o título segue liquidável por outro meio");
      await h.entryService.payTitle(s2.actor, s2.titleId, pix(s2));
      await expectInvariant(h, s2);
    } finally {
      await teardown(h);
    }
  });

  test("A5-bis (db, CAS): o desvínculo com o título LIDO diferente do atual casa 0 linhas (o WHERE carrega title_id = <lido>)", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a5bis-cas");
      const other = await h.withTenantRls(h.client, s.tenantId, (tx) => tx.financialTitle.create({ data: titleData(s.tenantId, "Outro") }));
      const cheque = await h.chequeService.create(s.actor, chequeBody(s, s.titleId));
      // A troca de título é unlink-title (justificativa + auditoria) e depois o 1º vínculo (D1 da Emenda E1: o PATCH não troca).
      await h.chequeService.unlinkTitle(s.admin, cheque.id, { justification: "troca para o título correto" });
      await h.chequeService.update(s.actor, cheque.id, { title_id: other.id });
      const repo = await h.createPrismaChequeRepository();
      assert.equal(await repo.unlinkTitle({ tenantId: s.tenantId, chequeId: cheque.id, expectedTitleId: s.titleId }), undefined);
      assert.equal((await h.client.cheque.findUniqueOrThrow({ where: { id: cheque.id } })).title_id, other.id, "o vínculo novo sobreviveu");
      const ok = await repo.unlinkTitle({ tenantId: s.tenantId, chequeId: cheque.id, expectedTitleId: other.id });
      assert.equal(ok?.titleId, undefined);
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
  const reached = new Promise<void>((resolve) => (arrive = resolve));
  const wait = new Promise<void>((resolve) => (release = resolve));
  return { reached, release, arrive, wait };
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

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { withTenantRls },
    cheques,
    entries,
    titles,
    { createPrismaChequeRepository },
    { createPrismaFinancialEntryRepository, createPrismaAccountReader },
    { createPrismaFinancialPeriodCloseRepository },
    { createPrismaFinancialUnitOfWork },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/cheques/index.js"),
    import("../src/modules/financial-entries/index.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/cheques/cheque-prisma.repository.js"),
    import("../src/modules/financial-entries/financial-entry-prisma.repository.js"),
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
    import("../src/modules/financial-uow/financial-uow-prisma.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  const [entryRepository, accountReader, periodCloseRepository, chequeRepository] = await Promise.all([
    createPrismaFinancialEntryRepository(),
    createPrismaAccountReader(),
    createPrismaFinancialPeriodCloseRepository(),
    createPrismaChequeRepository(),
  ]);
  const realUow = await createPrismaFinancialUnitOfWork();
  const entryServiceWith = (beforeRun: () => Promise<void>) =>
    new entries.FinancialEntryService(entryRepository, periodCloseRepository, accountReader, titles.createDefaultFinancialTitleService, async () => ({
      run: async (tenantId, work) => {
        await beforeRun();
        return realUow.run(tenantId, work);
      },
    }));
  // O UoW REAL que segura o COMMIT: roda o `work` inteiro (locks tomados, escritas feitas) e espera o portão.
  const holdingUow = (gate: Gate) => async (): Promise<FinancialUnitOfWork> => ({
    run: (tenantId, work) =>
      realUow.run(tenantId, async (ctx) => {
        const result = await work(ctx);
        gate.arrive();
        await gate.wait;
        return result;
      }),
  });
  return {
    client,
    withTenantRls,
    createPrismaChequeRepository,
    deriveCompetencia: titles.deriveCompetencia,
    chequeService: await cheques.createDefaultChequeService(),
    entryService: await entries.createDefaultFinancialEntryService(),
    entryServiceWith,
    entryServiceHolding: (gate: Gate) =>
      new entries.FinancialEntryService(entryRepository, periodCloseRepository, accountReader, titles.createDefaultFinancialTitleService, holdingUow(gate)),
    chequeServiceHolding: (gate: Gate) => new cheques.ChequeService(chequeRepository, accountReader, holdingUow(gate)),
    tenantIds: [] as string[],
  };
}

function titleData(tenantId: string, party: string, amount = 100) {
  return {
    tenant_id: tenantId, direction: "receivable", party_type: "customer", party_name: party, amount, currency: "BRL",
    issue_date: new Date(), due_date: new Date(), paid_amount: 0, status: "open", competencia: currentCompetencia(),
  };
}

let competenciaFn: ((d: Date) => string) | undefined;
function currentCompetencia(): string {
  return competenciaFn!(new Date());
}

async function seed(h: Harness, tag: string) {
  competenciaFn = h.deriveCompetencia;
  const mark = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tenant = await h.client.tenant.create({ data: { name: `SAN312a ${mark}`, slug: `san312a-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro 12a", email: `${mark}@example.com` } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: {
    tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true,
  } }));
  const title = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: titleData(tenant.id, `Parte ${mark}`) }));
  const base = ["cheques:read", "cheques:create", "cheques:update", "financial_entries:create", "financial_entries:read"] as const;
  return {
    tenantId: tenant.id,
    accountId: account.id,
    titleId: title.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: ["finance" as const], permissions: [...base] },
    admin: { tenantId: tenant.id, userId: user.id, roles: ["tenant_admin" as const], permissions: [...base, "cheques:unlink_title" as const] },
  };
}

function chequeBody(s: Awaited<ReturnType<typeof seed>>, titleId: string | undefined) {
  return { account_id: s.accountId, title_id: titleId, direction: "received", cheque_number: `R12A-${Math.random().toString(16).slice(2, 12)}`, bank: "Banco 12a", amount: 100 };
}

const pix = (s: Awaited<ReturnType<typeof seed>>) => ({ account_id: s.accountId, amount: 100, payment_method: "pix" });

/** Nunca "título pago por OUTRO meio E cheque pendente vinculado a ele". */
async function expectInvariant(h: Harness, s: Awaited<ReturnType<typeof seed>>): Promise<void> {
  const title = await h.client.financialTitle.findUniqueOrThrow({ where: { id: s.titleId } });
  const pending = await h.client.cheque.count({ where: { tenant_id: s.tenantId, title_id: s.titleId, deleted_at: null, status: { in: ["registered", "deposited"] } } });
  const paidByOther = await h.client.financialEntry.count({ where: { tenant_id: s.tenantId, title_id: s.titleId, deleted_at: null, payment_method: { not: "check" } } });
  assert.ok(!(paidByOther > 0 && pending > 0), `estado proibido: pago por outro meio (${paidByOther}) com cheque pendente vinculado (${pending}); título ${title.status}`);
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
