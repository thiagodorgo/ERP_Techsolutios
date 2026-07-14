import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
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
  WorkOrderPriority,
  WorkOrderStatus,
} from "./work-order.types.js";
import { formatWorkOrderCode, type CreateWorkOrderEventInput, type WorkOrderRepository } from "./work-order.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaWorkOrderRepository implements WorkOrderRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async nextCode(tenantId: string): Promise<string> {
    let sequence = await this.client.workOrder.count({
      where: {
        tenant_id: tenantId,
      },
    });
    let code = "";

    do {
      sequence += 1;
      code = formatWorkOrderCode(sequence);
    } while (
      await this.client.workOrder.findUnique({
        where: {
          tenant_id_code: {
            tenant_id: tenantId,
            code,
          },
        },
        select: {
          id: true,
        },
      })
    );

    return code;
  }

  async create(input: CreateWorkOrderInput): Promise<WorkOrder> {
    const workOrder = await this.client.workOrder.create({
      data: {
        tenant_id: input.tenantId,
        code: input.code,
        title: input.title,
        description: input.description ?? null,
        customer_name: input.customerName ?? null,
        customer_document: input.customerDocument ?? null,
        customer_phone: input.customerPhone ?? null,
        service_address: input.serviceAddress ?? null,
        service_city: input.serviceCity ?? null,
        service_state: input.serviceState ?? null,
        service_zip_code: input.serviceZipCode ?? null,
        service_latitude: input.serviceLatitude ?? null,
        service_longitude: input.serviceLongitude ?? null,
        // Ω3F-2a — destino + campos dinâmicos por tipo (aditivos/nullable).
        destination_address: input.destinationAddress ?? null,
        destination_city: input.destinationCity ?? null,
        destination_state: input.destinationState ?? null,
        destination_zip_code: input.destinationZipCode ?? null,
        destination_latitude: input.destinationLatitude ?? null,
        destination_longitude: input.destinationLongitude ?? null,
        service_details: input.serviceDetails === undefined ? Prisma.DbNull : (input.serviceDetails as Prisma.InputJsonObject),
        priority: input.priority,
        status: input.status ?? "open",
        assigned_operator_id: input.assignedOperatorId ?? null,
        assigned_user_id: input.assignedUserId ?? null,
        checklist_id: input.checklistId ?? null,
        customer_id: input.customerId ?? null,
        vehicle_id: input.vehicleId ?? null,
        team_id: input.teamId ?? null,
        service_catalog_id: input.serviceCatalogId ?? null,
        scheduled_for: input.scheduledFor ?? null,
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? null,
      },
    });

    return mapWorkOrderRecord(workOrder);
  }

  async list(input: ListWorkOrdersInput): Promise<ListWorkOrdersResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.workOrder.findMany({
        where,
        orderBy: [
          { created_at: "desc" },
          { code: "desc" },
        ],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.workOrder.count({ where }),
    ]);

    return {
      items: items.map(mapWorkOrderRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, workOrderId: string): Promise<WorkOrder | undefined> {
    const workOrder = await this.client.workOrder.findFirst({
      where: {
        tenant_id: tenantId,
        id: workOrderId,
      },
    });

    return workOrder ? mapWorkOrderRecord(workOrder) : undefined;
  }

  async update(input: UpdateWorkOrderInput): Promise<WorkOrder | undefined> {
    const updated = await this.client.workOrder.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.workOrderId,
      },
      data: compactRecord({
        title: input.title,
        description: nullable(input.description),
        customer_name: nullable(input.customerName),
        customer_document: nullable(input.customerDocument),
        customer_phone: nullable(input.customerPhone),
        service_address: nullable(input.serviceAddress),
        service_city: nullable(input.serviceCity),
        service_state: nullable(input.serviceState),
        service_zip_code: nullable(input.serviceZipCode),
        service_latitude: nullable(input.serviceLatitude),
        service_longitude: nullable(input.serviceLongitude),
        // Ω3F-2a — destino + campos dinâmicos; só tocados quando presentes no corpo.
        destination_address: nullable(input.destinationAddress),
        destination_city: nullable(input.destinationCity),
        destination_state: nullable(input.destinationState),
        destination_zip_code: nullable(input.destinationZipCode),
        destination_latitude: nullable(input.destinationLatitude),
        destination_longitude: nullable(input.destinationLongitude),
        service_details: input.serviceDetails === undefined ? undefined : (input.serviceDetails as Prisma.InputJsonObject),
        priority: input.priority,
        checklist_id: nullable(input.checklistId),
        scheduled_for: nullable(input.scheduledFor),
        updated_by: nullable(input.updatedBy),
      }),
    });

    return updated[0] ? mapWorkOrderRecord(updated[0]) : undefined;
  }

  async updateGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined> {
    // R10 — where tenant_id+id; RETURNING vazio (inexistente/cross-tenant) → undefined (serviço → 404).
    const updated = await this.client.workOrder.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.workOrderId,
      },
      data: {
        service_latitude: input.latitude,
        service_longitude: input.longitude,
        service_geocoded_at: input.geocodedAt,
        service_geocode_source: input.source,
        updated_by: input.actorUserId ?? null,
      },
    });

    return updated[0] ? mapWorkOrderRecord(updated[0]) : undefined;
  }

  // Ω3-c — grava (sobrescreve) o snapshot JSON na OS. where tenant_id+id; RETURNING vazio → undefined.
  async freezeChecklistSnapshot(input: FreezeChecklistSnapshotInput): Promise<WorkOrder | undefined> {
    const updated = await this.client.workOrder.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.workOrderId },
      data: {
        checklist_snapshot: input.checklistSnapshot === null ? Prisma.DbNull : (input.checklistSnapshot as Prisma.InputJsonValue),
        updated_by: input.actorUserId ?? null,
      },
    });

    return updated[0] ? mapWorkOrderRecord(updated[0]) : undefined;
  }

  async changeStatus(input: ChangeWorkOrderStatusInput): Promise<WorkOrder | undefined> {
    const now = new Date();
    const updated = await this.client.workOrder.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.workOrderId,
      },
      data: compactRecord({
        status: input.status,
        cancellation_reason: input.status === "cancelled" ? input.cancellationReason ?? input.message : undefined,
        arrived_at: input.status === "on_site" ? now : undefined,
        started_at: input.status === "in_progress" ? now : undefined,
        completed_at: input.status === "completed" ? now : undefined,
        cancelled_at: input.status === "cancelled" ? now : undefined,
        updated_by: input.actorUserId,
      }),
    });

    return updated[0] ? mapWorkOrderRecord(updated[0]) : undefined;
  }

  async assign(input: AssignWorkOrderInput): Promise<{ readonly workOrder: WorkOrder; readonly assignment: WorkOrderAssignment } | undefined> {
    const result = await this.client.$transaction(async (tx) => {
      const updated = await tx.workOrder.updateManyAndReturn({
        where: {
          tenant_id: input.tenantId,
          id: input.workOrderId,
        },
        data: {
          assigned_operator_id: input.operatorId,
          assigned_user_id: input.userId ?? null,
          // D1 — set the viatura/equipe FKs only when provided; otherwise untouched.
          ...(input.vehicleId !== undefined ? { vehicle_id: input.vehicleId } : {}),
          ...(input.teamId !== undefined ? { team_id: input.teamId } : {}),
          status: "assigned",
          updated_by: input.assignedBy ?? null,
        },
      });
      if (!updated[0]) return undefined;
      const assignment = await tx.workOrderAssignment.create({
        data: {
          tenant_id: input.tenantId,
          work_order_id: input.workOrderId,
          operator_id: input.operatorId,
          user_id: input.userId ?? null,
          assigned_by: input.assignedBy ?? null,
          metadata: {},
        },
      });

      return {
        workOrder: mapWorkOrderRecord(updated[0]),
        assignment: mapWorkOrderAssignmentRecord(assignment),
      };
    });

    return result;
  }

  async createEvent(input: CreateWorkOrderEventInput): Promise<WorkOrderEvent> {
    const event = await this.client.workOrderEvent.create({
      data: {
        tenant_id: input.tenantId,
        work_order_id: input.workOrderId,
        event_type: input.eventType,
        from_status: input.fromStatus ?? null,
        to_status: input.toStatus ?? null,
        actor_user_id: input.actorUserId ?? null,
        message: input.message,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapWorkOrderEventRecord(event);
  }

  async listTimeline(tenantId: string, workOrderId: string): Promise<readonly WorkOrderEvent[]> {
    const events = await this.client.workOrderEvent.findMany({
      where: {
        tenant_id: tenantId,
        work_order_id: workOrderId,
      },
      orderBy: [
        { created_at: "asc" },
      ],
    });

    return events.map(mapWorkOrderEventRecord);
  }
}

export class RlsPrismaWorkOrderRepository implements WorkOrderRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  nextCode(tenantId: string): Promise<string> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderRepository(tx).nextCode(tenantId));
  }

  create(input: CreateWorkOrderInput): Promise<WorkOrder> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).create(input));
  }

  list(input: ListWorkOrdersInput): Promise<ListWorkOrdersResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).list(input));
  }

  findById(tenantId: string, workOrderId: string): Promise<WorkOrder | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderRepository(tx).findById(tenantId, workOrderId));
  }

  update(input: UpdateWorkOrderInput): Promise<WorkOrder | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).update(input));
  }

  updateGeocode(input: UpdateWorkOrderGeocodeInput): Promise<WorkOrder | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).updateGeocode(input));
  }

  freezeChecklistSnapshot(input: FreezeChecklistSnapshotInput): Promise<WorkOrder | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).freezeChecklistSnapshot(input));
  }

  changeStatus(input: ChangeWorkOrderStatusInput): Promise<WorkOrder | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).changeStatus(input));
  }

  assign(input: AssignWorkOrderInput): Promise<{ readonly workOrder: WorkOrder; readonly assignment: WorkOrderAssignment } | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).assign(input));
  }

  createEvent(input: CreateWorkOrderEventInput): Promise<WorkOrderEvent> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderRepository(tx).createEvent(input));
  }

  listTimeline(tenantId: string, workOrderId: string): Promise<readonly WorkOrderEvent[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderRepository(tx).listTimeline(tenantId, workOrderId));
  }
}

