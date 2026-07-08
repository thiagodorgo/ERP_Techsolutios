import { randomUUID } from "node:crypto";

import type {
  CreateMaintenanceOrderInput,
  ListMaintenanceOrdersInput,
  ListMaintenanceOrdersResult,
  MaintenanceOrder,
  UpdateMaintenanceOrderInput,
} from "./maintenance-order.types.js";

export interface MaintenanceOrderRepository {
  create(input: CreateMaintenanceOrderInput): Promise<MaintenanceOrder>;
  list(input: ListMaintenanceOrdersInput): Promise<ListMaintenanceOrdersResult>;
  findById(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrder | undefined>;
  update(input: UpdateMaintenanceOrderInput): Promise<MaintenanceOrder | undefined>;
  /** R1.2 — highest odometer already recorded for a vehicle in maintenance_orders. */
  maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined>;
  /** R2.3 — true when the vehicle has an ACTIVE maintenance order in status `em_execucao`. */
  hasActiveMaintenance(tenantId: string, vehicleId: string): Promise<boolean>;
  /** R2.2 — `preventiva` orders still `agendada` and due within [now, until]. */
  listDuePreventive(tenantId: string, now: Date, until: Date): Promise<MaintenanceOrder[]>;
  reset?(): void;
}

export class InMemoryMaintenanceOrderRepository implements MaintenanceOrderRepository {
  private readonly orders = new Map<string, MaintenanceOrder>();

  async create(input: CreateMaintenanceOrderInput): Promise<MaintenanceOrder> {
    const now = new Date();
    const order: MaintenanceOrder = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(order.id, order);

    return order;
  }

  async list(input: ListMaintenanceOrdersInput): Promise<ListMaintenanceOrdersResult> {
    const filtered = this.sortedOrders()
      .filter((order) => order.tenantId === input.tenantId)
      .filter((order) => input.vehicleId === undefined || order.vehicleId === input.vehicleId)
      .filter((order) => input.type === undefined || order.type === input.type)
      .filter((order) => input.status === undefined || order.status === input.status)
      .filter((order) => input.isActive === undefined || order.isActive === input.isActive)
      .filter((order) => matchesScheduledFrom(order, input.scheduledFrom))
      .filter((order) => matchesScheduledTo(order, input.scheduledTo))
      .filter((order) => matchesSearch(order, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrder | undefined> {
    const order = this.orders.get(maintenanceOrderId);
    return order?.tenantId === tenantId ? order : undefined;
  }

  async update(input: UpdateMaintenanceOrderInput): Promise<MaintenanceOrder | undefined> {
    const current = await this.findById(input.tenantId, input.maintenanceOrderId);
    if (!current) return undefined;

    const updated: MaintenanceOrder = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.orders.set(updated.id, updated);

    return updated;
  }

  async maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined> {
    const odometers = this.vehicleOrders(tenantId, vehicleId)
      .map((order) => order.odometer)
      .filter((odometer): odometer is number => odometer !== undefined);

    return odometers.length > 0 ? Math.max(...odometers) : undefined;
  }

  async hasActiveMaintenance(tenantId: string, vehicleId: string): Promise<boolean> {
    return this.vehicleOrders(tenantId, vehicleId).some(
      (order) => order.isActive && order.status === "em_execucao",
    );
  }

  async listDuePreventive(tenantId: string, now: Date, until: Date): Promise<MaintenanceOrder[]> {
    return this.sortedOrders().filter(
      (order) =>
        order.tenantId === tenantId &&
        order.isActive &&
        order.type === "preventiva" &&
        order.status === "agendada" &&
        order.scheduledFor !== undefined &&
        order.scheduledFor.getTime() >= now.getTime() &&
        order.scheduledFor.getTime() <= until.getTime(),
    );
  }

  reset(): void {
    this.orders.clear();
  }

  private vehicleOrders(tenantId: string, vehicleId: string): MaintenanceOrder[] {
    return [...this.orders.values()].filter(
      (order) => order.tenantId === tenantId && order.vehicleId === vehicleId,
    );
  }

  private sortedOrders(): MaintenanceOrder[] {
    return [...this.orders.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }
}

function matchesScheduledFrom(order: MaintenanceOrder, from: Date | undefined): boolean {
  if (!from) return true;
  return order.scheduledFor !== undefined && order.scheduledFor.getTime() >= from.getTime();
}

function matchesScheduledTo(order: MaintenanceOrder, to: Date | undefined): boolean {
  if (!to) return true;
  return order.scheduledFor !== undefined && order.scheduledFor.getTime() <= to.getTime();
}

function matchesSearch(order: MaintenanceOrder, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [order.description, order.supplier]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
