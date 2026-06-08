import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  CloudCostImport,
  CloudCostImportFilters,
  CloudCostLineItem,
  CloudCostLineItemFilters,
  CompleteCloudCostImportInput,
  CreateCloudCostImportInput,
  ParsedAwsCurLineItem,
} from "./aws-cur.types.js";
import type { CloudCostRepository } from "./aws-cur.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCloudCostRepository implements CloudCostRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createImport(input: CreateCloudCostImportInput): Promise<CloudCostImport> {
    const record = await this.client.cloudCostImport.create({
      data: {
        provider: input.provider,
        source_type: input.sourceType,
        source_uri: input.sourceUri ?? null,
        status: input.status,
        imported_by: input.importedBy ?? null,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapImport(record);
  }

  async updateImport(importId: string, input: CompleteCloudCostImportInput): Promise<CloudCostImport> {
    const record = await this.client.cloudCostImport.update({
      where: {
        id: importId,
      },
      data: {
        status: input.status,
        period_start: input.periodStart ?? null,
        period_end: input.periodEnd ?? null,
        imported_at: input.importedAt ?? null,
        row_count: input.rowCount,
        total_unblended_cost: input.totalUnblendedCost,
        currency: input.currency ?? null,
        error_message: input.errorMessage ?? null,
        ...(input.metadata ? { metadata: toJsonObject(input.metadata) } : {}),
      },
    });

    return mapImport(record);
  }

  async getImport(importId: string): Promise<CloudCostImport | undefined> {
    const record = await this.client.cloudCostImport.findUnique({
      where: {
        id: importId,
      },
    });

    return record ? mapImport(record) : undefined;
  }

  async listImports(filters: CloudCostImportFilters = {}): Promise<readonly CloudCostImport[]> {
    const records = await this.client.cloudCostImport.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.sourceType ? { source_type: filters.sourceType } : {}),
        ...(filters.periodStart || filters.periodEnd
          ? {
              AND: [
                ...(filters.periodStart ? [{ OR: [{ period_end: null }, { period_end: { gte: filters.periodStart } }] }] : []),
                ...(filters.periodEnd ? [{ OR: [{ period_start: null }, { period_start: { lte: filters.periodEnd } }] }] : []),
              ],
            }
          : {}),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return records.map(mapImport);
  }

  async createLineItems(importId: string, lines: readonly ParsedAwsCurLineItem[]): Promise<readonly CloudCostLineItem[]> {
    const created: CloudCostLineItem[] = [];

    for (const line of lines) {
      const existing = await this.client.cloudCostLineItem.findUnique({
        where: {
          import_id_raw_line_hash: {
            import_id: importId,
            raw_line_hash: line.rawLineHash,
          },
        },
      });

      if (existing) continue;

      const record = await this.client.cloudCostLineItem.create({
        data: {
          import_id: importId,
          provider: line.provider,
          billing_period_start: line.billingPeriodStart,
          billing_period_end: line.billingPeriodEnd,
          usage_start: line.usageStart ?? null,
          usage_end: line.usageEnd ?? null,
          service_code: line.serviceCode,
          usage_type: line.usageType ?? null,
          operation: line.operation ?? null,
          region: line.region ?? null,
          resource_id: line.resourceId ?? null,
          cost_category: line.costCategory ?? null,
          environment: line.environment ?? null,
          project: line.project ?? null,
          tenant_tag: line.tenantTag ?? null,
          module_tag: line.moduleTag ?? null,
          usage_amount: line.usageAmount ?? null,
          usage_unit: line.usageUnit ?? null,
          unblended_cost: line.unblendedCost,
          amortized_cost: line.amortizedCost ?? null,
          currency: line.currency,
          raw_line_hash: line.rawLineHash,
          metadata: toJsonObject(line.metadata),
        },
      });

      created.push(mapLineItem(record));
    }

    return created;
  }

  async listLineItems(filters: CloudCostLineItemFilters = {}): Promise<readonly CloudCostLineItem[]> {
    const records = await this.client.cloudCostLineItem.findMany({
      where: {
        ...(filters.importId ? { import_id: filters.importId } : {}),
        ...(filters.periodStart || filters.periodEnd
          ? {
              billing_period_start: {
                ...(filters.periodStart ? { gte: filters.periodStart } : {}),
                ...(filters.periodEnd ? { lte: filters.periodEnd } : {}),
              },
            }
          : {}),
        ...(filters.serviceCode ? { service_code: filters.serviceCode } : {}),
        ...(filters.usageType ? { usage_type: filters.usageType } : {}),
        ...(filters.region ? { region: filters.region } : {}),
        ...(filters.tenantTag ? { tenant_tag: filters.tenantTag } : {}),
      },
      orderBy: {
        billing_period_start: "asc",
      },
      take: filters.limit ?? 200,
    });

    return records.map(mapLineItem);
  }
}

