import { AlertTriangle, CheckCircle2, Clock, Map as MapIcon, Plus, Send, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  deriveActiveDispatchRows,
  deriveFieldStatusRows,
  relativeTimeFrom,
  type DashboardCriticalOrder,
  type DashboardRecentEvent,
  type DashboardTone,
} from "../modules/dashboard/dashboard.adapter";
import { InitialsAvatar, KpiStatCard, PageHeader, StatusPill, type KpiStatTag } from "../components/patterns";
import { Alert, EmptyState, Skeleton } from "../components/ui";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useDashboardData } from "../modules/dashboard/useDashboardData";
import { useWorkOrderTimeseries } from "../modules/dashboard/useWorkOrderTimeseries";
import type { DashboardSource } from "../modules/dashboard/repository";
import type { WorkOrderTimeseriesData } from "../modules/dashboard/work-order-timeseries.types";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

// Dashboard (PR-A TELAS PADRONIZADAS) — reproduz o bloco `sc_dash` do protótipo
// "ERP Web - Telas Padronizadas.dc.html" com DADOS REAIS (useDashboardData +
// useWorkOrderTimeseries — agregado GET /dashboard/summary e série diária de OS).
// Nenhum número é fabricado (D-007). Degradações honestas documentadas inline:
//  · "SLA em risco" do design NÃO existe no agregado real (sem SLA contratual) →
//    o slot crítico (borda #FCA5A5 + selo "agir agora") é ocupado por "Atrasadas"
//    (contagem real de agenda vencida) e "OS hoje" completa a hierarquia 5-cards.
//  · "N sem técnico" não é derivável do agregado → selo neutro no card OS abertas.
//  · "Exportar" do protótipo omitido: não há ação de exportação equivalente no
//    dashboard real (sem botão morto).
//  · A coluna de countdown da fila crítica deriva de `scheduledFor` (agenda), por
//    isso o rótulo é "AGENDA" — não "SLA".
//  · Selos sem base de comparação real (ex.: "+3 vs ontem") viram selos estáticos.

const TONE: Record<DashboardTone, { bg: string; fg: string; dot: string }> = {
  info: { bg: "#EFF6FF", fg: "#2563EB", dot: "#2563EB" },
  success: { bg: "#DCFCE7", fg: "#15803D", dot: "#22C55E" },
  warning: { bg: "#FEF3C7", fg: "#B45309", dot: "#F59E0B" },
  danger: { bg: "#FEE2E2", fg: "#B91C1C", dot: "#DC2626" },
  accent: { bg: "#F3E8FF", fg: "#7E22CE", dot: "#7E22CE" },
  neutral: { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8" },
};

const TAG_NEUTRAL: KpiStatTag = { label: "em fila", bg: "#F1F5F9", fg: "#475569" };
const TAG_OK: KpiStatTag = { label: "no prazo", bg: "#DCFCE7", fg: "#15803D" };
const TAG_LATE: KpiStatTag = { label: "há atrasos", bg: "#FEF3C7", fg: "#B45309" };
const TAG_ACT_NOW: KpiStatTag = { label: "agir agora", bg: "#FEE2E2", fg: "#B91C1C" };
const TAG_UNDER_CONTROL: KpiStatTag = { label: "sob controle", bg: "#DCFCE7", fg: "#15803D" };
const TAG_TODAY: KpiStatTag = { label: "no dia", bg: "#F1F5F9", fg: "#475569" };
const TAG_DONE: KpiStatTag = { label: "finalizadas", bg: "#DCFCE7", fg: "#15803D" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** "terça, 4 de agosto" (Intl pt-BR; encurta "terça-feira" → "terça", como no design). */
function subtitleDate(now: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now);
  return label.replace("-feira", "");
}

const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-07-06" → "06 jul" SEM new Date(iso) (parse ingênuo recuaria um dia no fuso local). */
function shortDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [, month, day] = parts;
  return `${day} ${MONTH_ABBR[Number(month) - 1] ?? month}`;
}

