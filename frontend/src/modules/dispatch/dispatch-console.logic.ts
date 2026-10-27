import type { DashboardSummaryModel } from "../dashboard/dashboard.adapter";
import {
  formatIncomingCallSlaProxy,
  formatLastSeen,
  incomingCallSlaTone,
  resolveAssignedTechnicianName,
  SLA_DUE_SOON_THRESHOLD_MS,
  sortIncomingCalls,
  type IncomingCallSlaTone,
} from "../operations/map/operations-map.adapter";
import type { FieldLocationItem, FieldLocationStatus, OperationsIncomingCall } from "../operations/map/operations-map.types";
import { workOrderServiceLine } from "../work-orders/work-orders-row.logic";
import type { WorkOrderListItem, WorkOrderPriority, WorkOrderStatus } from "../work-orders/work-orders.types";
import { adaptFieldOperators, summarizeFieldOperatorStatuses } from "./field-operators.adapter";
import type { FieldOperatorStatusTone } from "./field-operators.types";
import type { ConsoleSourceResult, ConsoleWorkOrders } from "./dispatch-console.service";

// B-SAN3-06a (D-TELAS-SAN3-06a) — o núcleo PURO do Console Dispatcher, testável sem React (espelho de
// `work-orders/work-orders.state.ts`, a regra da tela-modelo). Dois papéis:
//  1. `nextBlockState` decide o estado §7 de CADA bloco a partir do que a fonte devolveu: carregando · vazio · erro ·
//     acesso não permitido · desatualizado. O 403 decide primeiro; falha em segundo plano com dado já na tela mantém o
//     dado e marca "desatualizado"; só a primeira carga (ou a nova tentativa explícita) troca a tela pelo erro.
//  2. As derivações (KPIs, alertas, fila, técnicos) só leem o que o servidor mandou — nenhum número, nome ou código
//     nasce aqui (D-007). Os helpers são os do Mapa e da tela de Operadores de Campo: uma verdade por regra.

export type ConsoleBlockStatus = "loading" | "ready" | "empty" | "error" | "forbidden";

export type ConsoleBlockState<T> = {
  readonly status: ConsoleBlockStatus;
  /** O dado mostrado. `null` em carregando/erro/sem permissão; em "desatualizado" é o último dado bom. */
  readonly data: T | null;
  readonly error: string | null;
  /** Há dado na tela, mas a última atualização em segundo plano falhou. */
  readonly stale: boolean;
  /** ISO da última leitura bem-sucedida da fonte; `null` enquanto nada carregou. */
  readonly lastUpdatedAt: string | null;
};

export function initialBlockState<T>(): ConsoleBlockState<T> {
  return { status: "loading", data: null, error: null, stale: false, lastUpdatedAt: null };
}

const FORBIDDEN_MESSAGE = "Seu perfil não tem acesso a esta informação nesta organização.";
const UNCLASSIFIED_MESSAGE = "Não foi possível interpretar a resposta do servidor.";

/** Só compila se `value` já foi exaurido — membro novo de `ConsoleSourceResult` quebra o `tsc`. */
function unclassified(value: never): string {
  return String(value);
}

export function nextBlockState<T>(
  prev: ConsoleBlockState<T>,
  result: ConsoleSourceResult<T>,
  background: boolean,
  isEmpty: (data: T) => boolean,
  now: string = new Date().toISOString(),
): ConsoleBlockState<T> {
  switch (result.kind) {
    case "forbidden":
      // Fail-closed: permissão revogada em sessão tira o dado da tela, mesmo em segundo plano.
      return { status: "forbidden", data: null, error: FORBIDDEN_MESSAGE, stale: false, lastUpdatedAt: prev.lastUpdatedAt };
    case "ok":
      return { status: isEmpty(result.data) ? "empty" : "ready", data: result.data, error: null, stale: false, lastUpdatedAt: now };
    case "error":
      if (background && prev.lastUpdatedAt !== null && prev.data !== null) return { ...prev, error: result.message, stale: true };
      return { status: "error", data: null, error: result.message, stale: false, lastUpdatedAt: prev.lastUpdatedAt };
    default:
      unclassified(result);
      return { status: "error", data: null, error: UNCLASSIFIED_MESSAGE, stale: false, lastUpdatedAt: prev.lastUpdatedAt };
  }
}

// ———————————————————————————————— KPIs ————————————————————————————————

