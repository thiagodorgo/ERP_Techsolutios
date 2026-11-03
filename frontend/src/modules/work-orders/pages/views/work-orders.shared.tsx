import { AlertTriangle, ArrowRight, Ban, CheckCircle2, Check, Clock, Search, Send, UserRound, Wrench, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DenseExpandableRow } from "../../../../components/dense-list";
import { KpiStatCard, StatusPill, TablePager, type KpiStatTag } from "../../../../components/patterns";
import { StaleDataBanner } from "../../components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../components/StatePanel";
import { WorkOrderDelayBadge } from "../../components/WorkOrderDelayBadge";
import {
  advanceLabel,
  canAdvanceRow,
  canRevokeDispatch,
  isWorkOrderDelayed,
  workOrderServiceLine,
  WORK_ORDER_PRIORITY_LABEL,
  WORK_ORDER_STATUS_LABEL,
} from "../../work-orders-row.logic";
import { listStatusKind, type WorkOrdersListStatus } from "../../work-orders.state";
import type { WorkOrderFinancialCancellationDecision, WorkOrderListItem, WorkOrderPriority, WorkOrderStatus } from "../../work-orders.types";
import type { WorkOrdersListState, WorkOrdersTabKey, WorkOrdersViewModel } from "./work-orders.view-model";

// B-APAR-OS — o que as três aparências de Ordens de Serviço dividem (referência aprovada
// `screen-refs/ordens-de-servico-3opcoes.reference.html`): as regras de exibição de hoje (`WorkOrdersPage.tsx` até o
// head-base 2e7987bd), as contagens PURAS que alimentam indicadores, barras, rosca e blocos (testadas uma vez, usadas
// pelas três), e as peças de tela (cabeçalho de estados, tabela de uma linha, resumo embaixo da linha). Nenhuma consulta
// nasce aqui e nenhum número é fabricado: OS sem prazo de SLA é "sem prazo", nunca "no prazo"; o técnico é "Atribuído",
// porque a lista não traz o nome (P-WO-LIST-TECH-NAME); os passos sem horário na OS aparecem sem hora.

// =============================== Regras de exibição (as de hoje) ===============================

export const isFinalStatus = (status: WorkOrderStatus) => status === "completed" || status === "cancelled" || status === "rejected";
export const isFieldStatus = (status: WorkOrderStatus) => status === "on_route" || status === "on_site" || status === "in_progress" || status === "paused";

// Cor por situação (tons de `WorkOrdersPage.tsx:51-62` no head-base); o rótulo vem de WORK_ORDER_STATUS_LABEL.
export const STATUS_TONE: Record<WorkOrderStatus, { bg: string; fg: string }> = {
  open: { bg: "#EFF6FF", fg: "#2563EB" },
  assigned: { bg: "#EFF6FF", fg: "#2563EB" },
  accepted: { bg: "#EFF6FF", fg: "#2563EB" },
  on_route: { bg: "#DCFCE7", fg: "#15803D" },
  on_site: { bg: "#DCFCE7", fg: "#15803D" },
  in_progress: { bg: "#DCFCE7", fg: "#15803D" },
  paused: { bg: "#FEF3C7", fg: "#B45309" },
  completed: { bg: "#F1F5F9", fg: "#475569" },
  cancelled: { bg: "#FEE2E2", fg: "#B91C1C" },
  rejected: { bg: "#FEE2E2", fg: "#B91C1C" },
};

export const PRIORITY_TONE: Record<WorkOrderPriority, { dot: string; fg: string }> = {
  low: { dot: "#94A3B8", fg: "#64748B" },
  medium: { dot: "#F59E0B", fg: "#B45309" },
  high: { dot: "#DC2626", fg: "#B91C1C" },
  urgent: { dot: "#DC2626", fg: "#B91C1C" },
};

/** Cor da prioridade no resumo (referência `PR_COR`). */
const PRIORITY_SUMMARY_COLOR: Record<WorkOrderPriority, string> = { low: "#059669", medium: "#2563EB", high: "#D97706", urgent: "#DC2626" };

export const STATUS_ORDER: readonly WorkOrderStatus[] = ["open", "assigned", "accepted", "on_route", "on_site", "in_progress", "paused", "completed", "cancelled", "rejected"];
export const PRIORITY_ORDER: readonly WorkOrderPriority[] = ["urgent", "high", "medium", "low"];

const FINANCIAL_DECISION_LABEL: Record<WorkOrderFinancialCancellationDecision, string> = {
  keep: "Manter valores",
  keep_unpaid: "Manter sem remunerar o profissional",
  zero: "Zerar itens",
};

export const WORK_ORDER_TABS: readonly { readonly key: WorkOrdersTabKey; readonly label: string; readonly match: (order: WorkOrderListItem) => boolean }[] = [
  { key: "todas", label: "Todas", match: () => true },
  { key: "sem-tecnico", label: "Sem técnico", match: (o) => !isFinalStatus(o.status) && !o.assignedOperatorId },
  { key: "em-campo", label: "Em campo", match: (o) => isFieldStatus(o.status) },
  { key: "concluidas", label: "Concluídas", match: (o) => o.status === "completed" },
];

export function readTab(value: string | null): WorkOrdersTabKey {
  return WORK_ORDER_TABS.find((tab) => tab.key === value)?.key ?? "todas";
}

