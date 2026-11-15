// B-ASS-12 · F3b — rotas de PLATAFORMA do demonstrativo de rastreamento cobrado (item 65).
// rota-1: o DTO da plataforma expõe a linha de rastreamento (unidade, veículos cobrados e trechos);
// rota-2: o fechamento pula a organização com add-on sem preço (`addon_without_price`) e fecha as outras.
// Valores de teste, fictícios: nenhum é preço real.

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import { todayBusinessDate } from "../src/modules/subscription-billing/plans/plan-versioning.js";
import {
  computeStatement,
  type StatementComputationInput,
} from "../src/modules/subscription-billing/statements/statement.engine.js";
import { resetStatementRuntimeForTests } from "../src/modules/subscription-billing/statements/statement.factory.js";
import { toStatementDto } from "../src/modules/subscription-billing/statements/statements.platform.routes.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";
import {
  getMemoryPlansRepositoryForTests,
  getMemorySubscriptionsRepositoryForTests,
  getMemoryTenantLookupForTests,
} from "../src/modules/subscription-billing/subscription-billing.service.js";

const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;

type Json = Record<string, any>;

function previousPeriod(): string {
  const today = todayBusinessDate(new Date());
  const [year, month] = today.split("-").map(Number) as [number, number];
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

let seq = 0;

function computationInput(patch: Partial<StatementComputationInput> = {}): StatementComputationInput {
  return {
    daysInMonth: 31,
    segments: [{ subscriptionId: "s1", planVersionId: "v-base", fromDay: 1, toDay: 31, monthlyPriceCents: 31_000 }],
    terms: { includedUsers: 5, includedStorageMilliGb: 5_000, extraUserPriceCents: 2_000, extraGbPriceCents: 300 },
    measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 2 },
    perVehiclePriceCents: 1_990,
    tracking: null,
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
    ...patch,
  };
}