/** Contagens do resumo (`GET /dashboard/summary`), por organização — autoridade do backend, não a janela lida. */
export type ConsoleSummaryCounts = {
  /** Aguardando início: aberta + atribuída + aceita. */
  readonly queued: number;
  /** Em campo: em rota + no local + em atendimento + pausada. */
  readonly inField: number;
  /** Agenda vencida e não finalizada (o `overdue` do resumo). */
  readonly overdue: number;
};

export function summaryCounts(model: DashboardSummaryModel): ConsoleSummaryCounts {
  const s = model.workOrders.byStatus;
  return {
    queued: s.open + s.assigned + s.accepted,
    inField: s.on_route + s.on_site + s.in_progress + s.paused,
    overdue: model.workOrders.overdue,
  };
}

/** Organização sem OS nenhuma → os KPIs do resumo mostram 0 com o selo "sem registros" (estado vazio do bloco). */
export function isSummaryEmpty(model: DashboardSummaryModel): boolean {
  return model.workOrders.total === 0;
}

/** Nenhum técnico com posição registrada → bloco "vazio". */
export function isLocationsEmpty(locations: readonly FieldLocationItem[]): boolean {
  return locations.length === 0;
}

/** Técnicos disponíveis: a MESMA partição da tela Operadores de Campo (`summarizeFieldOperatorStatuses`). */
export function availableTechnicians(locations: readonly Pick<FieldLocationItem, "status">[]): number {
  return summarizeFieldOperatorStatuses(locations).available;
}

// ———————————————————————————————— Fila ————————————————————————————————

const TERMINAL: ReadonlySet<WorkOrderStatus> = new Set<WorkOrderStatus>(["completed", "cancelled", "rejected"]);

export function isActiveWorkOrder(order: Pick<WorkOrderListItem, "status">): boolean {
  return !TERMINAL.has(order.status);
}

export type ConsoleQueueRow = {
  readonly id: string;
  readonly code: string;
  readonly customerName: string | null;
  readonly service: string;
  readonly priority: WorkOrderPriority;
  readonly status: WorkOrderStatus;
  readonly slaLabel: string;
  readonly slaTone: IncomingCallSlaTone;
  /** A OS tem técnico atribuído no servidor. */
  readonly assigned: boolean;
  /** Nome do técnico quando a posição dele foi lida; `null` = sem atribuição ou nome não resolvido (nunca inventado). */
  readonly technicianName: string | null;
};

function toCall(order: WorkOrderListItem): OperationsIncomingCall {
  return {
    id: order.id,
    code: order.code,
    title: order.title,
    priority: order.priority,
    customerName: order.customerName ?? null,
    serviceAddress: order.serviceAddress ?? null,
    scheduledFor: order.scheduledFor ?? null,
    createdAt: order.createdAt ?? null,
    slaDueAt: order.slaDueAt ?? null,
    hasLocation: false,
  };
}

/**
 * Fila de despacho = OS ainda não finalizadas, na ordem de triagem do Mapa (`sortIncomingCalls`: prioridade → prazo
 * real/agenda/abertura → abertura → id). Prazo e tom pelos mesmos helpers do Mapa (`formatIncomingCallSlaProxy`,
 * `incomingCallSlaTone`): countdown só com `slaDueAt` real; sem prazo, o rótulo honesto de agenda/abertura.
 */
export function buildConsoleQueue(
  workOrders: ConsoleWorkOrders,
  locations: readonly FieldLocationItem[],
  now: Date,
): ConsoleQueueRow[] {
  const active = workOrders.items.filter(isActiveWorkOrder);
  const byId = new Map(active.map((order) => [order.id, order]));
  return sortIncomingCalls(active.map(toCall)).flatMap((call) => {
    const order = byId.get(call.id);
    if (!order) return [];
    const assigned = Boolean(order.assignedOperatorId || order.assignedUserId);
    const resolved = assigned ? resolveAssignedTechnicianName(order, locations) : "—";
    const sla = formatIncomingCallSlaProxy(call, now);
    return [
      {
        id: order.id,
        code: order.code,
        customerName: order.customerName ?? null,
        service: workOrderServiceLine(order),
        priority: order.priority,
        status: order.status,
        slaLabel: sla.label,
        slaTone: incomingCallSlaTone(call, now),
        assigned,
        technicianName: resolved === "—" ? null : resolved,
      },
    ];
  });
}