const pad = (n: number) => n.toString().padStart(2, "0");
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const clock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${clock(date)}` : "—";
}

export type AgendaInfo = { readonly text: string; readonly color: string; readonly weight: number };

/** Célula AGENDA de hoje: "Hoje/Amanhã/Ontem, HH:MM" (senão dd/mm), cor pela urgência real (vencida, ≤ 2 h, depois). */
export function agendaInfo(iso: string | null | undefined, status: WorkOrderStatus, now: Date): AgendaInfo {
  if (!iso) return { text: "Sem agenda", color: "#94A3B8", weight: 600 };
  const date = parse(iso);
  if (!date) return { text: "—", color: "#94A3B8", weight: 600 };
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const day = sameDay(date, now) ? "Hoje" : sameDay(date, tomorrow) ? "Amanhã" : sameDay(date, yesterday) ? "Ontem" : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  const text = `${day}, ${clock(date)}`;
  if (isFinalStatus(status)) return { text, color: "#94A3B8", weight: 600 };
  const diffMin = (date.getTime() - now.getTime()) / 60000;
  if (diffMin <= 0) return { text, color: "#DC2626", weight: 700 };
  if (diffMin <= SOON_MINUTES) return { text, color: "#B45309", weight: 700 };
  return { text, color: "#334155", weight: 600 };
}

/** "Próximas 2 h": a mesma janela da cor âmbar da AGENDA de hoje. */
export const SOON_MINUTES = 120;

export type AgendaBand = "atrasadas" | "prox2h" | "hoje" | "depois" | "semagenda" | "finalizadas";

/** Faixa da agenda (referência `faixaAgenda`): finalizada · sem agenda · vencida · ≤ 2 h · ainda hoje · amanhã em diante. */
export function agendaBand(order: WorkOrderListItem, now: Date): AgendaBand {
  if (isFinalStatus(order.status)) return "finalizadas";
  const date = parse(order.scheduledFor);
  if (!date) return "semagenda";
  const diffMin = (date.getTime() - now.getTime()) / 60000;
  if (diffMin <= 0) return "atrasadas";
  if (diffMin <= SOON_MINUTES) return "prox2h";
  if (sameDay(date, now)) return "hoje";
  return "depois";
}

export type SlaRisk = "vencido" | "1h" | null;
export type SlaInfo = { readonly text: string; readonly color: string; readonly risk: SlaRisk };

const duration = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${minutes} min`);

/** Prazo de SLA real (`slaDueAt`, só com política aplicável). Sem prazo é "Sem prazo" — nunca "no prazo". */
export function slaInfo(order: WorkOrderListItem, now: Date): SlaInfo {
  const due = parse(order.slaDueAt);
  if (isFinalStatus(order.status)) return { text: "—", color: "#94A3B8", risk: null };
  if (!due) return { text: "Sem prazo", color: "#94A3B8", risk: null };
  const minutes = Math.round((due.getTime() - now.getTime()) / 60000);
  if (minutes < 0) return { text: `Vencido há ${duration(-minutes)}`, color: "#B91C1C", risk: "vencido" };
  if (minutes <= 60) return { text: `Vence em ${duration(minutes)}`, color: "#B45309", risk: "1h" };
  return { text: `Vence em ${duration(minutes)}`, color: "#15803D", risk: null };
}

const delayed = (order: WorkOrderListItem, now: Date) => isWorkOrderDelayed(order.scheduledFor, order.status, now.getTime()).delayed;

type TargetDef = { readonly label: string; readonly match: (order: WorkOrderListItem, now: Date) => boolean };

const FIXED_TARGETS: Readonly<Record<string, TargetDef>> = {
  abertas: { label: "OS abertas", match: (o) => !isFinalStatus(o.status) },
  andamento: { label: "Em andamento", match: (o) => isFieldStatus(o.status) },
  atrasadas: { label: "Atrasadas", match: (o, now) => delayed(o, now) },
  concluidas: { label: "Concluídas", match: (o) => o.status === "completed" },
  "sla-vencido": { label: "SLA vencido", match: (o, now) => slaInfo(o, now).risk === "vencido" },
  "sem-tecnico": { label: "Sem técnico", match: (o) => !isFinalStatus(o.status) && !o.assignedOperatorId },
  "sem-cliente": { label: "Sem cliente vinculado", match: (o) => !isFinalStatus(o.status) && !o.customerName },
  fila: { label: "Na fila (não finalizadas)", match: (o) => !isFinalStatus(o.status) },
  "ag-atrasadas": { label: "Agenda: atrasadas", match: (o, now) => agendaBand(o, now) === "atrasadas" },
  "ag-prox2h": { label: "Agenda: próximas 2 horas", match: (o, now) => agendaBand(o, now) === "prox2h" },
  "ag-hoje": { label: "Agenda: ainda hoje", match: (o, now) => agendaBand(o, now) === "hoje" },
  "ag-depois": { label: "Agenda: amanhã em diante", match: (o, now) => agendaBand(o, now) === "depois" },
  "ag-sem-agenda": { label: "Sem agenda", match: (o, now) => agendaBand(o, now) === "semagenda" },
  "ag-finalizadas": { label: "Finalizadas", match: (o, now) => agendaBand(o, now) === "finalizadas" },
};

