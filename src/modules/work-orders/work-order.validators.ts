import {
  WORK_ORDER_FINANCIAL_CANCELLATION_DECISIONS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderFinancialCancellationDecision,
  type WorkOrderPriority,
  type WorkOrderStatus,
  WorkOrderError,
} from "./work-order.types.js";
import {
  WORK_ORDER_CHECKLIST_ROLES,
  isWorkOrderChecklistRole,
  workOrderChecklistAdjustmentEmptyError,
  workOrderChecklistReasonRequiredError,
  workOrderChecklistSetConflictError,
  type WorkOrderChecklistRole,
} from "./work-order-checklists.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WORK_ORDER_STATUS_TRANSITIONS: Readonly<Record<WorkOrderStatus, readonly WorkOrderStatus[]>> = {
  open: ["assigned", "cancelled"],
  assigned: ["accepted", "cancelled", "rejected"],
  accepted: ["on_route", "cancelled"],
  on_route: ["on_site", "cancelled"],
  on_site: ["in_progress", "cancelled"],
  in_progress: ["paused", "completed", "cancelled"],
  paused: ["in_progress"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function assertNonEmptyString(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "required_field", `${field} is required.`);
  }

  return normalized;
}

// Ω3-b — corpo de comentário livre da OS. Obrigatório (400 comment_required), limitado a 4000 chars
// (422 comment_too_long). Preserva quebras de linha internas; só apara as bordas.
export function parseComment(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "comment_required", "comment message is required.");
  }
  if (normalized.length > 4000) {
    throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "comment_too_long", "comment must be at most 4000 characters.");
  }
  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

export function parseWorkOrderPriority(value: unknown, fallback: WorkOrderPriority = "medium"): WorkOrderPriority {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (WORK_ORDER_PRIORITIES.includes(normalized as WorkOrderPriority)) {
    return normalized as WorkOrderPriority;
  }

  throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_priority", "priority is invalid.");
}

export function parseWorkOrderStatus(value: unknown): WorkOrderStatus {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (WORK_ORDER_STATUSES.includes(normalized as WorkOrderStatus)) {
    return normalized as WorkOrderStatus;
  }

  throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_status", "status is invalid.");
}

// Ω3F-6 (D-Ω3F-6-CANCEL) — a decisão financeira do cancelamento é OBRIGATÓRIA e fechada em
// keep|keep_unpaid|zero. Ausente OU fora do conjunto → 422 invalid_financial_decision (mesmo reason
// nos dois casos, de propósito: quem cancela dinheiro decide explicitamente — não existe default
// silencioso, que arbitraria a cobrança do cliente pelo operador).
export function parseFinancialCancellationDecision(value: unknown): WorkOrderFinancialCancellationDecision {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (WORK_ORDER_FINANCIAL_CANCELLATION_DECISIONS.includes(normalized as WorkOrderFinancialCancellationDecision)) {
    return normalized as WorkOrderFinancialCancellationDecision;
  }

  throw new WorkOrderError(
    422,
    "WORK_ORDER_UNPROCESSABLE",
    "invalid_financial_decision",
    `financial_decision must be one of ${WORK_ORDER_FINANCIAL_CANCELLATION_DECISIONS.join(", ")}.`,
  );
}

export function assertStatusTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
  if (from === to) return;
  if (WORK_ORDER_STATUS_TRANSITIONS[from].includes(to)) return;

  throw new WorkOrderError(
    409,
    "WORK_ORDER_STATUS_INVALID",
    "invalid_status_transition",
    `Cannot transition work order from ${from} to ${to}.`,
  );
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

// Ω3F-2a — campos dinâmicos por tipo. Aceita SÓ objeto plano (chave string → valor primitivo/null);
// rejeita não-objeto, array e valores aninhados (422). Limita cardinalidade e tamanho de string para
// evitar payload abusivo. NUNCA loga os valores (§2.8: pode conter senha de acesso do residencial).
export function parseServiceDetails(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "invalid_service_details", "service_details must be a plain object.");
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 50) {
    throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "service_details_too_large", "service_details has too many fields.");
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of entries) {
    if (key.length > 100) {
      throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "invalid_service_details", "service_details keys are invalid.");
    }
    if (entry !== null && typeof entry === "object") {
      throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "invalid_service_details", "service_details values must be primitives.");
    }
    if (typeof entry === "string" && entry.length > 2000) {
      throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "service_details_too_large", "service_details value is too long.");
    }
    result[key] = entry;
  }

  return result;
}

export function parseOptionalCoordinate(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_coordinate", `${field} must be between ${min} and ${max}.`);
  }

  return parsed;
}

