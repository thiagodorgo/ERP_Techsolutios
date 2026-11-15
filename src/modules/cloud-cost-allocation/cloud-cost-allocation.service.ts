import { env } from "../../config/env.js";
import { createLogger } from "../../infra/logging/logger.js";
import { publicErrorMessage } from "../../infra/logging/public-error.js";
import type { CloudCostImport } from "../cloud-costs/aws-cur.types.js";
import { allocateCloudCosts, assertConservation } from "./cloud-cost-allocation.engine.js";
import { importRunId, normalizeImportPeriodEnd, type ImportSweepMark } from "./cloud-cost-allocation.import-trigger.js";
import {
  CloudCostAllocationError,
  CLOUD_COST_ALLOCATION_STRATEGIES,
  CLOUD_COST_ALLOCATION_STATUSES,
  type AllocateCostsForPeriodInput,
  type CloudCostAllocationRun,
  type CloudCostAllocationRunFilters,
  type CloudCostAllocationSummary,
  type CloudCostAllocationStrategy,
  type CreatedCloudCostAllocationRun,
  type CreateImportRunInput,
  type ImportBillingPeriod,
  type TenantCloudCostAllocationFilters,
} from "./cloud-cost-allocation.types.js";
import {
  InMemoryCloudCostAllocationRepository,
  type CloudCostAllocationRepository,
} from "./cloud-cost-allocation.repository.js";

const CLOUD_COST_ALLOCATION_FAILED_MESSAGE = "Cloud cost allocation failed.";
const logger = createLogger();

const strategySet = new Set<string>(CLOUD_COST_ALLOCATION_STRATEGIES);
const statusSet = new Set<string>(CLOUD_COST_ALLOCATION_STATUSES);

export class CloudCostAllocationService {
  constructor(
    private readonly repository: CloudCostAllocationRepository,
    // B-SAN3-03 · R13 — o motor é injetável só para a prova de que a conferência do serviço não confia nele.
    private readonly engine: typeof allocateCloudCosts = allocateCloudCosts,
  ) {}

  async createAllocationRun(input: AllocateCostsForPeriodInput): Promise<CloudCostAllocationRun> {
    validatePeriod(input.periodStart, input.periodEnd);
    const costImport = await this.repository.findBillableImport(input.periodStart, input.periodEnd, input.importId);
    if (input.importId && costImport?.status !== "completed") {
      throw new CloudCostAllocationError(
        422,
        "CLOUD_COST_ALLOCATION_IMPORT_NOT_COMPLETED",
        "import_not_completed",
        "Cloud cost import must exist and be completed.",
      );
    }
    const metadata = sanitizeCloudCostAllocationMetadata(input.metadata);
    delete metadata.importId;
    delete metadata.importResolution;
    delete metadata.trigger; // B-ASS-09a E4 só o sistema
    delete metadata.sourceBillingPeriods; // B-ASS-09a E4 só o sistema
    delete metadata.sourceImportedAt; // B-ASS-09a E4 só o sistema
    delete metadata.sourceBillingPeriod; // B-ASS-09a E4.1 só o sistema
    return this.repository.createRun({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      importId: costImport?.id,
      strategy: normalizeStrategy(input.strategy),
      createdBy: input.createdBy,
      metadata: {
        ...metadata,
        importId: costImport?.id ?? null,
        importResolution: costImport ? (input.importId ? "explicit" : "latest_completed") : "none",
      },
    });
  }

