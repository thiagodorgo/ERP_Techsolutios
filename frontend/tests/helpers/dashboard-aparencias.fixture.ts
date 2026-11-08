// B-APAR-DASH — os dados de exemplo da REFERÊNCIA APROVADA (`screen-refs/dashboard-3opcoes.reference.html`: `OS`, `CRIT`,
// `BY`/`SUM`, `SERIES`, `DISP`, `LOCS`, `APR`, `EVTS_RAW`), no formato do que o servidor manda e do que os adaptadores do
// app devolvem. O relógio é o `NOW` da maquete: 14/10/2026 09:40 (hora local). O resumo passa pelo adaptador REAL
// (`adaptDashboardSummary`/`parseDashboardSummary`), para que o modelo do teste seja o que o hook monta.
// Diferenças honestas em relação à maquete (D-007): a mensagem do evento é a que o servidor grava hoje (sem acento e sem
// o código da OS — P-APAR-DASH-EVENTO-CODIGO-ACENTO); a OS crítica não traz técnico nem endereço (vêm de GET /work-orders/:id).

import { adaptDashboardSummary, parseDashboardSummary } from "../../src/modules/dashboard/dashboard.adapter";
import type { DashboardRowDetail, DashboardViewModel } from "../../src/modules/dashboard/views/dashboard.view-model";
import type { WorkOrderTimeseriesPoint } from "../../src/modules/dashboard/work-order-timeseries.types";
import type { DispatchListItem } from "../../src/modules/operations/dispatches/dispatches.types";
import type { FieldLocationItem } from "../../src/modules/operations/map/operations-map.types";
import type { OperationalApproval } from "../../src/modules/work-orders/approval.types";

export const AGORA = new Date(2026, 9, 14, 9, 40, 0, 0);
export const at = (minutes: number) => new Date(AGORA.getTime() + minutes * 60000).toISOString();
export const ago = (minutes: number) => at(-minutes);

type CritRaw = readonly [code: string, title: string, customer: string, status: string, priority: string, agenda: number | null];

// `CRIT` da referência — as 8 OS críticas que o servidor manda (já sem finalizadas, #446).
const CRIT_RAW: readonly CritRaw[] = [
  ["OS-2026-0418", "Remoção de veículo leve", "Seguradora Aliança Sul", "assigned", "urgent", -130],
  ["OS-2026-0415", "Reboque de caminhão baú", "Transportadora Ômega", "on_route", "high", -85],
  ["OS-2026-0409", "Socorro mecânico — pane elétrica", "Locadora Via Rápida", "open", "high", -50],
  ["OS-2026-0421", "Troca de pneu em rodovia", "Ana Ribeiro (particular)", "accepted", "medium", -20],
  ["OS-2026-0423", "Remoção para pátio — apreensão", "Departamento de Trânsito Municipal", "open", "urgent", 50],
  ["OS-2026-0425", "Guincho de motocicleta", "Seguradora Aliança Sul", "assigned", "high", 95],
  ["OS-2026-0426", "Transporte de veículo sinistrado", "Oficina Mecânica Central", "open", "high", 200],
  ["OS-2026-0427", "Remoção de veículo pesado", "Construtora Horizonte", "in_progress", "urgent", null],
];

export const woId = (code: string) => `wo-${code.slice(-4)}`;

export const CRITICAL_DTO = CRIT_RAW.map(([code, title, customerName, status, priority, agenda]) => ({
  id: woId(code),
  code,
  title,
  status,
  priority,
  scheduledFor: agenda === null ? null : at(agenda),
  customerName,
}));

// `EVTS_RAW` da referência, com a mensagem que o servidor grava (`defaultStatusMessage`, `work-order.service.ts`).
const EVT_RAW: readonly (readonly [id: string, type: string, code: string, message: string, minutesAgo: number])[] = [
  ["e1", "work_order_status_changed", "OS-2026-0411", "Operador chegou ao local.", 6],
  ["e2", "approval_requested", "OS-2026-0411", "Aprovacao solicitada: avaria nao prevista no checklist.", 9],
  ["e3", "work_order_status_changed", "OS-2026-0415", "Operador em deslocamento.", 12],
  ["e4", "approval_requested", "OS-2026-0409", "Aprovacao solicitada: orcamento acima da alcada.", 22],
  ["e5", "work_order_assigned", "OS-2026-0418", "Ordem de servico atribuida.", 25],
  ["e6", "work_order_created", "OS-2026-0430", "Ordem de servico criada.", 31],
  ["e7", "work_order_created", "OS-2026-0429", "Ordem de servico criada.", 33],
  ["e8", "work_order_status_changed", "OS-2026-0427", "Atendimento iniciado.", 52],
  ["e9", "work_order_completed", "OS-2026-0398", "Ordem de servico concluida.", 58],
  ["e10", "work_order_cancelled", "OS-2026-0390", "Ordem de servico cancelada.", 75],
];