/** Alvo do filtro (`?alvo=`): os fixos acima, `st-<situação>` e `pr-<prioridade>` (só abertas). Desconhecido → `null`. */
export function targetDef(key: string | null): TargetDef | null {
  if (!key) return null;
  if (FIXED_TARGETS[key]) return FIXED_TARGETS[key];
  if (key.startsWith("st-")) {
    const status = key.slice(3) as WorkOrderStatus;
    if (STATUS_ORDER.includes(status)) return { label: `Situação: ${WORK_ORDER_STATUS_LABEL[status]}`, match: (o) => o.status === status };
  }
  if (key.startsWith("pr-")) {
    const priority = key.slice(3) as WorkOrderPriority;
    if (PRIORITY_ORDER.includes(priority)) return { label: `Prioridade ${WORK_ORDER_PRIORITY_LABEL[priority]} (abertas)`, match: (o) => o.priority === priority && !isFinalStatus(o.status) };
  }
  return null;
}

export type WorkOrdersCounts = {
  readonly abertas: number;
  readonly andamento: number;
  readonly atrasadas: number;
  readonly concluidas: number;
  readonly semTecnico: number;
  readonly atrasadasEmCampo: number;
  readonly semCliente: number;
  readonly slaVencido: number;
  readonly sla1h: number;
  readonly bands: Readonly<Record<AgendaBand, number>>;
  readonly byStatus: Readonly<Record<WorkOrderStatus, number>>;
  /** Só as abertas (não finalizadas), por prioridade — a rosca da B. */
  readonly openByPriority: Readonly<Record<WorkOrderPriority, number>>;
};

/** Todas as contagens da tela, sobre a MESMA lista (a que o servidor devolveu) — nada é somado de outra fonte. */
export function countWorkOrders(items: readonly WorkOrderListItem[], now: Date): WorkOrdersCounts {
  const bands: Record<AgendaBand, number> = { atrasadas: 0, prox2h: 0, hoje: 0, depois: 0, semagenda: 0, finalizadas: 0 };
  const byStatus = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<WorkOrderStatus, number>;
  const openByPriority: Record<WorkOrderPriority, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
  let abertas = 0;
  let andamento = 0;
  let atrasadas = 0;
  let concluidas = 0;
  let semTecnico = 0;
  let atrasadasEmCampo = 0;
  let semCliente = 0;
  let slaVencido = 0;
  let sla1h = 0;
  for (const order of items) {
    const final = isFinalStatus(order.status);
    const late = delayed(order, now);
    const risk = slaInfo(order, now).risk;
    bands[agendaBand(order, now)] += 1;
    byStatus[order.status] += 1;
    if (!final) {
      abertas += 1;
      openByPriority[order.priority] += 1;
      if (!order.assignedOperatorId) semTecnico += 1;
      if (!order.customerName) semCliente += 1;
    }
    if (isFieldStatus(order.status)) {
      andamento += 1;
      if (late) atrasadasEmCampo += 1;
    }
    if (late) atrasadas += 1;
    if (order.status === "completed") concluidas += 1;
    if (risk === "vencido") slaVencido += 1;
    if (risk === "1h") sla1h += 1;
  }
  return { abertas, andamento, atrasadas, concluidas, semTecnico, atrasadasEmCampo, semCliente, slaVencido, sla1h, bands, byStatus, openByPriority };
}

/** A lista visível: aba → alvo → busca (código, título, cliente, endereço), na ordem da referência (`linhas`). */
export function filterWorkOrderList(items: readonly WorkOrderListItem[], state: Pick<WorkOrdersListState, "tab" | "target" | "q">, now: Date): WorkOrderListItem[] {
  const tab = WORK_ORDER_TABS.find((entry) => entry.key === state.tab) ?? WORK_ORDER_TABS[0];
  const target = targetDef(state.target);
  const q = state.q.trim().toLowerCase();
  return items
    .filter((order) => tab.match(order))
    .filter((order) => (target ? target.match(order, now) : true))
    .filter((order) => (q ? [order.code, order.title, order.customerName, order.serviceAddress].some((value) => (value ?? "").toLowerCase().includes(q)) : true));
}

/** O universo das contagens quando o servidor tem mais OS do que as carregadas (`null` quando não é parcial). */
export function universeLabel(model: Pick<WorkOrdersViewModel, "partial" | "loaded" | "serverTotal">): string | null {
  return model.partial ? `nas ${model.loaded} carregadas · ${model.serverTotal} no servidor` : null;
}

// =============================== Estados §7 ===============================

/** A falha (erro ou sem permissão) troca a lista pelo painel; os números viram "—". */
export const isListFailure = (status: WorkOrdersListStatus) => listStatusKind(status) === "failure";

/**
 * O painel da lista quando NÃO há linhas para mostrar, um por estado (§7), marcado por `data-state` (é por ele que os
 * testes SSR e o e2e afirmam o estado). `empty` e `forbidden` são ramos explícitos e o `return` final é o ERRO: status
 * que este painel não conhece nunca vira "vazio". Movido de `WorkOrdersPage.tsx` sem mudar o texto.
 */