  /**
   * B-ASS-09a · P1/P2 — a run AUTOMÁTICA de um par BRUTO de período de uma importação. Id determinístico (UUIDv5):
   * chamar de novo devolve a mesma run (`created: false`). A importação precisa existir e estar `completed`, como no
   * caminho manual. A janela é `[início, fim normalizado]` (`importRunWindow`); as linhas ficam escolhidas pela
   * IGUALDADE do par bruto gravado em `metadata.sourceBillingPeriod` (P3, partição por construção).
   */
  async createImportRun(input: CreateImportRunInput): Promise<CreatedCloudCostAllocationRun> {
    if (input.billingPeriods.length === 0) throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID", "period_invalid", "empty");
    for (const period of input.billingPeriods) validatePeriod(period.billingPeriodStart, period.billingPeriodEnd);
    const first = input.billingPeriods[0]!;
    const costImport = await this.repository.findBillableImport(EPOCH, EPOCH, input.importId);
    if (costImport?.status !== "completed") {
      throw new CloudCostAllocationError(
        422,
        "CLOUD_COST_ALLOCATION_IMPORT_NOT_COMPLETED",
        "import_not_completed",
        "Cloud cost import must exist and be completed.",
      );
    }
    const window = this.importRunWindow(input.billingPeriods);
    return this.repository.createRunWithId({
      id: importRunId(costImport.id, first.billingPeriodStart, first.billingPeriodEnd),
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
      importId: costImport.id,
      strategy: normalizeStrategy(undefined),
      createdBy: input.createdBy,
      metadata: {
        trigger: "import",
        importId: costImport.id,
        importResolution: "explicit",
        sourceImportedAt: (costImport.importedAt ?? costImport.createdAt).toISOString(), // B-ASS-09a E4 publicação
        sourceBillingPeriods: input.billingPeriods.map((period) => ({ start: period.billingPeriodStart.toISOString(), end: period.billingPeriodEnd.toISOString() })),
      },
    });
  }

  /**
   * B-ASS-09a · E11 — a janela da run automática. O resumo filtra a run pelo MESMO dia UTC de início e de fim
   * (`sameUtcDay`); com o fim exclusivo da AWS (00:00 do dia 1 seguinte) a janela usa `fim − 1 ms` (o dia 31), senão o
   * resumo do mês não acharia a run. Fim inclusivo (fixture `aws-cur-sample.csv`) fica como está.
   */
  importRunWindow(billingPeriods: readonly ImportBillingPeriod[]): { periodStart: Date; periodEnd: Date } {
    const starts = billingPeriods.map((period) => period.billingPeriodStart.getTime());
    const ends = billingPeriods.map((period) => normalizeImportPeriodEnd(period.billingPeriodStart, period.billingPeriodEnd).getTime());
    return { periodStart: new Date(Math.min(...starts)), periodEnd: new Date(Math.max(...ends)) };
  }

  /** B-ASS-09a — a importação de uma run automática (ou `undefined`), pela mesma porta que o caminho manual usa. */
  findImportForAllocation(importId: string): Promise<CloudCostImport | undefined> {
    return this.repository.findBillableImport(EPOCH, EPOCH, importId);
  }

  listImportBillingPeriods(importId: string): Promise<readonly ImportBillingPeriod[]> {
    return this.repository.listImportBillingPeriods(importId);
  }

  listRunsByImport(importId: string): Promise<readonly CloudCostAllocationRun[]> {
    return this.repository.listRunsByImport(importId);
  }

  /** B-ASS-09a · R2-02 — as importações marcadas que ainda não têm nenhuma run automática (o que falta criar). */
  listImportsForAutoAllocation(limit: number): Promise<readonly CloudCostImport[]> {
    return this.repository.listImportsForAutoAllocation(limit);
  }

  /** B-ASS-09a · R2-02 — as runs automáticas `pending`, de qualquer importação (o que falta executar). */
  listPendingImportRuns(limit: number): Promise<readonly CloudCostAllocationRun[]> {
    return this.repository.listPendingImportRuns(limit);
  }

  /** B-ASS-09a · PR542-01 — o marcador da varredura na importação (`done` ou `failed` com as tentativas). */
  markImportSweep(importId: string, mark: ImportSweepMark): Promise<void> {
    return this.repository.markImportSweep(importId, mark);
  }

