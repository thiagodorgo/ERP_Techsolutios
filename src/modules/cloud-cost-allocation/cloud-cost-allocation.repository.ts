import { randomUUID } from "node:crypto";

import type { CloudCostRepository } from "../cloud-costs/aws-cur.repository.js";
import type { CloudCostImport, CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageDailyAggregate, CloudUsageEvent } from "../cloud-usage/cloud-usage.types.js";
import type {
  CloudCostAllocationRun,
  CloudCostAllocationRunFilters,
  CloudCostAllocationTenant,
  CreateCloudCostAllocationRunInput,
  CreateCloudCostAllocationRunWithIdInput,
  CreatedCloudCostAllocationRun,
  ImportBillingPeriod,
  TenantCloudCostAllocation,
  TenantCloudCostAllocationFilters,
  UpdateCloudCostAllocationRunInput,
  UsageBasisRow,
} from "./cloud-cost-allocation.types.js";

export type CloudCostAllocationRepository = {
  createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun>;
  /** B-ASS-09a · P2 — cria com o id dado; se ele já existe, devolve a existente com `created: false` (nunca duplica). */
  createRunWithId(input: CreateCloudCostAllocationRunWithIdInput): Promise<CreatedCloudCostAllocationRun>;
  /** B-ASS-09a · P1 — os pares BRUTOS distintos (`billing_period_start`, `billing_period_end`) das linhas da importação. */
  listImportBillingPeriods(importId: string): Promise<readonly ImportBillingPeriod[]>;
  /** B-ASS-09a · P3 — as linhas da importação com EXATAMENTE aquele par (partição por construção), com o teto de contagem. */
  listCostLineItemsForBillingPeriod(
    importId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
  ): Promise<readonly CloudCostLineItem[]>;
  /** B-ASS-09a — as runs (manuais e automáticas) de uma importação, da mais nova para a mais velha. */
  listRunsByImport(importId: string): Promise<readonly CloudCostAllocationRun[]>;
  updateRun(runId: string, input: UpdateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun>;
  getRun(runId: string): Promise<CloudCostAllocationRun | undefined>;
  listRuns(filters?: CloudCostAllocationRunFilters): Promise<readonly CloudCostAllocationRun[]>;
  replaceTenantAllocations(
    runId: string,
    allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCostAllocation[]>;
  listTenantAllocations(runId: string, filters?: TenantCloudCostAllocationFilters): Promise<readonly TenantCloudCostAllocation[]>;
  findBillableImport(periodStart: Date, periodEnd: Date, importId?: string): Promise<CloudCostImport | undefined>;
  listCostLineItems(periodStart: Date, periodEnd: Date, importId: string): Promise<readonly CloudCostLineItem[]>;
  // B-O6R-06 — FICA (serve `GET /platform/cloud-usage/tenants/:id/daily`), mas SAIU do caminho do
  // rateio: a base de dinheiro nao pode depender de uma projecao que ninguem agenda.
  listUsageDailyAggregates(periodStart: Date, periodEnd: Date): Promise<readonly CloudUsageDailyAggregate[]>;
  // B-O6R-06 — a BASE DE RATEIO: `SUM ... GROUP BY` sobre `cloud_usage_events`, POR TENANT, sob o
  // contexto RLS de cada um. Sem `take`, sem projecao no meio.
  sumUsageBasis(
    periodStart: Date,
    periodEnd: Date,
    tenantIds: readonly string[],
  ): Promise<readonly UsageBasisRow[]>;
  listTenants(): Promise<readonly CloudCostAllocationTenant[]>;
};

export const STORAGE_INVENTORY_MODELS = [
  "checklist_attachments",
  "work_order_attachments",
  "attachments",
  "damage_attachments",
] as const;

// B-ASS-03 · R-MED-8 — `db_bytes_estimated` também é DERIVADA: lida de `tenant_usage_daily`, nunca de evento.
export const DERIVADAS = ["storage_bytes_current", "audited_actions_count", "db_bytes_estimated"] as const;

type StorageInventorySeed = {
  readonly tenantId: string;
  readonly model: (typeof STORAGE_INVENTORY_MODELS)[number];
  readonly sizeBytes?: number;
  readonly createdAt: Date;
  readonly deletedAt?: Date;
};

// B-ASS-03 · R-MED-8 — o dia medido (`tenant_usage_daily`): `date` é a data local SP (YYYY-MM-DD).
type UsageDailySeed = {
  readonly tenantId: string;
  readonly date: string;
  readonly dbBytesEstimated: number | null;
};

type AuditedActionSeed = {
  readonly tenantId: string;
  readonly actorUserId?: string;
  readonly action: string;
  readonly createdAt: Date;
};

/**
 * B-ASS-09a · R3 (A3) — a PONTE em memória. Sem ela, este repositório e o de importação (`InMemoryCloudCostRepository`)
 * não se enxergam: a importação grava num objeto e o rateio lê `imports`/`costLineItems` alimentados só por `seed()`.
 * Com `costSource`, as leituras de importação e de linha vêm do repositório de importação (composição explícita, só em
 * teste). Sem ele, tudo fica como antes e os testes que usam `seed()` não mudam.
 */
export type InMemoryCloudCostAllocationRepositoryOptions = {
  readonly costSource?: Pick<CloudCostRepository, "getImport" | "listImports" | "listLineItems">;
};

export class InMemoryCloudCostAllocationRepository implements CloudCostAllocationRepository {
  private readonly costSource?: InMemoryCloudCostAllocationRepositoryOptions["costSource"];

  constructor(options: InMemoryCloudCostAllocationRepositoryOptions = {}) {
    this.costSource = options.costSource;
  }

  private runs: CloudCostAllocationRun[] = [];
  private allocations: TenantCloudCostAllocation[] = [];
  private imports: CloudCostImport[] = [];
  private costLineItems: CloudCostLineItem[] = [];
  private usageAggregates: CloudUsageDailyAggregate[] = [];
  private usageEvents: CloudUsageEvent[] = [];
  private attachments: StorageInventorySeed[] = [];
  private auditedActions: AuditedActionSeed[] = [];
  private usageDaily: UsageDailySeed[] = [];
  private users: Array<{ readonly id: string; readonly tenantId: string }> = [];
  private tenants: CloudCostAllocationTenant[] = [];

  async createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    return this.insertRun(randomUUID(), input);
  }

  async createRunWithId(input: CreateCloudCostAllocationRunWithIdInput): Promise<CreatedCloudCostAllocationRun> {
    // Síncrono do `find` ao `push`: duas chamadas com o mesmo id nunca intercalam aqui (um único laço de eventos).
    const existing = this.runs.find((run) => run.id === input.id);
    if (existing) return { run: existing, created: false };
    return { run: await this.insertRun(input.id, input), created: true };
  }

  async listImportBillingPeriods(importId: string): Promise<readonly ImportBillingPeriod[]> {
    const pairs = new Map<string, ImportBillingPeriod>();
    for (const line of await this.linesOfImport(importId)) {
      const key = `${line.billingPeriodStart.toISOString()}|${line.billingPeriodEnd.toISOString()}`;
      if (!pairs.has(key)) {
        pairs.set(key, { billingPeriodStart: line.billingPeriodStart, billingPeriodEnd: line.billingPeriodEnd });
      }
    }
    return [...pairs.values()].sort(
      (a, b) =>
        a.billingPeriodStart.getTime() - b.billingPeriodStart.getTime() ||
        a.billingPeriodEnd.getTime() - b.billingPeriodEnd.getTime(),
    );
  }

  async listCostLineItemsForBillingPeriod(
    importId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date,
  ): Promise<readonly CloudCostLineItem[]> {
    return (await this.linesOfImport(importId)).filter(
      (line) =>
        line.billingPeriodStart.getTime() === billingPeriodStart.getTime() && line.billingPeriodEnd.getTime() === billingPeriodEnd.getTime(),
    );
  }

  async listRunsByImport(importId: string): Promise<readonly CloudCostAllocationRun[]> {
    // O dublê não tem a coluna `import_id`: a importação da run mora em `metadata.importId`, gravado por toda run
    // criada pelo serviço (manual e automática). O Prisma lê a coluna (M-09a).
    return this.runs
      .filter((run) => run.metadata.importId === importId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async insertRun(id: string, input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const now = new Date();
    const run: CloudCostAllocationRun = {
      id,
      provider: "aws",
      status: "pending",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      strategy: input.strategy ?? "direct_tag_then_usage_weighted_v1",
      totalImportedCost: 0,
      totalAllocatedCost: 0,
      totalUnallocatedCost: 0,
      createdBy: input.createdBy,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.runs.push(run);
    return run;
  }

  async updateRun(runId: string, input: UpdateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const existing = await this.getRequiredRun(runId);
    const updated: CloudCostAllocationRun = {
      ...existing,
      status: input.status,
      totalImportedCost: input.totalImportedCost ?? existing.totalImportedCost,
      totalAllocatedCost: input.totalAllocatedCost ?? existing.totalAllocatedCost,
      totalUnallocatedCost: input.totalUnallocatedCost ?? existing.totalUnallocatedCost,
      currency: input.currency ?? existing.currency,
      startedAt: input.startedAt ?? existing.startedAt,
      completedAt: input.completedAt ?? existing.completedAt,
      errorMessage: input.errorMessage,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: new Date(),
    };

    this.runs = this.runs.map((run) => (run.id === runId ? updated : run));
    return updated;
  }

  async getRun(runId: string): Promise<CloudCostAllocationRun | undefined> {
    return this.runs.find((run) => run.id === runId);
  }

  async listRuns(filters: CloudCostAllocationRunFilters = {}): Promise<readonly CloudCostAllocationRun[]> {
    return this.runs
      .filter((run) => !filters.status || run.status === filters.status)
      .filter((run) => !filters.periodStart || run.periodEnd >= filters.periodStart)
      .filter((run) => !filters.periodEnd || run.periodStart <= filters.periodEnd)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async replaceTenantAllocations(
    runId: string,
    allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCostAllocation[]> {
    const now = new Date();
    this.allocations = this.allocations.filter((allocation) => allocation.allocationRunId !== runId);
    const created = allocations.map((allocation) => ({
      ...allocation,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    this.allocations.push(...created);
    return created;
  }

  async listTenantAllocations(runId: string, filters: TenantCloudCostAllocationFilters = {}): Promise<readonly TenantCloudCostAllocation[]> {
    return this.allocations
      .filter((allocation) => allocation.allocationRunId === runId)
      .filter((allocation) => !filters.tenantId || allocation.tenantId === filters.tenantId)
      .filter((allocation) => !filters.serviceCode || allocation.serviceCode === filters.serviceCode)
      .filter((allocation) => !filters.costCategory || allocation.costCategory === filters.costCategory);
  }

  async findBillableImport(periodStart: Date, periodEnd: Date, importId?: string): Promise<CloudCostImport | undefined> {
    if (importId) {
      if (this.costSource) return this.costSource.getImport(importId); // B-ASS-09a ponte
      return this.imports.find((costImport) => costImport.id === importId);
    }

    const candidates: CloudCostImport[] = [];
    for (const costImport of await this.allImports()) {
      if (costImport.status !== "completed") continue;
      const lines = await this.linesOfImport(costImport.id);
      // B-ASS-09a · R4 — o fim da LINHA precisa ser estritamente depois do início da run: a linha de outubro no fim
      // exclusivo da AWS (termina em 11-01T00:00) não toca novembro. O lado do início fica `<=` (run de um dia).
      const touches = lines.some(
        (line) =>
          line.billingPeriodEnd > periodStart && // B-ASS-09a R4 findBillableImport
          line.billingPeriodStart <= periodEnd,
      );
      if (touches) candidates.push(costImport);
    }

    return candidates.sort((a, b) => {
      const importedAt = (b.importedAt?.getTime() ?? 0) - (a.importedAt?.getTime() ?? 0);
      return importedAt || b.createdAt.getTime() - a.createdAt.getTime();
    })[0];
  }

  async listCostLineItems(periodStart: Date, periodEnd: Date, importId: string): Promise<readonly CloudCostLineItem[]> {
    return (await this.linesOfImport(importId)).filter(
      (line) =>
        line.billingPeriodEnd > periodStart && // B-ASS-09a R4 listCostLineItems
        line.billingPeriodStart <= periodEnd,
    );
  }

  /** B-ASS-09a · R3 — as importações: do repositório de importação (ponte) ou das semeadas. */
  private async allImports(): Promise<readonly CloudCostImport[]> {
    if (this.costSource) return this.costSource.listImports();
    return this.imports;
  }

  /** B-ASS-09a · R3 — as linhas de UMA importação: do repositório de importação (ponte) ou das semeadas. */
  private async linesOfImport(importId: string): Promise<readonly CloudCostLineItem[]> {
    if (this.costSource) return this.costSource.listLineItems({ importId, limit: Number.MAX_SAFE_INTEGER });
    return this.costLineItems.filter((line) => line.importId === importId);
  }

  async listUsageDailyAggregates(periodStart: Date, periodEnd: Date): Promise<readonly CloudUsageDailyAggregate[]> {
    const start = periodStart.toISOString().slice(0, 10);
    const end = periodEnd.toISOString().slice(0, 10);
    return this.usageAggregates.filter((aggregate) => aggregate.date >= start && aggregate.date <= end);
  }

  // Duble: reduz sobre os EVENTOS semeados, sem limite. Espelha a semantica do `groupBy` do Postgres
  // (agrupa por tenant/metrica/unidade/origem) e respeita o recorte por tenant.
  async sumUsageBasis(
    periodStart: Date,
    periodEnd: Date,
    tenantIds: readonly string[],
  ): Promise<readonly UsageBasisRow[]> {
    const allowed = new Set(tenantIds);
    const groups = new Map<string, { row: UsageBasisRow; quantity: number }>();

    for (const event of this.usageEvents) {
      if (!allowed.has(event.tenantId)) continue;
      if (event.occurredAt < periodStart || event.occurredAt > periodEnd) continue;

      const key = [event.tenantId, event.metricKey, event.unit, event.sourceType].join("|");
      const existing = groups.get(key);
      const quantity = existing === undefined ? event.quantity : existing.quantity + event.quantity;

      groups.set(key, {
        quantity,
        row: {
          tenantId: event.tenantId,
          metricKey: event.metricKey,
          unit: event.unit,
          sourceType: event.sourceType,
          quantity,
        },
      });
    }

    const storageByTenant = new Map<string, number>();
    for (const attachment of this.attachments) {
      if (!allowed.has(attachment.tenantId)) continue;
      if (attachment.createdAt > periodEnd || attachment.deletedAt) continue;
      if (attachment.sizeBytes === undefined) continue;
      const current = storageByTenant.get(attachment.tenantId);
      storageByTenant.set(attachment.tenantId, current === undefined ? attachment.sizeBytes : current + attachment.sizeBytes);
    }
    for (const [tenantId, quantity] of storageByTenant) {
      if (quantity <= 0) continue;
      groups.set(`${tenantId}|storage_bytes_current|bytes|file_inventory`, {
        quantity,
        row: {
          tenantId,
          metricKey: "storage_bytes_current",
          unit: "bytes",
          sourceType: "file_inventory",
          quantity,
        },
      });
    }

    // B-ASS-03 · R-MED-8 — o banco pela medição: o ÚLTIMO dia medido (db não nulo) até o fim do período.
    const periodEndDate = periodEnd.toISOString().slice(0, 10);
    const lastDbByTenant = new Map<string, UsageDailySeed>();
    for (const day of this.usageDaily) {
      if (!allowed.has(day.tenantId) || day.dbBytesEstimated === null || day.date > periodEndDate) continue;
      const current = lastDbByTenant.get(day.tenantId);
      if (!current || day.date > current.date) lastDbByTenant.set(day.tenantId, day);
    }
    for (const [tenantId, day] of lastDbByTenant) {
      if (day.dbBytesEstimated === null || day.dbBytesEstimated <= 0) continue;
      groups.set(`${tenantId}|db_bytes_estimated|bytes|tenant_usage_daily`, {
        quantity: day.dbBytesEstimated,
        row: {
          tenantId,
          metricKey: "db_bytes_estimated",
          unit: "bytes",
          sourceType: "tenant_usage_daily",
          quantity: day.dbBytesEstimated,
        },
      });
    }

    const platformTenant = this.tenants.find((tenant) => tenant.slug?.toLowerCase() === "platform");
    const platformUserIds = new Set(
      this.users.filter((user) => user.tenantId === platformTenant?.id).map((user) => user.id),
    );
    const actionsByTenant = new Map<string, number>();
    for (const action of this.auditedActions) {
      if (action.createdAt < periodStart || action.createdAt > periodEnd) continue;
      if (!action.actorUserId || action.action.startsWith("auth.")) continue;
      const tenantId = platformUserIds.has(action.actorUserId) && platformTenant
        ? platformTenant.id
        : action.tenantId;
      if (!allowed.has(tenantId)) continue;
      const current = actionsByTenant.get(tenantId);
      actionsByTenant.set(tenantId, current === undefined ? 1 : current + 1);
    }
    for (const [tenantId, quantity] of actionsByTenant) {
      groups.set(`${tenantId}|audited_actions_count|count|audit_log`, {
        quantity,
        row: {
          tenantId,
          metricKey: "audited_actions_count",
          unit: "count",
          sourceType: "audit_log",
          quantity,
        },
      });
    }

    return [...groups.values()].map((group) => ({ ...group.row, quantity: group.quantity }));
  }

  async listTenants(): Promise<readonly CloudCostAllocationTenant[]> {
    return this.tenants;
  }

  seed(input: {
    readonly imports?: readonly CloudCostImport[];
    readonly tenants?: readonly CloudCostAllocationTenant[];
    readonly costLineItems?: readonly CloudCostLineItem[];
    readonly usageAggregates?: readonly CloudUsageDailyAggregate[];
    readonly usageEvents?: readonly CloudUsageEvent[];
    readonly attachments?: readonly StorageInventorySeed[];
    readonly auditedActions?: readonly AuditedActionSeed[];
    readonly usageDaily?: readonly UsageDailySeed[];
    readonly users?: readonly { readonly id: string; readonly tenantId: string }[];
  }): void {
    this.imports = [...(input.imports ?? this.imports)];
    this.tenants = [...(input.tenants ?? this.tenants)];
    this.costLineItems = [...(input.costLineItems ?? this.costLineItems)];
    this.usageAggregates = [...(input.usageAggregates ?? this.usageAggregates)];
    this.usageEvents = [...(input.usageEvents ?? this.usageEvents)];
    this.attachments = [...(input.attachments ?? this.attachments)];
    this.auditedActions = [...(input.auditedActions ?? this.auditedActions)];
    this.usageDaily = [...(input.usageDaily ?? this.usageDaily)];
    this.users = [...(input.users ?? this.users)];
  }

  reset(): void {
    this.runs = [];
    this.allocations = [];
    this.imports = [];
    this.costLineItems = [];
    this.usageAggregates = [];
    this.usageEvents = [];
    this.attachments = [];
    this.auditedActions = [];
    this.usageDaily = [];
    this.users = [];
    this.tenants = [];
  }

  private async getRequiredRun(runId: string): Promise<CloudCostAllocationRun> {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Cloud cost allocation run not found: ${runId}`);
    return run;
  }
}
