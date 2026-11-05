import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { InMemoryPlansRepository } from "../src/modules/subscription-billing/plans/plans.repository.js";
import { PlansService } from "../src/modules/subscription-billing/plans/plans.service.js";
import { InMemorySubscriptionsRepository } from "../src/modules/subscription-billing/plans/subscriptions.repository.js";
import { SubscriptionsService } from "../src/modules/subscription-billing/plans/subscriptions.service.js";
import { SubscriptionBillingError } from "../src/modules/subscription-billing/plans/plan-types.js";
import {
  InMemoryTenantLookup,
  resetSubscriptionBillingRuntimeForTests,
} from "../src/modules/subscription-billing/subscription-billing.service.js";
import { RecordingTenantModulesWriter } from "../src/modules/subscription-billing/plans/tenant-modules.sync.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import { PERMISSION_CATALOG } from "../src/modules/core-saas/permissions/catalog.js";
import { PLATFORM_PERMISSIONS } from "../src/modules/platform/platform-permissions.js";

// Relógio fixo: data civil SP = 2026-11-05 (quinta).
const NOW = new Date("2026-11-05T12:00:00-03:00");

function spDate(value: string): Date {
  return new Date(value + "T00:00:00-03:00");
}

function newStack() {
  const plansRepo = new InMemoryPlansRepository();
  const subsRepo = new InMemorySubscriptionsRepository();
  const tenants = new InMemoryTenantLookup();
  const writer = new RecordingTenantModulesWriter();
  const plans = new PlansService(plansRepo, () => NOW);
  const subscriptions = new SubscriptionsService(subsRepo, plansRepo, tenants, writer, () => NOW);
  return { plansRepo, subsRepo, tenants, writer, plans, subscriptions };
}

type Stack = ReturnType<typeof newStack>;

async function seedPlan(
  stack: Stack,
  code: string,
  kind: "base" | "addon_tracking",
  modules: readonly string[],
) {
  const plan = await stack.plans.createPlan({ code, kind, name: code, description: "" });
  await stack.plans.addVersion(plan.id, {
    validFrom: spDate("2026-11-05"),
    monthlyPriceCents: 19990,
    includedUsers: 10,
    includedStorageGb: 10,
    extraUserPriceCents: 500,
    extraGbPriceCents: 200,
    perVehiclePriceCents: kind === "addon_tracking" ? 1500 : null,
    pricingUnit: kind === "addon_tracking" ? "per_vehicle" : "flat",
    modules,
    notes: null,
    inaugural: false,
  });
  return plan;
}

function reasonOf(error: unknown): string | undefined {
  return error instanceof SubscriptionBillingError ? error.reason : undefined;
}

async function activeAddonsOf(
  stack: Stack,
  tenantId: string,
  subscriptionId: string,
): Promise<readonly string[]> {
  const addons = await stack.subsRepo.listActiveAddons(tenantId, subscriptionId);
  const codes: string[] = [];
  for (const addon of addons) {
    const plans = await stack.plansRepo.listPlans();
    const plan = plans.find((item) => item.id === addon.planId);
    if (plan) codes.push(plan.code);
  }
  return codes;
}

// --------------------------------------------------------------------------------- R-PLAN-3

test("T-PL-8: modules[] só aceita chaves do moduleCatalog → 422 module_unknown", async () => {
  const stack = newStack();
  const plan = await seedPlan(stack, "starter", "base", ["dashboard", "users"]);

  await assert.rejects(
    stack.plans.addVersion(plan.id, {
      validFrom: spDate("2026-12-01"),
      monthlyPriceCents: 19990,
      includedUsers: 10,
      includedStorageGb: 10,
      extraUserPriceCents: 500,
      extraGbPriceCents: 200,
      perVehiclePriceCents: null,
      pricingUnit: "flat",
      modules: ["dashboard", "nao-existe"],
      notes: null,
      inaugural: false,
    }),
    (error: unknown) => {
      assert.equal(reasonOf(error), "module_unknown");
      return true;
    },
  );
});