  /**
   * Executa (ou REEXECUTA) uma run pelo id. O rateio manual reexecuta de propósito uma run concluída (E7, pergunta 2 do
   * §9 do plano, recomendação (a)): este caminho não reivindica nada. Só o caminho automático (`executeImportRuns`)
   * reivindica `pending → processing` antes de executar (P4).
   */
  async executeAllocationRun(runId: string): Promise<CloudCostAllocationRun> {
    const run = await this.getAllocationRun(runId);
    return this.runAllocation(run, "unclaimed");
  }

  /**
   * B-ASS-09a · P4 — executa as runs AUTOMÁTICAS `pending` de uma importação, uma execução por run: cada uma é
   * reivindicada (`pending → processing`, condicional) e só a reivindicação vencedora roda o motor. Duas execuções em
   * paralelo (job repetido, varredura e gancho juntos) gravam as alocações uma vez só. Run `failed` não é retomada
   * (pergunta 3 do §9, recomendação (a)); run presa em `processing` fica visível (`P-ASS09A-RUN-PRESA-EM-PROCESSING`).
   */
  async executeImportRuns(importId: string): Promise<readonly CloudCostAllocationRun[]> {
    const runs = [...(await this.repository.listRunsByImport(importId))].sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
    );
    const executed: CloudCostAllocationRun[] = [];
    for (const run of runs) {
      if (run.metadata.trigger !== "import" || run.status !== "pending") continue;
      if (!(await this.repository.claimPendingRun(run.id))) continue;
      executed.push(await this.runAllocation(run, "claimed"));
    }
    return executed;
  }

  /**
   * O corpo da execução, comum ao manual e ao automático. `claimed`: a reivindicação já gravou `processing` e o início;
   * `unclaimed`: o caminho manual de sempre, que grava `processing` aqui.
   */
  private async runAllocation(run: CloudCostAllocationRun, mode: "claimed" | "unclaimed"): Promise<CloudCostAllocationRun> {
    const importId = readRunImportId(run);

    if (!importId) {
      return this.repository.updateRun(run.id, {
        status: "completed",
        totalImportedCost: 0,
        totalAllocatedCost: 0,
        totalUnallocatedCost: 0,
        completedAt: new Date(),
        metadata: run.metadata,
      });
    }

    if (mode === "unclaimed") {
      await this.repository.updateRun(run.id, {
        status: "processing",
        startedAt: new Date(),
        metadata: {
          ...run.metadata,
          executionStartedAt: new Date().toISOString(),
        },
      });
    }

    try {
      // B-O6R-06 — a base de rateio deixa de vir da PROJECAO DIARIA (que ninguem agenda) e passa a ser
      // somada na TABELA DURAVEL, por tenant, sob o contexto RLS de cada um. `listTenants()` vem antes
      // porque e ele que define o universo da varredura.
      const tenants = await this.repository.listTenants();
      // B-ASS-09a · P3 (R1) — a run automática escolhe as linhas pela IGUALDADE do par bruto da importação: cada linha
      // entra em exatamente uma run, nas duas formas de fim e com pares sobrepostos. Fica no corpo comum para que
      // QUALQUER executor (inclusive a reexecução manual da run automática) faça a mesma partição.
      const sources = readSourceBillingPeriods(run);
      const [costLineItems, usageBasis] = await Promise.all([
        sources
          ? this.repository.listCostLineItemsForBillingPeriods(importId, sources)
          : this.repository.listCostLineItems(run.periodStart, run.periodEnd, importId),
        this.repository.sumUsageBasis(
          run.periodStart,
          run.periodEnd,
          tenants.map((tenant) => tenant.id),
        ),
      ]);
      const result = this.engine({
        runId: run.id,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        strategy: run.strategy,
        costLineItems,
        usageBasis,
        tenants,
      });

      // B-SAN3-03 · R13 — confere a soma pelos ITENS que vão ser gravados, não pelos totais que o motor
      // declarou: uma fatia perdida no caminho falha a run antes de qualquer alocação persistir.
      const roundingResidualCost = assertConservation(
        {
          importedCost: result.totalImportedCost,
          allocatedCost: sumMicro(result.allocations.map((item) => item.allocatedCost)),
          platformCost: sumMicro(result.platformCost.map((item) => item.platformCost)),
          unallocatedCost: sumMicro(result.unallocated.map((item) => item.unallocatedCost)),
        },
        result.roundingCount,
      );

      await this.repository.replaceTenantAllocations(run.id, result.allocations);

      return this.repository.updateRun(run.id, {
        status: "completed",
        totalImportedCost: result.totalImportedCost,
        totalAllocatedCost: result.totalAllocatedCost,
        totalUnallocatedCost: result.totalUnallocatedCost,
        currency: result.currency,
        completedAt: new Date(),
        metadata: {
          ...run.metadata,
          allocationEngine: "usage_weighted_v1",
          tenantAllocationCount: result.allocations.length,
          unallocated: result.unallocated,
          // B-SAN3-03 · R8 — sem migração: a parte da plataforma mora no metadata da run, fora de
          // `total_unallocated_cost` (o aviso de "Não rateado" não acende por ela).
          platformCost: result.platformCost,
          totalPlatformCost: result.totalPlatformCost,
          estimatedCategories: result.estimatedCategories,
          roundingResidualCost,
        },
      });
    } catch (error) {
      logger.error({ err: error, runId: run.id }, "cloud-cost-allocation: execução falhou");
      return this.repository.updateRun(run.id, {
        status: "failed",
        errorMessage: sanitizeCloudCostAllocationError(error),
        completedAt: new Date(),
        metadata: run.metadata,
      });
    }
  }

  async allocateCostsForPeriod(input: AllocateCostsForPeriodInput): Promise<CloudCostAllocationRun> {
    const run = await this.createAllocationRun(input);
    return this.executeAllocationRun(run.id);
  }

  listAllocationRuns(filters: CloudCostAllocationRunFilters = {}) {
    if (filters.status && !statusSet.has(filters.status)) {
      throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID", "status_invalid", `Invalid allocation run status: ${filters.status}.`);
    }
    return this.repository.listRuns(filters);
  }

  async getAllocationRun(runId: string): Promise<CloudCostAllocationRun> {
    const run = await this.repository.getRun(runId);
    if (!run) {
      throw new CloudCostAllocationError(404, "CLOUD_COST_ALLOCATION_NOT_FOUND", "run_not_found", "Cloud cost allocation run was not found.");
    }
    return run;
  }

  listTenantAllocations(runId: string, filters: TenantCloudCostAllocationFilters = {}) {
    return this.repository.listTenantAllocations(runId, filters);
  }

  async getAllocationSummary(filters: CloudCostAllocationRunFilters = {}): Promise<CloudCostAllocationSummary> {
    if ((filters.periodStart === undefined) !== (filters.periodEnd === undefined)) {
      throw new CloudCostAllocationError(
        400,
        "CLOUD_COST_ALLOCATION_INVALID_PERIOD",
        "summary_period_incomplete",
        "Cloud cost allocation summary requires both periodStart and periodEnd.",
      );
    }
    const runs = await this.repository.listRuns({
      ...filters,
      status: "completed",
    });
    // B-SAN3-03 · R12 — com período, só vale run com o MESMO dia UTC de início e de fim do pedido (run que só
    // toca o período não vale). Sem período, todas as concluídas, como antes.
    const exactPeriod = filters.periodStart && filters.periodEnd;
    const candidates = exactPeriod
      ? runs.filter(
          (candidate) =>
            sameUtcDay(candidate.periodStart, filters.periodStart!) && sameUtcDay(candidate.periodEnd, filters.periodEnd!),
        )
      : runs;
    const run = pickSummaryRun(byPublicationDesc(candidates));

    if (!run) {
      return {
        periodStart: filters.periodStart?.toISOString() ?? "",
        periodEnd: filters.periodEnd?.toISOString() ?? "",
        totalImportedCost: 0,
        totalAllocatedCost: 0,
        totalUnallocatedCost: 0,
        totalPlatformCost: 0,
        roundingResidualCost: 0,
        runId: null,
        importId: null,
        importResolution: null,
        coverage: "no_run",
        unallocatedByReason: [],
        platformCostByService: [],
        estimatedCategories: [],
        tenants: [],
        services: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const [allocations, tenants] = await Promise.all([
      this.repository.listTenantAllocations(run.id),
      this.repository.listTenants(),
    ]);
    const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
    const tenantGroups = new Map<string, number>();
    const serviceGroups = new Map<string, { allocatedCost: number; unallocatedCost: number }>();

    for (const allocation of allocations) {
      tenantGroups.set(allocation.tenantId, (tenantGroups.get(allocation.tenantId) ?? 0) + allocation.allocatedCost);
      const service = serviceGroups.get(allocation.serviceCode) ?? { allocatedCost: 0, unallocatedCost: 0 };
      service.allocatedCost += allocation.allocatedCost;
      serviceGroups.set(allocation.serviceCode, service);
    }

    const reasonGroups = new Map<string, bigint>();
    for (const item of readUnallocated(run.metadata)) {
      const service = serviceGroups.get(item.serviceCode) ?? { allocatedCost: 0, unallocatedCost: 0 };
      service.unallocatedCost += item.unallocatedCost;
      serviceGroups.set(item.serviceCode, service);
      const current = reasonGroups.get(item.reason);
      reasonGroups.set(item.reason, (current === undefined ? 0n : current) + toMicro(item.unallocatedCost));
    }

    const platformGroups = new Map<string, bigint>();
    for (const item of readPlatformCost(run.metadata)) {
      const current = platformGroups.get(item.serviceCode);
      platformGroups.set(item.serviceCode, (current === undefined ? 0n : current) + toMicro(item.platformCost));
    }
    const importResolution = typeof run.metadata.importResolution === "string" ? run.metadata.importResolution : null;

    return {
      periodStart: run.periodStart.toISOString(),
      periodEnd: run.periodEnd.toISOString(),
      currency: run.currency,
      totalImportedCost: run.totalImportedCost,
      totalAllocatedCost: run.totalAllocatedCost,
      totalUnallocatedCost: run.totalUnallocatedCost,
      totalPlatformCost: readNumber(run.metadata.totalPlatformCost),
      roundingResidualCost: readNumber(run.metadata.roundingResidualCost),
      runId: run.id,
      importId: typeof run.metadata.importId === "string" ? run.metadata.importId : null,
      importResolution,
      coverage: coverageOf(importResolution),
      unallocatedByReason: [...reasonGroups.entries()]
        .map(([reason, value]) => ({ reason, unallocatedCost: roundCost(fromMicro(value)) }))
        .sort((a, b) => a.reason.localeCompare(b.reason)),
      platformCostByService: [...platformGroups.entries()]
        .map(([serviceCode, value]) => ({ serviceCode, platformCost: roundCost(fromMicro(value)) }))
        .sort((a, b) => a.serviceCode.localeCompare(b.serviceCode)),
      estimatedCategories: readStringList(run.metadata.estimatedCategories),
      tenants: [...tenantGroups.entries()]
        .map(([tenantId, allocatedCost]) => ({
          tenantId,
          tenantName: tenantNames.get(tenantId),
          allocatedCost: roundCost(allocatedCost),
          allocationRatio: run.totalImportedCost > 0 ? roundRatio(allocatedCost / run.totalImportedCost) : 0,
        }))
        .sort((a, b) => b.allocatedCost - a.allocatedCost),
      services: [...serviceGroups.entries()]
        .map(([serviceCode, value]) => ({
          serviceCode,
          allocatedCost: roundCost(value.allocatedCost),
          unallocatedCost: roundCost(value.unallocatedCost),
        }))
        .sort((a, b) => a.serviceCode.localeCompare(b.serviceCode)),
      generatedAt: new Date().toISOString(),
    };
  }
}

export function sanitizeCloudCostAllocationMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  return compactRecord(sanitizeRecord(metadata));
}

