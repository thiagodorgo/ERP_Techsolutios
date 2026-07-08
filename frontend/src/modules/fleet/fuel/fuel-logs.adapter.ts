import { formatBRL } from "../../registry/service-catalog/service-catalog.adapter";
import type {
  FuelLog,
  FuelLogDraft,
  FuelLogFieldError,
  FuelLogsData,
  FuelLogsPagination,
  FuelLogsStatusFilter,
} from "./fuel-logs.types";

const STATION_MAX = 120;
const NOTES_MAX = 2000;

// Combustível: token técnico do backend -> rótulo PT-BR (nunca exibir o token cru na UI).
export const FUEL_TYPE_OPTIONS = [
  { value: "gasolina", label: "Gasolina" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "diesel_s10", label: "Diesel S10" },
  { value: "gnv", label: "GNV" },
  { value: "eletrico", label: "Elétrico" },
] as const;

const FUEL_TYPE_VALUES = FUEL_TYPE_OPTIONS.map((option) => option.value);

// Reexport do formatador de moeda do repo (fonte única — Catálogo de Serviço).
export { formatBRL };

export function adaptFuelLogsResponse(response: unknown, source: FuelLogsData["source"] = "api", fallbackReason?: string): FuelLogsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptFuelLog(item)).filter((item): item is FuelLog => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, dataRecord, items.length),
    source,
    fallbackReason,
  };
}

export function adaptFuelLogResponse(response: unknown): FuelLog | null {
  const payload = readRecord(response);
  return adaptFuelLog(readRecord(payload?.data) ?? response);
}

export type FuelLogFilterCriteria = {
  readonly search: string;
  readonly isActive: FuelLogsStatusFilter;
  readonly vehicleId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly resolveVehicleName?: (vehicleId: string) => string | undefined;
};

