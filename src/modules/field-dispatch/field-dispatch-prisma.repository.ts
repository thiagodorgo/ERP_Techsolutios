import type { Prisma, PrismaClient } from "@prisma/client";

import { setTenantRlsContext, withTenantRls } from "../../database/rls.js";
import { workOrderAssignRepositoryForTx } from "../work-orders/work-order-scope.js";
import type {
  ChangeFieldDispatchStatusInput,
  CreateFieldDispatchInput,
  CreateFieldDispatchWithEventInput,
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
  FieldDispatchCreateRequest,
  FieldDispatchIdempotencyMatch,
  FieldDispatchTransitionPatch,
  FieldDispatchTransitionResult,
  FieldDispatchTxScope,
  FieldDispatchWriteHooks,
  FindFieldDispatchByIdempotencyKeyInput,
  TransitionFieldDispatchInput,
} from "./field-dispatch.types.js";
import { FieldDispatchIdempotencyKeyTakenError } from "./field-dispatch.types.js";
import {
  assertNotTransitionEventType,
  classifyOperatorsAtFixTime,
  type CreateFieldDispatchEventInput,
  type FieldDispatchRepository,
} from "./field-dispatch.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// B-O6R-09 (P1/P4 do plano v2; Emenda 4, P5/P6) — a TRANSAÇÃO-MÃE. O despacho, o seu evento e a atribuição da OS são
// gravados numa transação só: o gancho (`beforeCommit`) recebe o escopo da mãe e atribui a OS pela MESMA `tx`
// (`txScope`). Dentro dela não há espera por nada de fora: nenhuma ida ao banco do caminho usa outra conexão (a T15 de 1
// conexão é a guarda). O semáforo das mães (R-POOL) e o marcador do commit perdido saíram com a Emenda 4: o motivo do
// primeiro (a mãe segurava 1 conexão e a atribuição pedia OUTRA) e o estado que o segundo relatava (a OS atribuída com a
// mãe perdida) deixaram de existir.
// Teto da mãe; dentro dela não há espera por nada de fora. Fica em 20 s: baixá-lo não é necessário para o conserto e
// mudaria o tempo das barreiras das suítes (Emenda 4 §E4.2.2, declarado).
export const FIELD_DISPATCH_HELD_TX_TIMEOUT_MS = 20_000;

// B-TRC-01 (plano do Traccar v2.1 §4.2; A2-12) — o operador da viatura no instante do fix. Recebe o `tx` da fase 2
// da ingestão (já sob o GUC da organização confirmada, com orçamento de tempo) e NÃO abre transação. Lê só os
// despachos cuja janela contém o instante: `accepted_at ≤ at` e `at` antes do primeiro entre `completed_at`,
// `cancelled_at` e `failed_at` que não for nulo. A regra de elegibilidade é `classifyOperatorsAtFixTime`.
// Ciclo 3 (J-B-TRC-01-ciclo2, (c′)-P1) — a OS entra como candidata se tem a viatura AGORA ou se a viatura dela foi
// (re)atribuída DEPOIS do instante (`vehicle_assigned_at > at`): o que ela tinha no instante é desconhecido — pode ter
// sido esta — e o classificador a trata como histórico ambíguo. `vehicleAssignedAfterFix` nasce no SQL, da MESMA
// expressão que a inclui, para a borda de microssegundos não divergir entre o banco e o Node.
export async function findOperatorsForVehicleAt(
  tx: Prisma.TransactionClient,
  input: FindOperatorsForVehicleAtInput,
): Promise<OperatorAtFixTime> {
  const candidates = await tx.$queryRaw<OperatorAtFixTimeCandidate[]>`
    SELECT d.operator_user_id::text AS "operatorUserId",
           d.operator_assigned_at AS "operatorAssignedAt",
           d.accepted_at AS "acceptedAt",
           wo.vehicle_assigned_at AS "vehicleAssignedAt",
           (wo.vehicle_assigned_at > ${input.at}) AS "vehicleAssignedAfterFix"
      FROM field_dispatches d
      JOIN work_orders wo ON wo.tenant_id = d.tenant_id AND wo.id = d.work_order_id
     WHERE d.tenant_id = ${input.tenantId}::uuid
       AND (wo.vehicle_id = ${input.vehicleId}::uuid OR wo.vehicle_assigned_at > ${input.at})
       AND d.accepted_at IS NOT NULL
       AND d.accepted_at <= ${input.at}
       AND (LEAST(d.completed_at, d.cancelled_at, d.failed_at) IS NULL
            OR ${input.at} < LEAST(d.completed_at, d.cancelled_at, d.failed_at))`;

  return classifyOperatorsAtFixTime(candidates);
}

export class PrismaFieldDispatchRepository implements FieldDispatchRepository {
  constructor(private readonly client: PrismaExecutor) {}

