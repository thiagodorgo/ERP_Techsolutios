import type {
  WorkOrderDetail,
  WorkOrderEvent,
  WorkOrderLinkedCustomer,
  WorkOrderLinkedServiceCatalog,
  WorkOrderLinkedTeam,
  WorkOrderLinkedVehicle,
  WorkOrderListItem,
  WorkOrderPriority,
  WorkOrderRegistryLinks,
  WorkOrderRegistryLinksDetail,
  WorkOrdersData,
  WorkOrdersFilters,
  WorkOrdersPagination,
  WorkOrdersSummary,
  WorkOrderStatus,
} from "./work-orders.types";

// B1 (OS integrada): converte os vínculos selecionados (camelCase) no recorte snake_case
// do payload POST /work-orders. Apenas os vínculos preenchidos entram — vazio é omitido.
export type WorkOrderRegistryLinksPayload = {
  customer_id?: string;
  vehicle_id?: string;
  team_id?: string;
  service_catalog_id?: string;
};

export function buildRegistryLinksPayload(links: WorkOrderRegistryLinks): WorkOrderRegistryLinksPayload {
  const payload: WorkOrderRegistryLinksPayload = {};
  const customerId = links.customerId?.trim();
  const vehicleId = links.vehicleId?.trim();
  const teamId = links.teamId?.trim();
  const serviceCatalogId = links.serviceCatalogId?.trim();
  if (customerId) payload.customer_id = customerId;
  if (vehicleId) payload.vehicle_id = vehicleId;
  if (teamId) payload.team_id = teamId;
  if (serviceCatalogId) payload.service_catalog_id = serviceCatalogId;
  return payload;
}

const statusLabels: Record<WorkOrderStatus, string> = {
  open: "Aberta",
  assigned: "Atribuida",
  accepted: "Aceita",
  on_route: "Em deslocamento",
  on_site: "No local",
  in_progress: "Em atendimento",
  paused: "Pausada",
  completed: "Concluida",
  cancelled: "Cancelada",
  rejected: "Recusada",
};

const priorityLabels: Record<WorkOrderPriority, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export function adaptWorkOrdersResponse(response: unknown, source: WorkOrdersData["source"] = "api", fallbackReason?: string): WorkOrdersData {
  const payload = readRecord(response);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(payload?.items) ?? readArray(payload?.data) ?? readArray(readRecord(payload?.data)?.items) ?? [];
  const items = itemsSource.map((item) => adaptWorkOrderItem(item)).filter((item): item is WorkOrderListItem => Boolean(item));
  const pagination = adaptPagination(payload, items.length);

  return {
    items,
    pagination,
    source,
    fallbackReason,
  };
}

export function adaptWorkOrderResponse(response: unknown): WorkOrderDetail | null {
  const payload = readRecord(response);
  return adaptWorkOrderItem(readRecord(payload?.data) ?? response);
}

export function adaptWorkOrderTimelineResponse(response: unknown): WorkOrderEvent[] {
  const payload = readRecord(response);
  const items = readArray(payload?.data) ?? readArray(response) ?? [];

  return items
    .map((item) => adaptWorkOrderEvent(item))
    .filter((item): item is WorkOrderEvent => Boolean(item))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

export function filterWorkOrders(items: readonly WorkOrderListItem[], filters: WorkOrdersFilters): WorkOrderListItem[] {
  const search = normalize(filters.search);
  const fromTime = parseOptionalDate(filters.from);
  const toTime = parseOptionalDate(filters.to);
  const operator = filters.assignedOperatorId.trim();

  return items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.priority !== "all" && item.priority !== filters.priority) return false;
    if (operator && item.assignedOperatorId !== operator && item.assignedUserId !== operator) return false;

    const scheduledTime = parseOptionalDate(item.scheduledFor ?? item.createdAt);
    if (fromTime && scheduledTime && scheduledTime < fromTime) return false;
    if (toTime && scheduledTime && scheduledTime > toTime) return false;

    if (!search) return true;
    return [item.code, item.title, item.customerName, item.serviceAddress, item.assignedOperatorId, item.assignedUserId]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function calculateWorkOrdersSummary(items: readonly WorkOrderListItem[]): WorkOrdersSummary {
  return {
    total: items.length,
    open: items.filter((item) => item.status === "open").length,
    assigned: items.filter((item) => item.status === "assigned" || item.status === "accepted").length,
    inService: items.filter((item) => item.status === "on_route" || item.status === "on_site" || item.status === "in_progress" || item.status === "paused").length,
    completed: items.filter((item) => item.status === "completed").length,
    cancelled: items.filter((item) => item.status === "cancelled" || item.status === "rejected").length,
    urgent: items.filter((item) => item.priority === "urgent").length,
  };
}

export function getWorkOrderStatusLabel(status: WorkOrderStatus): string {
  return statusLabels[status];
}

export function getWorkOrderPriorityLabel(priority: WorkOrderPriority): string {
  return priorityLabels[priority];
}

export function getWorkOrderStatusTone(status: WorkOrderStatus) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled" || status === "rejected") return "danger" as const;
  if (status === "paused") return "warning" as const;
  if (status === "open" || status === "assigned" || status === "accepted") return "info" as const;
  return "pending" as const;
}

