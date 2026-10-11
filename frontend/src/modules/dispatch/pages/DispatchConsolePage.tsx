import { AlertTriangle, ClipboardList, MapPin, Send, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import { CH } from "../../../components/TablePage";
import { InitialsAvatar, KpiStatCard, PageHeader, StatusPill, type KpiStatTag } from "../../../components/patterns";
import { usePermissions } from "../../../providers/PermissionProvider";
import type { DashboardSummaryModel } from "../../dashboard/dashboard.adapter";
import type { IncomingCallSlaTone } from "../../operations/map/operations-map.adapter";
import type { FieldLocationItem } from "../../operations/map/operations-map.types";
import { formatClockTime, StaleDataBanner } from "../../work-orders/components/StaleDataBanner";
import { StatePanel, StatePanelAction } from "../../work-orders/components/StatePanel";
import { WORK_ORDER_PRIORITY_LABEL, WORK_ORDER_STATUS_LABEL } from "../../work-orders/work-orders-row.logic";
import type { WorkOrderPriority, WorkOrderStatus } from "../../work-orders/work-orders.types";
import {
  availableTechnicians,
  buildConsoleQueue,
  buildConsoleTechnicians,
  buildSlaAlert,
  buildStaleTechnicianAlert,
  summaryCounts,
  type ConsoleBlockState,
  type ConsoleQueueRow,
  type ConsoleTechnicianRow,
} from "../dispatch-console.logic";
import { DISPATCH_CONSOLE_SOURCE_PERMISSION, type ConsoleWorkOrders } from "../dispatch-console.service";
import type { FieldOperatorStatusTone } from "../field-operators.types";
import { useDispatchConsole } from "../useDispatchConsole";

// "Console Dispatcher" (sc_dispatchConsole) — B-SAN3-06a (D-TELAS-SAN3-06a): LIGADO aos dados reais. Composição da
// referência `screen-refs/web/console-tempo-real.png` (cabeçalho · 4 KPIs · faixa de alertas · fila + técnicos);
// componentes e estados da TELA-MODELO `modules/work-orders/pages/WorkOrdersPage.tsx` (rota /work-orders): PageHeader,
// KpiStatCard, StatusPill, StatePanel, StaleDataBanner, pat-skel; técnicos pela projeção de
// `modules/dispatch/pages/FieldOperatorsPage.tsx` (rota /field-operators). Nenhum número, nome ou código literal (D-007).
// Degradações honestas, declaradas:
//  · O slot "SLA crítico" dos KPIs vira "Atrasadas": o resumo não tem prazo de SLA (precedente do PR-A, WorkOrdersPage).
//    O ALERTA "SLA crítico" existe, mas só com o prazo REAL (`slaDueAt`) da fila.
//  · "Reforço solicitado" saiu: não há endpoint. "Filtrar", "Prioridade", "Atribuir OS", "Ver rota" e "Alocar reforço"
//    saíram (não havia ação); "Novo despacho", "Despachar" e "Atribuir agora" levam à tela real de Despachos.
//  · Cada bloco tem os cinco estados do §7 (carregando · vazio · erro · acesso não permitido · desatualizado), marcados
//    por `data-state` no elemento do bloco — é por ele que os testes afirmam o estado.

const QUEUE_VISIBLE = 8;
const TECHNICIANS_VISIBLE = 8;

// Tons de situação e prioridade: os da tela-modelo (WorkOrdersPage, STATUS_TONE/PRIORITY_TONE); rótulos da fonte única.
const STATUS_TONE: Record<WorkOrderStatus, { bg: string; fg: string }> = {
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

const PRIORITY_TONE: Record<WorkOrderPriority, { dot: string; fg: string }> = {
  low: { dot: "#94A3B8", fg: "#64748B" },
  medium: { dot: "#F59E0B", fg: "#B45309" },
  high: { dot: "#DC2626", fg: "#B91C1C" },
  urgent: { dot: "#DC2626", fg: "#B91C1C" },
};

// Cor do prazo pelo tom do Mapa (`incomingCallSlaTone`): vencido · vence em breve · futuro · sem prazo real.
const SLA_COLOR: Record<IncomingCallSlaTone, string> = {
  danger: "#DC2626",
  warning: "#B45309",
  info: "#2563EB",
  neutral: "#64748B",
};

// Chip do técnico → paleta do TablePage (o mesmo mapeamento da tela Operadores de Campo).
const TECH_TONE: Record<FieldOperatorStatusTone, { bg: string; color: string }> = {
  success: CH.ok,
  info: CH.info,
  warning: CH.warn,
  danger: CH.err,
  pending: CH.purple,
  default: CH.gray,
};

const TAG_FORBIDDEN: KpiStatTag = { label: "sem acesso", bg: "#F1F5F9", fg: "#475569" };
const TAG_ERROR: KpiStatTag = { label: "indisponível", bg: "#FEE2E2", fg: "#B91C1C" };
const TAG_EMPTY: KpiStatTag = { label: "sem registros", bg: "#F1F5F9", fg: "#475569" };
const TAG_STALE: KpiStatTag = { label: "desatualizado", bg: "#FEF3C7", fg: "#B45309" };
const TAG_ACT_NOW: KpiStatTag = { label: "agir agora", bg: "#FEE2E2", fg: "#B91C1C" };
const TAG_UNDER_CONTROL: KpiStatTag = { label: "sob controle", bg: "#DCFCE7", fg: "#15803D" };
const NEUTRAL = { iconColor: "#94A3B8", iconBg: "#F1F5F9" };

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", minWidth: 0 };
const cardHead: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 18px", borderBottom: "1px solid #F1F5F9" };
const cardTitle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 800 };
const cardSubtitle: CSSProperties = { fontSize: 11.5, color: "#94A3B8", marginTop: 2 };
const colLabel: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };
const smallBtn: CSSProperties = { padding: "5px 10px", fontSize: 11.5, borderRadius: 7 };
const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

