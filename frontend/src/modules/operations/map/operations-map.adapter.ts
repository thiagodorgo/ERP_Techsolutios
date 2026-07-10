import type {
  FieldLocationItem,
  FieldLocationStatus,
  OperationsMapFilters,
  OperationsMapDispatch,
  OperationsMapSummary,
  OperationsMapWorkOrder,
  OperationsMapWorkOrderPin,
  OperationsMapWorkOrderWithoutLocation,
} from "./operations-map.types";
import { isValidMapCoordinate } from "./map/mapMarkers";
import type { DispatchListItem, DispatchStatus } from "../dispatches/dispatches.types";
import type { WorkOrderListItem, WorkOrderStatus } from "../../work-orders/work-orders.types";
import type { MaintenanceOrder } from "../../fleet/maintenance/maintenance-orders.types";
import type { InsurancePolicy } from "../../fleet/insurance/insurance.types";

// R6.1 — limiar de "localização antiga" (stale). Registro com captura mais velha
// que isto ganha alerta explícito "Último visto há X" no pin e no painel lateral.
export const FIELD_LOCATION_STALE_THRESHOLD_MS = 15 * 60 * 1000;

// R6.1 — derivação client-side do stale (usada quando a API não envia flag própria).
export function isFieldLocationTimestampStale(capturedAtMs: number, nowMs: number): boolean {
  return nowMs - capturedAtMs > FIELD_LOCATION_STALE_THRESHOLD_MS;
}

// R6.1 — "Último visto há X" (PT-BR, sem jargão técnico).
export function formatLastSeen(capturedAt: string | undefined, now: Date = new Date()): string {
  if (!capturedAt) return "sem registro";
  const capturedTime = Date.parse(capturedAt);
  if (Number.isNaN(capturedTime)) return "sem registro";

  const diffMinutes = Math.floor((now.getTime() - capturedTime) / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) return minutes > 0 ? `há ${hours} h ${minutes} min` : `há ${hours} h`;

  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

export function adaptFieldLocationsResponse(
  response: unknown,
  options: { readonly now?: Date } = {},
): FieldLocationItem[] {
  return readArray(response)
    .map((item, index) => adaptFieldLocationItem(item, index, options.now ?? new Date()))
    .filter((item): item is FieldLocationItem => item !== null)
    .sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt));
}

export function filterFieldLocations(
  locations: readonly FieldLocationItem[],
  filters: OperationsMapFilters,
): FieldLocationItem[] {
  const search = normalizeText(filters.search);

  return locations.filter((location) => {
    if (filters.status !== "all" && location.status !== filters.status) return false;
    if (filters.team !== "all" && (location.teamName ?? "Sem equipe") !== filters.team) return false;
    if (filters.staleOnly && !location.isStale) return false;
    if (!search) return true;

    return [location.displayName, location.operatorName, location.operatorId, location.teamName]
      .filter(Boolean)
      .some((value) => normalizeText(String(value)).includes(search));
  });
}

export function filterFieldLocationsByWorkOrder(
  locations: readonly FieldLocationItem[],
  workOrderId: string | undefined,
): FieldLocationItem[] {
  const normalizedWorkOrderId = workOrderId?.trim();
  if (!normalizedWorkOrderId) return [...locations];

  return locations.filter((location) => isLocationLinkedToWorkOrder(location, normalizedWorkOrderId));
}

export function attachWorkOrdersToFieldLocations(
  locations: readonly FieldLocationItem[],
  workOrders: readonly WorkOrderListItem[],
): FieldLocationItem[] {
  const activeWorkOrders = workOrders
    .filter((workOrder) => !isTerminalWorkOrderStatus(workOrder.status))
    .sort(compareWorkOrdersForMap);

  return locations.map((location) => ({
    ...location,
    currentWorkOrder: toOperationsMapWorkOrder(
      activeWorkOrders.find((workOrder) => isWorkOrderAssignedToLocation(workOrder, location)),
    ),
  }));
}

/**
 * Ω1b — separa as OS abertas em (a) pins com coordenada válida e (b) sem localização (têm endereço
 * mas ainda não geocodificadas). Usa o predicado ÚNICO `isValidMapCoordinate` (R2) para que uma OS
 * com coord inválida-porém-presente caia em `withoutLocation` em vez de sumir. OS terminal e OS sem
 * coord E sem endereço são descartadas (nada a mostrar). Recebe a lista COMPLETA de OS lidas (R9).
 */