export function sanitizeCloudCostAllocationError(error: unknown): string {
  return String(sanitizeValue(publicErrorMessage(error, CLOUD_COST_ALLOCATION_FAILED_MESSAGE))).slice(0, 1_000);
}

export function isCloudCostAllocationStrategy(value: string): value is CloudCostAllocationStrategy {
  return strategySet.has(value);
}

const memoryRepository = new InMemoryCloudCostAllocationRepository();
let defaultServicePromise: Promise<CloudCostAllocationService> | undefined;

export function createMemoryCloudCostAllocationService(): CloudCostAllocationService {
  return new CloudCostAllocationService(memoryRepository);
}

export function getMemoryCloudCostAllocationRepositoryForTests(): InMemoryCloudCostAllocationRepository {
  return memoryRepository;
}

export async function createDefaultCloudCostAllocationService(): Promise<CloudCostAllocationService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCloudCostAllocationService();
  }

  defaultServicePromise ??= createPrismaCloudCostAllocationService();
  return defaultServicePromise;
}

export function resetCloudCostAllocationRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

/**
 * O serviço de rateio sobre o Prisma, sem depender de `CORE_SAAS_PERSISTENCE`. B-ASS-09a: exportado para a fábrica Prisma
 * de `aws-cur.service.ts` montar o gancho da importação (por `import()` dinâmico) com o repositório real.
 */
