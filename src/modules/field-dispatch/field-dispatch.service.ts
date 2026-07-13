import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { WorkOrderError } from "../work-orders/work-order.types.js";
import {
  createDefaultWorkOrderService,
  createMemoryWorkOrderService,
  type WorkOrderService,
} from "../work-orders/work-order.service.js";
import {
  InMemoryFieldDispatchRepository,
  type FieldDispatchRepository,
} from "./field-dispatch.repository.js";
import type {
  FieldDispatch,
  FieldDispatchActorContext,
  FieldDispatchEvent,
  FieldDispatchStatus,
  ListFieldDispatchesInput,
  ListFieldDispatchesResult,
} from "./field-dispatch.types.js";
import { FIELD_DISPATCH_TARGET_ROLES, FieldDispatchError } from "./field-dispatch.types.js";
import {
  assertNonTerminalStatus,
  assertStatusTransition,
  optionalString,
  parseFieldDispatchStatus,
  parseInitialFieldDispatchStatus,
  parseLimit,
  parseOffset,
  parseOptionalSearch,
  parseOptionalUuid,
  parseRequiredUuid,
} from "./field-dispatch.validators.js";

type RawRecord = Record<string, unknown>;

export class FieldDispatchService {
  constructor(
    private readonly repository: FieldDispatchRepository,
    private readonly workOrderService: WorkOrderService,
    private readonly coreService: ICoreSaasService,
  ) {}

  async list(actor: FieldDispatchActorContext, query: RawRecord): Promise<ListFieldDispatchesResult> {
    const input: ListFieldDispatchesInput = {
      tenantId: actor.tenantId,
      status: query.status ? parseFieldDispatchStatus(query.status) : undefined,
      workOrderId: parseOptionalUuid(query.workOrderId, "workOrderId"),
      operatorUserId: parseOptionalUuid(query.operatorUserId, "operatorUserId"),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: FieldDispatchActorContext, body: RawRecord): Promise<FieldDispatch> {
    const workOrderId = parseRequiredUuid(body.workOrderId, "workOrderId");
    const operatorUserId = parseRequiredUuid(body.operatorUserId ?? body.operatorId ?? body.userId, "operatorUserId");
    const status = parseInitialFieldDispatchStatus(body.status);

    await this.assertWorkOrderBelongsToTenant(actor, workOrderId);
    await this.assertOperatorBelongsToTenant(actor.tenantId, operatorUserId);

    const dispatch = await this.repository.create({
      tenantId: actor.tenantId,
      workOrderId,
      operatorUserId,
      status,
      observation: optionalString(body.observation),
      reason: optionalString(body.reason),
      createdBy: actor.userId,
      updatedBy: actor.userId,
      metadata: {},
    });

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      dispatchId: dispatch.id,
      workOrderId: dispatch.workOrderId,
      eventType: "field_dispatch_created",
      toStatus: dispatch.status,
      actorUserId: actor.userId,
      message: "Despacho operacional criado.",
      metadata: {
        operatorUserId: dispatch.operatorUserId,
      },
    });