export async function createPrismaCloudCostRepository(): Promise<PrismaCloudCostRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaCloudCostRepository(prisma);
}

function mapImport(record: {
  readonly id: string;
  readonly provider: string;
  readonly source_type: string;
  readonly source_uri: string | null;
  readonly status: string;
  readonly period_start: Date | null;
  readonly period_end: Date | null;
  readonly imported_at: Date | null;
  readonly imported_by: string | null;
  readonly row_count: number;
  readonly total_unblended_cost: unknown;
  readonly currency: string | null;
  readonly metadata: unknown;
  readonly error_message: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudCostImport {
  return {
    id: record.id,
    provider: record.provider as CloudCostImport["provider"],
    sourceType: record.source_type as CloudCostImport["sourceType"],
    sourceUri: record.source_uri ?? undefined,
    status: record.status as CloudCostImport["status"],
    periodStart: record.period_start ?? undefined,
    periodEnd: record.period_end ?? undefined,
    importedAt: record.imported_at ?? undefined,
    importedBy: record.imported_by ?? undefined,
    rowCount: record.row_count,
    totalUnblendedCost: Number(record.total_unblended_cost),
    currency: record.currency ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    errorMessage: record.error_message ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapLineItem(record: {
  readonly id: string;
  readonly import_id: string;
  readonly provider: string;
  readonly billing_period_start: Date;
  readonly billing_period_end: Date;
  readonly usage_start: Date | null;
  readonly usage_end: Date | null;
  readonly service_code: string;
  readonly usage_type: string | null;
  readonly operation: string | null;
  readonly region: string | null;
  readonly resource_id: string | null;
  readonly cost_category: string | null;
  readonly environment: string | null;
  readonly project: string | null;
  readonly tenant_tag: string | null;
  readonly module_tag: string | null;
  readonly usage_amount: unknown;
  readonly usage_unit: string | null;
  readonly unblended_cost: unknown;
  readonly amortized_cost: unknown;
  readonly currency: string;
  readonly raw_line_hash: string;
  readonly metadata: unknown;
  readonly created_at: Date;
}): CloudCostLineItem {
  return {
    id: record.id,
    importId: record.import_id,
    provider: record.provider as CloudCostLineItem["provider"],
    billingPeriodStart: record.billing_period_start,
    billingPeriodEnd: record.billing_period_end,
    usageStart: record.usage_start ?? undefined,
    usageEnd: record.usage_end ?? undefined,
    serviceCode: record.service_code,
    usageType: record.usage_type ?? undefined,
    operation: record.operation ?? undefined,
    region: record.region ?? undefined,
    resourceId: record.resource_id ?? undefined,
    costCategory: record.cost_category ?? undefined,
    environment: record.environment ?? undefined,
    project: record.project ?? undefined,
    tenantTag: record.tenant_tag ?? undefined,
    moduleTag: record.module_tag ?? undefined,
    usageAmount: record.usage_amount === null ? undefined : Number(record.usage_amount),
    usageUnit: record.usage_unit ?? undefined,
    unblendedCost: Number(record.unblended_cost),
    amortizedCost: record.amortized_cost === null ? undefined : Number(record.amortized_cost),
    currency: record.currency,
    rawLineHash: record.raw_line_hash,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
