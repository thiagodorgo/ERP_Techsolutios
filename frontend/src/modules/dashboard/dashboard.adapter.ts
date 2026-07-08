import type { OperationalAlert, OperationalKpi } from "./types";
import type { WorkOrderListItem, WorkOrderStatus, WorkOrdersData } from "../work-orders/work-orders.types";
import type { DispatchListItem, DispatchStatus } from "../operations/dispatches/dispatches.types";
import type { FieldLocationItem } from "../operations/map/operations-map.types";
import type { OperationalApproval } from "../work-orders/approval.types";

const OPEN_STATUSES: ReadonlySet<string> = new Set([
  "open",
  "assigned",
  "accepted",
  "on_route",
  "on_site",
  "in_progress",
  "paused",
]);

/** KPIs operacionais derivados das OS reais (função pura, testável). */
export function deriveDashboardKpis(data: WorkOrdersData): OperationalKpi[] {
  const items = data.items;
  const open = items.filter((w) => OPEN_STATUSES.has(w.status)).length;
  const critical = items.filter((w) => w.priority === "urgent" || w.priority === "high").length;
  const inProgress = items.filter((w) => w.status === "in_progress").length;
  const completed = items.filter((w) => w.status === "completed").length;

  return [
    { id: "open", label: "OS abertas", value: String(open), delta: `${items.length} no total`, tone: "info" },
    {
      id: "critical",
      label: "Prioridade alta/urgente",
      value: String(critical),
      delta: critical > 0 ? "requer atencao" : "sob controle",
      tone: critical > 0 ? "danger" : "success",
    },
    { id: "in_progress", label: "Em atendimento", value: String(inProgress), delta: "agora", tone: "warning" },
    { id: "completed", label: "Concluidas", value: String(completed), delta: "no periodo", tone: "success" },
  ];
}

/** OS críticas (urgente/alta) para o painel, limitadas a `limit`. */
export function pickCriticalWorkOrders(data: WorkOrdersData, limit = 5): WorkOrderListItem[] {
  return data.items
    .filter((w) => w.priority === "urgent" || w.priority === "high")
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// B-124 — Dashboard enriquecido (OS + despachos + localizações + aprovações).
// Funções puras: recebem as listas já carregadas e um `now` injetável, para
// serem testáveis sem rede e sem relógio real. Nenhuma chamada por item.
// ---------------------------------------------------------------------------

/**
 * Regra de "sem sinal recente" (stale): reutiliza a regra oficial do módulo de
 * mapa (`operations-map.adapter.ts`, `staleThresholdMs = 15 * 60 * 1000`), já
 * materializada em `FieldLocationItem.isStale`. Este adapter NÃO recalcula o
 * limiar — apenas consome `isStale` para manter uma única fonte da regra.
 */

export type DashboardTone = "info" | "success" | "warning" | "danger" | "accent" | "neutral";
export type DashboardSeverity = "critical" | "warning" | "info";

export type DashboardKpiCard = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly tone: DashboardTone;
};

export type DashboardAction = {
  readonly label: "Abrir OS" | "Abrir despacho" | "Abrir mapa" | "Ver aprovação" | "Ver fila";
  readonly to: string;
};

export type CriticalQueueKind =
  | "os_atrasada"
  | "os_prioritaria"
  | "campo_sem_sinal"
  | "aprovacao_pendente"
  | "os_sem_operador";

export type CriticalQueueItem = {
  readonly id: string;
  readonly kind: CriticalQueueKind;
  readonly title: string;
  readonly description: string;
  readonly statusLabel: string;
  readonly severity: DashboardSeverity;
  readonly tone: DashboardTone;
  readonly action: DashboardAction;
};

export type FieldStatusRow = {
  readonly id: string;
  readonly name: string;
  readonly stateLabel: string;
  readonly tone: DashboardTone;
  readonly detail: string;
  readonly capturedAt?: string;
};

export type ActiveDispatchRow = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly statusLabel: string;
  readonly tone: DashboardTone;
  readonly when?: string;
};

