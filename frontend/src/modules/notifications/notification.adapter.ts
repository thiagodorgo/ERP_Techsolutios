import { apiRequest } from "../../services/api/client";
import type {
  FleetAlertsRunResult,
  NotificationApiContext,
  NotificationItem,
  NotificationListFilters,
  NotificationSeverity,
  NotificationStatus,
  NotificationUnreadCount,
} from "./notification.types";

// Categorias de negócio da Central de Notificações (F10) — ligadas aos produtores de frota.
export type NotificationCategory = "maintenance" | "fines" | "insurance" | "stock" | "outros";

// Rótulos PT-BR (nunca o token cru) exibidos nos chips de filtro.
export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  maintenance: "Manutenção",
  fines: "Multas",
  insurance: "Seguros",
  stock: "Estoque",
  outros: "Outros",
};

// Ordem dos chips de categoria na Central.
export const NOTIFICATION_CATEGORY_ORDER: readonly NotificationCategory[] = [
  "maintenance",
  "fines",
  "insurance",
  "stock",
  "outros",
];

// Deriva a categoria a partir do `type` (ex.: "maintenance.due") e, como reforço, do `sourceType`
// (ex.: "maintenance_order"). Puro, sem efeito colateral e à prova de valor ausente.
export function getNotificationCategory(type?: string | null, sourceType?: string | null): NotificationCategory {
  const t = (type ?? "").toLowerCase();
  const s = (sourceType ?? "").toLowerCase();

  if (t.startsWith("maintenance") || s === "maintenance_order") return "maintenance";
  if (t.startsWith("fine") || s === "fine") return "fines";
  if (t.startsWith("insurance") || s === "insurance_policy") return "insurance";
  if (t.startsWith("stock") || t.startsWith("inventory") || s === "inventory_item") return "stock";
  return "outros";
}

// Filtra a janela carregada por categoria (client-side); "all" devolve tudo.
export function filterNotificationsByCategory(
  items: readonly NotificationItem[],
  category: NotificationCategory | "all",
): NotificationItem[] {
  if (category === "all") return [...items];
  return items.filter((item) => getNotificationCategory(item.type, item.sourceType) === category);
}

export function isNotificationCategory(value: string | null | undefined): value is NotificationCategory {
  return value === "maintenance" || value === "fines" || value === "insurance" || value === "stock" || value === "outros";
}

type ApiResponse<T> = {
  data: T;
};

type NotificationApiItem = Omit<NotificationItem, "sourceType" | "sourceId" | "actionUrl" | "readAt" | "createdAt" | "updatedAt"> & {
  sourceType?: string;
  source_type?: string;
  sourceId?: string;
  source_id?: string;
  actionUrl?: string;
  action_url?: string;
  readAt?: string | null;
  read_at?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export function listNotificationsFromApi(
  context: NotificationApiContext,
  filters: NotificationListFilters = {},
): Promise<NotificationItem[]> {
  const query = toQueryString(filters);
  return apiRequest<ApiResponse<NotificationApiItem[]>>(`/notifications${query}`, toRequestOptions(context)).then((response) =>
    response.data.map(mapNotification),
  );
}

export function getUnreadNotificationCountFromApi(context: NotificationApiContext): Promise<NotificationUnreadCount> {
  return apiRequest<ApiResponse<NotificationUnreadCount>>("/notifications/unread-count", toRequestOptions(context)).then(
    (response) => response.data,
  );
}

export function markNotificationAsReadFromApi(
  context: NotificationApiContext,
  notificationId: string,
): Promise<NotificationItem> {
  return apiRequest<ApiResponse<NotificationApiItem>>(`/notifications/${notificationId}/read`, {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => mapNotification(response.data));
}

export function markAllNotificationsAsReadFromApi(context: NotificationApiContext): Promise<NotificationUnreadCount> {
  return apiRequest<ApiResponse<NotificationUnreadCount>>("/notifications/read-all", {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => response.data);
}

export function archiveNotificationFromApi(context: NotificationApiContext, notificationId: string): Promise<NotificationItem> {
  return apiRequest<ApiResponse<NotificationApiItem>>(`/notifications/${notificationId}/archive`, {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => mapNotification(response.data));
}

// F10 — dispara os produtores de alertas de frota (manutenção/multas/seguros/reposição). Idempotente.
export function runFleetAlertsFromApi(context: NotificationApiContext): Promise<FleetAlertsRunResult> {
  return apiRequest<ApiResponse<unknown>>("/notifications/fleet-alerts/run", {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => parseFleetAlertsRun(response));
}

// Lê o envelope `{ data: { maintenance, fines, insurance, reorder, ranAt } }` com degradação segura
// (campos ausentes/ inválidos → 0 / null), sem lançar.
export function parseFleetAlertsRun(payload: unknown): FleetAlertsRunResult {
  const data = (payload as { data?: Record<string, unknown> } | null | undefined)?.data ?? {};

  return {
    maintenance: toCount(data.maintenance),
    fines: toCount(data.fines),
    insurance: toCount(data.insurance),
    reorder: toCount(data.reorder),
    ranAt: typeof data.ranAt === "string" ? data.ranAt : null,
  };
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function toRequestOptions(context: NotificationApiContext) {
  return {
    token: context.token,
    tenantId: context.tenantId,
    branchId: context.branchId,
    role: context.role,
    permissions: context.permissions ? [...context.permissions] : undefined,
  };
}

function toQueryString(filters: NotificationListFilters): string {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.type) params.set("type", filters.type);
  if (filters.sourceType) params.set("sourceType", filters.sourceType);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

function mapNotification(item: NotificationApiItem): NotificationItem {
  const now = new Date().toISOString();

  return {
    id: item.id,
    type: item.type,
    title: item.title,
    message: item.message,
    severity: normalizeSeverity(item.severity),
    status: normalizeStatus(item.status),
    sourceType: item.sourceType ?? item.source_type,
    sourceId: item.sourceId ?? item.source_id,
    actionUrl: item.actionUrl ?? item.action_url,
    metadata: item.metadata,
    readAt: item.readAt ?? item.read_at ?? null,
    createdAt: item.createdAt ?? item.created_at ?? now,
    updatedAt: item.updatedAt ?? item.updated_at ?? now,
  };
}

function normalizeStatus(status: string): NotificationStatus {
  if (status === "read" || status === "archived") return status;
  return "unread";
}

function normalizeSeverity(severity: string): NotificationSeverity {
  if (severity === "success" || severity === "warning" || severity === "critical") return severity;
  return "info";
}
