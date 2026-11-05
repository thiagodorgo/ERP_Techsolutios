import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
const NOW = new Date("2026-11-05T12:00:00-03:00");
const YESTERDAY = new Date("2026-11-04T12:00:00-03:00");

if (!connectionString) {
  test("B-ASS-02 · sincronização de módulos exige DATABASE_URL", {
    skip: "Defina DATABASE_URL para executar T-PL-db-5 e T-PL-db-6.",
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
    return {
      client: new Client({ adapter: new PrismaPg({ connectionString: connectionString! }) }),
      tenantIds: [] as string[],
      planIds: [] as string[],
    };
  }

  after(async () => {
    if (!harnessPromise) return;
    const h = await harnessPromise;
    if (h.tenantIds.length > 0) {
      await h.client.$executeRawUnsafe(
        `DELETE FROM tenant_subscription_addons WHERE tenant_id = ANY($1::uuid[])`,
        h.tenantIds,
      );
      await h.client.$executeRawUnsafe(
        `DELETE FROM tenant_subscriptions WHERE tenant_id = ANY($1::uuid[])`,
        h.tenantIds,
      );
      await h.client.$executeRawUnsafe(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, h.tenantIds);
    }
    if (h.planIds.length > 0) {
      await h.client.$executeRawUnsafe(
        `DELETE FROM subscription_plan_versions WHERE plan_id = ANY($1::uuid[])`,
        h.planIds,
      );
      await h.client.$executeRawUnsafe(
        `DELETE FROM subscription_plans WHERE id = ANY($1::uuid[])`,
        h.planIds,
      );
    }
    await h.client.$disconnect();
  });

  async function newTenant(h: Harness, tag: string): Promise<string> {
    const slug = `ass02-mod-${tag}-${randomUUID().slice(0, 8)}`;
    const rows = await h.client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO tenants (name, slug, modules) VALUES ($1, $1, ARRAY[]::text[]) RETURNING id`,
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
    validFrom = NOW,
  ): Promise<{ id: string; code: string }> {
    const code = `ass02_${kind}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const rows = await h.client.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO subscription_plans (code, kind, name) VALUES ($1, $2, $1) RETURNING id`,
      code,
      kind,
    );
    const id = rows[0]!.id;
    h.planIds.push(id);
    await h.client.$executeRawUnsafe(
      `INSERT INTO subscription_plan_versions
         (plan_id, version, valid_from, monthly_price, included_users, included_storage_gb,
          extra_user_price, extra_gb_price, per_vehicle_price, pricing_unit, modules)
       VALUES ($1::uuid, 1, $2::timestamptz, 1, 1, 1, 1, 1, $3::numeric, $4, $5::text[])`,
      id,
      validFrom,
      kind === "addon_tracking" ? "1" : null,
      kind === "addon_tracking" ? "per_vehicle" : "flat",
      [...modules],
    );
    return { id, code };
  }

  async function subscriptionService(client: PrismaClient) {
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

  async function modulesOf(client: PrismaClient, tenantId: string): Promise<string[]> {
    const rows = await client.$queryRawUnsafe<Array<{ modules: string[] }>>(
      `SELECT modules FROM tenants WHERE id = $1::uuid`,
      tenantId,
    );
    return [...rows[0]!.modules].sort();
  }

  test("T-PL-db-5: PUT persiste a união dos módulos do plano-base e do add-on", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "put");
    const base = await newPlan(h, "base", ["dashboard", "users"]);
    const addon = await newPlan(h, "addon_tracking", ["tracking", "dashboard"]);
    const service = await subscriptionService(h.client);
    await service.putSubscription(tenantId, {
      planCode: base.code,
      validFrom: NOW,
      addons: [{ planCode: addon.code }],
    });
    assert.deepEqual(await modulesOf(h.client, tenantId), ["dashboard", "tracking", "users"]);
  });

  test("T-PL-db-6: versão que entra hoje ressincroniza organizações assinantes", async () => {
    const h = await harness();
    const tenantId = await newTenant(h, "version");
    const base = await newPlan(h, "base", ["dashboard"], YESTERDAY);
    await h.client.$executeRawUnsafe(
      `INSERT INTO tenant_subscriptions (tenant_id, plan_id, valid_from)
       VALUES ($1::uuid, $2::uuid, $3::timestamptz)`,
      tenantId,
      base.id,
      YESTERDAY,
    );
    await h.client.$executeRawUnsafe(
      `UPDATE tenants SET modules = ARRAY['dashboard']::text[] WHERE id = $1::uuid`,
      tenantId,
    );

    const [
      { PrismaPlansRepository },
      { PrismaSubscriptionsRepository },
      { PrismaTenantModulesWriter },
      { TenantModulesSynchronizer },
      { PlansService },
    ] = await Promise.all([
      import("../src/modules/subscription-billing/plans/plans-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js"),
      import("../src/modules/subscription-billing/plans/tenant-modules.prisma.js"),
      import("../src/modules/subscription-billing/plans/tenant-modules.sync.js"),
      import("../src/modules/subscription-billing/plans/plans.service.js"),
    ]);
    const plans = new PrismaPlansRepository(h.client);
    const synchronizer = new TenantModulesSynchronizer(
      new PrismaSubscriptionsRepository(h.client),
      plans,
      new PrismaTenantModulesWriter(h.client),
    );
    const service = new PlansService(plans, () => NOW, synchronizer);
    await service.addVersion(base.id, {
      validFrom: NOW,
      monthlyPriceCents: 1,
      includedUsers: 1,
      includedStorageGb: 1,
      extraUserPriceCents: 1,
      extraGbPriceCents: 1,
      perVehiclePriceCents: null,
      pricingUnit: "flat",
      modules: ["dashboard", "reports", "users"],
      notes: null,
      inaugural: false,
    });
    assert.deepEqual(await modulesOf(h.client, tenantId), ["dashboard", "reports", "users"]);
  });
}