export async function createPrismaCloudCostAllocationService(): Promise<CloudCostAllocationService> {
  const { createPrismaCloudCostAllocationRepository } = await import("./cloud-cost-allocation-prisma.repository.js");
  return new CloudCostAllocationService(await createPrismaCloudCostAllocationRepository());
}

function normalizeStrategy(strategy: CloudCostAllocationStrategy | undefined): CloudCostAllocationStrategy {
  const value = strategy ?? "direct_tag_then_usage_weighted_v1";
  if (!strategySet.has(value)) {
    throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID", "strategy_invalid", `Invalid allocation strategy: ${value}.`);
  }
  return value;
}

function validatePeriod(periodStart: Date, periodEnd: Date): void {
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > periodEnd) {
    throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID", "period_invalid", "Allocation period is invalid.");
  }
}

function readRunImportId(run: CloudCostAllocationRun): string | undefined {
  return typeof run.metadata.importId === "string" ? run.metadata.importId : undefined;
}

/** Quando a importação já vem dada pelo id, a janela não escolhe nada: `findBillableImport` ignora as datas. */
const EPOCH = new Date(0);

/**
 * B-ASS-09a · R1 — os pares BRUTOS de uma run automática. Só valem com `trigger: "import"` e as datas válidas; qualquer
 * outra forma cai no caminho de janela (manual), como antes deste bloco. A rota manual não aceita `metadata` (E12):
 * ninguém de fora forja `trigger: "import"`.
 */
