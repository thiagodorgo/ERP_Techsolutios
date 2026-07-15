import { randomUUID } from "node:crypto";

import type {
  CreateWorkOrderFinancialItemInput,
  UpdateWorkOrderFinancialItemInput,
  WorkOrderFinancialItem,
} from "./work-order-financial.types.js";
import { WorkOrderFinancialError } from "./work-order-financial.types.js";

export interface WorkOrderFinancialItemRepository {
  create(input: CreateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem>;
  listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]>;
  findById(tenantId: string, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem | undefined>;
  findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderFinancialItem | undefined>;
  update(input: UpdateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem | undefined>;
  softDelete(tenantId: string, workOrderId: string, itemId: string, deletedBy?: string): Promise<WorkOrderFinancialItem | undefined>;
  reset?(): void;
}

export class InMemoryWorkOrderFinancialItemRepository implements WorkOrderFinancialItemRepository {
  private readonly items = new Map<string, WorkOrderFinancialItem>();

  async create(input: CreateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem> {
    // Idempotência tenant-scoped (§6): duplicado ATIVO com o mesmo client_action_id → 409.
    // Espelha o unique PARCIAL do Postgres (rede extra do pre-check do service).
    if (input.clientActionId && (await this.findActiveByClientActionId(input.tenantId, input.workOrderId, input.clientActionId))) {
      throw duplicateFinancialItemError();
    }

    const now = new Date();
    const item: WorkOrderFinancialItem = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    // Extrato lê na ordem de lançamento (asc); o total agregado fecha embaixo. Deletados (lógico)
    // NUNCA aparecem.
    return [...this.items.values()]
      .filter((item) => item.tenantId === tenantId && item.workOrderId === workOrderId && !item.deletedAt)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findById(tenantId: string, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem | undefined> {
    const item = this.items.get(itemId);
    return item && item.tenantId === tenantId && item.workOrderId === workOrderId && !item.deletedAt ? item : undefined;
  }

  async findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderFinancialItem | undefined> {
    return [...this.items.values()].find(
      (item) =>
        item.tenantId === tenantId &&
        item.workOrderId === workOrderId &&
        item.clientActionId === clientActionId &&
        !item.deletedAt,
    );
  }

  async update(input: UpdateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId, input.itemId);
    if (!current) return undefined;

    const updated: WorkOrderFinancialItem = {
      ...current,
      ...definedFields({
        description: input.description,
        quantity: input.quantity,
        unitAmount: input.unitAmount,
        totalAmount: input.totalAmount,
        notes: input.notes,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.items.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, workOrderId: string, itemId: string, deletedBy?: string): Promise<WorkOrderFinancialItem | undefined> {
    const current = await this.findById(tenantId, workOrderId, itemId);
    if (!current) return undefined;
    // Delete LÓGICO: carimba deletedAt; some da lista e do total agregado.
    const removed: WorkOrderFinancialItem = {
      ...current,
      ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };
    this.items.set(removed.id, removed);
    return removed;
  }

  reset(): void {
    this.items.clear();
  }
}

export function duplicateFinancialItemError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    409,
    "WORK_ORDER_FINANCIAL_CONFLICT",
    "duplicate_financial_item",
    "A financial item with this client_action_id already exists for this work order.",
  );
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