/** Estado exibido do bloco: "desatualizado" é uma marca sobre o dado, não um status da fonte. */
function blockState<T>(block: ConsoleBlockState<T>): string {
  return block.stale ? "stale" : block.status;
}

/** "· atualizado às HH:MM" — a hora da última leitura bem-sucedida da fonte (nunca um relógio inventado). */
function updatedSuffix<T>(block: ConsoleBlockState<T>): string {
  const at = formatClockTime(block.lastUpdatedAt);
  return at ? ` · atualizado às ${at}` : "";
}

export type DispatchConsoleViewProps = {
  readonly tenantName: string | null;
  readonly summary: ConsoleBlockState<DashboardSummaryModel>;
  readonly workOrders: ConsoleBlockState<ConsoleWorkOrders>;
  readonly locations: ConsoleBlockState<readonly FieldLocationItem[]>;
  readonly now: Date;
  readonly can: (permission: string) => boolean;
  readonly onRetry: () => void;
  readonly onNavigate: (to: string) => void;
};

export function DispatchConsolePage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { summary, workOrders, locations, tenantName, refresh } = useDispatchConsole();
  return (
    <DispatchConsoleView
      tenantName={tenantName}
      summary={summary}
      workOrders={workOrders}
      locations={locations}
      now={new Date()}
      can={can}
      onRetry={() => void refresh()}
      onNavigate={(to) => navigate(to)}
    />
  );
}

