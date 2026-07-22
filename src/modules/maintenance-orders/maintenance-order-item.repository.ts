import { randomUUID } from "node:crypto";

import type {
  CreateMaintenanceOrderItemInput,
  MaintenanceOrderItem,
  UpdateMaintenanceOrderItemInput,
} from "./maintenance-order-item.types.js";

export interface MaintenanceOrderItemRepository {
  create(input: CreateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem>;
  /** ATIVOS (deleted_at IS NULL) de UMA ordem, tenant-scoped, ordem estável por created_at. */
  listByOrder(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrderItem[]>;
  /** ATIVOS de VÁRIAS ordens (batch da lista de cabeçalhos), tenant-scoped. */
  listByOrderIds(tenantId: string, maintenanceOrderIds: readonly string[]): Promise<MaintenanceOrderItem[]>;
  findById(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined>;
  update(input: UpdateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem | undefined>;
  /** Soft-delete = "excluir item" (deleted_at + is_active=false). */
  softDelete(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined>;
  reset?(): void;
}

export class InMemoryMaintenanceOrderItemRepository implements MaintenanceOrderItemRepository {
  private readonly items = new Map<string, MaintenanceOrderItem>();

  async create(input: CreateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem> {
    const now = new Date();
    const item: MaintenanceOrderItem = {
      id: randomUUID(),
      tenantId: input.tenantId,
      maintenanceOrderId: input.maintenanceOrderId,
      itemType: input.itemType,
      description: input.description,
      unitValue: input.unitValue,
      quantity: input.quantity,
      notes: input.notes,
      isActive: true,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  async listByOrder(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrderItem[]> {
    return this.activeItems().filter(
      (item) => item.tenantId === tenantId && item.maintenanceOrderId === maintenanceOrderId,
    );
  }

  async listByOrderIds(tenantId: string, maintenanceOrderIds: readonly string[]): Promise<MaintenanceOrderItem[]> {
    const ids = new Set(maintenanceOrderIds);
    return this.activeItems().filter((item) => item.tenantId === tenantId && ids.has(item.maintenanceOrderId));
  }

  async findById(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined> {
    const item = this.items.get(itemId);
    return item && item.tenantId === tenantId && item.deletedAt === undefined ? item : undefined;
  }

  async update(input: UpdateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem | undefined> {
    const current = await this.findById(input.tenantId, input.itemId);
    if (!current) return undefined;

    const updated: MaintenanceOrderItem = {
      ...current,
      itemType: input.itemType ?? current.itemType,
      description: input.description ?? current.description,
      unitValue: input.unitValue ?? current.unitValue,
      quantity: input.quantity ?? current.quantity,
      notes: input.notes !== undefined ? input.notes : current.notes,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.items.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined> {
    const current = await this.findById(tenantId, itemId);
    if (!current) return undefined;

    const now = new Date();
    const deleted: MaintenanceOrderItem = { ...current, isActive: false, deletedAt: now, updatedAt: now };
    this.items.set(deleted.id, deleted);
    return deleted;
  }

  reset(): void {
    this.items.clear();
  }

  private activeItems(): MaintenanceOrderItem[] {
    return [...this.items.values()]
      .filter((item) => item.deletedAt === undefined)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }
}
