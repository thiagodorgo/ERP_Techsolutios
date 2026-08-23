import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
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
// Nome unico desta suite (um processo por arquivo no `node --test`) - escopo da barreira (B-5).
const applicationName = buildApplicationName("title-invariants");

if (!connectionString) {
  test("Invariantes de título exigem DATABASE_URL e PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e aplique as migrations para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  // B-5 (ciclo 2 · C3): a tag da suite entra na URL ANTES de `src/database/prisma.ts` le-la no
  // import. Sem escopo, a barreira aceitava statement bloqueado de qualquer suite do lote.
  process.env.DATABASE_URL = withApplicationName(connectionString, applicationName);

  test("G7 — PATCH composto abaixo do pago retorna amount_below_paid e preserva projeção completa", async () => {
    await withHarness("g7-composto", async (h, s) => {
      await setPaid(h, s, 80);
      const before = await projection(h, s);
      await assert.rejects(
        h.titleService.update(s.actor, s.titleId, { amount: 50, party_name: "Outro", description: "Outra", category: "outra" }),
        (error: unknown) => domain(error, 422, "amount_below_paid"),
      );
      assert.deepEqual(await projection(h, s), before);
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s.tenantId } }), 0);
    });
  });

  test("G7 — pagamento primeiro: PATCH espera e reavalia o paid_amount commitado", async () => {
    await withHarness("g7-pay-first", async (h, s) => {
      const release = deferred();
      const ready = deferred();
      const winner = h.client.$transaction(async (tx) => {
        await h.setTenantRlsContext(tx, s.tenantId);
        await h.acquirePeriodLockShared(tx, s.tenantId, s.period);
        const applied = await new h.PrismaFinancialTitleRepository(tx).applyPaymentGuarded({
          tenantId: s.tenantId, financialTitleId: s.titleId, amount: 80, updatedBy: s.userId,
        });
        assert.ok(applied);
        ready.resolve();
        await release.promise;
      }, { timeout: 30000, maxWait: 10000 });
      // CAPTURA-LIQUIDADA (C3.1): handler no mesmo tique da criacao — a promessa atravessa `await`s.
      const winnerOutcome = captureSettled(winner);
      await ready.promise;
      const patch = captureSettled(h.titleService.update(s.actor, s.titleId, { amount: 50, party_name: "Não persiste" }));
      await waitBlocked(h.client, "financial_titles");
      release.resolve();
      expectAllFulfilled([await winnerOutcome], "pagamento vencedor");
      assert.equal(domain(expectRejected(await patch, "PATCH atras do pagamento"), 422, "amount_below_paid"), true);
      const row = await projection(h, s);
      assert.equal(row.amount, "100.00");
      assert.equal(row.party_name, s.partyName);
    });
  });

  test("G7 — PATCH primeiro: pagamento excedente faz rollback e não deixa lançamento órfão", async () => {
    await withHarness("g7-patch-first", async (h, s) => {
      const release = deferred();
      const ready = deferred();
      const patchTx = h.client.$transaction(async (tx) => {
        await h.setTenantRlsContext(tx, s.tenantId);
        await h.acquirePeriodLockShared(tx, s.tenantId, s.period);
        const result = await new h.PrismaFinancialTitleRepository(tx).update({
          tenantId: s.tenantId, financialTitleId: s.titleId, amount: 90, updatedBy: s.userId,
        });
        assert.equal(result.outcome, "updated");
        ready.resolve();
        await release.promise;
      }, { timeout: 30000, maxWait: 10000 });
      const patchOutcome = captureSettled(patchTx);
      await ready.promise;
      const payment = captureSettled(h.entryService.payTitle(s.actor, s.titleId, {
        account_id: s.accountId, amount: 95, payment_method: "pix",
      }));
      await waitBlocked(h.client, "financial_titles");
      release.resolve();
      expectAllFulfilled([await patchOutcome], "PATCH vencedor");
      assert.equal(domain(expectRejected(await payment, "pagamento atras do PATCH"), 422, "overpayment"), true);
      assert.equal(await h.client.financialEntry.count({ where: { tenant_id: s.tenantId } }), 0);
      assert.equal((await projection(h, s)).amount, "90.00");
    });
  });

  test("G7 — PATCH em igualdade paid_amount=amount deriva paid", async () => {
    await withHarness("g7-eq", async (h, s) => {
      await setPaid(h, s, 80);
      const title = await h.titleService.update(s.actor, s.titleId, { amount: 80 });
      assert.equal(title.paidAmount, 80);
      assert.equal(title.amount, 80);
      assert.equal(title.status, "paid");
    });
  });

  test("G7 — aumentar título quitado deriva partially_paid e pagamento posterior volta a paid", async () => {
    await withHarness("g7-grow", async (h, s) => {
      await h.client.financialTitle.update({ where: { id: s.titleId }, data: { amount: 80, paid_amount: 80, status: "paid" } });
      const title = await h.titleService.update(s.actor, s.titleId, { amount: 100 });
      assert.equal(title.status, "partially_paid");
      const entry = await h.entryService.payTitle(s.actor, s.titleId, { account_id: s.accountId, amount: 20, payment_method: "pix" });
      assert.equal(entry.titleId, s.titleId);
      assert.equal((await projection(h, s)).status, "paid");
    });
  });

  test("G7 — período fechado precede amount_below_paid no PATCH composto", async () => {
    await withHarness("g7-period", async (h, s) => {
      await setPaid(h, s, 80);
      await closePeriod(h, s);
      const before = await projection(h, s);
      await assert.rejects(
        h.titleService.update(s.actor, s.titleId, { amount: 50, party_name: "Não persiste", description: "Não persiste" }),
        (error: unknown) => domain(error, 422, "period_closed"),
      );
      assert.deepEqual(await projection(h, s), before);
    });
  });

  test("G7 — JWT real de outro tenant recebe 404 no PATCH e linha proprietária fica intacta", async () => {
    await withHarness("g7-cross", async (h, s) => {
      await setPaid(h, s, 80);
      const intruder = await seedTenant(h, "g7-intruder");
      const before = await projection(h, s);
      const { baseUrl, headers } = await startApi(h, intruder);
      const response = await request(baseUrl, `/api/v1/financial-titles/${s.titleId}`, "PATCH", headers, { amount: 50 });
      assert.equal(response.status, 404);
      assert.equal(response.body.error.reason, "title_not_found");
      assert.deepEqual(await projection(h, s), before);
    });
  });

  test("G8 — DELETE de título pago retorna title_has_payments e mantém deleted_at nulo", async () => {
    await withHarness("g8-paid", async (h, s) => {
      await setPaid(h, s, 40);
      await assert.rejects(h.titleService.delete(s.actor, s.titleId), (error: unknown) => domain(error, 422, "title_has_payments"));
      assert.equal((await projection(h, s)).deleted_at, null);
    });
  });

  test("G8 — após estorno total o DELETE volta a ser permitido", async () => {
    await withHarness("g8-reverse", async (h, s) => {
      const entry = await h.entryService.payTitle(s.actor, s.titleId, { account_id: s.accountId, amount: 100, payment_method: "pix" });
      await h.entryService.reverse(s.actor, entry.id);
      const deleted = await h.titleService.delete(s.actor, s.titleId);
      assert.ok(deleted.deletedAt);
    });
  });

  test("G8 — pagamento em voo commita primeiro; DELETE espera, reavalia e recusa", async () => {
    await withHarness("g8-race", async (h, s) => {
      const release = deferred();
      const ready = deferred();
      const payment = h.client.$transaction(async (tx) => {
        await h.setTenantRlsContext(tx, s.tenantId);
        await h.acquirePeriodLockShared(tx, s.tenantId, s.period);
        const applied = await new h.PrismaFinancialTitleRepository(tx).applyPaymentGuarded({ tenantId: s.tenantId, financialTitleId: s.titleId, amount: 30 });
        assert.ok(applied);
        ready.resolve();
        await release.promise;
      }, { timeout: 30000, maxWait: 10000 });
      const paymentOutcome = captureSettled(payment);
      await ready.promise;
      const deletion = captureSettled(h.titleService.delete(s.actor, s.titleId));
      await waitBlocked(h.client, "financial_titles");
      release.resolve();
      expectAllFulfilled([await paymentOutcome], "pagamento em voo");
      assert.equal(domain(expectRejected(await deletion, "DELETE atras do pagamento"), 422, "title_has_payments"), true);
      assert.equal((await projection(h, s)).deleted_at, null);
    });
  });

  test("G8 — período fechado precede title_has_payments no DELETE", async () => {
    await withHarness("g8-period", async (h, s) => {
      await setPaid(h, s, 20);
      await closePeriod(h, s);
      await assert.rejects(h.titleService.delete(s.actor, s.titleId), (error: unknown) => domain(error, 422, "period_closed"));
      assert.equal((await projection(h, s)).deleted_at, null);
    });
  });

  test("G8 — JWT real de outro tenant recebe 404 no DELETE e não descobre pagamentos", async () => {
    await withHarness("g8-cross", async (h, s) => {
      await setPaid(h, s, 50);
      const intruder = await seedTenant(h, "g8-intruder");
      const { baseUrl, headers } = await startApi(h, intruder);
      const response = await request(baseUrl, `/api/v1/financial-titles/${s.titleId}`, "DELETE", headers);
      assert.equal(response.status, 404);
      assert.equal(response.body.error.reason, "title_not_found");
      assert.equal((await projection(h, s)).deleted_at, null);
    });
  });

  test("G9 — CHECK rejeita SQL cru com paid_amount maior que amount (23514)", async () => {
    await withHarness("g9-high", async (h, s) => {
      await assert.rejects(
        h.client.$executeRawUnsafe("update financial_titles set paid_amount = amount + 1 where tenant_id=$1::uuid and id=$2::uuid", s.tenantId, s.titleId),
        (error: unknown) => sqlState(error) === "23514",
      );
      assert.equal((await projection(h, s)).paid_amount, "0.00");
    });
  });

  test("G9 — CHECK catalogado rejeita paid_amount negativo (23514)", async () => {
    await withHarness("g9-negative", async (h, s) => {
      const constraints = await h.client.$queryRaw<Array<{ conname: string; validated: boolean }>>`
        SELECT conname, convalidated AS validated FROM pg_constraint
        WHERE conrelid = 'financial_titles'::regclass AND conname = 'financial_titles_paid_amount_check'
      `;
      assert.deepEqual(constraints, [{ conname: "financial_titles_paid_amount_check", validated: true }]);
      await assert.rejects(
        h.client.$executeRawUnsafe("update financial_titles set paid_amount = -1 where tenant_id=$1::uuid and id=$2::uuid", s.tenantId, s.titleId),
        (error: unknown) => sqlState(error) === "23514",
      );
      assert.equal((await projection(h, s)).paid_amount, "0.00");
    });
  });
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;
type Seed = Awaited<ReturnType<typeof seedTenant>>;

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { env }, { withTenantRls, setTenantRlsContext }, { acquirePeriodLockShared }, titles, entries] = await Promise.all([
    import("@prisma/adapter-pg"), import("@prisma/client"), import("../src/config/env.js"), import("../src/database/rls.js"),
    import("../src/database/financial-period-lock.js"), import("../src/modules/financial-titles/index.js"), import("../src/modules/financial-entries/index.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  // A tag TEM de ter chegado ao backend: barreira escopada que nunca casa nada é cegueira nova.
  await assertApplicationNamePropagated(client, applicationName);
  return {
    client, withTenantRls, setTenantRlsContext, acquirePeriodLockShared,
    deriveCompetencia: titles.deriveCompetencia,
    PrismaFinancialTitleRepository: (await import("../src/modules/financial-titles/financial-title-prisma.repository.js")).PrismaFinancialTitleRepository,
    titleService: await titles.createDefaultFinancialTitleService(),
    entryService: await entries.createDefaultFinancialEntryService(),
    tenantIds: [] as string[], servers: [] as Server[],
  };
}

async function withHarness(tag: string, work: (h: Harness, seed: Seed) => Promise<void>) {
  const h = await bootstrap(process.env.DATABASE_URL!);
  try { await work(h, await seedTenant(h, tag)); } finally { await teardown(h); }
}

async function seedTenant(h: Harness, tag: string) {
  const mark = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tenant = await h.client.tenant.create({ data: { name: `F6 ${mark}`, slug: `f6-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro F6", email: `f6-${mark}@example.com` } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: { tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true } }));
  const now = new Date();
  const period = h.deriveCompetencia(now);
  const partyName = `Cliente ${mark}`;
  const title = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialTitle.create({ data: {
    tenant_id: tenant.id, direction: "receivable", party_type: "customer", party_name: partyName,
    description: "Original", category: "original", amount: 100, currency: "BRL", issue_date: now,
    due_date: now, paid_amount: 0, status: "open", competencia: period,
  } }));
  return { tenantId: tenant.id, userId: user.id, accountId: account.id, titleId: title.id, period, partyName,
    actor: { tenantId: tenant.id, userId: user.id, roles: [], permissions: [] } };
}

async function setPaid(h: Harness, s: Seed, amount: number) {
  await h.client.financialTitle.update({ where: { id: s.titleId }, data: { paid_amount: amount, status: amount === 100 ? "paid" : "partially_paid" } });
}

async function closePeriod(h: Harness, s: Seed) {
  await h.withTenantRls(h.client, s.tenantId, (tx) => tx.financialPeriodClose.create({ data: { tenant_id: s.tenantId, period: s.period, status: "closed" } }));
}

async function projection(h: Harness, s: Seed) {
  const rows = await h.client.$queryRawUnsafe<Array<Record<string, unknown>>>(
    "select amount::text, paid_amount::text, status, party_name, description, category, due_date::text, account_id::text, deleted_at from financial_titles where tenant_id=$1::uuid and id=$2::uuid",
    s.tenantId, s.titleId,
  );
  return rows[0]!;
}

async function startApi(h: Harness, seed: Seed) {
  const [{ createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, repositories, { signAccessToken }, { FINANCIAL_TITLE_PERMISSIONS }] = await Promise.all([
    import("../src/app.js"), import("../src/modules/core-saas/services/prisma-core-saas.service.js"), import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
    import("../src/modules/core-saas/repositories/index.js"), import("../src/modules/auth/index.js"), import("../src/modules/financial-titles/financial-title.routes.js"),
  ]);
  const role = await h.client.role.create({ data: { tenant_id: seed.tenantId, key: "finance", name: `Finance ${seed.tenantId}`, scope: "tenant" } });
  // A tabela `permissions` e GLOBAL (sem tenant_id): duas suites do lote faziam upsert na MESMA
  // linha em paralelo — classe `XX000 tuple concurrently updated`. A chave vem do CATALOGO DO SEED
  // (`prisma/seed.ts`), entao aqui so se LE; faltando, a mensagem diz o que fazer.
  const permission = await h.client.permission.findUnique({ where: { key: FINANCIAL_TITLE_PERMISSIONS.update } });
  assert.ok(permission, `permissao ${FINANCIAL_TITLE_PERMISSIONS.update} ausente do catalogo — rode npm run db:seed`);
  await h.client.rolePermission.create({ data: { role_id: role.id, permission_id: permission.id } });
  await h.client.userRoleAssignment.create({ data: { tenant_id: seed.tenantId, user_id: seed.userId, role_id: role.id } });
  const service = new PrismaCoreSaasService(new PrismaCoreSaasStore(h.client, new repositories.TenantRepository(h.client), new repositories.UserRepository(h.client), new repositories.RoleRepository(h.client), new repositories.UserRoleRepository(h.client), new repositories.AuditLogRepository(h.client)));
  const server = createApp(service).listen(0);
  h.servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const token = await signAccessToken({ user_id: seed.userId, tenant_id: seed.tenantId, email: `f6@${seed.tenantId}.test`, roles: ["finance"] });
  return { baseUrl, headers: { authorization: `Bearer ${token}` } };
}

async function request(baseUrl: string, path: string, method: string, headers: Record<string, string>, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { ...headers, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

function deferred() { let resolve!: () => void; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; }
function domain(error: unknown, statusCode: number, reason: string) { return typeof error === "object" && error !== null && (error as { statusCode?: unknown }).statusCode === statusCode && (error as { reason?: unknown }).reason === reason; }
function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: string; meta?: { code?: string }; cause?: { code?: string } };
  const structured = candidate.meta?.code ?? candidate.cause?.code;
  if (structured) return structured;
  const match = String(error).match(/\b23514\b/);
  return match?.[0] ?? candidate.code;
}

// A barreira agora e ESCOPADA por `application_name` (B-5): so satisfaz com statement bloqueado das
// conexoes DESTA suite. A versao cluster-wide que vivia aqui aceitava a fila de qualquer suite.
async function waitBlocked(client: Harness["client"], fragment: string) {
  await waitForOwnBlockedStatement(client, { applicationName, fragment, label: `lock em ${fragment}` });
}

async function teardown(h: Harness) {
  try {
    for (const server of h.servers) await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const tenantId of h.tenantIds) {
      await h.client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_titles where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_period_closes where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_accounts where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from audit_logs where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from role_permissions where role_id in (select id from roles where tenant_id=$1::uuid)", tenantId);
      await h.client.$executeRawUnsafe("delete from user_role_assignments where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from roles where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from users where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from tenants where id=$1::uuid", tenantId);
    }
  } finally { await h.client.$disconnect(); }
}
