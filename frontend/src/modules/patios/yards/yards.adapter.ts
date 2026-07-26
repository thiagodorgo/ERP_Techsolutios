import type {
  YardAreaItem,
  YardAreaKind,
  YardCreatePayload,
  YardFieldError,
  YardItem,
  YardOccupancySummary,
  YardSpotItem,
  YardSpotStatus,
  YardsData,
  YardsFilters,
  YardsPagination,
  YardVehicleClass,
} from "./yards.types";

const NAME_MAX = 160;
const ADDRESS_MAX = 240;
const TIMEZONE_MAX = 64;
const CODE_MAX = 40;

const KINDS: readonly YardAreaKind[] = ["BLOCK", "CORRIDOR", "ROW"];
const VEHICLE_CLASSES: readonly YardVehicleClass[] = ["ANY", "MOTORCYCLE", "HEAVY"];
const SPOT_STATUSES: readonly YardSpotStatus[] = ["FREE", "OCCUPIED", "BLOCKED"];

// Rótulos PT-BR de fallback (o backend já devolve *Label; a UI reusa e só cai aqui se ausente). Neutralidade
// white-label: "Quadra/Corredor/Fileira", "Qualquer/Motocicleta/Pesado", "Livre/Ocupada/Bloqueada".
const KIND_LABELS: Record<YardAreaKind, string> = { BLOCK: "Quadra", CORRIDOR: "Corredor", ROW: "Fileira" };
const VEHICLE_CLASS_LABELS: Record<YardVehicleClass, string> = { ANY: "Qualquer veículo", MOTORCYCLE: "Motocicleta", HEAVY: "Pesado" };
const SPOT_STATUS_LABELS: Record<YardSpotStatus, string> = { FREE: "Livre", OCCUPIED: "Ocupada", BLOCKED: "Bloqueada" };

export function getKindLabel(kind: YardAreaKind | string | null | undefined): string {
  return KIND_LABELS[(kind ?? "BLOCK") as YardAreaKind] ?? "Área";
}

export function getVehicleClassLabel(vehicleClass: YardVehicleClass | string | null | undefined): string {
  return VEHICLE_CLASS_LABELS[(vehicleClass ?? "ANY") as YardVehicleClass] ?? "Qualquer veículo";
}

export function getSpotStatusLabel(status: YardSpotStatus | string | null | undefined): string {
  return SPOT_STATUS_LABELS[(status ?? "FREE") as YardSpotStatus] ?? "Livre";
}

export function getSpotStatusTone(status: YardSpotStatus | string | null | undefined) {
  if (status === "OCCUPIED") return "warning" as const;
  if (status === "BLOCKED") return "danger" as const;
  return "success" as const;
}

export function getYardActiveLabel(active: boolean): string {
  return active ? "Ativo" : "Inativo";
}

export function getYardActiveTone(active: boolean) {
  return active ? ("success" as const) : ("default" as const);
}

export function adaptYardsResponse(response: unknown, source: YardsData["source"] = "api", fallbackReason?: string): YardsData {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? readArray(payload?.data) ?? [];
  const items = itemsSource.map((item) => adaptYard(item)).filter((item): item is YardItem => Boolean(item));

  return { items, pagination: adaptPagination(payload, dataRecord, items.length), source, fallbackReason };
}

export function adaptYardResponse(response: unknown): YardItem | null {
  const payload = readRecord(response);
  return adaptYard(readRecord(payload?.data) ?? response);
}

export function adaptYardAreasResponse(response: unknown): YardAreaItem[] {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response) ? response : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? [];
  return itemsSource.map((item) => adaptArea(item)).filter((item): item is YardAreaItem => Boolean(item));
}

export function adaptYardAreaResponse(response: unknown): YardAreaItem | null {
  const payload = readRecord(response);
  return adaptArea(readRecord(payload?.data) ?? response);
}

export function adaptYardSpotsResponse(response: unknown): YardSpotItem[] {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data);
  const itemsSource = Array.isArray(response) ? response : readArray(dataRecord?.items) ?? readArray(payload?.items) ?? [];
  return itemsSource.map((item) => adaptSpot(item)).filter((item): item is YardSpotItem => Boolean(item));
}

export function adaptYardSpotResponse(response: unknown): YardSpotItem | null {
  const payload = readRecord(response);
  return adaptSpot(readRecord(payload?.data) ?? response);
}

export function adaptYardOccupancyResponse(response: unknown): YardOccupancySummary {
  const payload = readRecord(response);
  const dataRecord = readRecord(payload?.data) ?? payload;
  const summary = readRecord(dataRecord?.summary);
  return {
    total: readNumber(summary, ["total"]) ?? 0,
    free: readNumber(summary, ["free"]) ?? 0,
    occupied: readNumber(summary, ["occupied"]) ?? 0,
    blocked: readNumber(summary, ["blocked"]) ?? 0,
  };
}