export type DashboardAlertItem = {
  readonly id: string;
  readonly severity: DashboardSeverity;
  readonly title: string;
  readonly meta: string;
  readonly action?: DashboardAction;
};

export type DashboardEventItem = {
  readonly id: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly tone: DashboardTone;
  readonly at?: string;
};

export type EnrichedDashboardInput = {
  readonly workOrders: readonly WorkOrderListItem[];
  readonly dispatches: readonly DispatchListItem[];
  readonly locations: readonly FieldLocationItem[];
  readonly pendingApprovals: readonly OperationalApproval[];
  readonly unread: number | null;
  readonly now: Date;
};

const FINAL_WO_STATUSES: ReadonlySet<WorkOrderStatus> = new Set(["completed", "cancelled", "rejected"]);

/** Despachos considerados "ativos" (não terminais). */
export const ACTIVE_DISPATCH_STATUSES: ReadonlySet<DispatchStatus> = new Set([
  "draft",
  "assigned",
  "accepted",
  "on_route",
  "arrived",
  "in_service",
  "reassigned",
]);

const DISPATCH_STATUS_META: Record<DispatchStatus, { label: string; tone: DashboardTone }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  assigned: { label: "Atribuído", tone: "info" },
  accepted: { label: "Aceito", tone: "info" },
  on_route: { label: "Em rota", tone: "info" },
  arrived: { label: "No local", tone: "success" },
  in_service: { label: "Em atendimento", tone: "warning" },
  completed: { label: "Concluído", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
  reassigned: { label: "Reatribuído", tone: "warning" },
  failed: { label: "Falhou", tone: "danger" },
};

/** Rótulo/tonalidade de status de despacho, tolerante a status desconhecido. */
export function dispatchStatusMeta(status: string): { label: string; tone: DashboardTone } {
  return DISPATCH_STATUS_META[status as DispatchStatus] ?? { label: "Status desconhecido", tone: "neutral" };
}

const WO_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  open: "Aberta",
  assigned: "Atribuída",
  accepted: "Aceita",
  on_route: "Em rota",
  on_site: "No local",
  in_progress: "Em atendimento",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
  rejected: "Recusada",
};

const WO_STATUS_TONE: Record<WorkOrderStatus, DashboardTone> = {
  open: "neutral",
  assigned: "info",
  accepted: "info",
  on_route: "info",
  on_site: "success",
  in_progress: "warning",
  paused: "warning",
  completed: "success",
  cancelled: "danger",
  rejected: "danger",
};

/** Rótulo/tonalidade de status de OS, tolerante a status desconhecido. */
export function workOrderStatusMeta(status: string): { label: string; tone: DashboardTone } {
  const known = status as WorkOrderStatus;
  if (WO_STATUS_LABEL[known]) return { label: WO_STATUS_LABEL[known], tone: WO_STATUS_TONE[known] };
  return { label: "Status desconhecido", tone: "neutral" };
}

const FIELD_STATUS_LABEL: Record<string, string> = {
  available: "Disponível",
  on_route: "Em rota",
  on_site: "No local",
  in_service: "Em atendimento",
  paused: "Pausado",
  offline: "Offline",
  blocked: "Bloqueado",
  unknown: "Status desconhecido",
};

/** Estado exibível de um operador de campo (stale sobrepõe o status bruto). */
export function fieldStatusMeta(location: FieldLocationItem): { label: string; tone: DashboardTone } {
  if (location.isStale) return { label: "Sem sinal recente", tone: "warning" };
  if (location.status === "offline") return { label: "Offline", tone: "neutral" };
  if (location.status === "blocked") return { label: "Bloqueado", tone: "danger" };
  const label = FIELD_STATUS_LABEL[location.status] ?? "Status desconhecido";
  const tone: DashboardTone = location.status === "in_service" ? "warning" : location.status === "unknown" ? "neutral" : "success";
  return { label, tone };
}

