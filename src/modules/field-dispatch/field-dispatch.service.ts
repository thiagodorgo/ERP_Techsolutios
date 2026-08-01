import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { WorkOrderError, type WorkOrder } from "../work-orders/work-order.types.js";
import {
  createDefaultWorkOrderService,
  createMemoryWorkOrderService,
  type WorkOrderService,
} from "../work-orders/work-order.service.js";
import {
  createDefaultChecklistService,
  createMemoryChecklistService,
  type ChecklistService,
} from "../checklists/checklist.service.js";
import {
  createDefaultNotificationService,
  createMemoryNotificationService,
  type NotificationService,
} from "../notifications/notification.service.js";
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

// Ω3-c (port do crítico, Req C) — resolve o snapshot congelável de um checklist SEM que este módulo
// importe `checklists` diretamente (dependency-inverted; a raiz de composição injeta o resolver).
// Retorna null quando não há template publicado — o despacho segue sem checklist.
export type ChecklistSnapshotResolver = (tenantId: string, checklistId: string) => Promise<Record<string, unknown> | null>;

// D-CHK-DISPATCH-CREATE — provisiona a RUN do checklist como EFEITO DE DOMÍNIO do despacho (mesmo padrão de
// inversão de dependência do resolver de snapshot: a raiz de composição injeta um provisioner que fala com
// `checklists`, sem este módulo importar aquele). Deve ser IDEMPOTENTE (chave determinística por OS+checklist):
// re-despacho/reassign da mesma OS NÃO cria run duplicada. Sem injeção → no-op (despacho segue sem run).
export type ChecklistRunProvisioner = (input: {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly workOrderId: string;
  readonly checklistId: string;
}) => Promise<void>;

// D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico, item 3b) — quando a provisão da run FALHA (fail-open), além
// do evento durável na timeline emite-se uma NOTIFICAÇÃO ao operador para a falha não ficar invisível. A aresta
// field-dispatch→notifications vive só na raiz de composição (dependency-inverted, como o provisioner): a raiz
// injeta um notifier que fala com o motor de notificações. Sem injeção → no-op. Best-effort (nunca 500).
export type ChecklistRunFailureNotifier = (input: {
  readonly tenantId: string;
  readonly recipientUserId: string;
  readonly workOrderId: string;
  readonly dispatchId: string;
  readonly checklistId: string;
  readonly reasonCode: string;
}) => Promise<void>;

