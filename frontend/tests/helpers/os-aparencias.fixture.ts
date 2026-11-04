// B-APAR-OS — as OS de exemplo da REFERÊNCIA APROVADA (`screen-refs/ordens-de-servico-3opcoes.reference.html`, `RAW` e
// `definirMarcos`), no formato do DTO real da lista (`WorkOrderListItem`, o que `toWorkOrderListDto` devolve depois do
// adapter). O relógio é o `AGORA` da maquete: 14/10/2026 10:00 (hora local). São as mesmas 24 OS da maquete, para que os
// números da tela do app e os da referência sejam comparáveis lado a lado na conferência visual.
// Campos que a lista NÃO tem e a maquete inventava (nome do técnico, viatura, equipe, destino, fotos) ficam de fora.

import type { WorkOrdersViewModel } from "../../src/modules/work-orders/pages/views/work-orders.view-model";
import type { WorkOrderListItem, WorkOrderPriority, WorkOrderStatus } from "../../src/modules/work-orders/work-orders.types";

export const AGORA = new Date(2026, 9, 14, 10, 0, 0, 0);
const em = (minutes: number | null) => (minutes === null ? null : new Date(AGORA.getTime() + minutes * 60000).toISOString());

const SERV: Readonly<Record<string, string>> = {
  reboque_leve: "Reboque leve",
  reboque_pesado: "Reboque pesado",
  socorro: "Socorro mecânico",
  pneu: "Troca de pneu",
  bateria: "Carga de bateria",
  pane: "Pane seca",
  chaveiro: "Chaveiro automotivo",
  remocao: "Remoção para pátio",
};

type Raw = readonly [number, string, string, WorkOrderPriority, WorkOrderStatus, string | null, string | null, string, string, number | null, 0 | 1, string, number | null, number];