export function WorkOrdersLoadState({
  status,
  message,
  filtered = false,
  embedded = false,
  onRetry,
  onCreate,
}: {
  readonly status: WorkOrdersListStatus;
  readonly message?: string | null;
  readonly filtered?: boolean;
  readonly embedded?: boolean;
  readonly onRetry?: () => void;
  readonly onCreate?: () => void;
}) {
  if (status === "empty") {
    return (
      <StatePanel
        tone="empty"
        embedded={embedded}
        title={filtered ? "Nenhuma OS para os filtros atuais" : "Nenhuma ordem de serviço"}
        detail={filtered ? "Ajuste a busca ou os filtros acima — ou crie uma nova ordem de serviço." : "As ordens atribuídas à sua organização aparecem aqui."}
        actions={onCreate ? <StatePanelAction label="Nova OS" narrow onClick={onCreate} /> : undefined}
      />
    );
  }
  if (status === "forbidden") {
    return (
      <StatePanel
        tone="forbidden"
        embedded={embedded}
        title="Sem permissão para ver ordens de serviço"
        detail="Seu perfil não inclui o módulo de OS nesta organização. Solicite acesso ao administrador da organização."
      />
    );
  }
  return (
    <StatePanel
      tone="error"
      embedded={embedded}
      title="Não foi possível carregar as ordens"
      detail={message ?? "Tente novamente em instantes."}
      actions={onRetry ? <StatePanelAction label="Tentar novamente" onClick={onRetry} /> : undefined}
    />
  );
}

/** Faixa "dados desatualizados" (falha em segundo plano mantém a lista) ou o selo do modo demonstração de hoje. */
export function WorkOrdersStatusStrip({ model }: { readonly model: WorkOrdersViewModel }) {
  if (model.stale) {
    return (
      <div style={{ marginBottom: 12 }}>
        <StaleDataBanner lastUpdatedAt={model.lastUpdatedAt} onRetry={model.onRetry} />
      </div>
    );
  }
  if (model.demo) {
    return (
      <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
        <StatusPill label="Dados demonstrativos" bg="#EFF6FF" fg="#2563EB" />
      </div>
    );
  }
  return null;
}

/** Contagens parciais: a linha que diz o universo, acima dos indicadores (D-007, R-P6 do 12c). */
export function UniverseNote({ model }: { readonly model: WorkOrdersViewModel }) {
  const label = universeLabel(model);
  if (!label || isListFailure(model.status) || model.loading) return null;
  return (
    <p className="aparos-universo" role="note">
      Contagens {label}. A paginação no servidor ainda não existe; os números valem para as OS carregadas.
    </p>
  );
}

// =============================== Indicadores ===============================

export type WorkOrdersKpis = {
  readonly abertas: number;
  readonly andamento: number;
  readonly atrasadas: number;
  readonly concluidas: number;
  readonly semTecnico: number;
  readonly atrasadasEmCampo: number;
  readonly slaVencido?: number;
  readonly sla1h?: number;
};

const NEUTRAL_ICON = "#94A3B8";
const NEUTRAL_BG = "#F1F5F9";
const TAG_ACT_NOW: KpiStatTag = { label: "agir agora", bg: "#FEE2E2", fg: "#B91C1C" };
const TAG_UNDER_CONTROL: KpiStatTag = { label: "sob controle", bg: "#DCFCE7", fg: "#15803D" };
const TAG_ON_TIME: KpiStatTag = { label: "no prazo", bg: "#DCFCE7", fg: "#15803D" };
const TAG_LATE: KpiStatTag = { label: "há atrasos", bg: "#FEF3C7", fg: "#B45309" };
const TAG_DONE: KpiStatTag = { label: "finalizadas", bg: "#DCFCE7", fg: "#15803D" };
const TAG_NO_RISK: KpiStatTag = { label: "sem risco", bg: "#DCFCE7", fg: "#15803D" };

const skeletonCard = (index: number) => (
  <div key={index} className="pat-kpi" aria-hidden="true">
    <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
    <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
    <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
  </div>
);

/**
 * Os indicadores da lista (4 na A, 5 na B com "SLA vencido"). Com `onFilter` cada um FILTRA a lista (`aria-pressed`,
 * D-PADRAO-BLOCOS-CLICAVEIS) no lugar do pop-up de participação. `degraded` (erro / sem permissão): "—", tons neutros,
 * sem selo e sem clique — erro nunca vira número (§4.3-2, D-007). `kpiDetails` ficou só como `null`: o pop-up saiu.
 */