export function DispatchConsoleView({ tenantName, summary, workOrders, locations, now, can, onRetry, onNavigate }: DispatchConsoleViewProps) {
  // Backend continua a autoridade (RBAC_MATRIX field_dispatch:*); aqui só se molda a UX: o que o papel não pode, some.
  const canDispatch = can("field_dispatch:create");
  const canMap = can(DISPATCH_CONSOLE_SOURCE_PERMISSION.locations);
  const toDispatches = (workOrderId?: string) =>
    onNavigate(workOrderId ? `/operations/dispatches?workOrderId=${encodeURIComponent(workOrderId)}` : "/operations/dispatches");
  const toWorkOrder = (workOrderId: string) => onNavigate(`/work-orders/${encodeURIComponent(workOrderId)}`);

  const subtitle = `triagem, despacho e reagendamento em tempo real${tenantName ? ` · ${tenantName}` : ""}`;
  const actions =
    canMap || canDispatch ? (
      <>
        {canMap ? (
          <button type="button" className="pat-btn" onClick={() => onNavigate("/operations/map")}>
            <MapPin size={15} aria-hidden="true" />
            Ver mapa
          </button>
        ) : null}
        {canDispatch ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => toDispatches()}>
            <Send size={15} aria-hidden="true" />
            Novo despacho
          </button>
        ) : null}
      </>
    ) : undefined;

  const queue = workOrders.data ? buildConsoleQueue(workOrders.data, locations.data ?? [], now) : [];
  const slaAlert = workOrders.data ? buildSlaAlert(workOrders.data, now) : null;
  const staleAlert = locations.data ? buildStaleTechnicianAlert(locations.data, now) : null;
  const technicians = locations.data ? buildConsoleTechnicians(locations.data, now) : [];

  return (
    <div style={{ color: "#0F172A" }}>
      <PageHeader kicker="OPERAÇÃO" title="Console Dispatcher" subtitle={subtitle} actions={actions} />

      <ConsoleKpis summary={summary} locations={locations} onRetry={onRetry} />

      {slaAlert || staleAlert ? (
        <section aria-label="Alertas da operação" style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          {slaAlert ? (
            <ConsoleAlert
              kind="sla"
              tone={{ dot: "#DC2626", fg: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" }}
              tag="SLA crítico"
              text={`${slaAlert.code}${slaAlert.customerName ? ` · ${slaAlert.customerName}` : ""} — ${slaAlert.dueLabel}${slaAlert.assigned ? "" : " sem técnico atribuído"}${slaAlert.more > 0 ? ` · mais ${slaAlert.more}` : ""}`}
              action={
                !slaAlert.assigned && canDispatch
                  ? { label: "Atribuir agora", onClick: () => toDispatches(slaAlert.workOrderId) }
                  : { label: "Abrir OS", onClick: () => toWorkOrder(slaAlert.workOrderId) }
              }
            />
          ) : null}
          {staleAlert ? (
            <ConsoleAlert
              kind="stale-technician"
              tone={{ dot: "#D97706", fg: "#B45309", bg: "#FFFBEB", border: "#FDE68A" }}
              tag="Técnico parado"
              text={`${staleAlert.technicianName} — localização não atualizada ${staleAlert.lastSeen}${staleAlert.more > 0 ? ` · mais ${staleAlert.more}` : ""}`}
              action={canMap ? { label: "Verificar", onClick: () => onNavigate("/operations/map") } : undefined}
            />
          ) : null}
        </section>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 14, alignItems: "start" }}>
        <section aria-label="Fila de despacho" data-block="queue" data-state={blockState(workOrders)} style={card}>
          <div style={cardHead}>
            <div>
              <h2 style={cardTitle}>Fila de Despacho</h2>
              <div style={cardSubtitle}>priorize por prioridade e prazo{updatedSuffix(workOrders)}</div>
            </div>
          </div>
          {workOrders.stale ? (
            <div style={{ padding: "12px 18px 0" }}>
              <StaleDataBanner lastUpdatedAt={workOrders.lastUpdatedAt} onRetry={onRetry} />
            </div>
          ) : null}
          <QueueBody
            block={workOrders}
            rows={queue}
            canDispatch={canDispatch}
            onRetry={onRetry}
            onOpen={toWorkOrder}
            onDispatch={(id) => toDispatches(id)}
            onAll={() => onNavigate("/work-orders")}
          />
        </section>

        <section aria-label="Técnicos" data-block="technicians" data-state={blockState(locations)} style={{ ...card, display: "flex", flexDirection: "column" }}>
          <div style={cardHead}>
            <div>
              <h2 style={cardTitle}>Técnicos</h2>
              <div style={cardSubtitle}>posição e disponibilidade{updatedSuffix(locations)}</div>
            </div>
            {canMap ? (
              <button type="button" className="pat-link" onClick={() => onNavigate("/operations/map")}>
                Ver mapa
              </button>
            ) : null}
          </div>
          {locations.stale ? (
            <div style={{ padding: "12px 16px 0" }}>
              <StaleDataBanner lastUpdatedAt={locations.lastUpdatedAt} onRetry={onRetry} />
            </div>
          ) : null}
          <TechniciansBody block={locations} rows={technicians} onRetry={onRetry} onAll={() => onNavigate("/field-operators")} />
          <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button type="button" className="pat-btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => toDispatches()}>
              Ver fila completa de despacho
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ———————————————————————————————— KPIs ————————————————————————————————

type KpiSpec = {
  readonly key: string;
  readonly icon: typeof ClipboardList;
  readonly label: string;
  readonly hint: string;
  readonly tone: { readonly iconColor: string; readonly iconBg: string };
  readonly value: number | null;
  readonly tag?: KpiStatTag;
  readonly border?: string;
};

function kpiCard<T>(block: ConsoleBlockState<T>, spec: KpiSpec) {
  if (block.status === "loading") {
    return (
      <div key={spec.key} data-block={spec.key} data-state="loading" className="pat-kpi" aria-hidden="true">
        <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
        <div className="pat-skel" style={{ width: 54, height: 24, marginTop: 12 }} />
        <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
      </div>
    );
  }
  // Erro e "sem acesso" nunca viram número (§4.3-2 da tela-modelo): "—" com tile neutro e selo que diz o porquê.
  const failed = block.status === "error" || block.status === "forbidden" || spec.value === null;
  const tag =
    block.status === "forbidden"
      ? TAG_FORBIDDEN
      : failed
        ? TAG_ERROR
        : block.stale
          ? TAG_STALE
          : block.status === "empty"
            ? TAG_EMPTY
            : spec.tag;
  return (
    <div key={spec.key} data-block={spec.key} data-state={blockState(block)}>
      <KpiStatCard
        icon={spec.icon}
        {...(failed ? NEUTRAL : spec.tone)}
        value={failed || spec.value === null ? "—" : spec.value}
        label={spec.label}
        hint={spec.hint}
        tag={tag}
        border={failed ? undefined : spec.border}
      />
    </div>
  );
}

function ConsoleKpis({
  summary,
  locations,
  onRetry,
}: {
  readonly summary: ConsoleBlockState<DashboardSummaryModel>;
  readonly locations: ConsoleBlockState<readonly FieldLocationItem[]>;
  readonly onRetry: () => void;
}) {
  const counts = summary.data ? summaryCounts(summary.data) : null;
  const available = locations.data ? availableTechnicians(locations.data) : null;
  const overdue = counts?.overdue ?? 0;
  return (
    <>
      {summary.stale ? <StaleDataBanner lastUpdatedAt={summary.lastUpdatedAt} onRetry={onRetry} /> : null}
      {summary.status === "error" ? (
        <div role="alert" className="pat-banner pat-banner--error">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{summary.error ?? "Não foi possível consultar o resumo da operação."}</span>
          <button type="button" className="pat-link" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 14 }} aria-live="polite">
        {kpiCard(summary, {
          key: "kpi-queued",
          icon: ClipboardList,
          label: "Na fila",
          hint: "OS aguardando início",
          tone: { iconColor: "#2563EB", iconBg: "#EFF6FF" },
          value: counts?.queued ?? null,
        })}
        {/* Slot "SLA crítico" do design: o resumo não tem prazo de SLA → "Atrasadas" (precedente do PR-A). */}
        {kpiCard(summary, {
          key: "kpi-overdue",
          icon: AlertTriangle,
          label: "Atrasadas",
          hint: "agenda vencida e sem conclusão",
          tone: overdue > 0 ? { iconColor: "#DC2626", iconBg: "#FEF2F2" } : { iconColor: "#15803D", iconBg: "#F0FDF4" },
          value: counts?.overdue ?? null,
          tag: overdue > 0 ? TAG_ACT_NOW : TAG_UNDER_CONTROL,
          border: overdue > 0 ? "#FCA5A5" : undefined,
        })}
        {kpiCard(summary, {
          key: "kpi-in-field",
          icon: Send,
          label: "Em atendimento",
          hint: "OS com técnico em campo",
          tone: { iconColor: "#D97706", iconBg: "#FFFBEB" },
          value: counts?.inField ?? null,
        })}
        {kpiCard(locations, {
          key: "kpi-available",
          icon: UserRound,
          label: "Disponíveis",
          hint: "técnicos com posição recebida",
          tone: { iconColor: "#059669", iconBg: "#ECFDF5" },
          value: available,
        })}
      </div>
    </>
  );
}

// ———————————————————————————————— Alertas ————————————————————————————————

function ConsoleAlert({
  kind,
  tone,
  tag,
  text,
  action,
}: {
  readonly kind: string;
  readonly tone: { readonly dot: string; readonly fg: string; readonly bg: string; readonly border: string };
  readonly tag: string;
  readonly text: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}) {
  return (
    <div
      data-alert={kind}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: tone.bg, border: `1px solid ${tone.border}`, flex: 1, minWidth: 260 }}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: tone.dot, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
        <span style={{ fontWeight: 700, color: tone.fg }}>{tag}</span>
        <span style={{ color: "#475569", marginLeft: 6 }}>{text}</span>
      </div>
      {action ? (
        <button type="button" className="pat-btn" style={{ ...smallBtn, color: tone.fg, borderColor: tone.border, whiteSpace: "nowrap" }} onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

// ———————————————————————————————— Blocos de lista ————————————————————————————————

function BlockFailure({
  status,
  forbiddenTitle,
  forbiddenDetail,
  errorTitle,
  message,
  onRetry,
}: {
  readonly status: "error" | "forbidden";
  readonly forbiddenTitle: string;
  readonly forbiddenDetail: string;
  readonly errorTitle: string;
  readonly message: string | null;
  readonly onRetry: () => void;
}) {
  if (status === "forbidden") return <StatePanel tone="forbidden" embedded title={forbiddenTitle} detail={forbiddenDetail} />;
  return (
    <StatePanel
      tone="error"
      embedded
      title={errorTitle}
      detail={message ?? "Tente novamente em instantes."}
      actions={<StatePanelAction label="Tentar novamente" onClick={onRetry} />}
    />
  );
}

function SkeletonRows({ count }: { readonly count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ display: "flex", gap: 10, padding: "14px 18px", borderBottom: "1px solid #F8FAFC" }} aria-hidden="true">
          <div className="pat-skel" style={{ height: 12, flex: 1.2 }} />
          <div className="pat-skel" style={{ height: 12, flex: 1.4 }} />
          <div className="pat-skel" style={{ height: 12, flex: 0.7 }} />
          <div className="pat-skel" style={{ height: 12, flex: 1 }} />
        </div>
      ))}
    </>
  );
}

