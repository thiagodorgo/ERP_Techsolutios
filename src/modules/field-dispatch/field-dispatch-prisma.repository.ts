import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  ChangeFieldDispatchStatusInput,
  CreateFieldDispatchInput,
  FieldDispatch,
  FieldDispatchEvent,
  FieldDispatchEventType,
  FieldDispatchStatus,
  ListFieldDispatchesInput,
  ListFieldDispatchesResult,
  ReassignFieldDispatchInput,
} from "./field-dispatch.types.js";
import type { CreateFieldDispatchEventInput, FieldDispatchRepository } from "./field-dispatch.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaFieldDispatchRepository implements FieldDispatchRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFieldDispatchInput): Promise<FieldDispatch> {
    const dispatch = await this.client.fieldDispatch.create({
      data: {
        tenant_id: input.tenantId,
        work_order_id: input.workOrderId,
        operator_user_id: input.operatorUserId,
        status: input.status ?? "assigned",
        observation: input.observation ?? null,
        reason: input.reason ?? null,
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? null,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapFieldDispatchRecord(dispatch);
  }

  async list(input: ListFieldDispatchesInput): Promise<ListFieldDispatchesResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.fieldDispatch.findMany({
        where,
        orderBy: [
          { created_at: "desc" },
          { id: "desc" },
        ],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.fieldDispatch.count({ where }),
    ]);

    return {
      items: items.map(mapFieldDispatchRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, dispatchId: string): Promise<FieldDispatch | undefined> {
    const dispatch = await this.client.fieldDispatch.findFirst({
      where: {
        tenant_id: tenantId,
        id: dispatchId,
      },
    });

    return dispatch ? mapFieldDispatchRecord(dispatch) : undefined;
  }

  async changeStatus(input: ChangeFieldDispatchStatusInput): Promise<FieldDispatch | undefined> {
    const now = new Date();
    const updated = await this.client.fieldDispatch.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.dispatchId,
      },
      data: compactRecord({
        status: input.status,
        reason: input.reason,
        observation: input.observation,
        updated_by: input.actorUserId,
        accepted_at: input.status === "accepted" ? now : undefined,
        on_route_at: input.status === "on_route" ? now : undefined,
        arrived_at: input.status === "arrived" ? now : undefined,
        in_service_at: input.status === "in_service" ? now : undefined,
        completed_at: input.status === "completed" ? now : undefined,
        cancelled_at: input.status === "cancelled" ? now : undefined,
        failed_at: input.status === "failed" ? now : undefined,
      }),
    });

    return updated[0] ? mapFieldDispatchRecord(updated[0]) : undefined;
  }

  async reassign(input: ReassignFieldDispatchInput): Promise<FieldDispatch | undefined> {
    const updated = await this.client.fieldDispatch.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.dispatchId,
      },
      data: compactRecord({
        operator_user_id: input.operatorUserId,
        status: "reassigned",
        reason: input.reason,
        observation: input.observation,
        updated_by: input.actorUserId,
      }),
    });

    return updated[0] ? mapFieldDispatchRecord(updated[0]) : undefined;
  }

  async createEvent(input: CreateFieldDispatchEventInput): Promise<FieldDispatchEvent> {
    const event = await this.client.fieldDispatchEvent.create({
      data: {
        tenant_id: input.tenantId,
        dispatch_id: input.dispatchId,
        work_order_id: input.workOrderId,
        event_type: input.eventType,
        from_status: input.fromStatus ?? null,
        to_status: input.toStatus ?? null,
        actor_user_id: input.actorUserId ?? null,
        message: input.message,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapFieldDispatchEventRecord(event);
  }

  async listTimeline(tenantId: string, dispatchId: string): Promise<readonly FieldDispatchEvent[]> {
    const events = await this.client.fieldDispatchEvent.findMany({
      where: {
        tenant_id: tenantId,
        dispatch_id: dispatchId,
      },
      orderBy: [
        { created_at: "asc" },
      ],
    });

    return events.map(mapFieldDispatchEventRecord);
  }
}

export class RlsPrismaFieldDispatchRepository implements FieldDispatchRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFieldDispatchInput): Promise<FieldDispatch> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldDispatchRepository(tx).create(input));
  }

  list(input: ListFieldDispatchesInput): Promise<ListFieldDispatchesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldDispatchRepository(tx).list(input));
  }

  findById(tenantId: string, dispatchId: string): Promise<FieldDispatch | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFieldDispatchRepository(tx).findById(tenantId, dispatchId));
  }

  changeStatus(input: ChangeFieldDispatchStatusInput): Promise<FieldDispatch | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldDispatchRepository(tx).changeStatus(input));
  }

  reassign(input: ReassignFieldDispatchInput): Promise<FieldDispatch | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldDispatchRepository(tx).reassign(input));
  }

  createEvent(input: CreateFieldDispatchEventInput): Promise<FieldDispatchEvent> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldDispatchRepository(tx).createEvent(input));
  }

  listTimeline(tenantId: string, dispatchId: string): Promise<readonly FieldDispatchEvent[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFieldDispatchRepository(tx).listTimeline(tenantId, dispatchId));
  }
}

export async function createPrismaFieldDispatchRepository(): Promise<RlsPrismaFieldDispatchRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaFieldDispatchRepository(prisma);
}

function buildWhere(input: ListFieldDispatchesInput): Prisma.FieldDispatchWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.workOrderId ? { work_order_id: input.workOrderId } : {}),
    ...(input.operatorUserId ? { operator_user_id: input.operatorUserId } : {}),
    ...(input.search
      ? {
          OR: [
            { observation: { contains: input.search, mode: "insensitive" } },
            { reason: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapFieldDispatchRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly work_order_id: string;
  readonly operator_user_id: string;
  readonly status: string;
  readonly observation: string | null;
  readonly reason: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly accepted_at: Date | null;
  readonly on_route_at: Date | null;
  readonly arrived_at: Date | null;
  readonly in_service_at: Date | null;
  readonly completed_at: Date | null;
  readonly cancelled_at: Date | null;
  readonly failed_at: Date | null;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): FieldDispatch {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workOrderId: record.work_order_id,
    operatorUserId: record.operator_user_id,
    status: record.status as FieldDispatchStatus,
    observation: record.observation ?? undefined,
    reason: record.reason ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    acceptedAt: record.accepted_at ?? undefined,
    onRouteAt: record.on_route_at ?? undefined,
    arrivedAt: record.arrived_at ?? undefined,
    inServiceAt: record.in_service_at ?? undefined,
    completedAt: record.completed_at ?? undefined,
    cancelledAt: record.cancelled_at ?? undefined,
    failedAt: record.failed_at ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapFieldDispatchEventRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly dispatch_id: string;
  readonly work_order_id: string;
  readonly event_type: string;
  readonly from_status: string | null;
  readonly to_status: string | null;
  readonly actor_user_id: string | null;
  readonly message: string;
  readonly metadata: unknown;
  readonly created_at: Date;
}): FieldDispatchEvent {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    dispatchId: record.dispatch_id,
    workOrderId: record.work_order_id,
    eventType: record.event_type as FieldDispatchEventType,
    fromStatus: (record.from_status as FieldDispatchStatus | null) ?? undefined,
    toStatus: (record.to_status as FieldDispatchStatus | null) ?? undefined,
    actorUserId: record.actor_user_id ?? undefined,
    message: record.message,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
  };
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
