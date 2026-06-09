import { Router } from "express";

import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import { requirePlatformPermission } from "../platform/platform-permissions.js";
import {
  createDefaultCloudCostAllocationService,
  isCloudCostAllocationStrategy,
} from "./cloud-cost-allocation.service.js";
import type { CloudCostAllocationRun, TenantCloudCostAllocation } from "./cloud-cost-allocation.types.js";

export function createCloudCostAllocationPlatformRouter(): Router {
  const router = Router();

  router.get(
    "/runs",
    requirePlatformPermission("platform:cloud-cost-allocation:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostAllocationService();
      const runs = await service.listAllocationRuns(parseRunFilters(request.query));
      response.status(200).json({ data: runs.map(toRunDto) });
    }),
  );

  router.get(
    "/runs/:runId",
    requirePlatformPermission("platform:cloud-cost-allocation:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostAllocationService();
      const run = await service.getAllocationRun(readRouteParam(request.params.runId));
      response.status(200).json({ data: toRunDto(run) });
    }),
  );

  router.post(
    "/runs",
    requirePlatformPermission("platform:cloud-cost-allocation:run"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostAllocationService();
      const body = request.body as Record<string, unknown>;
      const strategy = readQueryString(body.strategy);
      const run = await service.allocateCostsForPeriod({
        periodStart: readRequiredDate(body.periodStart),
        periodEnd: readRequiredDate(body.periodEnd),
        strategy: strategy && isCloudCostAllocationStrategy(strategy) ? strategy : undefined,
        createdBy: readImportedBy(request),
      });

      response.status(201).json({ data: toRunDto(run) });
    }),
  );

  router.get(
    "/runs/:runId/tenant-allocations",
    requirePlatformPermission("platform:cloud-cost-allocation:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostAllocationService();
      const allocations = await service.listTenantAllocations(
        readRouteParam(request.params.runId),
        parseAllocationFilters(request.query),
      );
      response.status(200).json({ data: allocations.map(toAllocationDto) });
    }),
  );

  router.get(
    "/summary",
    requirePlatformPermission("platform:cloud-cost-allocation:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostAllocationService();
      const summary = await service.getAllocationSummary(parseRunFilters(request.query));
      response.status(200).json({ data: summary });
    }),
  );

  return router;
}

function parseRunFilters(query: Record<string, unknown>) {
  return {
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
    status: readQueryString(query.status) as CloudCostAllocationRun["status"] | undefined,
  };
}

function parseAllocationFilters(query: Record<string, unknown>) {
  return {
    tenantId: readQueryString(query.tenantId),
    serviceCode: readQueryString(query.serviceCode),
    costCategory: readQueryString(query.costCategory),
  };
}

function toRunDto(run: CloudCostAllocationRun) {
  return {
    id: run.id,
    provider: run.provider,
    status: run.status,
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    strategy: run.strategy,
    totalImportedCost: run.totalImportedCost,
    totalAllocatedCost: run.totalAllocatedCost,
    totalUnallocatedCost: run.totalUnallocatedCost,
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

function toAllocationDto(allocation: TenantCloudCostAllocation) {
  return {
    id: allocation.id,
    allocationRunId: allocation.allocationRunId,
    tenantId: allocation.tenantId,
    provider: allocation.provider,
    periodStart: allocation.periodStart.toISOString(),
    periodEnd: allocation.periodEnd.toISOString(),
    serviceCode: allocation.serviceCode,
    usageType: allocation.usageType,
    costCategory: allocation.costCategory,
    allocationMethod: allocation.allocationMethod,
    allocationBasisMetricKey: allocation.allocationBasisMetricKey,
    allocationBasisQuantity: allocation.allocationBasisQuantity,
    allocationRatio: allocation.allocationRatio,
    allocatedCost: allocation.allocatedCost,
    currency: allocation.currency,
    sourceCostLineItemIds: allocation.sourceCostLineItemIds,
    metadata: allocation.metadata,
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
  };
}

function readImportedBy(request: { readonly actor?: { readonly userId?: string }; readonly headers: Record<string, unknown> }): string | undefined {
  return request.actor?.userId ?? readQueryString(request.headers["x-user-id"]);
}

function readQueryString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function readDate(value: unknown): Date | undefined {
  const raw = readQueryString(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function readRequiredDate(value: unknown): Date {
  const date = readDate(value);
  if (!date) throw new Error("periodStart and periodEnd are required dates.");
  return date;
}