export function WorkOrdersKpiGrid({
  kpis,
  skeleton,
  degraded,
  extra = false,
  pressed = null,
  onFilter,
  universe = null,
}: {
  readonly kpis: WorkOrdersKpis;
  /** O pop-up de participação saiu com as aparências (o indicador filtra); aceita só `null` por compatibilidade. */
  readonly kpiDetails?: null;
  readonly skeleton: boolean;
  readonly degraded: boolean;
  /** Aparência B: o 5º indicador, "SLA vencido". */
  readonly extra?: boolean;
  readonly pressed?: string | null;
  readonly onFilter?: (key: string) => void;
  /** "nas N carregadas · T no servidor": vai no rótulo acessível de cada indicador quando a contagem é parcial. */
  readonly universe?: string | null;
}) {
  const value = (n: number) => (degraded ? "—" : n);
  const tone = (color: string, bg: string) => (degraded ? { iconColor: NEUTRAL_ICON, iconBg: NEUTRAL_BG } : { iconColor: color, iconBg: bg });
  const clickable = !degraded && Boolean(onFilter);
  const action = (key: string, label: string, n: number) =>
    clickable
      ? { onClick: () => onFilter?.(key), pressed: pressed === key, ariaLabel: `${label}: ${n}${universe ? ` (${universe})` : ""} — filtrar a lista` }
      : {};
  const count = extra ? 5 : 4;
  const slaVencido = kpis.slaVencido ?? 0;
  const sla1h = kpis.sla1h ?? 0;

  return (
    <div className={`pat-kpi-row pat-kpi-row--${count}`} aria-live="polite">
      {skeleton ? (
        Array.from({ length: count }).map((_, index) => skeletonCard(index))
      ) : (
        <>
          <KpiStatCard
            icon={Wrench}
            {...tone("#2563EB", "#EFF6FF")}
            value={value(kpis.abertas)}
            label="OS abertas"
            hint="ainda não concluídas nem canceladas"
            tag={!degraded && kpis.semTecnico > 0 ? { label: `${kpis.semTecnico} sem técnico`, bg: "#FEF3C7", fg: "#B45309" } : undefined}
            {...action("abertas", "OS abertas", kpis.abertas)}
          />
          <KpiStatCard
            icon={Send}
            {...tone("#0369A1", "#F0F9FF")}
            value={value(kpis.andamento)}
            label="Em andamento"
            hint="técnico em campo agora"
            tag={degraded ? undefined : kpis.atrasadasEmCampo === 0 ? TAG_ON_TIME : TAG_LATE}
            {...action("andamento", "Em andamento", kpis.andamento)}
          />
          <KpiStatCard
            icon={AlertTriangle}
            {...tone(kpis.atrasadas > 0 ? "#DC2626" : "#15803D", kpis.atrasadas > 0 ? "#FEF2F2" : "#F0FDF4")}
            value={value(kpis.atrasadas)}
            label="Atrasadas"
            hint="agenda vencida e sem conclusão"
            tag={degraded ? undefined : kpis.atrasadas > 0 ? TAG_ACT_NOW : TAG_UNDER_CONTROL}
            border={!degraded && kpis.atrasadas > 0 ? "#FCA5A5" : undefined}
            {...action("atrasadas", "Atrasadas", kpis.atrasadas)}
          />
          {extra ? (
            <KpiStatCard
              icon={Clock}
              {...tone(slaVencido > 0 ? "#B91C1C" : "#15803D", slaVencido > 0 ? "#FEF2F2" : "#F0FDF4")}
              value={value(slaVencido)}
              label="SLA vencido"
              hint="só OS com prazo de SLA definido"
              tag={degraded ? undefined : sla1h > 0 ? { label: `${sla1h} vencem em 1 h`, bg: "#FEF3C7", fg: "#B45309" } : TAG_NO_RISK}
              {...action("sla-vencido", "SLA vencido", slaVencido)}
            />
          ) : null}
          <KpiStatCard
            icon={CheckCircle2}
            {...tone("#15803D", "#F0FDF4")}
            value={value(kpis.concluidas)}
            label="Concluídas"
            hint="no total da lista"
            tag={degraded ? undefined : TAG_DONE}
            {...action("concluidas", "Concluídas", kpis.concluidas)}
          />
        </>
      )}
    </div>
  );
}

/** Cartão da faixa analítica (classes `.pat-an-card` de Pátios e do Financeiro). */
export function AnalyticCard({ title, hint, className, children }: { readonly title: string; readonly hint?: string; readonly className?: string; readonly children: ReactNode }) {
  return (
    <article className={className ? `pat-an-card ${className}` : "pat-an-card"}>
      <div className="pat-an-card__title">
        <span>{title}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      {children}
    </article>
  );
}

// =============================== Lista: barra, chip, tabela ===============================