// Ω3F-7a — quilometragem (km) OPCIONAL da OS: decimal >= 0. Ausente/vazio → undefined (permite o app
// mandar só o inicial e depois só o final — o merge por-campo vive no setMileage). Negativo, NaN, não
// finito ou tipo não-numérico (boolean/objeto) → 400 invalid_mileage. Emite number (o repo converte
// DECIMAL→number no mapWorkOrderRecord). NÃO trava por escala/casas: o DECIMAL(10,1) do banco arredonda.
// DECIMAL(10,1) no Postgres → máximo 999.999.999,9. FURO 3 (critico J-Ω3F-7A): sem TETO, um km ≥ 1e9
// passava (finito, ≥0) e estourava a coluna no INSERT (Postgres 22003 numeric_field_overflow) → 500 não
// tratado. O cap aqui vira 400, coerente com o piso.
const MILEAGE_MAX = 999_999_999.9;

export function parseOptionalMileage(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MILEAGE_MAX) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_mileage", `${field} must be a number between 0 and ${MILEAGE_MAX}.`);
  }

  return parsed;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);

  if (!uuidPattern.test(normalized)) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredUuid(value, field);
}

// ---------- CHECKLIST P1 PR-04c-A — o conjunto de vistorias da ordem ----------

export type ChecklistSelectionItem = {
  readonly checklistId: string;
  readonly role: WorkOrderChecklistRole;
};

/**
 * TRI-STATE do campo `checklists`, e é ele que faz o vínculo ser STICKY de verdade:
 *
 *  · `absent`   — o corpo não fala de vistoria. Na CRIAÇÃO isso significa RESOLVER (a regra decide, uma vez, e
 *                 congela). No UPDATE significa NÃO TOCAR — trocar o cliente ou o serviço de uma ordem NUNCA
 *                 re-resolve o conjunto (ponto 4 da decisão do dono).
 *  · `legacy`   — veio só o campo antigo `checklistId` (uma vistoria só). Continua valendo, agora gravando uma
 *                 linha `manual` de um elemento.
 *  · `explicit` — veio `checklists`, inclusive `null`/`[]` para LIMPAR deliberadamente. Não existia caminho REST
 *                 para esvaziar a vistoria de uma ordem; passa a existir, e o esvaziamento é auditado.
 *
 * Os dois campos juntos são RECUSADOS (400) em vez de um vencer em silêncio: um id só não consegue expressar um
 * conjunto, e adivinhar a intenção é como uma segunda vistoria sumiria sem ninguém notar.
 */
export type ChecklistSetSelection =
  | { readonly kind: "absent" }
  | { readonly kind: "legacy"; readonly checklistId: string }
  | { readonly kind: "explicit"; readonly items: readonly ChecklistSelectionItem[] };

export function parseWorkOrderChecklistRole(value: unknown, field = "role"): WorkOrderChecklistRole {
  if (value === undefined || value === null || value === "") return "generic";
  const normalized = typeof value === "string" ? value.trim() : "";

  if (isWorkOrderChecklistRole(normalized)) return normalized;

  throw new WorkOrderError(
    400,
    "WORK_ORDER_INVALID",
    "invalid_checklist_role",
    `${field} deve ser uma destas etapas: ${WORK_ORDER_CHECKLIST_ROLES.join(", ")}.`,
  );
}

export function parseChecklistSetSelection(body: Record<string, unknown>): ChecklistSetSelection {
  const hasSetKey = "checklists" in body;
  const legacyChecklistId = parseOptionalUuid(body.checklistId ?? body.checklist_id, "checklistId");

  if (hasSetKey && legacyChecklistId) {
    throw workOrderChecklistSetConflictError();
  }

  if (!hasSetKey) {
    return legacyChecklistId ? { kind: "legacy", checklistId: legacyChecklistId } : { kind: "absent" };
  }

  const raw = body.checklists;
  // `null` é a LIMPEZA deliberada — mesma semântica de `[]`. Não confundir com ausência (que resolve/não toca).
  if (raw === null) return { kind: "explicit", items: [] };

  if (!Array.isArray(raw)) {
    throw new WorkOrderError(
      400,
      "WORK_ORDER_INVALID",
      "invalid_checklist_set",
      "checklists deve ser uma lista de vistorias (ou null para deixar a ordem sem vistoria).",
    );
  }

  return { kind: "explicit", items: raw.map((entry) => parseChecklistSelectionItem(entry)) };
}

