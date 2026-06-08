import { env } from "../../config/env.js";
import {
  CloudCostError,
  CLOUD_COST_IMPORT_STATUSES,
  CLOUD_COST_SOURCE_TYPES,
  type CloudCostImport,
  type CloudCostImportFilters,
  type CloudCostLineItem,
  type CloudCostLineItemFilters,
  type CloudCostMetadata,
  type CloudCostSummary,
  type CloudCostSourceType,
  type ImportAwsCurCsvInput,
} from "./aws-cur.types.js";
import { InMemoryCloudCostRepository, type CloudCostRepository } from "./aws-cur.repository.js";
import { parseAwsCurCsv } from "./aws-cur.parser.js";

const sourceTypes = new Set<string>(CLOUD_COST_SOURCE_TYPES);
const statuses = new Set<string>(CLOUD_COST_IMPORT_STATUSES);

export class CloudCostService {
  constructor(private readonly repository: CloudCostRepository) {}

  async importAwsCurCsv(input: ImportAwsCurCsvInput): Promise<CloudCostImport> {
    const sourceType = normalizeSourceType(input.sourceType ?? "manual_csv");
    const metadata = sanitizeCloudCostMetadata(input.metadata);
    const started = await this.repository.createImport({
      provider: "aws",
      sourceType,
      sourceUri: input.sourceUri,
      status: "processing",
      importedBy: input.importedBy,
      metadata,
    });

    try {
      const parsed = parseAwsCurCsv(input.csv);
      const created = await this.repository.createLineItems(started.id, parsed);
      const total = sumCosts(created);
      const period = resolvePeriod(created);
      const currency = resolveCurrency(created);

      return this.repository.updateImport(started.id, {
        status: "completed",
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        importedAt: new Date(),
        rowCount: created.length,
        totalUnblendedCost: total,
        currency,
        metadata: {
          ...metadata,
          duplicateRowsSkipped: parsed.length - created.length,
        },
      });
    } catch (error) {
      return this.repository.updateImport(started.id, {
        status: "failed",
        errorMessage: sanitizeErrorMessage(error),
        metadata,
      });
    }
  }

  listImports(filters: CloudCostImportFilters = {}) {
    validateImportFilters(filters);
    return this.repository.listImports(filters);
  }

  async getImport(importId: string): Promise<CloudCostImport> {
    const record = await this.repository.getImport(importId);
    if (!record) {
      throw new CloudCostError(404, "CLOUD_COST_IMPORT_NOT_FOUND", "import_not_found", "Cloud cost import was not found.");
    }
    return record;
  }

  listLineItems(filters: CloudCostLineItemFilters = {}) {
    return this.repository.listLineItems({
      ...filters,
      limit: normalizeLimit(filters.limit),
    });
  }

  async getSummary(filters: CloudCostLineItemFilters = {}): Promise<CloudCostSummary> {
    const normalized = normalizeSummaryFilters(filters);
    const lines = await this.repository.listLineItems(normalized);
    const groups = new Map<string, { serviceCode: string; unblendedCost: number; currency: string }>();
    let total = 0;

    for (const line of lines) {
      const key = `${line.serviceCode}|${line.currency}`;
      const existing = groups.get(key);
      groups.set(key, {
        serviceCode: line.serviceCode,
        currency: line.currency,
        unblendedCost: (existing?.unblendedCost ?? 0) + line.unblendedCost,
      });
      total += line.unblendedCost;
    }

    return {
      provider: "aws",
      periodStart: normalized.periodStart?.toISOString() ?? "",
      periodEnd: normalized.periodEnd?.toISOString() ?? "",
      totalUnblendedCost: roundCost(total),
      currencies: [...new Set(lines.map((line) => line.currency))].sort(),
      services: [...groups.values()]
        .map((item) => ({
          ...item,
          unblendedCost: roundCost(item.unblendedCost),
        }))
        .sort((a, b) => a.serviceCode.localeCompare(b.serviceCode)),
      generatedAt: new Date().toISOString(),
    };
  }
}

