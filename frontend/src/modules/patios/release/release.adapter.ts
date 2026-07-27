import type { ChargeStatementView } from "../charges/charges.types";
import type { ImpoundStatus, ProcessListItem } from "../processes/processes.types";
import type {
  RecipientRelationship,
  ReleaseCheckDto,
  ReleaseDto,
  ReleaseGatePrecondition,
  ReleaseKind,
  ReleaseStatus,
  ReleaseView,
  SettleResult,
} from "./release.types";

// (labels PT-BR de FALLBACK — o backend já devolve kindLabel/statusLabel/relationshipLabel; a UI reusa e só cai
// aqui se ausente. White-label: "autoridade solicitante / proprietário / quem retira", NUNCA "polícia"/"tenant".)
const KIND_LABELS: Record<ReleaseKind, string> = {
  STANDARD: "Restituição definitiva",
  FOR_REPAIR: "Saída para reparo",
};

const STATUS_LABELS: Record<ReleaseStatus, string> = {
  IN_PROGRESS: "Em andamento",
  AUTHORIZED: "Autorizada",
  COMPLETED: "Concluída",
  RETURNED: "Retornada",
};

const RELATIONSHIP_LABELS: Record<RecipientRelationship, string> = {
  OWNER: "Proprietário",
  ATTORNEY: "Procurador",
  THIRD_PARTY: "Terceiro autorizado",
};

const RELEASE_KINDS: readonly ReleaseKind[] = ["STANDARD", "FOR_REPAIR"];
const RELEASE_STATUSES: readonly ReleaseStatus[] = ["IN_PROGRESS", "AUTHORIZED", "COMPLETED", "RETURNED"];
const RELATIONSHIPS: readonly RecipientRelationship[] = ["OWNER", "ATTORNEY", "THIRD_PARTY"];

export const RECIPIENT_RELATIONSHIP_OPTIONS: readonly { value: RecipientRelationship; label: string }[] =
  RELATIONSHIPS.map((value) => ({ value, label: RELATIONSHIP_LABELS[value] }));

export function getReleaseKindLabel(kind: ReleaseKind | string | null | undefined): string {
  return KIND_LABELS[(kind ?? "STANDARD") as ReleaseKind] ?? "Liberação";
}

export function getReleaseStatusLabel(status: ReleaseStatus | string | null | undefined): string {
  return STATUS_LABELS[(status ?? "IN_PROGRESS") as ReleaseStatus] ?? "Liberação";
}

export function getRelationshipLabel(rel: RecipientRelationship | string | null | undefined): string {
  if (!rel) return "—";
  return RELATIONSHIP_LABELS[rel as RecipientRelationship] ?? "Quem retira";
}

// ── reason 409/403 → PT-BR (white-label) ────────────────────────────────────────────────────────────────────
// O `reason` vem do corpo do erro do backend ({ error: { code, reason } }). Cobre os 5 reasons do gate de
// consumação (guardReleaseGate) + os do start (release_already_in_progress / release_freeze_retroactive) + a
// saída para reparo (repair_deadline_invalid / release_for_repair_not_active). NUNCA vaza corpo cru.
export function releaseActionErrorMessage(reason: string | null | undefined, status?: number): string {
  switch (reason) {
    // Start (salto A)
    case "release_already_in_progress":
      return "Já existe uma liberação em andamento para este processo.";
    case "release_freeze_retroactive":
      return "Não é possível congelar o total antes do fim do último período de diária já acumulado.";
    // Gate de consumação (salto B) — 5 reasons DISTINTOS (ordem de guardReleaseGate)
    case "release_reconciliation_pending":
      return "Reconcilie as diárias acumuladas além do congelamento antes de consumar a liberação.";
    case "release_debts_unsettled":
      return "Registre a quitação de todos os débitos exigíveis antes de consumar a liberação.";
    case "release_requirement_unmet":
      return "Conclua todos os requisitos obrigatórios do checklist de liberação.";
    case "release_authority_missing":
      return "Registre a autorização da autoridade solicitante antes de consumar a liberação.";
    case "release_recipient_missing":
      return "Identifique quem retira o veículo antes de consumar a liberação.";
    // Saída para reparo (art. 271 §2º)
    case "repair_deadline_invalid":
      return "Informe um prazo de reparo válido (até 60 dias, art. 23 §1º).";
    case "release_for_repair_not_active":
      return "Não há saída para reparo ativa para este processo.";
    // Defensivos da FSM/gate
    case "release_gate_unresolved":
      return "Não foi possível validar as pré-condições da liberação. Recarregue o dossiê e tente novamente.";
    case "invalid_transition":
      return "Ação inválida a partir do estado atual do processo.";
    case "transition_not_enabled_yet":
      return "Ação ainda não disponível nesta versão.";
    case "release_not_found":
      return "Não há liberação em andamento para este processo.";
    case "process_not_found":
      return "Processo de custódia não encontrado.";
    default:
      if (status === 401 || status === 403) return "Sessão expirada ou sem permissão para conduzir a liberação.";
      if (status === 404) return "Recurso da liberação não encontrado. Recarregue o dossiê.";
      if (status === 409) return "O estado do processo mudou. Recarregue o dossiê e tente novamente.";
      return "Não foi possível concluir a ação de liberação.";
  }
}

