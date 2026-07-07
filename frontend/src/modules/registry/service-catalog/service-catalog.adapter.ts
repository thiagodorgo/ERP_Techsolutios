import type {
  ServiceCatalogData,
  ServiceCatalogFilters,
  ServiceCatalogPagination,
  ServiceItem,
  ServiceItemCreatePayload,
  ServiceItemFieldError,
} from "./service-catalog.types";

const NAME_MAX = 120;
const CATEGORY_MAX = 60;
const STATUS_MAX = 40;
const DESCRIPTION_MAX = 2000;

export function adaptServiceCatalogResponse(
  response: unknown,
  source: ServiceCatalogData["source"] = "api",
  fallbackReason?: string,
): ServiceCatalogData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptServiceItem(item)).filter((item): item is ServiceItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptServiceItemResponse(response: unknown): ServiceItem | null {
  const payload = readRecord(response);
  return adaptServiceItem(readRecord(payload?.data) ?? response);
}

export function filterServiceItems(items: readonly ServiceItem[], filters: ServiceCatalogFilters): ServiceItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.name, item.category, item.description, item.status]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateServiceItem(input: ServiceItemCreatePayload): ServiceItemFieldError[] {
  const errors: ServiceItemFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const category = (input.category ?? "").trim();
  if (category && category.length > CATEGORY_MAX) errors.push({ field: "category", message: `Categoria deve ter no máximo ${CATEGORY_MAX} caracteres.` });

  const status = (input.status ?? "").trim();
  if (status && status.length > STATUS_MAX) errors.push({ field: "status", message: `Status deve ter no máximo ${STATUS_MAX} caracteres.` });

  if (input.estimatedDurationMinutes !== undefined && input.estimatedDurationMinutes !== null) {
    const duration = input.estimatedDurationMinutes;
    if (!Number.isInteger(duration) || duration < 0) {
      errors.push({ field: "estimatedDurationMinutes", message: "Duração estimada deve ser um número inteiro de minutos (0 ou mais)." });
    }
  }

  if (input.basePrice !== undefined && input.basePrice !== null) {
    const price = input.basePrice;
    if (!Number.isFinite(price) || price < 0) {
      errors.push({ field: "basePrice", message: "Preço base deve ser igual ou maior que zero." });
    }
  }

  const description = input.description ?? "";
  if (description.length > DESCRIPTION_MAX) errors.push({ field: "description", message: `Descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.` });

  return errors;
}

// Situação de cadastro do serviço (masculino: "Ativo"/"Inativo") — distinta do status operacional.
export function getServiceStatusLabel(isActive: boolean): string {
  return isActive ? "Ativo" : "Inativo";
}

export function getServiceStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Status operacional do serviço (token técnico -> rótulo PT-BR; nunca exibir o token cru).
// Distinto do chip de Situação (isActive) para as colunas não colidirem.
export const SERVICE_STATUS_OPTIONS = [
  { value: "active", label: "Disponível" },
  { value: "suspended", label: "Suspenso" },
  { value: "inactive", label: "Descontinuado" },
] as const;

export function getServiceStatusOptionLabel(status: string | null | undefined): string {
  return SERVICE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Disponível";
}

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rem = total % 60;
  return rem === 0 ? `${hours}h` : `${hours}h${String(rem).padStart(2, "0")}`;
}

export function formatServiceDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptServiceItem(input: unknown): ServiceItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    description: readNullableString(item, ["description"]),
    category: readNullableString(item, ["category"]),
    estimatedDurationMinutes: readNullableNumber(item, ["estimatedDurationMinutes", "estimated_duration_minutes"]),
    basePrice: readNullableNumber(item, ["basePrice", "base_price"]),
    status: readString(item, ["status"]) ?? "active",
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): ServiceCatalogPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
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