export function filterYards(items: readonly YardItem[], filters: { search: string; isActive: YardsFilters["isActive"] }): YardItem[] {
  const search = normalize(filters.search);
  return items.filter((item) => {
    if (filters.isActive === "active" && !item.active) return false;
    if (filters.isActive === "inactive" && item.active) return false;
    if (!search) return true;
    return [item.name, item.address, item.timezone].filter(Boolean).some((value) => normalize(String(value)).includes(search));
  });
}

export function validateYard(input: YardCreatePayload): YardFieldError[] {
  const errors: YardFieldError[] = [];

  const name = (input.name ?? "").trim();
  if (!name) errors.push({ field: "name", message: "Nome é obrigatório." });
  else if (name.length > NAME_MAX) errors.push({ field: "name", message: `Nome deve ter no máximo ${NAME_MAX} caracteres.` });

  const address = (input.address ?? "").trim();
  if (!address) errors.push({ field: "address", message: "Endereço é obrigatório." });
  else if (address.length > ADDRESS_MAX) errors.push({ field: "address", message: `Endereço deve ter no máximo ${ADDRESS_MAX} caracteres.` });

  const timezone = (input.timezone ?? "").trim();
  if (timezone && timezone.length > TIMEZONE_MAX) errors.push({ field: "timezone", message: `Fuso horário deve ter no máximo ${TIMEZONE_MAX} caracteres.` });

  if (input.capacityHint !== undefined && input.capacityHint !== null) {
    if (!Number.isInteger(input.capacityHint) || input.capacityHint < 0) {
      errors.push({ field: "capacityHint", message: "Capacidade prevista deve ser um número inteiro não negativo." });
    }
  }

  return errors;
}

export function validateSpotCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return "Código da vaga é obrigatório.";
  if (trimmed.length > CODE_MAX) return `Código deve ter no máximo ${CODE_MAX} caracteres.`;
  return null;
}

export function validateAreaName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Nome da área é obrigatório.";
  if (trimmed.length > NAME_MAX) return `Nome deve ter no máximo ${NAME_MAX} caracteres.`;
  return null;
}

export function formatYardDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function adaptYard(input: unknown): YardItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  return {
    id,
    name,
    address: readString(item, ["address"]) ?? "",
    capacityHint: readNumber(item, ["capacityHint", "capacity_hint"]) ?? null,
    timezone: readString(item, ["timezone"]) ?? "America/Sao_Paulo",
    active: readBoolean(item, ["active"]) ?? true,
    createdAt: readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
    updatedAt: readString(item, ["updatedAt", "updated_at"]) ?? readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString(),
  };
}

function adaptArea(input: unknown): YardAreaItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const name = readString(item, ["name"]);
  if (!id || !name) return null;

  const rawKind = readString(item, ["kind"]);
  const kind = (rawKind && KINDS.includes(rawKind as YardAreaKind) ? rawKind : "BLOCK") as YardAreaKind;
  const rawClass = readString(item, ["vehicleClass", "vehicle_class"]);
  const vehicleClass = (rawClass && VEHICLE_CLASSES.includes(rawClass as YardVehicleClass) ? rawClass : "ANY") as YardVehicleClass;

  return {
    id,
    yardId: readString(item, ["yardId", "yard_id"]) ?? "",
    parentId: readString(item, ["parentId", "parent_id"]) ?? null,
    kind,
    kindLabel: readString(item, ["kindLabel"]) ?? getKindLabel(kind),
    name,
    covered: readBoolean(item, ["covered"]) ?? false,
    vehicleClass,
    vehicleClassLabel: readString(item, ["vehicleClassLabel"]) ?? getVehicleClassLabel(vehicleClass),
  };
}

function adaptSpot(input: unknown): YardSpotItem | null {
  const item = readRecord(input);
  if (!item) return null;
  const id = readString(item, ["id"]);
  const code = readString(item, ["code"]);
  if (!id || !code) return null;

  const rawClass = readString(item, ["vehicleClass", "vehicle_class"]);
  const vehicleClass = (rawClass && VEHICLE_CLASSES.includes(rawClass as YardVehicleClass) ? rawClass : "ANY") as YardVehicleClass;
  const rawStatus = readString(item, ["status"]);
  const status = (rawStatus && SPOT_STATUSES.includes(rawStatus as YardSpotStatus) ? rawStatus : "FREE") as YardSpotStatus;

  return {
    id,
    areaId: readString(item, ["areaId", "area_id"]) ?? "",
    code,
    covered: readBoolean(item, ["covered"]) ?? false,
    vehicleClass,
    vehicleClassLabel: readString(item, ["vehicleClassLabel"]) ?? getVehicleClassLabel(vehicleClass),
    status,
    statusLabel: readString(item, ["statusLabel"]) ?? getSpotStatusLabel(status),
  };
}

function adaptPagination(
  payload: Record<string, unknown> | undefined,
  dataRecord: Record<string, unknown> | undefined,
  fallbackTotal: number,
): YardsPagination {
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

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
