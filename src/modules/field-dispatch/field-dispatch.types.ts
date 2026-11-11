import type { ChecklistRunRole } from "../checklists/checklist.types.js";
import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const FIELD_DISPATCH_STATUSES = [
  "draft",
  "assigned",
  "accepted",
  "on_route",
  "arrived",
  "in_service",
  "completed",
  "cancelled",
  "reassigned",
  "failed",
] as const;

export const FIELD_DISPATCH_EVENTS = [
  "field_dispatch_created",
  "field_dispatch_status_changed",
  "field_dispatch_reassigned",
  "field_dispatch_cancelled",
  // D-CHK-DISPATCH-CREATE — auditoria FAIL-OPEN: quando o efeito de domínio que provisiona a run do checklist
  // falha, o despacho segue (201) mas registra ESTE evento na timeline (durável/visível), nunca em silêncio.
  // A coluna `event_type` TEM um CHECK no banco (`field_dispatch_events_event_type_check`): este 5º valor foi
  // ADICIONADO ao CHECK pela migração aditiva 20260858000000 (sem ela, o INSERT deste evento estouraria 23514).
  "field_dispatch_checklist_run_failed",
] as const;

export type FieldDispatchStatus = (typeof FIELD_DISPATCH_STATUSES)[number];
export type FieldDispatchEventType = (typeof FIELD_DISPATCH_EVENTS)[number];
export type JsonRecord = Record<string, unknown>;

// Ω3-b (R1 do crítico) — o ALVO de um despacho deve ser um técnico DE CAMPO. `field_technician`
// (LEGACY) e `technician` (STANDARD) são os papéis de campo; `operator` = operador web/despacho
// (direciona chamados, NÃO recebe despacho — ver decisão em controle/D-OMEGA3B). A checagem incide
// sobre `FieldDispatch.operatorUserId` (o alvo), nunca sobre o ator-despachante (D3).
export const FIELD_DISPATCH_TARGET_ROLES = ["field_technician", "technician"] as const satisfies readonly Role[];

export type FieldDispatchActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type FieldDispatch = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly operatorUserId: string;
  readonly status: FieldDispatchStatus;
  readonly observation?: string;
  readonly reason?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly acceptedAt?: Date;
  readonly onRouteAt?: Date;
  readonly arrivedAt?: Date;
  readonly inServiceAt?: Date;
  readonly completedAt?: Date;
  readonly cancelledAt?: Date;
  readonly failedAt?: Date;
  readonly metadata: JsonRecord;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type FieldDispatchEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly workOrderId: string;
  readonly eventType: FieldDispatchEventType;
  readonly fromStatus?: FieldDispatchStatus;
  readonly toStatus?: FieldDispatchStatus;
  readonly actorUserId?: string;
  readonly message: string;
  readonly metadata: JsonRecord;
  readonly createdAt: Date;
};

