import { formatBRL } from "../registry/service-catalog/service-catalog.adapter";
import type {
  InventoryAbcClass,
  InventoryItem,
  InventoryItemDraft,
  InventoryItemFieldError,
  InventoryItemsData,
  InventoryPagination,
  InventorySource,
  InventoryStatusFilter,
  StockMovement,
  StockMovementCreatePayload,
  StockMovementDraft,
  StockMovementFieldError,
  StockMovementType,
  StockMovementsData,
} from "./inventory.types";

const SKU_MAX = 60;
const NAME_MAX = 160;
const UNIT_MAX = 12;
const REASON_MAX = 500;

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço).
export { formatBRL };

// ── Tipo de movimento: token técnico -> rótulo PT-BR + tom do Chip ───────────
// entrada=sucesso, saída=perigo, consumo=aviso, ajuste=neutro.
const STOCK_MOVEMENT_TYPE_META: Record<StockMovementType, { label: string; tone: "default" | "warning" | "success" | "danger" }> = {
  entrada: { label: "Entrada", tone: "success" },
  saida: { label: "Saída", tone: "danger" },
  consumo: { label: "Consumo", tone: "warning" },
  ajuste: { label: "Ajuste", tone: "default" },
};

const STOCK_MOVEMENT_TYPE_VALUES = Object.keys(STOCK_MOVEMENT_TYPE_META) as StockMovementType[];
const ABC_CLASS_VALUES: readonly InventoryAbcClass[] = ["A", "B", "C"];

export function isStockMovementType(value: string | null | undefined): value is StockMovementType {
  return typeof value === "string" && STOCK_MOVEMENT_TYPE_VALUES.includes(value as StockMovementType);
}

export function isAbcClass(value: string | null | undefined): value is InventoryAbcClass {
  return typeof value === "string" && ABC_CLASS_VALUES.includes(value as InventoryAbcClass);
}

export function getMovementTypeLabel(type: StockMovementType): string {
  return STOCK_MOVEMENT_TYPE_META[type]?.label ?? "—";
}

export function getMovementTypeTone(type: StockMovementType) {
  return STOCK_MOVEMENT_TYPE_META[type]?.tone ?? ("default" as const);
}

export const STOCK_MOVEMENT_TYPE_OPTIONS = STOCK_MOVEMENT_TYPE_VALUES.map((value) => ({
  value,
  label: STOCK_MOVEMENT_TYPE_META[value].label,
}));

// ── Situação de reposição (Chip real a partir do `belowMin` do servidor) ─────
export function getReplenishmentLabel(belowMin: boolean): string {
  return belowMin ? "Abaixo do mínimo" : "OK";
}

export function getReplenishmentTone(belowMin: boolean): "warning" | "success" {
  return belowMin ? "warning" : "success";
}

// Classe ABC só é populada pelo F7b — null renderiza "—".
export function getAbcClassLabel(abcClass: InventoryAbcClass | null): string {
  return abcClass ?? "—";
}