function statementOf(computation: ReturnType<typeof computeStatement>): SubscriptionStatement {
  return {
    id: "st_rota",
    tenantId: "ten_rota",
    period: "2026-10",
    status: "closed",
    chargeStatus: "none",
    invoiceStatus: "none",
    subscriptionId: "s1",
    planVersionId: "v-base",
    addonPlanVersionId: null,
    computation,
    daysInMonth: 31,
    daysMeasured: 31,
    totalCents: computation.totalCents,
    paidCents: 0,
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
    adjustmentNote: null,
    dueDate: "2026-11-10",
    closedAt: null,
    closedBy: null,
    reopenedAt: null,
    reopenedBy: null,
    reopenReason: null,
    paidAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    snapshot: { latest: null, history: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

test("T-TRK-rota-1: o DTO da plataforma expõe trackingUnit, trackingBilledVehicles e trackingSegments", () => {
  // Regime por veículo: 2 medidos, 1 cobrado (cobrados ≠ medidos) — a plataforma explica a linha.
  const perVehicle = computeStatement(
    computationInput({
      measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 2 },
      perVehiclePriceCents: 1_990,
      tracking: {
        billedVehicles: 1,
        perVehicle: { addonPlanVersionId: "v-basic", billedVehicles: 1, perVehiclePriceCents: 1_990 },
        flatSegments: [],
      },
    }),
  );
  const perVehicleDto = toStatementDto(statementOf(perVehicle));
  assert.equal(perVehicleDto.trackedVehicles, 2);
  assert.equal(perVehicleDto.trackingBilledVehicles, 1);
  assert.equal(perVehicleDto.trackingUnit, "per_vehicle");
  assert.equal(perVehicleDto.trackingAmount, "19.90");
  assert.deepEqual(perVehicleDto.trackingSegments, []);

  // Mensalidade fixa com dois trechos: `amount` é o pro-rata do trecho; `monthlyPrice` é a mensalidade cheia.
  const flat = computeStatement(
    computationInput({
      measurements: { usersPeak: 0, storagePeakMilliGb: 0, trackedVehicles: 1 },
      perVehiclePriceCents: null,
      tracking: {
        billedVehicles: 1,
        perVehicle: null,
        flatSegments: [
          { addonId: "a1", addonPlanVersionId: "v-flat-1", fromDay: 1, toDay: 14, monthlyPriceCents: 5_000, billedVehicles: 1 },
          { addonId: "a1", addonPlanVersionId: "v-flat-2", fromDay: 15, toDay: 31, monthlyPriceCents: 8_000, billedVehicles: 1 },
        ],
      },
    }),
  );
  const flatDto = toStatementDto(statementOf(flat));
  assert.equal(flatDto.trackingUnit, "flat");
  assert.equal(flatDto.trackingBilledVehicles, 1);
  assert.equal(flatDto.trackingAmount, "66.45");
  assert.deepEqual(
    flatDto.trackingSegments.map((segment) => [segment.fromDay, segment.toDay, segment.amount, segment.monthlyPrice]),
    [
      [1, 14, "22.58", "50.00"],
      [15, 31, "43.87", "80.00"],
    ],
  );
});

async function seedTenant(tenantId: string): Promise<{ subscriptionId: string; from: Date }> {
  seq += 1;
  const plans = getMemoryPlansRepositoryForTests();
  const plan = await plans.createPlan({ code: `ass12-base-${seq}`, kind: "base", name: "Base", description: "", active: true, createdBy: null });
  const from = new Date(`${previousPeriod()}-01T00:00:00-03:00`);
  await plans.createVersion({
    planId: plan.id,
    version: 1,
    validFrom: from,
    validTo: null,
    monthlyPriceCents: 19990,
    includedUsers: 10,
    includedStorageGb: 10,
    extraUserPriceCents: 500,
    extraGbPriceCents: 200,
    perVehiclePriceCents: null,
    pricingUnit: "flat",
    modules: ["dashboard"],
    notes: null,
    inaugural: false,
  });
  const subscription = await getMemorySubscriptionsRepositoryForTests().createSubscription({
    tenantId,
    planId: plan.id,
    validFrom: from,
    validTo: null,
    monthlyPriceOverrideCents: null,
    includedUsersOverride: null,
    includedStorageGbOverride: null,
    extraUserPriceOverrideCents: null,
    extraGbPriceOverrideCents: null,
    dueDays: 10,
    status: "active",
    notes: null,
  });
  return { subscriptionId: subscription.id, from };
}

async function seedUnpricedAddon(tenantId: string, subscriptionId: string, from: Date): Promise<void> {
  seq += 1;
  const plans = getMemoryPlansRepositoryForTests();
  const addon = await plans.createPlan({ code: `ass12-addon-${seq}`, kind: "addon_tracking", name: "Rastreamento", description: "", active: true, createdBy: null });
  await plans.createVersion({
    planId: addon.id,
    version: 1,
    validFrom: from,
    validTo: null,
    monthlyPriceCents: 0,
    includedUsers: 0,
    includedStorageGb: 0,
    extraUserPriceCents: 0,
    extraGbPriceCents: 0,
    perVehiclePriceCents: null,
    pricingUnit: "per_vehicle",
    modules: [],
    notes: null,
    inaugural: false,
  });
  await getMemorySubscriptionsRepositoryForTests().createAddon({
    tenantId,
    subscriptionId,
    planId: addon.id,
    validFrom: from,
    validTo: null,
    perVehiclePriceOverrideCents: null,
  });
}

async function close(baseUrl: string, tenantId: string): Promise<Json> {
  const response = await requestJson(baseUrl, "/api/v1/platform/billing/statements/close", {
    method: "POST",
    headers: PLATFORM,
    body: { tenantId, period: previousPeriod() },
  });
  assert.equal(response.status, 200);
  return response.body.data as Json;
}

test("T-TRK-rota-2: o fechamento pula a organização com add-on sem preço e fecha as outras", async () => {
  await withApi(async (baseUrl) => {
    const okId = `ten_ok_${++seq}`;
    getMemoryTenantLookupForTests().upsert({ id: okId, slug: `org-ok-${seq}` });
    await seedTenant(okId);

    const badId = `ten_bad_${++seq}`;
    getMemoryTenantLookupForTests().upsert({ id: badId, slug: `org-bad-${seq}` });
    const { subscriptionId, from } = await seedTenant(badId);
    await seedUnpricedAddon(badId, subscriptionId, from);

    const ok = await close(baseUrl, okId);
    assert.equal(ok.closed.length, 1);
    assert.equal(ok.skipped.length, 0);

    const bad = await close(baseUrl, badId);
    assert.equal(bad.closed.length, 0);
    assert.deepEqual(bad.skipped, [{ tenantId: badId, reason: "addon_without_price" }]);
  });
});

async function withApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  resetStatementRuntimeForTests();

  const { createApp } = await import("../src/app.js");
  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await closeServer(server);
  }
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
): Promise<{ status: number; body: Json }> {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: (await response.json()) as Json };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
