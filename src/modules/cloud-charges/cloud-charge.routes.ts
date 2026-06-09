import { Router } from "express";

import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import { requirePlatformPermission } from "../platform/platform-permissions.js";
import { createDefaultCloudChargeService } from "./cloud-charge.service.js";
import type {
  CloudChargeCalculationRun,
  CloudChargeRule,
  TenantCloudCharge,
} from "./cloud-charge.types.js";
import {
  parseCalculationRunFilters,
  parseCreateCalculationRunBody,
  parseCreateCloudChargeRuleBody,
  parseRuleFilters,
  parseTenantChargeFilters,
  parseUpdateCloudChargeRuleBody,
} from "./cloud-charge.validators.js";

export function createCloudChargesPlatformRouter(): Router {
  const router = Router();

  router.get(
    "/cloud-charge-rules",
    requirePlatformPermission("platform:cloud-charge-rules:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const rules = await service.listCloudChargeRules(parseRuleFilters(request.query));
      response.status(200).json({ data: rules.map(toRuleDto) });
    }),
  );

  router.post(
    "/cloud-charge-rules",
    requirePlatformPermission("platform:cloud-charge-rules:write"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const rule = await service.createCloudChargeRule(
        parseCreateCloudChargeRuleBody(request.body as Record<string, unknown>),
      );
      response.status(201).json({ data: toRuleDto(rule) });
    }),
  );

  router.get(
    "/cloud-charge-rules/:ruleId",
    requirePlatformPermission("platform:cloud-charge-rules:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const rule = await service.getCloudChargeRule(readRouteParam(request.params.ruleId));
      response.status(200).json({ data: toRuleDto(rule) });
    }),
  );

  router.patch(
    "/cloud-charge-rules/:ruleId",
    requirePlatformPermission("platform:cloud-charge-rules:write"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const rule = await service.updateCloudChargeRule(
        readRouteParam(request.params.ruleId),
        parseUpdateCloudChargeRuleBody(request.body as Record<string, unknown>),
      );
      response.status(200).json({ data: toRuleDto(rule) });
    }),
  );

  router.get(
    "/cloud-charges/calculation-runs",
    requirePlatformPermission("platform:cloud-charges:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const runs = await service.listCalculationRuns(parseCalculationRunFilters(request.query));
      response.status(200).json({ data: runs.map(toRunDto) });
    }),
  );

  router.get(
    "/cloud-charges/calculation-runs/:runId",
    requirePlatformPermission("platform:cloud-charges:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const run = await service.getCalculationRun(readRouteParam(request.params.runId));
      response.status(200).json({ data: toRunDto(run) });
    }),
  );

  router.post(
    "/cloud-charges/calculation-runs",
    requirePlatformPermission("platform:cloud-charges:calculate"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const run = await service.calculateTenantChargesForAllocationRun({
        ...parseCreateCalculationRunBody(request.body as Record<string, unknown>),
        createdBy: readCreatedBy(request),
      });
      response.status(201).json({ data: toRunDto(run) });
    }),
  );

  router.get(
    "/cloud-charges/calculation-runs/:runId/tenant-charges",
    requirePlatformPermission("platform:cloud-charges:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const charges = await service.listTenantCharges(
        readRouteParam(request.params.runId),
        parseTenantChargeFilters(request.query),
      );
      response.status(200).json({ data: charges.map(toChargeDto) });
    }),
  );

  router.get(
    "/cloud-charges/summary",
    requirePlatformPermission("platform:cloud-charges:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudChargeService();
      const summary = await service.getCloudChargeSummary(parseCalculationRunFilters(request.query));
      response.status(200).json({ data: summary });
    }),
  );

  return router;
}

function toRuleDto(rule: CloudChargeRule) {
  return {
    id: rule.id,
    tenantId: rule.tenantId,
    planCode: rule.planCode,
    name: rule.name,
    description: rule.description,
    isActive: rule.isActive,
    priority: rule.priority,
    effectiveFrom: rule.effectiveFrom.toISOString(),
    effectiveUntil: rule.effectiveUntil?.toISOString(),
    currency: rule.currency,
    markupType: rule.markupType,
    markupValue: rule.markupValue,
    minimumMonthlyCharge: rule.minimumMonthlyCharge,
    includedCloudCost: rule.includedCloudCost,
    includedUsageAmount: rule.includedUsageAmount,
    includedUsageMetricKey: rule.includedUsageMetricKey,
    overageMarkupType: rule.overageMarkupType,
    overageMarkupValue: rule.overageMarkupValue,
    roundingMode: rule.roundingMode,
    metadata: rule.metadata,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function toRunDto(run: CloudChargeCalculationRun) {
  return {
    id: run.id,
    status: run.status,
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    sourceAllocationRunId: run.sourceAllocationRunId,
    strategy: run.strategy,
    totalAllocatedCost: run.totalAllocatedCost,
    totalChargeAmount: run.totalChargeAmount,
    totalMarginAmount: run.totalMarginAmount,
    totalDiscountAmount: run.totalDiscountAmount,
    currency: run.currency,
    startedAt: run.startedAt?.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    createdBy: run.createdBy,
    errorMessage: run.errorMessage,
    metadata: run.metadata,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

function toChargeDto(charge: TenantCloudCharge) {
  return {
    id: charge.id,
    calculationRunId: charge.calculationRunId,
    tenantId: charge.tenantId,
    sourceAllocationRunId: charge.sourceAllocationRunId,
    cloudChargeRuleId: charge.cloudChargeRuleId,
    periodStart: charge.periodStart.toISOString(),
    periodEnd: charge.periodEnd.toISOString(),
    allocatedCost: charge.allocatedCost,
    includedCloudCost: charge.includedCloudCost,
    billableCost: charge.billableCost,
    markupType: charge.markupType,
    markupValue: charge.markupValue,
    minimumMonthlyCharge: charge.minimumMonthlyCharge,
    grossChargeAmount: charge.grossChargeAmount,
    discountAmount: charge.discountAmount,
    finalChargeAmount: charge.finalChargeAmount,
    marginAmount: charge.marginAmount,
    marginPercentage: charge.marginPercentage,
    currency: charge.currency,
    status: charge.status,
    metadata: charge.metadata,
    createdAt: charge.createdAt.toISOString(),
    updatedAt: charge.updatedAt.toISOString(),
  };
}

function readCreatedBy(request: { readonly actor?: { readonly userId?: string }; readonly headers: Record<string, unknown> }): string | undefined {
  return request.actor?.userId ?? readHeaderString(request.headers["x-user-id"]);
}

function readHeaderString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}