/** A fila não tem OS ativa → bloco "vazio" (as finalizadas não entram na fila). */
export function isQueueEmpty(workOrders: ConsoleWorkOrders): boolean {
  return !workOrders.items.some(isActiveWorkOrder);
}

// ———————————————————————————————— Alertas ————————————————————————————————

export type ConsoleSlaAlert = {
  readonly workOrderId: string;
  readonly code: string;
  readonly customerName: string | null;
  /** "vence em …" / "vencido há …" — só existe com `slaDueAt` real. */
  readonly dueLabel: string;
  readonly assigned: boolean;
  /** Quantas OS ALÉM desta estão vencidas ou a menos de 30 min do prazo. */
  readonly more: number;
};

/**
 * "SLA crítico": OS ativa com PRAZO REAL (`slaDueAt`) vencido ou a menos de `SLA_DUE_SOON_THRESHOLD_MS` (30 min, o mesmo
 * limiar do Mapa). A mais urgente vira o alerta; as demais entram na contagem. Sem prazo real, não há alerta —
 * agenda vencida é "Atrasadas", outra coisa.
 */
export function buildSlaAlert(workOrders: ConsoleWorkOrders, now: Date): ConsoleSlaAlert | null {
  const critical = workOrders.items
    .filter(isActiveWorkOrder)
    .flatMap((order) => {
      const due = order.slaDueAt ? Date.parse(order.slaDueAt) : Number.NaN;
      if (Number.isNaN(due) || due - now.getTime() >= SLA_DUE_SOON_THRESHOLD_MS) return [];
      return [{ order, due }];
    })
    .sort((left, right) => left.due - right.due || left.order.id.localeCompare(right.order.id));
  const first = critical[0];
  if (!first) return null;
  return {
    workOrderId: first.order.id,
    code: first.order.code,
    customerName: first.order.customerName ?? null,
    dueLabel: formatIncomingCallSlaProxy(toCall(first.order), now).label,
    assigned: Boolean(first.order.assignedOperatorId || first.order.assignedUserId),
    more: critical.length - 1,
  };
}

export type ConsoleStaleAlert = {
  readonly technicianName: string;
  /** "há 22 min" — frescor da última posição (o mesmo `formatLastSeen` do Mapa). */
  readonly lastSeen: string;
  readonly more: number;
};

// Fora de operação (offline/bloqueado/desconhecido) sem posição nova é o esperado — não é "parado".
const WORKING: ReadonlySet<FieldLocationStatus> = new Set<FieldLocationStatus>(["available", "dispatched", "on_route", "on_site", "in_service", "paused"]);

/**
 * "Técnico parado": técnico em operação cuja última posição passou do limiar de frescor do Mapa (`isStale`, 15 min —
 * `FIELD_LOCATION_STALE_THRESHOLD_MS`). O mais antigo vira o alerta; os demais entram na contagem.
 */
export function buildStaleTechnicianAlert(locations: readonly FieldLocationItem[], now: Date): ConsoleStaleAlert | null {
  const stale = locations
    .filter((location) => location.isStale && WORKING.has(location.status))
    .sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt) || left.id.localeCompare(right.id));
  const first = stale[0];
  if (!first) return null;
  return { technicianName: first.displayName, lastSeen: formatLastSeen(first.capturedAt, now), more: stale.length - 1 };
}

// ———————————————————————————————— Técnicos ————————————————————————————————

export type ConsoleTechnicianRow = {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly currentOs: string;
  readonly lastSeen: string;
  readonly statusLabel: string;
  readonly statusTone: FieldOperatorStatusTone;
  /** Posição mais velha que o limiar de frescor — a linha diz isso em texto, não só em cor. */
  readonly stale: boolean;
};

/** Linhas dos técnicos pela projeção da tela Operadores de Campo (`adaptFieldOperators`; LGPD §12: sem coordenada). */
export function buildConsoleTechnicians(locations: readonly FieldLocationItem[], now: Date): ConsoleTechnicianRow[] {
  const staleById = new Map(locations.map((location) => [location.id, location.isStale]));
  return adaptFieldOperators(locations, now).map((row) => {
    const stale = staleById.get(row.id) === true;
    return {
      id: row.id,
      name: row.name,
      team: row.team,
      currentOs: row.currentOs,
      lastSeen: row.lastSeen,
      statusLabel: stale ? "Localização antiga" : row.statusLabel,
      statusTone: row.statusTone,
      stale,
    };
  });
}