test("T-PL-9: após PUT …/subscription, modules = versão vigente ∪ add-ons", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);
  await seedPlan(stack, "tracking_basic", "addon_tracking", ["mobile"]);

  await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
    addons: [{ planCode: "tracking_basic" }],
  });

  assert.equal(stack.writer.calls.length, 1);
  assert.deepEqual(stack.writer.calls[0]!.modules, ["dashboard", "users", "mobile"]);
});

test("T-PL-10: organização sem assinatura não toca modules; DELETE não apaga", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_a", slug: "a" });
  stack.tenants.upsert({ id: "ten_b", slug: "b" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);

  await stack.subscriptions.putSubscription("ten_a", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
  });
  await stack.subscriptions.deleteSubscription("ten_a", {});

  assert.equal(stack.writer.calls.length, 1);
  assert.equal(stack.writer.calls[0]!.tenantId, "ten_a");
});

// --------------------------------------------------------------------------------- R-PLAN-4 / R-PLAN-5

test("T-PL-11: dois PUTs com validFrom crescentes → 1 active + 1 ended", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);

  await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
  });
  await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-12-01"),
  });

  const subscriptions = await stack.subsRepo.listSubscriptions("ten_1");
  const active = subscriptions.filter((item) => item.status === "active");
  const ended = subscriptions.filter((item) => item.status === "ended");
  assert.equal(active.length, 1);
  assert.equal(ended.length, 1);
  assert.equal(ended[0]!.validTo?.getTime(), spDate("2026-12-01").getTime());
});

test("T-PL-12: plano sem versão vigente → 422 plan_without_price", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await stack.plans.createPlan({ code: "starter", kind: "base", name: "Starter", description: "" });

  await assert.rejects(
    stack.subscriptions.putSubscription("ten_1", {
      planCode: "starter",
      validFrom: spDate("2026-11-05"),
    }),
    (error: unknown) => {
      assert.equal(reasonOf(error), "plan_without_price");
      return true;
    },
  );
});

// --------------------------------------------------------------------------------- R-PLAN-9

test("T-PL-15: rota /billing sem papel de plataforma → 403; com papel → 200", async () => {
  await withPlatformApi(async (baseUrl) => {
    resetSubscriptionBillingRuntimeForTests();

    const tenantActor = await requestJson(baseUrl, "/api/v1/platform/billing/plans", {
      headers: { "x-tenant-id": "ten_demo", "x-user-id": "usr_demo", "x-role": "manager" },
    });
    assert.equal(tenantActor.status, 403);
    assert.equal(tenantActor.body.error.reason, "platform_permission_required");

    const platformActor = await requestJson(baseUrl, "/api/v1/platform/billing/plans", {
      headers: { "x-user-id": "usr_platform", "x-role": "super_admin" },
    });
    assert.equal(platformActor.status, 200);
    assert.equal(Array.isArray(platformActor.body.data), true);
  });
});

test("T-PL-16: platform:billing:read/manage no catálogo e em PLATFORM_PERMISSIONS", () => {
  assert.equal(PERMISSION_CATALOG.includes("platform:billing:read"), true);
  assert.equal(PERMISSION_CATALOG.includes("platform:billing:manage"), true);
  assert.equal((PLATFORM_PERMISSIONS as readonly string[]).includes("platform:billing:read"), true);
  assert.equal((PLATFORM_PERMISSIONS as readonly string[]).includes("platform:billing:manage"), true);
});

// --------------------------------------------------------------------------------- R-PLAN-4 / R-PLAN-10 / R-PLAN-11 / R-PLAN-12

test("T-PL-20: validFrom ≤ valid_from da vigente → 422 subscription_retroactive", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);

  await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
  });

  await assert.rejects(
    stack.subscriptions.putSubscription("ten_1", {
      planCode: "starter",
      validFrom: spDate("2026-11-05"),
    }),
    (error: unknown) => {
      assert.equal(reasonOf(error), "subscription_retroactive");
      return true;
    },
  );
});

test("T-PL-21: addons omitido migra; addons: [] encerra", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);
  await seedPlan(stack, "tracking_basic", "addon_tracking", ["mobile"]);

  const first = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
    addons: [{ planCode: "tracking_basic" }],
  });
  assert.deepEqual(await activeAddonsOf(stack, "ten_1", first.subscription.id), ["tracking_basic"]);

  const migrated = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-12-01"),
  });
  assert.deepEqual(await activeAddonsOf(stack, "ten_1", migrated.subscription.id), [
    "tracking_basic",
  ]);

  const cleared = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2027-01-01"),
    addons: [],
  });
  assert.deepEqual(await activeAddonsOf(stack, "ten_1", cleared.subscription.id), []);
});