export function getWorkOrderPriorityTone(priority: WorkOrderPriority) {
  if (priority === "urgent") return "danger" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "info" as const;
  return "default" as const;
}

export function formatWorkOrderDate(value: string | null | undefined): string {
  if (!value) return "Nao informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data invalida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function validateWorkOrderForm(input: {
  readonly title: string;
  readonly priority: string;
  readonly serviceLatitude?: string;
  readonly serviceLongitude?: string;
  readonly scheduledFor?: string;
  // Ω3F-2b — espelho client-side do 422 destination_required (backend é a autoridade).
  readonly requiresDestination?: boolean;
  readonly destinationAddress?: string;
  readonly destinationLatitude?: string;
  readonly destinationLongitude?: string;
}): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("Titulo obrigatorio.");
  if (!input.priority.trim()) errors.push("Prioridade obrigatoria.");
  if (input.serviceLatitude && !isValidLatitude(Number(input.serviceLatitude))) errors.push("Latitude invalida.");
  if (input.serviceLongitude && !isValidLongitude(Number(input.serviceLongitude))) errors.push("Longitude invalida.");
  if (input.scheduledFor && Number.isNaN(Date.parse(input.scheduledFor))) errors.push("Agendamento invalido.");
  if (input.destinationLatitude && !isValidLatitude(Number(input.destinationLatitude))) errors.push("Latitude do destino inválida.");
  if (input.destinationLongitude && !isValidLongitude(Number(input.destinationLongitude))) errors.push("Longitude do destino inválida.");
  // Destino real = endereço OU coordenada completa não-sentinela (mesma regra do backend/mapa; 0/0 não vale).
  if (input.requiresDestination) {
    const hasAddress = Boolean(input.destinationAddress?.trim());
    const lat = input.destinationLatitude?.trim() ? Number(input.destinationLatitude) : undefined;
    const lng = input.destinationLongitude?.trim() ? Number(input.destinationLongitude) : undefined;
    const hasPin = lat !== undefined && lng !== undefined && isValidLatitude(lat) && isValidLongitude(lng) && !(lat === 0 && lng === 0);
    if (!hasAddress && !hasPin) errors.push("Endereço de destino obrigatório para este tipo de serviço.");
  }
  return errors;
}

