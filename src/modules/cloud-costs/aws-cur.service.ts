import { createLogger } from "../../infra/logging/logger.js";

import { env } from "../../config/env.js";
import type { CloudCostAllocationEnqueue } from "../cloud-cost-allocation/cloud-cost-allocation.import-trigger.js";
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

/**
 * B-ASS-09a · P1/P7 — o marcador que a conclusão da importação grava (`metadata.autoAllocation`). Só importação MARCADA
 * entra na varredura do rateio automático; as feitas antes deste bloco não têm o marcador e ficam no manual (pergunta 1
 * do §9 do plano, recomendação (a)). O literal repete `AUTO_ALLOCATION_MARKER` de
 * `cloud-cost-allocation.import-trigger.ts` para não importar o módulo de rateio estaticamente; o T11 confere os dois.
 */
export const CLOUD_COST_AUTO_ALLOCATION_MARKER = "v1";

/** B-ASS-09a · P5 — chamado DEPOIS de gravar `completed`. Falha aqui nunca muda a importação. */
export type CloudCostImportCompletedHook = (costImport: CloudCostImport) => Promise<void>;

export type CloudCostServiceOptions = {
  readonly onImportCompleted?: CloudCostImportCompletedHook;
};

const hookLogger = createLogger();

/** B-ASS-09a — o log da falha do gancho. Objeto exportado para o teste espiar (T1-mem prova que a memória não tem gancho). */
export const cloudCostImportLogger = {
  warn(payload: Record<string, unknown>, message: string): void {
    hookLogger.warn(payload, message);
  },
};

function logImportCompletedHookFailure(error: unknown): void {
  cloudCostImportLogger.warn({ error: sanitizeErrorMessage(error) }, "cloud_cost_import_completed_hook_failed");
}

export class CloudCostService {
  private readonly onImportCompleted?: CloudCostImportCompletedHook;

  constructor(
    private readonly repository: CloudCostRepository,
    options: CloudCostServiceOptions = {},
  ) {
    this.onImportCompleted = options.onImportCompleted;
  }

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

    let completed: CloudCostImport;
    try {
      const parsed = parseAwsCurCsv(input.csv);
      const created = await this.repository.createLineItems(started.id, parsed);
      const total = sumCosts(created);
      const period = resolvePeriod(created);
      const currency = resolveCurrency(created);

      completed = await this.repository.updateImport(started.id, {
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
          // B-ASS-09a · R2-12(a) — DEPOIS do `...metadata`: quem chama a rota não consegue escrever o marcador.
          autoAllocation: CLOUD_COST_AUTO_ALLOCATION_MARKER,
          // B-ASS-09a · PR542-01 — o marcador da varredura também é só do sistema: nasce vazio, e quem chama não esconde
          // a importação da varredura escrevendo `{ status: "done" }`.
          autoAllocationSweep: null,
        },
      });
    } catch (error) {
      return this.repository.updateImport(started.id, {
        status: "failed",
        errorMessage: sanitizeErrorMessage(error),
        metadata,
      });
    }

    // B-ASS-09a · P5 — FORA do `try`: falha do gancho (criar a run, enfileirar) nunca vira importação `failed`. O erro é
    // engolido e registrado; a varredura de 6 em 6 h completa o que faltou.
    if (this.onImportCompleted) await this.onImportCompleted(completed).catch(logImportCompletedHookFailure);
    return completed;
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

/**
 * B-ASS-09a · R3 — o ramo Prisma (o de produção, `env.ts` exige `prisma`) liga o gancho do rateio automático: o serviço
 * de rateio sobre o Prisma e a fila padrão (ou a injetada, nos testes). O módulo de rateio entra por `import()` dinâmico,
 * sem ciclo de import. O ramo de MEMÓRIA (`createMemoryCloudCostService`) segue SEM gancho: produção nunca roda em
 * memória, e os testes de rota que já existem não enfileiram nada.
 */
export async function createPrismaCloudCostService(
  options: { readonly enqueue?: CloudCostAllocationEnqueue } = {},
): Promise<CloudCostService> {
  const [{ createPrismaCloudCostRepository }, trigger, allocationService] = await Promise.all([
    import("./aws-cur-prisma.repository.js"),
    import("../cloud-cost-allocation/cloud-cost-allocation.import-trigger.js"),
    import("../cloud-cost-allocation/cloud-cost-allocation.service.js"),
  ]);
  const hook = trigger.buildCloudCostImportHook({
    allocation: await allocationService.createPrismaCloudCostAllocationService(),
    enqueue: options.enqueue ?? trigger.enqueueOnDefaultJobQueue,
  });
  return new CloudCostService(await createPrismaCloudCostRepository(), { onImportCompleted: hook });
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