export const EVENTS_DTO = EVT_RAW.map(([id, eventType, code, message, minutesAgo]) => ({ id, workOrderId: woId(code), eventType, message, createdAt: ago(minutesAgo) }));

export const BY_STATUS = { open: 9, assigned: 6, accepted: 3, on_route: 5, on_site: 3, in_progress: 7, paused: 2, completed: 412, cancelled: 21, rejected: 4 } as const;

/** O agregado GET /dashboard/summary (o `data` do envelope), com os números da referência. */
export const SUMMARY_DTO = {
  workOrders: { total: 472, byStatus: { ...BY_STATUS }, createdToday: 14, createdThisWeek: 63, overdue: 4 },
  registry: { customers: 186, vehicles: 23, teams: 7, services: 34 },
  criticalWorkOrders: CRITICAL_DTO,
  recentEvents: EVENTS_DTO,
};

/** O mesmo gerador da referência (`rngFrom('guincho-exemplo')`), para a série ser comparável lado a lado. */
function rngFrom(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const SERIES_POINTS: readonly WorkOrderTimeseriesPoint[] = (() => {
  const r = rngFrom("guincho-exemplo");
  const out: WorkOrderTimeseriesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(AGORA.getFullYear(), AGORA.getMonth(), AGORA.getDate() - i);
    const wk = d.getDay() === 0 ? 0.55 : d.getDay() === 6 ? 0.75 : 1;
    let created = Math.round((11 + r() * 9) * wk);
    let completed = Math.max(0, created - 2 + Math.round(r() * 4));
    let cancelled = Math.round(r() * 2);
    if (i === 0) {
      created = 14;
      completed = 6;
      cancelled = 1;
    }
    out.push({ date: isoDay(d), created, completed, cancelled });
  }
  return out;
})();

// `DISP` da referência — despachos ativos com a hora de cada etapa.
export const DISPATCHES: readonly DispatchListItem[] = [
  { id: "d5", workOrderId: woId("OS-2026-0402"), workOrderCode: "OS-2026-0402", workOrderTitle: "Socorro mecânico — superaquecimento", operatorUserId: "u-diego", status: "accepted", priority: "medium", observation: "Cliente aguarda no estacionamento do mercado.", createdAt: ago(10), acceptedAt: ago(3), updatedAt: ago(3) },
  { id: "d2", workOrderId: woId("OS-2026-0411"), workOrderCode: "OS-2026-0411", workOrderTitle: "Remoção de veículo leve", operatorUserId: "u-rafael", status: "arrived", priority: "medium", observation: "Veículo na faixa da direita, sinalizado.", createdAt: ago(70), acceptedAt: ago(62), onRouteAt: ago(35), arrivedAt: ago(6), updatedAt: ago(6) },
  { id: "d1", workOrderId: woId("OS-2026-0415"), workOrderCode: "OS-2026-0415", workOrderTitle: "Reboque de caminhão baú", operatorUserId: "u-carlos", status: "on_route", priority: "high", observation: "Acesso pela marginal; motorista aguarda no posto.", createdAt: ago(48), acceptedAt: ago(40), onRouteAt: ago(12), updatedAt: ago(12) },
  { id: "d3", workOrderId: woId("OS-2026-0418"), workOrderCode: "OS-2026-0418", workOrderTitle: "Remoção de veículo leve", operatorUserId: "u-pedro", status: "assigned", priority: "urgent", observation: "Aguardando aceite do operador.", createdAt: ago(25), updatedAt: ago(25) },
  { id: "d4", workOrderId: woId("OS-2026-0427"), workOrderCode: "OS-2026-0427", workOrderTitle: "Remoção de veículo pesado", operatorUserId: "u-juliana", status: "in_service", priority: "urgent", observation: "Carga a transferir antes do reboque.", createdAt: ago(150), acceptedAt: ago(142), onRouteAt: ago(120), arrivedAt: ago(75), inServiceAt: ago(52), updatedAt: ago(52) },
];