export async function createPrismaWorkOrderRepository(): Promise<RlsPrismaWorkOrderRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaWorkOrderRepository(prisma);
}

function buildWhere(input: ListWorkOrdersInput): Prisma.WorkOrderWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.assignedOperatorId ? { assigned_operator_id: input.assignedOperatorId } : {}),
    ...(input.assignedUserId ? { assigned_user_id: input.assignedUserId } : {}),
    ...(input.from || input.to
      ? {
          created_at: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
    ...(input.search
      ? {
          OR: [
            { code: { contains: input.search, mode: "insensitive" } },
            { title: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
            { customer_name: { contains: input.search, mode: "insensitive" } },
            { customer_document: { contains: input.search, mode: "insensitive" } },
            { customer_phone: { contains: input.search, mode: "insensitive" } },
            { service_address: { contains: input.search, mode: "insensitive" } },
            { service_city: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapWorkOrderRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string | null;
  readonly customer_name: string | null;
  readonly customer_document: string | null;
  readonly customer_phone: string | null;
  readonly service_address: string | null;
  readonly service_city: string | null;
  readonly service_state: string | null;
  readonly service_zip_code: string | null;
  readonly service_latitude: unknown;
  readonly service_longitude: unknown;
  readonly service_geocoded_at: Date | null;
  readonly service_geocode_source: string | null;
  readonly destination_address: string | null;
  readonly destination_city: string | null;
  readonly destination_state: string | null;
  readonly destination_zip_code: string | null;
  readonly destination_latitude: unknown;
  readonly destination_longitude: unknown;
  readonly destination_geocoded_at: Date | null;
  readonly destination_geocode_source: string | null;
  readonly service_details: Prisma.JsonValue | null;
  readonly priority: string;
  readonly status: string;
  readonly assigned_operator_id: string | null;
  readonly assigned_user_id: string | null;
  readonly checklist_id: string | null;
  readonly checklist_snapshot: Prisma.JsonValue | null;
  readonly customer_id: string | null;
  readonly vehicle_id: string | null;
  readonly team_id: string | null;
  readonly service_catalog_id: string | null;
  readonly scheduled_for: Date | null;
  readonly started_at: Date | null;
  readonly arrived_at: Date | null;
  readonly completed_at: Date | null;
  readonly cancelled_at: Date | null;
  readonly cancellation_reason: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): WorkOrder {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    code: record.code,
    title: record.title,
    description: record.description ?? undefined,
    customerName: record.customer_name ?? undefined,
    customerDocument: record.customer_document ?? undefined,
    customerPhone: record.customer_phone ?? undefined,
    serviceAddress: record.service_address ?? undefined,
    serviceCity: record.service_city ?? undefined,
    serviceState: record.service_state ?? undefined,
    serviceZipCode: record.service_zip_code ?? undefined,
    serviceLatitude: decimalToNumber(record.service_latitude),
    serviceLongitude: decimalToNumber(record.service_longitude),
    serviceGeocodedAt: record.service_geocoded_at ?? undefined,
    serviceGeocodeSource: record.service_geocode_source ?? undefined,
    destinationAddress: record.destination_address ?? undefined,
    destinationCity: record.destination_city ?? undefined,
    destinationState: record.destination_state ?? undefined,
    destinationZipCode: record.destination_zip_code ?? undefined,
    destinationLatitude: decimalToNumber(record.destination_latitude),
    destinationLongitude: decimalToNumber(record.destination_longitude),
    destinationGeocodedAt: record.destination_geocoded_at ?? undefined,
    destinationGeocodeSource: record.destination_geocode_source ?? undefined,
    serviceDetails: (record.service_details as Record<string, unknown> | null) ?? undefined,
    priority: record.priority as WorkOrderPriority,
    status: record.status as WorkOrderStatus,
    assignedOperatorId: record.assigned_operator_id ?? undefined,
    assignedUserId: record.assigned_user_id ?? undefined,
    checklistId: record.checklist_id ?? undefined,
    checklistSnapshot: (record.checklist_snapshot as Record<string, unknown> | null) ?? null,
    customerId: record.customer_id ?? undefined,
    vehicleId: record.vehicle_id ?? undefined,
    teamId: record.team_id ?? undefined,
    serviceCatalogId: record.service_catalog_id ?? undefined,
    scheduledFor: record.scheduled_for ?? undefined,
    startedAt: record.started_at ?? undefined,
    arrivedAt: record.arrived_at ?? undefined,
    completedAt: record.completed_at ?? undefined,
    cancelledAt: record.cancelled_at ?? undefined,
    cancellationReason: record.cancellation_reason ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapWorkOrderEventRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly work_order_id: string;
  readonly event_type: string;
  readonly from_status: string | null;
  readonly to_status: string | null;
  readonly actor_user_id: string | null;
  readonly message: string;
  readonly metadata: unknown;
  readonly created_at: Date;
}): WorkOrderEvent {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workOrderId: record.work_order_id,
    eventType: record.event_type as WorkOrderEventType,
    fromStatus: (record.from_status as WorkOrderStatus | null) ?? undefined,
    toStatus: (record.to_status as WorkOrderStatus | null) ?? undefined,
    actorUserId: record.actor_user_id ?? undefined,
    message: record.message,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
  };
}

function mapWorkOrderAssignmentRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly work_order_id: string;
  readonly operator_id: string;
  readonly user_id: string | null;
  readonly status: string;
  readonly assigned_by: string | null;
  readonly assigned_at: Date;
  readonly accepted_at: Date | null;
  readonly rejected_at: Date | null;
  readonly completed_at: Date | null;
  readonly metadata: unknown;
}): WorkOrderAssignment {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workOrderId: record.work_order_id,
    operatorId: record.operator_id,
    userId: record.user_id ?? undefined,
    status: record.status as WorkOrderAssignment["status"],
    assignedBy: record.assigned_by ?? undefined,
    assignedAt: record.assigned_at,
    acceptedAt: record.accepted_at ?? undefined,
    rejectedAt: record.rejected_at ?? undefined,
    completedAt: record.completed_at ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
  };
}

function decimalToNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
