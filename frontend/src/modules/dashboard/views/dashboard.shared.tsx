import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Lock, Map as MapIcon, Plus, Send, Wrench, X, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TrendChart } from "../../../components/charts";
import { DenseExpandableRow, type DenseCell } from "../../../components/dense-list";
import { InitialsAvatar, KpiStatCard, PageHeader, StatusPill, type KpiStatTag } from "../../../components/patterns";
import { StaleDataBanner } from "../../work-orders/components/StaleDataBanner";
import type { DispatchListItem } from "../../operations/dispatches/dispatches.types";
import type { FieldLocationItem } from "../../operations/map/operations-map.types";
import type { WorkOrderListItem } from "../../work-orders/work-orders.types";
import {
  buildCriticalQueue,
  deriveActiveDispatchRows,
  deriveFieldStatusRows,
  dispatchStatusMeta,
  fieldStatusMeta,
  relativeTimeFrom,
  type CriticalQueueItem,
  type CriticalQueueKind,
  type DashboardCriticalOrder,
  type DashboardRecentEvent,
  type DashboardTone,
} from "../dashboard.adapter";
import { buildDashboardKpiDetail, mapDashboardSource } from "../dashboard-kpi-detail";
import type { OperationalKpi } from "../types";
import type { WorkOrderTimeseriesData, WorkOrderTimeseriesPoint } from "../work-order-timeseries.types";
import type { BlockStatus, DashboardState, DashboardViewModel } from "./dashboard.view-model";

// B-APAR-DASH — o que as três aparências do Dashboard dividem (referência aprovada `screen-refs/dashboard-3opcoes.reference.html`):
// as regras de exibição da tela de hoje (`DashboardPage.tsx` até o head-base 0c3c7826), as funções PURAS que filtram e
// ordenam (testadas uma vez, usadas pelas três) e as peças de tela (cabeçalho, cartões que abrem o painel do detalhe, faixa
// CADASTROS, volume, tabela de uma linha com o detalhe embaixo, blocos de despachos, campo e eventos). Nenhuma consulta nasce
// aqui e nenhum número é fabricado: o evento mostra a mensagem do servidor, sem código de OS (o servidor não manda); o
// técnico é "Atribuído"/"A atribuir" (a OS não traz o nome); "sem técnico" no cartão de abertas fica neutro (o agregado não
// conta). Toda contagem feita sobre uma janela diz o universo ("nas 8 OS críticas", "nas N carregadas · T no servidor").

// =============================== Tons e tempo (os de hoje) ===============================

export const TONE: Record<DashboardTone, { bg: string; fg: string; dot: string }> = {
  info: { bg: "#EFF6FF", fg: "#2563EB", dot: "#2563EB" },
  success: { bg: "#DCFCE7", fg: "#15803D", dot: "#22C55E" },
  warning: { bg: "#FEF3C7", fg: "#B45309", dot: "#F59E0B" },
  danger: { bg: "#FEE2E2", fg: "#B91C1C", dot: "#DC2626" },
  accent: { bg: "#F3E8FF", fg: "#7E22CE", dot: "#7E22CE" },
  neutral: { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8" },
};

const pad = (n: number) => String(n).padStart(2, "0");
const parse = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};
export const clock = (iso: string | null | undefined) => {
  const date = parse(iso);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "—";
};
const dayMonth = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** "terça, 4 de agosto" (Intl pt-BR; encurta "terça-feira" → "terça", como no design). */
export function subtitleDate(now: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now).replace("-feira", "");
}

