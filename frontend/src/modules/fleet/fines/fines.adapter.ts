import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  Fine,
  FineDraft,
  FineFieldError,
  FinesData,
  FinesPagination,
  FinesStatusFilter,
  FineStatus,
} from "./fines.types";

const NUMERO_AUTO_MAX = 60;
const ORGAO_MAX = 160;
const DESCRIPTION_MAX = 2000;
const DAY_MS = 86_400_000;

// Janela padrão de "A vencer" (dias) — espelha o parâmetro `due_within_days` do backend.
export const DUE_SOON_DAYS = 7;

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço).
export { formatBRL };

// Situação: token técnico -> rótulo PT-BR + tom do Chip (cor com semântica de fluxo).
const FINE_STATUS_META: Record<FineStatus, { label: string; tone: "default" | "warning" | "success" | "danger" | "audit" }> = {
  recebida: { label: "Recebida", tone: "default" },
  em_recurso: { label: "Em recurso", tone: "warning" },
  deferida: { label: "Deferida", tone: "success" },
  indeferida: { label: "Indeferida", tone: "danger" },
  paga: { label: "Paga", tone: "success" },
  cancelada: { label: "Cancelada", tone: "audit" },
};

const FINE_STATUS_VALUES = Object.keys(FINE_STATUS_META) as FineStatus[];

// Situações finais: não exigem mais atenção ao prazo (um prazo vencido nelas não fica vermelho).
const FINAL_STATUSES: readonly FineStatus[] = ["deferida", "paga", "cancelada"];