// [nº, serviço, veículo, prioridade, situação, cliente, telefone, endereço, cidade, agenda (min), atribuída, vistorias, SLA (min), criada (min)]
const RAW: readonly Raw[] = [
  [101, "reboque_leve", "VW Gol prata", "high", "on_route", "Seguradora Horizonte Auto", "(11) 3003-4100", "Av. Paulista, 1.578 — Bela Vista", "São Paulo", 10, 1, "cd", 40, -150],
  [102, "socorro", "Fiat Strada branca", "urgent", "open", null, null, "Rod. Presidente Dutra, km 210", "Guarulhos", -45, 0, "", -5, -70],
  [103, "pneu", "Chevrolet Onix preto", "medium", "assigned", "Rota Locadora de Veículos", "(11) 4002-8922", "R. Augusta, 900 — Consolação", "São Paulo", 30, 1, "", 90, -40],
  [104, "reboque_pesado", "Scania R 450 com semirreboque", "high", "in_progress", "Transportadora Rápido Sul Ltda", "(11) 2604-7700", "Rod. Anhanguera, km 26 — Perus", "São Paulo", -1600, 1, "c", null, -1700],
  [105, "bateria", "Hyundai HB20 vermelho", "low", "completed", "Marcos Vinícius Pereira", "(11) 98765-1234", "R. das Figueiras, 120 — Jardim", "Santo André", -300, 1, "g", null, -420],
  [106, "chaveiro", "Renault Kwid branco", "medium", "accepted", "Rota Locadora de Veículos", "(11) 4002-8922", "Av. dos Autonomistas, 1.400 — Centro", "Osasco", 75, 1, "", 120, -60],
  [107, "reboque_leve", "Toyota Corolla cinza", "urgent", "open", "Seguradora Horizonte Auto", "(11) 3003-4100", "Av. Marginal do Tietê, 2.400 — Vila Maria", "São Paulo", 15, 0, "", 25, -12],
  [108, "remocao", "Fiat Uno vermelho", "medium", "on_site", "Frota Municipal de Osasco", "(11) 3652-9000", "R. Antônio Agu, 255 — Centro", "Osasco", -10, 1, "c", 50, -95],
  [109, "pane", "Jeep Renegade azul", "high", "paused", "Locar Frotas e Serviços", "(11) 3333-2020", "Rod. dos Bandeirantes, km 72", "Jundiaí", -200, 1, "", -30, -260],
  [110, "socorro", "Honda Civic prata", "low", "completed", "Brasil Assist 24h", "(11) 4004-2424", "Av. Kennedy, 700 — Jardim do Mar", "São Bernardo do Campo", -1500, 1, "g", null, -1560],
  [111, "reboque_leve", "Nissan Kicks branco", "medium", "open", "Seguradora Horizonte Auto", "(11) 3003-4100", "Al. Rio Negro, 500 — Alphaville", "Barueri", 240, 0, "", 300, -30],
  [112, "pneu", "VW Saveiro prata", "low", "assigned", null, null, "Av. Jacu-Pêssego, 1.900 — Itaquera", "São Paulo", 1410, 1, "", null, -90],
  [113, "bateria", "Fiat Argo cinza", "medium", "on_route", "Rota Locadora de Veículos", "(11) 4002-8922", "R. Vergueiro, 3.000 — Vila Mariana", "São Paulo", 20, 1, "", 60, -35],
  [114, "reboque_pesado", "Mercedes-Benz Atego 1719", "urgent", "in_progress", "Transportadora Rápido Sul Ltda", "(11) 2604-7700", "Rod. Castello Branco, km 32", "Barueri", -90, 1, "cd", -15, -180],
  [115, "chaveiro", "Honda Fit preto", "low", "completed", "Ana Beatriz Lopes", "(11) 97654-3210", "R. Harmonia, 410 — Vila Madalena", "São Paulo", -2900, 1, "", null, -3000],
  [116, "socorro", "Chevrolet S10 branca", "high", "cancelled", "Locar Frotas e Serviços", "(11) 3333-2020", "Av. Interlagos, 6.800 — Interlagos", "São Paulo", -600, 0, "", null, -700],
  [117, "remocao", "VW Fox azul", "medium", "rejected", "Frota Municipal de Osasco", "(11) 3652-9000", "Av. Santo Antônio, 1.200 — Vila Osasco", "Osasco", -1300, 1, "", null, -1400],
  [118, "pane", "Ford Ka prata", "medium", "open", "Brasil Assist 24h", "(11) 4004-2424", "Rod. Régis Bittencourt, km 280", "Embu das Artes", null, 0, "", null, -25],
  [119, "reboque_leve", "Renault Duster marrom", "high", "assigned", "Condomínio Jardim das Acácias", "(11) 3088-1500", "R. Pamplona, 1.100 — Jardim Paulista", "São Paulo", 50, 1, "c", 10, -140],
  [120, "bateria", "Peugeot 208 branco", "low", "accepted", "Seguradora Horizonte Auto", "(11) 3003-4100", "Av. Brás Leme, 1.000 — Santana", "São Paulo", 2760, 1, "", null, -50],
  [121, "pneu", "Toyota Hilux prata", "medium", "completed", "Rota Locadora de Veículos", "(11) 4002-8922", "R. Oscar Freire, 300 — Jardins", "São Paulo", -180, 1, "g", null, -260],
  [122, "reboque_leve", "Hyundai Creta cinza", "medium", "in_progress", "Seguradora Horizonte Auto", "(11) 3003-4100", "Av. Ibirapuera, 3.100 — Moema", "São Paulo", -40, 1, "cd", 35, -120],
  [123, "socorro", "Fiat Toro vermelha", "urgent", "open", "Locar Frotas e Serviços", "(11) 3333-2020", "Av. do Estado, 5.500 — Cambuci", "São Paulo", 60, 0, "", 45, -20],
  [124, "chaveiro", "Chevrolet Prisma prata", "low", "completed", null, null, "R. Teodoro Sampaio, 1.020 — Pinheiros", "São Paulo", -4400, 1, "", null, -4500],
];

function marks(status: WorkOrderStatus, scheduled: number | null, created: number) {
  const base = scheduled !== null && scheduled < 0 ? scheduled : created;
  const started = ["on_route", "on_site", "in_progress", "paused", "completed"].includes(status) ? em(base + 5) : null;
  const arrived = ["on_site", "in_progress", "paused", "completed"].includes(status) ? em(base + 38) : null;
  const completed = status === "completed" ? em(base + 95) : null;
  return { startedAt: started, arrivedAt: arrived, completedAt: completed };
}

export const OS_FIXTURE: readonly WorkOrderListItem[] = RAW.map(([n, serv, vehicle, priority, status, customer, phone, address, city, sched, assigned, checklists, sla, created]) => ({
  id: `os-${n}`,
  code: `OS-000${n}`,
  title: `${SERV[serv]} — ${vehicle}`,
  status,
  priority,
  customerName: customer,
  customerPhone: phone,
  serviceAddress: address,
  serviceCity: city,
  serviceState: "SP",
  scheduledFor: em(sched),
  assignedOperatorId: assigned ? `operador-${n}` : null,
  checklistId: checklists ? `modelo-${n}` : null,
  slaDueAt: em(sla),
  createdAt: em(created)!,
  ...marks(status, sched, created),
  cancelledAt: status === "cancelled" ? em(-560) : null,
  cancellationReason: status === "cancelled" ? "Cliente resolveu a pane antes do deslocamento." : null,
  financialCancellationDecision: status === "cancelled" ? "zero" : null,
}));

