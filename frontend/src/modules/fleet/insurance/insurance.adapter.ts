import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  InsuranceData,
  InsurancePagination,
  InsuranceStatus,
  InsuranceStatusFilter,
  InsurancePolicy,
  InsurancePolicyDraft,
  InsurancePolicyFieldError,
} from "./insurance.types";

const SEGURADORA_MAX = 160;
const NUMERO_APOLICE_MAX = 80;
const COBERTURA_MAX = 2000;
const DAY_MS = 86_400_000;

// Janela padrão de "A vencer" (dias) — espelha o parâmetro `expiring_within_days` do backend.
export const EXPIRING_SOON_DAYS = 30;

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço).
export { formatBRL };

// Situação DERIVADA (read-only): token técnico -> rótulo PT-BR + tom do Chip.
const INSURANCE_STATUS_META: Record<InsuranceStatus, { label: string; tone: "default" | "warning" | "success" | "danger" | "audit" }> = {
  vigente: { label: "Vigente", tone: "success" },
  vencida: { label: "Vencida", tone: "danger" },
  cancelada: { label: "Cancelada", tone: "audit" },
};

const INSURANCE_STATUS_VALUES = Object.keys(INSURANCE_STATUS_META) as InsuranceStatus[];

export function isInsuranceStatus(value: string | null | undefined): value is InsuranceStatus {
  return typeof value === "string" && INSURANCE_STATUS_VALUES.includes(value as InsuranceStatus);
}