  // O INSERT cru, preso a um `tx` (as fixtures do Traccar o usam direto, R-A9). B-O6R-09 (P3) — com chave, a violação do
  // índice único `(tenant_id, created_by, idempotency_key)` vira `FieldDispatchIdempotencyKeyTakenError`: o INSERT que
  // chega com a chave de uma transação ainda aberta ESPERA por ela no índice, e só falha se ela fizer commit.
  async create(input: CreateFieldDispatchInput, idempotencyKey?: string): Promise<FieldDispatch> {
    try {
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
          idempotency_key: idempotencyKey ?? null,
          metadata: toJsonObject(input.metadata ?? {}),
        },
      });

      return mapFieldDispatchRecord(dispatch);
    } catch (error) {
      // Com chave, a única unicidade alcançável é a dela: o `id` é gerado pelo banco e os outros índices não são únicos.
      if (idempotencyKey !== undefined && isUniqueViolation(error)) throw new FieldDispatchIdempotencyKeyTakenError();
      throw error;
    }
  }

  // B-O6R-09 (P3; R2-02 da crítica r2) — o despacho de uma chave e o pedido ORIGINAL dele, lido do evento
  // `field_dispatch_created` do mesmo despacho (que existe sempre que o despacho existe, por P1).
  async findByIdempotencyKey(input: FindFieldDispatchByIdempotencyKeyInput): Promise<FieldDispatchIdempotencyMatch | undefined> {
    const record = await this.client.fieldDispatch.findFirst({
      where: {
        tenant_id: input.tenantId,
        created_by: input.createdBy,
        idempotency_key: input.idempotencyKey,
      },
    });
    if (!record) return undefined;
    const created = await this.client.fieldDispatchEvent.findFirst({
      where: { tenant_id: input.tenantId, dispatch_id: record.id, event_type: "field_dispatch_created" },
      orderBy: [{ created_at: "asc" }],
    });

    return {
      dispatch: mapFieldDispatchRecord(record),
      original: created ? originalCreateRequest(mapFieldDispatchEventRecord(created)) : undefined,
    };
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

  // B-O6R-09 (P2 do plano v2; achado A1 da crítica r1) — preso a um `tx`. O UPDATE é CONDICIONAL ao status E ao técnico
  // em que a transição foi validada: sob READ COMMITTED, quem chega depois espera a linha e reavalia o `where` sobre a
  // versão que o vencedor gravou — zero linhas, sem evento. Uma linha → o evento → o gancho (a atribuição da OS).
  async transitionWithEvent(input: TransitionFieldDispatchInput, hooks?: FieldDispatchWriteHooks): Promise<FieldDispatchTransitionResult> {
    const updated = await this.client.fieldDispatch.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.dispatchId,
        status: input.expected.status,
        operator_user_id: input.expected.operatorUserId,
      },
      data: transitionData(input.patch, new Date()),
    });
    if (!updated[0]) {
      const exists = await this.client.fieldDispatch.findFirst({
        where: { tenant_id: input.tenantId, id: input.dispatchId },
        select: { id: true },
      });
      return exists ? { kind: "conflict" } : { kind: "not_found" };
    }
    const dispatch = mapFieldDispatchRecord(updated[0]);
    const event = await this.insertEvent({
      ...input.event,
      tenantId: dispatch.tenantId,
      dispatchId: dispatch.id,
      workOrderId: dispatch.workOrderId,
    });
    const result = { kind: "ok", dispatch, event } as const;
    if (hooks?.beforeCommit) await hooks.beforeCommit(result.dispatch, this.txScope());

    return result;
  }

  // B-O6R-09 — preso a um `tx`: o despacho, o evento e o gancho, nesta ordem. O gancho (a atribuição da OS) vem por
  // ÚLTIMO, para que uma falha no evento nunca chegue a atribuir.
  async createWithEvent(
    input: CreateFieldDispatchWithEventInput,
    hooks?: FieldDispatchWriteHooks,
  ): Promise<{ readonly dispatch: FieldDispatch; readonly event: FieldDispatchEvent }> {
    const dispatch = await this.create(input.dispatch, input.idempotencyKey);
    const event = await this.insertEvent({
      ...input.event,
      tenantId: dispatch.tenantId,
      dispatchId: dispatch.id,
      workOrderId: dispatch.workOrderId,
    });
    if (hooks?.beforeCommit) await hooks.beforeCommit(dispatch, this.txScope());

    return { dispatch, event };
  }

  // Só a auditoria `field_dispatch_checklist_run_failed` (e as fixtures); os 4 tipos obrigatórios são recusados aqui.
  async createEvent(input: CreateFieldDispatchEventInput): Promise<FieldDispatchEvent> {
    assertNotTransitionEventType(input.eventType);

    return this.insertEvent(input);
  }

  // Emenda 4 — o escopo da mãe para o gancho: o repositório de OS e este próprio repositório, os dois presos ao `tx`. O
  // cast é seguro PORQUE só `createWithEvent` e `transitionWithEvent` o chamam, e os dois só rodam presos ao `tx` da
  // mãe (`RlsPrismaFieldDispatchRepository`); a guarda (vii) congela o único chamador de `workOrderAssignRepositoryForTx`.
  private txScope(): FieldDispatchTxScope {
    return { workOrders: workOrderAssignRepositoryForTx(this.client as Prisma.TransactionClient), dispatches: this };
  }

  private async insertEvent(input: CreateFieldDispatchEventInput): Promise<FieldDispatchEvent> {
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

  // A transação-mãe da criação: `$transaction` com `timeout` explícito e o GUC da organização como 1ª instrução.
  async createWithEvent(
    input: CreateFieldDispatchWithEventInput,
    hooks?: FieldDispatchWriteHooks,
  ): Promise<{ readonly dispatch: FieldDispatch; readonly event: FieldDispatchEvent }> {
    return this.prismaClient.$transaction(
      async (tx) => {
        await setTenantRlsContext(tx, input.dispatch.tenantId);
        return new PrismaFieldDispatchRepository(tx).createWithEvent(input, hooks);
      },
      { timeout: FIELD_DISPATCH_HELD_TX_TIMEOUT_MS },
    );
  }

  // A transação-mãe da mudança de status e da reatribuição, na mesma forma da criação.
  async transitionWithEvent(input: TransitionFieldDispatchInput, hooks?: FieldDispatchWriteHooks): Promise<FieldDispatchTransitionResult> {
    return this.prismaClient.$transaction(
      async (tx) => {
        await setTenantRlsContext(tx, input.tenantId);
        return new PrismaFieldDispatchRepository(tx).transitionWithEvent(input, hooks);
      },
      { timeout: FIELD_DISPATCH_HELD_TX_TIMEOUT_MS },
    );
  }

  list(input: ListFieldDispatchesInput): Promise<ListFieldDispatchesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldDispatchRepository(tx).list(input));
  }

  findById(tenantId: string, dispatchId: string): Promise<FieldDispatch | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFieldDispatchRepository(tx).findById(tenantId, dispatchId));
  }

  findByIdempotencyKey(input: FindFieldDispatchByIdempotencyKeyInput): Promise<FieldDispatchIdempotencyMatch | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldDispatchRepository(tx).findByIdempotencyKey(input));
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

