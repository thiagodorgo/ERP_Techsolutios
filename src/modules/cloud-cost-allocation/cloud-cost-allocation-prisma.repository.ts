import type { Prisma, PrismaClient } from "@prisma/client";

import { setTenantRlsContext } from "../../database/rls.js";
import type { CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageDailyAggregate, CloudUsageMetricKey } from "../cloud-usage/cloud-usage.types.js";
import {
  CloudCostAllocationError,
  type CloudCostAllocationRun,
  type CloudCostAllocationRunFilters,
  type CloudCostAllocationTenant,
  type TenantCloudCostAllocation,
  type TenantCloudCostAllocationFilters,
  type UpdateCloudCostAllocationRunInput,
  type CreateCloudCostAllocationRunInput,
  type UsageBasisRow,
} from "./cloud-cost-allocation.types.js";
import type { CloudCostAllocationRepository } from "./cloud-cost-allocation.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

/**
 * B-O6R-06 (2.4-c do plano) — TETO DO RATEIO: DE MUDO A ALTO.
 *
 * `listCostLineItems` sempre teve `take: 100_000`. O motor itera LINHA A LINHA (tag direta ou regra por
 * linha) — nao se reduz a um `SUM` —, entao a cura de verdade e paginacao por cursor, que e outro bloco
 * (`P-O6R-B06-RATEIO-CURSOR-100K`). O que ESTE bloco faz e trocar o TRUNCAMENTO SILENCIOSO por uma
 * RECUSA ALTA: acima do teto a run termina `failed` com `period_exceeds_line_item_cap`. Abaixo do teto,
 * por prova; acima, por recusa explicita; nunca por truncamento mudo.
 */
export const CLOUD_COST_ALLOCATION_LINE_ITEM_CAP = 100_000;

/** Teto da transacao unica que varre os tenants (o default do Prisma, 5 s, nao serve para N tenants). */
const TENANT_SWEEP_TX_TIMEOUT_MS = 60_000;

export class PrismaCloudCostAllocationRepository implements CloudCostAllocationRepository {
  constructor(
    private readonly client: PrismaExecutor,
    private readonly lineItemCap: number = CLOUD_COST_ALLOCATION_LINE_ITEM_CAP,
  ) {}