/** O DTO cru que o backend devolve na lista (snake_case, como `toWorkOrderListDto`), para os testes que passam pela rede. */
export function toListDto(order: WorkOrderListItem): Record<string, unknown> {
  return {
    id: order.id,
    code: order.code,
    title: order.title,
    status: order.status,
    priority: order.priority,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    service_address: order.serviceAddress,
    service_city: order.serviceCity,
    service_state: order.serviceState,
    scheduled_for: order.scheduledFor,
    assigned_operator_id: order.assignedOperatorId,
    checklist_id: order.checklistId,
    sla_due_at: order.slaDueAt,
    started_at: order.startedAt,
    arrived_at: order.arrivedAt,
    completed_at: order.completedAt,
    cancelled_at: order.cancelledAt,
    cancellation_reason: order.cancellationReason,
    financial_cancellation_decision: order.financialCancellationDecision,
    created_at: order.createdAt,
    updated_at: order.createdAt,
  };
}

// =============================== Modelo das views (SSR) ===============================


/** Gestor de operações (manager) — as permissões que mostram todos os alvos do resumo. */
export const GESTOR = ["work_orders:read", "work_orders:create", "work_orders:status", "field_dispatch:read", "field_dispatch:create", "field_dispatch:cancel"] as const;

export type ModelCalls = { open: string[]; link: string[]; assign: string[]; advance: string[]; revoke: string[]; state: unknown[]; toggle: string[]; retry: number; create: number };

export function buildOsModel(overrides: Partial<WorkOrdersViewModel> = {}, permissions: readonly string[] = GESTOR): { model: WorkOrdersViewModel; calls: ModelCalls } {
  const calls: ModelCalls = { open: [], link: [], assign: [], advance: [], revoke: [], state: [], toggle: [], retry: 0, create: 0 };
  const model: WorkOrdersViewModel = {
    items: OS_FIXTURE,
    loaded: OS_FIXTURE.length,
    serverTotal: OS_FIXTURE.length,
    partial: false,
    status: "ready",
    loading: false,
    error: null,
    stale: false,
    lastUpdatedAt: null,
    demo: false,
    now: AGORA,
    access: { create: permissions.includes("work_orders:create"), dispatch: permissions.includes("field_dispatch:create"), permissions },
    state: { tab: "todas", target: null, q: "", openId: null },
    activeFilterCount: 0,
    headerActions: null,
    filterCard: null,
    expandedId: null,
    rowBusy: {},
    rowError: {},
    onState: (next) => void calls.state.push(next),
    onToggleRow: (id) => void calls.toggle.push(id),
    onOpenDetail: (id) => void calls.open.push(id),
    onLink: (id) => void calls.link.push(id),
    onAssign: (id) => void calls.assign.push(id),
    onAdvance: (order) => void calls.advance.push(order.id),
    onRevoke: (order) => void calls.revoke.push(order.id),
    onCreate: () => void (calls.create += 1),
    onRetry: () => void (calls.retry += 1),
    ...overrides,
  };
  return { model, calls };
}

// =============================== Leitura do HTML (SSR) ===============================

export const visibleText = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#x27;|&quot;|&amp;/g, " ").replace(/\s+/g, " ");
export const kpiValues = (html: string) => [...html.matchAll(/pat-kpi__value">([^<]*)</g)].map((m) => m[1]);
export const rowKeys = (html: string) => [...html.matchAll(/<tr class="pat-ab-row"[^>]*data-row-key="([^"]+)"/g)].map((m) => m[1]);
export const rowsHtml = (html: string) => [...html.matchAll(/<tr class="pat-ab-row"[^>]*data-row-key="[^"]+"[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
export const detailRows = (html: string) => (html.match(/class="pat-ab-detail-row"/g) ?? []).length;
export const headers = (html: string) => [...(/<thead>([\s\S]*?)<\/thead>/.exec(html)?.[1] ?? "").matchAll(/<th[^>]*>([^<]*)</g)].map((m) => m[1]).filter(Boolean);
export const pressedButtons = (html: string) =>
  [...html.matchAll(/<button[^>]*>/g)]
    .map((m) => ({ pressed: /aria-pressed="([^"]+)"/.exec(m[0])?.[1], label: /aria-label="([^"]*)"/.exec(m[0])?.[1] ?? "" }))
    .filter((b) => b.pressed !== undefined)
    .map((b) => ({ pressed: b.pressed === "true", label: b.label }));