// Ω3F-2b — monta o objeto plano `service_details` só com valores preenchidos (chaves por tipo:
// socorro {plate,vehicle,color}; residencial {access_code,object,description}). Tudo vazio → undefined.
export function buildServiceDetails(fields: Record<string, string>): Record<string, string> | undefined {
  const entries = Object.entries(fields)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function toApiDateTime(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function adaptWorkOrderItem(input: unknown): WorkOrderDetail | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const title = readString(item, ["title"]);
  const status = normalizeStatus(readString(item, ["status"]));
  const priority = normalizePriority(readString(item, ["priority"]));
  const createdAt = readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString();

  if (!id || !title || !status || !priority) return null;

  return {
    id,
    code: readString(item, ["code"]) ?? id,
    title,
    description: readNullableString(item, ["description"]),
    status,
    priority,
    customerName: readNullableString(item, ["customerName", "customer_name"]),
    customerDocument: readNullableString(item, ["customerDocument", "customer_document"]),
    customerPhone: readNullableString(item, ["customerPhone", "customer_phone"]),
    serviceAddress: readNullableString(item, ["serviceAddress", "service_address"]),
    serviceCity: readNullableString(item, ["serviceCity", "service_city"]),
    serviceState: readNullableString(item, ["serviceState", "service_state"]),
    serviceZipCode: readNullableString(item, ["serviceZipCode", "service_zip_code"]),
    serviceLatitude: readNullableNumber(item, ["serviceLatitude", "service_latitude"]),
    serviceLongitude: readNullableNumber(item, ["serviceLongitude", "service_longitude"]),
    assignedOperatorId: readNullableString(item, ["assignedOperatorId", "assigned_operator_id"]),
    assignedUserId: readNullableString(item, ["assignedUserId", "assigned_user_id"]),
    vehicleId: readNullableString(item, ["vehicleId", "vehicle_id"]),
    checklistId: readNullableString(item, ["checklistId", "checklist_id"]),
    scheduledFor: readNullableString(item, ["scheduledFor", "scheduled_for"]),
    startedAt: readNullableString(item, ["startedAt", "started_at"]),
    arrivedAt: readNullableString(item, ["arrivedAt", "arrived_at"]),
    completedAt: readNullableString(item, ["completedAt", "completed_at"]),
    cancelledAt: readNullableString(item, ["cancelledAt", "cancelled_at"]),
    cancellationReason: readNullableString(item, ["cancellationReason", "cancellation_reason"]),
    createdBy: readNullableString(item, ["createdBy", "created_by"]),
    updatedBy: readNullableString(item, ["updatedBy", "updated_by"]),
    createdAt,
    updatedAt: readString(item, ["updatedAt", "updated_at"]),
    links: adaptWorkOrderRegistryLinks(item.links ?? item.registryLinks ?? item.registry_links),
  };
}

// C2 (Detalhe de OS enriquecido): interpreta o objeto `links` do detalhe.
// Defensivo: tolera camel/snake, aceita ausência (null) e resolve cada vínculo
// só quando traz um identificador humano (nome/placa) — nunca expõe UUID cru.
export function adaptWorkOrderRegistryLinks(input: unknown): WorkOrderRegistryLinksDetail | null {
  const links = readRecord(input);
  if (!links) return null;

  return {
    customer: adaptLinkedCustomer(links.customer),
    vehicle: adaptLinkedVehicle(links.vehicle),
    team: adaptLinkedTeam(links.team),
    serviceCatalog: adaptLinkedServiceCatalog(links.serviceCatalog ?? links.service_catalog),
  };
}

function adaptLinkedCustomer(input: unknown): WorkOrderLinkedCustomer | null {
  const record = readRecord(input);
  if (!record) return null;
  const id = readString(record, ["id"]);
  const name = readString(record, ["name"]);
  if (!id || !name) return null;
  return { id, name, isActive: readBoolean(record, ["isActive", "is_active"]) ?? true };
}

function adaptLinkedVehicle(input: unknown): WorkOrderLinkedVehicle | null {
  const record = readRecord(input);
  if (!record) return null;
  const id = readString(record, ["id"]);
  const plate = readString(record, ["plate"]);
  if (!id || !plate) return null;
  return { id, plate, model: readNullableString(record, ["model"]) };
}

function adaptLinkedTeam(input: unknown): WorkOrderLinkedTeam | null {
  const record = readRecord(input);
  if (!record) return null;
  const id = readString(record, ["id"]);
  const name = readString(record, ["name"]);
  if (!id || !name) return null;
  return { id, name };
}

function adaptLinkedServiceCatalog(input: unknown): WorkOrderLinkedServiceCatalog | null {
  const record = readRecord(input);
  if (!record) return null;
  const id = readString(record, ["id"]);
  const name = readString(record, ["name"]);
  if (!id || !name) return null;
  return { id, name, basePrice: readNullableNumber(record, ["basePrice", "base_price"]) };
}

function adaptWorkOrderEvent(input: unknown): WorkOrderEvent | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const eventType = readString(item, ["eventType", "event_type"]);
  const message = readString(item, ["message"]);
  const createdAt = readString(item, ["createdAt", "created_at"]);
  if (!id || !eventType || !message || !createdAt) return null;

  return {
    id,
    workOrderId: readString(item, ["workOrderId", "work_order_id"]),
    eventType,
    fromStatus: normalizeStatus(readString(item, ["fromStatus", "from_status"])),
    toStatus: normalizeStatus(readString(item, ["toStatus", "to_status"])),
    actorUserId: readNullableString(item, ["actorUserId", "actor_user_id"]),
    message,
    metadata: readRecord(item.metadata) ?? null,
    createdAt,
  };
}

function adaptPagination(payload: Record<string, unknown> | undefined, fallbackTotal: number): WorkOrdersPagination {
  const pagination = readRecord(payload?.pagination) ?? readRecord(readRecord(payload?.data)?.pagination);
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
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
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

function normalizeStatus(value: string | undefined): WorkOrderStatus | null {
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

function normalizePriority(value: string | undefined): WorkOrderPriority | null {
  if (value === "low" || value === "medium" || value === "high" || value === "urgent") return value;
  return null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseOptionalDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}
