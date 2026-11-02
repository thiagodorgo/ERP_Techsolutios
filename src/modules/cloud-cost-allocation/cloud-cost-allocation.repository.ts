import { randomUUID } from "node:crypto";

import type { CloudCostImport, CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageDailyAggregate, CloudUsageEvent } from "../cloud-usage/cloud-usage.types.js";
import type {
  CloudCostAllocationRun,
  CloudCostAllocationRunFilters,
  CloudCostAllocationTenant,
  CreateCloudCostAllocationRunInput,
  TenantCloudCostAllocation,
  TenantCloudCostAllocationFilters,
  UpdateCloudCostAllocationRunInput,
  UsageBasisRow,
} from "./cloud-cost-allocation.types.js";

export type CloudCostAllocationRepository = {
  createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun>;
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

export const DERIVADAS = ["storage_bytes_current", "audited_actions_count"] as const;

type StorageInventorySeed = {
  readonly tenantId: string;
  readonly model: (typeof STORAGE_INVENTORY_MODELS)[number];
  readonly sizeBytes?: number;
  readonly createdAt: Date;
  readonly deletedAt?: Date;
};

type AuditedActionSeed = {
  readonly tenantId: string;
  readonly actorUserId?: string;
  readonly action: string;
  readonly createdAt: Date;
};

export class InMemoryCloudCostAllocationRepository implements CloudCostAllocationRepository {
  private runs: CloudCostAllocationRun[] = [];
  private allocations: TenantCloudCostAllocation[] = [];
  private imports: CloudCostImport[] = [];
  private costLineItems: CloudCostLineItem[] = [];
  private usageAggregates: CloudUsageDailyAggregate[] = [];
  private usageEvents: CloudUsageEvent[] = [];
  private attachments: StorageInventorySeed[] = [];
  private auditedActions: AuditedActionSeed[] = [];
  private users: Array<{ readonly id: string; readonly tenantId: string }> = [];
  private tenants: CloudCostAllocationTenant[] = [];

  async createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const now = new Date();
    const run: CloudCostAllocationRun = {
      id: randomUUID(),
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
    if (importId) return this.imports.find((costImport) => costImport.id === importId);

    return this.imports
      .filter((costImport) => costImport.status === "completed")
      .filter((costImport) =>
        this.costLineItems.some(
          (line) =>
            line.importId === costImport.id &&
            line.billingPeriodEnd >= periodStart &&
            line.billingPeriodStart <= periodEnd,
        ),
      )
      .sort((a, b) => {
        const importedAt = (b.importedAt?.getTime() ?? 0) - (a.importedAt?.getTime() ?? 0);
        return importedAt || b.createdAt.getTime() - a.createdAt.getTime();
      })[0];
  }

  async listCostLineItems(periodStart: Date, periodEnd: Date, importId: string): Promise<readonly CloudCostLineItem[]> {
    return this.costLineItems.filter(
      (line) =>
        line.importId === importId &&
        line.billingPeriodEnd >= periodStart &&
        line.billingPeriodStart <= periodEnd,
    );
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
      const quantity = (existing?.quantity ?? 0) + event.quantity;

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
      storageByTenant.set(
        attachment.tenantId,
        (storageByTenant.get(attachment.tenantId) ?? 0) + attachment.sizeBytes,
      );
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
      actionsByTenant.set(tenantId, (actionsByTenant.get(tenantId) ?? 0) + 1);
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
    readonly users?: readonly { readonly id: string; readonly tenantId: string }[];
  }): void {
    this.imports = [...(input.imports ?? this.imports)];
    this.tenants = [...(input.tenants ?? this.tenants)];
    this.costLineItems = [...(input.costLineItems ?? this.costLineItems)];
    this.usageAggregates = [...(input.usageAggregates ?? this.usageAggregates)];
    this.usageEvents = [...(input.usageEvents ?? this.usageEvents)];
    this.attachments = [...(input.attachments ?? this.attachments)];
    this.auditedActions = [...(input.auditedActions ?? this.auditedActions)];
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
    this.users = [];
    this.tenants = [];
  }

  private async getRequiredRun(runId: string): Promise<CloudCostAllocationRun> {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Cloud cost allocation run not found: ${runId}`);
    return run;
  }
}
