import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedStatement,
  withApplicationName,
} from "./helpers/pg-barrier.js";
import type { FinancialUnitOfWork } from "../src/modules/financial-uow/index.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — A13 do plano v3 (R2-05) contra o PostgreSQL REAL: o CAS da conciliação é OBRIGATÓRIO e por ESTADO
// LÓGICO (`reconciled = $esperado AND reconciled_at IS NOT DISTINCT FROM $esperado`), nunca por `updated_at` em ms.
// Dois clientes que LEEM o mesmo estado → exatamente um grava; o outro recebe 409 reconciliation_stale — barreira
// determinística (o 2º bloqueia no row lock do 1º e reavalia o WHERE contra a tupla nova) e 10 rodadas concorrentes.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("b-san3-12a-reconcile-cas");

if (!connectionString) {
  test("B-SAN3-12a CAS da conciliação exige DATABASE_URL e banco migrado", { skip: "Defina DATABASE_URL e aplique as migrations." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  test("A13 (db, barreira): o 1º grava e segura o commit; o 2º com o MESMO estado lido bloqueia no row lock e sai 409; reconciledBy é o do 1º", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a13-barrier");
      const entry = await h.entryService.create(s.actor, { account_id: s.accountId, direction: "in", amount: 30, payment_method: "pix" });
      const seen = { expected_reconciled: false, expected_reconciled_at: null };
      let arrive!: () => void;
      let release!: () => void;
      const reached = new Promise<void>((r) => (arrive = r));
      const gate = new Promise<void>((r) => (release = r));
      const holding = new h.entries.FinancialEntryService(h.entryRepository, h.periodCloseRepository, h.accountReader, h.titles.createDefaultFinancialTitleService, async (): Promise<FinancialUnitOfWork> => ({
        run: (tenantId, work) => h.realUow.run(tenantId, async (ctx) => {
          const result = await work(ctx);
          arrive();
          await gate;
          return result;
        }),
      }));
      const first = captureSettled(holding.reconcile(s.actor, entry.id, { reconciled: true, ...seen }));
      await reached;
      const second = captureSettled(h.entryService.reconcile(s.admin, entry.id, { reconciled: true, divergence_type: "value", ...seen }));
      await waitForOwnBlockedStatement(h.client, { applicationName, fragment: "financial_entries", label: "2º reconcile no row lock do 1º" });
      release();
      assert.equal((await first).status, "fulfilled");
      const loser = await second;
      assert.equal(loser.status, "rejected");
      assert.equal((loser as { reason: { reason?: string } }).reason.reason, "reconciliation_stale");
      const row = await h.client.financialEntry.findUniqueOrThrow({ where: { id: entry.id } });
      assert.equal(row.reconciled, true);
      assert.equal(row.reconciled_by, s.actor.userId, "quem conciliou é o 1º");
      assert.equal(row.divergence_type, null, "a ressalva do 2º não entrou");
    } finally {
      await teardown(h);
    }
  });

  test("A13 (db, 10 rodadas concorrentes): dois clientes com o mesmo estado lido → exatamente um 200 e um 409, sempre", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a13-race");
      for (let round = 0; round < 10; round += 1) {
        const entry = await h.entryService.create(s.actor, { account_id: s.accountId, direction: "in", amount: 10 + round, payment_method: "pix" });
        const seen = { expected_reconciled: false, expected_reconciled_at: null };
        const outcomes = await Promise.all([
          captureSettled(h.entryService.reconcile(s.actor, entry.id, { reconciled: true, ...seen })),
          captureSettled(h.entryService.reconcile(s.admin, entry.id, { reconciled: true, ...seen })),
        ]);
        const ok = outcomes.filter((o) => o.status === "fulfilled").length;
        const stale = outcomes.filter((o) => o.status === "rejected" && (o.reason as { reason?: string }).reason === "reconciliation_stale").length;
        assert.deepEqual([ok, stale], [1, 1], `rodada ${round}`);
      }
    } finally {
      await teardown(h);
    }
  });

  // B-SAN3-12a, ciclo 2 — A13-bis (C4-02): o operando `reconciled` do WHERE do CAS tem caso que o acusa. Com o par lido
  // INCONSISTENTE com a linha só no flag, o CAS casa 0 linhas → 409. Tirar `reconciled: input.expectedReconciled` do WHERE (M13a)
  // faz o 1º caso casar pelo `reconciled_at IS NULL` e gravar — vermelho. O operando é redundante em dado coerente
  // (reconciled ⇔ reconciled_at IS NOT NULL), mas é o contrato do §4.6 e defende contra linha inconsistente.
  test("A13-bis (db): o flag lido conta no CAS — linha (false, null) com cliente (true, null) → 409 sem gravar; linha (true, X) com cliente (false, X) → 409 sem desfazer", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a13bis");
      const entry = await h.entryService.create(s.actor, { account_id: s.accountId, direction: "in", amount: 30, payment_method: "pix" });
      await assert.rejects(
        () => h.entryService.reconcile(s.actor, entry.id, { reconciled: true, expected_reconciled: true, expected_reconciled_at: null }),
        (e: unknown) => (e as { reason?: string; statusCode?: number }).reason === "reconciliation_stale" && (e as { statusCode?: number }).statusCode === 409,
      );
      const untouched = await h.client.financialEntry.findUniqueOrThrow({ where: { id: entry.id } });
      assert.equal(untouched.reconciled, false, "nada gravado");
      assert.equal(untouched.reconciled_by, null);
      assert.equal(untouched.reconciled_at, null);

      const done = await h.entryService.reconcile(s.actor, entry.id, { reconciled: true, expected_reconciled: false, expected_reconciled_at: null });
      const stamp = done.reconciledAt!.toISOString();
      await assert.rejects(
        () => h.entryService.reconcile(s.admin, entry.id, { reconciled: false, expected_reconciled: false, expected_reconciled_at: stamp }),
        (e: unknown) => (e as { reason?: string }).reason === "reconciliation_stale",
      );
      const still = await h.client.financialEntry.findUniqueOrThrow({ where: { id: entry.id } });
      assert.equal(still.reconciled, true, "o desfazer com o flag errado não gravou");
      assert.equal(still.reconciled_at?.toISOString(), stamp);
      assert.equal(still.reconciled_by, s.actor.userId);
    } finally {
      await teardown(h);
    }
  });

  test("A13 (db): sem estado → 400 sem gravar; estado com o carimbo EXATO lido (ms) → 200 ida e volta; carimbo 1 ms diferente → 409", async () => {
    const h = await bootstrap(connection);
    try {
      const s = await seed(h, "a13-exact");
      const entry = await h.entryService.create(s.actor, { account_id: s.accountId, direction: "in", amount: 30, payment_method: "pix" });
      await assert.rejects(() => h.entryService.reconcile(s.actor, entry.id, { reconciled: true }), (e: unknown) => (e as { reason?: string }).reason === "expected_state_required");
      assert.equal((await h.client.financialEntry.findUniqueOrThrow({ where: { id: entry.id } })).reconciled, false);
      const done = await h.entryService.reconcile(s.actor, entry.id, { reconciled: true, expected_reconciled: false, expected_reconciled_at: null });
      const stamp = done.reconciledAt!.toISOString();
      await assert.rejects(
        () => h.entryService.reconcile(s.admin, entry.id, { reconciled: false, expected_reconciled: true, expected_reconciled_at: new Date(done.reconciledAt!.getTime() + 1).toISOString() }),
        (e: unknown) => (e as { reason?: string }).reason === "reconciliation_stale",
      );
      const undone = await h.entryService.reconcile(s.admin, entry.id, { reconciled: false, expected_reconciled: true, expected_reconciled_at: stamp });
      assert.equal(undone.reconciled, false);
      assert.equal(undone.reconciledAt, undefined);
    } finally {
      await teardown(h);
    }
  });
}

