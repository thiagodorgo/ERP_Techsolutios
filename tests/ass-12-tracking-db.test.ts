// B-ASS-12 · F3a — rastreamento cobrado no PostgreSQL real, sob papel NOSUPERUSER NOBYPASSRLS
// (o superusuário ignora RLS e provaria nada). Cobre db-1..6 da Emenda 1 do plano:
// a linha de rastreamento, o catálogo, a medição real, o isolamento, o snapshot antigo e o refechamento.

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import { createPrismaClient } from "../src/database/pg-connection.js";
import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
// 02/11/2026 12:00 SP: outubro já terminou.
const NOW = new Date("2026-11-02T12:00:00-03:00");
const PERIOD = "2026-10";
const OCT_1 = new Date("2026-10-01T00:00:00-03:00");
const SEP_30 = new Date("2026-09-30T00:00:00-03:00");

if (!connectionString) {
  test("B-ASS-12 · banco exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar T-TRK-db-1..6.",
  });
} else {
  type Harness = Awaited<ReturnType<typeof bootstrap>>;
  let harnessPromise: Promise<Harness> | undefined;
  const harness = (): Promise<Harness> => (harnessPromise ??= bootstrap());

  async function bootstrap() {
    const admin = createPrismaClient(connectionString!);
    const role: EphemeralRole = await createEphemeralRole(admin, connectionString!);
    return { admin, role, tenantIds: [] as string[], planIds: [] as string[] };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    try {
      if (h.tenantIds.length > 0) {
        await h.admin.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'replica'`);
          await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = ANY($1::uuid[])`, h.tenantIds);
        });
        for (const table of [
          "subscription_statement_payments",
          "subscription_credits",
          "subscription_statements",
          "tenant_subscription_addons",
          "tenant_subscriptions",
          "tenant_usage_daily",
          "tenant_billing_profiles",
          "vehicle_tracking_bindings",
          "vehicles",
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

  async function assertRuntimeRole(role: EphemeralRole): Promise<void> {
    const rows = await role.client.$queryRaw<Array<{ super: boolean; bypass: boolean }>>`
      SELECT rolsuper AS super, rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user
    `;
    assert.deepEqual(rows[0], { super: false, bypass: false });
  }

  async function insertTenant(h: Harness, tag: string): Promise<string> {
    const slug = `ass12-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
      slug,
    );
    const tenantId = rows[0]!.id;
    h.tenantIds.push(tenantId);
    return tenantId;
  }

  async function insertPlan(h: Harness, kind: string): Promise<string> {
    const code = `ass12_${kind}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_plans (code, kind, name) VALUES ($1, $2, $1) RETURNING id`,
      code,
      kind,
    );
    h.planIds.push(rows[0]!.id);
    return rows[0]!.id;
  }

  async function insertBaseVersion(h: Harness, planId: string, from: Date, monthlyPriceCents: number): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, $3::numeric, 10, 10.000, 0.00, 0.00, NULL, 'flat', ARRAY['dashboard']::text[])
       RETURNING id`,
      planId,
      from,
      (monthlyPriceCents / 100).toFixed(2),
    );
    return rows[0]!.id;
  }

  async function insertAddonVersion(
    h: Harness,
    planId: string,
    version: number,
    from: Date,
    to: Date | null,
    pricingUnit: string,
    monthlyPriceCents: number,
    perVehiclePriceCents: number | null,
  ): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, valid_to, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, $2::int, $3::timestamptz, $4::timestamptz, $5::numeric, 0, 0.000, 0.00, 0.00,
               $6::numeric, $7, '{}'::text[])
       RETURNING id`,
      planId,
      version,
      from,
      to,
      (monthlyPriceCents / 100).toFixed(2),
      perVehiclePriceCents === null ? null : (perVehiclePriceCents / 100).toFixed(2),
      pricingUnit,
    );
    return rows[0]!.id;
  }

  async function insertSubscription(h: Harness, tenantId: string, planId: string, from: Date): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from) VALUES ($1::uuid, $2::uuid, $3::timestamptz) RETURNING id`,
      tenantId,
      planId,
      from,
    );
    return rows[0]!.id;
  }

  async function insertAddon(
    h: Harness,
    tenantId: string,
    subscriptionId: string,
    planId: string,
    from: Date,
    to: Date | null,
    overrideCents: number | null = null,
  ): Promise<string> {
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenant_subscription_addons
         (tenant_id, subscription_id, plan_id, valid_from, valid_to, per_vehicle_price_override)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $5::timestamptz, $6::numeric)
       RETURNING id`,
      tenantId,
      subscriptionId,
      planId,
      from,
      to,
      overrideCents === null ? null : (overrideCents / 100).toFixed(2),
    );
    return rows[0]!.id;
  }

  async function insertVehicle(h: Harness, tenantId: string): Promise<string> {
    const plate = `ASS12${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicles (tenant_id, plate, model) VALUES ($1::uuid, $2, 'teste') RETURNING id`,
      tenantId,
      plate,
    );
    return rows[0]!.id;
  }

  async function insertBinding(
    h: Harness,
    tenantId: string,
    vehicleId: string,
    from: Date,
    to: Date | null,
  ): Promise<string> {
    const instance = `inst-${randomUUID()}`;
    const device = `dev-${randomUUID()}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO vehicle_tracking_bindings
         (tenant_id, vehicle_id, instance_key, external_device_key, valid_from, valid_to)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::timestamptz, $6::timestamptz)
       RETURNING id`,
      tenantId,
      vehicleId,
      instance,
      device,
      from,
      to,
    );
    return rows[0]!.id;
  }

  async function seedBaseAndSubscription(h: Harness, tag: string): Promise<{ tenantId: string; subscriptionId: string }> {
    const tenantId = await insertTenant(h, tag);
    const basePlanId = await insertPlan(h, "base");
    await insertBaseVersion(h, basePlanId, OCT_1, 10_000);
    const subscriptionId = await insertSubscription(h, tenantId, basePlanId, OCT_1);
    return { tenantId, subscriptionId };
  }

  async function runtimeFor(client: PrismaClient) {
    const [runtime, plansModule, subscriptionsModule, tenantsModule, inputsModule, serviceModule] = await Promise.all([
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
      new subscriptionsModule.PrismaSubscriptionsRepository(client),
      new plansModule.PrismaPlansRepository(client),
      new tenantsModule.PrismaTenantLookup(client),
      usage,
      bindings,
    );
    const audit = new runtime.PrismaStatementAuditSink(client);
    return {
      repository,
      service: new serviceModule.StatementService(repository, inputs, audit),
    };
  }

  test("T-TRK-db-1: por veículo fecha 3 vínculos; as colunas e o snapshot batem; a borda das 00:00 cobra o 4º", async () => {
    const h = await harness();
    await assertRuntimeRole(h.role);
    const { tenantId, subscriptionId } = await seedBaseAndSubscription(h, "db1");
    const addonPlanId = await insertPlan(h, "addon_tracking");
    const addonVersionId = await insertAddonVersion(h, addonPlanId, 1, OCT_1, null, "per_vehicle", 0, 1_990);
    await insertAddon(h, tenantId, subscriptionId, addonPlanId, OCT_1, null);

    for (let i = 0; i < 3; i += 1) {
      const vehicleId = await insertVehicle(h, tenantId);
      await insertBinding(h, tenantId, vehicleId, SEP_30, null);
    }

    const { service, repository } = await runtimeFor(h.role.client);
    const first = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    assert.equal(first.kind, "closed");
    const statementId = (first as { statement: { id: string } }).statement.id;

    const columns = await h.admin.$queryRawUnsafe<Array<Record<string, string>>>(
      `SELECT tracking_amount::text AS tracking_amount, per_vehicle_price::text AS per_vehicle_price,
              tracked_vehicles::text AS tracked_vehicles, addon_plan_version_id::text AS addon_plan_version_id
         FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    assert.deepEqual(columns[0], {
      tracking_amount: "59.70",
      per_vehicle_price: "19.90",
      tracked_vehicles: "3",
      addon_plan_version_id: addonVersionId,
    });

    const reread = await repository.findStatement(tenantId, statementId);
    assert.equal(reread?.computation?.trackingCents, 5_970);
    assert.equal(reread?.computation?.trackingUnit, "per_vehicle");
    assert.equal(reread?.computation?.trackingBilledVehicles, 3);
    assert.equal(reread?.computation?.totalCents, reread?.totalCents, "o cálculo reconstruído do snapshot bate com a coluna");

    const snapshot = await h.admin.$queryRawUnsafe<Array<{ perVehicle: unknown }>>(
      `SELECT snapshot->'latest'->'tracking'->'perVehicle' AS "perVehicle" FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    assert.deepEqual(snapshot[0]!.perVehicle, {
      addonPlanVersionId: addonVersionId,
      billedVehicles: 3,
      perVehiclePriceCents: 1_990,
    });

    // Borda das 00:00 (A6/E7): vínculo encerrado exatamente às 00:00 SP do 1º dia com add-on vale naquele dia.
    const edgeVehicle = await insertVehicle(h, tenantId);
    await insertBinding(h, tenantId, edgeVehicle, SEP_30, OCT_1);
    await service.reopen({ tenantId, statementId, reason: "teste da borda", actorId: "u", now: NOW });
    const second = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "manual" });
    assert.equal(second.kind, "closed");
    const after = await h.admin.$queryRawUnsafe<Array<{ tracking_amount: string; perVehicle: unknown }>>(
      `SELECT tracking_amount::text AS tracking_amount,
              snapshot->'latest'->'tracking'->'perVehicle' AS "perVehicle"
         FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    assert.equal(after[0]!.tracking_amount, "79.60");
    assert.deepEqual(after[0]!.perVehicle, {
      addonPlanVersionId: addonVersionId,
      billedVehicles: 4,
      perVehiclePriceCents: 1_990,
    });
  });

  test("T-TRK-db-2: o catálogo tem exatamente os 2 adicionais; um segundo vigente na mesma assinatura é recusado (23505)", async () => {
    const h = await harness();
    const { tenantId, subscriptionId } = await seedBaseAndSubscription(h, "db2");

    const [{ SUBSCRIPTION_PLAN_SEEDS }] = await Promise.all([
      import("../src/modules/subscription-billing/plans/plan-catalog.js"),
    ]);
    const expectedCodes = SUBSCRIPTION_PLAN_SEEDS.filter((plan) => plan.kind === "addon_tracking").map((plan) => plan.code);
    const catalog = await h.admin.$queryRawUnsafe<Array<{ n: number; codes: string[] }>>(
      `SELECT count(*)::int AS n, array_agg(code ORDER BY code)::text[] AS codes
         FROM subscription_plans WHERE kind = 'addon_tracking' AND code = ANY($1::text[])`,
      expectedCodes,
    );
    assert.deepEqual(catalog[0], { n: 2, codes: ["tracking_basic", "tracking_plus"] });

    const basic = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM subscription_plans WHERE code = 'tracking_basic'`,
    );
    await insertAddon(h, tenantId, subscriptionId, basic[0]!.id, OCT_1, null);

    const plus = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM subscription_plans WHERE code = 'tracking_plus'`,
    );
    await assert.rejects(
      insertAddon(h, tenantId, subscriptionId, plus[0]!.id, OCT_1, null),
      (error: unknown) => {
        const e = error as { code?: string; message?: string; meta?: { code?: string; message?: string } };
        const text = `${e.meta?.message ?? ""} ${e.message ?? ""}`;
        return e.code === "23505" || e.meta?.code === "23505" || /23505/.test(text);
      },
      "o índice único parcial recusa o segundo adicional vigente da mesma assinatura",
    );
  });

  test("T-TRK-db-3: countTrackedVehicles no SQL real — 2 vínculos do mesmo veículo contam 1, fechado ontem não conta, aberto conta", async () => {
    const h = await harness();
    await assertRuntimeRole(h.role);
    const tenantId = await insertTenant(h, "db3");

    const dayStart = new Date("2026-10-10T00:00:00-03:00");
    const dayEnd = new Date("2026-10-10T23:59:59.999-03:00");

    // 2 vínculos do MESMO veículo contam 1: um aberto e um encerrado antes do dia.
    const sameVehicle = await insertVehicle(h, tenantId);
    await insertBinding(h, tenantId, sameVehicle, new Date("2026-10-01T00:00:00-03:00"), null);
    await insertBinding(h, tenantId, sameVehicle, new Date("2026-10-01T00:00:00-03:00"), new Date("2026-10-20T23:59:59.999-03:00"));

    // Vínculo fechado ontem não conta.
    const yesterdayVehicle = await insertVehicle(h, tenantId);
    await insertBinding(h, tenantId, yesterdayVehicle, new Date("2026-10-01T00:00:00-03:00"), new Date("2026-10-09T23:59:59.999-03:00"));

    // Vínculo aberto conta.
    const openVehicle = await insertVehicle(h, tenantId);
    await insertBinding(h, tenantId, openVehicle, new Date("2026-10-01T00:00:00-03:00"), null);

    const { PrismaMeteringSqlExecutor } = await import("../src/modules/subscription-billing/metering/metering-prisma.repository.js");
    const { withTenantRls } = await import("../src/database/rls.js");
    const counted = await withTenantRls(h.role.client, tenantId, (tx) =>
      new PrismaMeteringSqlExecutor(tx).countTrackedVehicles(dayStart, dayEnd),
    );
    assert.equal(counted, 2);
  });

  test("T-TRK-db-4: PrismaBindingsSource da organização A não devolve vínculo da organização B", async () => {
    const h = await harness();
    await assertRuntimeRole(h.role);
    const tenantA = await insertTenant(h, "db4a");
    const tenantB = await insertTenant(h, "db4b");

    const vehicleA = await insertVehicle(h, tenantA);
    const vehicleB = await insertVehicle(h, tenantB);
    await insertBinding(h, tenantA, vehicleA, SEP_30, null);
    await insertBinding(h, tenantB, vehicleB, SEP_30, null);

    const { PrismaBindingsSource } = await import("../src/modules/subscription-billing/statements/statement.prisma-runtime.js");
    const bindings = new PrismaBindingsSource(h.role.client);
    const rowsA = await bindings.listVehicleBindings(tenantA, "2026-10-01", "2026-10-31");
    assert.deepEqual(rowsA.map((row) => row.vehicleId), [vehicleA]);
    const rowsB = await bindings.listVehicleBindings(tenantB, "2026-10-01", "2026-10-31");
    assert.deepEqual(rowsB.map((row) => row.vehicleId), [vehicleB]);
  });

  test("T-TRK-db-5: demonstrativo gravado antes do bloco (snapshot sem tracking) relê 5.970 e o recálculo bate com a coluna", async () => {
    const h = await harness();
    const { tenantId } = await seedBaseAndSubscription(h, "db5");
    const statementId = randomUUID();
    const snapshot = {
      daysInMonth: 31,
      segments: [{ subscriptionId: null, planVersionId: null, fromDay: 1, toDay: 31, monthlyPriceCents: 10_000 }],
      terms: { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 0, extraGbPriceCents: 0 },
      measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 3 },
      perVehiclePriceCents: 1_990,
      adjustmentsCents: 0,
      creditsAppliedCents: 0,
    };
    await h.admin.$executeRawUnsafe(
      `INSERT INTO subscription_statements
         (id, tenant_id, period, status, charge_status, invoice_status, segments,
          users_included, users_peak, users_extra, storage_included_gb, storage_peak_gb, storage_extra_gb,
          tracked_vehicles, days_in_month, days_measured, extra_user_price, extra_gb_price, per_vehicle_price,
          base_amount, users_extra_amount, storage_extra_amount, tracking_amount, adjustments_amount,
          credits_applied_amount, total_amount, snapshot)
       VALUES ($1::uuid, $2::uuid, $3, 'closed', 'none', 'none', '[]'::jsonb,
          10, 0, 0, 10.000, 0.000, 0.000, 3, 31, 0, 0.00, 0.00, 19.90,
          100.00, 0.00, 0.00, 59.70, 0.00, 0.00, 159.70, $4::jsonb)`,
      statementId,
      tenantId,
      PERIOD,
      JSON.stringify({ latest: snapshot, history: [] }),
    );

    const { repository } = await runtimeFor(h.role.client);
    const reread = await repository.findStatement(tenantId, statementId);
    assert.equal(reread?.computation?.trackingCents, 5_970);
    assert.equal(reread?.computation?.trackingUnit, "per_vehicle");
    assert.equal(reread?.computation?.totalCents, reread?.totalCents, "a regra antiga reproduz o total da coluna");
  });

  test("T-TRK-db-6: flat com duas versões fecha 66,45; a 3ª versão publicada depois não muda o refechamento", async () => {
    const h = await harness();
    const { tenantId, subscriptionId } = await seedBaseAndSubscription(h, "db6");
    const addonPlanId = await insertPlan(h, "addon_tracking");
    await insertAddonVersion(h, addonPlanId, 1, OCT_1, new Date("2026-10-15T00:00:00-03:00"), "flat", 5_000, null);
    await insertAddonVersion(h, addonPlanId, 2, new Date("2026-10-15T00:00:00-03:00"), null, "flat", 8_000, null);
    await insertAddon(h, tenantId, subscriptionId, addonPlanId, OCT_1, null);

    for (let i = 0; i < 3; i += 1) {
      const vehicleId = await insertVehicle(h, tenantId);
      await insertBinding(h, tenantId, vehicleId, SEP_30, null);
    }

    const { service, repository } = await runtimeFor(h.role.client);
    const first = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    assert.equal(first.kind, "closed");
    const statementId = (first as { statement: { id: string } }).statement.id;
    const firstRows = await h.admin.$queryRawUnsafe<Array<{ tracking_amount: string; segments: unknown }>>(
      `SELECT tracking_amount::text AS tracking_amount,
              snapshot->'latest'->'tracking'->'flatSegments' AS segments
         FROM subscription_statements WHERE id = $1::uuid`,
      statementId,
    );
    assert.equal(firstRows[0]!.tracking_amount, "66.45");

    await service.reopen({ tenantId, statementId, reason: "teste do pin", actorId: "u", now: NOW });

    // A plataforma publica uma 3ª versão desde o dia 25 (fecha a 2ª no dia 25).
    const thirdVersionId = await insertAddonVersion(h, addonPlanId, 3, new Date("2026-10-25T00:00:00-03:00"), null, "flat", 20_000, null);
    await h.admin.$executeRawUnsafe(
      `UPDATE subscription_plan_versions SET valid_to = $1::timestamptz
        WHERE plan_id = $2::uuid AND version = 2`,
      new Date("2026-10-25T00:00:00-03:00"),
      addonPlanId,
    );

    const second = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "manual" });
    assert.equal(second.kind, "closed");
    const reread = await repository.findStatement(tenantId, statementId);
    assert.equal(reread?.computation?.trackingCents, 6_645);
    assert.equal(reread?.computation?.trackingUnit, "flat");
    assert.deepEqual(
      reread?.computation?.trackingSegments.map((segment) => ({ id: segment.addonPlanVersionId, fromDay: segment.fromDay, toDay: segment.toDay, cents: segment.cents })),
      [
        { id: firstRows[0]!.segments[0]?.addonPlanVersionId, fromDay: 1, toDay: 14, cents: 2_258 },
        { id: firstRows[0]!.segments[1]?.addonPlanVersionId, fromDay: 15, toDay: 31, cents: 4_387 },
      ],
    );
    assert.equal(reread?.computation?.trackingSegments.some((segment) => segment.addonPlanVersionId === thirdVersionId), false);
  });

  test("T-TRK-db-LEGADO: versão antiga (flat, mensalidade 0, preço por veículo) é ambígua: pulo addon_without_price, nenhum demonstrativo closed", async () => {
    const h = await harness();
    await assertRuntimeRole(h.role);
    const { tenantId, subscriptionId } = await seedBaseAndSubscription(h, "legado");
    const addonPlanId = await insertPlan(h, "addon_tracking");
    await insertAddonVersion(h, addonPlanId, 1, OCT_1, null, "flat", 0, 1_990);
    await insertAddon(h, tenantId, subscriptionId, addonPlanId, OCT_1, null);

    for (let i = 0; i < 3; i += 1) {
      const vehicleId = await insertVehicle(h, tenantId);
      await insertBinding(h, tenantId, vehicleId, SEP_30, null);
    }

    const { service } = await runtimeFor(h.role.client);
    const out = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
    assert.deepEqual(out, { kind: "skipped", reason: "addon_without_price", alreadyClosed: false });
    const rows = await h.admin.$queryRawUnsafe<Array<{ status: string }>>(
      `SELECT status FROM subscription_statements WHERE tenant_id = $1::uuid`,
      tenantId,
    );
    assert.equal(rows.filter((row) => row.status === "closed").length, 0, "nenhum demonstrativo closed com rastreamento 0,00");
  });

  // Emenda 1.4 (J-573, C1-01 e C1-02): as outras duas formas antigas e ambíguas, gravadas como a API antiga gravava
  // (`pricing_unit` = o DEFAULT `flat` da coluna), também pulam: nenhum demonstrativo `closed`, nem 50,00 nem 0,00.
  for (const [nome, mensalidade, porVeiculo] of [["B (flat, 50,00, por veículo)", 5_000, 1_990], ["C (flat, 0, sem preço por veículo)", 0, null]] as const) {
    test(`T-TRK-db-LEGADO-${nome.slice(0, 1)}: versão antiga ${nome} é ambígua: pulo addon_without_price, nenhum demonstrativo closed`, async () => {
      const h = await harness();
      await assertRuntimeRole(h.role);
      const { tenantId, subscriptionId } = await seedBaseAndSubscription(h, `legado-${nome.slice(0, 1).toLowerCase()}`);
      const addonPlanId = await insertPlan(h, "addon_tracking");
      await h.admin.$queryRawUnsafe(
        `INSERT INTO subscription_plan_versions
           (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
            extra_user_price, extra_gb_price, per_vehicle_price, modules)
         VALUES ($1::uuid, 1, $2::timestamptz, $3::numeric, 0, 0.000, 0.00, 0.00, $4::numeric, '{}'::text[])
         RETURNING id`,
        addonPlanId,
        OCT_1,
        (mensalidade / 100).toFixed(2),
        porVeiculo === null ? null : (porVeiculo / 100).toFixed(2),
      );
      await insertAddon(h, tenantId, subscriptionId, addonPlanId, OCT_1, null);
      for (let i = 0; i < 3; i += 1) {
        const vehicleId = await insertVehicle(h, tenantId);
        await insertBinding(h, tenantId, vehicleId, SEP_30, null);
      }
      const { service } = await runtimeFor(h.role.client);
      const out = await service.close({ tenantId, period: PERIOD, now: NOW, actorId: null, source: "job" });
      assert.deepEqual(out, { kind: "skipped", reason: "addon_without_price", alreadyClosed: false });
      const rows = await h.admin.$queryRawUnsafe<Array<{ status: string }>>(
        `SELECT status FROM subscription_statements WHERE tenant_id = $1::uuid`,
        tenantId,
      );
      assert.equal(rows.filter((row) => row.status === "closed").length, 0, "nenhum demonstrativo closed: nem 50,00 nem 0,00");
    });
  }
}
