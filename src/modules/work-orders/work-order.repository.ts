import { randomUUID } from "node:crypto";

import type {
  AssignWorkOrderInput,
  ChangeWorkOrderStatusInput,
  CreateWorkOrderInput,
  ListWorkOrdersInput,
  ListWorkOrdersResult,
  UpdateWorkOrderGeocodeInput,
  FreezeChecklistSnapshotInput,
  UpdateWorkOrderInput,
  WorkOrder,
  WorkOrderAssignment,
  WorkOrderEvent,
  WorkOrderEventType,
  WorkOrderStatus,
} from "./work-order.types.js";
import { WorkOrderError } from "./work-order.types.js";

export interface WorkOrderRepository {
  nextCode(tenantId: string): Promise<string>;
  create(input: CreateWorkOrderInput): Promise<WorkOrder>;
  list(input: ListWorkOrdersInput): Promise<ListWorkOrdersResult>;
  findById(tenantId: string, workOrderId: string): Promise<WorkOrder | undefined>;
  // Ω3F-6 (D-Ω3F-6-DUPLICATE) — pre-check da idempotência do duplicate. TENANT-SCOPED: a chave do
  // cliente só colide dentro da própria organização (o unique parcial no banco inclui tenant_id).
  // work_orders não tem delete lógico, então não há recorte por deleted_at (ao contrário dos vizinhos).
  findByClientActionId(tenantId: string, clientActionId: string): Promise<WorkOrder | undefined>;
  update(input: UpdateWorkOrderInput): Promise<WorkOrder | undefined>;
  updateGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined>;
  freezeChecklistSnapshot(input: FreezeChecklistSnapshotInput): Promise<WorkOrder | undefined>;
  changeStatus(input: ChangeWorkOrderStatusInput): Promise<WorkOrder | undefined>;
  assign(input: AssignWorkOrderInput): Promise<{ readonly workOrder: WorkOrder; readonly assignment: WorkOrderAssignment } | undefined>;
  createEvent(input: CreateWorkOrderEventInput): Promise<WorkOrderEvent>;
  listTimeline(tenantId: string, workOrderId: string): Promise<readonly WorkOrderEvent[]>;
  reset?(): void;
}

export type CreateWorkOrderEventInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly eventType: WorkOrderEventType;
  readonly fromStatus?: WorkOrderStatus;
  readonly toStatus?: WorkOrderStatus;
  readonly actorUserId?: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
};

export class InMemoryWorkOrderRepository implements WorkOrderRepository {
  private readonly workOrders = new Map<string, WorkOrder>();
  private readonly events = new Map<string, WorkOrderEvent>();
  private readonly assignments = new Map<string, WorkOrderAssignment>();

  async nextCode(tenantId: string): Promise<string> {
    let sequence = [...this.workOrders.values()].filter((workOrder) => workOrder.tenantId === tenantId).length + 1;
    let code = formatWorkOrderCode(sequence);

    while ([...this.workOrders.values()].some((workOrder) => workOrder.tenantId === tenantId && workOrder.code === code)) {
      sequence += 1;
      code = formatWorkOrderCode(sequence);
    }

    return code;
  }

  async create(input: CreateWorkOrderInput): Promise<WorkOrder> {
    // Ω3F-6 — espelha o unique PARCIAL do Postgres: replay do mesmo client_action_id no tenant → 409.
    // Rede extra ao pre-check do serviço (aqui é o "banco" do modo memory).
    if (input.clientActionId && (await this.findByClientActionId(input.tenantId, input.clientActionId))) {
      throw duplicateWorkOrderError();
    }

    const now = new Date();
    const workOrder: WorkOrder = {
      ...input,
      id: randomUUID(),
      status: input.status ?? "open",
      createdAt: now,
      updatedAt: now,
    };

    this.workOrders.set(workOrder.id, workOrder);

    return workOrder;
  }

  async findByClientActionId(tenantId: string, clientActionId: string): Promise<WorkOrder | undefined> {
    return [...this.workOrders.values()].find(
      (workOrder) => workOrder.tenantId === tenantId && workOrder.clientActionId === clientActionId,
    );
  }

