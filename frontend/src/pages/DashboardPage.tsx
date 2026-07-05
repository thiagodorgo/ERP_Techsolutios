import { AlertTriangle, Bell, CheckCircle2, Clock, ListChecks, MapPin, Plus, RefreshCw, Send } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  buildCriticalQueue,
  deriveActiveDispatchRows,
  deriveDashboardAlerts,
  deriveDashboardEvents,
  deriveEnrichedDashboardKpis,
  deriveFieldStatusRows,
  relativeTimeFrom,
  type DashboardSeverity,
  type DashboardTone,
} from "../modules/dashboard/dashboard.adapter";
import { useDashboardData, type DashboardSourceState } from "../modules/dashboard/useDashboardData";
import { useAuth } from "../providers/AuthProvider";
import { useTenantContext } from "../providers/TenantProvider";

// Dashboard Operacional (gestor) — B-124: composto de dados reais de
// GET /work-orders + GET /operations/dispatches + GET /field-locations/latest +
// GET /notifications/unread-count (+ GET /approvals/pending), com mock atrás de
// VITE_USE_MOCKS e fallback local seguro por fonte. Derivações puras no
// dashboard.adapter; nenhuma chamada de timeline por OS. Alvo visual: screen-refs.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

const TONE_COLOR: Record<DashboardTone, { color: string; bg: string }> = {
  info: { color: "#2563EB", bg: "#EFF6FF" },
  success: { color: "#059669", bg: "#ECFDF5" },
  warning: { color: "#D97706", bg: "#FFFBEB" },
  danger: { color: "#DC2626", bg: "#FEF2F2" },
  accent: { color: "#7C3AED", bg: "#F5F3FF" },
  neutral: { color: "#64748B", bg: "#F1F5F9" },
};

const SEVERITY_COLOR: Record<DashboardSeverity, string> = { critical: "#DC2626", warning: "#D97706", info: "#2563EB" };

const ALERT_ICON: Record<string, ReactNode> = {
  overdue: <Clock size={15} />,
  urgent: <AlertTriangle size={15} />,
  stale: <MapPin size={15} />,
  "dispatch-accept": <Send size={15} />,
  approvals: <CheckCircle2 size={15} />,
};