export function isFinalStatus(status: FineStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export function isFineStatus(value: string | null | undefined): value is FineStatus {
  return typeof value === "string" && FINE_STATUS_VALUES.includes(value as FineStatus);
}

export function adaptFinesResponse(response: unknown, source: FinesData["source"] = "api", fallbackReason?: string): FinesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptFine(item)).filter((item): item is Fine => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptFineResponse(response: unknown): Fine | null {
  const payload = readRecord(response);
  return adaptFine(readRecord(payload?.data) ?? response);
}

// ── Filtro (client-side sobre a janela carregada) ────────────────────────────
export type FineFilterCriteria = {
  readonly search: string;
  readonly isActive: FinesStatusFilter;
  readonly status?: FineStatus;
  readonly vehicleId?: string;
  readonly driverId?: string;
  readonly dueSoon?: boolean;
  readonly now?: Date;
  readonly resolveVehicleName?: (vehicleId: string) => string | undefined;
  readonly resolveDriverName?: (driverId: string) => string | undefined;
};

export function filterFines(items: readonly Fine[], criteria: FineFilterCriteria): Fine[] {
  const search = normalize(criteria.search);
  const now = criteria.now ?? new Date();

  return items.filter((fine) => {
    if (criteria.isActive === "active" && !fine.isActive) return false;
    if (criteria.isActive === "inactive" && fine.isActive) return false;
    if (criteria.status && fine.status !== criteria.status) return false;
    if (criteria.vehicleId && fine.vehicleId !== criteria.vehicleId) return false;
    if (criteria.driverId && fine.driverId !== criteria.driverId) return false;
    if (criteria.dueSoon && !isDueSoon(fine, DUE_SOON_DAYS, now)) return false;

    if (!search) return true;
    const vehicleName = criteria.resolveVehicleName?.(fine.vehicleId) ?? "";
    const driverName = fine.driverId ? criteria.resolveDriverName?.(fine.driverId) ?? "" : "";
    return [fine.numeroAuto, fine.orgao, fine.descricao, vehicleName, driverName, getFineStatusLabel(fine.status)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateFine(input: FineDraft): FineFieldError[] {
  const errors: FineFieldError[] = [];

  if (!input.vehicleId?.trim()) errors.push({ field: "vehicleId", message: "Selecione a viatura." });

  const numeroAuto = (input.numeroAuto ?? "").trim();
  if (!numeroAuto) errors.push({ field: "numeroAuto", message: "Informe o número do auto de infração." });
  else if (numeroAuto.length > NUMERO_AUTO_MAX) errors.push({ field: "numeroAuto", message: `Número do auto deve ter no máximo ${NUMERO_AUTO_MAX} caracteres.` });

  const orgao = (input.orgao ?? "").trim();
  if (!orgao) errors.push({ field: "orgao", message: "Informe o órgão autuador." });
  else if (orgao.length > ORGAO_MAX) errors.push({ field: "orgao", message: `Órgão deve ter no máximo ${ORGAO_MAX} caracteres.` });

  const dataInfracao = (input.dataInfracao ?? "").trim();
  if (!dataInfracao) errors.push({ field: "dataInfracao", message: "Informe a data da infração." });
  else if (Number.isNaN(new Date(dataInfracao).getTime())) errors.push({ field: "dataInfracao", message: "Data da infração inválida." });

  if (input.valor === undefined || !Number.isFinite(input.valor) || input.valor < 0) {
    errors.push({ field: "valor", message: "Informe o valor da multa (R$)." });
  }

  if (input.pontos !== undefined && (!Number.isInteger(input.pontos) || input.pontos < 0)) {
    errors.push({ field: "pontos", message: "Pontos devem ser um número inteiro (0 ou mais)." });
  }

  const prazoRecurso = (input.prazoRecurso ?? "").trim();
  if (prazoRecurso && Number.isNaN(new Date(prazoRecurso).getTime())) {
    errors.push({ field: "prazoRecurso", message: "Prazo de recurso inválido." });
  }

  const prazoPagamento = (input.prazoPagamento ?? "").trim();
  if (prazoPagamento && Number.isNaN(new Date(prazoPagamento).getTime())) {
    errors.push({ field: "prazoPagamento", message: "Prazo de pagamento inválido." });
  }

  const descricao = (input.descricao ?? "").trim();
  if (descricao && descricao.length > DESCRIPTION_MAX) errors.push({ field: "descricao", message: `Descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.` });

  return errors;
}

// ── Interpretação dos erros de domínio ({error:{reason}}) ────────────────────
// A ApiError não expõe o corpo cru; quando o motivo não vier explícito, inferimos pelo
// status HTTP + contexto da operação (form × transição).
export type FineSubmitContext = "form" | "transition";

export type FineSubmitFeedback = {
  readonly reason?: string;
  // Campo do formulário a marcar; ausente = mostrar só como Alerta.
  readonly field?: "numeroAuto" | "driverId" | "vehicleId";
  readonly message: string;
};

export const FINE_REASON_FEEDBACK: Record<string, FineSubmitFeedback> = {
  invalid_status_transition: {
    reason: "invalid_status_transition",
    message: "Transição de situação inválida para esta multa. Recarregue e tente novamente.",
  },
  cancel_requires_admin: {
    reason: "cancel_requires_admin",
    message: "Apenas administradores podem cancelar multas.",
  },
  duplicate_numero_auto: {
    reason: "duplicate_numero_auto",
    field: "numeroAuto",
    message: "Já existe uma multa com este número de auto nesta organização.",
  },
  invalid_driver_reference: {
    reason: "invalid_driver_reference",
    field: "driverId",
    message: "Condutor inválido para esta organização. Selecione outro condutor.",
  },
  invalid_vehicle_reference: {
    reason: "invalid_vehicle_reference",
    field: "vehicleId",
    message: "Viatura inválida para esta organização. Selecione outra viatura.",
  },
};

const FALLBACK_MESSAGE: Record<FineSubmitContext, string> = {
  form: "Não foi possível salvar a multa. Tente novamente.",
  transition: "Não foi possível atualizar a situação da multa. Tente novamente.",
};

function resolveReason(explicitReason: string | undefined, status: number | undefined, context: FineSubmitContext): string | undefined {
  if (explicitReason) return explicitReason;
  if (status === 409) return "duplicate_numero_auto";
  if (context === "transition") {
    if (status === 403) return "cancel_requires_admin";
    if (status === 422) return "invalid_status_transition";
  }
  // 400 é ambíguo (condutor × viatura) sem o motivo do corpo → Alerta genérico.
  return undefined;
}

export function interpretFineSubmitError(error: unknown, context: FineSubmitContext = "form"): FineSubmitFeedback {
  const reason = resolveReason(readErrorReason(error), readErrorStatus(error), context);
  if (reason && FINE_REASON_FEEDBACK[reason]) return FINE_REASON_FEEDBACK[reason];

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: FALLBACK_MESSAGE[context] };
}

// ── Transições de situação (só as próximas válidas são oferecidas na linha) ───
export type FineTransition = {
  readonly to: FineStatus;
  readonly label: string;
  // "cancel" só é oferecido a administradores (backend responde 403 cancel_requires_admin).
  readonly kind: "advance" | "cancel";
};

const TRANSITIONS: Record<FineStatus, readonly FineTransition[]> = {
  recebida: [
    { to: "em_recurso", label: "Entrar com recurso", kind: "advance" },
    { to: "paga", label: "Registrar pagamento", kind: "advance" },
    { to: "cancelada", label: "Cancelar multa", kind: "cancel" },
  ],
  em_recurso: [
    { to: "deferida", label: "Deferir recurso", kind: "advance" },
    { to: "indeferida", label: "Indeferir recurso", kind: "advance" },
    { to: "cancelada", label: "Cancelar multa", kind: "cancel" },
  ],
  indeferida: [
    { to: "paga", label: "Registrar pagamento", kind: "advance" },
    { to: "cancelada", label: "Cancelar multa", kind: "cancel" },
  ],
  deferida: [],
  paga: [],
  cancelada: [],
};

// `includeCancel=false` esconde as transições de cancelamento para não-administradores.
export function getValidFineTransitions(status: FineStatus, includeCancel = true): readonly FineTransition[] {
  const transitions = TRANSITIONS[status] ?? [];
  return includeCancel ? transitions : transitions.filter((transition) => transition.kind !== "cancel");
}

export function getFineStatusLabel(status: FineStatus): string {
  return FINE_STATUS_META[status]?.label ?? "—";
}

export function getFineStatusTone(status: FineStatus) {
  return FINE_STATUS_META[status]?.tone ?? ("default" as const);
}

export const FINE_STATUS_OPTIONS = FINE_STATUS_VALUES.map((value) => ({ value, label: FINE_STATUS_META[value].label }));

// ── Prazos coloridos (R3.2) ──────────────────────────────────────────────────
export type DeadlineTone = "default" | "warning" | "danger";

export type DeadlineInfo = {
  readonly hasDate: boolean;
  readonly date: string; // "dd/mm/aaaa" ou "—"
  readonly tone: DeadlineTone;
  readonly label: string; // rótulo acessível (nunca só cor): "Vence em 3 dia(s)", "Vencido há 2 dia(s)", "No prazo", "Sem prazo"
  readonly daysUntil: number | null;
};

// Número do dia-calendário em UTC (comparação TZ-safe, independente do fuso local).
function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}

export function formatDeadline(iso: string | null | undefined, status: FineStatus, now: Date = new Date()): DeadlineInfo {
  if (!iso) return { hasDate: false, date: "—", tone: "default", label: "Sem prazo", daysUntil: null };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { hasDate: false, date: "—", tone: "default", label: "Sem prazo", daysUntil: null };

  const formatted = formatFineDate(iso);
  const daysUntil = utcDayNumber(date) - utcDayNumber(now);

  // Situação final: prazo é histórico, tom neutro (não pressiona ação).
  if (isFinalStatus(status)) return { hasDate: true, date: formatted, tone: "default", label: formatted, daysUntil };

  if (daysUntil < 0) return { hasDate: true, date: formatted, tone: "danger", label: `Vencido há ${Math.abs(daysUntil)} dia(s)`, daysUntil };
  if (daysUntil <= DUE_SOON_DAYS) {
    const label = daysUntil === 0 ? "Vence hoje" : `Vence em ${daysUntil} dia(s)`;
    return { hasDate: true, date: formatted, tone: "warning", label, daysUntil };
  }
  return { hasDate: true, date: formatted, tone: "default", label: "No prazo", daysUntil };
}

// "A vencer": multa não-final com algum prazo (recurso/pagamento) dentro da janela (inclui vencidos).
// Espelha `due_within_days` (prazo <= agora + dias).
export function isDueSoon(fine: Fine, days: number = DUE_SOON_DAYS, now: Date = new Date()): boolean {
  if (isFinalStatus(fine.status)) return false;
  return [fine.prazoRecurso, fine.prazoPagamento].some((iso) => {
    if (!iso) return false;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return false;
    return utcDayNumber(date) - utcDayNumber(now) <= days;
  });
}

// ── Totais/agregados da janela carregada (renderizam mesmo vazio) ────────────
export type FinesTotals = {
  readonly count: number;
  readonly totalValor: number;
  readonly dueSoonCount: number;
};

export function computeFinesTotals(items: readonly Fine[], now: Date = new Date(), days: number = DUE_SOON_DAYS): FinesTotals {
  let totalValor = 0;
  let dueSoonCount = 0;
  for (const fine of items) {
    if (Number.isFinite(fine.valor)) totalValor += fine.valor;
    if (isDueSoon(fine, days, now)) dueSoonCount += 1;
  }
  return { count: items.length, totalValor, dueSoonCount };
}

// pt-BR: remove separador de milhar (ponto antes de 3 dígitos) e usa vírgula como decimal.
export function parsePtBrNumber(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseIntStrict(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function formatValor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return formatBRL(value);
}

export function formatPontos(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Math.trunc(value).toLocaleString("pt-BR");
}

export function formatFineDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

// ── Adaptação de linha (snake_case/camelCase → DTO) ──────────────────────────
function adaptFine(input: unknown): Fine | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const vehicleId = readString(item, ["vehicleId", "vehicle_id"]);
  const numeroAuto = readString(item, ["numeroAuto", "numero_auto"]);
  if (!id || !vehicleId || !numeroAuto) return null;

  return {
    id,
    vehicleId,
    driverId: readNullableString(item, ["driverId", "driver_id"]),
    numeroAuto,
    dataInfracao: readString(item, ["dataInfracao", "data_infracao"]) ?? "",
    orgao: readString(item, ["orgao"]) ?? "",
    descricao: readNullableString(item, ["descricao"]),
    valor: readNumber(item, ["valor"]) ?? 0,
    pontos: readNumber(item, ["pontos"]) ?? 0,
    prazoRecurso: readNullableString(item, ["prazoRecurso", "prazo_recurso"]),
    prazoPagamento: readNullableString(item, ["prazoPagamento", "prazo_pagamento"]),
    status: coerceStatus(readString(item, ["status"])),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function coerceStatus(value: string | undefined): FineStatus {
  return isFineStatus(value) ? value : "recebida";
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): FinesPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

function readErrorReason(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const direct = (error as { reason?: unknown }).reason;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const nested = readRecord((error as { error?: unknown }).error);
    const nestedReason = nested?.reason;
    if (typeof nestedReason === "string" && nestedReason.trim()) return nestedReason.trim();
  }
  return undefined;
}

function readErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
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

function readNullableString(input: Record<string, unknown>, keys: readonly string[]): string | null {
  return readString(input, keys) ?? null;
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

function readBoolean(input: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
