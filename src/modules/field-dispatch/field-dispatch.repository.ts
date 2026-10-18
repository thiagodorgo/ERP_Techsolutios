import { randomUUID } from "node:crypto";

import type {
  ChangeFieldDispatchStatusInput,
  CreateFieldDispatchInput,
  FieldDispatch,
  FieldDispatchEvent,
  FieldDispatchEventType,
  FieldDispatchStatus,
  ListFieldDispatchesInput,
  ListFieldDispatchesResult,
  OperatorAtFixTime,
  OperatorAtFixTimeCandidate,
  ReassignFieldDispatchInput,
} from "./field-dispatch.types.js";

// B-TRC-01 (plano do Traccar v2.1 §4.2; A2-12) — a regra FAIL-CLOSED do operador no instante do fix, sobre os
// despachos da viatura cuja janela contém o instante (aceito até ele e não encerrado nele). Elegível é o despacho com
// `operator_assigned_at ≤ accepted_at` — o técnico que está HOJE no despacho aceitou-o DEPOIS de recebê-lo. Um
// despacho na janela com `operator_assigned_at` ou `vehicle_assigned_at` nulo (linha anterior à migração), ou com a
// atribuição do operador posterior ao aceite (reatribuído sem novo aceite), torna o histórico ambíguo e manda a posição
// à quarentena, mesmo que haja outro elegível. Zero
// operador elegível → nenhum; mais de um operador distinto → ambíguo; exatamente um → ele.
export function classifyOperatorsAtFixTime(candidates: readonly OperatorAtFixTimeCandidate[]): OperatorAtFixTime {
  if (
    candidates.some(
      (candidate) =>
        candidate.vehicleAssignedAt === null ||
        candidate.operatorAssignedAt === null ||
        candidate.operatorAssignedAt.getTime() > candidate.acceptedAt.getTime(),
    )
  ) {
    return { kind: "history_ambiguous" };
  }
  const operators = new Set(candidates.map((candidate) => candidate.operatorUserId));
  if (operators.size === 0) return { kind: "none" };
  if (operators.size > 1) return { kind: "ambiguous" };
  return { kind: "single", operatorUserId: [...operators][0]! };
}

export interface FieldDispatchRepository {
  create(input: CreateFieldDispatchInput): Promise<FieldDispatch>;
  list(input: ListFieldDispatchesInput): Promise<ListFieldDispatchesResult>;
  findById(tenantId: string, dispatchId: string): Promise<FieldDispatch | undefined>;
  changeStatus(input: ChangeFieldDispatchStatusInput): Promise<FieldDispatch | undefined>;
  reassign(input: ReassignFieldDispatchInput): Promise<FieldDispatch | undefined>;
  createEvent(input: CreateFieldDispatchEventInput): Promise<FieldDispatchEvent>;
  listTimeline(tenantId: string, dispatchId: string): Promise<readonly FieldDispatchEvent[]>;
  reset?(): void;
}

export type CreateFieldDispatchEventInput = {
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly workOrderId: string;
  readonly eventType: FieldDispatchEventType;
  readonly fromStatus?: FieldDispatchStatus;
  readonly toStatus?: FieldDispatchStatus;
  readonly actorUserId?: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
};

export class InMemoryFieldDispatchRepository implements FieldDispatchRepository {
  private readonly dispatches = new Map<string, FieldDispatch>();
  private readonly events = new Map<string, FieldDispatchEvent>();

  async create(input: CreateFieldDispatchInput): Promise<FieldDispatch> {
    const now = new Date();
    const dispatch: FieldDispatch = {
      ...input,
      id: randomUUID(),
      status: input.status ?? "assigned",
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.dispatches.set(dispatch.id, dispatch);

    return dispatch;
  }

  async list(input: ListFieldDispatchesInput): Promise<ListFieldDispatchesResult> {
    const filtered = this.sortedDispatches()
      .filter((dispatch) => dispatch.tenantId === input.tenantId)
      .filter((dispatch) => !input.status || dispatch.status === input.status)
      .filter((dispatch) => !input.workOrderId || dispatch.workOrderId === input.workOrderId)
      .filter((dispatch) => !input.operatorUserId || dispatch.operatorUserId === input.operatorUserId)
      .filter((dispatch) => matchesSearch(dispatch, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, dispatchId: string): Promise<FieldDispatch | undefined> {
    const dispatch = this.dispatches.get(dispatchId);
    return dispatch?.tenantId === tenantId ? dispatch : undefined;
  }

  async changeStatus(input: ChangeFieldDispatchStatusInput): Promise<FieldDispatch | undefined> {
    const current = await this.findById(input.tenantId, input.dispatchId);
    if (!current) return undefined;
    const now = new Date();
    const updated: FieldDispatch = {
      ...current,
      status: input.status,
      reason: input.reason ?? current.reason,
      observation: input.observation ?? current.observation,
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: now,
      acceptedAt: input.status === "accepted" ? now : current.acceptedAt,
      onRouteAt: input.status === "on_route" ? now : current.onRouteAt,
      arrivedAt: input.status === "arrived" ? now : current.arrivedAt,
      inServiceAt: input.status === "in_service" ? now : current.inServiceAt,
      completedAt: input.status === "completed" ? now : current.completedAt,
      cancelledAt: input.status === "cancelled" ? now : current.cancelledAt,
      failedAt: input.status === "failed" ? now : current.failedAt,
    };
    this.dispatches.set(updated.id, updated);

    return updated;
  }

  async reassign(input: ReassignFieldDispatchInput): Promise<FieldDispatch | undefined> {
    const current = await this.findById(input.tenantId, input.dispatchId);
    if (!current) return undefined;
    const now = new Date();
    const updated: FieldDispatch = {
      ...current,
      operatorUserId: input.operatorUserId,
      status: "reassigned",
      reason: input.reason ?? current.reason,
      observation: input.observation ?? current.observation,
      updatedBy: input.actorUserId ?? current.updatedBy,
      updatedAt: now,
    };
    this.dispatches.set(updated.id, updated);

    return updated;
  }

  async createEvent(input: CreateFieldDispatchEventInput): Promise<FieldDispatchEvent> {
    const event: FieldDispatchEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      dispatchId: input.dispatchId,
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

  async listTimeline(tenantId: string, dispatchId: string): Promise<readonly FieldDispatchEvent[]> {
    return [...this.events.values()]
      .filter((event) => event.tenantId === tenantId && event.dispatchId === dispatchId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  reset(): void {
    this.dispatches.clear();
    this.events.clear();
  }

  private sortedDispatches(): FieldDispatch[] {
    return [...this.dispatches.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(dispatch: FieldDispatch, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [dispatch.id, dispatch.workOrderId, dispatch.operatorUserId, dispatch.observation, dispatch.reason]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}