export function sanitizeCloudCostMetadata(metadata: CloudCostMetadata | undefined): CloudCostMetadata {
  if (!metadata) return {};
  return compactRecord(sanitizeRecord(metadata));
}

export function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown AWS CUR import error.";
  return String(sanitizeValue(message)).slice(0, 1_000);
}

export function isCloudCostSourceType(value: string): value is CloudCostSourceType {
  return sourceTypes.has(value);
}

const memoryRepository = new InMemoryCloudCostRepository();
let defaultServicePromise: Promise<CloudCostService> | undefined;

export function createMemoryCloudCostService(): CloudCostService {
  return new CloudCostService(memoryRepository);
}

export function getMemoryCloudCostRepositoryForTests(): InMemoryCloudCostRepository {
  return memoryRepository;
}

export async function createDefaultCloudCostService(): Promise<CloudCostService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCloudCostService();
  }

  defaultServicePromise ??= createPrismaCloudCostService();
  return defaultServicePromise;
}

export function resetCloudCostRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaCloudCostService(): Promise<CloudCostService> {
  const { createPrismaCloudCostRepository } = await import("./aws-cur-prisma.repository.js");
  return new CloudCostService(await createPrismaCloudCostRepository());
}

function normalizeSourceType(value: string): CloudCostSourceType {
  if (!sourceTypes.has(value)) {
    throw new CloudCostError(400, "CLOUD_COST_INVALID", "source_type_invalid", `Invalid cloud cost source type: ${value}.`);
  }
  return value as CloudCostSourceType;
}

function validateImportFilters(filters: CloudCostImportFilters): void {
  if (filters.status && !statuses.has(filters.status)) {
    throw new CloudCostError(400, "CLOUD_COST_INVALID", "status_invalid", `Invalid import status: ${filters.status}.`);
  }
  if (filters.sourceType && !sourceTypes.has(filters.sourceType)) {
    throw new CloudCostError(400, "CLOUD_COST_INVALID", "source_type_invalid", `Invalid cloud cost source type: ${filters.sourceType}.`);
  }
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit) return 200;
  return Math.min(Math.max(Math.trunc(limit), 1), 500);
}

function normalizeSummaryFilters(filters: CloudCostLineItemFilters): CloudCostLineItemFilters {
  const now = new Date();
  return {
    ...filters,
    periodEnd: filters.periodEnd ?? now,
    periodStart: filters.periodStart ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    limit: 10_000,
  };
}

function sumCosts(lines: readonly CloudCostLineItem[]): number {
  return roundCost(lines.reduce((total, line) => total + line.unblendedCost, 0));
}

function resolvePeriod(lines: readonly CloudCostLineItem[]): { periodStart?: Date; periodEnd?: Date } {
  if (lines.length === 0) return {};
  return {
    periodStart: new Date(Math.min(...lines.map((line) => line.billingPeriodStart.getTime()))),
    periodEnd: new Date(Math.max(...lines.map((line) => line.billingPeriodEnd.getTime()))),
  };
}

function resolveCurrency(lines: readonly CloudCostLineItem[]): string | undefined {
  const currencies = [...new Set(lines.map((line) => line.currency))];
  return currencies.length === 1 ? currencies[0] : undefined;
}

function roundCost(value: number): number {
  return Number(value.toFixed(6));
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|\btoken\b|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|storage_key|storagekey|bucket|private_url|privateurl|path|body|payload|query|csv|file|content)/i;

function sanitizeRecord(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeyPattern.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
      .replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_ACCESS_KEY]");
  }
  if (Array.isArray(value)) return value.map(sanitizeValue).filter((item) => item !== undefined);
  if (typeof value === "object" && value !== null) return sanitizeRecord(value as Record<string, unknown>);
  return value;
}

function compactRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
