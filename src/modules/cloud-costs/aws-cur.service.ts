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

  /**
   * B-O6R-06 (Omega6R-DIN-007) — o resumo SOMA NO BANCO. Dois defeitos superpostos morrem aqui:
   *
   *  1. TRUNCAMENTO (o que o achado nomeia): `normalizeSummaryFilters` cravava `limit: 10_000` e o
   *     repositorio aplicava `take`. A 10.001a linha — que com `orderBy billing_period_start asc` e a
   *     MAIS RECENTE — simplesmente nao entrava no total, e `CloudCostSummary` nao carregava contagem
   *     nem aviso: o painel do investidor exibia um numero subestimado sem ter como saber.
   *  2. ACUMULACAO EM FLOAT (que o achado NAO nomeia): o laco somava `number` em ponto flutuante. Com
   *     10.001 linhas na casa de 1e5-1e6 a divergencia medida contra `SUM(numeric)` chega a 1,1e-3, e
   *     o total (~9,9e9 com 6 casas) ja nem cabe exato num `number`. Por isso `totalUnblendedCostExact`.
   *
   * A distincao "janela vazia" x "soma nula" e feita pelo `lineItemCount` (`_count._all`), nunca por um
   * `?? 0`: `lineItemCount > 0` com `total === null` e combinacao IMPOSSIVEL e falha alto.
   */
  async getSummary(filters: CloudCostLineItemFilters = {}): Promise<CloudCostSummary> {
    const normalized = normalizeSummaryFilters(filters);
    const rows = await this.repository.summarizeLineItems(normalized);

    const base = {
      provider: "aws" as const,
      periodStart: normalized.periodStart?.toISOString() ?? "",
      periodEnd: normalized.periodEnd?.toISOString() ?? "",
      generatedAt: new Date().toISOString(),
    };

    if (rows.lineItemCount === 0) {
      return {
        ...base,
        totalUnblendedCost: 0,
        totalUnblendedCostExact: "0",
        lineItemCount: 0,
        currencies: [],
        services: [],
      };
    }

    return {
      ...base,
      totalUnblendedCost: toBoundedNumber(requireTotal(rows.total, rows.lineItemCount)),
      totalUnblendedCostExact: requireTotal(rows.total, rows.lineItemCount),
      lineItemCount: rows.lineItemCount,
      currencies: [...rows.currencies].sort(),
      services: rows.byServiceCurrency
        .map((group) => ({
          serviceCode: group.serviceCode,
          currency: group.currency,
          unblendedCost: toBoundedNumber(requireTotal(group.unblendedCost, group.lineItemCount)),
          unblendedCostExact: requireTotal(group.unblendedCost, group.lineItemCount),
        }))
        .sort((a, b) => a.serviceCode.localeCompare(b.serviceCode) || a.currency.localeCompare(b.currency)),
    };
  }
}

/**
 * O DISCRIMINADOR, escrito uma vez. `total === null` com `lineItemCount === 0` ja foi tratado pelo
 * chamador (janela vazia -> zeros explicitos). Chegar aqui com `null` e ter havido linha para somar
 * significa BUG — e devolver `0` seria publicar um numero de faturamento inventado.
 */
function requireTotal(total: string | null, lineItemCount: number): string {
  if (total === null) {
    throw new CloudCostError(
      500,
      "CLOUD_COST_SUMMARY_INCONSISTENT",
      "summary_total_missing",
      `Cloud cost summary returned a null total for ${lineItemCount} aggregated line item(s).`,
    );
  }

  return total;
}

/**
 * A UNICA conversao para `number` de todo o caminho do resumo — na BORDA do contrato, sobre a string
 * exata que o banco somou. `roundCost` continua existindo para `importAwsCurCsv`, que soma o que
 * acabou de criar (sem `take`, correto).
 */
function toBoundedNumber(exact: string): number {
  return Number(exact);
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

/**
 * B-O6R-06 — O CAMPO `limit` DEIXOU DE EXISTIR NESTE NORMALIZADOR (aceite C3: `!("limit" in result)`).
 * Ele era o truncamento silencioso do Omega6R-DIN-007. `normalizeLimit` continua intacto e so serve
 * `listLineItems` (detalhe paginado, teto 500).
 *
 * O periodo default de 30 dias FICA — e do resumo, e o detalhe nao tem default (E9 do parecer do
 * critico). A diferenca esta documentada no contrato; mudar o default do detalhe muda o painel e e
 * decisao de contrato, fora deste bloco.
 */
export function normalizeSummaryFilters(filters: CloudCostLineItemFilters): CloudCostLineItemFilters {
  const now = new Date();
  return {
    ...filters,
    periodEnd: filters.periodEnd ?? now,
    periodStart: filters.periodStart ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
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