  async list(input: ListWorkOrdersInput): Promise<ListWorkOrdersResult> {
    const filtered = this.sortedWorkOrders()
      .filter((workOrder) => workOrder.tenantId === input.tenantId)
      .filter((workOrder) => !input.status || workOrder.status === input.status)
      .filter((workOrder) => !input.priority || workOrder.priority === input.priority)
      .filter((workOrder) => !input.assignedOperatorId || workOrder.assignedOperatorId === input.assignedOperatorId)
      .filter((workOrder) => !input.assignedUserId || workOrder.assignedUserId === input.assignedUserId)
      .filter((workOrder) => !input.from || workOrder.createdAt >= input.from)
      .filter((workOrder) => !input.to || workOrder.createdAt <= input.to)
      .filter((workOrder) => matchesSearch(workOrder, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, workOrderId: string): Promise<WorkOrder | undefined> {
    const workOrder = this.workOrders.get(workOrderId);
    return workOrder?.tenantId === tenantId ? workOrder : undefined;
  }

  async update(input: UpdateWorkOrderInput): Promise<WorkOrder | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const updated: WorkOrder = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  async updateGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined> {
    // R10 — tenant-scoped: OS inexistente ou de outro tenant retorna undefined (serviço mapeia 404).
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const updated: WorkOrder = {
      ...current,
      serviceLatitude: input.latitude,
      serviceLongitude: input.longitude,
      serviceGeocodedAt: input.geocodedAt,
      serviceGeocodeSource: input.source,
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  // Ω3-c — congela (idempotente/sobrescreve) o snapshot na OS. tenant-scoped (undefined → 404 no serviço).
  async freezeChecklistSnapshot(input: FreezeChecklistSnapshotInput): Promise<WorkOrder | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;

    const updated: WorkOrder = {
      ...current,
      checklistSnapshot: input.checklistSnapshot,
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  async changeStatus(input: ChangeWorkOrderStatusInput): Promise<WorkOrder | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;
    const now = new Date();
    const updated: WorkOrder = {
      ...current,
      status: input.status,
      cancellationReason: input.status === "cancelled" ? input.cancellationReason : current.cancellationReason,
      // Ω3F-6 — só grava a decisão quando ela VEM (cancel). Paridade exata com o compactRecord do
      // Prisma: o endpoint de status legado (sem decisão) cancela SEM carimbar a coluna, em vez de
      // sobrescrevê-la com undefined.
      ...(input.status === "cancelled" && input.financialCancellationDecision !== undefined
        ? { financialCancellationDecision: input.financialCancellationDecision }
        : {}),
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: now,
      arrivedAt: input.status === "on_site" ? now : current.arrivedAt,
      startedAt: input.status === "in_progress" && !current.startedAt ? now : current.startedAt,
      completedAt: input.status === "completed" ? now : current.completedAt,
      cancelledAt: input.status === "cancelled" ? now : current.cancelledAt,
    };
    this.workOrders.set(updated.id, updated);

    return updated;
  }

  async assign(input: AssignWorkOrderInput): Promise<{ readonly workOrder: WorkOrder; readonly assignment: WorkOrderAssignment } | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId);
    if (!current) return undefined;
    const now = new Date();
    const workOrder: WorkOrder = {
      ...current,
      assignedOperatorId: input.operatorId,
      assignedUserId: input.userId,
      // D1 — set the viatura/equipe FKs only when provided; otherwise keep existing.
      ...(input.vehicleId !== undefined ? { vehicleId: input.vehicleId } : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
      status: "assigned",
      updatedBy: input.assignedBy ?? current.updatedBy,
      updatedAt: now,
    };
    const assignment: WorkOrderAssignment = {
      id: randomUUID(),
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      operatorId: input.operatorId,
      userId: input.userId,
      status: "assigned",
      assignedBy: input.assignedBy,
      assignedAt: now,
      metadata: {},
    };
    this.workOrders.set(workOrder.id, workOrder);
    this.assignments.set(assignment.id, assignment);

    return { workOrder, assignment };
  }

  async createEvent(input: CreateWorkOrderEventInput): Promise<WorkOrderEvent> {
    const event: WorkOrderEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      eventType: input.eventType,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      message: input.message,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    };
    this.events.set(event.id, event);

    return event;
  }

  async listTimeline(tenantId: string, workOrderId: string): Promise<readonly WorkOrderEvent[]> {
    return [...this.events.values()]
      .filter((event) => event.tenantId === tenantId && event.workOrderId === workOrderId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  reset(): void {
    this.workOrders.clear();
    this.events.clear();
    this.assignments.clear();
  }

  private sortedWorkOrders(): WorkOrder[] {
    return [...this.workOrders.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

export function formatWorkOrderCode(sequence: number): string {
  return `OS-${String(sequence).padStart(6, "0")}`;
}

// Ω3F-6 (D-Ω3F-6-DUPLICATE) — replay do duplicate (mesmo client_action_id no tenant) → 409. Emitido
// pelo pre-check do serviço E pela violação do unique parcial (P2002) traduzida no Prisma.
export function duplicateWorkOrderError(): WorkOrderError {
  return new WorkOrderError(
    409,
    "WORK_ORDER_CONFLICT",
    "duplicate_work_order",
    "A work order with this client_action_id already exists for this organization.",
  );
}

function matchesSearch(workOrder: WorkOrder, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [
    workOrder.code,
    workOrder.title,
    workOrder.description,
    workOrder.customerName,
    workOrder.customerDocument,
    workOrder.customerPhone,
    workOrder.serviceAddress,
    workOrder.serviceCity,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
