import { Router } from "express";

import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import { requirePlatformPermission } from "../platform/platform-permissions.js";
import { createDefaultCloudCostService, isCloudCostSourceType } from "./aws-cur.service.js";
import type { CloudCostImport, CloudCostLineItem } from "./aws-cur.types.js";

export function createCloudCostsPlatformRouter(): Router {
  const router = Router();

  router.get(
    "/imports",
    requirePlatformPermission("platform:cloud-costs:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostService();
      const imports = await service.listImports(parseImportFilters(request.query));

      response.status(200).json({ data: imports.map(toImportDto) });
    }),
  );

  router.get(
    "/imports/:importId",
    requirePlatformPermission("platform:cloud-costs:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostService();
      const costImport = await service.getImport(readRouteParam(request.params.importId));

      response.status(200).json({ data: toImportDto(costImport) });
    }),
  );

  router.post(
    "/imports/manual-csv",
    requirePlatformPermission("platform:cloud-costs:import"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostService();
      const body = request.body as Record<string, unknown>;
      const csv = typeof body.csv === "string" ? body.csv : "";

      if (!csv.trim()) {
        response.status(400).json({
          error: {
            code: "BAD_REQUEST",
            reason: "csv_required",
            message: "CSV content is required.",
          },
        });
        return;
      }

      if (csv.length > 1_000_000) {
        response.status(413).json({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            reason: "csv_too_large",
            message: "Manual CSV import is limited to 1MB in this foundation.",
          },
        });
        return;
      }

      const costImport = await service.importAwsCurCsv({
        csv,
        sourceType: "manual_csv",
        sourceUri: typeof body.sourceUri === "string" ? body.sourceUri : undefined,
        importedBy: readImportedBy(request),
        metadata: isRecord(body.metadata) ? body.metadata : {},
      });

      response.status(201).json({ data: toImportDto(costImport) });
    }),
  );

  router.get(
    "/line-items",
    requirePlatformPermission("platform:cloud-costs:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostService();
      const lines = await service.listLineItems(parseLineItemFilters(request.query));

      response.status(200).json({ data: lines.map(toLineItemDto) });
    }),
  );

  router.get(
    "/summary",
    requirePlatformPermission("platform:cloud-costs:read"),
    handleAsyncRoute(async (request, response) => {
      const service = await createDefaultCloudCostService();
      const summary = await service.getSummary(parseLineItemFilters(request.query));

      response.status(200).json({ data: summary });
    }),
  );

  return router;
}

function parseImportFilters(query: Record<string, unknown>) {
  const sourceType = readQueryString(query.sourceType);

  return {
    status: readQueryString(query.status) as CloudCostImport["status"] | undefined,
    sourceType: sourceType && isCloudCostSourceType(sourceType) ? sourceType : undefined,
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
  };
}

function parseLineItemFilters(query: Record<string, unknown>) {
  return {
    importId: readQueryString(query.importId),
    periodStart: readDate(query.periodStart),
    periodEnd: readDate(query.periodEnd),
    serviceCode: readQueryString(query.serviceCode),
    usageType: readQueryString(query.usageType),
    region: readQueryString(query.region),
    tenantTag: readQueryString(query.tenantTag),
    limit: readNumber(query.limit),
  };
}

function toImportDto(costImport: CloudCostImport) {
  return {
    id: costImport.id,
    provider: costImport.provider,
    sourceType: costImport.sourceType,
    sourceUri: costImport.sourceUri,
    status: costImport.status,
    periodStart: costImport.periodStart?.toISOString(),
    periodEnd: costImport.periodEnd?.toISOString(),
    importedAt: costImport.importedAt?.toISOString(),
    importedBy: costImport.importedBy,
    rowCount: costImport.rowCount,
    totalUnblendedCost: costImport.totalUnblendedCost,
    currency: costImport.currency,
    metadata: costImport.metadata,
    errorMessage: costImport.errorMessage,
    createdAt: costImport.createdAt.toISOString(),
    updatedAt: costImport.updatedAt.toISOString(),
  };
}

function toLineItemDto(line: CloudCostLineItem) {
  return {
    id: line.id,
    importId: line.importId,
    provider: line.provider,
    billingPeriodStart: line.billingPeriodStart.toISOString(),
    billingPeriodEnd: line.billingPeriodEnd.toISOString(),
    usageStart: line.usageStart?.toISOString(),
    usageEnd: line.usageEnd?.toISOString(),
    serviceCode: line.serviceCode,
    usageType: line.usageType,
    operation: line.operation,
    region: line.region,
    resourceId: line.resourceId,
    costCategory: line.costCategory,
    environment: line.environment,
    project: line.project,
    tenantTag: line.tenantTag,
    moduleTag: line.moduleTag,
    usageAmount: line.usageAmount,
    usageUnit: line.usageUnit,
    unblendedCost: line.unblendedCost,
    amortizedCost: line.amortizedCost,
    currency: line.currency,
    metadata: line.metadata,
    createdAt: line.createdAt.toISOString(),
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

function readNumber(value: unknown): number | undefined {
  const raw = readQueryString(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