export function adaptInsurancePoliciesResponse(response: unknown, source: InsuranceData["source"] = "api", fallbackReason?: string): InsuranceData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptInsurancePolicy(item)).filter((item): item is InsurancePolicy => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptInsurancePolicyResponse(response: unknown): InsurancePolicy | null {
  const payload = readRecord(response);
  return adaptInsurancePolicy(readRecord(payload?.data) ?? response);
}

// ── Filtro (client-side sobre a janela carregada) ────────────────────────────
export type InsuranceFilterCriteria = {
  readonly search: string;
  readonly isActive: InsuranceStatusFilter;
  readonly status?: InsuranceStatus;
  readonly vehicleId?: string;
  readonly expiringSoon?: boolean;
  readonly now?: Date;
  readonly resolveVehicleName?: (vehicleId: string) => string | undefined;
};

export function filterInsurancePolicies(items: readonly InsurancePolicy[], criteria: InsuranceFilterCriteria): InsurancePolicy[] {
  const search = normalize(criteria.search);
  const now = criteria.now ?? new Date();

  return items.filter((policy) => {
    if (criteria.isActive === "active" && !policy.isActive) return false;
    if (criteria.isActive === "inactive" && policy.isActive) return false;
    if (criteria.status && policy.status !== criteria.status) return false;
    if (criteria.vehicleId && policy.vehicleId !== criteria.vehicleId) return false;
    if (criteria.expiringSoon && !isExpiringSoon(policy, EXPIRING_SOON_DAYS, now)) return false;

    if (!search) return true;
    const vehicleName = criteria.resolveVehicleName?.(policy.vehicleId) ?? "";
    return [policy.seguradora, policy.numeroApolice, policy.cobertura, vehicleName, getPolicyStatusLabel(policy.status)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateInsurancePolicy(input: InsurancePolicyDraft): InsurancePolicyFieldError[] {
  const errors: InsurancePolicyFieldError[] = [];

  if (!input.vehicleId?.trim()) errors.push({ field: "vehicleId", message: "Selecione a viatura." });

  const seguradora = (input.seguradora ?? "").trim();
  if (!seguradora) errors.push({ field: "seguradora", message: "Informe a seguradora." });
  else if (seguradora.length > SEGURADORA_MAX) errors.push({ field: "seguradora", message: `Seguradora deve ter no máximo ${SEGURADORA_MAX} caracteres.` });

  const numeroApolice = (input.numeroApolice ?? "").trim();
  if (!numeroApolice) errors.push({ field: "numeroApolice", message: "Informe o número da apólice." });
  else if (numeroApolice.length > NUMERO_APOLICE_MAX) errors.push({ field: "numeroApolice", message: `Número da apólice deve ter no máximo ${NUMERO_APOLICE_MAX} caracteres.` });

  const inicio = (input.vigenciaInicio ?? "").trim();
  const inicioValid = Boolean(inicio) && !Number.isNaN(new Date(inicio).getTime());
  if (!inicio) errors.push({ field: "vigenciaInicio", message: "Informe o início da vigência." });
  else if (!inicioValid) errors.push({ field: "vigenciaInicio", message: "Data de início da vigência inválida." });

  const fim = (input.vigenciaFim ?? "").trim();
  const fimValid = Boolean(fim) && !Number.isNaN(new Date(fim).getTime());
  if (!fim) errors.push({ field: "vigenciaFim", message: "Informe o fim da vigência." });
  else if (!fimValid) errors.push({ field: "vigenciaFim", message: "Data de fim da vigência inválida." });

  // Regra de negócio no cliente: fim > início.
  if (inicioValid && fimValid && new Date(fim).getTime() <= new Date(inicio).getTime()) {
    errors.push({ field: "vigenciaFim", message: "O fim da vigência deve ser posterior ao início." });
  }

  if (input.valor === undefined || !Number.isFinite(input.valor) || input.valor < 0) {
    errors.push({ field: "valor", message: "Informe o valor da apólice (R$)." });
  }

  const cobertura = (input.cobertura ?? "").trim();
  if (cobertura && cobertura.length > COBERTURA_MAX) errors.push({ field: "cobertura", message: `Cobertura deve ter no máximo ${COBERTURA_MAX} caracteres.` });

  return errors;
}

// ── Interpretação dos erros de domínio ({error:{reason}}) ────────────────────
// A ApiError não expõe o corpo cru; quando o motivo não vier explícito, inferimos pelo
// status HTTP + contexto da operação (form × transição).
export type InsuranceSubmitContext = "form" | "transition";

export type InsuranceSubmitFeedback = {
  readonly reason?: string;
  // Campo do formulário a marcar; ausente = mostrar só como Alerta.
  readonly field?: "numeroApolice" | "vehicleId";
  readonly message: string;
};

export const INSURANCE_REASON_FEEDBACK: Record<string, InsuranceSubmitFeedback> = {
  duplicate_numero_apolice: {
    reason: "duplicate_numero_apolice",
    field: "numeroApolice",
    message: "Já existe uma apólice com este número nesta organização.",
  },
  invalid_vehicle_reference: {
    reason: "invalid_vehicle_reference",
    field: "vehicleId",
    message: "Viatura inválida para esta organização. Selecione outra viatura.",
  },
  cannot_set_derived_status: {
    reason: "cannot_set_derived_status",
    message: "A situação “vencida” é derivada das datas de vigência e não pode ser definida manualmente.",
  },
};

const FALLBACK_MESSAGE: Record<InsuranceSubmitContext, string> = {
  form: "Não foi possível salvar a apólice. Tente novamente.",
  transition: "Não foi possível atualizar a situação da apólice. Tente novamente.",
};

function resolveReason(explicitReason: string | undefined, status: number | undefined, _context: InsuranceSubmitContext): string | undefined {
  if (explicitReason) return explicitReason;
  if (status === 409) return "duplicate_numero_apolice";
  if (status === 422) return "cannot_set_derived_status";
  if (status === 400) return "invalid_vehicle_reference";
  return undefined;
}

export function interpretInsuranceSubmitError(error: unknown, context: InsuranceSubmitContext = "form"): InsuranceSubmitFeedback {
  const reason = resolveReason(readErrorReason(error), readErrorStatus(error), context);
  if (reason && INSURANCE_REASON_FEEDBACK[reason]) return INSURANCE_REASON_FEEDBACK[reason];

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: FALLBACK_MESSAGE[context] };
}

// ── Transição de situação (uma única alternância vigente↔cancelada) ──────────
// "vencida" é derivada e nunca é enviada: só cancelamos (→cancelada) ou reativamos (→vigente).
export type InsuranceToggleAction = {
  readonly to: InsuranceStatus;
  readonly label: string;
  readonly kind: "cancel" | "reactivate";
};

export function getInsuranceToggleAction(status: InsuranceStatus): InsuranceToggleAction {
  if (status === "cancelada") return { to: "vigente", label: "Reativar", kind: "reactivate" };
  return { to: "cancelada", label: "Cancelar", kind: "cancel" };
}

export function getPolicyStatusLabel(status: InsuranceStatus): string {
  return INSURANCE_STATUS_META[status]?.label ?? "—";
}

export function getPolicyStatusTone(status: InsuranceStatus) {
  return INSURANCE_STATUS_META[status]?.tone ?? ("default" as const);
}

export const INSURANCE_STATUS_OPTIONS = INSURANCE_STATUS_VALUES.map((value) => ({ value, label: INSURANCE_STATUS_META[value].label }));

// ── Barra de vigência / proximidade do vencimento ────────────────────────────
export type VigenciaTone = "default" | "warning" | "danger";

export type VigenciaInfo = {
  readonly hasRange: boolean;
  readonly percent: number; // 0..100 de tempo decorrido (início→fim)
  readonly tone: VigenciaTone;
  readonly label: string; // rótulo acessível (nunca só cor): "Vence em N dias", "Vencida há N dias", "Vence hoje", "Sem vigência"
  readonly daysUntilEnd: number | null;
  readonly start: string; // "dd/mm/aaaa" ou "—"
  readonly end: string;
};

// Número do dia-calendário em UTC (comparação TZ-safe, independente do fuso local).
function utcDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function buildVigenciaLabel(daysUntilEnd: number): string {
  if (daysUntilEnd < 0) return `Vencida há ${Math.abs(daysUntilEnd)} dia(s)`;
  if (daysUntilEnd === 0) return "Vence hoje";
  return `Vence em ${daysUntilEnd} dia(s)`;
}

// Barra de vigência: tempo decorrido + coloração pela proximidade do fim.
// >30d neutro (verde), ≤30d aviso (âmbar), vencida perigo (vermelho). `status` cancelada neutraliza o tom.
export function computeVigencia(
  vigenciaInicio: string | null | undefined,
  vigenciaFim: string | null | undefined,
  now: Date = new Date(),
  status?: InsuranceStatus,
): VigenciaInfo {
  const startDate = toDate(vigenciaInicio);
  const endDate = toDate(vigenciaFim);
  const start = formatPolicyDate(vigenciaInicio);
  const end = formatPolicyDate(vigenciaFim);

  if (!endDate) return { hasRange: false, percent: 0, tone: "default", label: "Sem vigência", daysUntilEnd: null, start, end };

  const daysUntilEnd = utcDayNumber(endDate) - utcDayNumber(now);

  let percent: number;
  if (startDate) {
    const span = endDate.getTime() - startDate.getTime();
    percent = span <= 0 ? 100 : clampPercent(((now.getTime() - startDate.getTime()) / span) * 100);
  } else {
    percent = daysUntilEnd < 0 ? 100 : 0;
  }

  const label = buildVigenciaLabel(daysUntilEnd);

  // Situação cancelada: vigência é histórica, tom neutro (não pressiona ação).
  if (status === "cancelada") return { hasRange: true, percent, tone: "default", label, daysUntilEnd, start, end };

  let tone: VigenciaTone = "default";
  if (daysUntilEnd < 0) tone = "danger";
  else if (daysUntilEnd <= EXPIRING_SOON_DAYS) tone = "warning";

  return { hasRange: true, percent, tone, label, daysUntilEnd, start, end };
}

// "A vencer": apólice vigente cujo fim de vigência cai dentro da janela (inclui hoje, exclui já vencidas).
// Espelha `expiring_within_days` do backend.
export function isExpiringSoon(policy: InsurancePolicy, days: number = EXPIRING_SOON_DAYS, now: Date = new Date()): boolean {
  if (policy.status !== "vigente") return false;
  const end = toDate(policy.vigenciaFim);
  if (!end) return false;
  const daysUntil = utcDayNumber(end) - utcDayNumber(now);
  return daysUntil >= 0 && daysUntil <= days;
}

// ── Totais/agregados da janela carregada (renderizam mesmo vazio) ────────────
export type InsuranceTotals = {
  readonly count: number;
  readonly vigenteCount: number;
  readonly expiringSoonCount: number;
  readonly vencidaCount: number;
};

export function computeInsuranceTotals(items: readonly InsurancePolicy[], now: Date = new Date(), days: number = EXPIRING_SOON_DAYS): InsuranceTotals {
  let vigenteCount = 0;
  let expiringSoonCount = 0;
  let vencidaCount = 0;
  for (const policy of items) {
    if (policy.status === "vigente") vigenteCount += 1;
    if (policy.status === "vencida") vencidaCount += 1;
    if (isExpiringSoon(policy, days, now)) expiringSoonCount += 1;
  }
  return { count: items.length, vigenteCount, expiringSoonCount, vencidaCount };
}

// pt-BR: remove separador de milhar (ponto antes de 3 dígitos) e usa vírgula como decimal.
export function parsePtBrNumber(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatValor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return formatBRL(value);
}

export function formatPolicyDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

// ── Adaptação de linha (snake_case/camelCase → DTO) ──────────────────────────
function adaptInsurancePolicy(input: unknown): InsurancePolicy | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const vehicleId = readString(item, ["vehicleId", "vehicle_id"]);
  const numeroApolice = readString(item, ["numeroApolice", "numero_apolice"]);
  if (!id || !vehicleId || !numeroApolice) return null;

  return {
    id,
    vehicleId,
    seguradora: readString(item, ["seguradora"]) ?? "",
    numeroApolice,
    vigenciaInicio: readString(item, ["vigenciaInicio", "vigencia_inicio"]) ?? "",
    vigenciaFim: readString(item, ["vigenciaFim", "vigencia_fim"]) ?? "",
    valor: readNumber(item, ["valor"]) ?? 0,
    cobertura: readNullableString(item, ["cobertura"]),
    status: coerceStatus(readString(item, ["status"])),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function coerceStatus(value: string | undefined): InsuranceStatus {
  return isInsuranceStatus(value) ? value : "vigente";
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): InsurancePagination {
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
