import { AlertTriangle, Bell, CheckCircle2, Clock, ListChecks, MapPin, Plus, Send } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  deriveActiveDispatchRows,
  deriveFieldStatusRows,
  relativeTimeFrom,
  type DashboardTone,
} from "../modules/dashboard/dashboard.adapter";
import { TrendChart } from "../components/charts";
import { Alert, EmptyState, Skeleton } from "../components/ui";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useDashboardData } from "../modules/dashboard/useDashboardData";
import { useWorkOrderTimeseries } from "../modules/dashboard/useWorkOrderTimeseries";
import type { DashboardSource } from "../modules/dashboard/repository";
import type { OperationalAlert, OperationalKpi } from "../modules/dashboard/types";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

// Dashboard Operacional (gestor) — C3: KPIs, OS críticas, eventos e alertas vêm
// do agregado real GET /api/v1/dashboard/summary (contagens por tenant, sem
// derivação no cliente e sem números fabricados). Painéis de Despachos ativos e
// Status de campo seguem das suas próprias fontes reais. Mock atrás de
// VITE_USE_MOCKS; erro no caminho real → estado de erro/vazio (D-007).

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

const TONE_COLOR: Record<DashboardTone, { color: string; bg: string }> = {
  info: { color: "#2563EB", bg: "#EFF6FF" },
  success: { color: "#059669", bg: "#ECFDF5" },
  warning: { color: "#D97706", bg: "#FFFBEB" },
  danger: { color: "#DC2626", bg: "#FEF2F2" },
  accent: { color: "#7C3AED", bg: "#F5F3FF" },
  neutral: { color: "#64748B", bg: "#F1F5F9" },
};

const KPI_TONE: Record<OperationalKpi["tone"], { color: string; bg: string }> = {
  default: { color: "#64748B", bg: "#F1F5F9" },
  info: { color: "#2563EB", bg: "#EFF6FF" },
  success: { color: "#059669", bg: "#ECFDF5" },
  warning: { color: "#D97706", bg: "#FFFBEB" },
  danger: { color: "#DC2626", bg: "#FEF2F2" },
};

const ALERT_SEVERITY: Record<OperationalAlert["severity"], { color: string; bg: string; icon: ReactNode }> = {
  danger: { color: "#DC2626", bg: "#FEF2F2", icon: <AlertTriangle size={15} /> },
  warning: { color: "#D97706", bg: "#FFFBEB", icon: <Clock size={15} /> },
  info: { color: "#2563EB", bg: "#EFF6FF", icon: <CheckCircle2 size={15} /> },
};

function sourceChip(label: string, source: "api" | "mock" | "fallback"): { text: string; bg: string; color: string } | null {
  if (source === "mock") return { text: `${label}: Dados demonstrativos`, bg: "#EFF6FF", color: "#2563EB" };
  if (source === "fallback") return { text: `${label}: Fallback local`, bg: "#FFFBEB", color: "#92400E" };
  return null;
}