// ── Gate I5 (ESPELHO client-side de guardReleaseGate) ────────────────────────────────────────────────────────
// As 5 pré-condições, na MESMA ordem do backend (reconciliar valor → quitar → checklist → autoridade → quem
// retira). É HINT: mostra ao operador O QUE FALTA. O backend RE-VERIFICA sob lock (anti-TOCTOU) e é a AUTORIDADE.
// Sem statement carregado (guia indisponível) a UI NÃO afirma que os débitos estão quitados — mantém pendente.
export function deriveReleaseGate(
  release: ReleaseDto,
  checks: readonly ReleaseCheckDto[],
  statement: ChargeStatementView | null,
): ReleaseGatePrecondition[] {
  const reconciliationConsistent = statement != null && !statement.reconciliationPending && statement.overAccruedDailies <= 0;
  // Débito exigível = qualquer linha que NÃO seja ADJUSTMENT ainda sem settledAt (espelha o ledger do backend).
  const debtsSettled = statement != null && !statement.lines.some((line) => line.kind !== "ADJUSTMENT" && !line.settledAt);
  const requirementsMet = !checks.some((check) => check.required && !check.satisfied);
  const authorityRegistered = Boolean(release.authorityApprovedAt);
  const recipientIdentified = Boolean(release.recipientName);

  return [
    {
      key: "reconciliation_pending",
      label: "Reconciliação do valor",
      detail: reconciliationConsistent
        ? "Sem diárias acumuladas além do congelamento."
        : statement == null
          ? "Guia de débitos indisponível — não é possível confirmar a reconciliação."
          : "Há diárias acumuladas além do congelamento a estornar na quitação.",
      satisfied: reconciliationConsistent,
    },
    {
      key: "debts_unsettled",
      label: "Débitos quitados",
      detail: debtsSettled
        ? "Todos os débitos exigíveis estão quitados (ou dispensados)."
        : statement == null
          ? "Guia de débitos indisponível — não é possível confirmar a quitação."
          : "Há débitos exigíveis em aberto. Registre a quitação.",
      satisfied: debtsSettled,
    },
    {
      key: "requirement_unmet",
      label: "Requisitos do checklist",
      detail: requirementsMet
        ? "Todos os requisitos obrigatórios estão satisfeitos."
        : "Há requisitos obrigatórios pendentes no checklist de liberação.",
      satisfied: requirementsMet,
    },
    {
      key: "authority_missing",
      label: "Autorização da autoridade",
      detail: authorityRegistered
        ? "Ato da autoridade solicitante registrado."
        : "Registre a autorização da autoridade solicitante.",
      satisfied: authorityRegistered,
    },
    {
      key: "recipient_missing",
      label: "Quem retira identificado",
      detail: recipientIdentified
        ? "Pessoa que retira o veículo identificada."
        : "Informe o nome de quem retira o veículo.",
      satisfied: recipientIdentified,
    },
  ];
}

