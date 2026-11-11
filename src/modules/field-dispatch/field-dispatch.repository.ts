import { randomUUID } from "node:crypto";

import type {
  CreateFieldDispatchWithEventInput,
  FieldDispatch,
  FieldDispatchEvent,
  FieldDispatchEventType,
  FieldDispatchStatus,
  ListFieldDispatchesInput,
  ListFieldDispatchesResult,
  OperatorAtFixTime,
  OperatorAtFixTimeCandidate,
  FieldDispatchEventDraft,
  FieldDispatchTransitionPatch,
  FieldDispatchTransitionResult,
  FieldDispatchWriteHooks,
  TransitionFieldDispatchInput,
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
  /**
   * B-O6R-09 (P1/P2/P4 do plano v2) — a mudança de status ou a reatribuição e o evento que a narra numa transação só,
   * condicionada ao `status` E ao `operator_user_id` em que foi validada. Zero linhas → `conflict` (o despacho mudou) ou
   * `not_found`, sem evento. O gancho `beforeCommit` (a atribuição da OS) roda dentro dela, depois das escritas.
   */
  transitionWithEvent(input: TransitionFieldDispatchInput, hooks?: FieldDispatchWriteHooks): Promise<FieldDispatchTransitionResult>;
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
  private readonly dispatchLocks = new Map<string, Promise<void>>();

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

  // B-O6R-09 (P2 do plano v2) — o VENCEDOR CONDICIONAL na memória, com o mesmo contrato do Prisma: um mutex por despacho
  // serializa as transições; o predicado (status E técnico em que a transição foi validada) é conferido com o mutex
  // seguro; o gancho roda antes de aplicar; e a aplicação é síncrona. Zero linhas → `not_found` ou `conflict`.
  async transitionWithEvent(input: TransitionFieldDispatchInput, hooks?: FieldDispatchWriteHooks): Promise<FieldDispatchTransitionResult> {
    return this.withDispatchLock(input.dispatchId, async () => {
      const current = await this.findById(input.tenantId, input.dispatchId);
      if (!current) return { kind: "not_found" } as const;
      if (current.status !== input.expected.status || current.operatorUserId !== input.expected.operatorUserId) {
        return { kind: "conflict" } as const;
      }
      const now = new Date();
      const dispatch = applyTransitionPatch(current, input.patch, now);
      const event = buildEvent(dispatch, input.event, now);
      const result = { kind: "ok", dispatch, event } as const;
      if (hooks?.beforeCommit) await hooks.beforeCommit(result.dispatch);
      this.dispatches.set(dispatch.id, dispatch);
      this.events.set(event.id, event);

      return result;
    });
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
    this.dispatchLocks.clear();
  }

  private sortedDispatches(): FieldDispatch[] {
    return [...this.dispatches.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  // Uma fila por despacho (promessa encadeada pelo id): quem chega espera quem está na frente terminar.
  private async withDispatchLock<T>(dispatchId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.dispatchLocks.get(dispatchId) ?? Promise.resolve();
    const gate = { release: () => {} };
    const mine = new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    const tail = previous.then(() => mine);
    this.dispatchLocks.set(dispatchId, tail);
    await previous;
    try {
      return await work();
    } finally {
      gate.release();
      if (this.dispatchLocks.get(dispatchId) === tail) this.dispatchLocks.delete(dispatchId);
    }
  }
}

function applyTransitionPatch(current: FieldDispatch, patch: FieldDispatchTransitionPatch, now: Date): FieldDispatch {
  if (patch.kind === "reassign") {
    return {
      ...current,
      operatorUserId: patch.operatorUserId,
      status: "reassigned",
      reason: patch.reason ?? current.reason,
      observation: patch.observation ?? current.observation,
      updatedBy: patch.actorUserId ?? current.updatedBy,
      updatedAt: now,
    };
  }

  return {
    ...current,
    status: patch.status,
    reason: patch.reason ?? current.reason,
    observation: patch.observation ?? current.observation,
    updatedBy: patch.actorUserId ?? current.updatedBy,
    updatedAt: now,
    acceptedAt: patch.status === "accepted" ? now : current.acceptedAt,
    onRouteAt: patch.status === "on_route" ? now : current.onRouteAt,
    arrivedAt: patch.status === "arrived" ? now : current.arrivedAt,
    inServiceAt: patch.status === "in_service" ? now : current.inServiceAt,
    completedAt: patch.status === "completed" ? now : current.completedAt,
    cancelledAt: patch.status === "cancelled" ? now : current.cancelledAt,
    failedAt: patch.status === "failed" ? now : current.failedAt,
  };
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
