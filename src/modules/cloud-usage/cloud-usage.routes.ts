import { Router } from "express";

import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import { requirePlatformPermission } from "../platform/platform-permissions.js";
import { createDefaultCloudUsageService } from "./cloud-usage.service.js";
import { isCloudUsageMetricKey } from "./cloud-usage.service.js";
import type { CloudUsageDailyAggregate, CloudUsageFilters } from "./cloud-usage.types.js";

export function createCloudUsagePlatformRouter(): Router {
  const router = Router();

  router.get(
    "/summary",
    requirePlatformPermission("platform:cloud-usage:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudUsageService();
      const summary = await service.getPlatformUsageSummary(parseFilters(request.query));

      response.status(200).json({ data: summary });
    }),
  );

  router.get(
    "/tenants/:tenantId/summary",
    requirePlatformPermission("platform:cloud-usage:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudUsageService();
      const tenantId = readRouteParam(request.params.tenantId);
      const summary = await service.getTenantUsageSummary(tenantId, parseFilters(request.query));

      response.status(200).json({ data: summary });
    }),
  );

  router.get(
    "/tenants/:tenantId/daily",
    requirePlatformPermission("platform:cloud-usage:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudUsageService();
      const tenantId = readRouteParam(request.params.tenantId);
      const daily = await service.getTenantUsageDaily(tenantId, parseFilters(request.query));

      response.status(200).json({
        data: {
          tenantId,
          daily: daily.map(toDailyDto),
          generatedAt: new Date().toISOString(),
        },
      });
    }),
  );

  return router;
}

function parseFilters(query: Record<string, unknown>): CloudUsageFilters {
  const metricKey = readQueryString(query.metricKey);

  return {
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
    metricKey: metricKey && isCloudUsageMetricKey(metricKey) ? metricKey : undefined,
  };
}

function toDailyDto(aggregate: CloudUsageDailyAggregate) {
  return {
    date: aggregate.date,
    metricKey: aggregate.metricKey,
    quantity: aggregate.quantity,
    unit: aggregate.unit,
    sourceType: aggregate.sourceType,
  };
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