/** Busca + abas (A e B) + contagem, a barra de ferramentas de hoje (`.pat-os-toolbar`). */
export function WorkOrdersToolbar({ model, total, showTabs }: { readonly model: WorkOrdersViewModel; readonly total: number; readonly showTabs: boolean }) {
  const { state } = model;
  const failure = isListFailure(model.status);
  return (
    <div className="pat-os-toolbar">
      <div className="pat-os-search">
        <Search size={15} aria-hidden="true" style={{ flexShrink: 0 }} />
        <input
          type="search"
          value={state.q}
          onChange={(event) => model.onState({ ...state, q: event.currentTarget.value })}
          placeholder="Buscar por código, cliente ou endereço…"
          aria-label="Buscar por código, cliente ou endereço"
        />
      </div>
      {showTabs ? (
        <div className="pat-os-tabs" role="group" aria-label="Recorte da lista">
          {WORK_ORDER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={tab.key === state.tab ? "pat-os-tab pat-os-tab--active" : "pat-os-tab"}
              aria-pressed={tab.key === state.tab}
              onClick={() => model.onState({ ...state, tab: tab.key })}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      {model.loading ? (
        <span className="pat-os-count">
          <span className="pat-skel" style={{ width: 70, height: 11 }} />
        </span>
      ) : failure ? null : (
        <span className="pat-os-count">{total === 1 ? "1 ordem" : `${total} ordens`}</span>
      )}
    </div>
  );
}

/** O filtro ativo (indicador, barra ou bloco) acima da lista; sai com um clique. */
export function TargetChip({ model }: { readonly model: WorkOrdersViewModel }) {
  const target = targetDef(model.state.target);
  if (!target) return null;
  return (
    <div className="pat-filtro-chip-bar">
      <span className="pat-filtro-chip" data-filtro-ativo="">
        <span>{`Filtro: ${target.label}`}</span>
        <button type="button" aria-label="Limpar filtro" onClick={() => model.onState({ ...model.state, target: null })}>
          <X size={11} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

export type WorkOrderColumn = {
  readonly key: string;
  readonly header: string;
  readonly width?: number;
  readonly render: (order: WorkOrderListItem) => ReactNode;
  /** Texto inteiro para o hover quando a célula corta com reticências. */
  readonly title?: (order: WorkOrderListItem) => string;
};

export type WorkOrderGroup = { readonly key: string; readonly label: string; readonly color: string; readonly bg: string; readonly rows: readonly WorkOrderListItem[] };

/**
 * A tabela de uma linha (`.pat-ab-table` + `DenseExpandableRow` da biblioteca): carregando (linhas-esqueleto), vazio
 * (com e sem filtro, dentro do cartão), linhas ou grupos. A linha abre o resumo embaixo dela, um por vez.
 */
export function WorkOrdersTable({
  model,
  columns,
  rows,
  groups,
  renderSummary,
}: {
  readonly model: WorkOrdersViewModel;
  readonly columns: readonly WorkOrderColumn[];
  readonly rows?: readonly WorkOrderListItem[];
  readonly groups?: readonly WorkOrderGroup[];
  readonly renderSummary: (order: WorkOrderListItem) => ReactNode;
}) {
  const colSpan = columns.length + 1;
  const visible = groups ? groups.reduce((sum, group) => sum + group.rows.length, 0) : (rows ?? []).length;
  const row = (order: WorkOrderListItem) => (
    <DenseExpandableRow
      key={order.id}
      rowKey={order.id}
      expanded={model.expandedId === order.id}
      colSpan={colSpan}
      onToggle={() => model.onToggleRow(order.id)}
      cells={columns.map((column) => ({ key: column.key, content: column.render(order), title: column.title?.(order) }))}
      detail={model.expandedId === order.id ? renderSummary(order) : null}
    />
  );

  let body: ReactNode;
  if (model.loading) {
    body = [0, 1, 2, 3].map((index) => (
      <tr key={index} className="pat-ab-row" aria-hidden="true" style={{ cursor: "default" }}>
        {Array.from({ length: colSpan }).map((_, cell) => (
          <td key={cell}>
            <span className="pat-skel" style={{ width: "78%", height: 12, verticalAlign: "middle" }} />
          </td>
        ))}
      </tr>
    ));
  } else if (visible === 0) {
    const filtered = model.items.length > 0 || model.activeFilterCount > 0;
    body = (
      <tr>
        <td colSpan={colSpan} style={{ padding: 0 }}>
          <WorkOrdersLoadState status="empty" embedded filtered={filtered} onCreate={!filtered && model.access.create ? model.onCreate : undefined} />
        </td>
      </tr>
    );
  } else if (groups) {
    body = groups
      .filter((group) => group.rows.length > 0)
      .flatMap((group) => [
        <tr key={`grupo-${group.key}`} className="aparos-grupo-row">
          <td colSpan={colSpan} style={{ color: group.color }}>
            {group.label}
            <span className="aparos-grupo-n" style={{ background: group.bg, color: group.color }}>
              {group.rows.length}
            </span>
          </td>
        </tr>,
        ...group.rows.map(row),
      ]);
  } else {
    body = (rows ?? []).map(row);
  }

  return (
    <table className="pat-ab-table">
      <colgroup>
        {columns.map((column) => (
          <col key={column.key} style={column.width ? { width: column.width } : undefined} />
        ))}
        <col style={{ width: 44 }} />
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.header}
            </th>
          ))}
          {/* Como no DenseTable: o nome acessível no próprio th (um sr-only absoluto aqui vazava a largura da página). */}
          <th scope="col" aria-label="Abrir resumo" />
        </tr>
      </thead>
      <tbody>{body}</tbody>
    </table>
  );
}

/** Paginação das linhas já carregadas (TablePager de hoje); mudar o recorte volta à 1ª página. */
export function usePagedRows(rows: readonly WorkOrderListItem[], resetKey: string) {
  const [position, setPosition] = useState({ resetKey, page: 0, size: 20 });
  const size = position.size;
  const requested = position.resetKey === resetKey ? position.page : 0;
  const maxPage = Math.max(0, Math.ceil(rows.length / size) - 1);
  const page = Math.min(requested, maxPage);
  const start = page * size;
  const end = Math.min(start + size, rows.length);
  const pager =
    rows.length > 0 ? (
      <TablePager
        pageSize={size}
        onPageSize={(next) => setPosition({ resetKey, page: 0, size: next })}
        rangeLabel={`${start + 1}–${end} de ${rows.length}`}
        onPrev={() => setPosition({ resetKey, page: Math.max(0, page - 1), size })}
        onNext={() => setPosition({ resetKey, page: Math.min(maxPage, page + 1), size })}
        canPrev={page > 0}
        canNext={end < rows.length}
      />
    ) : null;
  return { pageRows: rows.slice(start, end), pager };
}

// =============================== Células de uma linha ===============================

export function CodeCell({ order, withPriority = true }: { readonly order: WorkOrderListItem; readonly withPriority?: boolean }) {
  return (
    <>
      <span className="aparos-code">{order.code}</span>
      {withPriority ? <PriorityMark priority={order.priority} inline /> : null}
    </>
  );
}

export function PriorityMark({ priority, inline = false }: { readonly priority: WorkOrderPriority; readonly inline?: boolean }) {
  const tone = PRIORITY_TONE[priority];
  return (
    <span className={inline ? "aparos-pr aparos-pr--inline" : "aparos-pr"} style={{ color: tone.fg }}>
      <i style={{ background: tone.dot }} aria-hidden="true" />
      {WORK_ORDER_PRIORITY_LABEL[priority]}
    </span>
  );
}

export function ClientCell({ order }: { readonly order: WorkOrderListItem }) {
  const service = workOrderServiceLine(order);
  return (
    <>
      {order.customerName ? (
        <>
          <span className="aparos-cli">{order.customerName}</span> <span className="aparos-svc">· {service}</span>
        </>
      ) : (
        <>
          <span className="pat-os-noclient">Sem cliente vinculado</span> <span className="aparos-svc">{service}</span>
        </>
      )}
      {order.checklistId ? <span className="aparos-ck">Checklist</span> : null}
    </>
  );
}

export const clientCellTitle = (order: WorkOrderListItem) => `${order.code} · ${order.customerName || "Sem cliente vinculado"} · ${workOrderServiceLine(order)}`;

export function TechnicianCell({ order }: { readonly order: WorkOrderListItem }) {
  if (order.assignedOperatorId) {
    return (
      <span className="aparos-tec">
        <i aria-hidden="true">
          <UserRound size={12} />
        </i>
        Atribuído
      </span>
    );
  }
  if (!isFinalStatus(order.status)) return <span className="aparos-semtec">Sem técnico</span>;
  return <span style={{ color: "#94A3B8" }}>Sem técnico</span>;
}

export function AgendaCell({ order, now }: { readonly order: WorkOrderListItem; readonly now: Date }) {
  const agenda = agendaInfo(order.scheduledFor, order.status, now);
  return (
    <>
      <span style={{ color: agenda.color, fontWeight: agenda.weight, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{agenda.text}</span>
      <span className="aparos-delay">
        <WorkOrderDelayBadge scheduledFor={order.scheduledFor} status={order.status} now={now.getTime()} />
      </span>
    </>
  );
}

export function StatusCell({ order }: { readonly order: WorkOrderListItem }) {
  const tone = STATUS_TONE[order.status];
  return <StatusPill label={WORK_ORDER_STATUS_LABEL[order.status]} bg={tone.bg} fg={tone.fg} />;
}

export function SlaCell({ order, now }: { readonly order: WorkOrderListItem; readonly now: Date }) {
  const sla = slaInfo(order, now);
  return <span style={{ color: sla.color, fontWeight: 700, fontSize: 12 }}>{sla.text}</span>;
}

// =============================== Resumo embaixo da linha ===============================

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}:</span> <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

/**
 * O resumo da OS (referência `resumoHTML`): três colunas de propriedades e os alvos que a linha de hoje oferecia, com as
 * MESMAS regras de exibição — "Dar andamento" e "Revogar envio" pelos predicados de `work-orders-row.logic.ts` (os
 * mesmos que `WorkOrderRowActions` liga), "Atribuir técnico" pelo gate `field_dispatch:create`, "Vincular cliente" só
 * para OS sem cliente, "Abrir OS" sempre. A C acrescenta a linha do ciclo de vida; a B, o prazo de SLA.
 */
export function WorkOrderSummary({ order, model, variant }: { readonly order: WorkOrderListItem; readonly model: WorkOrdersViewModel; readonly variant: "a" | "b" | "c" }) {
  const { now, access } = model;
  const agenda = agendaInfo(order.scheduledFor, order.status, now);
  const late = delayed(order, now);
  const sla = slaInfo(order, now);
  const busy = model.rowBusy[order.id] ?? false;
  const error = model.rowError[order.id] ?? null;
  const advance = canAdvanceRow(access.permissions, order.status) ? advanceLabel(order.status) : null;
  const final = isFinalStatus(order.status);
  const place = [order.serviceAddress, order.serviceCity ? `${order.serviceCity}${order.serviceState ? `/${order.serviceState}` : ""}` : null].filter(Boolean).join(" · ");
  const milestone = order.completedAt ? ["Concluída em", order.completedAt] : order.arrivedAt ? ["Chegada", order.arrivedAt] : order.startedAt ? ["Início", order.startedAt] : null;

  return (
    <div className="pat-ab-detail-content">
      {variant === "c" ? <LifecycleSteps order={order} /> : null}
      <div className="pat-ab-detail-grid">
        <div className="pat-ab-detail-col">
          <Field label="Cliente">{order.customerName ? order.customerName : <span className="pat-os-noclient">Sem cliente vinculado</span>}</Field>
          {order.customerPhone ? (
            <Field label="Telefone">
              <span className="pat-mono">{order.customerPhone}</span>
            </Field>
          ) : null}
          <Field label="Origem">{place || "—"}</Field>
        </div>
        <div className="pat-ab-detail-col">
          <Field label="Situação">{WORK_ORDER_STATUS_LABEL[order.status]}</Field>
          <Field label="Prioridade">
            <span style={{ color: PRIORITY_SUMMARY_COLOR[order.priority], fontWeight: 700 }}>{WORK_ORDER_PRIORITY_LABEL[order.priority]}</span>
          </Field>
          <Field label="Agenda">
            {agenda.text === "Sem agenda" ? "Sem agenda" : formatDateTime(order.scheduledFor)}
            {late ? <b style={{ color: "#DC2626" }}> · atrasada</b> : null}
          </Field>
          {variant === "b" ? (
            <Field label="Prazo de SLA">
              <span style={{ color: sla.color, fontWeight: 700 }}>{sla.text}</span>
            </Field>
          ) : null}
          <Field label="Técnico">{order.assignedOperatorId ? "Atribuído" : "A atribuir"}</Field>
        </div>
        <div className="pat-ab-detail-col">
          <Field label="Serviço">{order.title}</Field>
          <Field label="Checklist">{order.checklistId ? "Com checklist" : "—"}</Field>
          <Field label="Criada em">{formatDateTime(order.createdAt)}</Field>
          {milestone ? <Field label={milestone[0]}>{formatDateTime(milestone[1])}</Field> : null}
          {order.status === "cancelled" && order.cancellationReason ? <Field label="Motivo">{order.cancellationReason}</Field> : null}
          {order.status === "cancelled" && order.financialCancellationDecision ? <Field label="Decisão financeira">{FINANCIAL_DECISION_LABEL[order.financialCancellationDecision]}</Field> : null}
        </div>
      </div>
      <div className="pat-ab-detail-actions">
        <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onOpenDetail(order.id)}>
          <ArrowRight size={14} aria-hidden="true" />
          Abrir OS
        </button>
        {advance ? (
          <button type="button" className="pat-btn" disabled={busy} aria-label={advance} title={advance} onClick={() => model.onAdvance(order)}>
            {busy ? "Enviando…" : advance}
          </button>
        ) : null}
        {!order.assignedOperatorId && !final && access.dispatch ? (
          <button type="button" className="pat-btn aparos-btn--ambar" aria-label={`Atribuir técnico à OS ${order.code}`} onClick={() => model.onAssign(order.id)}>
            <Send size={13} aria-hidden="true" />
            Atribuir técnico
          </button>
        ) : null}
        {!order.customerName ? (
          <button type="button" className="pat-btn" onClick={() => model.onLink(order.id)}>
            Vincular cliente
          </button>
        ) : null}
        {canRevokeDispatch(access.permissions, order.status) ? (
          <button type="button" className="pat-btn aparos-btn--perigo" disabled={busy} onClick={() => model.onRevoke(order)}>
            <Ban size={13} aria-hidden="true" />
            Revogar envio
          </button>
        ) : null}
        {error ? (
          <span role="alert" className="aparos-row-error">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const LIFECYCLE: readonly { readonly status: WorkOrderStatus; readonly label: string; readonly at: (o: WorkOrderListItem) => string | null | undefined }[] = [
  { status: "open", label: "Aberta", at: (o) => o.createdAt },
  { status: "assigned", label: "Atribuída", at: () => null },
  { status: "accepted", label: "Aceita", at: () => null },
  { status: "on_route", label: "Em rota", at: (o) => o.startedAt },
  { status: "on_site", label: "No local", at: (o) => o.arrivedAt },
  { status: "in_progress", label: "Em atendimento", at: () => null },
  { status: "completed", label: "Concluída", at: (o) => o.completedAt },
];

/**
 * A linha do ciclo de vida da C (referência `ciclo`). Atribuída, Aceita e Em atendimento NÃO têm horário no DTO da OS
 * (só no despacho): aparecem marcadas quando o estado diz que passaram, "sem hora" — nunca uma hora emprestada.
 */
export function LifecycleSteps({ order }: { readonly order: WorkOrderListItem }) {
  const order_ = LIFECYCLE.map((step) => step.status);
  const deviation = order.status === "cancelled" || order.status === "rejected";
  let index = order_.indexOf(order.status === "paused" ? "in_progress" : order.status);
  if (deviation) index = order.assignedOperatorId ? 1 : 0;
  return (
    <div className="aparos-ciclo" role="list" aria-label="Ciclo de vida da OS">
      {LIFECYCLE.map((step, i) => {
        const done = i < index || (i === index && (order.status === "completed" || deviation));
        const current = i === index && !done;
        const at = done || current ? step.at(order) : null;
        const atDate = parse(at);
        const cls = done ? "aparos-ciclo__passo is-feito" : current ? "aparos-ciclo__passo is-atual" : "aparos-ciclo__passo";
        return (
          <div key={step.status} className={cls} role="listitem">
            <span className="aparos-ciclo__bola" aria-hidden="true">
              {done ? <Check size={11} /> : null}
            </span>
            <b>{current && order.status === "paused" ? `${step.label} · pausada` : step.label}</b>
            <small>{atDate ? clock(atDate) : done || current ? "sem hora" : "—"}</small>
          </div>
        );
      })}
      {deviation ? (
        <div className="aparos-ciclo__passo is-desvio" role="listitem">
          <span className="aparos-ciclo__bola" aria-hidden="true" />
          <b>{WORK_ORDER_STATUS_LABEL[order.status]}</b>
          <small>{parse(order.cancelledAt) ? clock(parse(order.cancelledAt) as Date) : "sem hora"}</small>
        </div>
      ) : null}
    </div>
  );
}