export type ListFieldDispatchesInput = {
  readonly tenantId: string;
  readonly workOrderId?: string;
  readonly operatorUserId?: string;
  readonly status?: FieldDispatchStatus;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListFieldDispatchesResult = {
  readonly items: readonly FieldDispatch[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateFieldDispatchInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly operatorUserId: string;
  readonly status: FieldDispatchStatus;
  readonly observation?: string;
  readonly reason?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly metadata?: JsonRecord;
};

export type ChangeFieldDispatchStatusInput = {
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly status: FieldDispatchStatus;
  readonly observation?: string;
  readonly reason?: string;
  readonly actorUserId?: string;
};

export type ReassignFieldDispatchInput = {
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly operatorUserId: string;
  readonly observation?: string;
  readonly reason?: string;
  readonly actorUserId?: string;
};

// B-O6R-09 (item 7 do portão; plano v2 §2.2) — o evento obrigatório que narra a escrita, sem os campos que o
// repositório preenche a partir do despacho gravado na MESMA transação (organização, despacho e OS).
export type FieldDispatchEventDraft = {
  readonly eventType: FieldDispatchEventType;
  readonly fromStatus?: FieldDispatchStatus;
  readonly toStatus?: FieldDispatchStatus;
  readonly actorUserId?: string;
  readonly message: string;
  readonly metadata?: JsonRecord;
};

/**
 * O gancho que roda DENTRO da transação do despacho, antes do commit. É por ele que a OS é atribuída (noutra transação,
 * a do repositório de OS): se ele lança, o despacho e o evento voltam juntos, e nada fica visível a outra conexão.
 */
export type FieldDispatchWriteHooks = {
  readonly beforeCommit?: (dispatch: FieldDispatch) => Promise<void>;
};

export type CreateFieldDispatchWithEventInput = {
  readonly dispatch: CreateFieldDispatchInput;
  readonly event: FieldDispatchEventDraft;
  readonly idempotencyKey?: string;
};

/**
 * O estado em que a transição foi VALIDADA. Os dois campos são obrigatórios: um `undefined` sairia do `where` do Prisma
 * e anularia o predicado (é a forma da mutação M13). O técnico entra porque, partindo de `reassigned`, a reatribuição
 * mantém o status — só o técnico distingue "o despacho que eu vi" do "despacho que acabou de ir para outro".
 */
export type FieldDispatchTransitionExpected = {
  readonly status: FieldDispatchStatus;
  readonly operatorUserId: string;
};

export type FieldDispatchTransitionPatch =
  | {
      readonly kind: "status";
      readonly status: FieldDispatchStatus;
      readonly reason?: string;
      readonly observation?: string;
      readonly actorUserId?: string;
    }
  | {
      readonly kind: "reassign";
      readonly operatorUserId: string;
      readonly reason?: string;
      readonly observation?: string;
      readonly actorUserId?: string;
    };

export type TransitionFieldDispatchInput = {
  readonly tenantId: string;
  readonly dispatchId: string;
  readonly expected: FieldDispatchTransitionExpected;
  readonly patch: FieldDispatchTransitionPatch;
  readonly event: FieldDispatchEventDraft;
};

export type FieldDispatchTransitionResult =
  | { readonly kind: "ok"; readonly dispatch: FieldDispatch; readonly event: FieldDispatchEvent }
  | { readonly kind: "conflict" }
  | { readonly kind: "not_found" };

/**
 * O pedido ORIGINAL de uma criação com chave, lido do evento `field_dispatch_created` do mesmo despacho (R2-02 da crítica
 * r2): a repetição compara o corpo com ele, nunca com a linha atual, que pode já ter andado (aceito, reatribuído,
 * rascunho ativado). `undefined` quando o evento não existe — impossível por P1, e tratado como falha fechada (503).
 */
export type FieldDispatchCreateRequest = {
  readonly workOrderId: string;
  readonly operatorUserId: string;
  readonly status: FieldDispatchStatus;
};

export type FieldDispatchIdempotencyMatch = {
  readonly dispatch: FieldDispatch;
  readonly original?: FieldDispatchCreateRequest;
};

export type FindFieldDispatchByIdempotencyKeyInput = {
  readonly tenantId: string;
  readonly createdBy: string;
  readonly idempotencyKey: string;
};

export type FieldDispatchCreateResult = {
  readonly dispatch: FieldDispatch;
  readonly replayed: boolean;
};

// O erro que os DOIS repositórios lançam quando a chave já está gravada (no Postgres, a violação do índice único
// `(tenant_id, created_by, idempotency_key)`; na memória, a mesma reserva). Mesmo `code` e `meta.target` do P2002 do
// Prisma, para o serviço capturar uma forma só (R2-11 da crítica r2).
export const FIELD_DISPATCH_IDEMPOTENCY_TARGET = ["tenant_id", "created_by", "idempotency_key"] as const;

export class FieldDispatchIdempotencyKeyTakenError extends Error {
  readonly code = "P2002";
  readonly meta = { target: [...FIELD_DISPATCH_IDEMPOTENCY_TARGET] };

  constructor() {
    super("field_dispatch_idempotency_key_taken");
    this.name = "FieldDispatchIdempotencyKeyTakenError";
  }
}

// B-TRC-01 (plano do Traccar v2.1 §4.2; A2-12) — quem dirigia a viatura no instante do fix.
export type FindOperatorsForVehicleAtInput = {
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly at: Date;
};

/**
 * Um despacho cuja janela contém o instante (aceito até ele e não encerrado nele) de uma OS que tem a viatura AGORA ou
 * cuja viatura foi (re)atribuída DEPOIS do instante. `vehicleAssignedAfterFix` é calculado no SQL (`vehicle_assigned_at
 * > at`; `null` quando a OS não tem data): `true` = o que a OS tinha no instante é desconhecido → histórico ambíguo.
 */
export type OperatorAtFixTimeCandidate = {
  readonly operatorUserId: string;
  readonly operatorAssignedAt: Date | null;
  readonly acceptedAt: Date;
  readonly vehicleAssignedAt: Date | null;
  readonly vehicleAssignedAfterFix: boolean | null;
};

export type OperatorAtFixTime =
  | { readonly kind: "single"; readonly operatorUserId: string }
  | { readonly kind: "none" }
  | { readonly kind: "ambiguous" }
  | { readonly kind: "history_ambiguous" };

// CHECKLIST P1 PR-04c (§7 do plano) — uma vistoria do CONJUNTO da ordem de serviço, na visão do despacho.
//
// A ordem deixou de ter "o checklist" (singular) e passou a ter um conjunto: a mesma ordem pode carregar a
// vistoria da coleta e a da entrega — inclusive do MESMO modelo, que é o par que alimenta a tela de comparação
// do app (um schema, duas execuções, um resumo de divergências que vira prova do estado do veículo).
//
// É uma PROJEÇÃO da linha de junção (`WorkOrderChecklistLink`), não uma cópia: o despacho só precisa de o que
// decide se a vistoria vai a campo. `import type` do vocabulário de fase é apagado na compilação, então este
// módulo continua SEM aresta de runtime com `checklists`.
export type DispatchChecklistLine = {
  readonly checklistId: string;
  /** A FASE desta linha. Faz parte da identidade da junção — o mesmo modelo pode servir coleta E entrega. */
  readonly role: ChecklistRunRole;
  /** Menor primeiro; a linha de menor índice é a PRIMÁRIA (a que espelha `work_orders.checklist_id`). */
  readonly orderIndex: number;
  /**
   * `true` quando a linha veio da JUNÇÃO; `false` quando é a visão sintética da ordem antiga (§5.3), que não
   * tem linha gravada nenhuma. A distinção não é cosmética: ela decide o significado de um snapshot ausente —
   * numa linha de junção, ausente quer dizer "o freeze nunca passou por aqui" (e a vistoria não pode ir a
   * campo); na visão sintética, quer dizer apenas "esta ordem é anterior ao conjunto".
   */
  readonly fromJunction: boolean;
  /**
   * O formulário CONGELADO desta linha. `null` numa linha de junção significa que o freeze nunca a viu — ela
   * NUNCA vira execução, porque mandar a campo um formulário que o congelamento não enxergou quebra a garantia
   * Ω3-c (E1/E3) de que o técnico responde a versão publicada no instante do despacho.
   */
  readonly frozenSnapshot: Record<string, unknown> | null;
};

export class FieldDispatchError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FieldDispatchError";
  }
}