export function selectMappableWorkOrders(workOrders: readonly WorkOrderListItem[]): {
  readonly withLocation: OperationsMapWorkOrderPin[];
  readonly withoutLocation: OperationsMapWorkOrderWithoutLocation[];
} {
  const withLocation: OperationsMapWorkOrderPin[] = [];
  const withoutLocation: OperationsMapWorkOrderWithoutLocation[] = [];

  for (const workOrder of workOrders) {
    if (isTerminalWorkOrderStatus(workOrder.status)) continue;

    if (isValidMapCoordinate(workOrder.serviceLatitude, workOrder.serviceLongitude)) {
      withLocation.push({
        id: workOrder.id,
        code: workOrder.code,
        title: workOrder.title,
        priority: workOrder.priority,
        status: workOrder.status,
        customerName: workOrder.customerName ?? null,
        serviceAddress: workOrder.serviceAddress ?? null,
        latitude: workOrder.serviceLatitude as number,
        longitude: workOrder.serviceLongitude as number,
      });
      continue;
    }

    // Sem coordenada válida: só entra no painel se houver endereço para geocodificar depois.
    if ((workOrder.serviceAddress ?? "").trim()) {
      withoutLocation.push({
        id: workOrder.id,
        code: workOrder.code,
        title: workOrder.title,
        priority: workOrder.priority,
        customerName: workOrder.customerName ?? null,
        serviceAddress: workOrder.serviceAddress ?? null,
      });
    }
  }

  return { withLocation, withoutLocation };
}

export function attachDispatchesToFieldLocations(
  locations: readonly FieldLocationItem[],
  dispatches: readonly DispatchListItem[],
): FieldLocationItem[] {
  const dispatchesByPriority = [...dispatches].sort(compareDispatchesForMap);

  return locations.map((location) => ({
    ...location,
    currentDispatch: toOperationsMapDispatch(
      dispatchesByPriority.find((dispatch) => isDispatchLinkedToLocation(dispatch, location)),
    ),
  }));
}

export function calculateOperationsMapSummary(locations: readonly FieldLocationItem[]): OperationsMapSummary {
  return {
    total: locations.length,
    available: locations.filter((location) => location.status === "available").length,
    onRoute: locations.filter((location) => location.status === "on_route").length,
    inService: locations.filter((location) => location.status === "in_service" || location.status === "on_site").length,
    stale: locations.filter((location) => location.isStale).length,
    offlineOrBlocked: locations.filter((location) => location.status === "offline" || location.status === "blocked").length,
  };
}

export function listOperationTeams(locations: readonly FieldLocationItem[]): string[] {
  return [...new Set(locations.map((location) => location.teamName ?? "Sem equipe"))].sort((left, right) => left.localeCompare(right));
}

export function getFieldLocationStatusLabel(status: FieldLocationStatus): string {
  const labels: Record<FieldLocationStatus, string> = {
    available: "Disponível",
    on_route: "Em deslocamento",
    on_site: "No local",
    in_service: "Em atendimento",
    paused: "Pausado",
    offline: "Offline",
    blocked: "Bloqueado",
    unknown: "Desconhecido",
  };

  return labels[status];
}

export function getFieldLocationStatusTone(status: FieldLocationStatus, isStale = false) {
  if (isStale) return "warning" as const;
  if (status === "available") return "success" as const;
  if (status === "on_route" || status === "on_site") return "info" as const;
  if (status === "in_service") return "pending" as const;
  if (status === "paused") return "warning" as const;
  if (status === "blocked") return "danger" as const;
  return "default" as const;
}