function parseChecklistSelectionItem(entry: unknown): ChecklistSelectionItem {
  // Aceita o id cru (lista de ids) e o objeto com etapa — o corpo mais simples continua válido.
  if (typeof entry === "string") {
    return { checklistId: parseRequiredUuid(entry, "checklistId"), role: "generic" };
  }

  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new WorkOrderError(
      400,
      "WORK_ORDER_INVALID",
      "invalid_checklist_set",
      "Cada vistoria deve informar o modelo e, opcionalmente, a etapa.",
    );
  }

  const record = entry as Record<string, unknown>;

  return {
    checklistId: parseRequiredUuid(record.checklistId ?? record.checklist_id, "checklistId"),
    role: parseWorkOrderChecklistRole(record.role),
  };
}

/**
 * O AJUSTE DO OPERADOR (`PATCH /work-orders/:id/checklists`) — o que ele pode mexer antes de a ordem ir a campo.
 *
 * A etapa é OBRIGATÓRIA no `remove`: com a identidade da junção incluindo a fase, `(ordem, modelo)` deixou de
 * apontar uma linha só, e adivinhar qual retirar poderia apagar a vistoria de entrega no lugar da de coleta.
 * O motivo também é obrigatório: POR QUE uma vistoria não aconteceu é exatamente o que uma disputa sobre o
 * veículo vai perguntar, e é o que o delete físico faria sumir.
 */
export type ChecklistAdjustmentRemoval = {
  readonly checklistId: string;
  readonly role: WorkOrderChecklistRole;
  readonly reason: string;
  /** §10.2.9 — confirmação DISTINTA, exigida quando a linha veio de uma regra com cliente nomeado. */
  readonly confirmCustomerScoped: boolean;
};

export type ChecklistAdjustmentInput = {
  readonly add: readonly ChecklistSelectionItem[];
  readonly remove: readonly ChecklistAdjustmentRemoval[];
};

export function parseChecklistAdjustment(body: Record<string, unknown>): ChecklistAdjustmentInput {
  const add = parseAdjustmentList(body.add, "add").map((entry) => parseChecklistSelectionItem(entry));
  const remove = parseAdjustmentList(body.remove, "remove").map((entry) => parseChecklistRemoval(entry));

  if (add.length === 0 && remove.length === 0) {
    throw workOrderChecklistAdjustmentEmptyError();
  }

  return { add, remove };
}

function parseAdjustmentList(value: unknown, field: string): readonly unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_checklist_adjustment", `${field} deve ser uma lista.`);
  }

  return value;
}

function parseChecklistRemoval(entry: unknown): ChecklistAdjustmentRemoval {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new WorkOrderError(
      400,
      "WORK_ORDER_INVALID",
      "invalid_checklist_adjustment",
      "Cada vistoria a retirar deve informar o modelo, a etapa e o motivo.",
    );
  }

  const record = entry as Record<string, unknown>;
  const reason = optionalString(record.reason);
  if (!reason) {
    throw workOrderChecklistReasonRequiredError();
  }
  if (reason.length > 500) {
    throw new WorkOrderError(
      422,
      "WORK_ORDER_UNPROCESSABLE",
      "checklist_removal_reason_too_long",
      "O motivo deve ter no máximo 500 caracteres.",
    );
  }

  return {
    checklistId: parseRequiredUuid(record.checklistId ?? record.checklist_id, "checklistId"),
    // Sem default aqui (ao contrário da adição): retirar a linha errada é destrutivo e não se desfaz sozinho.
    role: parseWorkOrderChecklistRole(requiredRoleValue(record), "role"),
    reason,
    confirmCustomerScoped:
      record.confirmCustomerScoped === true || record.confirm_customer_scoped === true,
  };
}

function requiredRoleValue(record: Record<string, unknown>): unknown {
  const raw = record.role;
  if (raw === undefined || raw === null || raw === "") {
    throw new WorkOrderError(
      400,
      "WORK_ORDER_INVALID",
      "checklist_role_required",
      "Informe a etapa da vistoria que será retirada.",
    );
  }

  return raw;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new WorkOrderError(400, "WORK_ORDER_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new WorkOrderError(400, "WORK_ORDER_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}

// Ω3F-6 (pós-análise) — token OPACO de idempotência do cliente (duplicate). Espelha os validadores dos
// vizinhos (`work-order-financial.validators.ts`, `service-quote-item.validators.ts`): só sanidade de
// TAMANHO, formato livre. Sem o cap, uma string enorme ia crua para a coluna do unique parcial
// `work_orders_idem_key` e o Postgres estouraria o limite de linha do btree (ERROR 54000) — que NÃO é
// P2002, logo escaparia do tradutor para 409 e viraria 500. Aqui vira 400, como nos espelhos.
export function parseOptionalClientActionId(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 120) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_client_action_id", "clientActionId must be at most 120 characters.");
  }
  return normalized;
}