// Violação de índice único pelo CÓDIGO (P2002 do Prisma ou 23505 do Postgres), nunca pela mensagem. Com o driver
// adapter, o SQLSTATE pode estar só em `cause`/`meta.driverAdapterError` (medido em
// `checklist-applicability-prisma.repository.ts`), por isso a varredura em profundidade.
function isUniqueViolation(error: unknown): boolean {
  const codes: string[] = [];
  const collect = (candidate: unknown, depth: number): void => {
    if (depth > 4 || typeof candidate !== "object" || candidate === null) return;
    const record = candidate as Record<string, unknown>;
    for (const key of ["code", "originalCode"]) {
      const value = record[key];
      if (typeof value === "string") codes.push(value);
    }
    collect(record.cause, depth + 1);
    collect(record.meta, depth + 1);
    collect(record.driverAdapterError, depth + 1);
  };
  collect(error, 0);
  return codes.some((code) => code === "P2002" || code === "23505");
}

function originalCreateRequest(event: FieldDispatchEvent): FieldDispatchCreateRequest | undefined {
  const operatorUserId = event.metadata.operatorUserId;
  if (!event.toStatus || typeof operatorUserId !== "string") return undefined;
  return { workOrderId: event.workOrderId, operatorUserId, status: event.toStatus };
}

function transitionData(patch: FieldDispatchTransitionPatch, now: Date) {
  if (patch.kind === "reassign") {
    return compactRecord({
      operator_user_id: patch.operatorUserId,
      status: "reassigned",
      reason: patch.reason,
      observation: patch.observation,
      updated_by: patch.actorUserId,
    });
  }

  return compactRecord({
    status: patch.status,
    reason: patch.reason,
    observation: patch.observation,
    updated_by: patch.actorUserId,
    accepted_at: patch.status === "accepted" ? now : undefined,
    on_route_at: patch.status === "on_route" ? now : undefined,
    arrived_at: patch.status === "arrived" ? now : undefined,
    in_service_at: patch.status === "in_service" ? now : undefined,
    completed_at: patch.status === "completed" ? now : undefined,
    cancelled_at: patch.status === "cancelled" ? now : undefined,
    failed_at: patch.status === "failed" ? now : undefined,
  });
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
