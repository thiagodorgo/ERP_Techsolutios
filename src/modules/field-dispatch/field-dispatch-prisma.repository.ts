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
  FindOperatorsForVehicleAtInput,
  OperatorAtFixTime,
  OperatorAtFixTimeCandidate,
  ReassignFieldDispatchInput,
} from "./field-dispatch.types.js";
import {
  classifyOperatorsAtFixTime,
  type CreateFieldDispatchEventInput,
  type FieldDispatchRepository,
} from "./field-dispatch.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// B-TRC-01 (plano do Traccar v2.1 §4.2; A2-12) — o operador da viatura no instante do fix. Recebe o `tx` da fase 2
// da ingestão (já sob o GUC da organização confirmada, com orçamento de tempo) e NÃO abre transação. Lê só os
// despachos cuja janela contém o instante: `accepted_at ≤ at` e `at` antes do primeiro entre `completed_at`,
// `cancelled_at` e `failed_at` que não for nulo. A regra de elegibilidade é `classifyOperatorsAtFixTime`.
export async function findOperatorsForVehicleAt(
  tx: Prisma.TransactionClient,
  input: FindOperatorsForVehicleAtInput,
): Promise<OperatorAtFixTime> {
  const candidates = await tx.$queryRaw<OperatorAtFixTimeCandidate[]>`
    SELECT d.operator_user_id::text AS "operatorUserId",
           d.operator_assigned_at AS "operatorAssignedAt",
           d.accepted_at AS "acceptedAt",
           wo.vehicle_assigned_at AS "vehicleAssignedAt"
      FROM field_dispatches d
      JOIN work_orders wo ON wo.tenant_id = d.tenant_id AND wo.id = d.work_order_id
     WHERE d.tenant_id = ${input.tenantId}::uuid
       AND wo.vehicle_id = ${input.vehicleId}::uuid
       AND (wo.vehicle_assigned_at IS NULL OR wo.vehicle_assigned_at <= ${input.at})
       AND d.accepted_at IS NOT NULL
       AND d.accepted_at <= ${input.at}
       AND (LEAST(d.completed_at, d.cancelled_at, d.failed_at) IS NULL
            OR ${input.at} < LEAST(d.completed_at, d.cancelled_at, d.failed_at))`;

  return classifyOperatorsAtFixTime(candidates);
}

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