function summaryChip(source: DashboardSource): { text: string; bg: string; color: string } | null {
  if (source === "mock") return { text: "Painel: Dados demonstrativos", bg: "#EFF6FF", color: "#2563EB" };
  return null;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Descrição da OS crítica sem duplicar o título e sem expor UUID. */
function criticalDescription(
  item: { priorityLabel: string; title: string; customerName: string | null; scheduledFor: string | null },
  now: Date,
): string {
  const parts = [`Prioridade ${item.priorityLabel}`];
  if (item.customerName) parts.push(item.title);
  if (item.scheduledFor) {
    const when = relativeTimeFrom(item.scheduledFor, now);
    if (when) parts.push(`agendada ${when}`);
  }
  return parts.join(" · ");
}

// Formata o dia civil YYYY-MM-DD (America/Sao_Paulo, já resolvido pelo backend) como "dd/mm" SEM
// `new Date(date)` — o parse ingênuo o interpretaria como UTC 00:00 e poderia recuar um dia no fuso local.
function formatDiaMes(date: string): string {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [, month, day] = parts;
  return `${day}/${month}`;
}

// WS-CARDS-CHARTS-F2 — card do gráfico temporal de volume de OS. Só é montado quando o papel tem
// `work_orders:read` (o pai gateia), então o hook/fetch nunca dispara para quem não pode ver. Auto-refresh
// em segundo plano (sem botão "Atualizar"). D-007: só plota `points` do backend; vazio → emptyLabel honesto.
function WorkOrderVolumeCard() {
  const { activeContext } = useTenantContext();
  const { data, loading, refresh } = useWorkOrderTimeseries();
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const points = data.points;

  return (
    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Volume de ordens de serviço</div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Últimos 30 dias</div>
      </div>
      {loading ? (
        <Skeleton lines={4} />
      ) : data.forbidden ? (
        <EmptyState title="Acesso não permitido" detail="Seu perfil não tem permissão para ver o volume de ordens de serviço." />
      ) : data.source === "fallback" ? (
        <Alert tone="warning" title="Não foi possível carregar o gráfico">
          Tentaremos novamente na próxima atualização.
        </Alert>
      ) : (
        <TrendChart
          type="area"
          height={160}
          showLegend
          series={[
            { id: "created", label: "Abertas", tone: "info", values: points.map((p) => p.created) },
            { id: "completed", label: "Concluídas", tone: "success", values: points.map((p) => p.completed) },
            { id: "cancelled", label: "Canceladas", tone: "danger", values: points.map((p) => p.cancelled) },
          ]}
          labels={points.map((p) => formatDiaMes(p.date))}
          valueFormat={(n) => String(Math.round(n))}
          emptyLabel="Sem ordens no período."
          ariaLabel="Volume diário de ordens de serviço nos últimos 30 dias"
        />
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const data = useDashboardData();
  // WS-UI-REFRESH — o painel recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(data.refresh, { enabled: Boolean(activeContext) });

  const now = new Date();
  const dispatchRows = useMemo(() => deriveActiveDispatchRows(data.dispatches, 5), [data.dispatches]);
  const fieldRows = useMemo(() => deriveFieldStatusRows(data.locations, now, 5), [data.locations, now]);

  const chips = [
    summaryChip(data.summarySource),
    sourceChip("Despachos", data.dispatchesSource),
    sourceChip("Localizações", data.locationsSource),
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);

  const complementaryFallback = data.dispatchesSource === "fallback" || data.locationsSource === "fallback";

  const quick: { label: string; icon: ReactNode; to: string; primary?: boolean }[] = [
    { label: "Nova OS", icon: <Plus size={16} />, to: "/work-orders/new", primary: true },
    { label: "Despachos", icon: <Send size={16} />, to: "/operations/dispatches" },
    { label: "Mapa", icon: <MapPin size={16} />, to: "/operations/map" },
    { label: "Checklists", icon: <ListChecks size={16} />, to: "/operations/checklists" },
    { label: "Notificações", icon: <Bell size={16} />, to: "/notifications" },
  ];

  const userName = (session?.user?.name ?? "").split(" ")[0] || "operação";
  const orgName = activeContext?.tenantName ?? "sua organização";

  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>{greeting()}, {userName}.</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>operação, SLA e cadastros · {orgName}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/work-orders/new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Nova OS</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 9, marginBottom: 16, flexWrap: "wrap" }}>
        {quick.map((q) => (
          <button key={q.label} onClick={() => navigate(q.to)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 15px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: q.primary ? "1px solid #2563EB" : "1px solid #E2E8F0", background: q.primary ? "#2563EB" : "#fff", color: q.primary ? "#fff" : "#475569" }}>
            {q.icon}{q.label}
          </button>
        ))}
      </div>

      {data.summaryError ? (
        <div role="alert" style={{ padding: "9px 13px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 9, marginBottom: 10, fontSize: 12.5, color: "#B91C1C" }}>
          Não foi possível carregar os indicadores do painel agora. Tente atualizar em instantes.
        </div>
      ) : null}
      {complementaryFallback ? (
        <div role="status" style={{ padding: "9px 13px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, marginBottom: 10, fontSize: 12.5, color: "#92400E" }}>
          Alguns dados de campo estão indisponíveis agora. Exibindo o que foi possível carregar.
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <span key={chip.text} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: chip.bg, color: chip.color }}>{chip.text}</span>
          ))}
        </div>
      ) : null}

      <div aria-live="polite" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        {data.loading && data.kpis.length === 0 ? (
          Array.from({ length: 9 }).map((_, index) => (
            <div key={index} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 7 }} aria-hidden="true">
              <div style={{ width: 54, height: 24, borderRadius: 6, background: "#F1F5F9" }} />
              <div style={{ width: "70%", height: 12, borderRadius: 4, background: "#F1F5F9" }} />
              <div style={{ width: "40%", height: 10, borderRadius: 4, background: "#F1F5F9" }} />
            </div>
          ))
        ) : data.kpis.length === 0 ? (
          <div style={{ ...card, padding: 20, gridColumn: "1 / -1", fontSize: 12.5, color: "#94A3B8" }}>
            {data.summaryError ? "Indicadores indisponíveis no momento." : "Sem indicadores para exibir."}
          </div>
        ) : (
          data.kpis.map((kpi) => {
            const tone = KPI_TONE[kpi.tone];
            return (
              <div key={kpi.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: tone.color, flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{kpi.value}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", lineHeight: 1.3 }}>{kpi.label}</div>
                {kpi.delta ? <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{kpi.delta}</div> : null}
              </div>
            );
          })
        )}
      </div>

      {can("work_orders:read") ? (
        <WorkOrderVolumeCard />
      ) : (
        <div style={{ ...card, padding: 20, marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Volume de ordens de serviço</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Últimos 30 dias</div>
          </div>
          <EmptyState title="Acesso não permitido" detail="Seu perfil não tem permissão para ver o volume de ordens de serviço." />
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ ...card, padding: 20, flex: "1.7 1 360px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Fila crítica</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>OS de maior prioridade e SLA sensível</div>
            </div>
            <button onClick={() => navigate("/work-orders")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}>Ver todas</button>
          </div>
          {data.criticalWorkOrders.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "12px 0" }}>
              {data.loading ? "Carregando…" : data.summaryError ? "Não foi possível carregar a fila crítica." : "Nenhuma OS crítica no momento."}
            </div>
          ) : (
            data.criticalWorkOrders.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid #F1F5F9" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: TONE_COLOR[item.priorityTone].color, flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.code} · {item.customerName ?? item.title}</div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{criticalDescription(item, now)}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: TONE_COLOR[item.statusTone].bg, color: TONE_COLOR[item.statusTone].color, whiteSpace: "nowrap", flexShrink: 0 }}>{item.statusLabel}</span>
                <button
                  onClick={() => navigate(`/work-orders/${item.id}`)}
                  aria-label={`Abrir OS: ${item.code}`}
                  style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 11px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#2563EB", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  Abrir OS
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ ...card, padding: 20, flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Alertas operacionais</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>Derivados das contagens do painel</div>
          {data.alerts.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "8px 0" }}>
              {data.loading ? "Carregando…" : data.summaryError ? "Não foi possível carregar os alertas." : "Nenhum alerta no momento."}
            </div>
          ) : (
            data.alerts.map((alert) => {
              const severity = ALERT_SEVERITY[alert.severity];
              return (
                <div key={alert.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: "1px solid #F1F5F9" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: severity.bg, display: "flex", alignItems: "center", justifyContent: "center", color: severity.color, flexShrink: 0 }} aria-hidden="true">{severity.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{alert.title}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{alert.detail}</div>
                  </div>
                  <button onClick={() => navigate(alert.workOrderId ? `/work-orders/${alert.workOrderId}` : "/work-orders")} aria-label={`Ver fila: ${alert.title}`} style={{ fontSize: 11.5, fontWeight: 700, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, whiteSpace: "nowrap" }}>
                    Ver fila
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ ...card, padding: 20, flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Despachos ativos</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Do rascunho ao atendimento</div>
            </div>
            <button onClick={() => navigate("/operations/dispatches")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}>Ver despachos</button>
          </div>
          {dispatchRows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "8px 0" }}>{data.loading ? "Carregando…" : "Nenhum despacho ativo no momento."}</div>
          ) : (
            dispatchRows.map((row) => (
              <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid #F1F5F9" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: TONE_COLOR[row.tone].color, flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.subtitle}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TONE_COLOR[row.tone].color }}>{row.statusLabel}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>{relativeTimeFrom(row.when, now)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ ...card, padding: 20, flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Status de campo</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Localizações reais dos operadores</div>
            </div>
            <button onClick={() => navigate("/operations/map")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}>Abrir mapa</button>
          </div>
          {fieldRows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "8px 0" }}>{data.loading ? "Carregando…" : "Nenhum operador com localização recente."}</div>
          ) : (
            fieldRows.map((row) => (
              <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid #F1F5F9" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: TONE_COLOR[row.tone].color, flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.detail}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: TONE_COLOR[row.tone].bg, color: TONE_COLOR[row.tone].color, whiteSpace: "nowrap", flexShrink: 0 }}>{row.stateLabel}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ ...card, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Últimos eventos</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Atividade recente das ordens de serviço</div>
          </div>
          <button onClick={() => navigate("/work-orders")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}>Ver tudo</button>
        </div>
        {data.recentEvents.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>
            {data.loading ? "Carregando…" : data.summaryError ? "Não foi possível carregar os eventos recentes." : "Sem atividade recente."}
          </div>
        ) : (
          data.recentEvents.map((event, index) => (
            <div key={event.id} style={{ display: "flex", gap: 11, paddingBottom: index < data.recentEvents.length - 1 ? 13 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: TONE_COLOR[event.tone].color, marginTop: 4 }} aria-hidden="true" />
                {index < data.recentEvents.length - 1 ? <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 4 }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.message}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: TONE_COLOR[event.tone].color }}>{event.eventLabel}</span>
                  <span>·</span>
                  <span>{relativeTimeFrom(event.createdAt, now)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
