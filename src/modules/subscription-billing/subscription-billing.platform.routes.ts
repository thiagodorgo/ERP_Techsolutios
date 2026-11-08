// B-ASS-02 — rotas de plataforma do billing (/api/v1/platform/billing/*). Todas sob o gate
// platform-only (requirePlatformPermission) e com erros no envelope da casa. Dinheiro entra como
// string decimal e sai como string decimal (centavos ficam no domínio). O uso do mês corrente
// (usersPeak/storagePeakGb/trackedVehicles) chega no B-ASS-03; por ora é null honesto.

import { Router } from "express";

import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import { requirePlatformPermission } from "../platform/platform-permissions.js";
import { centsToMoney, storageGbToDecimal } from "./plans/plan-money.js";
import { resolveVersionAt } from "./plans/plan-versioning.js";
import type { SubscriptionPlan, SubscriptionPlanVersion } from "./plans/plan-types.js";
import type { PlanSummaryRow, SubscriptionView } from "./plans/subscriptions.service.js";
import {
  parseCreatePlanDto,
  parseCreateVersionDto,
  parseDeleteSubscriptionDto,
  parsePatchPlanDto,
  parsePutSubscriptionDto,
} from "./plans/route-validators.js";
import {
  createDefaultPlansService,
  createDefaultSubscriptionsService,
} from "./subscription-billing.service.js";
import { toUsageDto } from "./metering/metering.service.js";
import { createDefaultTenantUsageDailyQueryService } from "./metering/usage-query.service.js";
import { createStatementsPlatformRouter } from "./statements/statements.platform.routes.js";
import { createVaultPlatformRouter } from "./vault/vault.platform.routes.js";

export function createSubscriptionBillingPlatformRouter(): Router {
  const router = Router();

  router.get(
    "/plans",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (_request, response) => {
      const service = await createDefaultPlansService();
      const plans = await service.listPlans();
      const now = new Date();
      const data: PlanDto[] = [];
      for (const plan of plans) {
        const versions = await service.listVersions(plan.id);
        data.push(toPlanDto(plan, versions, now));
      }
      response.status(200).json({ data });
    }),
  );

  router.get(
    "/plans/summary",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (_request, response) => {
      const service = await createDefaultSubscriptionsService();
      const rows = await service.getPlansSummary();
      response.status(200).json({ data: rows.map(toSummaryDto) });
    }),
  );

  router.get(
    "/plans/:planId",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultPlansService();
      const plan = await service.getPlan(readRouteParam(request.params.planId));
      const versions = await service.listVersions(plan.id);
      response.status(200).json({ data: toPlanDto(plan, versions, new Date()) });
    }),
  );

  router.get(
    "/plans/:planId/versions",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultPlansService();
      const versions = await service.listVersions(readRouteParam(request.params.planId));
      response.status(200).json({ data: versions.map(toVersionDto) });
    }),
  );

  router.post(
    "/plans",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultPlansService();
      const plan = await service.createPlan(parseCreatePlanDto(request.body));
      response.status(201).json({ data: toPlanDto(plan, [], new Date()) });
    }),
  );

  router.patch(
    "/plans/:planId",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultPlansService();
      const plan = await service.patchPlan(
        readRouteParam(request.params.planId),
        parsePatchPlanDto(request.body),
      );
      const versions = await service.listVersions(plan.id);
      response.status(200).json({ data: toPlanDto(plan, versions, new Date()) });
    }),
  );

  router.post(
    "/plans/:planId/versions",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultPlansService();
      const version = await service.addVersion(
        readRouteParam(request.params.planId),
        parseCreateVersionDto(request.body),
      );
      response.status(201).json({ data: toVersionDto(version) });
    }),
  );

  router.get(
    "/tenants/:tenantId/subscription",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultSubscriptionsService();
      const subscription = await service.getSubscription(readRouteParam(request.params.tenantId));
      response.status(200).json({ data: subscription ? toSubscriptionDto(subscription) : null });
    }),
  );

  router.get(
    "/tenants/:tenantId/subscription/history",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultSubscriptionsService();
      const history = await service.getHistory(readRouteParam(request.params.tenantId));
      response.status(200).json({ data: history.map(toSubscriptionDto) });
    }),
  );

  router.put(
    "/tenants/:tenantId/subscription",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultSubscriptionsService();
      const subscription = await service.putSubscription(
        readRouteParam(request.params.tenantId),
        parsePutSubscriptionDto(request.body),
      );
      response.status(200).json({ data: toSubscriptionDto(subscription) });
    }),
  );

  router.delete(
    "/tenants/:tenantId/subscription",
    requirePlatformPermission("platform:billing:manage"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultSubscriptionsService();
      await service.deleteSubscription(
        readRouteParam(request.params.tenantId),
        parseDeleteSubscriptionDto(request.body),
      );
      response.status(200).json({ data: null });
    }),
  );

  router.get(
    "/tenants/:tenantId/usage",
    requirePlatformPermission("platform:billing:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultTenantUsageDailyQueryService();
      const rows = await service.listForTenant(
        readRouteParam(request.params.tenantId),
        parseUsageQuery(request.query),
      );
      response.status(200).json({ data: rows.map(toUsageDto) });
    }),
  );

  // B-ASS-04 · F7 — demonstrativo mensal, pagamentos e créditos.
  router.use(createStatementsPlatformRouter());
  // B-ASS-05 — cofre de credenciais e configuração dos provedores (sem rede).
  router.use(createVaultPlatformRouter());

  return router;
}