const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-07-06" → "06 jul" SEM new Date(iso) (parse ingênuo recuaria um dia no fuso local). */
export function shortDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]} ${MONTH_ABBR[Number(parts[1]) - 1] ?? parts[1]}`;
}

/** "2026-07-06" → "06/07". */
export function dayMonthOf(iso: string): string {
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
}

/**
 * Contagem regressiva da agenda da fila crítica, derivada de `scheduledFor` REAL (não há SLA contratual no agregado).
 * Cores de hoje: vencida/≤2h vermelho, ≤4h âmbar, além disso cinza. `sort` ordena da mais urgente para a menos.
 */
export function agendaCountdown(scheduledFor: string | null, now: Date): { text: string; color: string; sort: number } {
  const at = parse(scheduledFor);
  if (!at) return { text: "—", color: "#94A3B8", sort: Number.MAX_SAFE_INTEGER };
  const diffMin = Math.round((at.getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return { text: "vencida", color: "#DC2626", sort: diffMin };
  const color = diffMin <= 120 ? "#DC2626" : diffMin <= 240 ? "#B45309" : "#64748B";
  return { text: `${pad(Math.floor(diffMin / 60))}:${pad(diffMin % 60)}`, color, sort: diffMin };
}

/** "14/10 07:30 · vencida há 2 h" / "14/10 10:30 · em 00:50" / "Sem agenda". */
export function agendaText(scheduledFor: string | null, now: Date): string {
  const at = parse(scheduledFor);
  if (!at) return "Sem agenda";
  const diffMin = Math.round((at.getTime() - now.getTime()) / 60000);
  const head = `${dayMonth(at)} ${clock(scheduledFor)}`;
  return diffMin <= 0 ? `${head} · vencida ${relativeTimeFrom(scheduledFor, now)}` : `${head} · em ${pad(Math.floor(diffMin / 60))}:${pad(diffMin % 60)}`;
}

// =============================== Fila crítica: ordem e filtros ===============================

/** As OS críticas do agregado, da agenda mais urgente para a menos — TODAS as que o servidor mandou (até 8; hoje a tela cortava em 4). */
export function sortCritical(orders: readonly DashboardCriticalOrder[], now: Date): DashboardCriticalOrder[] {
  return [...orders].sort((a, b) => agendaCountdown(a.scheduledFor, now).sort - agendaCountdown(b.scheduledFor, now).sort);
}

const OPEN_STATUSES = new Set(["open", "assigned", "accepted"]);
const FIELD_STATUSES = new Set(["on_route", "on_site", "in_progress", "paused"]);
const FINAL_STATUSES = new Set(["completed", "cancelled", "rejected"]);

export const isCriticalOverdue = (order: Pick<DashboardCriticalOrder, "scheduledFor" | "status">, now: Date) => {
  const at = parse(order.scheduledFor);
  return Boolean(at) && (at as Date).getTime() < now.getTime() && !FINAL_STATUSES.has(order.status);
};

/** O cartão que FILTRA a fila (A e C: só os três que têm critério sobre a OS crítica; os demais só explicam). */
export const KPI_QUEUE_FILTER: Readonly<Record<string, { readonly label: string; readonly match: (order: DashboardCriticalOrder, now: Date) => boolean }>> = {
  open: { label: "OS abertas", match: (o) => OPEN_STATUSES.has(o.status) },
  in_progress: { label: "Em andamento", match: (o) => FIELD_STATUSES.has(o.status) },
  overdue: { label: "Atrasadas", match: (o, now) => isCriticalOverdue(o, now) },
};

/** B: abas da lista "OS que exigem atenção" (referência `ABAS_B`). */
export const CRITICAL_TABS: readonly { readonly key: string; readonly label: string; readonly match: (order: DashboardCriticalOrder, now: Date) => boolean }[] = [
  { key: "todas", label: "Todas", match: () => true },
  { key: "atrasadas", label: "Atrasadas", match: (o, now) => isCriticalOverdue(o, now) },
  { key: "prioridade", label: "Urgentes e altas", match: (o) => o.priority === "urgent" || o.priority === "high" },
  { key: "inicio", label: "Aguardando início", match: (o) => OPEN_STATUSES.has(o.status) },
  { key: "campo", label: "Em campo", match: (o) => FIELD_STATUSES.has(o.status) },
];

/**
 * Para onde a lista de OS abre já filtrada (o §1 lê `?aba=`/`?alvo=`): só onde o recorte da lista É o do cartão. "OS
 * abertas" do painel (abertas + atribuídas + aceitas) e "OS hoje" não têm recorte igual na lista: vão para a lista toda,
 * sem prometer filtro. "Atrasadas" filtra sobre as OS carregadas, e a lista diz o universo.
 */
export const KPI_LIST_TARGET: Readonly<Record<string, string>> = {
  in_progress: "/work-orders?aba=em-campo",
  overdue: "/work-orders?alvo=ag-atrasadas",
  completed: "/work-orders?aba=concluidas",
};

// =============================== Cartões ===============================

const TAG_NEUTRAL: KpiStatTag = { label: "em fila", bg: "#F1F5F9", fg: "#475569" };
const TAG_OK: KpiStatTag = { label: "no prazo", bg: "#DCFCE7", fg: "#15803D" };
const TAG_LATE: KpiStatTag = { label: "há atrasos", bg: "#FEF3C7", fg: "#B45309" };
const TAG_ACT_NOW: KpiStatTag = { label: "agir agora", bg: "#FEE2E2", fg: "#B91C1C" };
const TAG_UNDER_CONTROL: KpiStatTag = { label: "sob controle", bg: "#DCFCE7", fg: "#15803D" };
const TAG_TODAY: KpiStatTag = { label: "no dia", bg: "#F1F5F9", fg: "#475569" };
const TAG_DONE: KpiStatTag = { label: "finalizadas", bg: "#DCFCE7", fg: "#15803D" };

export type DashboardKpiCardDef = {
  readonly key: string;
  readonly kpi: OperationalKpi;
  readonly icon: LucideIcon;
  readonly iconColor: string;
  readonly iconBg: string;
  readonly tag: KpiStatTag;
  readonly border?: string;
};

export const KPI_ORDER = ["open", "in_progress", "overdue", "created_today", "completed"] as const;
const toCount = (value: string | undefined) => (value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null);

/** Os 5 cartões de hoje, na ordem da referência, só com as contagens que o agregado mandou (sem id → sem cartão). */
export function dashboardKpiCards(kpis: readonly OperationalKpi[]): DashboardKpiCardDef[] {
  const byId = new Map(kpis.map((kpi) => [kpi.id, kpi]));
  const overdue = toCount(byId.get("overdue")?.value) ?? 0;
  const defs: Record<(typeof KPI_ORDER)[number], Omit<DashboardKpiCardDef, "key" | "kpi">> = {
    open: { icon: Wrench, iconColor: "#2563EB", iconBg: "#EFF6FF", tag: TAG_NEUTRAL }, // "N sem técnico": o agregado não conta → selo neutro
    in_progress: { icon: Send, iconColor: "#0369A1", iconBg: "#F0F9FF", tag: overdue === 0 ? TAG_OK : TAG_LATE },
    overdue: {
      icon: AlertTriangle,
      iconColor: overdue > 0 ? "#DC2626" : "#15803D",
      iconBg: overdue > 0 ? "#FEF2F2" : "#F0FDF4",
      tag: overdue > 0 ? TAG_ACT_NOW : TAG_UNDER_CONTROL,
      border: overdue > 0 ? "#FCA5A5" : undefined,
    },
    created_today: { icon: Clock, iconColor: "#B45309", iconBg: "#FFFBEB", tag: TAG_TODAY },
    completed: { icon: CheckCircle2, iconColor: "#15803D", iconBg: "#F0FDF4", tag: TAG_DONE },
  };
  return KPI_ORDER.flatMap((key) => {
    const kpi = byId.get(key);
    return kpi ? [{ key, kpi, ...defs[key] }] : [];
  });
}

export const REGISTRY = [
  { id: "customers", label: "clientes" },
  { id: "vehicles", label: "viaturas" },
  { id: "teams", label: "equipes" },
  { id: "services", label: "serviços" },
] as const;

/** A série do modelo no formato que `buildDashboardKpiDetail` lê (só "api" com pontos vira gráfico). */
export function seriesAsTimeseries(model: Pick<DashboardViewModel, "series">): WorkOrderTimeseriesData {
  return { from: "", to: "", points: model.series.items, source: model.series.status === "ready" ? model.series.source : "fallback", forbidden: model.series.status === "forbidden" };
}

// =============================== Peças de tela ===============================

const failed = (status: BlockStatus) => status === "error" || status === "forbidden";

export function DashHeader({ model, kicker, subtitle }: { readonly model: DashboardViewModel; readonly kicker: string; readonly subtitle: string }) {
  return (
    <PageHeader
      kicker={kicker}
      title={`${greeting(model.now)}, ${model.userName}`}
      subtitle={`${subtitle} · ${model.orgName} · ${subtitleDate(model.now)}`}
      actions={
        model.access.readLocations || model.access.createWorkOrder ? (
          <>
            {/* "Exportar" do protótipo OMITIDO — sem ação de exportação equivalente no dashboard real. */}
            {model.access.readLocations ? (
              <button type="button" className="pat-btn" onClick={() => model.onNavigate("/operations/map")}>
                <MapIcon size={15} aria-hidden="true" />
                Mapa operacional
              </button>
            ) : null}
            {model.access.createWorkOrder ? (
              <button type="button" className="pat-btn pat-btn--primary" onClick={model.onCreate}>
                <Plus size={15} aria-hidden="true" />
                Nova OS
              </button>
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}

/** Faixa de dado desatualizado (falha em segundo plano mantém o último bom) e o selo do modo demonstração. */
export function DashStatusStrip({ model }: { readonly model: DashboardViewModel }) {
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

/** "Acesso não permitido" DENTRO de um bloco (403 de uma fonte secundária). */
export function BlockForbidden({ children }: { readonly children: ReactNode }) {
  return (
    <div className="apardash-bloq" data-state="forbidden" role="note">
      <Lock size={16} aria-hidden="true" />
      <span>
        <b>Acesso não permitido.</b> {children}
      </span>
    </div>
  );
}

export function BlockEmpty({ children, state = "empty" }: { readonly children: ReactNode; readonly state?: "empty" | "error" }) {
  return (
    <div className="pat-dash-empty" data-state={state}>
      {children}
    </div>
  );
}

/** Linhas-esqueleto de uma tabela de bloco (carregando, sem número). */
export function SkeletonRows({ cols, rows = 3 }: { readonly cols: number; readonly rows?: number }) {
  return (
    <table className="pat-ab-table apardash-card-tab" data-state="loading" aria-hidden="true">
      <tbody>
        {Array.from({ length: rows }).map((_, row) => (
          <tr key={row} className="pat-ab-row" style={{ cursor: "default" }}>
            {Array.from({ length: cols }).map((__, cell) => (
              <td key={cell}>
                <span className="pat-skel" style={{ width: "78%", height: 12, verticalAlign: "middle" }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** O resumo falhou na carga inicial: erro com "Tentar novamente", ou acesso não permitido (403 do agregado). */
export function SummaryFailure({ model }: { readonly model: DashboardViewModel }) {
  if (model.summary.status === "forbidden") {
    return (
      <div className="apardash-acesso" data-state="forbidden" role="alert">
        <span className="apardash-acesso__ic" aria-hidden="true">
          <Lock size={24} />
        </span>
        <h2>Acesso não permitido</h2>
        <p>Seu perfil não tem acesso aos indicadores do Dashboard nesta organização. Fale com o administrador da organização se precisar deles.</p>
      </div>
    );
  }
  return (
    <div role="alert" className="pat-banner pat-banner--error" data-state="error">
      <span>{model.summary.reason ?? "Não foi possível carregar os indicadores do painel agora."}</span>
      <button type="button" className="pat-link" onClick={model.onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}

const kpiSkeleton = (count: number) =>
  Array.from({ length: count }).map((_, index) => (
    <div key={index} className="pat-kpi" aria-hidden="true">
      <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
      <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
      <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
    </div>
  ));

const toggleCard = (model: DashboardViewModel, key: string): DashboardState => ({ ...model.state, cartao: model.state.cartao === key ? null : key, linha: null });

/**
 * Os 5 cartões. O clique abre o detalhe do cartão num PAINEL embaixo (não é pop-up nem navegação) e filtra a fila
 * (`aria-pressed`). Carregando: esqueleto sem número. Falha do resumo: nenhum número, só o aviso.
 */
export function DashKpiGrid({ model, footer }: { readonly model: DashboardViewModel; readonly footer?: (key: string) => ReactNode }) {
  const { summary } = model;
  if (summary.status === "loading") {
    return (
      <div className="pat-dash-kpis" aria-live="polite" data-state="loading">
        {kpiSkeleton(5)}
      </div>
    );
  }
  if (failed(summary.status)) {
    return (
      <div className="pat-dash-kpis">
        <div className="pat-card pat-dash-empty" style={{ gridColumn: "1 / -1" }}>
          Indicadores indisponíveis no momento.
        </div>
      </div>
    );
  }
  const cards = dashboardKpiCards(summary.kpis);
  return (
    <div className="pat-dash-kpis" aria-live="polite">
      {cards.map((card) => {
        const extra = footer?.(card.key);
        const node = (
          <KpiStatCard
            key={card.key}
            icon={card.icon}
            iconColor={card.iconColor}
            iconBg={card.iconBg}
            value={card.kpi.value}
            label={card.kpi.label}
            hint={card.kpi.delta}
            tag={card.tag}
            border={card.border}
            onClick={() => model.onState(toggleCard(model, card.key))}
            pressed={model.state.cartao === card.key}
            ariaLabel={`${card.kpi.label}: ${card.kpi.value} — ver detalhes`}
          />
        );
        return extra ? (
          <div key={card.key} className="apardash-kpi-spark">
            {node}
            {extra}
          </div>
        ) : (
          node
        );
      })}
    </div>
  );
}

/** Faixa CADASTROS: cada contagem é um botão que abre o detalhe dela no painel. */
export function RegistryStrip({ model }: { readonly model: DashboardViewModel }) {
  if (model.summary.status !== "ready") return null;
  const byId = new Map(model.summary.kpis.map((kpi) => [kpi.id, kpi]));
  const pills = REGISTRY.flatMap((entry) => {
    const kpi = byId.get(entry.id);
    return kpi ? [{ ...entry, kpi }] : [];
  });
  if (pills.length === 0) return null;
  return (
    <div className="pat-dash-cads">
      <span className="pat-dash-cads__label">CADASTROS</span>
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          className="pat-dash-cads__pill apardash-cads-pill"
          aria-pressed={model.state.cartao === pill.id}
          aria-label={`${pill.kpi.label}: ${pill.kpi.value} — ver detalhes`}
          onClick={() => model.onState(toggleCard(model, pill.id))}
        >
          <span className="pat-dash-cads__n">{pill.kpi.value}</span>
          <span className="pat-dash-cads__name">{pill.label}</span>
        </button>
      ))}
      <span className="pat-dash-cads__spacer" />
      {model.access.can("customers:read") ? (
        <button type="button" className="pat-link" onClick={() => model.onNavigate("/cadastros/clientes")}>
          Gerenciar cadastros
        </button>
      ) : null}
    </div>
  );
}

/**
 * O detalhe do cartão aberto, num painel embaixo dos cartões (no lugar do pop-up de hoje). O texto, o gráfico e o botão
 * vêm de `buildDashboardKpiDetail` (os mesmos de hoje; o botão só existe se o perfil abre a rota). Onde a lista de OS tem
 * o MESMO recorte do cartão, o botão abre a lista já filtrada (`KPI_LIST_TARGET`).
 */
export function KpiPanel({
  model,
  filterText,
  breakdown = false,
  rail = false,
}: {
  readonly model: DashboardViewModel;
  /** Quando o cartão filtra a fila desta aparência: a frase que diz isso. */
  readonly filterText?: string;
  /** B: a decomposição de "OS abertas"/"Em andamento" pelas situações do agregado. */
  readonly breakdown?: boolean;
  readonly rail?: boolean;
}) {
  const key = model.state.cartao;
  if (!key || model.summary.status !== "ready") return null;
  const kpi = model.summary.kpis.find((entry) => entry.id === key);
  if (!kpi) return null;
  const detail = buildDashboardKpiDetail(kpi, mapDashboardSource(model.summary.source), seriesAsTimeseries(model), model.access.can);
  const by = model.summary.byStatus;
  const parts =
    breakdown && by
      ? key === "open"
        ? [
            ["Aberta", by.open],
            ["Atribuída", by.assigned],
            ["Aceita", by.accepted],
          ]
        : key === "in_progress"
          ? [
              ["Em rota", by.on_route],
              ["No local", by.on_site],
              ["Em atendimento", by.in_progress],
              ["Pausada", by.paused],
            ]
          : null
      : null;
  const cta = detail.cta ? { label: detail.cta.label, to: KPI_LIST_TARGET[key] ?? detail.cta.to } : null;
  let body: ReactNode;
  if (detail.body.kind === "chart") {
    const chart = detail.body;
    body = <TrendChart series={chart.series} labels={chart.labels} type={chart.chartType ?? "area"} valueFormat={chart.valueFormat} height={120} showLegend={false} ariaLabel={detail.caption} />;
  } else if (detail.body.kind === "breakdown") {
    body = (
      <div className="apardash-quebra">
        {detail.body.parts.map((part) => (
          <div key={part.label}>
            <span>{part.label}</span>
            <b>{part.value}</b>
          </div>
        ))}
      </div>
    );
  } else {
    body = (
      <>
        <p className="apardash-panel__txt">{detail.body.text}</p>
        {parts ? (
          <div className="apardash-quebra">
            {parts.map(([label, value]) => (
              <div key={label as string}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        ) : null}
      </>
    );
  }
  const filters = Boolean(filterText) && Boolean(KPI_QUEUE_FILTER[key]);
  return (
    <section className={rail ? "apardash-panel apardash-panel--rail" : "apardash-panel"} aria-label={`Detalhes de ${detail.title}`} data-cartao={key}>
      <div>
        <div className="apardash-panel__t">{detail.title}</div>
        <div className="apardash-panel__v">{detail.value}</div>
        <div className="apardash-panel__c">{detail.caption}</div>
        {filters ? <div className="apardash-panel__c apardash-panel__c--filtro">{filterText}</div> : null}
      </div>
      <div style={{ minWidth: 0 }}>{body}</div>
      <div className="apardash-panel__acoes">
        {cta ? (
          <button type="button" className="ui-button ui-button--secondary ui-button--sm" onClick={() => model.onNavigate(cta.to)}>
            {cta.label}
          </button>
        ) : null}
        <button type="button" className="pat-link" onClick={() => model.onState({ ...model.state, cartao: null })}>
          Fechar
        </button>
      </div>
    </section>
  );
}

/** O filtro ativo acima da lista; sai com um clique. */
export function FilterChip({ label, onClear }: { readonly label: string | null; readonly onClear: () => void }) {
  if (!label) return null;
  return (
    <div className="pat-filtro-chip-bar">
      <span className="pat-filtro-chip" data-filtro-ativo="">
        <span>{`Filtro: ${label}`}</span>
        <button type="button" aria-label="Limpar filtro" onClick={onClear}>
          <X size={11} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

// =============================== Volume de OS ===============================

const LEGEND = (
  <div className="pat-dash-legend" aria-hidden="true">
    <span className="pat-dash-legend__item">
      <span className="pat-dash-legend__swatch" style={{ background: "#2563EB" }} />
      Abertas
    </span>
    <span className="pat-dash-legend__item">
      <span className="pat-dash-legend__swatch" style={{ background: "#22C55E" }} />
      Concluídas
    </span>
    <span className="pat-dash-legend__item">
      <span className="pat-dash-legend__swatch" style={{ background: "#E2E8F0" }} />
      Canceladas
    </span>
  </div>
);

/** Marcos do eixo-x (~5 datas distribuídas na série real). */
function axisMarks(points: readonly WorkOrderTimeseriesPoint[]): string[] {
  const total = points.length;
  if (total === 0) return [];
  const count = Math.min(5, total);
  return Array.from({ length: count }, (_, index) => shortDate(points[count === 1 ? 0 : Math.round((index * (total - 1)) / (count - 1))].date));
}

const pointTitle = (point: WorkOrderTimeseriesPoint) => `${shortDate(point.date)} · ${point.created} abertas · ${point.completed} concluídas · ${point.cancelled} canceladas`;

/** Barras EMPILHADAS por dia com a série REAL (abertas embaixo, concluídas, canceladas no topo), como hoje. */
export function VolumeBars({
  points,
  selected = null,
  onDay,
  compact = false,
}: {
  readonly points: readonly WorkOrderTimeseriesPoint[];
  readonly selected?: number | null;
  /** B: cada dia vira um botão que mostra a leitura do dia. */
  readonly onDay?: (index: number) => void;
  readonly compact?: boolean;
}) {
  const maxTotal = points.reduce((max, point) => Math.max(max, point.created + point.completed + point.cancelled), 0);
  const unit = maxTotal > 0 ? 100 / maxTotal : 0;
  const stack = (point: WorkOrderTimeseriesPoint) => (
    <>
      <span className="pat-dash-bars__canc" style={{ height: `${point.cancelled * unit}%` }} />
      <span className="pat-dash-bars__done" style={{ height: `${point.completed * unit}%` }} />
      <span className="pat-dash-bars__open" style={{ height: `${point.created * unit}%` }} />
    </>
  );
  return (
    <>
      <div
        className={compact ? "pat-dash-bars apardash-bars--compact" : "pat-dash-bars"}
        role={onDay ? "group" : "img"}
        aria-label={`Volume diário de ordens de serviço nos últimos ${points.length} dias`}
      >
        {points.map((point, index) =>
          onDay ? (
            <button
              key={point.date}
              type="button"
              className={selected === index ? "pat-dash-bars__day apardash-day apardash-day--on" : "pat-dash-bars__day apardash-day"}
              aria-pressed={selected === index}
              aria-label={`${dayMonthOf(point.date)}: ${point.created} abertas, ${point.completed} concluídas, ${point.cancelled} canceladas`}
              title={pointTitle(point)}
              onClick={() => onDay(index)}
            >
              {stack(point)}
            </button>
          ) : (
            <div key={point.date} className="pat-dash-bars__day" title={pointTitle(point)}>
              {stack(point)}
            </div>
          ),
        )}
      </div>
      <div className="pat-dash-axis" aria-hidden="true">
        {axisMarks(points).map((mark) => (
          <span key={mark}>{mark}</span>
        ))}
      </div>
    </>
  );
}

/** O corpo do bloco de volume por estado: acesso não permitido, carregando, erro, vazio ou as barras. */
export function volumeBody(model: DashboardViewModel, points: readonly WorkOrderTimeseriesPoint[], render: () => ReactNode): ReactNode {
  const { series } = model;
  if (!model.access.readWorkOrders || series.status === "forbidden") return <BlockForbidden>Seu perfil não tem permissão para ver o volume de ordens de serviço.</BlockForbidden>;
  if (series.status === "loading") return <span className="pat-skel" data-state="loading" style={{ display: "block", height: 150 }} />;
  if (series.status === "error")
    return (
      <div className="pat-banner pat-banner--warning" data-state="error" style={{ margin: 0 }}>
        Não foi possível carregar o gráfico. Tentaremos novamente na próxima atualização.
      </div>
    );
  if (points.length === 0 || points.every((point) => point.created + point.completed + point.cancelled === 0)) return <BlockEmpty>Sem ordens no período.</BlockEmpty>;
  return render();
}

export function VolumeCard({ model, className, subtitle, children }: { readonly model: DashboardViewModel; readonly className?: string; readonly subtitle?: string; readonly children?: ReactNode }) {
  return (
    <section className={className ? `pat-card ${className}` : "pat-card"}>
      <div className="pat-dash-chart-head">
        <div>
          <h2 className="pat-card__title">Volume de ordens de serviço</h2>
          <div className="pat-card__subtitle">{subtitle ?? "Últimos 30 dias · abertas, concluídas e canceladas"}</div>
        </div>
        {LEGEND}
      </div>
      {children ?? volumeBody(model, model.series.items, () => <VolumeBars points={model.series.items} />)}
    </section>
  );
}

// =============================== Tabelas de bloco (linha de uma altura + detalhe embaixo) ===============================

const toggleRow = (model: DashboardViewModel, key: string) => model.onState({ ...model.state, linha: model.state.linha === key ? null : key });

export function RowField({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="pat-ab-detail-field">
      <span className="pat-ab-detail-label">{label}:</span> <span className="pat-ab-detail-val">{children}</span>
    </div>
  );
}

export function PriorityText({ priority, label }: { readonly priority: string; readonly label: string }) {
  const tone = priority === "urgent" || priority === "high" ? { dot: "#DC2626", fg: "#B91C1C" } : priority === "medium" ? { dot: "#F59E0B", fg: "#B45309" } : { dot: "#94A3B8", fg: "#64748B" };
  return (
    <span className="apardash-prio">
      <i style={{ background: tone.dot }} aria-hidden="true" />
      <b style={{ color: tone.fg }}>{label}</b>
    </span>
  );
}

export function BlockTable({ widths, children, head }: { readonly widths: readonly (number | null)[]; readonly children: ReactNode; readonly head?: readonly string[] }) {
  return (
    <table className={head ? "pat-ab-table" : "pat-ab-table apardash-card-tab"}>
      <colgroup>
        {widths.map((width, index) => (
          <col key={index} style={width ? { width } : undefined} />
        ))}
      </colgroup>
      {head ? (
        <thead>
          <tr>
            {head.map((label, index) => (index === head.length - 1 && label === "" ? <th key={index} scope="col" aria-label="Abrir detalhe" /> : <th key={index} scope="col">{label}</th>))}
          </tr>
        </thead>
      ) : null}
      <tbody>{children}</tbody>
    </table>
  );
}

export function BlockRow({ model, rowKey, cells, colSpan, detail }: { readonly model: DashboardViewModel; readonly rowKey: string; readonly cells: readonly DenseCell[]; readonly colSpan: number; readonly detail: () => ReactNode }) {
  const expanded = model.state.linha === rowKey;
  return (
    <DenseExpandableRow
      rowKey={rowKey}
      expanded={expanded}
      colSpan={colSpan}
      onToggle={() => toggleRow(model, rowKey)}
      cells={cells}
      detail={expanded ? <div className="pat-ab-detail-content">{detail()}</div> : null}
    />
  );
}

/** Ações da OS no detalhe da linha: "Abrir OS" só com `work_orders:read`; sem ela, a nota de hoje (nada de botão morto). */
export function WorkOrderActions({ model, workOrderId, extra }: { readonly model: DashboardViewModel; readonly workOrderId: string | null; readonly extra?: ReactNode }) {
  return (
    <div className="pat-ab-detail-actions">
      {model.access.readWorkOrders && workOrderId ? (
        <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onOpenWorkOrder(workOrderId)}>
          <ArrowRight size={14} aria-hidden="true" />
          Abrir OS
        </button>
      ) : null}
      {extra}
      {!model.access.readWorkOrders ? <span className="pat-ab-detail-note">Seu perfil vê esta OS no painel, mas não abre ordens de serviço.</span> : null}
    </div>
  );
}

/** A célula AGENDA (contagem regressiva) da fila crítica. */
export function CountdownCell({ order, now }: { readonly order: DashboardCriticalOrder; readonly now: Date }) {
  const countdown = agendaCountdown(order.scheduledFor, now);
  return (
    <span className="apardash-cd">
      <b style={{ color: countdown.color }}>{countdown.text}</b>
      <small>AGENDA</small>
    </span>
  );
}

export const statusPill = (label: string, tone: DashboardTone) => <StatusPill label={label} bg={TONE[tone].bg} fg={TONE[tone].fg} sm />;

/** "Atividade recente desta OS" (B): os eventos do agregado com o mesmo `workOrderId`, como vieram. */
export function eventsOf(events: readonly DashboardRecentEvent[], workOrderId: string): DashboardRecentEvent[] {
  return events.filter((event) => event.workOrderId === workOrderId);
}

// =============================== Despachos, campo e eventos ===============================

/** Nome do operador do despacho: só pela MESMA pessoa na localização (`operatorUserId` = id de usuário da posição). */
export function dispatchOperatorName(dispatch: DispatchListItem, locations: readonly FieldLocationItem[]): string | null {
  const match = locations.find((location) => location.userId === dispatch.operatorUserId || location.operatorId === dispatch.operatorUserId);
  return match ? match.displayName || match.operatorName || null : null;
}

const DISPATCH_STEPS: readonly { readonly label: string; readonly at: (d: DispatchListItem) => string | null | undefined }[] = [
  { label: "Criado", at: (d) => d.createdAt },
  { label: "Aceito", at: (d) => d.acceptedAt },
  { label: "Em rota", at: (d) => d.onRouteAt },
  { label: "No local", at: (d) => d.arrivedAt },
  { label: "Em atendimento", at: (d) => d.inServiceAt },
];

export function DispatchSteps({ dispatch }: { readonly dispatch: DispatchListItem }) {
  const done = DISPATCH_STEPS.map((step) => Boolean(parse(step.at(dispatch))));
  const last = done.lastIndexOf(true);
  return (
    <div className="apardash-etapas" role="list" aria-label="Etapas do despacho">
      {DISPATCH_STEPS.map((step, index) => (
        <span key={step.label} className="apardash-etapas__item" role="listitem">
          {index > 0 ? <span className="apardash-etapas__sep" aria-hidden="true" /> : null}
          <span className={done[index] ? (index === last ? "apardash-etapa is-feita is-atual" : "apardash-etapa is-feita") : "apardash-etapa"}>
            <i aria-hidden="true" />
            {step.label}
            <small>{done[index] ? clock(step.at(dispatch)) : "—"}</small>
          </span>
        </span>
      ))}
    </div>
  );
}

const DISPATCH_PRIORITY_LABEL: Record<string, string> = { urgent: "Urgente", high: "Alta", medium: "Média", normal: "Normal", low: "Baixa" };

export function DispatchesCard({ model }: { readonly model: DashboardViewModel }) {
  const { dispatches } = model;
  let body: ReactNode;
  if (!model.access.readDispatches || dispatches.status === "forbidden") body = <BlockForbidden>Seu perfil não acompanha despachos.</BlockForbidden>;
  else if (dispatches.status === "loading") body = <SkeletonRows cols={5} />;
  else if (dispatches.status === "error") body = <BlockEmpty state="error">Não foi possível carregar os despachos.</BlockEmpty>;
  else {
    const rows = deriveActiveDispatchRows(dispatches.items, 5);
    const byId = new Map(dispatches.items.map((item) => [item.id, item]));
    body =
      rows.length === 0 ? (
        <BlockEmpty>Nenhum despacho ativo no momento.</BlockEmpty>
      ) : (
        <BlockTable widths={[108, null, 112, 66, 30]}>
          {rows.map((row) => {
            const dispatch = byId.get(row.id) as DispatchListItem;
            const operator = dispatchOperatorName(dispatch, model.locations.items);
            return (
              <BlockRow
                key={row.id}
                model={model}
                rowKey={`disp:${row.id}`}
                colSpan={5}
                cells={[
                  {
                    key: "os",
                    content: (
                      <>
                        <span className="pat-dash-dot" style={{ background: TONE[row.tone].dot, marginRight: 8 }} aria-hidden="true" />
                        <span className="pat-mono apardash-strong">{row.title}</span>
                      </>
                    ),
                  },
                  { key: "titulo", content: row.subtitle, title: row.subtitle },
                  { key: "situacao", content: <span style={{ fontWeight: 700, color: TONE[row.tone].fg }}>{row.statusLabel}</span> },
                  { key: "quando", content: <span className="apardash-ago">{relativeTimeFrom(row.when, model.now) || "—"}</span> },
                ]}
                detail={() => (
                  <>
                    <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
                      <div className="pat-ab-detail-col">
                        <DispatchSteps dispatch={dispatch} />
                      </div>
                      <div className="pat-ab-detail-col">
                        <RowField label="OS">{`${row.title} · ${row.subtitle}`}</RowField>
                        <RowField label="Operador">{operator ?? "—"}</RowField>
                        <RowField label="Prioridade">{DISPATCH_PRIORITY_LABEL[dispatch.priority] ?? "—"}</RowField>
                        {dispatch.observation ? <RowField label="Observação">{dispatch.observation}</RowField> : null}
                      </div>
                    </div>
                    <div className="pat-ab-detail-actions">
                      <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onNavigate("/operations/dispatches")}>
                        <Send size={14} aria-hidden="true" />
                        Abrir despacho
                      </button>
                      {model.access.readWorkOrders ? (
                        <button type="button" className="pat-btn" onClick={() => model.onOpenWorkOrder(dispatch.workOrderId)}>
                          <ArrowRight size={14} aria-hidden="true" />
                          Abrir OS
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              />
            );
          })}
        </BlockTable>
      );
  }
  return (
    <section className="pat-card">
      <div className="pat-card__head">
        <h2 className="pat-card__title">Despachos ativos</h2>
        {model.access.readDispatches && dispatches.status === "ready" ? (
          <button type="button" className="pat-link" onClick={() => model.onNavigate("/operations/dispatches")}>
            Ver despachos
          </button>
        ) : null}
      </div>
      <div className="pat-card__subtitle pat-card__subtitle--gap">Do envio ao atendimento</div>
      {body}
    </section>
  );
}

/** Rótulo da situação de campo (o mesmo de `fieldStatusMeta`): é por ele que a B filtra o bloco. */
export const fieldLabel = (location: FieldLocationItem) => fieldStatusMeta(location).label;

export function FieldCard({ model, filter = null, onClearFilter }: { readonly model: DashboardViewModel; readonly filter?: string | null; readonly onClearFilter?: () => void }) {
  const { locations } = model;
  let body: ReactNode;
  if (!model.access.readLocations || locations.status === "forbidden") body = <BlockForbidden>Seu perfil não vê a localização dos operadores.</BlockForbidden>;
  else if (locations.status === "loading") body = <SkeletonRows cols={3} />;
  else if (locations.status === "error") body = <BlockEmpty state="error">Não foi possível carregar as localizações.</BlockEmpty>;
  else {
    const visible = filter ? locations.items.filter((location) => fieldLabel(location) === filter) : locations.items;
    const rows = deriveFieldStatusRows(visible, model.now, filter ? visible.length : 5);
    const byId = new Map(visible.map((location) => [location.id, location]));
    body = (
      <>
        <FilterChip label={filter} onClear={() => onClearFilter?.()} />
        {rows.length === 0 ? (
          <BlockEmpty>Nenhum operador com localização recente.</BlockEmpty>
        ) : (
          <BlockTable widths={[null, 132, 30]}>
            {rows.map((row) => {
              const location = byId.get(row.id) as FieldLocationItem;
              const os = location.currentWorkOrder ?? null;
              return (
                <BlockRow
                  key={row.id}
                  model={model}
                  rowKey={`loc:${row.id}`}
                  colSpan={3}
                  cells={[
                    {
                      key: "nome",
                      title: `${row.name} · ${row.detail}`,
                      content: (
                        <>
                          <span className="apardash-av">
                            <InitialsAvatar name={row.name} size={24} bg={TONE[row.tone].bg} fg={TONE[row.tone].fg} />
                          </span>
                          <span className="apardash-cel-main">{row.name}</span>
                          <span className="apardash-cel-meta">{row.detail}</span>
                        </>
                      ),
                    },
                    { key: "estado", content: statusPill(row.stateLabel, row.tone), className: "apardash-right" },
                  ]}
                  detail={() => (
                    <>
                      <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
                        <div className="pat-ab-detail-col">
                          <RowField label="Equipe">{location.teamName || "—"}</RowField>
                          <RowField label="Situação">{statusPill(row.stateLabel, row.tone)}</RowField>
                          <RowField label="OS atual">{os ? `${os.code} · ${os.title}` : "nenhuma"}</RowField>
                        </div>
                        <div className="pat-ab-detail-col">
                          <RowField label="Última posição">
                            {`${relativeTimeFrom(location.capturedAt, model.now) || "—"} · ${clock(location.capturedAt)}${typeof location.accuracyMeters === "number" ? ` · precisão ${Math.round(location.accuracyMeters)} m` : ""}`}
                          </RowField>
                          <RowField label="Velocidade">{typeof location.speed === "number" ? `${Math.round(location.speed * 3.6)} km/h` : "—"}</RowField>
                          <RowField label="Bateria">{typeof location.batteryLevel === "number" ? `${Math.round(location.batteryLevel)}%` : "—"}</RowField>
                        </div>
                      </div>
                      <div className="pat-ab-detail-actions">
                        <button type="button" className="pat-btn pat-btn--primary" onClick={() => model.onNavigate("/operations/map")}>
                          <MapIcon size={14} aria-hidden="true" />
                          Abrir mapa
                        </button>
                        {os && model.access.readWorkOrders ? (
                          <button type="button" className="pat-btn" onClick={() => model.onOpenWorkOrder(os.id)}>
                            <ArrowRight size={14} aria-hidden="true" />
                            Abrir OS
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                />
              );
            })}
          </BlockTable>
        )}
      </>
    );
  }
  return (
    <section className="pat-card">
      <div className="pat-card__head">
        <h2 className="pat-card__title">Status de campo</h2>
        {model.access.readLocations && locations.status === "ready" ? (
          <button type="button" className="pat-link" onClick={() => model.onNavigate("/operations/map")}>
            Abrir mapa
          </button>
        ) : null}
      </div>
      <div className="pat-card__subtitle pat-card__subtitle--gap">Última localização recebida de cada operador</div>
      {body}
    </section>
  );
}

export type EventGroup = {
  readonly id: string;
  readonly label: string;
  readonly tone: DashboardTone;
  readonly message: string;
  readonly items: readonly DashboardRecentEvent[];
};

/** Últimos eventos com AGRUPAMENTO de idênticos consecutivos ("N eventos") — só quando o dado real repete (regra de hoje). */
export function groupRecentEvents(events: readonly DashboardRecentEvent[]): EventGroup[] {
  const groups: { id: string; label: string; tone: DashboardTone; message: string; items: DashboardRecentEvent[] }[] = [];
  for (const event of events) {
    const previous = groups[groups.length - 1];
    if (previous && previous.label === event.eventLabel && previous.message === event.message) {
      previous.items.push(event);
      continue;
    }
    groups.push({ id: event.id, label: event.eventLabel, tone: event.tone, message: event.message, items: [event] });
  }
  return groups;
}

export function EventsCard({ model }: { readonly model: DashboardViewModel }) {
  const { summary } = model;
  let body: ReactNode;
  if (summary.status === "loading") body = <SkeletonRows cols={4} />;
  else if (failed(summary.status)) body = <BlockEmpty state="error">Não foi possível carregar os eventos recentes.</BlockEmpty>;
  else {
    const groups = groupRecentEvents(summary.events);
    body =
      groups.length === 0 ? (
        <BlockEmpty>Sem atividade recente.</BlockEmpty>
      ) : (
        <BlockTable widths={[null, 96, 72, 30]}>
          {groups.map((group) => (
            <BlockRow
              key={group.id}
              model={model}
              rowKey={`evt:${group.id}`}
              colSpan={4}
              cells={[
                {
                  key: "evento",
                  title: `${group.label} · ${group.message}`,
                  content: (
                    <>
                      <span className="pat-dash-dot" style={{ background: TONE[group.tone].dot, marginRight: 9 }} aria-hidden="true" />
                      <span className="apardash-cel-main">{group.label}</span>
                      <span className="apardash-cel-meta">{group.message}</span>
                    </>
                  ),
                },
                { key: "n", content: group.items.length > 1 ? <span className="pat-dash-count">{group.items.length} eventos</span> : null, className: "apardash-right" },
                { key: "quando", content: <span className="apardash-ago">{relativeTimeFrom(group.items[0].createdAt, model.now) || "—"}</span>, className: "apardash-right" },
              ]}
              detail={() => (
                <>
                  <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
                    <div className="pat-ab-detail-col">
                      <RowField label="Evento">{group.label}</RowField>
                      <RowField label="Mensagem">{group.message}</RowField>
                      {group.items.length > 1 ? <RowField label="Agrupado">{`${group.items.length} eventos iguais em sequência`}</RowField> : null}
                    </div>
                    <div className="pat-ab-detail-col">
                      {group.items.map((event, index) => (
                        <RowField key={event.id} label={group.items.length > 1 ? `${index + 1}º evento` : "Quando"}>
                          {`${clock(event.createdAt)} · ${relativeTimeFrom(event.createdAt, model.now) || "—"}`}
                        </RowField>
                      ))}
                    </div>
                  </div>
                  <div className="pat-ab-detail-actions">
                    {model.access.readWorkOrders ? (
                      group.items.map((event, index) =>
                        event.workOrderId ? (
                          <button key={event.id} type="button" className={index === 0 ? "pat-btn pat-btn--primary" : "pat-btn"} onClick={() => model.onOpenWorkOrder(event.workOrderId as string)}>
                            <ArrowRight size={14} aria-hidden="true" />
                            {group.items.length > 1 ? `Abrir OS do ${index + 1}º evento` : "Abrir OS"}
                          </button>
                        ) : null,
                      )
                    ) : (
                      <span className="pat-ab-detail-note">Seu perfil não abre ordens de serviço.</span>
                    )}
                  </div>
                </>
              )}
            />
          ))}
        </BlockTable>
      );
  }
  return (
    <section className="pat-card" style={{ marginBottom: 14 }}>
      <div className="pat-card__head">
        <div>
          <h2 className="pat-card__title">Últimos eventos</h2>
          <div className="pat-card__subtitle">Atividade recente das ordens de serviço</div>
        </div>
        {model.access.readWorkOrders ? (
          <button type="button" className="pat-link" onClick={() => model.onNavigate("/work-orders")}>
            Ver tudo
          </button>
        ) : null}
      </div>
      {body}
    </section>
  );
}

// =============================== C: a fila única de prioridades ===============================

export type PriorityQueue = {
  readonly items: readonly CriticalQueueItem[];
  /** Quantas OS "sem operador" vieram da página lida (e o universo, quando o servidor tem mais). */
  readonly unassignedLoaded: number;
};

/**
 * A fila única da C, pela ordem de `buildCriticalQueue` (já escrita; a regra NÃO muda): 1 OS atrasada · 2 OS prioritária ·
 * 3 operador sem sinal · 4 aprovação pendente · 5 OS sem operador. Uma entidade aparece uma vez, no grupo mais crítico.
 * Entram: as OS críticas do agregado (atrasadas e prioritárias; nunca viram "sem operador", porque o agregado não diz o
 * técnico) + a página de OS da C (só com `work_orders:read`) + as posições sem sinal + as aprovações. Sem `work_orders:read`
 * (Suporte) a fila tem só as atrasadas e as prioritárias, das críticas.
 */
export function buildPriorityQueue(model: Pick<DashboardViewModel, "summary" | "workOrders" | "locations" | "approvals" | "access" | "now">): PriorityQueue {
  const pageItems = model.access.readWorkOrders && model.workOrders?.status === "ready" ? model.workOrders.items : [];
  const pageIds = new Set(pageItems.map((item) => item.id));
  const fromCritical: WorkOrderListItem[] = model.summary.critical
    .filter((order) => !pageIds.has(order.id))
    .map(
      (order) =>
        ({
          id: order.id,
          code: order.code,
          title: order.title,
          customerName: order.customerName,
          status: order.status,
          priority: order.priority,
          scheduledFor: order.scheduledFor,
          createdAt: order.scheduledFor ?? "",
          assignedOperatorId: null,
        }) as unknown as WorkOrderListItem,
    );
  const criticalOnly = new Set(fromCritical.map((order) => order.id));
  const queue = buildCriticalQueue(
    {
      workOrders: [...pageItems, ...fromCritical],
      dispatches: [],
      locations: model.access.readLocations && model.locations.status === "ready" ? model.locations.items : [],
      pendingApprovals: model.access.readApprovals && model.approvals?.status === "ready" ? model.approvals.items : [],
      unread: null,
      now: model.now,
    },
    Number.MAX_SAFE_INTEGER,
  ).filter((item) => !(item.kind === "os_sem_operador" && criticalOnly.has(item.id.replace(/^unassigned-/, ""))));
  return { items: queue, unassignedLoaded: queue.filter((item) => item.kind === "os_sem_operador").length };
}

export const QUEUE_KIND: Readonly<Record<CriticalQueueKind, { readonly label: string; readonly tone: DashboardTone }>> = {
  os_atrasada: { label: "OS atrasada", tone: "danger" },
  os_prioritaria: { label: "Prioridade alta", tone: "warning" },
  campo_sem_sinal: { label: "Sem sinal", tone: "warning" },
  aprovacao_pendente: { label: "Aprovação", tone: "accent" },
  os_sem_operador: { label: "Sem técnico", tone: "neutral" },
};

/** O id da OS por trás de um item da fila (os itens de OS levam o prefixo do grupo). */
export const queueWorkOrderId = (item: CriticalQueueItem) => (item.kind === "os_atrasada" || item.kind === "os_prioritaria" || item.kind === "os_sem_operador" ? item.id.replace(/^(overdue|priority|unassigned)-/, "") : null);

// =============================== A e B: a fila crítica em linhas ===============================

/** As linhas da fila crítica. `compacta` (A, meia largura): AGENDA · OS e cliente · SITUAÇÃO. `larga` (B): 6 colunas e o detalhe com endereço e técnico. */
export function CriticalRows({ model, orders, mode }: { readonly model: DashboardViewModel; readonly orders: readonly DashboardCriticalOrder[]; readonly mode: "compacta" | "larga" }) {
  return (
    <>
      {orders.map((order) => {
        const key = `crit:${order.id}`;
        const cells: DenseCell[] =
          mode === "larga"
            ? [
                { key: "agenda", content: <CountdownCell order={order} now={model.now} /> },
                { key: "os", content: <span className="pat-dash-code pat-mono">{order.code}</span> },
                { key: "cliente", content: <span className="apardash-cel-main">{order.customerName ?? "Sem cliente vinculado"}</span>, title: order.customerName ?? "Sem cliente vinculado" },
                { key: "servico", content: order.title, title: order.title },
                { key: "prioridade", content: <PriorityText priority={order.priority} label={order.priorityLabel} /> },
                { key: "situacao", content: statusPill(order.statusLabel, order.statusTone) },
              ]
            : [
                { key: "agenda", content: <CountdownCell order={order} now={model.now} /> },
                {
                  key: "os",
                  title: `${order.code} · ${order.customerName ?? order.title}`,
                  content: (
                    <>
                      <span className="pat-dash-code pat-mono">{order.code}</span> <span className="apardash-cel-main" style={{ marginLeft: 4 }}>{order.customerName ?? order.title}</span>
                    </>
                  ),
                },
                { key: "situacao", content: statusPill(order.statusLabel, order.statusTone), className: "apardash-right" },
              ];
        return (
          <BlockRow
            key={order.id}
            model={model}
            rowKey={key}
            colSpan={cells.length + 1}
            cells={cells}
            detail={() => (mode === "larga" ? <CriticalDetailWide model={model} order={order} /> : <CriticalDetailCompact model={model} order={order} />)}
          />
        );
      })}
    </>
  );
}

function CriticalDetailCompact({ model, order }: { readonly model: DashboardViewModel; readonly order: DashboardCriticalOrder }) {
  const countdown = agendaCountdown(order.scheduledFor, model.now);
  return (
    <>
      <div className="pat-ab-detail-grid pat-ab-detail-grid--2">
        <div className="pat-ab-detail-col">
          <RowField label="OS">
            <span className="pat-mono">{order.code}</span>
          </RowField>
          <RowField label="Cliente">{order.customerName ?? "Sem cliente vinculado"}</RowField>
          <RowField label="Serviço">{order.title}</RowField>
        </div>
        <div className="pat-ab-detail-col">
          <RowField label="Agenda">
            <b style={{ color: countdown.color }}>{agendaText(order.scheduledFor, model.now)}</b>
          </RowField>
          <RowField label="Prioridade">
            <PriorityText priority={order.priority} label={order.priorityLabel} />
          </RowField>
          <RowField label="Situação">{statusPill(order.statusLabel, order.statusTone)}</RowField>
        </div>
      </div>
      <WorkOrderActions model={model} workOrderId={order.id} extra={model.access.readWorkOrders && model.access.readLocations ? <MapButton model={model} /> : null} />
    </>
  );
}

function MapButton({ model }: { readonly model: DashboardViewModel }) {
  return (
    <button type="button" className="pat-btn" onClick={() => model.onNavigate("/operations/map")}>
      <MapIcon size={14} aria-hidden="true" />
      Abrir mapa
    </button>
  );
}

/** B: o detalhe largo — endereço e técnico vêm de `GET /work-orders/:id`, pedido só ao abrir a linha (e guardado). */
function CriticalDetailWide({ model, order }: { readonly model: DashboardViewModel; readonly order: DashboardCriticalOrder }) {
  const countdown = agendaCountdown(order.scheduledFor, model.now);
  const detail = model.rowDetail[order.id];
  const events = eventsOf(model.summary.events, order.id);
  let address: ReactNode;
  let technician: ReactNode;
  if (!model.access.readWorkOrders || detail?.status === "forbidden") {
    address = "—";
    technician = "—";
  } else if (!detail || detail.status === "loading") {
    address = <span className="pat-skel" data-state="loading" style={{ width: 140, height: 11 }} />;
    technician = <span className="pat-skel" style={{ width: 80, height: 11 }} />;
  } else if (detail.status === "ready") {
    const wo = detail.workOrder;
    address = [wo.serviceAddress, wo.serviceCity ? `${wo.serviceCity}${wo.serviceState ? `/${wo.serviceState}` : ""}` : null].filter(Boolean).join(" — ") || "—";
    technician = wo.assignedOperatorId ? "Atribuído" : <b style={{ color: "#B45309" }}>A atribuir</b>;
  } else {
    address = <span data-state="error">Não foi possível carregar</span>;
    technician = "—";
  }
  return (
    <>
      <div className="pat-ab-detail-grid">
        <div className="pat-ab-detail-col">
          <RowField label="Cliente">{order.customerName ?? "Sem cliente vinculado"}</RowField>
          <RowField label="Serviço">{order.title}</RowField>
          <RowField label="Endereço">{address}</RowField>
        </div>
        <div className="pat-ab-detail-col">
          <RowField label="Agenda">
            <b style={{ color: countdown.color }}>{agendaText(order.scheduledFor, model.now)}</b>
          </RowField>
          <RowField label="Prioridade">
            <PriorityText priority={order.priority} label={order.priorityLabel} />
          </RowField>
          <RowField label="Situação">{statusPill(order.statusLabel, order.statusTone)}</RowField>
          <RowField label="Técnico">{technician}</RowField>
        </div>
        <div className="pat-ab-detail-col">
          <span className="pat-ab-detail-label">Atividade recente desta OS</span>
          {events.length > 0 ? (
            <ul className="apardash-mini-tl">
              {events.map((event) => (
                <li key={event.id}>
                  <small>{clock(event.createdAt)}</small>
                  <span>{`${event.eventLabel} — ${event.message}`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="pat-ab-detail-note">Sem eventos desta OS entre os últimos do painel.</span>
          )}
        </div>
      </div>
      <WorkOrderActions model={model} workOrderId={order.id} extra={model.access.readWorkOrders && model.access.readLocations ? <MapButton model={model} /> : null} />
    </>
  );
}