type LocRaw = readonly [id: string, userId: string, name: string, team: string, status: FieldLocationItem["status"], stale: boolean, minutesAgo: number, os: string | null, speedKmh: number | null, battery: number, accuracy: number];

// `LOCS` da referência — sem sinal primeiro, depois a mais recente.
const LOC_RAW: readonly LocRaw[] = [
  ["l1", "u-pedro", "Pedro Alves", "Equipe Norte", "available", true, 38, "OS-2026-0418", null, 41, 25],
  ["l2", "u-carlos", "Carlos Mendes", "Equipe Norte", "on_route", false, 1, "OS-2026-0415", 42, 76, 8],
  ["l3", "u-rafael", "Rafael Souza", "Equipe Centro", "on_site", false, 2, "OS-2026-0411", 0, 63, 6],
  ["l4", "u-marcos", "Marcos Lima", "Equipe Leste", "available", false, 3, null, 0, 92, 10],
  ["l5", "u-juliana", "Juliana Prado", "Equipe Sul", "in_service", false, 4, "OS-2026-0427", 0, 88, 5],
];

const OS_TITLE: Readonly<Record<string, string>> = {
  "OS-2026-0418": "Remoção de veículo leve",
  "OS-2026-0415": "Reboque de caminhão baú",
  "OS-2026-0411": "Remoção de veículo leve",
  "OS-2026-0427": "Remoção de veículo pesado",
};

export const LOCATIONS: readonly FieldLocationItem[] = LOC_RAW.map(([id, userId, name, team, status, stale, minutesAgo, os, speedKmh, battery, accuracy]) => ({
  id,
  operatorId: userId,
  userId,
  displayName: name,
  operatorName: name,
  teamName: team,
  status,
  latitude: -23.55,
  longitude: -46.63,
  accuracyMeters: accuracy,
  speed: speedKmh === null ? null : speedKmh / 3.6,
  batteryLevel: battery,
  capturedAt: ago(minutesAgo),
  isStale: stale,
  currentWorkOrder: os ? { id: woId(os), code: os, title: OS_TITLE[os] ?? "Ordem de serviço", status: "on_route", priority: "high" } : null,
}));

/** O DTO bruto de GET /field-locations/latest (a ordem e o "sem sinal" o adaptador recalcula pelo relógio). */
export const LOCATIONS_DTO = LOC_RAW.map(([id, userId, name, team, status, , minutesAgo, , speedKmh, battery, accuracy]) => ({
  id,
  operatorId: userId,
  userId,
  displayName: name,
  teamName: team,
  status,
  latitude: -23.55,
  longitude: -46.63,
  accuracyMeters: accuracy,
  speed: speedKmh === null ? null : speedKmh / 3.6,
  batteryLevel: battery,
  capturedAt: ago(minutesAgo),
}));

// `APR` da referência — aprovações pendentes (só a C pede).
export const APPROVALS: readonly OperationalApproval[] = [
  { id: "ap2", entityType: "checklist_run", entityId: "run-1", workOrderId: woId("OS-2026-0411"), status: "pending_approval", requestedBy: "u-rafael", requestedAt: ago(9), pendingReason: "Avaria não prevista registrada no checklist de remoção.", safeMessage: "Aguardando decisão." },
  { id: "ap1", entityType: "work_order", entityId: woId("OS-2026-0409"), workOrderId: woId("OS-2026-0409"), status: "pending_approval", requestedBy: "u-larissa", requestedAt: ago(22), pendingReason: "Orçamento acima da alçada do atendimento.", safeMessage: "Aguardando decisão." },
];

export const APPROVALS_DTO = APPROVALS.map((a) => ({
  id: a.id,
  entity_type: a.entityType,
  entity_id: a.entityId,
  work_order_id: a.workOrderId,
  status: a.status,
  requested_by: a.requestedBy,
  requested_at: a.requestedAt,
  pending_reason: a.pendingReason,
  safe_message: a.safeMessage,
}));

// Perfis (catalog.ts): o gestor lê e cria tudo; o Suporte só tem `dashboard:read` (referência, "Comportamento por perfil").
export const GESTOR = ["dashboard:read", "work_orders:read", "work_orders:create", "field_dispatch:read", "field_location:read", "customers:read", "vehicles:read", "teams:read", "services:read"] as const;
export const SUPORTE = ["dashboard:read"] as const;

