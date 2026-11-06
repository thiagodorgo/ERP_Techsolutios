// B-ASS-04 · F5/F6 — o demonstrativo no PostgreSQL real, sob papel NOSUPERUSER NOBYPASSRLS (o superusuário ignora RLS
// e provaria nada). Cobre: ida e volta exata do dinheiro (centavos ↔ Decimal), as duas corridas (fechamento × fechamento,
// pagamento × pagamento), o isolamento entre organizações, a medição real lida pelo fechamento, o perfil e a trilha.

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
// 02/11/2026 12:00 SP: outubro já terminou.
const NOW = new Date("2026-11-02T12:00:00-03:00");
const PERIOD = "2026-10";
const OCT_1 = new Date("2026-10-01T00:00:00-03:00");

if (!connectionString) {
  test("B-ASS-04 · banco exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL para executar T-ST-db-1..9.",
  });
} else {
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    const admin = new Client({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    return { admin, role, tenantIds: [] as string[], planIds: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      if (h.tenantIds.length > 0) {
        for (const table of [
          "audit_logs",
          "subscription_credits",
          "subscription_statement_payments",
          "subscription_statements",
          "tenant_billing_profiles",
          "tenant_usage_daily",
          "tenant_subscription_addons",
          "tenant_subscriptions",
        ]) {
          await h.admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = ANY($1::uuid[])`, h.tenantIds);
        }
        await h.admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, h.tenantIds);
      }
      if (h.planIds.length > 0) {
        await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plan_versions WHERE plan_id = ANY($1::uuid[])`, h.planIds);
        await h.admin.$executeRawUnsafe(`DELETE FROM subscription_plans WHERE id = ANY($1::uuid[])`, h.planIds);
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  /** Organização com assinatura base vigente desde 01/10 (R$ 100,00; 10 usuários; 10 GB; extra R$ 5,00 e R$ 2,00). */
  async function seedTenant(h: Harness, tag: string): Promise<string> {
    const slug = `ass04-${tag}-${randomUUID().slice(0, 8)}`;
    const tenantId = (
      await h.admin.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, slug)
    )[0]!.id;
    h.tenantIds.push(tenantId);
    const code = `ass04_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const planId = (
      await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO subscription_plans (code, kind, name) VALUES ($1, 'base', $1) RETURNING id`,
        code,
      )
    )[0]!.id;
    h.planIds.push(planId);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00, NULL, 'flat', ARRAY['dashboard']::text[])`,
      planId,
      OCT_1,
    );
    await h.admin.$executeRawUnsafe(
      `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz)`,
      tenantId,
      planId,
      OCT_1,
    );
    return tenantId;
  }

  async function runtimeFor(client: PrismaClient) {
    const [runtime, { PrismaPlansRepository }, { PrismaSubscriptionsRepository }, { PrismaTenantLookup }, inputsModule, serviceModule] =
      await Promise.all([
        import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js"),
        import("../src/modules/subscription-billing/plans/plans-prisma.repository.js"),
        import("../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js"),
        import("../src/modules/subscription-billing/plans/tenant-lookup.prisma.js"),
        import("../src/modules/subscription-billing/statements/statement.inputs-provider.js"),
        import("../src/modules/subscription-billing/statements/statement.service.js"),
      ]);
    const repository = new runtime.PrismaStatementRepository(client);
    const usage = new runtime.PrismaUsageSource(client);
    const bindings = new runtime.PrismaBindingsSource(client);
    const inputs = new inputsModule.RepositoryStatementInputsProvider(
      new PrismaSubscriptionsRepository(client),
      new PrismaPlansRepository(client),
      new PrismaTenantLookup(client),
      usage,
      bindings,
    );
    const audit = new runtime.PrismaStatementAuditSink(client);
    return {
      repository,
      service: new serviceModule.StatementService(repository, inputs, audit),
      profiles: new runtime.PrismaBillingProfileRepository(client),
      usage,
    };
  }

  test("T-ST-db-1: fechar e baixar sob papel sem bypass; dinheiro exato nas colunas e no recálculo do snapshot", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "flow");
    await h.admin.$executeRawUnsafe(
      `INSERT INTO tenant_usage_daily (tenant_id, date, active_users, db_bytes_estimated, files_bytes, method_version, measured_at, metadata)
       VALUES ($1::uuid, '2026-10-15', 12, 11811160064, 0, 1, now(), '{}'::jsonb)`,
      tenantId,
    );
    const { service, repository } = await runtimeFor(h.role.client);

    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    assert.equal(closed.kind, "closed");
    const statement = (closed as { statement: { id: string; totalCents: number } }).statement;
    // 100,00 + 2 usuários × 5,00 + (11 GiB − 10 GB) × 2,00 = 100 + 10 + 2,00 = 112,00
    assert.equal(statement.totalCents, 11_200);

    const columns = await h.admin.$queryRawUnsafe<Array<Record<string, string>>>(
      `SELECT status, total_amount::text, base_amount::text, users_extra_amount::text, storage_extra_amount::text,
              users_peak::text, storage_peak_gb::text, extra_user_price::text, due_date::text
         FROM subscription_statements WHERE id = $1::uuid`,
      statement.id,
    );
    assert.deepEqual(columns[0], {
      status: "closed",
      total_amount: "112.00",
      base_amount: "100.00",
      users_extra_amount: "10.00",
      storage_extra_amount: "2.00",
      users_peak: "12",
      storage_peak_gb: "11.000",
      extra_user_price: "5.00",
      due_date: "2026-11-12",
    });

    await service.recordManualPayment({ tenantId, statementId: statement.id, amountCents: 4_001, method: "pix", note: null, actorId: "u", now: NOW });
    const paid = await service.recordManualPayment({ tenantId, statementId: statement.id, amountCents: 7_199, method: "pix", note: null, actorId: "u", now: NOW });
    assert.equal(paid.statement.status, "paid");
    const reread = await repository.findStatement(tenantId, statement.id);
    assert.equal(reread?.paidCents, 11_200);
    assert.equal(reread?.computation?.totalCents, 11_200, "o cálculo reconstruído do snapshot bate com a coluna");
    const sums = await h.admin.$queryRawUnsafe<Array<{ paid: string; payments: string }>>(
      `SELECT s.paid_amount::text AS paid, (SELECT sum(amount)::text FROM subscription_statement_payments p WHERE p.statement_id = s.id) AS payments
         FROM subscription_statements s WHERE s.id = $1::uuid`,
      statement.id,
    );
    assert.deepEqual(sums[0], { paid: "112.00", payments: "112.00" });
  });

  test("T-ST-db-2: dois fechamentos concorrentes do mesmo período → uma linha, um closed e um already_closed", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "race-close");
    const a = await runtimeFor(h.role.client);
    const b = await runtimeFor(h.role.client);
    const outcomes = await Promise.all([
      a.service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" }),
      b.service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" }),
    ]);
    assert.deepEqual(outcomes.map((outcome) => outcome.kind).sort(), ["already_closed", "closed"]);
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM subscription_statements WHERE tenant_id = $1::uuid AND period = $2`,
      tenantId,
      PERIOD,
    );
    assert.equal(rows[0]!.n, 1);
  });

  test("T-ST-db-3: dois pagamentos concorrentes que juntos passam do saldo → um entra, o outro 422 amount_exceeds_balance", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "race-pay");
    const { service } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;
    const results = await Promise.allSettled([
      service.recordManualPayment({ tenantId, statementId, amountCents: 6_000, method: null, note: null, actorId: "u", now: NOW }),
      service.recordManualPayment({ tenantId, statementId, amountCents: 6_000, method: null, note: null, actorId: "u", now: NOW }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    assert.equal((rejected.reason as { reason?: string }).reason, "amount_exceeds_balance");
    const rows = await h.admin.$queryRawUnsafe<Array<{ paid: string }>>(
      `SELECT paid_amount::text AS paid FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    assert.equal(rows[0]!.paid, "60.00");
  });

  test("T-ST-db-5: no contexto de A, o demonstrativo, o pagamento e o crédito de B não existem; sem GUC, zero linhas", async () => {
    const h = await harness();
    const [tenantA, tenantB] = await Promise.all([seedTenant(h, "rls-a"), seedTenant(h, "rls-b")]);
    const { service, repository } = await runtimeFor(h.role.client);
    await service.close({ tenantId: tenantA, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const closedB = await service.close({ tenantId: tenantB, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementB = (closedB as { statement: { id: string } }).statement.id;
    const providerPaid = await service.recordProviderPayment({
      tenantId: tenantB,
      statementId: statementB,
      source: "asaas",
      externalChargeId: "ext-1",
      amountCents: 12_000,
      method: null,
      now: NOW,
    });
    assert.ok(providerPaid.credit, "excedente de B vira crédito");

    assert.equal(await repository.findStatement(tenantA, statementB), undefined);
    assert.deepEqual(await repository.listPayments(tenantA, statementB), []);
    assert.deepEqual((await repository.listStatements(tenantA)).map((row) => row.tenantId), [tenantA]);
    assert.deepEqual(await repository.listCredits(tenantA), []);
    await assert.rejects(
      service.recordManualPayment({ tenantId: tenantA, statementId: statementB, amountCents: 100, method: null, note: null, actorId: "u", now: NOW }),
      (error: { reason?: string }) => error.reason === "statement_not_found",
    );
    await assert.rejects(
      service.applyCredit({ tenantId: tenantA, creditId: providerPaid.credit!.id, statementId: statementB, actorId: "u", now: NOW }),
      (error: { reason?: string }) => error.reason === "credit_not_found",
    );
    for (const table of ["subscription_statements", "subscription_statement_payments", "subscription_credits", "tenant_billing_profiles"]) {
      const rows = await h.role.client.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM ${table}`);
      assert.equal(rows[0]!.n, 0, `${table} sem GUC`);
    }
  });

  test("T-ST-db-6: ajuste de -0,01 no reaberto e refechamento → 111,99 exatos; id que não é UUID responde não existe", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "cents");
    const { service, repository } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;
    await service.reopen({ tenantId, statementId, reason: "desconto de um centavo", actorId: "u", now: NOW });
    await service.adjust({ tenantId, statementId, deltaCents: -1, note: "arredondamento combinado", actorId: "u", now: NOW });
    const reclosed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: "u", source: "manual" });
    assert.equal((reclosed as { statement: { totalCents: number } }).statement.totalCents, 9_999);
    const rows = await h.admin.$queryRawUnsafe<Array<{ total: string; adj: string }>>(
      `SELECT total_amount::text AS total, adjustments_amount::text AS adj FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    assert.deepEqual(rows[0], { total: "99.99", adj: "-0.01" });
    assert.equal(await repository.findStatement(tenantId, "st_nope"), undefined);
  });

  test("T-ST-db-7: perfil de cobrança sob RLS — upsert grava complete e não aparece para outra organização", async () => {
    const h = await harness();
    const [tenantA, tenantB] = await Promise.all([seedTenant(h, "prof-a"), seedTenant(h, "prof-b")]);
    const { profiles } = await runtimeFor(h.role.client);
    const input = {
      legalName: "Exemplo Ltda",
      document: "11222333000181",
      email: "fin@exemplo.com.br",
      address: { postalCode: "01310100", street: "Av. Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", cityIbge: "3550308", state: "SP" },
      paymentMethod: "pix" as const,
    };
    const saved = await profiles.upsert(tenantA, input, NOW);
    assert.equal(saved.document, "11222333000181");
    const again = await profiles.upsert(tenantA, { ...input, paymentMethod: "boleto" }, NOW);
    assert.equal(again.id, saved.id, "upsert por tenant_id, não duplica");
    assert.equal(await profiles.find(tenantB), null);
    const rows = await h.admin.$queryRawUnsafe<Array<{ complete: boolean; method: string }>>(
      `SELECT complete, payment_method AS method FROM tenant_billing_profiles WHERE tenant_id = $1::uuid`,
      tenantA,
    );
    assert.deepEqual(rows, [{ complete: true, method: "boleto" }]);
  });

  test("T-ST-db-8: a trilha do fechamento e do pagamento cai em audit_logs da organização, sem texto livre", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "audit");
    const { service } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;
    await service.recordManualPayment({ tenantId, statementId, amountCents: 10_000, method: "pix", note: "token=abc", actorId: "u", now: NOW });
    const rows = await h.admin.$queryRawUnsafe<Array<{ action: string; metadata: unknown }>>(
      `SELECT action, metadata FROM audit_logs WHERE tenant_id = $1::uuid ORDER BY created_at, action`,
      tenantId,
    );
    assert.deepEqual(rows.map((row) => row.action), ["subscription_statement.closed", "subscription_statement.payment_recorded"]);
    assert.equal(JSON.stringify(rows).includes("token=abc"), false, "a nota do pagamento não entra na trilha");
  });

  test("T-ST-db-9: o job (source job) não refecha o reaberto no banco", async () => {
    const h = await harness();
    const tenantId = await seedTenant(h, "reopened");
    const { service } = await runtimeFor(h.role.client);
    const closed = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    const statementId = (closed as { statement: { id: string } }).statement.id;
    await service.reopen({ tenantId, statementId, reason: "medição corrigida à mão", actorId: "u", now: NOW });
    const again = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    assert.equal(again.kind, "skipped");
    const rows = await h.admin.$queryRawUnsafe<Array<{ status: string }>>(
      `SELECT status FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    assert.equal(rows[0]!.status, "reopened");
  });
}