export class FieldDispatchService {
  constructor(
    private readonly repository: FieldDispatchRepository,
    private readonly workOrderService: WorkOrderService,
    private readonly coreService: ICoreSaasService,
    private readonly resolveChecklistSnapshot: ChecklistSnapshotResolver = async () => null,
    private readonly provisionChecklistRun: ChecklistRunProvisioner = async () => {},
    private readonly notifyChecklistRunFailure: ChecklistRunFailureNotifier = async () => {},
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

    const workOrder = await this.assertWorkOrderBelongsToTenant(actor, workOrderId);
    await this.assertOperatorBelongsToTenant(actor.tenantId, operatorUserId);

    // Ω3-c (E1/E3) — congela o snapshot do checklist vigente da OS ANTES de criar o despacho
    // (freeze→create; falha após o freeze deixa OS com snapshot órfão, inócuo — nunca despacho sem
    // checklist). Idempotente: re-despacho re-congela com o template vigente daquele momento.
    const snapshot = workOrder.checklistId
      ? await this.resolveChecklistSnapshot(actor.tenantId, workOrder.checklistId)
      : null;
    await this.workOrderService.freezeChecklistSnapshot(actor, workOrder.id, snapshot);

    // D-CHK-DISPATCH-CREATE — EFEITO DE DOMÍNIO NÃO-AMPLIFICADOR: logo após o freeze, provisiona a run do
    // checklist ligada à OS, SÓ quando há checklist publicado (mesma condição do freeze: `checklistId` E
    // `snapshot != null`). A autoridade é `field_dispatch:create` (já exigida na rota) — este efeito NÃO
    // re-checa `checklist_runs:create` do despachante (o provisioner chama o serviço de domínio, que não faz
    // checagem de permissão), então não amplifica permissão. FAIL-OPEN: a falha ao criar a run NÃO bloqueia o
    // despacho; o erro é guardado para AUDITAR na timeline abaixo (nunca engolido em silêncio — senão o
    // guincheiro baixaria a OS sem run e o checklist se perderia, que é o data-loss que este PR conserta).
    let checklistRunProvisionError: unknown;
    if (workOrder.checklistId && snapshot) {
      try {
        await this.provisionChecklistRun({
          tenantId: actor.tenantId,
          actorUserId: actor.userId,
          workOrderId: workOrder.id,
          checklistId: workOrder.checklistId,
        });
      } catch (error) {
        checklistRunProvisionError = error;
      }
    }

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

    // D-CHK-DISPATCH-CREATE — auditoria FAIL-OPEN: se a provisão da run falhou acima, registra a falha na
    // timeline do despacho (durável/visível) + notifica o operador. Reason CODIFICADO (§2.8), nunca o
    // error.message cru. O despacho segue 201. (`workOrder.checklistId` é garantido não-nulo neste ramo.)
    if (checklistRunProvisionError && workOrder.checklistId) {
      await this.recordChecklistRunProvisionFailure(actor, dispatch, workOrder.checklistId, checklistRunProvisionError);
    }

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

    // D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico, item 3a) — AUTO-RECUPERAÇÃO: o reassign também provisiona
    // a run (idempotente). Se a provisão do create deu certo, o findRunByClientKey a devolve sem duplicar; se
    // FALHOU na criação, reatribuir agora RECRIA a run — o reassign passa a ser um caminho real de recuperação
    // (antes o único retry era um novo despacho). Fail-open + auditado + notificado, igual ao create.
    await this.provisionChecklistRunForDispatch(actor, updated);

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

  // D-CHK-DISPATCH-CREATE — provisão IDEMPOTENTE da run a partir de um despacho já existente (usada pelo
  // reassign como auto-recuperação). Mesma CONDIÇÃO do create (só quando há checklist PUBLICADO na OS: carrega
  // a OS e resolve o snapshot — READ-only, NÃO re-congela o snapshot da OS). Fail-open: erro NÃO é relançado;
  // vira o registro auditado + notificação. Carregar a OS é best-effort (o reassign já concluiu; recriar a run
  // é uma cortesia de recuperação, não pré-condição).
  private async provisionChecklistRunForDispatch(
    actor: FieldDispatchActorContext,
    dispatch: FieldDispatch,
  ): Promise<void> {
    let workOrder: WorkOrder | null;
    try {
      workOrder = await this.workOrderService.get(actor, dispatch.workOrderId);
    } catch {
      return;
    }

    if (!workOrder.checklistId) {
      return;
    }

    const snapshot = await this.resolveChecklistSnapshot(actor.tenantId, workOrder.checklistId);
    if (!snapshot) {
      return;
    }

    try {
      await this.provisionChecklistRun({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        workOrderId: dispatch.workOrderId,
        checklistId: workOrder.checklistId,
      });
    } catch (error) {
      await this.recordChecklistRunProvisionFailure(actor, dispatch, workOrder.checklistId, error);
    }
  }

  // D-CHK-DISPATCH-CREATE — registra a FALHA fail-open da provisão da run: (1) evento DURÁVEL na timeline do
  // despacho (reason CODIFICADO, §2.8 — item 4) e (2) NOTIFICAÇÃO ao operador (item 3b), para a falha não ficar
  // invisível ao guincheiro/operação. Cada efeito é best-effort próprio: a auditoria/notificação NUNCA pode
  // converter-se num 500 com despacho órfão. O conserto PRIMÁRIO do não-500 é a migração 20260858000000 (que
  // admite o event_type novo no CHECK; sem ela o INSERT do evento estouraria 23514); este try/catch é a REDE
  // SECUNDÁRIA. "nunca em silêncio": o registro primário é o evento de timeline — o catch só cobre um erro
  // INESPERADO de escrita (com a migração aplicada, o caminho feliz sempre grava o evento).
  private async recordChecklistRunProvisionFailure(
    actor: FieldDispatchActorContext,
    dispatch: FieldDispatch,
    checklistId: string,
    error: unknown,
  ): Promise<void> {
    const reason = classifyChecklistProvisionError(error);

    try {
      await this.repository.createEvent({
        tenantId: actor.tenantId,
        dispatchId: dispatch.id,
        workOrderId: dispatch.workOrderId,
        eventType: "field_dispatch_checklist_run_failed",
        toStatus: dispatch.status,
        actorUserId: actor.userId,
        message: "Falha ao provisionar a execução do checklist do despacho (despacho mantido).",
        metadata: {
          checklistId,
          reason,
        },
      });
    } catch {
      // Rede secundária (item 1): impede que um erro INESPERADO de escrita da auditoria vire um 500 com
      // despacho órfão. Com a migração 20260858000000 aplicada, o INSERT do evento não estoura mais 23514.
    }

    try {
      await this.notifyChecklistRunFailure({
        tenantId: actor.tenantId,
        recipientUserId: actor.userId,
        workOrderId: dispatch.workOrderId,
        dispatchId: dispatch.id,
        checklistId,
        reasonCode: reason,
      });
    } catch {
      // Notificação é best-effort — nunca bloqueia/500 o despacho.
    }
  }

  // Ω3-c — passa a RETORNAR a OS (antes descartava) para o `create` ler o `checklistId` e congelar o
  // snapshot. Mesmo mapeamento de 404.
  private async assertWorkOrderBelongsToTenant(actor: FieldDispatchActorContext, workOrderId: string): Promise<WorkOrder> {
    try {
      return await this.workOrderService.get(actor, workOrderId);
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

// D-CHK-DISPATCH-CREATE — constrói o provisioner de run a partir de um ChecklistService concreto (a aresta
// field-dispatch→checklists vive só na raiz de composição, não na classe). IDEMPOTENTE por chave determinística
// `dispatch:<workOrderId>:<checklistId>`: pré-consulta a run pela client_run_key e NÃO recria (nem re-emite
// evento) se já existir — re-despacho/reassign da mesma OS não duplica. A corrida remanescente é barrada de
// novo no serviço/unique (createRun devolve a existente na colisão P2002). started_by = despachante.
function buildChecklistRunProvisioner(checklistService: ChecklistService): ChecklistRunProvisioner {
  return async ({ tenantId, actorUserId, workOrderId, checklistId }) => {
    const clientRunKey = `dispatch:${workOrderId}:${checklistId}`;
    const actorContext = { tenantId, userId: actorUserId };
    const existing = await checklistService.findRunByClientKey(actorContext, clientRunKey);

    if (existing) {
      return;
    }

    await checklistService.createRun(actorContext, {
      checklistId,
      clientRunKey,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      answers: [],
    });
  };
}

// D-CHK-DISPATCH-CREATE (item 3b) — constrói o notifier de falha de provisão a partir do motor de notificações
// concreto (a aresta field-dispatch→notifications vive só na raiz de composição, não na classe). Best-effort no
// serviço (envolto em try/catch). Idempotência por dispatch+checklist evita notificação repetida se o reassign
// também falhar. Metadata sanitizado pelo próprio NotificationService (§2.8).
function buildChecklistRunFailureNotifier(notificationService: NotificationService): ChecklistRunFailureNotifier {
  return async ({ tenantId, recipientUserId, workOrderId, dispatchId, checklistId, reasonCode }) => {
    await notificationService.createNotification({
      tenantId,
      recipientUserId,
      type: "field_dispatch.checklist_run_failed",
      title: "Falha ao preparar o checklist do despacho",
      message:
        "Nao foi possivel criar automaticamente a execucao do checklist deste despacho. Reatribua o despacho ou tente novamente.",
      severity: "warning",
      sourceType: "field_dispatch",
      sourceId: dispatchId,
      actionUrl: `/operations/dispatches/${dispatchId}`,
      idempotencyKey: `field_dispatch_checklist_run_failed:${dispatchId}:${checklistId}`,
      metadata: {
        workOrderId,
        checklistId,
        reason: reasonCode,
      },
    });
  };
}

// D-CHK-DISPATCH-CREATE (achado BAIXO do crítico+coordenador, item 4) — reason CODIFICADO para a auditoria,
// NUNCA o `error.message` cru (que, para erros inesperados de Prisma, pode ecoar nome de constraint/coluna/
// valor de entrada — §2.8). ChecklistError expõe um `reason` curto/codificado (ex.: `checklist_not_published`,
// `checklist_not_found`); é duck-typed aqui para NÃO acoplar field-dispatch ao módulo de checklists (a aresta
// vive só na raiz de composição). Erros fora dessa taxonomia viram `unexpected`.
function classifyChecklistProvisionError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "reason" in error &&
    typeof (error as { reason?: unknown }).reason === "string" &&
    (error as { reason: string }).reason.trim() !== ""
  ) {
    return (error as { reason: string }).reason;
  }

  return "unexpected";
}

export function createMemoryFieldDispatchService(coreService: ICoreSaasService): FieldDispatchService {
  // Composição: injeta o resolver de snapshot E o provisioner de run (arestas field-dispatch→checklists só
  // aqui, não na classe). O MESMO ChecklistService (repositório em memória singleton) serve os dois, para que a
  // run provisionada seja visível às rotas de checklist (comparison, GET run-por-OS).
  const checklistService = createMemoryChecklistService();
  const resolveChecklistSnapshot: ChecklistSnapshotResolver = (tenantId, checklistId) =>
    checklistService.snapshotPublishedTemplate(tenantId, checklistId);
  const provisionChecklistRun = buildChecklistRunProvisioner(checklistService);
  const notifyChecklistRunFailure = buildChecklistRunFailureNotifier(createMemoryNotificationService());
  return new FieldDispatchService(
    memoryRepository,
    createMemoryWorkOrderService(),
    coreService,
    resolveChecklistSnapshot,
    provisionChecklistRun,
    notifyChecklistRunFailure,
  );
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
  const checklistService = await createDefaultChecklistService();
  const resolveChecklistSnapshot: ChecklistSnapshotResolver = (tenantId, checklistId) =>
    checklistService.snapshotPublishedTemplate(tenantId, checklistId);
  const provisionChecklistRun = buildChecklistRunProvisioner(checklistService);
  const notifyChecklistRunFailure = buildChecklistRunFailureNotifier(await createDefaultNotificationService());

  return new FieldDispatchService(
    repository,
    workOrderService,
    coreService,
    resolveChecklistSnapshot,
    provisionChecklistRun,
    notifyChecklistRunFailure,
  );
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
