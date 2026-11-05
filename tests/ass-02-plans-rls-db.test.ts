import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { Prisma, PrismaClient } from "@prisma/client";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;
const NOW = new Date("2026-11-05T12:00:00-03:00");

if (!connectionString) {
  test("B-ASS-02 · banco exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL para executar T-PL-db-1..4 e T-PL-db-7.",
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
        await h.admin.$executeRawUnsafe(
          `DELETE FROM tenant_subscription_addons WHERE tenant_id = ANY($1::uuid[])`,
          h.tenantIds,
        );
        await h.admin.$executeRawUnsafe(
          `DELETE FROM tenant_subscriptions WHERE tenant_id = ANY($1::uuid[])`,
          h.tenantIds,
        );
        await h.admin.$executeRawUnsafe(
          `DELETE FROM tenants WHERE id = ANY($1::uuid[])`,
          h.tenantIds,
        );
      }
      if (h.planIds.length > 0) {
        await h.admin.$executeRawUnsafe(
          `DELETE FROM subscription_plan_versions WHERE plan_id = ANY($1::uuid[])`,
          h.planIds,
        );
        await h.admin.$executeRawUnsafe(
          `DELETE FROM subscription_plans WHERE id = ANY($1::uuid[])`,
          h.planIds,
        );
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `ass02-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`,
      slug,
    );
    const id = rows[0]!.id;
    h.tenantIds.push(id);
    return id;
  }

  async function newPlan(
    h: Harness,
    kind: "base" | "addon_tracking",
    modules: readonly string[],
  ): Promise<{ id: string; code: string }> {
    const code = `ass02_${kind}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const rows = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_plans (code, kind, name) VALUES ($1, $2, $1) RETURNING id`,
      code,
      kind,
    );
    const id = rows[0]!.id;
    h.planIds.push(id);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, 100.00, 10, 10.000, 5.00, 2.00,
               $3::numeric, $4, $5::text[])`,
      id,
      NOW,
      kind === "addon_tracking" ? "15.00" : null,
      kind === "addon_tracking" ? "per_vehicle" : "flat",
      [...modules],
    );
    return { id, code };
  }

  async function createService(client: PrismaClient) {
    const [
      { PrismaPlansRepository },
      { PrismaSubscriptionsRepository },
      { PrismaTenantLookup },
      { PrismaTenantModulesWriter },
      { SubscriptionsService },
    ] = await Promise.all([
      import("../src/modules/subscription-billing/plans/plans-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/tenant-lookup.prisma.js"),
      import("../src/modules/subscription-billing/plans/tenant-modules.prisma.js"),
      import("../src/modules/subscription-billing/plans/subscriptions.service.js"),
    ]);
    return new SubscriptionsService(
      new PrismaSubscriptionsRepository(client),
      new PrismaPlansRepository(client),
      new PrismaTenantLookup(client),
      new PrismaTenantModulesWriter(client),
      () => NOW,
    );
  }

  test("T-PL-db-1: dois PUTs concorrentes deixam exatamente uma assinatura vigente", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "race-sub");
    const plan = await newPlan(h, "base", ["dashboard"]);
    const service = await createService(h.admin);

    const results = await Promise.allSettled([
      service.putSubscription(tenantId, { planCode: plan.code, validFrom: NOW }),
      service.putSubscription(tenantId, { planCode: plan.code, validFrom: NOW }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM tenant_subscriptions
       WHERE tenant_id = $1::uuid AND valid_to IS NULL`,
      tenantId,
    );
    assert.equal(rows[0]!.n, 1);
  });

  test("T-PL-db-2: tabelas tenant-scoped têm ENABLE + FORCE e uma política com USING/WITH CHECK", async () => {
    const h = await harness();
    const relations = await h.admin.$queryRawUnsafe<
      Array<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>
    >(
      `SELECT relname, relrowsecurity, relforcerowsecurity
       FROM pg_class
       WHERE oid IN ('tenant_subscriptions'::regclass, 'tenant_subscription_addons'::regclass)
       ORDER BY relname`,
    );
    assert.deepEqual(relations, [
      { relname: "tenant_subscription_addons", relrowsecurity: true, relforcerowsecurity: true },
      { relname: "tenant_subscriptions", relrowsecurity: true, relforcerowsecurity: true },
    ]);
    const policies = await h.admin.$queryRawUnsafe<
      Array<{ tablename: string; qual: string | null; with_check: string | null }>
    >(
      `SELECT tablename, qual, with_check FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename IN ('tenant_subscriptions', 'tenant_subscription_addons')
       ORDER BY tablename`,
    );
    assert.equal(policies.length, 2);
    for (const policy of policies) {
      assert.match(policy.qual ?? "", /app\.current_tenant_id/);
      assert.match(policy.with_check ?? "", /app\.current_tenant_id/);
    }
  });

  test("T-PL-db-3: papel NOSUPERUSER NOBYPASSRLS sem GUC vê zero linhas", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "noguc");
    const plan = await newPlan(h, "base", ["dashboard"]);
    await h.admin.$executeRawUnsafe(
      `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from)
       VALUES ($1::uuid, $2::uuid, $3::timestamptz)`,
      tenantId,
      plan.id,
      NOW,
    );
    const posture = await h.role.client.$queryRawUnsafe<
      Array<{ rolsuper: boolean; rolbypassrls: boolean }>
    >(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`);
    assert.deepEqual(posture, [{ rolsuper: false, rolbypassrls: false }]);
    const rows = await h.role.client.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM tenant_subscriptions`,
    );
    assert.equal(rows[0]!.n, 0);
  });

  test("T-PL-db-4: contexto da organização A nunca lê assinatura/add-on de B", async () => {
    const h = await harness();
    const [tenantA, tenantB] = await Promise.all([newTenant(h, "rls-a"), newTenant(h, "rls-b")]);
    const [base, addon] = await Promise.all([
      newPlan(h, "base", ["dashboard"]),
      newPlan(h, "addon_tracking", ["mobile"]),
    ]);
    for (const tenantId of [tenantA, tenantB]) {
      const subscriptions = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from)
         VALUES ($1::uuid, $2::uuid, $3::timestamptz) RETURNING id`,
        tenantId,
        base.id,
        NOW,
      );
      await h.admin.$executeRawUnsafe(
        `INSERT INTO tenant_subscription_addons (tenant_id, subscription_id, plan_id, valid_from)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz)`,
        tenantId,
        subscriptions[0]!.id,
        addon.id,
        NOW,
      );
    }
    const { withTenantRls } = await import("../src/database/rls.js");
    const visible = await withTenantRls(h.role.client, tenantA, async (tx: Prisma.TransactionClient) => {
      const subscriptions = await tx.tenantSubscription.findMany();
      const addons = await tx.tenantSubscriptionAddon.findMany();
      return { subscriptions, addons };
    });
    assert.deepEqual(visible.subscriptions.map((row) => row.tenant_id), [tenantA]);
    assert.deepEqual(visible.addons.map((row) => row.tenant_id), [tenantA]);
  });

  test("T-PL-db-7: UNIQUE parcial deixa um só add-on vigente sob corrida", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "race-addon");
    const [base, addonA, addonB] = await Promise.all([
      newPlan(h, "base", ["dashboard"]),
      newPlan(h, "addon_tracking", ["mobile"]),
      newPlan(h, "addon_tracking", ["notifications"]),
    ]);
    const subscriptions = await h.admin.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from)
       VALUES ($1::uuid, $2::uuid, $3::timestamptz) RETURNING id`,
      tenantId,
      base.id,
      NOW,
    );
    const { PrismaSubscriptionsRepository } = await import(
      "../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js"
    );
    const repository = new PrismaSubscriptionsRepository(h.admin);
    const create = (planId: string) =>
      repository.createAddon({
        tenantId,
        subscriptionId: subscriptions[0]!.id,
        planId,
        validFrom: NOW,
        validTo: null,
        perVehiclePriceOverrideCents: null,
      });
    const results = await Promise.allSettled([create(addonA.id), create(addonB.id)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rows = await h.admin.$queryRawUnsafe<Array<{ n: number }>>(
      `SELECT count(*)::int AS n FROM tenant_subscription_addons
       WHERE tenant_id = $1::uuid AND subscription_id = $2::uuid AND valid_to IS NULL`,
      tenantId,
      subscriptions[0]!.id,
    );
    assert.equal(rows[0]!.n, 1);
  });
}