/** OS com SLA/agenda vencidos: `scheduledFor` no passado e status não final. */
export function isWorkOrderOverdue(order: WorkOrderListItem, now: Date): boolean {
  if (FINAL_WO_STATUSES.has(order.status)) return false;
  if (!order.scheduledFor) return false;
  const scheduled = new Date(order.scheduledFor).getTime();
  return !Number.isNaN(scheduled) && scheduled < now.getTime();
}

/** Tempo relativo em PT-BR a partir de um instante injetado (testável). */
export function relativeTimeFrom(iso: string | null | undefined, now: Date): string {
  if (!iso) return "";
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "";
  const mins = Math.max(0, Math.round((now.getTime() - at) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} d`;
}

/** 8 KPIs enriquecidos — todos derivados dos dados carregados, nunca fixos. */
export function deriveEnrichedDashboardKpis(input: EnrichedDashboardInput): DashboardKpiCard[] {
  const { workOrders, dispatches, locations, pendingApprovals, unread, now } = input;
  const openOrders = workOrders.filter((order) => !FINAL_WO_STATUSES.has(order.status));
  const inService = workOrders.filter((order) => order.status === "in_progress" || order.status === "paused").length;
  const overdue = workOrders.filter((order) => isWorkOrderOverdue(order, now)).length;
  const activeDispatches = dispatches.filter((dispatch) => ACTIVE_DISPATCH_STATUSES.has(dispatch.status)).length;
  const operatorsOnline = locations.filter((location) => !location.isStale && location.status !== "offline").length;
  const staleLocations = locations.filter((location) => location.isStale).length;
  const approvals = pendingApprovals.length;

  return [
    { id: "open", label: "OS abertas", value: String(openOrders.length), helper: `${workOrders.length} no total`, tone: "info" },
    { id: "in_service", label: "Em atendimento", value: String(inService), helper: "agora", tone: "warning" },
    {
      id: "overdue",
      label: "OS atrasadas",
      value: String(overdue),
      helper: overdue > 0 ? "agenda vencida" : "sem atrasos",
      tone: overdue > 0 ? "danger" : "success",
    },
    {
      id: "approvals",
      label: "Pendentes de aprovação",
      value: String(approvals),
      helper: approvals > 0 ? "aguardando decisão" : "nada pendente",
      tone: "accent",
    },
    { id: "dispatches", label: "Despachos ativos", value: String(activeDispatches), helper: `${dispatches.length} no período`, tone: "info" },
    { id: "field", label: "Operadores em campo", value: String(operatorsOnline), helper: "com sinal recente", tone: "success" },
    {
      id: "stale",
      label: "Sem sinal recente",
      value: String(staleLocations),
      helper: staleLocations > 0 ? "verificar no mapa" : "todos atualizados",
      tone: staleLocations > 0 ? "warning" : "success",
    },
    { id: "unread", label: "Não lidas", value: unread === null ? "—" : String(unread), helper: "notificações", tone: "neutral" },
  ];
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_LABEL: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" };

type QueueCandidate = CriticalQueueItem & { readonly rank: number; readonly tiebreak: string; readonly entityKey: string };

/**
 * Fila crítica combinada. Ordenação obrigatória por criticidade:
 * 1. OS com SLA/agenda vencidos · 2. OS de prioridade alta/urgente ·
 * 3. operador sem sinal recente (stale) · 4. aprovação pendente ·
 * 5. OS sem operador atribuído. Uma mesma entidade aparece uma única vez,
 * no grupo mais crítico em que se qualifica.
 */
export function buildCriticalQueue(input: EnrichedDashboardInput, limit = 6): CriticalQueueItem[] {
  const { workOrders, locations, pendingApprovals, now } = input;
  const candidates: QueueCandidate[] = [];

  for (const order of workOrders) {
    if (FINAL_WO_STATUSES.has(order.status)) continue;
    const status = workOrderStatusMeta(order.status);
    const base = {
      title: `${order.code} · ${order.customerName ?? order.title}`,
      statusLabel: status.label,
      tone: status.tone,
      action: { label: "Abrir OS" as const, to: `/work-orders/${order.id}` },
      entityKey: `os:${order.id}`,
      tiebreak: order.scheduledFor ?? order.updatedAt ?? order.createdAt,
    };
    if (isWorkOrderOverdue(order, now)) {
      candidates.push({
        ...base,
        id: `overdue-${order.id}`,
        kind: "os_atrasada",
        description: `Agenda vencida ${relativeTimeFrom(order.scheduledFor, now)} · ${order.title}`,
        severity: "critical",
        rank: 1,
      });
    } else if (order.priority === "urgent" || order.priority === "high") {
      candidates.push({
        ...base,
        id: `priority-${order.id}`,
        kind: "os_prioritaria",
        description: `Prioridade ${PRIORITY_LABEL[order.priority] ?? order.priority} · ${order.title}`,
        severity: order.priority === "urgent" ? "critical" : "warning",
        rank: 2,
      });
    } else if (!order.assignedOperatorId) {
      candidates.push({
        ...base,
        id: `unassigned-${order.id}`,
        kind: "os_sem_operador",
        description: `Sem operador atribuído · ${order.title}`,
        severity: "warning",
        rank: 5,
      });
    }
  }

  for (const location of locations) {
    if (!location.isStale) continue;
    const name = location.displayName || location.operatorName || "Operador de campo";
    const linkedOs = location.currentWorkOrder;
    candidates.push({
      id: `stale-${location.id}`,
      kind: "campo_sem_sinal",
      title: name,
      description: linkedOs
        ? `Sem sinal ${relativeTimeFrom(location.capturedAt, now)} · em ${linkedOs.code}`
        : `Sem sinal ${relativeTimeFrom(location.capturedAt, now)} · última posição no mapa`,
      statusLabel: "Sem sinal recente",
      severity: "warning",
      tone: "warning",
      action: { label: "Abrir mapa", to: "/operations/map" },
      entityKey: `loc:${location.id}`,
      tiebreak: location.capturedAt,
      rank: 3,
    });
  }

  for (const approval of pendingApprovals) {
    if (approval.status !== "pending_approval") continue;
    candidates.push({
      id: `approval-${approval.id}`,
      kind: "aprovacao_pendente",
      title: approval.workOrderId ? "Aprovação de OS pendente" : "Aprovação pendente",
      description: approval.pendingReason,
      statusLabel: "Aguardando decisão",
      severity: "info",
      tone: "accent",
      action: approval.workOrderId
        ? { label: "Ver aprovação", to: `/work-orders/${approval.workOrderId}` }
        : { label: "Ver fila", to: "/work-orders" },
      entityKey: `apr:${approval.id}`,
      tiebreak: approval.requestedAt,
      rank: 4,
    });
  }

  const byEntity = new Map<string, QueueCandidate>();
  for (const candidate of candidates) {
    const existing = byEntity.get(candidate.entityKey);
    if (!existing || candidate.rank < existing.rank) byEntity.set(candidate.entityKey, candidate);
  }

  return [...byEntity.values()]
    .sort((a, b) => a.rank - b.rank || a.tiebreak.localeCompare(b.tiebreak))
    .slice(0, limit)
    .map(({ rank: _rank, tiebreak: _tiebreak, entityKey: _entityKey, ...item }) => item);
}

/** Linhas de "Status de campo" a partir das localizações reais. */
export function deriveFieldStatusRows(locations: readonly FieldLocationItem[], now: Date, limit = 5): FieldStatusRow[] {
  return [...locations]
    .sort((a, b) => Number(b.isStale) - Number(a.isStale) || b.capturedAt.localeCompare(a.capturedAt))
    .slice(0, limit)
    .map((location) => {
      const meta = fieldStatusMeta(location);
      const os = location.currentWorkOrder;
      return {
        id: location.id,
        name: location.displayName || location.operatorName || "Operador de campo",
        stateLabel: meta.label,
        tone: meta.tone,
        detail: os ? `${os.code} · ${os.title}` : `atualizado ${relativeTimeFrom(location.capturedAt, now) || "—"}`,
        capturedAt: location.capturedAt,
      };
    });
}

/** Linhas de "Despachos ativos" (status não terminais; desconhecido tolerado). */
export function deriveActiveDispatchRows(dispatches: readonly DispatchListItem[], limit = 5): ActiveDispatchRow[] {
  return dispatches
    .filter((dispatch) => ACTIVE_DISPATCH_STATUSES.has(dispatch.status) || !DISPATCH_STATUS_META[dispatch.status])
    .slice(0, limit)
    .map((dispatch) => {
      const meta = dispatchStatusMeta(dispatch.status);
      return {
        id: dispatch.id,
        title: dispatch.workOrderCode ?? "Despacho",
        subtitle: dispatch.workOrderTitle ?? dispatch.observation ?? "Sem descrição",
        statusLabel: meta.label,
        tone: meta.tone,
        when: dispatch.updatedAt ?? dispatch.createdAt,
      };
    });
}

/** Alertas acionáveis — só entram quando há ocorrência; cada um com destino. */
export function deriveDashboardAlerts(input: EnrichedDashboardInput): DashboardAlertItem[] {
  const { workOrders, dispatches, locations, pendingApprovals, now } = input;
  const alerts: DashboardAlertItem[] = [];

  const overdue = workOrders.filter((order) => isWorkOrderOverdue(order, now)).length;
  if (overdue > 0) {
    alerts.push({
      id: "overdue",
      severity: "critical",
      title: `${overdue} OS com agenda vencida`,
      meta: "priorize a fila crítica",
      action: { label: "Ver fila", to: "/work-orders" },
    });
  }

  const urgent = workOrders.filter((order) => order.priority === "urgent" && !FINAL_WO_STATUSES.has(order.status)).length;
  if (urgent > 0) {
    alerts.push({
      id: "urgent",
      severity: "critical",
      title: `${urgent} OS urgentes abertas`,
      meta: "atendimento imediato",
      action: { label: "Ver fila", to: "/work-orders" },
    });
  }

  const stale = locations.filter((location) => location.isStale).length;
  if (stale > 0) {
    alerts.push({
      id: "stale",
      severity: "warning",
      title: `${stale} operador(es) sem sinal recente`,
      meta: "verifique a última posição",
      action: { label: "Abrir mapa", to: "/operations/map" },
    });
  }

  const waitingAccept = dispatches.filter((dispatch) => dispatch.status === "draft" || dispatch.status === "assigned").length;
  if (waitingAccept > 0) {
    alerts.push({
      id: "dispatch-accept",
      severity: "warning",
      title: `${waitingAccept} despacho(s) aguardando aceite`,
      meta: "acompanhe a atribuição",
      action: { label: "Abrir despacho", to: "/operations/dispatches" },
    });
  }

  const approvals = pendingApprovals.filter((approval) => approval.status === "pending_approval").length;
  if (approvals > 0) {
    alerts.push({
      id: "approvals",
      severity: "info",
      title: `${approvals} aprovação(ões) pendente(s)`,
      meta: "decisão operacional aguardando",
      action: { label: "Ver fila", to: "/work-orders" },
    });
  }

  const order: Record<DashboardSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

/**
 * Eventos recentes derivados apenas das listas já carregadas (OS + despachos).
 * Não dispara chamadas de timeline por item.
 */
export function deriveDashboardEvents(input: EnrichedDashboardInput, limit = 6): DashboardEventItem[] {
  const { workOrders, dispatches } = input;
  const events: (DashboardEventItem & { readonly sortKey: string })[] = [];

  for (const order of workOrders) {
    const meta = workOrderStatusMeta(order.status);
    const at = order.updatedAt ?? order.createdAt;
    events.push({
      id: `os-${order.id}`,
      title: `${order.code} · ${order.customerName ?? order.title}`,
      statusLabel: meta.label,
      tone: meta.tone,
      at,
      sortKey: at ?? "",
    });
  }

  for (const dispatch of dispatches) {
    const meta = dispatchStatusMeta(dispatch.status);
    const at = dispatch.updatedAt ?? dispatch.createdAt;
    events.push({
      id: `dp-${dispatch.id}`,
      title: `Despacho ${dispatch.workOrderCode ?? dispatch.workOrderTitle ?? "operacional"}`,
      statusLabel: meta.label,
      tone: meta.tone,
      at,
      sortKey: at ?? "",
    });
  }

  return events
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, limit)
    .map(({ sortKey: _sortKey, ...event }) => event);
}

// ===========================================================================
// C3 — Dashboard operacional a partir do agregado real GET /dashboard/summary.
// O backend calcula as contagens por tenant; o front apenas mapeia para os
// cards/listas da tela, com parse DEFENSIVO (null/0/[]-tolerante, camel/snake).
// Nenhum número é fabricado no caminho real: `value` é a contagem real e
// `delta` é sempre um rótulo descritivo (nunca um percentual inventado).
// ===========================================================================

export type DashboardSummaryByStatus = {
  readonly open: number;
  readonly assigned: number;
  readonly accepted: number;
  readonly on_route: number;
  readonly on_site: number;
  readonly in_progress: number;
  readonly paused: number;
  readonly completed: number;
  readonly cancelled: number;
  readonly rejected: number;
};

export type DashboardSummaryModel = {
  readonly workOrders: {
    readonly total: number;
    readonly byStatus: DashboardSummaryByStatus;
    readonly createdToday: number;
    readonly createdThisWeek: number;
    readonly overdue: number;
  };
  readonly registry: {
    readonly customers: number;
    readonly vehicles: number;
    readonly teams: number;
    readonly services: number;
  };
  readonly criticalWorkOrders: readonly DashboardCriticalOrder[];
  readonly recentEvents: readonly DashboardRecentEvent[];
};

export type DashboardCriticalOrder = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly customerName: string | null;
  readonly status: string;
  readonly statusLabel: string;
  readonly statusTone: DashboardTone;
  readonly priority: string;
  readonly priorityLabel: string;
  readonly priorityTone: DashboardTone;
  readonly scheduledFor: string | null;
};

export type DashboardRecentEvent = {
  readonly id: string;
  readonly workOrderId: string | null;
  readonly eventType: string;
  readonly eventLabel: string;
  readonly message: string;
  readonly createdAt: string | null;
  readonly tone: DashboardTone;
};

export type DashboardSummaryBundle = {
  readonly kpis: OperationalKpi[];
  readonly alerts: OperationalAlert[];
  readonly criticalWorkOrders: DashboardCriticalOrder[];
  readonly recentEvents: DashboardRecentEvent[];
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

/** Contagem tolerante: número ou string numérica; ausência/NaN → 0, sem negativos. */
function summaryCount(record: Record<string, unknown> | undefined, keys: readonly string[]): number {
  if (!record) return 0;
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return Math.max(0, Math.trunc(parsed));
  }
  return 0;
}

/** String não-vazia por lista de chaves (camel/snake); ausência → null. */
function summaryString(record: Record<string, unknown> | undefined, keys: readonly string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

const PRIORITY_TONE: Record<string, DashboardTone> = {
  urgent: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

const EVENT_TYPE_META: Record<string, { label: string; tone: DashboardTone }> = {
  work_order_created: { label: "OS criada", tone: "info" },
  created: { label: "OS criada", tone: "info" },
  work_order_assigned: { label: "OS atribuída", tone: "info" },
  assigned: { label: "OS atribuída", tone: "info" },
  work_order_status_changed: { label: "Status alterado", tone: "warning" },
  status_changed: { label: "Status alterado", tone: "warning" },
  work_order_completed: { label: "OS concluída", tone: "success" },
  completed: { label: "OS concluída", tone: "success" },
  work_order_cancelled: { label: "OS cancelada", tone: "danger" },
  cancelled: { label: "OS cancelada", tone: "danger" },
  work_order_rejected: { label: "OS recusada", tone: "danger" },
  rejected: { label: "OS recusada", tone: "danger" },
  work_order_note_added: { label: "Anotação registrada", tone: "neutral" },
  note_added: { label: "Anotação registrada", tone: "neutral" },
  evidence_uploaded: { label: "Evidência anexada", tone: "accent" },
  approval_requested: { label: "Aprovação solicitada", tone: "accent" },
  approval_approved: { label: "Aprovação concedida", tone: "success" },
  approval_rejected: { label: "Aprovação recusada", tone: "danger" },
};

/** Rótulo/tonalidade de evento; desconhecido é humanizado sem quebrar. */
function eventTypeMeta(eventType: string): { label: string; tone: DashboardTone } {
  const key = eventType.toLowerCase();
  const known = EVENT_TYPE_META[key];
  if (known) return known;
  const humanized = eventType.replace(/^work_order_/, "").replaceAll("_", " ").trim();
  const label = humanized ? humanized.charAt(0).toUpperCase() + humanized.slice(1) : "Evento";
  return { label, tone: "neutral" };
}

function parseSummaryByStatus(raw: Record<string, unknown> | undefined): DashboardSummaryByStatus {
  return {
    open: summaryCount(raw, ["open"]),
    assigned: summaryCount(raw, ["assigned"]),
    accepted: summaryCount(raw, ["accepted"]),
    on_route: summaryCount(raw, ["on_route", "onRoute"]),
    on_site: summaryCount(raw, ["on_site", "onSite"]),
    in_progress: summaryCount(raw, ["in_progress", "inProgress"]),
    paused: summaryCount(raw, ["paused"]),
    completed: summaryCount(raw, ["completed"]),
    cancelled: summaryCount(raw, ["cancelled", "canceled"]),
    rejected: summaryCount(raw, ["rejected"]),
  };
}

function parseCriticalOrder(input: unknown): DashboardCriticalOrder | null {
  const record = asRecord(input);
  if (!record) return null;
  const id = summaryString(record, ["id"]);
  if (!id) return null; // sem id não há como abrir a OS — descartado
  const status = summaryString(record, ["status"]) ?? "open";
  const statusMeta = workOrderStatusMeta(status);
  const priority = summaryString(record, ["priority"]) ?? "medium";
  return {
    id,
    // Nunca expõe UUID cru: usa code/title/customerName.
    code: summaryString(record, ["code"]) ?? "OS",
    title: summaryString(record, ["title"]) ?? "Ordem de serviço",
    customerName: summaryString(record, ["customerName", "customer_name"]),
    status,
    statusLabel: statusMeta.label,
    statusTone: statusMeta.tone,
    priority,
    priorityLabel: PRIORITY_LABEL[priority] ?? priority,
    priorityTone: PRIORITY_TONE[priority] ?? "neutral",
    scheduledFor: summaryString(record, ["scheduledFor", "scheduled_for"]),
  };
}

function parseRecentEvent(input: unknown): DashboardRecentEvent | null {
  const record = asRecord(input);
  if (!record) return null;
  const id = summaryString(record, ["id"]);
  if (!id) return null;
  const eventType = summaryString(record, ["eventType", "event_type"]) ?? "";
  const meta = eventTypeMeta(eventType);
  return {
    id,
    workOrderId: summaryString(record, ["workOrderId", "work_order_id"]),
    eventType,
    eventLabel: meta.label,
    // Mensagem humana do backend; se ausente, cai no rótulo (nunca UUID cru).
    message: summaryString(record, ["message"]) ?? meta.label,
    createdAt: summaryString(record, ["createdAt", "created_at"]),
    tone: meta.tone,
  };
}

/** Normaliza o payload do agregado real em um modelo tipado e defensivo. */
export function parseDashboardSummary(raw: unknown): DashboardSummaryModel {
  const root = asRecord(raw) ?? {};
  // Tolera receber o envelope { data: {...} } cru, além do já desembrulhado.
  const container = asRecord(root.data) ?? root;
  const workOrders = asRecord(container.workOrders) ?? asRecord(container.work_orders) ?? {};
  const byStatus = asRecord(workOrders.byStatus) ?? asRecord(workOrders.by_status);
  const registry = asRecord(container.registry) ?? {};
  const criticalRaw = Array.isArray(container.criticalWorkOrders)
    ? container.criticalWorkOrders
    : Array.isArray(container.critical_work_orders)
      ? container.critical_work_orders
      : [];
  const eventsRaw = Array.isArray(container.recentEvents)
    ? container.recentEvents
    : Array.isArray(container.recent_events)
      ? container.recent_events
      : [];

  return {
    workOrders: {
      total: summaryCount(workOrders, ["total"]),
      byStatus: parseSummaryByStatus(byStatus),
      createdToday: summaryCount(workOrders, ["createdToday", "created_today"]),
      createdThisWeek: summaryCount(workOrders, ["createdThisWeek", "created_this_week"]),
      overdue: summaryCount(workOrders, ["overdue"]),
    },
    registry: {
      customers: summaryCount(registry, ["customers"]),
      vehicles: summaryCount(registry, ["vehicles"]),
      teams: summaryCount(registry, ["teams"]),
      services: summaryCount(registry, ["services"]),
    },
    criticalWorkOrders: criticalRaw.map(parseCriticalOrder).filter((order): order is DashboardCriticalOrder => order !== null),
    recentEvents: eventsRaw.map(parseRecentEvent).filter((event): event is DashboardRecentEvent => event !== null),
  };
}

/** KPIs reais do agregado. Sem percentuais fabricados — apenas contagens + rótulo. */
export function summaryToKpis(model: DashboardSummaryModel): OperationalKpi[] {
  const s = model.workOrders.byStatus;
  const abertas = s.open + s.assigned + s.accepted;
  const andamento = s.on_route + s.on_site + s.in_progress + s.paused;
  const overdue = model.workOrders.overdue;
  const registry = model.registry;

  return [
    { id: "open", label: "OS abertas", value: String(abertas), delta: "aguardando início", tone: "info" },
    { id: "in_progress", label: "Em andamento", value: String(andamento), delta: "em campo agora", tone: "warning" },
    { id: "completed", label: "Concluídas", value: String(s.completed), delta: "no total", tone: "success" },
    {
      id: "overdue",
      label: "Atrasadas",
      value: String(overdue),
      delta: overdue > 0 ? "agenda vencida" : "sem atrasos",
      tone: overdue > 0 ? "danger" : "success",
    },
    { id: "created_today", label: "OS hoje", value: String(model.workOrders.createdToday), delta: "criadas hoje", tone: "info" },
    { id: "customers", label: "Clientes", value: String(registry.customers), delta: "no cadastro", tone: "default" },
    { id: "vehicles", label: "Viaturas", value: String(registry.vehicles), delta: "no cadastro", tone: "default" },
    { id: "teams", label: "Equipes", value: String(registry.teams), delta: "no cadastro", tone: "default" },
    { id: "services", label: "Serviços", value: String(registry.services), delta: "no cadastro", tone: "default" },
  ];
}

/** Alertas derivados de contagens reais; lista vazia quando não há ocorrência. */
export function summaryToAlerts(model: DashboardSummaryModel): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const overdue = model.workOrders.overdue;
  if (overdue > 0) {
    alerts.push({
      id: "overdue",
      title: `${overdue} ${overdue === 1 ? "OS atrasada" : "OS atrasadas"}`,
      detail: "Agenda vencida — priorize a fila crítica.",
      severity: "danger",
    });
  }
  return alerts;
}

/**
 * Adapter defensivo do agregado real: converte o payload de
 * GET /dashboard/summary nas formas que o Dashboard consome (KPIs, alertas,
 * OS críticas e eventos recentes), tolerante a null/0/[] e camel/snake.
 */
export function adaptDashboardSummary(raw: unknown): DashboardSummaryBundle {
  const model = parseDashboardSummary(raw);
  return {
    kpis: summaryToKpis(model),
    alerts: summaryToAlerts(model),
    criticalWorkOrders: [...model.criticalWorkOrders],
    recentEvents: [...model.recentEvents],
  };
}