function QueueBody({
  block,
  rows,
  canDispatch,
  onRetry,
  onOpen,
  onDispatch,
  onAll,
}: {
  readonly block: ConsoleBlockState<ConsoleWorkOrders>;
  readonly rows: readonly ConsoleQueueRow[];
  readonly canDispatch: boolean;
  readonly onRetry: () => void;
  readonly onOpen: (id: string) => void;
  readonly onDispatch: (id: string) => void;
  readonly onAll: () => void;
}) {
  if (block.status === "loading") return <SkeletonRows count={4} />;
  if (block.status === "error" || block.status === "forbidden") {
    return (
      <BlockFailure
        status={block.status}
        forbiddenTitle="Sem permissão para ver as ordens de serviço"
        forbiddenDetail="Seu perfil não inclui as ordens de serviço nesta organização. Solicite acesso ao administrador da organização."
        errorTitle="Não foi possível carregar a fila"
        message={block.error}
        onRetry={onRetry}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <StatePanel
        tone="empty"
        embedded
        title="Nenhuma OS na fila"
        detail="Não há ordem de serviço em aberto nesta organização. As novas aparecem aqui assim que forem criadas."
      />
    );
  }

  const total = block.data?.total ?? rows.length;
  const loaded = block.data?.items.length ?? rows.length;
  const visible = rows.slice(0, QUEUE_VISIBLE);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }} aria-hidden="true">
        <span style={{ ...colLabel, flex: 1.3 }}>OS · CLIENTE</span>
        <span style={{ ...colLabel, flex: 1.3 }}>SERVIÇO</span>
        <span style={{ ...colLabel, flex: 0.7 }}>PRIOR.</span>
        <span style={{ ...colLabel, flex: 1 }}>PRAZO</span>
        <span style={{ ...colLabel, flex: 1 }}>TÉCNICO</span>
        <span style={{ ...colLabel, flex: 0.9, textAlign: "right" }}>SITUAÇÃO</span>
        <span style={{ ...colLabel, flex: 0.8, textAlign: "right" }}>AÇÃO</span>
      </div>
      {visible.map((row) => {
        const pr = PRIORITY_TONE[row.priority];
        const st = STATUS_TONE[row.status];
        return (
          <div
            key={row.id}
            data-row="queue"
            onClick={() => onOpen(row.id)}
            style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderBottom: "1px solid #F8FAFC", gap: 10, cursor: "pointer" }}
          >
            <div style={{ flex: 1.3, minWidth: 0 }}>
              <button
                type="button"
                className="pat-link pat-mono"
                style={{ fontSize: 12.5 }}
                aria-label={`Abrir OS ${row.code}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(row.id);
                }}
              >
                {row.code}
              </button>
              <div style={{ fontSize: 11.5, color: "#64748B", ...ellipsis }}>{row.customerName ?? "Sem cliente vinculado"}</div>
            </div>
            <span style={{ flex: 1.3, minWidth: 0, fontSize: 12.5, color: "#475569", ...ellipsis }}>{row.service}</span>
            <span style={{ flex: 0.7, display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: pr.fg }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pr.dot, flexShrink: 0 }} aria-hidden="true" />
              {WORK_ORDER_PRIORITY_LABEL[row.priority]}
            </span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: SLA_COLOR[row.slaTone], fontVariantNumeric: "tabular-nums" }}>{row.slaLabel}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: row.assigned ? "#334155" : "#64748B", ...ellipsis }}>
              {row.technicianName ?? (row.assigned ? "Atribuído" : "Sem técnico")}
            </span>
            <div style={{ flex: 0.9, display: "flex", justifyContent: "flex-end" }}>
              <StatusPill label={WORK_ORDER_STATUS_LABEL[row.status]} bg={st.bg} fg={st.fg} />
            </div>
            <div style={{ flex: 0.8, display: "flex", justifyContent: "flex-end" }}>
              {!row.assigned && canDispatch ? (
                <button
                  type="button"
                  className="pat-btn pat-btn--primary"
                  style={smallBtn}
                  aria-label={`Despachar a OS ${row.code}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDispatch(row.id);
                  }}
                >
                  Despachar
                </button>
              ) : (
                <span style={{ fontSize: 12, color: "#CBD5E1" }} aria-hidden="true">
                  —
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 18px", fontSize: 11.5, color: "#64748B", flexWrap: "wrap" }}>
        <span>
          {`Mostrando ${visible.length} de ${rows.length} OS em aberto`}
          {total > loaded ? ` · o servidor tem ${total} OS e o console lê as ${loaded} mais recentes` : ""}
        </span>
        <button type="button" className="pat-link" onClick={onAll}>
          Ver todas as OS
        </button>
      </div>
    </>
  );
}