// Predicado PURO de habilitação do "Consumar liberação" — só habilita com as 5 pré-condições satisfeitas
// (defense-in-depth: o backend re-checa sob lock e devolve 409 IMPOUND_GUARD_FAILED com o reason real).
export function isConsumeEnabled(preconditions: readonly ReleaseGatePrecondition[]): boolean {
  return preconditions.length > 0 && preconditions.every((precondition) => precondition.satisfied);
}

export function pendingGateCount(preconditions: readonly ReleaseGatePrecondition[]): number {
  return preconditions.filter((precondition) => !precondition.satisfied).length;
}

// ── Fila /patios/liberacoes ──────────────────────────────────────────────────────────────────────────────────
// Liberações EM ANDAMENTO = RELEASE_IN_PROGRESS + RELEASED_FOR_REPAIR. Com "incluir elegíveis" soma ACTIVE_CUSTODY
// (candidatos a iniciar liberação). SEM endpoint novo: GET /impound-processes já traz o status; o filtro é
// client-side (mesmo padrão dos cadastros irmãos). RELEASED/leilão/encerrado NUNCA entram (não são liberáveis).
export const RELEASE_IN_PROGRESS_STATUSES: readonly ImpoundStatus[] = ["RELEASE_IN_PROGRESS", "RELEASED_FOR_REPAIR"];
export const RELEASE_ELIGIBLE_STATUS: ImpoundStatus = "ACTIVE_CUSTODY";

export function filterReleasableProcesses(
  items: readonly ProcessListItem[],
  includeEligible = false,
): ProcessListItem[] {
  const allowed = new Set<ImpoundStatus>(
    includeEligible ? [...RELEASE_IN_PROGRESS_STATUSES, RELEASE_ELIGIBLE_STATUS] : RELEASE_IN_PROGRESS_STATUSES,
  );
  return items.filter((item) => allowed.has(item.status));
}

// ── Estágio do painel (PURO) — orquestra a UI por process.status × liberação em curso ────────────────────────
export type ReleaseStage =
  | "start" // ACTIVE_CUSTODY sem liberação em curso: iniciar restituição definitiva ou preparar saída para reparo
  | "for_repair_prep" // ACTIVE_CUSTODY com dossiê FOR_REPAIR montado: quem transporta + autoridade + efetivar saída
  | "standard" // RELEASE_IN_PROGRESS: dossiê + quitação + autoridade + gate + consumar
  | "for_repair_out" // RELEASED_FOR_REPAIR: retorno + selo de prazo + comprovante da saída
  | "completed" // RELEASED: comprovante da restituição definitiva
  | "unavailable"; // demais estados (não há ato de liberação disponível)

export function resolveReleaseStage(status: ImpoundStatus, release: ReleaseDto | null): ReleaseStage {
  if (status === "RELEASED") return "completed";
  if (status === "RELEASED_FOR_REPAIR") return "for_repair_out";
  if (status === "RELEASE_IN_PROGRESS") return "standard";
  if (status === "ACTIVE_CUSTODY") return release && release.kind === "FOR_REPAIR" ? "for_repair_prep" : "start";
  return "unavailable";
}

// ── Adapters de resposta (camelCase do backend; robusto a snake_case) ────────────────────────────────────────
export function adaptReleaseView(response: unknown): ReleaseView | null {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  if (!dataRecord) return null;
  const release = adaptRelease(dataRecord);
  if (!release) return null;
  const checks = (readArray(payload?.checks) ?? readArray(dataRecord?.checks) ?? [])
    .map((item) => adaptCheck(item))
    .filter((item): item is ReleaseCheckDto => Boolean(item));
  return { data: release, checks };
}

export function adaptReleaseData(response: unknown): ReleaseDto | null {
  const payload = readRecord(response);
  return adaptRelease(readRecord(payload?.data) ?? payload);
}