function readSourceBillingPeriods(run: CloudCostAllocationRun): ImportBillingPeriod[] | undefined {
  if (run.metadata.trigger !== "import") return undefined;
  const list = run.metadata.sourceBillingPeriods;
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const out: ImportBillingPeriod[] = [];
  for (const source of list) {
    if (typeof source !== "object" || source === null) return undefined;
    const { start, end } = source as { start?: unknown; end?: unknown };
    if (typeof start !== "string" || typeof end !== "string") return undefined;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return undefined;
    out.push({ billingPeriodStart: startDate, billingPeriodEnd: endDate });
  }
  return out;
}

/** B-ASS-09a · E4 P9 — a data de publicação de uma run concluída: na automática, a da sua importação; na manual, a criação. */
function publishedAt(run: CloudCostAllocationRun): number {
  if (run.metadata.trigger === "import" && typeof run.metadata.sourceImportedAt === "string") {
    const importedAt = new Date(run.metadata.sourceImportedAt).getTime();
    if (!Number.isNaN(importedAt)) return importedAt;
  }
  return run.createdAt.getTime();
}

function byPublicationDesc(candidates: readonly CloudCostAllocationRun[]): CloudCostAllocationRun[] {
  return [...candidates].sort(
    (a, b) =>
      publishedAt(b) - publishedAt(a) ||
      a.createdAt.getTime() - b.createdAt.getTime() || // B-ASS-09a E4.1 empate
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|\btoken\b|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|storage_key|storagekey|bucket|private_url|privateurl|path|body|payload|query|csv|file|content)/i;

function sanitizeRecord(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    sanitized[key] = sensitiveKeyPattern.test(key) ? "[REDACTED]" : sanitizeValue(value);
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

type UnallocatedSummaryItem = { serviceCode: string; unallocatedCost: number; reason: string };

// B-SAN3-03 · R8-b — lê também o `reason`. Item sem motivo vira "unspecified" e nunca é descartado.
function readUnallocated(metadata: Record<string, unknown>): UnallocatedSummaryItem[] {
  const raw = metadata.unallocated;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return undefined;
      const record = item as Record<string, unknown>;
      return {
        serviceCode: typeof record.serviceCode === "string" ? record.serviceCode : "unknown",
        unallocatedCost: typeof record.unallocatedCost === "number" ? record.unallocatedCost : 0,
        reason: typeof record.reason === "string" && record.reason.length > 0 ? record.reason : "unspecified",
      };
    })
    .filter((item): item is UnallocatedSummaryItem => item !== undefined);
}