export function filterFuelLogs(items: readonly FuelLog[], criteria: FuelLogFilterCriteria): FuelLog[] {
  const search = normalize(criteria.search);
  const fromTs = criteria.from ? Date.parse(`${criteria.from}T00:00:00`) : undefined;
  const toTs = criteria.to ? Date.parse(`${criteria.to}T23:59:59.999`) : undefined;

  return items.filter((log) => {
    if (criteria.isActive === "active" && !log.isActive) return false;
    if (criteria.isActive === "inactive" && log.isActive) return false;
    if (criteria.vehicleId && log.vehicleId !== criteria.vehicleId) return false;

    const ts = Date.parse(log.fueledAt);
    if (Number.isFinite(ts)) {
      if (fromTs !== undefined && Number.isFinite(fromTs) && ts < fromTs) return false;
      if (toTs !== undefined && Number.isFinite(toTs) && ts > toTs) return false;
    }

    if (!search) return true;
    const vehicleName = criteria.resolveVehicleName?.(log.vehicleId) ?? "";
    return [vehicleName, log.station, log.notes, getFuelTypeLabel(log.fuelType)]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function validateFuelLog(input: FuelLogDraft): FuelLogFieldError[] {
  const errors: FuelLogFieldError[] = [];

  if (!input.vehicleId?.trim()) errors.push({ field: "vehicleId", message: "Selecione a viatura." });

  const fueledAt = (input.fueledAt ?? "").trim();
  if (!fueledAt) errors.push({ field: "fueledAt", message: "Informe a data do abastecimento." });
  else if (Number.isNaN(new Date(fueledAt).getTime())) errors.push({ field: "fueledAt", message: "Data do abastecimento inválida." });

  if (!input.fuelType || !FUEL_TYPE_VALUES.includes(input.fuelType as (typeof FUEL_TYPE_VALUES)[number])) {
    errors.push({ field: "fuelType", message: "Selecione o combustível." });
  }

  if (input.liters === undefined || !Number.isFinite(input.liters) || input.liters <= 0) {
    errors.push({ field: "liters", message: "Litros deve ser maior que zero." });
  }

  if (input.totalValue === undefined || !Number.isFinite(input.totalValue) || input.totalValue < 0) {
    errors.push({ field: "totalValue", message: "Valor deve ser igual ou maior que zero." });
  }

  if (input.odometer === undefined || !Number.isInteger(input.odometer) || input.odometer < 0) {
    errors.push({ field: "odometer", message: "Odômetro deve ser um número inteiro (0 ou mais)." });
  }

  const station = (input.station ?? "").trim();
  if (station && station.length > STATION_MAX) errors.push({ field: "station", message: `Posto deve ter no máximo ${STATION_MAX} caracteres.` });

  const notes = input.notes ?? "";
  if (notes.length > NOTES_MAX) errors.push({ field: "notes", message: `Observações devem ter no máximo ${NOTES_MAX} caracteres.` });

  return errors;
}

// R1.2 — odômetro regressivo: o backend responde 422 (error.reason="odometer_regressive").
// O cliente só conhece o status (a resposta crua não é exposta pela ApiError); em F1 o único 422
// documentado de FuelLog é esse, então mapeamos status 422 -> erro sob o campo Odômetro.
export const ODOMETER_REGRESSIVE_MESSAGE =
  "Odômetro menor que o último registrado para esta viatura. Corrija a leitura para continuar.";

export type FuelLogSubmitFeedback = {
  readonly field?: FuelLogFieldError["field"];
  readonly message: string;
};

export function interpretFuelLogSubmitError(error: unknown): FuelLogSubmitFeedback {
  if (readErrorStatus(error) === 422) {
    return { field: "odometer", message: ODOMETER_REGRESSIVE_MESSAGE };
  }
  if (error instanceof Error && error.message) return { message: error.message };
  return { message: "Não foi possível salvar o abastecimento. Tente novamente." };
}

export type FuelTotals = {
  readonly count: number;
  readonly totalLiters: number;
  readonly totalValue: number;
  // km/L médio da frota = média das eficiências por viatura na janela (R1.3). `null` sem dados derivados.
  readonly fleetKmPerL: number | null;
  readonly vehiclesWithEfficiency: number;
};

export function computeFuelTotals(items: readonly FuelLog[]): FuelTotals {
  let totalLiters = 0;
  let totalValue = 0;
  const perVehicle = new Map<string, { dist: number; liters: number }>();

  for (const log of items) {
    if (Number.isFinite(log.liters)) totalLiters += log.liters;
    if (Number.isFinite(log.totalValue)) totalValue += log.totalValue;

    // Só lançamentos com eficiência derivada (não-baseline) entram na média por viatura.
    if (log.kmPerLiter != null && log.distanceKm != null && log.distanceKm > 0 && log.liters > 0) {
      const agg = perVehicle.get(log.vehicleId) ?? { dist: 0, liters: 0 };
      agg.dist += log.distanceKm;
      agg.liters += log.liters;
      perVehicle.set(log.vehicleId, agg);
    }
  }

  const vehicleAverages: number[] = [];
  for (const { dist, liters } of perVehicle.values()) {
    if (liters > 0) vehicleAverages.push(dist / liters);
  }
  const fleetKmPerL = vehicleAverages.length > 0 ? vehicleAverages.reduce((sum, value) => sum + value, 0) / vehicleAverages.length : null;

  return { count: items.length, totalLiters, totalValue, fleetKmPerL, vehiclesWithEfficiency: vehicleAverages.length };
}

export function getFuelTypeLabel(value: string | null | undefined): string {
  return FUEL_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "—";
}

export function getFuelStatusLabel(isActive: boolean): string {
  return isActive ? "Ativo" : "Inativo";
}

export function getFuelStatusTone(isActive: boolean) {
  return isActive ? ("success" as const) : ("default" as const);
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

export function formatLiters(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

// km/L derivado: "—" para o lançamento baseline (sem odômetro anterior) ou valor ausente.
export function formatKmPerLiter(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatOdometer(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("pt-BR")} km`;
}

export function formatFuelDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function adaptFuelLog(input: unknown): FuelLog | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const vehicleId = readString(item, ["vehicleId", "vehicle_id"]);
  if (!id || !vehicleId) return null;

  const liters = readNumber(item, ["liters"]) ?? 0;
  const totalValue = readNumber(item, ["totalValue", "total_value"]) ?? 0;
  const odometer = readNumber(item, ["odometer"]) ?? 0;

  return {
    id,
    vehicleId,
    operatorId: readNullableString(item, ["operatorId", "operator_id"]),
    workOrderId: readNullableString(item, ["workOrderId", "work_order_id"]),
    fueledAt: readString(item, ["fueledAt", "fueled_at"]) ?? new Date().toISOString(),
    fuelType: readString(item, ["fuelType", "fuel_type"]) ?? "gasolina",
    liters,
    totalValue,
    odometer,
    station: readNullableString(item, ["station"]),
    notes: readNullableString(item, ["notes"]),
    isActive: readBoolean(item, ["isActive", "is_active"]) ?? true,
    // Derivados read-only: passam direto do DTO; `null` preservado (baseline).
    kmPerLiter: readNullableNumber(item, ["kmPerLiter", "km_per_liter"]),
    distanceKm: readNullableNumber(item, ["distanceKm", "distance_km"]),
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): FuelLogsPagination {
  const pagination = readRecord(dataRecord?.pagination) ?? readRecord(payload?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
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