export function adaptSettleResult(response: unknown): SettleResult {
  const payload = readRecord(response);
  const record = readRecord(payload?.data) ?? payload ?? {};
  const chargeIds = (readArray(record?.chargeIds) ?? readArray(record?.charge_ids) ?? [])
    .map((value) => (typeof value === "string" ? value : String(value)))
    .filter(Boolean);
  return {
    settledTotal: readString(record, ["settledTotal", "settled_total"]) ?? "0.00",
    settledCount: readNumber(record, ["settledCount", "settled_count"]) ?? 0,
    estornoCount: readNumber(record, ["estornoCount", "estorno_count"]) ?? 0,
    chargeIds,
  };
}

function adaptRelease(input: Record<string, unknown> | undefined): ReleaseDto | null {
  if (!input) return null;
  const id = readString(input, ["id"]);
  if (!id) return null;
  const kind = coerceKind(readString(input, ["kind"]));
  const status = coerceStatus(readString(input, ["status"]));
  const relationship = coerceRelationship(readString(input, ["recipientRelationship", "recipient_relationship"]));
  return {
    id,
    processId: readString(input, ["processId", "process_id"]) ?? "",
    kind,
    kindLabel: readString(input, ["kindLabel"]) ?? getReleaseKindLabel(kind),
    status,
    statusLabel: readString(input, ["statusLabel"]) ?? getReleaseStatusLabel(status),
    authorityApprovedBy: readString(input, ["authorityApprovedBy", "authority_approved_by"]) ?? null,
    authorityApprovedAt: readString(input, ["authorityApprovedAt", "authority_approved_at"]) ?? null,
    authorityReference: readString(input, ["authorityReference", "authority_reference"]) ?? null,
    authorityNote: readString(input, ["authorityNote", "authority_note"]) ?? null,
    recipientName: readString(input, ["recipientName", "recipient_name"]) ?? null,
    recipientDocument: readString(input, ["recipientDocument", "recipient_document"]) ?? null,
    recipientRelationship: relationship,
    recipientRelationshipLabel:
      readString(input, ["recipientRelationshipLabel"]) ?? (relationship ? getRelationshipLabel(relationship) : null),
    releasedAt: readString(input, ["releasedAt", "released_at"]) ?? null,
    repairDeadline: readString(input, ["repairDeadline", "repair_deadline"]) ?? null,
    repairOverdue: readBoolean(input, ["repairOverdue", "repair_overdue"]) ?? false,
    settledTotal: readString(input, ["settledTotal", "settled_total"]) ?? null,
    createdBy: readString(input, ["createdBy", "created_by"]) ?? null,
    updatedBy: readString(input, ["updatedBy", "updated_by"]) ?? null,
    createdAt: readString(input, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(input, ["updatedAt", "updated_at"]) ?? new Date().toISOString(),
  };
}

function adaptCheck(input: unknown): ReleaseCheckDto | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const code = readString(item, ["code"]);
  if (!id || !code) return null;
  return {
    id,
    releaseId: readString(item, ["releaseId", "release_id"]) ?? "",
    code,
    label: readString(item, ["label"]) ?? code,
    required: readBoolean(item, ["required"]) ?? false,
    satisfied: readBoolean(item, ["satisfied"]) ?? false,
    note: readString(item, ["note"]) ?? null,
    attachmentId: readString(item, ["attachmentId", "attachment_id"]) ?? null,
    checkedBy: readString(item, ["checkedBy", "checked_by"]) ?? null,
    checkedAt: readString(item, ["checkedAt", "checked_at"]) ?? null,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? new Date().toISOString(),
  };
}

function coerceKind(value: string | undefined): ReleaseKind {
  return value && RELEASE_KINDS.includes(value as ReleaseKind) ? (value as ReleaseKind) : "STANDARD";
}

function coerceStatus(value: string | undefined): ReleaseStatus {
  return value && RELEASE_STATUSES.includes(value as ReleaseStatus) ? (value as ReleaseStatus) : "IN_PROGRESS";
}

function coerceRelationship(value: string | undefined): RecipientRelationship | null {
  return value && RELATIONSHIPS.includes(value as RecipientRelationship) ? (value as RecipientRelationship) : null;
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readBoolean(input: Record<string, unknown> | undefined, keys: readonly string[]): boolean | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}