// ── Adaptação de respostas (envelope {data:{items,pagination}}) ──────────────
export function adaptInventoryItemsResponse(response: unknown, source: InventorySource = "api", fallbackReason?: string): InventoryItemsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptInventoryItem(item)).filter((item): item is InventoryItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptInventoryItemResponse(response: unknown): InventoryItem | null {
  const payload = readRecord(response);
  return adaptInventoryItem(readRecord(payload?.data) ?? response);
}

export function adaptStockMovementsResponse(response: unknown, source: InventorySource = "api", fallbackReason?: string): StockMovementsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptStockMovement(item)).filter((item): item is StockMovement => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptStockMovementResponse(response: unknown): StockMovement | null {
  const payload = readRecord(response);
  return adaptStockMovement(readRecord(payload?.data) ?? response);
}

function adaptInventoryItem(input: unknown): InventoryItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const sku = readString(item, ["sku"]);
  const name = readString(item, ["name", "nome"]);
  if (!id || !sku || !name) return null;

  const minQuantity = readNumber(item, ["minQuantity", "min_quantity"]) ?? 0;
  const saldo = readNumber(item, ["saldo"]) ?? 0;
  const abcRaw = readString(item, ["abcClass", "abc_class"]);

  return {
    id,
    sku,
    name,
    unit: readString(item, ["unit", "unidade"]) ?? "un",
    minQuantity,
    maxQuantity: readNullableNumber(item, ["maxQuantity", "max_quantity"]),
    abcClass: isAbcClass(abcRaw) ? abcRaw : null,
    avgCost: readNumber(item, ["avgCost", "avg_cost"]) ?? 0,
    leadTimeDays: readNullableNumber(item, ["leadTimeDays", "lead_time_days"]),
    safetyStock: readNullableNumber(item, ["safetyStock", "safety_stock"]),
    saldo,
    // O servidor computa `belowMin`; se a flag faltar, deriva do saldo × mínimo.
    belowMin: readBoolean(item, ["belowMin", "below_min"]) ?? saldo < minQuantity,
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptStockMovement(input: unknown): StockMovement | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const itemId = readString(item, ["itemId", "item_id"]);
  const typeRaw = readString(item, ["type", "tipo"]);
  if (!id || !itemId || !isStockMovementType(typeRaw)) return null;

  return {
    id,
    itemId,
    type: typeRaw,
    quantidadeSinalizada: readNumber(item, ["quantidadeSinalizada", "quantidade_sinalizada"]) ?? 0,
    unitCost: readNullableNumber(item, ["unitCost", "unit_cost"]),
    workOrderId: readNullableString(item, ["workOrderId", "work_order_id"]),
    vehicleId: readNullableString(item, ["vehicleId", "vehicle_id"]),
    reason: readNullableString(item, ["reason", "motivo"]),
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    createdBy: readNullableString(item, ["createdBy", "created_by"]),
  };
}

// ── Filtros (client-side sobre a janela carregada) ───────────────────────────
export type InventoryItemFilterCriteria = {
  readonly search: string;
  readonly isActive: InventoryStatusFilter;
  readonly belowMin?: boolean;
};

export function filterInventoryItems(items: readonly InventoryItem[], criteria: InventoryItemFilterCriteria): InventoryItem[] {
  const search = normalize(criteria.search);

  return items.filter((item) => {
    if (criteria.isActive === "active" && !item.isActive) return false;
    if (criteria.isActive === "inactive" && item.isActive) return false;
    if (criteria.belowMin && !item.belowMin) return false;

    if (!search) return true;
    return [item.sku, item.name, item.unit, getAbcClassLabel(item.abcClass), getReplenishmentLabel(item.belowMin)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export type StockMovementFilterCriteria = {
  readonly search: string;
  readonly type?: StockMovementType;
  readonly itemId?: string;
  readonly resolveItemLabel?: (itemId: string) => string | undefined;
  readonly resolveWorkOrderCode?: (workOrderId: string) => string | undefined;
};

export function filterStockMovements(movements: readonly StockMovement[], criteria: StockMovementFilterCriteria): StockMovement[] {
  const search = normalize(criteria.search);

  return movements.filter((movement) => {
    if (criteria.type && movement.type !== criteria.type) return false;
    if (criteria.itemId && movement.itemId !== criteria.itemId) return false;

    if (!search) return true;
    const itemLabel = criteria.resolveItemLabel?.(movement.itemId) ?? "";
    const workOrderCode = movement.workOrderId ? criteria.resolveWorkOrderCode?.(movement.workOrderId) ?? "" : "";
    return [itemLabel, workOrderCode, movement.reason ?? "", getMovementTypeLabel(movement.type)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

// ── Validação do item (SEM saldo — derivado; SEM classe ABC — F7b) ───────────
export function validateInventoryItem(input: InventoryItemDraft): InventoryItemFieldError[] {
  const errors: InventoryItemFieldError[] = [];

  const sku = (input.sku ?? "").trim();
  if (!sku) errors.push({ field: "sku", message: "Informe o SKU do item." });
  else if (sku.length > SKU_MAX) errors.push({ field: "sku", message: `O SKU deve ter no máximo ${SKU_MAX} caracteres.` });

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Informe o nome do item." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `O nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const unit = (input.unit ?? "").trim();
  if (!unit) errors.push({ field: "unit", message: "Informe a unidade (ex.: un, m, kg)." });
  else if (unit.length > UNIT_MAX) errors.push({ field: "unit", message: `A unidade deve ter no máximo ${UNIT_MAX} caracteres.` });

  if (input.minQuantity !== undefined && (!Number.isFinite(input.minQuantity) || input.minQuantity < 0)) {
    errors.push({ field: "minQuantity", message: "Estoque mínimo inválido (use um número ≥ 0)." });
  }
  if (input.maxQuantity !== undefined) {
    if (!Number.isFinite(input.maxQuantity) || input.maxQuantity < 0) {
      errors.push({ field: "maxQuantity", message: "Estoque máximo inválido (use um número ≥ 0)." });
    } else if (input.minQuantity !== undefined && Number.isFinite(input.minQuantity) && input.maxQuantity < input.minQuantity) {
      errors.push({ field: "maxQuantity", message: "O estoque máximo deve ser maior ou igual ao mínimo." });
    }
  }
  if (input.leadTimeDays !== undefined && (!Number.isInteger(input.leadTimeDays) || input.leadTimeDays < 0)) {
    errors.push({ field: "leadTimeDays", message: "Lead time inválido (use dias inteiros ≥ 0)." });
  }
  if (input.safetyStock !== undefined && (!Number.isFinite(input.safetyStock) || input.safetyStock < 0)) {
    errors.push({ field: "safetyStock", message: "Estoque de segurança inválido (use um número ≥ 0)." });
  }

  return errors;
}

// ── Validação condicional do movimento por tipo ──────────────────────────────
// Quantidade é SEMPRE positiva no formulário; o sinal vem do tipo (e, no ajuste,
// da direção explícita) — ver buildStockMovementPayload.
export function validateStockMovement(input: StockMovementDraft): StockMovementFieldError[] {
  const errors: StockMovementFieldError[] = [];

  if (!input.type || !isStockMovementType(input.type)) errors.push({ field: "type", message: "Selecione o tipo do movimento." });
  if (!input.itemId?.trim()) errors.push({ field: "itemId", message: "Selecione o item." });

  if (input.quantidade === undefined || !Number.isFinite(input.quantidade)) {
    errors.push({ field: "quantidade", message: "Informe a quantidade." });
  } else if (input.quantidade <= 0) {
    errors.push({ field: "quantidade", message: "A quantidade deve ser maior que zero (o sinal vem do tipo)." });
  }

  if (input.type === "entrada") {
    if (input.unitCost === undefined || !Number.isFinite(input.unitCost)) {
      errors.push({ field: "unitCost", message: "Entrada exige o custo unitário (R$) — ele atualiza o custo médio." });
    } else if (input.unitCost < 0) {
      errors.push({ field: "unitCost", message: "Custo unitário inválido (use um valor em R$ ≥ 0)." });
    }
  } else if (input.unitCost !== undefined && (!Number.isFinite(input.unitCost) || input.unitCost < 0)) {
    errors.push({ field: "unitCost", message: "Custo unitário inválido (use um valor em R$ ≥ 0)." });
  }

  if (input.type === "consumo" && !input.workOrderId?.trim()) {
    errors.push({ field: "workOrderId", message: "Consumo exige a OS que consumiu o item." });
  }

  if (input.type === "ajuste") {
    if (input.ajusteDirection !== "entrada" && input.ajusteDirection !== "saida") {
      errors.push({ field: "ajusteDirection", message: "Selecione a direção do ajuste (entrada ou saída)." });
    }
    const reason = (input.reason ?? "").trim();
    if (!reason) errors.push({ field: "reason", message: "Ajuste exige um motivo." });
    else if (reason.length > REASON_MAX) errors.push({ field: "reason", message: `O motivo deve ter no máximo ${REASON_MAX} caracteres.` });
  }

  return errors;
}

// Sinal derivado do tipo: entrada credita (+); saída/consumo debitam (−);
// ajuste segue a direção explícita escolhida no formulário.
export function buildStockMovementPayload(draft: StockMovementDraft): StockMovementCreatePayload {
  const type = draft.type as StockMovementType;
  const quantidade = Math.abs(draft.quantidade ?? 0);
  const sign = type === "entrada" ? 1 : type === "ajuste" ? (draft.ajusteDirection === "entrada" ? 1 : -1) : -1;

  return {
    itemId: draft.itemId.trim(),
    type,
    quantidadeSinalizada: sign * quantidade,
    unitCost: draft.unitCost,
    workOrderId: draft.workOrderId?.trim() || undefined,
    vehicleId: draft.vehicleId?.trim() || undefined,
    reason: draft.reason?.trim() || undefined,
  };
}

// ── Interpretação dos erros de domínio ({error:{reason}}) ────────────────────
// A ApiError não expõe o corpo cru; quando o motivo não vier explícito, inferimos
// pelo status HTTP + contexto da operação (item × movimento).
export type InventoryItemSubmitFeedback = {
  readonly reason?: string;
  readonly field?: "sku";
  readonly message: string;
};

export function interpretInventoryItemSubmitError(error: unknown): InventoryItemSubmitFeedback {
  const reason = readErrorReason(error) ?? (readErrorStatus(error) === 409 ? "duplicate_sku" : undefined);

  if (reason === "duplicate_sku") {
    return { reason, field: "sku", message: "Já existe um item com este SKU nesta organização. Use outro SKU." };
  }

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: "Não foi possível salvar o item. Tente novamente." };
}

export type StockMovementSubmitFeedback = {
  readonly reason?: string;
  readonly field?: "quantidade" | "unitCost" | "workOrderId" | "vehicleId" | "reason";
  readonly message: string;
};

export type StockMovementErrorContext = {
  // Saldo conhecido do item selecionado (da janela carregada) — entra na mensagem do 409.
  readonly currentSaldo?: number;
  readonly unit?: string;
};

const STOCK_MOVEMENT_REASON_FEEDBACK: Record<string, Omit<StockMovementSubmitFeedback, "reason">> = {
  consumo_requires_work_order: { field: "workOrderId", message: "Consumo exige uma OS vinculada. Selecione a OS que consumiu o item." },
  entrada_requires_unit_cost: { field: "unitCost", message: "Entrada exige o custo unitário (R$) — ele atualiza o custo médio do item." },
  ajuste_requires_reason: { field: "reason", message: "Ajuste exige um motivo. Descreva o motivo do ajuste." },
  invalid_work_order_reference: { field: "workOrderId", message: "OS inválida para esta organização. Selecione outra OS." },
  invalid_vehicle_reference: { field: "vehicleId", message: "Viatura inválida para esta organização. Selecione outra viatura ou deixe em branco." },
};

export function interpretStockMovementSubmitError(error: unknown, context: StockMovementErrorContext = {}): StockMovementSubmitFeedback {
  const status = readErrorStatus(error);
  const reason = readErrorReason(error) ?? (status === 409 ? "insufficient_balance" : undefined);

  // 409 insufficient_balance → mensagem sob a Quantidade, com o saldo atual conhecido.
  if (reason === "insufficient_balance") {
    const saldoInfo =
      context.currentSaldo !== undefined && Number.isFinite(context.currentSaldo)
        ? ` Saldo atual: ${formatQuantity(context.currentSaldo, context.unit)}.`
        : "";
    return { reason, field: "quantidade", message: `Saldo insuficiente para debitar esta quantidade.${saldoInfo}` };
  }

  if (reason && STOCK_MOVEMENT_REASON_FEEDBACK[reason]) {
    return { reason, ...STOCK_MOVEMENT_REASON_FEEDBACK[reason] };
  }

  if (error instanceof Error && error.message) return { message: error.message };
  return { message: "Não foi possível registrar o movimento. Tente novamente." };
}

// ── Totais/agregados das janelas carregadas (renderizam mesmo vazio) ─────────
export type InventoryTotals = {
  readonly activeItems: number;
  readonly belowMinItems: number;
  readonly movementsCount: number;
};

export function computeInventoryTotals(items: readonly InventoryItem[], movements: readonly StockMovement[]): InventoryTotals {
  let activeItems = 0;
  let belowMinItems = 0;
  for (const item of items) {
    if (item.isActive) activeItems += 1;
    if (item.belowMin) belowMinItems += 1;
  }
  return { activeItems, belowMinItems, movementsCount: movements.length };
}

// Movimentações do item nos últimos 30 dias (stat do detalhe).
export function countMovements30d(movements: readonly StockMovement[], reference: Date = new Date()): number {
  const cutoff = reference.getTime() - 30 * 24 * 60 * 60 * 1000;
  return movements.filter((movement) => {
    const time = Date.parse(movement.createdAt);
    return Number.isFinite(time) && time >= cutoff && time <= reference.getTime() + 60_000;
  }).length;
}

// ── Formatação pt-BR ─────────────────────────────────────────────────────────
export function formatQuantity(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

// Quantidade sinalizada SEMPRE com sinal textual (+ credita / − debita).
export function formatSignedQuantity(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, signDisplay: "always" }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function formatValor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return formatBRL(value);
}

export function formatMovementDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

// pt-BR: remove separador de milhar (ponto antes de 3 dígitos) e usa vírgula como decimal.
export function parsePtBrNumber(value: string | null | undefined): number | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ── Helpers de leitura defensiva (snake_case/camelCase → DTO) ────────────────
function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): InventoryPagination {
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
    const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
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