    await publishDomainEvent(
      "field_dispatch.created",
      {
        entity_type: "field_dispatch",
        entity_id: dispatch.id,
        work_order_id: dispatch.workOrderId,
        operator_user_id: dispatch.operatorUserId,
        status: dispatch.status,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return dispatch;
  }

  async get(actor: FieldDispatchActorContext, dispatchId: string): Promise<FieldDispatch> {
    const dispatch = await this.repository.findById(actor.tenantId, parseRequiredUuid(dispatchId, "dispatchId"));

    if (!dispatch) {
      throw new FieldDispatchError(404, "FIELD_DISPATCH_NOT_FOUND", "not_found", "Dispatch was not found.");
    }

    return dispatch;
  }

  async changeStatus(actor: FieldDispatchActorContext, dispatchId: string, body: RawRecord): Promise<FieldDispatch> {
    const current = await this.get(actor, dispatchId);
    const nextStatus = parseFieldDispatchStatus(body.status);
    const message = optionalString(body.message) ?? defaultStatusMessage(nextStatus);
    const reason = optionalString(body.reason);
    const observation = optionalString(body.observation);

    assertStatusTransition(current.status, nextStatus);
    if (nextStatus === "cancelled" && !reason) {
      throw new FieldDispatchError(400, "FIELD_DISPATCH_INVALID", "cancel_reason_required", "reason is required when cancelling a dispatch.");
    }

    const updated = await this.repository.changeStatus({
      tenantId: actor.tenantId,
      dispatchId: current.id,
      status: nextStatus,
      reason,
      observation,
      actorUserId: actor.userId,
    });

    if (!updated) {
      throw new FieldDispatchError(404, "FIELD_DISPATCH_NOT_FOUND", "not_found", "Dispatch was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      dispatchId: updated.id,
      workOrderId: updated.workOrderId,
      eventType: statusEventType(nextStatus),
      fromStatus: current.status,
      toStatus: nextStatus,
      actorUserId: actor.userId,
      message,
      metadata: {
        reason,
        observation,
      },
    });

    await publishDomainEvent(
      nextStatus === "cancelled" ? "field_dispatch.cancelled" : "field_dispatch.status_changed",
      {
        entity_type: "field_dispatch",
        entity_id: updated.id,
        work_order_id: updated.workOrderId,
        operator_user_id: updated.operatorUserId,
        from_status: current.status,
        to_status: nextStatus,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return updated;
  }

  async reassign(actor: FieldDispatchActorContext, dispatchId: string, body: RawRecord): Promise<FieldDispatch> {
    const current = await this.get(actor, dispatchId);
    assertNonTerminalStatus(current.status);
    assertStatusTransition(current.status, "reassigned");

    const operatorUserId = parseRequiredUuid(body.operatorUserId ?? body.operatorId ?? body.userId, "operatorUserId");
    await this.assertOperatorBelongsToTenant(actor.tenantId, operatorUserId);

    const updated = await this.repository.reassign({
      tenantId: actor.tenantId,
      dispatchId: current.id,
      operatorUserId,
      reason: optionalString(body.reason),
      observation: optionalString(body.observation),
      actorUserId: actor.userId,
    });

    if (!updated) {
      throw new FieldDispatchError(404, "FIELD_DISPATCH_NOT_FOUND", "not_found", "Dispatch was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      dispatchId: updated.id,
      workOrderId: updated.workOrderId,
      eventType: "field_dispatch_reassigned",
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: actor.userId,
      message: optionalString(body.message) ?? "Despacho operacional reatribuido.",
      metadata: {
        previousOperatorUserId: current.operatorUserId,
        operatorUserId: updated.operatorUserId,
        reason: optionalString(body.reason),
      },
    });

    await publishDomainEvent(
      "field_dispatch.reassigned",
      {
        entity_type: "field_dispatch",
        entity_id: updated.id,
        work_order_id: updated.workOrderId,
        operator_user_id: updated.operatorUserId,
        previous_operator_user_id: current.operatorUserId,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return updated;
  }

  async timeline(actor: FieldDispatchActorContext, dispatchId: string): Promise<readonly FieldDispatchEvent[]> {
    const dispatch = await this.get(actor, dispatchId);

    return this.repository.listTimeline(actor.tenantId, dispatch.id);
  }

  private async assertWorkOrderBelongsToTenant(actor: FieldDispatchActorContext, workOrderId: string): Promise<void> {
    try {
      await this.workOrderService.get(actor, workOrderId);
    } catch (error) {
      if (error instanceof WorkOrderError && error.statusCode === 404) {
        throw new FieldDispatchError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
      }
      throw error;
    }
  }

  // D1/D3 — valida que o ALVO (operatorUserId) existe no tenant (404) E é técnico de campo (422).
  // Existência é checada ANTES do papel (404 não é mascarado por 422). Guard único → cobre create E
  // reassign. Checa o CONJUNTO `roles` (plural), não só o primeiro (D1.a).
  private async assertOperatorBelongsToTenant(tenantId: string, operatorUserId: string): Promise<void> {
    let user: Awaited<ReturnType<ICoreSaasService["getUserForTenant"]>>;
    try {
      user = await this.coreService.getUserForTenant(operatorUserId, tenantId);
    } catch {
      throw new FieldDispatchError(404, "FIELD_OPERATOR_NOT_FOUND", "not_found", "Field operator was not found.");
    }

    const roles = user.roles ?? [];
    const isFieldTarget = roles.some((role) => (FIELD_DISPATCH_TARGET_ROLES as readonly string[]).includes(role));
    if (!isFieldTarget) {
      throw new FieldDispatchError(
        422,
        "FIELD_DISPATCH_TARGET_INVALID",
        "target_not_field_technician",
        "The dispatch target must be a field technician.",
      );
    }
  }
}

const memoryRepository = new InMemoryFieldDispatchRepository();
let defaultServicePromise: Promise<FieldDispatchService> | undefined;

export function createMemoryFieldDispatchService(coreService: ICoreSaasService): FieldDispatchService {
  return new FieldDispatchService(memoryRepository, createMemoryWorkOrderService(), coreService);
}

export function getMemoryFieldDispatchRepositoryForTests(): InMemoryFieldDispatchRepository {
  return memoryRepository;
}

export async function createDefaultFieldDispatchService(coreService: ICoreSaasService): Promise<FieldDispatchService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFieldDispatchService(coreService);
  }

  defaultServicePromise ??= createPrismaFieldDispatchService(coreService);

  return defaultServicePromise;
}

export function resetFieldDispatchRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFieldDispatchService(coreService: ICoreSaasService): Promise<FieldDispatchService> {
  const { createPrismaFieldDispatchRepository } = await import("./field-dispatch-prisma.repository.js");
  const repository = await createPrismaFieldDispatchRepository();
  const workOrderService = await createDefaultWorkOrderService();

  return new FieldDispatchService(repository, workOrderService, coreService);
}

function defaultStatusMessage(status: FieldDispatchStatus): string {
  const labels: Record<FieldDispatchStatus, string> = {
    draft: "Despacho operacional em rascunho.",
    assigned: "Despacho operacional atribuido.",
    accepted: "Despacho operacional aceito.",
    on_route: "Operador em rota.",
    arrived: "Operador chegou ao destino.",
    in_service: "Atendimento em execucao.",
    completed: "Despacho operacional concluido.",
    cancelled: "Despacho operacional cancelado.",
    reassigned: "Despacho operacional reatribuido.",
    failed: "Despacho operacional falhou.",
  };

  return labels[status];
}

function statusEventType(status: FieldDispatchStatus) {
  if (status === "cancelled") return "field_dispatch_cancelled" as const;
  return "field_dispatch_status_changed" as const;
}
