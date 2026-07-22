import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  MaintenanceCompletionDraft,
  MaintenanceCompletionField,
  MaintenanceCompletionFieldError,
  MaintenanceItemDraft,
  MaintenanceItemFieldError,
  MaintenanceItemType,
  MaintenanceOrder,
  MaintenanceOrderDetail,
  MaintenanceOrderDraft,
  MaintenanceOrderFieldError,
  MaintenanceOrderItem,
  MaintenanceOrdersData,
  MaintenanceOrdersPagination,
  MaintenanceOrderTotals,
  MaintenanceStatus,
  MaintenanceStatusFilter,
  MaintenanceTab,
  MaintenanceType,
  OdometerSuggestion,
} from "./maintenance-orders.types";

const DESCRIPTION_MAX = 2000;
const SUPPLIER_MAX = 160;
const ITEM_DESCRIPTION_MAX = 2000;
const ITEM_NOTES_MAX = 2000;

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço).
export { formatBRL };

// Tipo: token técnico do backend -> rótulo PT-BR (nunca exibir o token cru na UI).
export const MAINTENANCE_TYPE_OPTIONS = [
  { value: "preventiva", label: "Preventiva" },
  { value: "corretiva", label: "Corretiva" },
] as const;

const MAINTENANCE_TYPE_VALUES = MAINTENANCE_TYPE_OPTIONS.map((option) => option.value);

// Ω4C PR-06 — Tipo do item: token técnico (inglês) -> rótulo PT-BR. ESTOQUE só MARCA (baixa de custódia = PR-10/11).
export const MAINTENANCE_ITEM_TYPE_OPTIONS = [
  { value: "service", label: "Serviço" },
  { value: "product", label: "Produto" },
  { value: "stock", label: "Estoque" },
] as const;

const MAINTENANCE_ITEM_TYPE_META: Record<MaintenanceItemType, { label: string; tone: "info" | "pending" | "audit" }> = {
  service: { label: "Serviço", tone: "info" },
  product: { label: "Produto", tone: "pending" },
  stock: { label: "Estoque", tone: "audit" },
};

const MAINTENANCE_ITEM_TYPE_VALUES = MAINTENANCE_ITEM_TYPE_OPTIONS.map((option) => option.value) as readonly MaintenanceItemType[];

export function getMaintenanceItemTypeLabel(type: MaintenanceItemType): string {
  return MAINTENANCE_ITEM_TYPE_META[type]?.label ?? "—";
}

export function getMaintenanceItemTypeTone(type: MaintenanceItemType) {
  return MAINTENANCE_ITEM_TYPE_META[type]?.tone ?? ("info" as const);
}

// Situação: token técnico -> rótulo PT-BR + tom do Chip (cor com semântica de fluxo).
const MAINTENANCE_STATUS_META: Record<MaintenanceStatus, { label: string; tone: "default" | "warning" | "success" | "audit" }> = {
  agendada: { label: "Agendada", tone: "default" },
  em_execucao: { label: "Em execução", tone: "warning" },
  concluida: { label: "Concluída", tone: "success" },
  cancelada: { label: "Cancelada", tone: "audit" },
};

const FINAL_STATUSES: readonly MaintenanceStatus[] = ["concluida", "cancelada"];