function toCount(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Countdown de agenda da fila crítica, derivado de `scheduledFor` REAL (não há SLA
 * contratual no agregado). Cores por criticidade (do design): vencida/≤2h vermelho,
 * ≤4h âmbar, além disso cinza. `sort` ordena da mais urgente para a menos.
 */
function agendaCountdown(scheduledFor: string | null, now: Date): { text: string; color: string; sort: number } {
  if (!scheduledFor) return { text: "—", color: "#94A3B8", sort: Number.MAX_SAFE_INTEGER };
  const at = new Date(scheduledFor).getTime();
  if (Number.isNaN(at)) return { text: "—", color: "#94A3B8", sort: Number.MAX_SAFE_INTEGER };
  const diffMin = Math.round((at - now.getTime()) / 60000);
  if (diffMin <= 0) return { text: "vencida", color: "#DC2626", sort: diffMin };
  const hh = String(Math.floor(diffMin / 60)).padStart(2, "0");
  const mm = String(diffMin % 60).padStart(2, "0");
  const color = diffMin <= 120 ? "#DC2626" : diffMin <= 240 ? "#B45309" : "#64748B";
  return { text: `${hh}:${mm}`, color, sort: diffMin };
}

type CriticalRow = {
  id: string;
  code: string;
  main: string;
  sub: string;
  countdown: string;
  countdownColor: string;
  statusLabel: string;
  tone: DashboardTone;
};

/** Fila "Exige ação agora": OS críticas REAIS do agregado, das mais urgentes, máx. 4. */
function deriveCriticalRows(orders: readonly DashboardCriticalOrder[], now: Date, limit = 4): CriticalRow[] {
  return orders
    .map((order) => {
      const countdown = agendaCountdown(order.scheduledFor, now);
      return {
        id: order.id,
        code: order.code,
        main: order.customerName ?? order.title,
        sub: order.customerName ? `${order.title} · Prioridade ${order.priorityLabel}` : `Prioridade ${order.priorityLabel}`,
        countdown: countdown.text,
        countdownColor: countdown.color,
        statusLabel: order.statusLabel,
        tone: order.statusTone,
        sortKey: countdown.sort,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, limit)
    .map(({ sortKey: _sortKey, ...row }) => row);
}

type EventRow = {
  id: string;
  dot: string;
  title: string;
  meta: string;
  count: number;
  ago: string;
};

/** Últimos eventos com AGRUPAMENTO de idênticos consecutivos (pill "N eventos") — só quando o dado real repete. */
function groupRecentEvents(events: readonly DashboardRecentEvent[], now: Date): EventRow[] {
  const rows: EventRow[] = [];
  for (const event of events) {
    const previous = rows[rows.length - 1];
    if (previous && previous.title === event.eventLabel && previous.meta === event.message) {
      previous.count += 1;
      continue;
    }
    rows.push({
      id: event.id,
      dot: TONE[event.tone].dot,
      title: event.eventLabel,
      meta: event.message,
      count: 1,
      ago: relativeTimeFrom(event.createdAt, now) || "—",
    });
  }
  return rows;
}

/** Selos de origem honestos (demo/fallback) — mantidos da tela anterior, no visual do padrão. */
function sourceChips(summary: DashboardSource, dispatches: string, locations: string): { text: string; bg: string; fg: string }[] {
  const chips: { text: string; bg: string; fg: string }[] = [];
  if (summary === "mock") chips.push({ text: "Painel: Dados demonstrativos", bg: "#EFF6FF", fg: "#2563EB" });
  if (dispatches === "mock") chips.push({ text: "Despachos: Dados demonstrativos", bg: "#EFF6FF", fg: "#2563EB" });
  if (dispatches === "fallback") chips.push({ text: "Despachos: Fallback local", bg: "#FFFBEB", fg: "#92400E" });
  if (locations === "mock") chips.push({ text: "Localizações: Dados demonstrativos", bg: "#EFF6FF", fg: "#2563EB" });
  if (locations === "fallback") chips.push({ text: "Localizações: Fallback local", bg: "#FFFBEB", fg: "#92400E" });
  return chips;
}

/** Marcos do eixo-x (~5 datas distribuídas na série real). */
function axisMarks(points: WorkOrderTimeseriesData["points"]): string[] {
  const total = points.length;
  if (total === 0) return [];
  const count = Math.min(5, total);
  const marks: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const pointIndex = count === 1 ? 0 : Math.round((index * (total - 1)) / (count - 1));
    marks.push(shortDate(points[pointIndex].date));
  }
  return marks;
}

// Gráfico "Volume de ordens de serviço" — barras EMPILHADAS por dia com a série REAL
// (abertas #2563EB embaixo, concluídas #22C55E, canceladas #E2E8F0 no topo — a série
// real TEM canceladas). Divs puras, sem lib nova (PD-004). Tooltip nativo via title.
function VolumeChartCard({ data, loading, canRead }: { data: WorkOrderTimeseriesData; loading: boolean; canRead: boolean }) {
  const points = data.points;
  const maxTotal = points.reduce((max, point) => Math.max(max, point.created + point.completed + point.cancelled), 0);
  const unit = maxTotal > 0 ? 100 / maxTotal : 0;

  return (
    <section className="pat-card">
      <div className="pat-dash-chart-head">
        <div>
          <h2 className="pat-card__title">Volume de ordens de serviço</h2>
          <div className="pat-card__subtitle">Últimos 30 dias · abertas, concluídas e canceladas</div>
        </div>
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
      </div>
      {!canRead || data.forbidden ? (
        <EmptyState title="Acesso não permitido" detail="Seu perfil não tem permissão para ver o volume de ordens de serviço." />
      ) : loading ? (
        <Skeleton lines={4} />
      ) : data.source === "fallback" ? (
        <Alert tone="warning" title="Não foi possível carregar o gráfico">
          Tentaremos novamente na próxima atualização.
        </Alert>
      ) : points.length === 0 || maxTotal === 0 ? (
        <div className="pat-dash-empty">Sem ordens no período.</div>
      ) : (
        <>
          <div className="pat-dash-bars" role="img" aria-label="Volume diário de ordens de serviço nos últimos 30 dias">
            {points.map((point) => (
              <div
                key={point.date}
                className="pat-dash-bars__day"
                title={`${shortDate(point.date)} · ${point.created} abertas · ${point.completed} concluídas · ${point.cancelled} canceladas`}
              >
                <div className="pat-dash-bars__canc" style={{ height: `${point.cancelled * unit}%` }} />
                <div className="pat-dash-bars__done" style={{ height: `${point.completed * unit}%` }} />
                <div className="pat-dash-bars__open" style={{ height: `${point.created * unit}%` }} />
              </div>
            ))}
          </div>
          <div className="pat-dash-axis" aria-hidden="true">
            {axisMarks(points).map((mark) => (
              <span key={mark}>{mark}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const canReadWorkOrders = can("work_orders:read");
  const data = useDashboardData();
  // Série diária carregada UMA vez no nível da página; sem work_orders:read o hook
  // não dispara fetch (gate por `enabled`) e o card degrada para acesso não permitido.
  const timeseries = useWorkOrderTimeseries(30, canReadWorkOrders);
  // Painel e série recarregam sozinhos em segundo plano (sem botão "Atualizar").
  useAutoRefresh(data.refresh, { enabled: Boolean(activeContext) });
  useAutoRefresh(timeseries.refresh, { enabled: Boolean(activeContext) && canReadWorkOrders });

  const now = new Date();
  const userName = (session?.user?.name ?? "").split(" ")[0] || "operação";
  const orgName = activeContext?.tenantName ?? "sua organização";

  // KPIs de decisão — SEMPRE as contagens reais de summaryToKpis (por id). Se um id
  // não veio no agregado, o card é omitido (nunca preenchido com número inventado).
  const kpiById = new Map(data.kpis.map((kpi) => [kpi.id, kpi]));
  const openKpi = kpiById.get("open");
  const inProgressKpi = kpiById.get("in_progress");
  const overdueKpi = kpiById.get("overdue");
  const createdTodayKpi = kpiById.get("created_today");
  const completedKpi = kpiById.get("completed");
  const overdueCount = toCount(overdueKpi?.value);

  const kpiCards = [
    openKpi && {
      key: "open",
      kpi: openKpi,
      icon: Wrench,
      iconColor: "#2563EB",
      iconBg: "#EFF6FF",
      tag: TAG_NEUTRAL, // "N sem técnico" não é derivável do agregado real → selo neutro
      border: undefined as string | undefined,
    },
    inProgressKpi && {
      key: "in_progress",
      kpi: inProgressKpi,
      icon: Send,
      iconColor: "#0369A1",
      iconBg: "#F0F9FF",
      tag: overdueCount === 0 ? TAG_OK : TAG_LATE, // derivado da contagem real de atrasadas
      border: undefined as string | undefined,
    },
    // Slot crítico do design ("SLA em risco") ocupado por Atrasadas — contagem real.
    overdueKpi && {
      key: "overdue",
      kpi: overdueKpi,
      icon: AlertTriangle,
      iconColor: overdueCount > 0 ? "#DC2626" : "#15803D",
      iconBg: overdueCount > 0 ? "#FEF2F2" : "#F0FDF4",
      tag: overdueCount > 0 ? TAG_ACT_NOW : TAG_UNDER_CONTROL,
      border: overdueCount > 0 ? "#FCA5A5" : undefined,
    },
    createdTodayKpi && {
      key: "created_today",
      kpi: createdTodayKpi,
      icon: Clock,
      iconColor: "#B45309",
      iconBg: "#FFFBEB",
      tag: TAG_TODAY,
      border: undefined as string | undefined,
    },
    completedKpi && {
      key: "completed",
      kpi: completedKpi,
      icon: CheckCircle2,
      iconColor: "#15803D",
      iconBg: "#F0FDF4",
      tag: TAG_DONE, // "+3 vs ontem" do design não tem base de comparação real → selo estático
      border: undefined as string | undefined,
    },
  ].filter((card): card is Exclude<typeof card, undefined | "" | 0 | false | null> => Boolean(card));

  // Faixa CADASTROS — pills só para contagens que o agregado real forneceu.
  const registryPills = (
    [
      ["customers", "clientes"],
      ["vehicles", "viaturas"],
      ["teams", "equipes"],
      ["services", "serviços"],
    ] as const
  )
    .map(([id, label]) => {
      const kpi = kpiById.get(id);
      return kpi ? { id, label, value: kpi.value } : null;
    })
    .filter((pill): pill is NonNullable<typeof pill> => pill !== null);

  const criticalRows = deriveCriticalRows(data.criticalWorkOrders, now, 4);
  const dispatchRows = deriveActiveDispatchRows(data.dispatches, 5);
  const fieldRows = deriveFieldStatusRows(data.locations, now, 5);
  const eventRows = groupRecentEvents(data.recentEvents, now);
  const chips = sourceChips(data.summarySource, data.dispatchesSource, data.locationsSource);
  const complementaryFallback = data.dispatchesSource === "fallback" || data.locationsSource === "fallback";
  const kpiSkeleton = data.loading && data.kpis.length === 0;

  return (
    <div style={{ color: "#0F172A" }}>
      <PageHeader
        kicker="VISÃO GERAL"
        title={`${greeting()}, ${userName}`}
        subtitle={`Operação, SLA e cadastros · ${orgName} · ${subtitleDate(now)}`}
        actions={
          <>
            {/* "Exportar" do protótipo OMITIDO — sem ação de exportação equivalente no dashboard real. */}
            <button type="button" className="pat-btn" onClick={() => navigate("/operations/map")}>
              <MapIcon size={15} aria-hidden="true" />
              Mapa operacional
            </button>
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
              <Plus size={15} aria-hidden="true" />
              Nova OS
            </button>
          </>
        }
      />

      {data.summaryError ? (
        <div role="alert" className="pat-banner pat-banner--error">
          <span>Não foi possível carregar os indicadores do painel agora.</span>
          <button type="button" className="pat-link" onClick={() => void data.refresh()}>
            Tentar novamente
          </button>
        </div>
      ) : null}
      {complementaryFallback ? (
        <div role="status" className="pat-banner pat-banner--warning">
          Alguns dados de campo estão indisponíveis agora. Exibindo o que foi possível carregar.
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <StatusPill key={chip.text} label={chip.text} bg={chip.bg} fg={chip.fg} />
          ))}
        </div>
      ) : null}

      <div className="pat-dash-kpis" aria-live="polite">
        {kpiSkeleton ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="pat-kpi" aria-hidden="true">
              <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
              <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
              <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
            </div>
          ))
        ) : kpiCards.length === 0 ? (
          <div className="pat-card pat-dash-empty" style={{ gridColumn: "1 / -1" }}>
            {data.summaryError ? "Indicadores indisponíveis no momento." : "Sem indicadores para exibir."}
          </div>
        ) : (
          kpiCards.map((card) => (
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
              onClick={() => navigate("/work-orders")}
              ariaLabel={`${card.kpi.label}: ${card.kpi.value} — ver ordens de serviço`}
            />
          ))
        )}
      </div>

      {registryPills.length > 0 ? (
        <div className="pat-dash-cads">
          <span className="pat-dash-cads__label">CADASTROS</span>
          {registryPills.map((pill) => (
            <span key={pill.id} className="pat-dash-cads__pill">
              <span className="pat-dash-cads__n">{pill.value}</span>
              <span className="pat-dash-cads__name">{pill.label}</span>
            </span>
          ))}
          <span className="pat-dash-cads__spacer" />
          <button type="button" className="pat-link" onClick={() => navigate("/cadastros/clientes")}>
            Gerenciar cadastros
          </button>
        </div>
      ) : null}

      <div className="pat-dash-charts">
        <VolumeChartCard data={timeseries.data} loading={timeseries.loading} canRead={canReadWorkOrders} />

        <section className="pat-card">
          <div className="pat-card__head">
            <h2 className="pat-card__title">Exige ação agora</h2>
            <button type="button" className="pat-link" onClick={() => navigate("/work-orders")}>
              Ver todas
            </button>
          </div>
          <div className="pat-card__subtitle pat-card__subtitle--gap">Fila crítica por prioridade e agenda</div>
          {criticalRows.length === 0 ? (
            <div className="pat-dash-empty">
              {data.loading ? "Carregando…" : data.summaryError ? "Não foi possível carregar a fila crítica." : "Nenhuma OS crítica no momento."}
            </div>
          ) : (
            criticalRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="pat-dash-critical"
                onClick={() => navigate(`/work-orders/${row.id}`)}
                aria-label={`Abrir OS ${row.code} · ${row.main}`}
              >
                <span className="pat-dash-sla">
                  <span className="pat-dash-sla__value pat-mono" style={{ color: row.countdownColor }}>
                    {row.countdown}
                  </span>
                  <span className="pat-dash-sla__cap">AGENDA</span>
                </span>
                <span className="pat-dash-item">
                  <span className="pat-dash-item__row">
                    <span className="pat-dash-code pat-mono">{row.code}</span>
                    <span className="pat-dash-item__title pat-dash-item__title--lg">{row.main}</span>
                  </span>
                  <span className="pat-dash-item__meta">{row.sub}</span>
                </span>
                <StatusPill label={row.statusLabel} bg={TONE[row.tone].bg} fg={TONE[row.tone].fg} />
              </button>
            ))
          )}
        </section>
      </div>

      <div className="pat-dash-duo">
        <section className="pat-card">
          <div className="pat-card__head">
            <h2 className="pat-card__title">Despachos ativos</h2>
            <button type="button" className="pat-link" onClick={() => navigate("/operations/dispatches")}>
              Ver despachos
            </button>
          </div>
          <div className="pat-card__subtitle pat-card__subtitle--gap">Do envio ao atendimento</div>
          {dispatchRows.length === 0 ? (
            <div className="pat-dash-empty">{data.loading ? "Carregando…" : "Nenhum despacho ativo no momento."}</div>
          ) : (
            dispatchRows.map((row) => (
              <div key={row.id} className="pat-dash-row">
                <span className="pat-dash-dot" style={{ background: TONE[row.tone].dot }} aria-hidden="true" />
                <div className="pat-dash-item">
                  <div className="pat-dash-item__code pat-mono">{row.title}</div>
                  <div className="pat-dash-item__meta">{row.subtitle}</div>
                </div>
                <div className="pat-dash-right">
                  <div className="pat-dash-right__status" style={{ color: TONE[row.tone].fg }}>
                    {row.statusLabel}
                  </div>
                  <div className="pat-dash-right__ago">{relativeTimeFrom(row.when, now) || "—"}</div>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="pat-card">
          <div className="pat-card__head">
            <h2 className="pat-card__title">Status de campo</h2>
            <button type="button" className="pat-link" onClick={() => navigate("/operations/map")}>
              Abrir mapa
            </button>
          </div>
          <div className="pat-card__subtitle pat-card__subtitle--gap">Última localização recebida de cada operador</div>
          {fieldRows.length === 0 ? (
            <div className="pat-dash-empty">{data.loading ? "Carregando…" : "Nenhum operador com localização recente."}</div>
          ) : (
            fieldRows.map((row) => (
              <div key={row.id} className="pat-dash-row">
                <InitialsAvatar name={row.name} bg={TONE[row.tone].bg} fg={TONE[row.tone].fg} />
                <div className="pat-dash-item">
                  <div className="pat-dash-item__title">{row.name}</div>
                  <div className="pat-dash-item__meta">{row.detail}</div>
                </div>
                <StatusPill label={row.stateLabel} bg={TONE[row.tone].bg} fg={TONE[row.tone].fg} />
              </div>
            ))
          )}
        </section>
      </div>

      <section className="pat-card">
        <div className="pat-card__head">
          <div>
            <h2 className="pat-card__title">Últimos eventos</h2>
            <div className="pat-card__subtitle">Atividade recente das ordens de serviço</div>
          </div>
          <button type="button" className="pat-link" onClick={() => navigate("/work-orders")}>
            Ver tudo
          </button>
        </div>
        {eventRows.length === 0 ? (
          <div className="pat-dash-empty">
            {data.loading ? "Carregando…" : data.summaryError ? "Não foi possível carregar os eventos recentes." : "Sem atividade recente."}
          </div>
        ) : (
          eventRows.map((row) => (
            <div key={row.id} className="pat-dash-row">
              <span className="pat-dash-dot" style={{ background: row.dot }} aria-hidden="true" />
              <div className="pat-dash-item">
                <div className="pat-dash-item__title">{row.title}</div>
                <div className="pat-dash-item__meta">{row.meta}</div>
              </div>
              {row.count > 1 ? <span className="pat-dash-count">{row.count} eventos</span> : null}
              <span className="pat-dash-ago">{row.ago}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