export function formatFieldLocationDate(value: string | undefined): string {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBattery(value: number | null | undefined): string {
  return typeof value === "number" ? `${value}%` : "N/D";
}

export function formatSpeed(value: number | null | undefined): string {
  // API envia metros/segundo (speedMetersPerSecond); a UI fala km/h.
  return typeof value === "number" ? `${Math.round(value * 3.6)} km/h` : "N/D";
}

// ————— R6.4 — badges de Frota no pin/painel (dados reais, permission-gated) —————

export type OperationsMapVehicleBadges = {
  readonly vehicleId: string;
  readonly inMaintenance: boolean;
  readonly missingInsurance: boolean;
};

// Viaturas com ordem de manutenção EM EXECUÇÃO (F2) — só linhas ativas contam.
export function deriveMaintenanceVehicleIds(orders: readonly MaintenanceOrder[]): string[] {
  return [...new Set(orders.filter((order) => order.status === "em_execucao" && order.isActive).map((order) => order.vehicleId))];
}

// Viaturas COM apólice vigente (F4) — quem estiver fora deste conjunto está "Sem seguro" (R4.3).
export function deriveInsuredVehicleIds(policies: readonly InsurancePolicy[]): string[] {
  return [...new Set(policies.filter((policy) => policy.status === "vigente" && policy.isActive).map((policy) => policy.vehicleId))];
}

// Badges do pin: exigem OS ativa com viatura vinculada. Cada badge só é derivado
// quando o conjunto correspondente veio de fonte real (permissão + API ok) —
// conjunto ausente (undefined) nunca gera badge, para não acusar falso "Sem seguro".
export function getVehicleFleetBadges(
  location: FieldLocationItem,
  sets: { readonly maintenanceVehicleIds?: readonly string[]; readonly insuredVehicleIds?: readonly string[] },
): OperationsMapVehicleBadges | null {
  const vehicleId = location.currentWorkOrder?.vehicleId;
  if (!vehicleId) return null;

  const inMaintenance = sets.maintenanceVehicleIds ? sets.maintenanceVehicleIds.includes(vehicleId) : false;
  const missingInsurance = sets.insuredVehicleIds ? !sets.insuredVehicleIds.includes(vehicleId) : false;
  if (!inMaintenance && !missingInsurance) return null;

  return { vehicleId, inMaintenance, missingInsurance };
}

export function formatAccuracy(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value)} m` : "N/D";
}

export function getMarkerPosition(location: FieldLocationItem, locations: readonly FieldLocationItem[]) {
  const bounds = calculateBounds(locations);
  const longitudeRange = bounds.maxLongitude - bounds.minLongitude || 1;
  const latitudeRange = bounds.maxLatitude - bounds.minLatitude || 1;
  const x = ((location.longitude - bounds.minLongitude) / longitudeRange) * 84 + 8;
  const y = (1 - (location.latitude - bounds.minLatitude) / latitudeRange) * 76 + 12;

  return {
    x: clamp(x, 8, 92),
    y: clamp(y, 12, 88),
  };
}

function adaptFieldLocationItem(input: unknown, index: number, now: Date): FieldLocationItem | null {
  if (!isRecord(input)) return null;

  const latitude = readNumber(input, ["latitude", "lat"]);
  const longitude = readNumber(input, ["longitude", "lng", "lon"]);
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;

  const operator = readRecord(input, "operator");
  const operatorId =
    readString(input, ["operatorUserId", "operator_user_id", "operatorId", "operator_id", "userId", "user_id"]) ??
    readString(operator, ["userId", "id"]) ??
    `operator-${index + 1}`;
  const operatorName =
    readString(input, ["displayName", "operatorName", "operator_name", "name"]) ??
    readString(operator, ["name", "displayName"]);
  const capturedAt =
    readString(input, ["capturedAt", "captured_at", "recordedAt", "recorded_at"]) ??
    readString(input, ["createdAt", "created_at"]) ??
    now.toISOString();
  const capturedTime = Date.parse(capturedAt);
  if (Number.isNaN(capturedTime)) return null;

  const status = normalizeStatus(readString(input, ["status"]));
  // R6.1 — respeita a flag da API quando presente; deriva client-side quando ausente.
  const apiIsStale = readBooleanFlag(input, ["isStale", "is_stale"]);

  return {
    id: readString(input, ["id"]) ?? `${operatorId}-${capturedAt}`,
    operatorId,
    userId: readString(input, ["userId", "user_id"]) ?? readString(operator, ["userId", "id"]),
    displayName: operatorName ?? `Operador ${operatorId.slice(0, 8)}`,
    operatorName,
    teamName: readString(input, ["teamName", "team_name", "team"]) ?? readString(operator, ["teamName", "team"]) ?? null,
    status,
    latitude,
    longitude,
    accuracyMeters: readNumber(input, ["accuracyMeters", "accuracy_meters"]),
    speed: readNumber(input, ["speed", "speedMetersPerSecond", "speed_meters_per_second"]),
    heading: readNumber(input, ["heading", "headingDegrees", "heading_degrees"]),
    batteryLevel: readNumber(input, ["batteryLevel", "battery_level"]),
    capturedAt: new Date(capturedTime).toISOString(),
    receivedAt: readString(input, ["receivedAt", "received_at"]),
    isStale: apiIsStale ?? isFieldLocationTimestampStale(capturedTime, now.getTime()),
    currentWorkOrder: adaptCurrentWorkOrder(readRecord(input, "currentWorkOrder") ?? readRecord(input, "current_work_order") ?? readRecord(input, "workOrder")),
    currentDispatch: adaptCurrentDispatch(readRecord(input, "currentDispatch") ?? readRecord(input, "current_dispatch") ?? readRecord(input, "dispatch")),
  };
}

function isWorkOrderAssignedToLocation(workOrder: WorkOrderListItem, location: FieldLocationItem): boolean {
  const locationIds = new Set([location.operatorId, location.userId].filter(Boolean));
  return [workOrder.assignedOperatorId, workOrder.assignedUserId].filter(Boolean).some((id) => locationIds.has(id ?? undefined));
}

function toOperationsMapWorkOrder(workOrder: WorkOrderListItem | undefined): OperationsMapWorkOrder | null {
  if (!workOrder) return null;

  return {
    id: workOrder.id,
    code: workOrder.code,
    title: workOrder.title,
    status: workOrder.status,
    priority: workOrder.priority,
    customerName: workOrder.customerName,
    serviceAddress: workOrder.serviceAddress,
    scheduledFor: workOrder.scheduledFor,
    vehicleId: workOrder.vehicleId ?? null,
  };
}

function isDispatchLinkedToLocation(dispatch: DispatchListItem, location: FieldLocationItem): boolean {
  if (dispatch.operatorUserId !== location.operatorId && dispatch.operatorUserId !== location.userId) return false;
  if (!location.currentWorkOrder) return true;
  return dispatch.workOrderId === location.currentWorkOrder.id;
}

function isLocationLinkedToWorkOrder(location: FieldLocationItem, workOrderId: string): boolean {
  return location.currentWorkOrder?.id === workOrderId || location.currentDispatch?.workOrderId === workOrderId;
}

function toOperationsMapDispatch(dispatch: DispatchListItem | undefined): OperationsMapDispatch | null {
  if (!dispatch) return null;

  return {
    id: dispatch.id,
    workOrderId: dispatch.workOrderId,
    operatorUserId: dispatch.operatorUserId,
    status: dispatch.status,
    observation: dispatch.observation,
    reason: dispatch.reason,
    createdAt: dispatch.createdAt,
    updatedAt: dispatch.updatedAt,
  };
}

function adaptCurrentDispatch(input: Record<string, unknown> | undefined): OperationsMapDispatch | null {
  if (!input) return null;

  const id = readString(input, ["id"]);
  const workOrderId = readString(input, ["workOrderId", "work_order_id"]);
  const operatorUserId = readString(input, ["operatorUserId", "operator_user_id"]);
  const status = normalizeDispatchStatus(readString(input, ["status"]));
  const createdAt = readString(input, ["createdAt", "created_at"]);
  if (!id || !workOrderId || !operatorUserId || !status || !createdAt) return null;

  return {
    id,
    workOrderId,
    operatorUserId,
    status,
    observation: readString(input, ["observation"]) ?? null,
    reason: readString(input, ["reason"]) ?? null,
    createdAt,
    updatedAt: readString(input, ["updatedAt", "updated_at"]),
  };
}

function adaptCurrentWorkOrder(input: Record<string, unknown> | undefined): OperationsMapWorkOrder | null {
  if (!input) return null;

  const id = readString(input, ["id"]);
  const title = readString(input, ["title"]);
  const status = normalizeWorkOrderStatus(readString(input, ["status"]));
  const priority = normalizePriority(readString(input, ["priority"]));
  if (!id || !title || !status || !priority) return null;

  return {
    id,
    code: readString(input, ["code"]) ?? id,
    title,
    status,
    priority,
    customerName: readString(input, ["customerName", "customer_name"]) ?? null,
    serviceAddress: readString(input, ["serviceAddress", "service_address"]) ?? null,
    scheduledFor: readString(input, ["scheduledFor", "scheduled_for"]) ?? null,
    vehicleId: readString(input, ["vehicleId", "vehicle_id"]) ?? null,
  };
}

function compareWorkOrdersForMap(left: WorkOrderListItem, right: WorkOrderListItem): number {
  const leftStatus = getWorkOrderStatusWeight(left.status);
  const rightStatus = getWorkOrderStatusWeight(right.status);
  if (leftStatus !== rightStatus) return leftStatus - rightStatus;

  const leftTime = Date.parse(left.scheduledFor ?? left.updatedAt ?? left.createdAt);
  const rightTime = Date.parse(right.scheduledFor ?? right.updatedAt ?? right.createdAt);
  return (Number.isNaN(leftTime) ? 0 : leftTime) - (Number.isNaN(rightTime) ? 0 : rightTime);
}

function compareDispatchesForMap(left: DispatchListItem, right: DispatchListItem): number {
  const leftStatus = getDispatchStatusWeight(left.status);
  const rightStatus = getDispatchStatusWeight(right.status);
  if (leftStatus !== rightStatus) return leftStatus - rightStatus;

  const leftTime = Date.parse(left.updatedAt ?? left.createdAt);
  const rightTime = Date.parse(right.updatedAt ?? right.createdAt);
  return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
}

function getWorkOrderStatusWeight(status: WorkOrderStatus): number {
  const weights: Record<WorkOrderStatus, number> = {
    on_route: 0,
    on_site: 1,
    in_progress: 2,
    paused: 3,
    accepted: 4,
    assigned: 5,
    open: 6,
    completed: 7,
    cancelled: 8,
    rejected: 9,
  };

  return weights[status];
}

function getDispatchStatusWeight(status: DispatchStatus): number {
  const weights: Record<DispatchStatus, number> = {
    on_route: 0,
    arrived: 1,
    in_service: 2,
    accepted: 3,
    assigned: 4,
    reassigned: 5,
    draft: 6,
    completed: 7,
    cancelled: 8,
    failed: 9,
  };

  return weights[status];
}

function isTerminalWorkOrderStatus(status: WorkOrderStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "rejected";
}

function normalizeDispatchStatus(value: string | undefined): DispatchStatus | null {
  if (
    value === "draft" ||
    value === "assigned" ||
    value === "accepted" ||
    value === "on_route" ||
    value === "arrived" ||
    value === "in_service" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "reassigned" ||
    value === "failed"
  ) {
    return value;
  }

  return null;
}

function readArray(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items;

  return [];
}

function readRecord(input: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = input[key];
  return isRecord(value) ? value : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;

  for (const key of keys) {
    const value = input[key];
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized) return normalized;
  }

  return undefined;
}

function readBooleanFlag(input: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return undefined;
}

function readNumber(input: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function normalizeStatus(value: string | undefined): FieldLocationStatus {
  if (
    value === "available" ||
    value === "on_route" ||
    value === "on_site" ||
    value === "in_service" ||
    value === "paused" ||
    value === "offline" ||
    value === "blocked"
  ) {
    return value;
  }

  return "unknown";
}

function normalizeWorkOrderStatus(value: string | undefined): WorkOrderStatus | null {
  if (
    value === "open" ||
    value === "assigned" ||
    value === "accepted" ||
    value === "on_route" ||
    value === "on_site" ||
    value === "in_progress" ||
    value === "paused" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "rejected"
  ) {
    return value;
  }

  return null;
}

function normalizePriority(value: string | undefined): OperationsMapWorkOrder["priority"] | null {
  if (value === "low" || value === "medium" || value === "high" || value === "urgent") return value;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidLatitude(value: number | undefined): value is number {
  return typeof value === "number" && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | undefined): value is number {
  return typeof value === "number" && value >= -180 && value <= 180;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function calculateBounds(locations: readonly FieldLocationItem[]) {
  const latitudes = locations.map((location) => location.latitude);
  const longitudes = locations.map((location) => location.longitude);

  return {
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