type PlanDto = {
  readonly id: string;
  readonly code: string;
  readonly kind: string;
  readonly name: string;
  readonly description: string;
  readonly active: boolean;
  readonly currentVersion: VersionDto | null;
  readonly nextVersion: VersionDto | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type VersionDto = {
  readonly id: string;
  readonly version: number;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly monthlyPrice: string;
  readonly includedUsers: number;
  readonly includedStorageGb: string;
  readonly extraUserPrice: string;
  readonly extraGbPrice: string;
  readonly perVehiclePrice: string | null;
  readonly pricingUnit: string;
  readonly modules: readonly string[];
  readonly notes: string | null;
  readonly inaugural: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

function toVersionDto(version: SubscriptionPlanVersion): VersionDto {
  return {
    id: version.id,
    version: version.version,
    validFrom: version.validFrom.toISOString(),
    validTo: version.validTo?.toISOString() ?? null,
    monthlyPrice: centsToMoney(version.monthlyPriceCents),
    includedUsers: version.includedUsers,
    includedStorageGb: storageGbToDecimal(version.includedStorageGb),
    extraUserPrice: centsToMoney(version.extraUserPriceCents),
    extraGbPrice: centsToMoney(version.extraGbPriceCents),
    perVehiclePrice:
      version.perVehiclePriceCents === null ? null : centsToMoney(version.perVehiclePriceCents),
    pricingUnit: version.pricingUnit,
    modules: version.modules,
    notes: version.notes,
    inaugural: version.inaugural,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  };
}

function toPlanDto(
  plan: SubscriptionPlan,
  versions: readonly SubscriptionPlanVersion[],
  now: Date,
): PlanDto {
  const currentVersion = resolveVersionAt(versions, now);
  const nextVersion =
    versions
      .filter((version) => version.validFrom.getTime() > now.getTime())
      .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime())[0] ?? null;

  return {
    id: plan.id,
    code: plan.code,
    kind: plan.kind,
    name: plan.name,
    description: plan.description,
    active: plan.active,
    currentVersion: currentVersion ? toVersionDto(currentVersion) : null,
    nextVersion: nextVersion ? toVersionDto(nextVersion) : null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function toSummaryDto(row: PlanSummaryRow) {
  return {
    planId: row.planId,
    code: row.code,
    kind: row.kind,
    organizations: row.organizations,
    contractedMonthlyAmount: centsToMoney(row.contractedMonthlyAmountCents),
    currentVersion: row.currentVersion ? toVersionDto(row.currentVersion) : null,
    nextVersion: row.nextVersion ? toVersionDto(row.nextVersion) : null,
  };
}

function toSubscriptionDto(view: SubscriptionView) {
  const subscription = view.subscription;
  return {
    planCode: view.plan.code,
    planName: view.plan.name,
    validFrom: subscription.validFrom.toISOString(),
    validTo: subscription.validTo?.toISOString() ?? null,
    status: subscription.status,
    dueDays: subscription.dueDays,
    overrides: {
      monthlyPrice:
        subscription.monthlyPriceOverrideCents === null
          ? null
          : centsToMoney(subscription.monthlyPriceOverrideCents),
      includedUsers: subscription.includedUsersOverride,
      includedStorageGb:
        subscription.includedStorageGbOverride === null
          ? null
          : storageGbToDecimal(subscription.includedStorageGbOverride),
      extraUserPrice:
        subscription.extraUserPriceOverrideCents === null
          ? null
          : centsToMoney(subscription.extraUserPriceOverrideCents),
      extraGbPrice:
        subscription.extraGbPriceOverrideCents === null
          ? null
          : centsToMoney(subscription.extraGbPriceOverrideCents),
    },
    addons: view.addons.map((addon) => ({
      planCode: addon.plan.code,
      planName: addon.plan.name,
      validFrom: addon.validFrom.toISOString(),
      validTo: addon.validTo?.toISOString() ?? null,
      perVehiclePriceOverride:
        addon.perVehiclePriceOverrideCents === null
          ? null
          : centsToMoney(addon.perVehiclePriceOverrideCents),
    })),
    notes: subscription.notes,
    usage: { usersPeak: null, storagePeakGb: null, trackedVehicles: null },
  };
}

function parseUsageQuery(query: Record<string, unknown>): { from?: string; to?: string } {
  const from = readDateKey(query.from);
  const to = readDateKey(query.to);

  return { ...(from ? { from } : {}), ...(to ? { to } : {}) };
}

function readDateKey(value: unknown): string | undefined {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}