function readPlatformCost(metadata: Record<string, unknown>): { serviceCode: string; platformCost: number }[] {
  const raw = metadata.platformCost;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    if (typeof record.platformCost !== "number") return [];
    return [{ serviceCode: typeof record.serviceCode === "string" ? record.serviceCode : "unknown", platformCost: record.platformCost }];
  });
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

const IMPORTED_RESOLUTIONS = new Set(["explicit", "latest_completed"]);

function coverageOf(importResolution: string | null): CloudCostAllocationSummary["coverage"] {
  if (importResolution === null) return "legacy_unscoped";
  if (IMPORTED_RESOLUTIONS.has(importResolution)) return "imported";
  return "no_import";
}

/**
 * B-SAN3-03 · R12 — preferência entre as candidatas (já ordenadas da mais nova para a mais velha): a mais
 * nova com import; senão a mais nova sem `importResolution` (run anterior a este bloco); senão a mais nova
 * com `none`. Run vazia nova nunca apaga run boa.
 */
function pickSummaryRun(candidates: readonly CloudCostAllocationRun[]): CloudCostAllocationRun | undefined {
  const resolutionOf = (run: CloudCostAllocationRun) =>
    typeof run.metadata.importResolution === "string" ? run.metadata.importResolution : null;
  return (
    candidates.find((run) => IMPORTED_RESOLUTIONS.has(resolutionOf(run) ?? "")) ??
    candidates.find((run) => resolutionOf(run) === null) ??
    candidates[0]
  );
}

function sameUtcDay(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function toMicro(value: number): bigint {
  return BigInt(Math.round(value * 1_000_000));
}

function fromMicro(value: bigint): number {
  return Number(value) / 1_000_000;
}

function sumMicro(values: readonly number[]): number {
  let total = 0n;
  for (const value of values) total += BigInt(Math.round(value * 1_000_000));
  return Number(total) / 1_000_000;
}

function roundCost(value: number): number {
  return Number(value.toFixed(6));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(12));
}
