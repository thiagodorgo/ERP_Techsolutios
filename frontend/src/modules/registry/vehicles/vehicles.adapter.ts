import type {
  Vehicle,
  VehicleCreatePayload,
  VehicleFieldError,
  VehiclesData,
  VehiclesFilters,
  VehiclesPagination,
} from "./vehicles.types";

const PLATE_MAX = 10;
const MODEL_MAX = 120;
const TYPE_MAX = 60;
const STATUS_MAX = 40;
const NOTES_MAX = 2000;
const YEAR_MIN = 1900;
const YEAR_MAX = new Date().getFullYear() + 1;

export function adaptVehiclesResponse(response: unknown, source: VehiclesData["source"] = "api", fallbackReason?: string): VehiclesData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptVehicle(item)).filter((item): item is Vehicle => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptVehicleResponse(response: unknown): Vehicle | null {
  const payload = readRecord(response);
  return adaptVehicle(readRecord(payload?.data) ?? response);
}

export function filterVehicles(items: readonly Vehicle[], filters: VehiclesFilters): Vehicle[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (filters.isActive === "active" && !item.isActive) return false;
    if (filters.isActive === "inactive" && item.isActive) return false;
    if (!search) return true;

    return [item.plate, item.model, item.type, item.status, item.year ? String(item.year) : null]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateVehicle(input: VehicleCreatePayload): VehicleFieldError[] {
  const errors: VehicleFieldError[] = [];

  const plate = (input.plate ?? "").trim();
  if (!plate) errors.push({ field: "plate", message: "Placa é obrigatória." });
  else if (plate.length > PLATE_MAX) errors.push({ field: "plate", message: `Placa deve ter no máximo ${PLATE_MAX} caracteres.` });

  const model = (input.model ?? "").trim();
  if (!model) errors.push({ field: "model", message: "Modelo é obrigatório." });
  else if (model.length > MODEL_MAX) errors.push({ field: "model", message: `Modelo deve ter no máximo ${MODEL_MAX} caracteres.` });

  const type = (input.type ?? "").trim();
  if (type && type.length > TYPE_MAX) errors.push({ field: "type", message: `Tipo deve ter no máximo ${TYPE_MAX} caracteres.` });

  const status = (input.status ?? "").trim();
  if (status && status.length > STATUS_MAX) errors.push({ field: "status", message: `Situação operacional deve ter no máximo ${STATUS_MAX} caracteres.` });

  if (input.year !== undefined && input.year !== null) {
    const year = input.year;
    if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) {
      errors.push({ field: "year", message: `Ano deve estar entre ${YEAR_MIN} e ${YEAR_MAX}.` });
    }
  }

  const notes = input.notes ?? "";
  if (notes.length > NOTES_MAX) errors.push({ field: "notes", message: `Observações devem ter no máximo ${NOTES_MAX} caracteres.` });

  return errors;
}

export function getVehicleStatusLabel(isActive: boolean): string {
  return isActive ? "Ativa" : "Inativa";
}

export function getVehicleStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
}

// Situação operacional da viatura (token técnico -> rótulo PT-BR; nunca exibir o token cru).
export const VEHICLE_STATUS_OPTIONS = [
  { value: "active", label: "Em operação" },
  { value: "maintenance", label: "Em manutenção" },
  { value: "inactive", label: "Fora de operação" },
] as const;

export function getVehicleOperationalStatusLabel(status: string | null | undefined): string {
  return VEHICLE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Em operação";
}

export function formatVehicleYear(year: number | null | undefined): string {
  return year ? String(year) : "—";
}

export function formatVehicleDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function adaptVehicle(input: unknown): Vehicle | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const plate = readString(item, ["plate"]);
  const model = readString(item, ["model"]);
  if (!id || !plate || !model) return null;

  return {
    id,
    plate,
    model,
    type: readNullableString(item, ["type"]),
    year: readNullableNumber(item, ["year"]),
    status: readString(item, ["status"]) ?? "active",
    notes: readNullableString(item, ["notes"]),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): VehiclesPagination {
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