const bundle = adaptDashboardSummary(SUMMARY_DTO);
const model0 = parseDashboardSummary(SUMMARY_DTO);

type Overrides = Partial<Omit<DashboardViewModel, "state" | "access">> & { readonly state?: Partial<DashboardViewModel["state"]> };

/** O modelo que o contêiner monta para as views, com o relógio da maquete e o perfil dado. Os callbacks registram as chamadas. */
export function buildDashModel(overrides: Overrides = {}, permissions: readonly string[] = GESTOR) {
  const calls: string[] = [];
  const can = (permission: string) => permissions.includes(permission);
  const readWorkOrders = can("work_orders:read");
  const { state: stateOverride, ...rest } = overrides;
  const model: DashboardViewModel = {
    now: AGORA,
    userName: "Mariana",
    orgName: "Guincho Exemplo Ltda",
    summary: { status: "ready", reason: null, kpis: bundle.kpis, byStatus: model0.workOrders.byStatus, critical: bundle.criticalWorkOrders, events: bundle.recentEvents, source: "api" },
    series: readWorkOrders ? { status: "ready", items: SERIES_POINTS, source: "api" } : { status: "forbidden", items: [], source: "fallback" },
    dispatches: can("field_dispatch:read") ? { status: "ready", items: DISPATCHES } : { status: "forbidden", items: [] },
    locations: can("field_location:read") ? { status: "ready", items: LOCATIONS } : { status: "forbidden", items: [] },
    approvals: readWorkOrders ? { status: "ready", items: APPROVALS } : { status: "forbidden", items: [] },
    workOrders: null,
    rowDetail: {} as Record<string, DashboardRowDetail>,
    access: {
      readWorkOrders,
      createWorkOrder: can("work_orders:create"),
      readDispatches: can("field_dispatch:read"),
      readLocations: can("field_location:read"),
      readApprovals: readWorkOrders,
      can,
    },
    state: { cartao: null, linha: null, aba: "todas", etapa: null, dia: null, campo: null, bloco: "todas", rail: "campo", ...stateOverride },
    stale: false,
    lastUpdatedAt: null,
    demo: false,
    onState: (next) => calls.push(`state ${JSON.stringify(next)}`),
    onRetry: () => calls.push("retry"),
    onNavigate: (to) => calls.push(`navigate ${to}`),
    onOpenWorkOrder: (id) => calls.push(`open ${id}`),
    onCreate: () => calls.push("create"),
    ...rest,
  };
  return { model, calls };
}

// ---- Leituras do HTML do SSR (sem DOM), como as da OS ----

export const rowKeys = (html: string) => [...html.matchAll(/<tr class="pat-ab-row" tabindex="0" aria-expanded="(?:true|false)" data-row-key="([^"]+)"/g)].map((m) => m[1]);
export const detailRows = (html: string) => (html.match(/class="pat-ab-detail-row"/g) ?? []).length;
export const pressedButtons = (html: string) =>
  [...html.matchAll(/<button[^>]*?aria-label="([^"]+)"[^>]*?aria-pressed="(true|false)"|<button[^>]*?aria-pressed="(true|false)"[^>]*?aria-label="([^"]+)"/g)].map((m) => ({
    label: m[1] ?? m[4],
    pressed: (m[2] ?? m[3]) === "true",
  }));
/** O bloco `<section>` cujo título é `title` (até o fechamento do próprio `</section>`, sem aninhamento de section). */
export function section(html: string, title: string): string {
  const start = html.indexOf(`>${title}</h2>`);
  if (start < 0) return "";
  const open = html.lastIndexOf("<section", start);
  const close = html.indexOf("</section>", start);
  return html.slice(open, close + "</section>".length);
}
/** O texto visível (sem tags, sem atributos). */
export const visibleText = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