function sourceChip(label: string, source: DashboardSourceState): { text: string; bg: string; color: string } | null {
  if (source === "mock") return { text: `${label}: Dados demonstrativos`, bg: "#EFF6FF", color: "#2563EB" };
  if (source === "fallback") return { text: `${label}: Fallback local`, bg: "#FFFBEB", color: "#92400E" };
  return null;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const data = useDashboardData();

  const now = new Date();
  const derivedInput = useMemo(
    () => ({
      workOrders: data.workOrders,
      dispatches: data.dispatches,
      locations: data.locations,
      pendingApprovals: data.pendingApprovals,
      unread: data.unread,
      now,
    }),
    // `now` muda a cada render por definição; as derivações são baratas (listas curtas).
    [data.workOrders, data.dispatches, data.locations, data.pendingApprovals, data.unread], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const kpis = useMemo(() => deriveEnrichedDashboardKpis(derivedInput), [derivedInput]);
  const queue = useMemo(() => buildCriticalQueue(derivedInput, 6), [derivedInput]);
  const alerts = useMemo(() => deriveDashboardAlerts(derivedInput), [derivedInput]);
  const fieldRows = useMemo(() => deriveFieldStatusRows(data.locations, derivedInput.now, 5), [data.locations, derivedInput.now]);
  const dispatchRows = useMemo(() => deriveActiveDispatchRows(data.dispatches, 5), [data.dispatches]);
  const events = useMemo(() => deriveDashboardEvents(derivedInput, 6), [derivedInput]);

  const chips = [
    sourceChip("OS", data.workOrdersSource),
    sourceChip("Despachos", data.dispatchesSource),
    sourceChip("Localizações", data.locationsSource),
  ].filter((chip): chip is NonNullable<typeof chip> => chip !== null);

  const anyFallback = data.workOrdersSource === "fallback" || data.dispatchesSource === "fallback" || data.locationsSource === "fallback";

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
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>operação, SLA e aprovações · {orgName}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => void data.refresh()} aria-label="Atualizar dados do painel" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><RefreshCw size={14} />Atualizar</button>
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

      {anyFallback ? (
        <div role="status" style={{ padding: "9px 13px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, marginBottom: 10, fontSize: 12.5, color: "#92400E" }}>
          Não foi possível carregar dados operacionais agora. Exibindo dados locais.
        </div>
      ) : null}
      {data.approvalsUnavailable ? (
        <div role="status" style={{ padding: "9px 13px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 9, marginBottom: 10, fontSize: 12.5, color: "#475569" }}>
          Aprovações indisponíveis no momento.
        </div>
      ) : null}
      {chips.length > 0 ? (
        <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <span key={chip.text} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: chip.bg, color: chip.color }}>{chip.text}</span>
          ))}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        {kpis.map((kpi) => {
          const tone = TONE_COLOR[kpi.tone];
          return (
            <div key={kpi.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: tone.color, flexShrink: 0 }} aria-hidden="true" />
                <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{data.loading ? "—" : kpi.value}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", lineHeight: 1.3 }}>{kpi.label}</div>
              <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{data.loading ? "carregando…" : kpi.helper}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ ...card, padding: 20, flex: "1.7 1 360px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Fila crítica</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>SLA vencido · prioridade · sinal de campo · aprovações · atribuição</div>
            </div>
            <button onClick={() => navigate("/work-orders")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}>Ver todas</button>
          </div>
          {queue.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "12px 0" }}>{data.loading ? "Carregando…" : "Nenhuma pendência crítica no momento."}</div>
          ) : (
            queue.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid #F1F5F9" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: SEVERITY_COLOR[item.severity], flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: TONE_COLOR[item.tone].bg, color: TONE_COLOR[item.tone].color, whiteSpace: "nowrap", flexShrink: 0 }}>{item.statusLabel}</span>
                <button
                  onClick={() => navigate(item.action.to)}
                  aria-label={`${item.action.label}: ${item.title}`}
                  style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 11px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#2563EB", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {item.action.label}
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ ...card, padding: 20, flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Alertas operacionais</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>Derivados de OS, despachos e campo</div>
          {alerts.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "8px 0" }}>{data.loading ? "Carregando…" : "Nenhum alerta no momento."}</div>
          ) : (
            alerts.map((alert) => {
              const color = SEVERITY_COLOR[alert.severity];
              const bg = alert.severity === "critical" ? "#FEF2F2" : alert.severity === "warning" ? "#FFFBEB" : "#EFF6FF";
              return (
                <div key={alert.id} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: "1px solid #F1F5F9" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }} aria-hidden="true">{ALERT_ICON[alert.id] ?? <AlertTriangle size={15} />}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{alert.title}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{alert.meta}</div>
                  </div>
                  {alert.action ? (
                    <button onClick={() => navigate(alert.action!.to)} aria-label={`${alert.action.label}: ${alert.title}`} style={{ fontSize: 11.5, fontWeight: 700, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, whiteSpace: "nowrap" }}>
                      {alert.action.label}
                    </button>
                  ) : null}
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
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>Derivados das OS e despachos carregados</div>
          </div>
          <button onClick={() => navigate("/work-orders")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0 }}>Ver tudo</button>
        </div>
        {events.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#94A3B8" }}>{data.loading ? "Carregando…" : "Sem atividade recente."}</div>
        ) : (
          events.map((event, index) => (
            <div key={event.id} style={{ display: "flex", gap: 11, paddingBottom: index < events.length - 1 ? 13 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: TONE_COLOR[event.tone].color, marginTop: 4 }} aria-hidden="true" />
                {index < events.length - 1 ? <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 4 }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: TONE_COLOR[event.tone].color }}>{event.statusLabel}</span>
                  <span>·</span>
                  <span>{relativeTimeFrom(event.at, now)}</span>
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