export function isFinalStatus(status: MaintenanceStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export function adaptMaintenanceOrdersResponse(
  response: unknown,
  source: MaintenanceOrdersData["source"] = "api",
  fallbackReason?: string,
): MaintenanceOrdersData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptMaintenanceOrder(item)).filter((item): item is MaintenanceOrder => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptMaintenanceOrderResponse(response: unknown): MaintenanceOrder | null {
  const payload = readRecord(response);
  return adaptMaintenanceOrder(readRecord(payload?.data) ?? response);
}

export type MaintenanceFilterCriteria = {
  readonly search: string;
  readonly isActive: MaintenanceStatusFilter;
  readonly tab: MaintenanceTab;
  readonly vehicleId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly resolveVehicleName?: (vehicleId: string) => string | undefined;
};

// Aba = eixo de fluxo: Preventivas/Corretivas mostram apenas ordens não-finais do tipo;
// Histórico mostra concluídas/canceladas (qualquer tipo).
function matchesTab(order: MaintenanceOrder, tab: MaintenanceTab): boolean {
  if (tab === "historico") return isFinalStatus(order.status);
  if (isFinalStatus(order.status)) return false;
  return tab === "preventivas" ? order.type === "preventiva" : order.type === "corretiva";
}

export function filterMaintenanceOrders(items: readonly MaintenanceOrder[], criteria: MaintenanceFilterCriteria): MaintenanceOrder[] {
  const search = normalize(criteria.search);
  const fromTs = criteria.from ? Date.parse(`${criteria.from}T00:00:00`) : undefined;
  const toTs = criteria.to ? Date.parse(`${criteria.to}T23:59:59.999`) : undefined;

  return items.filter((order) => {
    if (!matchesTab(order, criteria.tab)) return false;
    if (criteria.isActive === "active" && !order.isActive) return false;
    if (criteria.isActive === "inactive" && order.isActive) return false;
    if (criteria.vehicleId && order.vehicleId !== criteria.vehicleId) return false;

    if (order.scheduledFor) {
      const ts = Date.parse(order.scheduledFor);
      if (Number.isFinite(ts)) {
        if (fromTs !== undefined && Number.isFinite(fromTs) && ts < fromTs) return false;
        if (toTs !== undefined && Number.isFinite(toTs) && ts > toTs) return false;
      }
    }

    if (!search) return true;
    const vehicleName = criteria.resolveVehicleName?.(order.vehicleId) ?? "";
    return [vehicleName, order.description, order.supplier, getMaintenanceTypeLabel(order.type), getMaintenanceStatusLabel(order.status)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateMaintenanceOrder(input: MaintenanceOrderDraft): MaintenanceOrderFieldError[] {
  const errors: MaintenanceOrderFieldError[] = [];

  if (!input.vehicleId?.trim()) errors.push({ field: "vehicleId", message: "Selecione a viatura." });

  if (!input.type || !MAINTENANCE_TYPE_VALUES.includes(input.type)) {
    errors.push({ field: "type", message: "Selecione o tipo de manutenção." });
  }

  const description = (input.description ?? "").trim();
  if (!description) errors.push({ field: "description", message: "Descreva a manutenção." });
  else if (description.length > DESCRIPTION_MAX) errors.push({ field: "description", message: `Descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.` });

  const scheduledFor = (input.scheduledFor ?? "").trim();
  if (scheduledFor && Number.isNaN(new Date(scheduledFor).getTime())) {
    errors.push({ field: "scheduledFor", message: "Data agendada inválida." });
  }

  const nextDueAt = (input.nextDueAt ?? "").trim();
  if (nextDueAt && Number.isNaN(new Date(nextDueAt).getTime())) {
    errors.push({ field: "nextDueAt", message: "Data da próxima manutenção inválida." });
  }

  if (input.odometer !== undefined && (!Number.isInteger(input.odometer) || input.odometer < 0)) {
    errors.push({ field: "odometer", message: "Odômetro deve ser um número inteiro (0 ou mais)." });
  }

  const supplier = (input.supplier ?? "").trim();
  if (supplier && supplier.length > SUPPLIER_MAX) errors.push({ field: "supplier", message: `Fornecedor deve ter no máximo ${SUPPLIER_MAX} caracteres.` });

  return errors;
}

// Ω4C PR-06 — validação do item (espelha o backend: unit_value>0 e quantity>0 → 422; descrição obrigatória).
export function validateMaintenanceItem(input: MaintenanceItemDraft): MaintenanceItemFieldError[] {
  const errors: MaintenanceItemFieldError[] = [];

  if (!input.itemType || !MAINTENANCE_ITEM_TYPE_VALUES.includes(input.itemType)) {
    errors.push({ field: "itemType", message: "Selecione o tipo do item." });
  }

  const description = (input.description ?? "").trim();
  if (!description) errors.push({ field: "description", message: "Descreva o item." });
  else if (description.length > ITEM_DESCRIPTION_MAX) {
    errors.push({ field: "description", message: `Item deve ter no máximo ${ITEM_DESCRIPTION_MAX} caracteres.` });
  }

  if (input.unitValue === undefined || !Number.isFinite(input.unitValue) || input.unitValue <= 0) {
    errors.push({ field: "unitValue", message: "Valor unitário deve ser maior que zero." });
  }

  if (input.quantity === undefined || !Number.isFinite(input.quantity) || input.quantity <= 0) {
    errors.push({ field: "quantity", message: "Quantidade deve ser maior que zero." });
  }

  const notes = (input.notes ?? "").trim();
  if (notes && notes.length > ITEM_NOTES_MAX) {
    errors.push({ field: "description", message: `Observação deve ter no máximo ${ITEM_NOTES_MAX} caracteres.` });
  }

  return errors;
}

// Total da linha para PREVIEW no cliente (unit × qty, 2 casas). O backend deriva e confirma o valor autoritativo —
// no grid de itens persistidos exibimos o `lineTotal` que veio do backend, nunca este cálculo.
export function computeLineTotalPreview(unitValue: number | undefined, quantity: number | undefined): number | undefined {
  if (unitValue === undefined || quantity === undefined || !Number.isFinite(unitValue) || !Number.isFinite(quantity)) {
    return undefined;
  }
  if (unitValue <= 0 || quantity <= 0) return undefined;
  return Math.round((unitValue * quantity + Number.EPSILON) * 100) / 100;
}

// Quantidade em pt-BR (Decimal(10,3) no backend): sem casas para inteiros, até 3 casas quando fracionária.
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value);
}

// Conclusão exige custo + data (R2 — o backend responde 422 completion_requires_cost_and_date).
export function validateCompletion(input: MaintenanceCompletionDraft): MaintenanceCompletionFieldError[] {
  const errors: MaintenanceCompletionFieldError[] = [];

  if (input.cost === undefined || !Number.isFinite(input.cost) || input.cost < 0) {
    errors.push({ field: "cost", message: "Informe o custo (R$) para concluir." });
  }

  const completedAt = (input.completedAt ?? "").trim();
  if (!completedAt) errors.push({ field: "completedAt", message: "Informe a data de conclusão." });
  else if (Number.isNaN(new Date(completedAt).getTime())) errors.push({ field: "completedAt", message: "Data de conclusão inválida." });

  return errors;
}

// Erros de domínio 422 do backend (`{error:{reason}}`). A ApiError não expõe o corpo cru,
// então quando o motivo não vier explícito inferimos pelo contexto da operação.
export type MaintenanceSubmitContext = "form" | "completion" | "transition";

export type MaintenanceSubmitFeedback = {
  readonly reason?: string;
  // Campo do formulário/conclusão a marcar; ausente = mostrar só como Alerta de perigo.
  readonly field?: "odometer" | "cost" | "completedAt" | "status";
  readonly message: string;
};

export const MAINTENANCE_REASON_FEEDBACK: Record<string, MaintenanceSubmitFeedback> = {
  invalid_status_transition: {
    reason: "invalid_status_transition",
    message: "Transição de situação inválida para esta manutenção. Recarregue e tente novamente.",
  },
  completion_requires_cost_and_date: {
    reason: "completion_requires_cost_and_date",
    field: "cost",
    message: "Para concluir, informe o custo (R$) e a data de conclusão.",
  },
  odometer_regressive: {
    reason: "odometer_regressive",
    field: "odometer",
    message: "Odômetro menor que o último registrado para esta viatura. Corrija a leitura para continuar.",
  },
};

const DEFAULT_REASON_BY_CONTEXT: Record<MaintenanceSubmitContext, string> = {
  form: "odometer_regressive",
  completion: "completion_requires_cost_and_date",
  transition: "invalid_status_transition",
};

export function interpretMaintenanceSubmitError(error: unknown, context: MaintenanceSubmitContext = "form"): MaintenanceSubmitFeedback {
  const explicitReason = readErrorReason(error);
  const reason = explicitReason ?? (readErrorStatus(error) === 422 ? DEFAULT_REASON_BY_CONTEXT[context] : undefined);
  if (reason && MAINTENANCE_REASON_FEEDBACK[reason]) return MAINTENANCE_REASON_FEEDBACK[reason];

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: "Não foi possível salvar a manutenção. Tente novamente." };
}

// Transições válidas a partir da situação atual (só estas são oferecidas na linha).
export type MaintenanceTransition = {
  readonly to: MaintenanceStatus;
  readonly label: string;
  readonly kind: "start" | "complete" | "cancel";
};

const TRANSITIONS: Record<MaintenanceStatus, readonly MaintenanceTransition[]> = {
  agendada: [
    { to: "em_execucao", label: "Iniciar", kind: "start" },
    { to: "cancelada", label: "Cancelar", kind: "cancel" },
  ],
  em_execucao: [
    { to: "concluida", label: "Concluir", kind: "complete" },
    { to: "cancelada", label: "Cancelar", kind: "cancel" },
  ],
  concluida: [],
  cancelada: [],
};

export function getValidTransitions(status: MaintenanceStatus): readonly MaintenanceTransition[] {
  return TRANSITIONS[status] ?? [];
}

export function getMaintenanceStatusLabel(status: MaintenanceStatus): string {
  return MAINTENANCE_STATUS_META[status]?.label ?? "—";
}

export function getMaintenanceStatusTone(status: MaintenanceStatus) {
  return MAINTENANCE_STATUS_META[status]?.tone ?? ("default" as const);
}

export function getMaintenanceTypeLabel(type: MaintenanceType): string {
  return MAINTENANCE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "—";
}

export function getMaintenanceTypeTone(type: MaintenanceType) {
  return type === "preventiva" ? ("info" as const) : ("pending" as const);
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

export function formatCost(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return formatBRL(value);
}

export function formatMaintenanceDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function adaptMaintenanceOrder(input: unknown): MaintenanceOrder | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const vehicleId = readString(item, ["vehicleId", "vehicle_id"]);
  if (!id || !vehicleId) return null;

  const type = coerceType(readString(item, ["type"]));
  const status = coerceStatus(readString(item, ["status"]));

  return {
    id,
    vehicleId,
    type,
    status,
    scheduledFor: readNullableString(item, ["scheduledFor", "scheduled_for"]),
    completedAt: readNullableString(item, ["completedAt", "completed_at"]),
    cost: readNullableNumber(item, ["cost"]),
    supplier: readNullableString(item, ["supplier"]),
    odometer: readNullableNumber(item, ["odometer"]),
    nextDueAt: readNullableString(item, ["nextDueAt", "next_due_at"]),
    description: readString(item, ["description"]) ?? "",
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    // Header da lista: Σ itens DERIVADOS server-side (0 quando ausente; nunca fabricado no cliente).
    itemCount: readNumber(item, ["itemCount", "item_count"]) ?? 0,
    itemsTotal: readNumber(item, ["itemsTotal", "items_total"]) ?? 0,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

// Ω4C PR-06 — item do backend -> view. `lineTotal` vem DERIVADO do backend (unit×qty); §2.8: só a projeção mínima
// (nunca tenant_id/maintenance_order_id crus). Linha sem id é descartada (D-007, nunca fabrica item).
function adaptMaintenanceOrderItem(input: unknown): MaintenanceOrderItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  if (!id) return null;

  const itemType = coerceItemType(readString(item, ["itemType", "item_type"]));
  return {
    id,
    itemType,
    description: readString(item, ["description"]) ?? "",
    unitValue: readNumber(item, ["unitValue", "unit_value"]) ?? 0,
    quantity: readNumber(item, ["quantity"]) ?? 0,
    lineTotal: readNumber(item, ["lineTotal", "line_total"]) ?? 0,
    notes: readNullableString(item, ["notes"]),
  };
}

// POST/PATCH de item retornam { data: item } — desembrulha e adapta a linha única (null se sem identidade).
export function adaptMaintenanceOrderItemResponse(response: unknown): MaintenanceOrderItem | null {
  const payload = readRecord(response);
  return adaptMaintenanceOrderItem(readRecord(payload?.data) ?? response);
}

export function adaptMaintenanceOrderItems(response: unknown): MaintenanceOrderItem[] {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const source = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(dataRecord) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  return source.map((item) => adaptMaintenanceOrderItem(item)).filter((item): item is MaintenanceOrderItem => Boolean(item));
}

// Totais DERIVADOS do backend — exibidos como vêm (D-Ω4C-MANUT-TOTALS-DERIVED), NUNCA recalculados no cliente.
export function adaptMaintenanceOrderTotals(input: unknown): MaintenanceOrderTotals {
  const totals = readRecord(input);
  return {
    totalServices: readNumber(totals, ["totalServices", "total_services"]) ?? 0,
    totalProducts: readNumber(totals, ["totalProducts", "total_products"]) ?? 0,
    total: readNumber(totals, ["total"]) ?? 0,
    itemCount: readNumber(totals, ["itemCount", "item_count"]) ?? 0,
  };
}

// GET /:id -> cabeçalho + itens + totais (todos derivados server-side). null se o cabeçalho não tiver identidade.
export function adaptMaintenanceOrderDetail(response: unknown): MaintenanceOrderDetail | null {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data) ?? payload;
  const order = adaptMaintenanceOrder(dataRecord ?? response);
  if (!order) return null;
  return {
    order,
    items: adaptMaintenanceOrderItems(dataRecord?.items ?? []),
    totals: adaptMaintenanceOrderTotals(dataRecord?.totals),
  };
}

// GET /odometer-suggestion -> { data: {...} | null }. null honesto sem histórico (D-007, nunca inventa leitura).
export function adaptOdometerSuggestion(response: unknown): OdometerSuggestion | null {
  const payload = readRecord(response);
  const data = readRecord(payload?.data ?? response);
  if (!data) return null;
  const suggestedOdometer = readNumber(data, ["suggestedOdometer", "suggested_odometer"]);
  if (suggestedOdometer === undefined || !Number.isFinite(suggestedOdometer)) return null;
  const rawSource = readString(data, ["source"]);
  const source: OdometerSuggestion["source"] = rawSource === "maintenance_order" ? "maintenance_order" : "fuel_log";
  return { suggestedOdometer, source };
}

function coerceItemType(value: string | undefined): MaintenanceItemType {
  if (value === "product" || value === "stock") return value;
  return "service";
}

function coerceType(value: string | undefined): MaintenanceType {
  return value === "corretiva" ? "corretiva" : "preventiva";
}

function coerceStatus(value: string | undefined): MaintenanceStatus {
  if (value === "em_execucao" || value === "concluida" || value === "cancelada") return value;
  return "agendada";
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): MaintenanceOrdersPagination {
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

function readNullableNumber(input: Record<string, unknown>, keys: readonly string[]): number | null {
  return readNumber(input, keys) ?? null;
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