type Harness = Awaited<ReturnType<typeof bootstrap>>;

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { env }, { withTenantRls }, entries, titles, prismaEntries, prismaTitles, { createPrismaFinancialUnitOfWork }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/financial-entries/index.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-entries/financial-entry-prisma.repository.js"),
    import("../src/modules/financial-titles/financial-title-prisma.repository.js"),
    import("../src/modules/financial-uow/financial-uow-prisma.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(client, applicationName);
  return {
    client,
    withTenantRls,
    entries,
    titles,
    entryRepository: await prismaEntries.createPrismaFinancialEntryRepository(),
    accountReader: await prismaEntries.createPrismaAccountReader(),
    periodCloseRepository: await prismaTitles.createPrismaFinancialPeriodCloseRepository(),
    realUow: await createPrismaFinancialUnitOfWork(),
    entryService: await entries.createDefaultFinancialEntryService(),
    tenantIds: [] as string[],
  };
}

async function seed(h: Harness, tag: string) {
  const mark = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const tenant = await h.client.tenant.create({ data: { name: `SAN312a ${mark}`, slug: `san312a-${mark}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "Financeiro 12a", email: `${mark}@example.com` } }));
  const account = await h.withTenantRls(h.client, tenant.id, (tx) => tx.financialAccount.create({ data: { tenant_id: tenant.id, name: `Conta ${mark}`, kind: "cash", currency: "BRL", is_active: true } }));
  const perms = ["financial_entries:read", "financial_entries:create", "financial_entries:update"] as const;
  return {
    tenantId: tenant.id,
    accountId: account.id,
    actor: { tenantId: tenant.id, userId: user.id, roles: ["finance" as const], permissions: [...perms] },
    admin: { tenantId: tenant.id, userId: user.id, roles: ["tenant_admin" as const], permissions: [...perms, "financial_entries:unreconcile" as const] },
  };
}

async function teardown(h: Harness): Promise<void> {
  try {
    for (const tenantId of h.tenantIds) {
      await h.client.$executeRawUnsafe("delete from financial_entries where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from financial_accounts where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from tenant_settings where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from audit_logs where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from users where tenant_id=$1::uuid", tenantId);
      await h.client.$executeRawUnsafe("delete from tenants where id=$1::uuid", tenantId);
    }
  } finally {
    await h.client.$disconnect();
  }
}