  async createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const record = await this.client.cloudCostAllocationRun.create({
      data: {
        provider: "aws",
        status: "pending",
        period_start: input.periodStart,
        period_end: input.periodEnd,
        strategy: input.strategy ?? "direct_tag_then_usage_weighted_v1",
        created_by: input.createdBy ?? null,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapRun(record);
  }

  async updateRun(runId: string, input: UpdateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const record = await this.client.cloudCostAllocationRun.update({
      where: { id: runId },
      data: {
        status: input.status,
        total_imported_cost: input.totalImportedCost,
        total_allocated_cost: input.totalAllocatedCost,
        total_unallocated_cost: input.totalUnallocatedCost,
        currency: input.currency ?? null,
        started_at: input.startedAt ?? null,
        completed_at: input.completedAt ?? null,
        error_message: input.errorMessage ?? null,
        ...(input.metadata ? { metadata: toJsonObject(input.metadata) } : {}),
      },
    });

    return mapRun(record);
  }

  async getRun(runId: string): Promise<CloudCostAllocationRun | undefined> {
    const record = await this.client.cloudCostAllocationRun.findUnique({ where: { id: runId } });
    return record ? mapRun(record) : undefined;
  }

  async listRuns(filters: CloudCostAllocationRunFilters = {}): Promise<readonly CloudCostAllocationRun[]> {
    const records = await this.client.cloudCostAllocationRun.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.periodStart || filters.periodEnd
          ? {
              AND: [
                ...(filters.periodStart ? [{ period_end: { gte: filters.periodStart } }] : []),
                ...(filters.periodEnd ? [{ period_start: { lte: filters.periodEnd } }] : []),
              ],
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    return records.map(mapRun);
  }

  /**
   * B-O6R-06 / EMENDA E1.3 (achado E3 do `critico-adversarial`, provado por execucao) — A ESCRITA DO
   * RATEIO SO FUNCIONA SOB CONTEXTO DE TENANT.
   *
   * `tenant_cloud_cost_allocations` tem `ENABLE` + `FORCE ROW LEVEL SECURITY` com `USING` E `WITH CHECK`
   * (migration 20260613...). Este metodo escrevia com o `PrismaClient` CRU, sem GUC: sob papel sem
   * BYPASSRLS o `INSERT` morre com `new row violates row-level security policy` e o `DELETE` apaga
   * ZERO linhas EM SILENCIO. Dev e CI usam `postgres` (superusuario), entao o defeito era invisivel na
   * suite. Corrigir so a LEITURA da base era overclaim.
   *
   * DE BRINDE, o replace vira ATOMICO: antes eram um `deleteMany` e N `create` soltos — falha no meio
   * deixava o run sem as linhas antigas E sem as novas. Agora e tudo uma transacao: ou o conjunto
   * inteiro troca, ou nada muda e a run termina `failed`, reexecutavel.
   *
   * A varredura cobre TODOS os tenants, nao so os que tem alocacao nesta execucao: o `deleteMany` sob o
   * GUC de cada tenant e o que limpa linha de execucao anterior de um tenant que hoje ficou sem
   * alocacao. Iterar so os tenants com alocacao deixaria linha orfa (aceite B7).
   */
  async replaceTenantAllocations(
    runId: string,
    allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCostAllocation[]> {
    const tenants = await this.listTenants();
    const byTenant = new Map<string, typeof allocations[number][]>();

    for (const allocation of allocations) {
      const bucket = byTenant.get(allocation.tenantId) ?? [];
      bucket.push(allocation);
      byTenant.set(allocation.tenantId, bucket);
    }

    // Um tenant citado nas alocacoes que nao esta em `listTenants()` nunca poderia ter a linha gravada
    // (a FK e a policy o recusariam). Falha ALTO em vez de perder a alocacao em silencio.
    for (const tenantId of byTenant.keys()) {
      if (!tenants.some((tenant) => tenant.id === tenantId)) {
        throw new CloudCostAllocationError(
          500,
          "CLOUD_COST_ALLOCATION_UNKNOWN_TENANT",
          "unknown_tenant_in_allocation",
          "Allocation references a tenant that is not registered.",
        );
      }
    }

    const created: TenantCloudCostAllocation[] = [];

    await this.forEachTenantInOneTx(
      tenants.map((tenant) => tenant.id),
      async (tx, tenantId) => {
        await tx.tenantCloudCostAllocation.deleteMany({ where: { allocation_run_id: runId } });

        for (const allocation of byTenant.get(tenantId) ?? []) {
          const record = await tx.tenantCloudCostAllocation.create({
            data: buildAllocationData(runId, allocation),
          });
          created.push(mapAllocation(record));
        }
      },
    );

    return created;
  }

  /**
   * B-O6R-06 / EMENDA E1.3 — mesma tabela sob FORCE RLS, mesma exigencia de contexto. Esta e a leitura
   * que alimenta `GET /platform/cloud-cost-allocations/summary` (o painel): sem GUC ela devolvia ZERO
   * linhas sob papel sem BYPASSRLS, tao silenciosamente quanto o `DELETE 0` da escrita.
   *
   * O CANARIO NAO E DECORACAO (achado R2-C da rodada 2 do critico, medido): no laco, esquecer o
   * `set_config` numa volta de ESCRITA e impossivel de nao notar (a policy recusa, ec=1); numa volta de
   * LEITURA a `USING` casa com o GUC OBSOLETO e devolve as linhas do tenant ANTERIOR, com `ec=0` e sem
   * um unico erro — atribuindo o numero de um cliente a outro. Por isso as DUAS leituras do laco
   * (`sumUsageBasis` e esta) conferem o `tenant_id` de cada linha contra o tenant da volta corrente.
   */
  async listTenantAllocations(runId: string, filters: TenantCloudCostAllocationFilters = {}): Promise<readonly TenantCloudCostAllocation[]> {
    const tenants = await this.listTenants();
    const targets = filters.tenantId
      ? tenants.filter((tenant) => tenant.id === filters.tenantId).map((tenant) => tenant.id)
      : tenants.map((tenant) => tenant.id);
    const collected: TenantCloudCostAllocation[] = [];

    await this.forEachTenantInOneTx(targets, async (tx, tenantId) => {
      const records = (await tx.tenantCloudCostAllocation.findMany({
        where: {
          allocation_run_id: runId,
          tenant_id: tenantId,
          ...(filters.serviceCode ? { service_code: filters.serviceCode } : {}),
          ...(filters.costCategory ? { cost_category: filters.costCategory } : {}),
        },
        orderBy: { created_at: "asc" },
      })) as Array<{ readonly tenant_id: string }>;

      assertRowsBelongToTenant(
        records.map((record) => record.tenant_id),
        tenantId,
        "tenant_cloud_cost_allocations",
      );

      collected.push(...records.map((record) => mapAllocation(record as never)));
    });

    return collected;
  }

  async listCostLineItems(periodStart: Date, periodEnd: Date): Promise<readonly CloudCostLineItem[]> {
    const where = {
      billing_period_end: { gte: periodStart },
      billing_period_start: { lte: periodEnd },
    };

    // B-O6R-06 (2.4-c) — CONTAR ANTES. O `take` continua existindo como rede, mas nunca mais decide em
    // silencio quanto do periodo entra na conta: acima do teto a run RECUSA, com o numero medido dentro
    // da mensagem, e e reexecutavel quando a paginacao por cursor existir.
    const count = await this.client.cloudCostLineItem.count({ where });

    if (count > this.lineItemCap) {
      throw new CloudCostAllocationError(
        422,
        "CLOUD_COST_ALLOCATION_PERIOD_TOO_LARGE",
        "period_exceeds_line_item_cap",
        `period_exceeds_line_item_cap: ${JSON.stringify({ count, cap: this.lineItemCap })}`,
      );
    }

    const records = await this.client.cloudCostLineItem.findMany({
      where,
      orderBy: { billing_period_start: "asc" },
      take: this.lineItemCap,
    });

    return records.map(mapCostLineItem);
  }

  async listUsageDailyAggregates(periodStart: Date, periodEnd: Date): Promise<readonly CloudUsageDailyAggregate[]> {
    const records = await this.client.cloudUsageDailyAggregate.findMany({
      where: {
        date: {
          gte: dateOnly(periodStart),
          lte: dateOnly(periodEnd),
        },
      },
      orderBy: { date: "asc" },
      take: 100_000,
    });

    return records.map(mapUsageAggregate);
  }

  /**
   * B-O6R-06 (3.2 do plano) — A BASE DE RATEIO, SOMADA NO BANCO, POR TENANT, SOB O CONTEXTO DELE.
   *
   * `cloud_usage_events` tem `FORCE ROW LEVEL SECURITY` com policy
   * `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`. Ler de PLATAFORMA
   * (sem GUC) devolve `NULLIF('','')` = NULL -> policy falsa -> ZERO LINHAS para qualquer papel que
   * nao bypasse RLS. Ler por tenant, sob o GUC do tenant, e correto em QUALQUER papel de banco.
   *
   * `_sum` NULAVEL, `_count._all` como DISCRIMINADOR: grupo com soma nula e OMITIDO; e se houver linha
   * no periodo (`count > 0`) mas o `groupBy` vier vazio, isto LANCA — e o "`[]` e suspeita" da PD,
   * tornado decidivel. Nenhum `?? 0`.
   */
  async sumUsageBasis(
    periodStart: Date,
    periodEnd: Date,
    tenantIds: readonly string[],
  ): Promise<readonly UsageBasisRow[]> {
    const rows: UsageBasisRow[] = [];

    await this.forEachTenantInOneTx(tenantIds, async (tx, tenantId) => {
      const where = { occurred_at: { gte: periodStart, lte: periodEnd } };

      const [aggregated, grouped] = await Promise.all([
        tx.cloudUsageEvent.aggregate({ where, _count: { _all: true } }),
        tx.cloudUsageEvent.groupBy({
          by: ["tenant_id", "metric_key", "unit", "source_type"],
          where,
          _sum: { quantity: true },
          _count: { _all: true },
        }),
      ]);

      if (aggregated._count._all > 0 && grouped.length === 0) {
        throw new CloudCostAllocationError(
          500,
          "CLOUD_COST_ALLOCATION_BASIS_INCONSISTENT",
          "usage_basis_group_by_empty",
          `usage_basis_group_by_empty: ${aggregated._count._all} usage event(s) in window produced no groups.`,
        );
      }

      assertRowsBelongToTenant(
        grouped.map((group) => group.tenant_id),
        tenantId,
        "cloud_usage_events",
      );

      for (const group of grouped) {
        // Soma nula num grupo e impossivel (`quantity` e NOT NULL) — mas o tipo do Prisma e nulavel e o
        // `?? 0` esta PROIBIDO nominalmente neste bloco. Omitir e a leitura honesta: nao ha base.
        if (group._sum.quantity === null || group._sum.quantity === undefined) continue;

        rows.push({
          tenantId: group.tenant_id,
          metricKey: group.metric_key as CloudUsageMetricKey,
          unit: group.unit,
          sourceType: group.source_type,
          quantity: Number(group._sum.quantity),
        });
      }
    });

    return rows;
  }

  async listTenants(): Promise<readonly CloudCostAllocationTenant[]> {
    const records = await this.client.tenant.findMany({
      select: { id: true, name: true, slug: true },
    });

    return records;
  }

  /**
   * UMA transacao para os N tenants, com `set_config(..., true)` (transaction-local) trocado a cada
   * volta. `setTenantRlsContext` e o setter UNICO do GUC de tenant, ja exportado por
   * `src/database/rls.ts` — este bloco nao toca aquele arquivo.
   *
   * Os tres metodos que passam por aqui exigem `$transaction`, logo exigem um `PrismaClient`. O
   * construtor continua aceitando `PrismaExecutor` para os demais metodos; aqui a exigencia e asserida
   * em RUNTIME, com erro nomeado: um `TransactionClient` injetado falha ALTO, nunca escreve sem
   * contexto de tenant.
   */
  private async forEachTenantInOneTx(
    tenantIds: readonly string[],
    work: (tx: Prisma.TransactionClient, tenantId: string) => Promise<void>,
  ): Promise<void> {
    if (tenantIds.length === 0) return;

    const client = this.client;

    if (!("$transaction" in client) || typeof client.$transaction !== "function") {
      throw new CloudCostAllocationError(
        500,
        "CLOUD_COST_ALLOCATION_EXECUTOR_INVALID",
        "tenant_sweep_requires_prisma_client",
        "Tenant-scoped allocation access requires a PrismaClient able to open a transaction.",
      );
    }

    await (client as PrismaClient).$transaction(
      async (tx) => {
        for (const tenantId of tenantIds) {
          await setTenantRlsContext(tx, tenantId);
          await work(tx, tenantId);
        }
      },
      { timeout: TENANT_SWEEP_TX_TIMEOUT_MS },
    );
  }
}

/**
 * CANARIO DE CONTEXTO (achado R2-C). Uma volta do laco que nao re-setou o GUC devolve, EM SILENCIO, as
 * linhas do tenant anterior — a policy casa com o valor obsoleto e o `ec` e 0. Comparar o `tenant_id`
 * lido contra o tenant da volta e o unico jeito de a leitura ser tao fail-closed quanto a escrita.
 */
function assertRowsBelongToTenant(tenantIds: readonly string[], expected: string, table: string): void {
  const alien = tenantIds.find((tenantId) => tenantId !== expected);

  if (alien !== undefined) {
    throw new CloudCostAllocationError(
      500,
      "CLOUD_COST_ALLOCATION_CONTEXT_LEAK",
      "tenant_context_leak",
      `tenant_context_leak: ${table} returned rows for another organization under the current context.`,
    );
  }
}

function buildAllocationData(
  runId: string,
  allocation: Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">,
) {
  return {
    allocation_run_id: runId,
    tenant_id: allocation.tenantId,
    provider: allocation.provider,
    period_start: allocation.periodStart,
    period_end: allocation.periodEnd,
    service_code: allocation.serviceCode,
    usage_type: allocation.usageType,
    cost_category: allocation.costCategory,
    allocation_method: allocation.allocationMethod,
    allocation_basis_metric_key: allocation.allocationBasisMetricKey ?? null,
    allocation_basis_quantity: allocation.allocationBasisQuantity,
    allocation_ratio: allocation.allocationRatio,
    allocated_cost: allocation.allocatedCost,
    currency: allocation.currency,
    source_cost_line_item_ids: allocation.sourceCostLineItemIds as Prisma.InputJsonArray,
    metadata: toJsonObject(allocation.metadata),
  };
}

export async function createPrismaCloudCostAllocationRepository(): Promise<PrismaCloudCostAllocationRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaCloudCostAllocationRepository(prisma);
}

function mapRun(record: {
  readonly id: string;
  readonly provider: string;
  readonly status: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly strategy: string;
  readonly total_imported_cost: unknown;
  readonly total_allocated_cost: unknown;
  readonly total_unallocated_cost: unknown;
  readonly currency: string | null;
  readonly started_at: Date | null;
  readonly completed_at: Date | null;
  readonly created_by: string | null;
  readonly error_message: string | null;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudCostAllocationRun {
  return {
    id: record.id,
    provider: "aws",
    status: record.status as CloudCostAllocationRun["status"],
    periodStart: record.period_start,
    periodEnd: record.period_end,
    strategy: record.strategy as CloudCostAllocationRun["strategy"],
    totalImportedCost: Number(record.total_imported_cost),
    totalAllocatedCost: Number(record.total_allocated_cost),
    totalUnallocatedCost: Number(record.total_unallocated_cost),
    currency: record.currency ?? undefined,
    startedAt: record.started_at ?? undefined,
    completedAt: record.completed_at ?? undefined,
    createdBy: record.created_by ?? undefined,
    errorMessage: record.error_message ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapAllocation(record: {
  readonly id: string;
  readonly allocation_run_id: string;
  readonly tenant_id: string;
  readonly provider: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly service_code: string;
  readonly usage_type: string;
  readonly cost_category: string;
  readonly allocation_method: string;
  readonly allocation_basis_metric_key: string | null;
  readonly allocation_basis_quantity: unknown;
  readonly allocation_ratio: unknown;
  readonly allocated_cost: unknown;
  readonly currency: string;
  readonly source_cost_line_item_ids: unknown;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): TenantCloudCostAllocation {
  return {
    id: record.id,
    allocationRunId: record.allocation_run_id,
    tenantId: record.tenant_id,
    provider: "aws",
    periodStart: record.period_start,
    periodEnd: record.period_end,
    serviceCode: record.service_code,
    usageType: record.usage_type,
    costCategory: record.cost_category,
    allocationMethod: record.allocation_method as TenantCloudCostAllocation["allocationMethod"],
    allocationBasisMetricKey: record.allocation_basis_metric_key as TenantCloudCostAllocation["allocationBasisMetricKey"],
    allocationBasisQuantity: Number(record.allocation_basis_quantity),
    allocationRatio: Number(record.allocation_ratio),
    allocatedCost: Number(record.allocated_cost),
    currency: record.currency,
    sourceCostLineItemIds: Array.isArray(record.source_cost_line_item_ids)
      ? record.source_cost_line_item_ids.filter((item): item is string => typeof item === "string")
      : [],
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapCostLineItem(record: {
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
    provider: "aws",
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

function mapUsageAggregate(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly date: Date;
  readonly metric_key: string;
  readonly quantity: unknown;
  readonly unit: string;
  readonly source_type: string;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudUsageDailyAggregate {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    date: record.date.toISOString().slice(0, 10),
    metricKey: record.metric_key as CloudUsageDailyAggregate["metricKey"],
    quantity: Number(record.quantity),
    unit: record.unit as CloudUsageDailyAggregate["unit"],
    sourceType: record.source_type,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function dateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