test("T-PL-22: addons [tracking_basic, tracking_plus] juntos → 422 addon_duplicate_tracking", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);
  await seedPlan(stack, "tracking_basic", "addon_tracking", ["mobile"]);
  await seedPlan(stack, "tracking_plus", "addon_tracking", ["mobile", "notifications"]);

  await assert.rejects(
    stack.subscriptions.putSubscription("ten_1", {
      planCode: "starter",
      validFrom: spDate("2026-11-05"),
      addons: [{ planCode: "tracking_basic" }, { planCode: "tracking_plus" }],
    }),
    (error: unknown) => {
      assert.equal(reasonOf(error), "addon_duplicate_tracking");
      return true;
    },
  );
});

test("T-PL-23: trocar Básico por Plus fecha a linha antiga com valid_to", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);
  await seedPlan(stack, "tracking_basic", "addon_tracking", ["mobile"]);
  await seedPlan(stack, "tracking_plus", "addon_tracking", ["mobile", "notifications"]);

  const first = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
    addons: [{ planCode: "tracking_basic" }],
  });

  const second = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-12-01"),
    addons: [{ planCode: "tracking_plus" }],
  });

  assert.deepEqual(await activeAddonsOf(stack, "ten_1", second.subscription.id), [
    "tracking_plus",
  ]);

  const oldAddons = await stack.subsRepo.listAddons("ten_1", first.subscription.id);
  assert.equal(oldAddons.length, 1);
  assert.equal(oldAddons[0]!.planId, (await stack.plansRepo.getPlanByCode("tracking_basic"))!.id);
  assert.equal(oldAddons[0]!.validTo?.getTime(), spDate("2026-12-01").getTime());
});

test("T-PL-24: DELETE fecha a vigente e os add-ons; GET → null", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);
  await seedPlan(stack, "tracking_basic", "addon_tracking", ["mobile"]);

  const assigned = await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
    addons: [{ planCode: "tracking_basic" }],
  });

  await stack.subscriptions.deleteSubscription("ten_1", {});

  const view = await stack.subscriptions.getSubscription("ten_1");
  assert.equal(view, null);

  const subscriptions = await stack.subsRepo.listSubscriptions("ten_1");
  assert.equal(subscriptions[0]!.status, "ended");
  assert.equal(subscriptions[0]!.validTo !== null, true);
  assert.deepEqual(await activeAddonsOf(stack, "ten_1", assigned.subscription.id), []);
});

test("T-PL-25: segundo DELETE → 422 no_active_subscription", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_1", slug: "acme" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);

  await stack.subscriptions.putSubscription("ten_1", {
    planCode: "starter",
    validFrom: spDate("2026-11-05"),
  });
  await stack.subscriptions.deleteSubscription("ten_1", {});

  await assert.rejects(
    stack.subscriptions.deleteSubscription("ten_1", {}),
    (error: unknown) => {
      assert.equal(reasonOf(error), "no_active_subscription");
      return true;
    },
  );
});

test("T-PL-26: slug = platform não assina → 422 platform_organization", async () => {
  const stack = newStack();
  stack.tenants.upsert({ id: "ten_platform", slug: "platform" });
  await seedPlan(stack, "starter", "base", ["dashboard", "users"]);

  await assert.rejects(
    stack.subscriptions.putSubscription("ten_platform", {
      planCode: "starter",
      validFrom: spDate("2026-11-05"),
    }),
    (error: unknown) => {
      assert.equal(reasonOf(error), "platform_organization");
      return true;
    },
  );
});

// --------------------------------------------------------------------------------- HTTP helper

async function withPlatformApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const { createApp } = await import("../src/app.js");
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const app = createApp(new MemoryCoreSaasAdapter(service));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback(baseUrl);
  } finally {
    await closeServer(server);
  }
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return "http://127.0.0.1:" + (address as AddressInfo).port;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
