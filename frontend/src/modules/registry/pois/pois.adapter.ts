import type {
  PoiCreatePayload,
  PoiFieldError,
  PoiItem,
  PoisData,
  PoisFilters,
  PoisPagination,
} from "./pois.types";

const NAME_MAX = 160;
const CATEGORY_MAX = 80;
const ADDRESS_MAX = 240;
const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;
const COORD_DECIMALS = 6;

export function adaptPoisResponse(response: unknown, source: PoisData["source"] = "api", fallbackReason?: string): PoisData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptPoi(item)).filter((item): item is PoiItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptPoiResponse(response: unknown): PoiItem | null {
  const payload = readRecord(response);
  return adaptPoi(readRecord(payload?.data) ?? response);
}

export function filterPois(items: readonly PoiItem[], filters: { search: string; isActive: PoisFilters["isActive"] }): PoiItem[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.name, item.category, item.address]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

// Valida uma latitude isolada (finita e dentro de -90..90). Exportada para reuso no client-side.
export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= LAT_MIN && value <= LAT_MAX;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= LNG_MIN && value <= LNG_MAX;
}

export function validatePoi(input: PoiCreatePayload): PoiFieldError[] {
  const errors: PoiFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const { latitude, longitude } = input;
  if (latitude === undefined || latitude === null || !Number.isFinite(latitude)) {
    errors.push({ field: "latitude", message: "Latitude é obrigatória." });
  } else if (!isValidLatitude(latitude)) {
    errors.push({ field: "latitude", message: "Latitude deve estar entre -90 e 90." });
  }

  if (longitude === undefined || longitude === null || !Number.isFinite(longitude)) {
    errors.push({ field: "longitude", message: "Longitude é obrigatória." });
  } else if (!isValidLongitude(longitude)) {
    errors.push({ field: "longitude", message: "Longitude deve estar entre -180 e 180." });
  }

  // Rejeita a "ilha nula" (0, 0) — quase sempre coordenada não preenchida, nunca um POI real.
  if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude === 0 && longitude === 0) {
    errors.push({ field: "latitude", message: "Informe uma coordenada válida (0, 0 não é permitido)." });
  }

  const category = (input.category ?? "").trim();
  if (category.length > CATEGORY_MAX) errors.push({ field: "category", message: `Categoria deve ter no máximo ${CATEGORY_MAX} caracteres.` });

  const address = (input.address ?? "").trim();
  if (address.length > ADDRESS_MAX) errors.push({ field: "address", message: `Endereço deve ter no máximo ${ADDRESS_MAX} caracteres.` });

  return errors;
}

// Situação de cadastro (isActive) — ponto é MASCULINO ("Ativo"/"Inativo").
export function getPoiStatusLabel(isActive: boolean): string {
  return isActive ? "Ativo" : "Inativo";
}

export function getPoiStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Coordenada em formato geográfico (ponto decimal, até 6 casas), ex.: "-23.55052, -46.63331".
// NÃO usa formatação pt-BR (vírgula é separador de campo, não decimal).
export function formatCoordinatePart(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10 ** COORD_DECIMALS) / 10 ** COORD_DECIMALS;
  return String(rounded);
}

export function formatCoordinate(latitude: number | null | undefined, longitude: number | null | undefined): string {
  const lat = formatCoordinatePart(latitude);
  const lng = formatCoordinatePart(longitude);
  if (lat === "—" || lng === "—") return "—";
  return `${lat}, ${lng}`;
}

// Trunca o endereço para a densidade da lista; o texto completo fica no `title` da célula.
export function truncateText(value: string | null | undefined, max = 80): string {
  const text = (value ?? "").trim();
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function formatPoiDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptPoi(input: unknown): PoiItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  const latitude = readNumber(item, ["latitude", "lat"]);
  const longitude = readNumber(item, ["longitude", "lng", "lon"]);
  // Sem id/nome ou sem coordenada válida → descartado (nunca renderiza POI sem localização).
  if (!id || !name || latitude === undefined || longitude === undefined) return null;
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;

  return {
    id,
    name,
    category: readNullableString(item, ["category"]),
    latitude,
    longitude,
    address: readNullableString(item, ["address"]),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): PoisPagination {
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