// ---- OS no formato da lista/detalhe do servidor (para a conferência visual: o enriquecimento do mapa liga a OS ao
// operador pelo `assigned_operator_id`, e a linha da B pede GET /work-orders/:id). Endereços e atribuições da referência. ----
type OsRaw = readonly [code: string, title: string, customer: string, status: string, priority: string, agenda: number | null, address: string, city: string, operator: string | null];
const OS_RAW: readonly OsRaw[] = [
  ["OS-2026-0418", "Remoção de veículo leve", "Seguradora Aliança Sul", "assigned", "urgent", -130, "Av. Industrial, 1.240", "Santo André", "u-pedro"],
  ["OS-2026-0415", "Reboque de caminhão baú", "Transportadora Ômega", "on_route", "high", -85, "Rod. Anhanguera, km 31", "Cajamar", "u-carlos"],
  ["OS-2026-0409", "Socorro mecânico — pane elétrica", "Locadora Via Rápida", "open", "high", -50, "Rua Vergueiro, 3.150 — Vila Mariana", "São Paulo", null],
  ["OS-2026-0421", "Troca de pneu em rodovia", "Ana Ribeiro (particular)", "accepted", "medium", -20, "Rod. dos Imigrantes, km 18", "São Bernardo do Campo", "u-lucas"],
  ["OS-2026-0423", "Remoção para pátio — apreensão", "Departamento de Trânsito Municipal", "open", "urgent", 50, "Av. Kennedy, 700", "Santo André", null],
  ["OS-2026-0425", "Guincho de motocicleta", "Seguradora Aliança Sul", "assigned", "high", 95, "Rua Augusta, 2.010 — Jardins", "São Paulo", "u-marcos-l"],
  ["OS-2026-0426", "Transporte de veículo sinistrado", "Oficina Mecânica Central", "open", "high", 200, "Av. do Estado, 4.800 — Cambuci", "São Paulo", null],
  ["OS-2026-0427", "Remoção de veículo pesado", "Construtora Horizonte", "in_progress", "urgent", null, "Av. Jacu-Pêssego, 2.300 — Itaquera", "São Paulo", "u-juliana"],
  ["OS-2026-0411", "Remoção de veículo leve", "Seguradora Aliança Sul", "on_site", "medium", null, "Av. Paulista, 1.578 — Bela Vista", "São Paulo", "u-rafael"],
];

export const WORK_ORDER_DTOS: readonly Record<string, unknown>[] = OS_RAW.map(([code, title, customer, status, priority, agenda, address, city, operator]) => ({
  id: woId(code),
  code,
  title,
  status,
  priority,
  customer_name: customer,
  service_address: address,
  service_city: city,
  service_state: "SP",
  scheduled_for: agenda === null ? null : at(agenda),
  assigned_operator_id: operator,
  created_at: ago(120),
  updated_at: ago(10),
}));

/** Os despachos no formato do servidor (`GET /operations/dispatches`). */
export const DISPATCHES_DTO = DISPATCHES.map((d) => ({ ...d }));

// ---- A página de OS da C ("OS sem operador", Emenda 1 ao §2): a primeira página de GET /work-orders (sem `limit`), como
// o serviço vivo a devolve. Traz as OS da referência sem técnico (0429, 0430) e uma crítica repetida (0409) — a fila
// não pode duplicar a entidade. O servidor informa mais OS do que as devolvidas (`total`), e a tela diz o universo. ----
export const PAGE_DTOS: readonly Record<string, unknown>[] = [
  ...WORK_ORDER_DTOS,
  { id: woId("OS-2026-0429"), code: "OS-2026-0429", title: "Remoção de veículo leve", status: "open", priority: "medium", customer_name: "Bruno Teixeira (particular)", service_address: "Rua Domingos de Morais, 2.200", service_city: "São Paulo", service_state: "SP", scheduled_for: at(320), assigned_operator_id: null, created_at: ago(33), updated_at: ago(33) },
  { id: woId("OS-2026-0430"), code: "OS-2026-0430", title: "Socorro mecânico — bateria", status: "open", priority: "low", customer_name: "Condomínio Jardim das Acácias", service_address: "Rua das Acácias, 85", service_city: "Osasco", service_state: "SP", scheduled_for: null, assigned_operator_id: null, created_at: ago(31), updated_at: ago(31) },
];
export const PAGE_TOTAL = 412 + 35;

/** O bloco `workOrders` do modelo, montado pelo adaptador REAL da lista de OS. */
export async function pageBlock(total = PAGE_TOTAL) {
  const { adaptWorkOrdersResponse } = await import("../../src/modules/work-orders/work-orders.adapter");
  const data = adaptWorkOrdersResponse({ items: PAGE_DTOS, pagination: { limit: 20, offset: 0, total } });
  return { status: "ready" as const, items: data.items, loaded: data.items.length, serverTotal: Math.max(data.pagination.total, data.items.length), partial: data.pagination.total > data.items.length };
}
