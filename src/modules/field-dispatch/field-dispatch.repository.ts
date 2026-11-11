import { randomUUID } from "node:crypto";

import type {
  ChangeFieldDispatchStatusInput,
  CreateFieldDispatchWithEventInput,
  FieldDispatch,
  FieldDispatchEvent,
  FieldDispatchEventType,
  FieldDispatchStatus,
  ListFieldDispatchesInput,
  ListFieldDispatchesResult,
  OperatorAtFixTime,
  OperatorAtFixTimeCandidate,
  ReassignFieldDispatchInput,
  FieldDispatchEventDraft,
  FieldDispatchWriteHooks,
} from "./field-dispatch.types.js";
import { FieldDispatchError } from "./field-dispatch.types.js";

// B-O6R-09 (R-A12 ii do plano v2; R2-06 da crítica r2) — os 4 tipos de evento OBRIGATÓRIOS só nascem na transação que
// muda o estado do despacho (`createWithEvent`/`transitionWithEvent`). `createEvent` sobra para a auditoria
// `field_dispatch_checklist_run_failed`; com qualquer um dos 4 ele recusa antes de escrever (erro de programação, 500).
export const FIELD_DISPATCH_TRANSITION_EVENT_TYPES: ReadonlySet<FieldDispatchEventType> = new Set<FieldDispatchEventType>([
  "field_dispatch_created",
  "field_dispatch_status_changed",
  "field_dispatch_cancelled",
  "field_dispatch_reassigned",
]);

export function assertNotTransitionEventType(eventType: FieldDispatchEventType): void {
  if (!FIELD_DISPATCH_TRANSITION_EVENT_TYPES.has(eventType)) return;

  throw new FieldDispatchError(
    500,
    "FIELD_DISPATCH_EVENT_TYPE_RESERVED",
    "event_type_reserved",
    `${eventType} só é gravado junto da escrita que ele narra (createWithEvent/transitionWithEvent).`,
  );
}

// B-TRC-01 (plano do Traccar v2.1 §4.2; A2-12) — a regra FAIL-CLOSED do operador no instante do fix, sobre os
// despachos da viatura cuja janela contém o instante (aceito até ele e não encerrado nele). Elegível é o despacho com
// `operator_assigned_at ≤ accepted_at` — o técnico que está HOJE no despacho aceitou-o DEPOIS de recebê-lo. Um
// despacho na janela com `operator_assigned_at` ou `vehicle_assigned_at` nulo (linha anterior à migração), ou com a
// atribuição do operador posterior ao aceite (reatribuído sem novo aceite), torna o histórico ambíguo e manda a posição
// à quarentena, mesmo que haja outro elegível. Idem a OS cuja viatura foi (re)atribuída DEPOIS do instante
// (`vehicleAssignedAfterFix`, ciclo 3): o que ela tinha no instante é desconhecido. Zero
// operador elegível → nenhum; mais de um operador distinto → ambíguo; exatamente um → ele.
export function classifyOperatorsAtFixTime(candidates: readonly OperatorAtFixTimeCandidate[]): OperatorAtFixTime {
  if (
    candidates.some(
      (candidate) =>
        candidate.vehicleAssignedAfterFix === true ||
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
  /**
   * B-O6R-09 (P1/P4 do plano v2) — o despacho e o evento `field_dispatch_created` numa transação só. O gancho
   * `beforeCommit` roda DENTRO dela, depois das duas escritas: se lança (a OS recusou a atribuição), nada fica.
   */
  createWithEvent(
    input: CreateFieldDispatchWithEventInput,
    hooks?: FieldDispatchWriteHooks,
  ): Promise<{ readonly dispatch: FieldDispatch; readonly event: FieldDispatchEvent }>;
  list(input: ListFieldDispatchesInput): Promise<ListFieldDispatchesResult>;
  findById(tenantId: string, dispatchId: string): Promise<FieldDispatch | undefined>;
  changeStatus(input: ChangeFieldDispatchStatusInput): Promise<FieldDispatch | undefined>;
  reassign(input: ReassignFieldDispatchInput): Promise<FieldDispatch | undefined>;
  restoreState(tenantId: string, snapshot: FieldDispatch): Promise<void>;
  /** Só a auditoria `field_dispatch_checklist_run_failed`; os 4 tipos obrigatórios são recusados. */
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

  // B-O6R-09 — o mesmo contrato do Prisma: o gancho roda ANTES de o despacho e o evento entrarem no mapa, e a entrada
  // é síncrona (sem `await` entre as duas). Se o gancho lança, nada foi posto.
  async createWithEvent(
    input: CreateFieldDispatchWithEventInput,
    hooks?: FieldDispatchWriteHooks,
  ): Promise<{ readonly dispatch: FieldDispatch; readonly event: FieldDispatchEvent }> {
    const now = new Date();
    const dispatch: FieldDispatch = {
      ...input.dispatch,
      id: randomUUID(),
      status: input.dispatch.status ?? "assigned",
      metadata: input.dispatch.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    const event = buildEvent(dispatch, input.event, now);

    if (hooks?.beforeCommit) await hooks.beforeCommit(dispatch);
    this.dispatches.set(dispatch.id, dispatch);
    this.events.set(event.id, event);

    return { dispatch, event };
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

  async restoreState(tenantId: string, snapshot: FieldDispatch): Promise<void> {
    if (snapshot.tenantId !== tenantId) return;
    this.dispatches.set(snapshot.id, snapshot);
  }

  async createEvent(input: CreateFieldDispatchEventInput): Promise<FieldDispatchEvent> {
    assertNotTransitionEventType(input.eventType);
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

function buildEvent(dispatch: FieldDispatch, draft: FieldDispatchEventDraft, now: Date): FieldDispatchEvent {
  return {
    id: randomUUID(),
    tenantId: dispatch.tenantId,
    dispatchId: dispatch.id,
    workOrderId: dispatch.workOrderId,
    eventType: draft.eventType,
    fromStatus: draft.fromStatus,
    toStatus: draft.toStatus,
    actorUserId: draft.actorUserId,
    message: draft.message,
    metadata: draft.metadata ?? {},
    createdAt: now,
  };
}

function matchesSearch(dispatch: FieldDispatch, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [dispatch.id, dispatch.workOrderId, dispatch.operatorUserId, dispatch.observation, dispatch.reason]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}