function TechniciansBody({
  block,
  rows,
  onRetry,
  onAll,
}: {
  readonly block: ConsoleBlockState<readonly FieldLocationItem[]>;
  readonly rows: readonly ConsoleTechnicianRow[];
  readonly onRetry: () => void;
  readonly onAll: () => void;
}) {
  if (block.status === "loading") return <SkeletonRows count={3} />;
  if (block.status === "error" || block.status === "forbidden") {
    return (
      <BlockFailure
        status={block.status}
        forbiddenTitle="Sem permissão para ver a equipe em campo"
        forbiddenDetail="Seu perfil não inclui a localização da equipe nesta organização. Solicite acesso ao administrador da organização."
        errorTitle="Não foi possível carregar os técnicos"
        message={block.error}
        onRetry={onRetry}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <StatePanel
        tone="empty"
        embedded
        title="Sem técnicos em campo"
        detail="Ainda não há técnico com posição registrada nesta organização. Eles aparecem aqui assim que o app de campo enviar a localização."
      />
    );
  }

  const visible = rows.slice(0, TECHNICIANS_VISIBLE);
  return (
    <>
      {visible.map((tech) => {
        const chip = TECH_TONE[tech.statusTone];
        return (
          <div key={tech.id} data-row="technician" data-stale={tech.stale ? "true" : "false"} style={{ padding: "11px 16px", borderBottom: "1px solid #F8FAFC" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <InitialsAvatar name={tech.name} size={32} bg={chip.bg} fg={chip.color} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, ...ellipsis }}>{tech.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{tech.team}</div>
              </div>
              <StatusPill label={tech.statusLabel} bg={chip.bg} fg={chip.color} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, paddingLeft: 42, fontSize: 11.5, color: "#64748B" }}>
              <ClipboardList size={12} style={{ color: "#94A3B8" }} aria-hidden="true" />
              <span style={{ fontWeight: 600, color: tech.currentOs === "—" ? "#64748B" : "#2563EB" }}>{tech.currentOs === "—" ? "Sem OS" : tech.currentOs}</span>
              <span aria-hidden="true">·</span>
              <span>posição {tech.lastSeen}</span>
            </div>
          </div>
        );
      })}
      {rows.length > visible.length ? (
        <div style={{ padding: "10px 16px" }}>
          <button type="button" className="pat-link" onClick={onAll}>
            {`Ver todos os ${rows.length} técnicos`}
          </button>
        </div>
      ) : null}
    </>
  );
}

export default DispatchConsolePage;
