import { Bell, ListChecks, MapPin, Plus, RefreshCw, Send } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUnreadNotificationCount } from "../modules/notifications/notification.service";
import { useWorkOrders } from "../modules/work-orders/useWorkOrders";
import type { WorkOrderListItem, WorkOrderStatus, WorkOrdersFilters } from "../modules/work-orders/work-orders.types";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { useTenantContext } from "../providers/TenantProvider";

// Dashboard Operacional (gestor) — composto de dados reais: GET /work-orders +
// GET /notifications/unread-count (mock atrás de VITE_USE_MOCKS; fallback local).
// Enriquecimento com /operations/dispatches + /field-locations/latest: próximo
// incremento (ver docs/api-screen-endpoints.md). Alvo visual: screen-refs.

const STATUS_META: Record<WorkOrderStatus, { label: string; bg: string; color: string }> = {
  open: { label: "Aberta", bg: "#F1F5F9", color: "#475569" },
  assigned: { label: "Atribuída", bg: "#EFF6FF", color: "#2563EB" },
  accepted: { label: "Aceita", bg: "#EFF6FF", color: "#2563EB" },
  on_route: { label: "Em rota", bg: "#EFF6FF", color: "#2563EB" },
  on_site: { label: "No local", bg: "#ECFDF5", color: "#059669" },
  in_progress: { label: "Em atendimento", bg: "#FFFBEB", color: "#D97706" },
  paused: { label: "Pausada", bg: "#FFFBEB", color: "#D97706" },
  completed: { label: "Concluída", bg: "#ECFDF5", color: "#059669" },
  cancelled: { label: "Cancelada", bg: "#FEF2F2", color: "#DC2626" },
  rejected: { label: "Recusada", bg: "#FEF2F2", color: "#DC2626" },
};

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const STABLE_FILTERS: WorkOrdersFilters = { search: "", status: "all", priority: "all", assignedOperatorId: "", from: "", to: "" };
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const isFinal = (s: WorkOrderStatus) => s === "completed" || s === "cancelled" || s === "rejected";
const isField = (s: WorkOrderStatus) => s === "on_route" || s === "on_site" || s === "in_progress" || s === "paused";
const isScheduled = (s: WorkOrderStatus) => s === "open" || s === "assigned" || s === "accepted";

function sameDay(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function relTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const mins = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
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
  const { permissions } = usePermissions();
  const { items, loading, source, refresh } = useWorkOrders(STABLE_FILTERS);
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    if (!activeContext || !permissions.includes("notifications:read")) {
      setUnread(null);
      return;
    }
    let alive = true;
    void getUnreadNotificationCount({ token: session?.accessToken, tenantId: activeContext.tenantId, branchId: activeContext.branchId, role: activeContext.role, permissions: activeContext.permissions })
      .then((r) => { if (alive) setUnread(r.count); })
      .catch(() => { if (alive) setUnread(null); });
    return () => { alive = false; };
  }, [activeContext, permissions, session?.accessToken]);

  const today = new Date();
  const tiles = useMemo(() => {
    const by = (fn: (o: WorkOrderListItem) => boolean) => items.filter(fn).length;
    return [
      { n: by((o) => !isFinal(o.status)), label: "OS abertas", color: "#2563EB" },
      { n: by((o) => isScheduled(o.status)), label: "Agendadas", color: "#2563EB" },
      { n: by((o) => o.status === "on_route"), label: "Em rota", color: "#D97706" },
      { n: by((o) => o.status === "on_site"), label: "No local", color: "#059669" },
      { n: by((o) => o.status === "in_progress"), label: "Em atendimento", color: "#D97706" },
      { n: by((o) => o.status === "completed" && sameDay(o.completedAt, today)), label: "Concluídas hoje", color: "#059669" },
      { n: by((o) => o.priority === "urgent" && !isFinal(o.status)), label: "Urgentes", color: "#DC2626" },
      { n: by((o) => !o.assignedOperatorId && !isFinal(o.status)), label: "Sem técnico", color: "#7C3AED" },
      { n: by((o) => !!o.checklistId && !isFinal(o.status)), label: "Com checklist", color: "#2563EB" },
      { n: unread ?? 0, label: "Não lidas", color: "#64748B" },
    ];
  }, [items, unread, today]);

  const critical = useMemo(
    () =>
      [...items]
        .filter((o) => !isFinal(o.status))
        .sort((a, b) => (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) || ((a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? "")))
        .slice(0, 4),
    [items],
  );

  const fieldOps = useMemo(() => items.filter((o) => isField(o.status)).slice(0, 4), [items]);
  const events = useMemo(() => [...items].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)).slice(0, 4), [items]);

  const alerts = useMemo(() => {
    const urgentes = items.filter((o) => o.priority === "urgent" && !isFinal(o.status)).length;
    const semTecnico = items.filter((o) => !o.assignedOperatorId && !isFinal(o.status)).length;
    const comChecklist = items.filter((o) => !!o.checklistId && !isFinal(o.status)).length;
    return [
      { title: `${urgentes} OS urgentes abertas`, meta: "priorize a fila crítica", bg: "#FEF2F2", color: "#DC2626", icon: "!" },
      { title: `${semTecnico} OS sem técnico`, meta: "aguardando atribuição/despacho", bg: "#FFFBEB", color: "#D97706", icon: "◔" },
      { title: `${comChecklist} OS com checklist`, meta: "coleta/entrega a acompanhar", bg: "#EFF6FF", color: "#2563EB", icon: "≣" },
      { title: `${unread ?? 0} notificações não lidas`, meta: "central de notificações", bg: "#F5F3FF", color: "#7C3AED", icon: "✓" },
    ];
  }, [items, unread]);

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
          <button onClick={() => void refresh()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><RefreshCw size={14} />Atualizar</button>
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

      {source === "fallback" ? (
        <div style={{ padding: "9px 13px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, marginBottom: 12, fontSize: 12.5, color: "#92400E" }}>Sem conexão com a API — exibindo dados locais.</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 16 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 15px", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1 }}>{loading ? "—" : t.n}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", lineHeight: 1.3 }}>{t.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Fila crítica</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1 }}>OS abertas por prioridade</div>
            </div>
            <span onClick={() => navigate("/work-orders")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Ver todas</span>
          </div>
          {critical.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "12px 0" }}>{loading ? "Carregando…" : "Nenhuma OS aberta no momento."}</div>
          ) : (
            critical.map((o) => {
              const sm = STATUS_META[o.status];
              return (
                <div key={o.id} onClick={() => navigate(`/work-orders/${o.id}`)} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 0", borderTop: "1px solid #F1F5F9", cursor: "pointer" }}>
                  <div style={{ width: 60, textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: o.priority === "urgent" ? "#DC2626" : o.priority === "high" ? "#D97706" : "#059669", textTransform: "uppercase" }}>{o.priority === "urgent" ? "Urgente" : o.priority === "high" ? "Alta" : o.priority === "medium" ? "Média" : "Baixa"}</div>
                    <div style={{ fontSize: 9.5, color: "#94A3B8", letterSpacing: ".05em" }}>PRIORIDADE</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", fontFamily: "'JetBrains Mono', monospace" }}>{o.code}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customerName ?? "Cliente não informado"}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.title}</div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: sm.bg, color: sm.color, whiteSpace: "nowrap", flexShrink: 0 }}>{sm.label}</span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Alertas operacionais</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>Derivados das OS da organização</div>
          {alerts.map((a) => (
            <div key={a.title} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 0", borderTop: "1px solid #F1F5F9" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0, fontWeight: 800 }}>{a.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 1 }}>{a.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Status de campo</div>
            <span onClick={() => navigate("/operations/map")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Abrir mapa</span>
          </div>
          {fieldOps.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8", padding: "8px 0" }}>Nenhuma OS em campo no momento.</div>
          ) : (
            fieldOps.map((o) => {
              const sm = STATUS_META[o.status];
              return (
                <div key={o.id} onClick={() => navigate(`/work-orders/${o.id}`)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid #F1F5F9", cursor: "pointer" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customerName ?? o.code}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sm.color }}>{sm.label}</span>
                </div>
              );
            })
          )}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Últimos eventos</div>
            <span onClick={() => navigate("/work-orders")} style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Ver tudo</span>
          </div>
          {events.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94A3B8" }}>Sem atividade recente.</div>
          ) : (
            events.map((o, i) => {
              const sm = STATUS_META[o.status];
              return (
                <div key={o.id} style={{ display: "flex", gap: 11, paddingBottom: 13 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: sm.color, marginTop: 4 }} />
                    {i < events.length - 1 ? <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 4 }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.4 }}><strong style={{ fontWeight: 700 }}>{o.code}</strong> · {o.customerName ?? "OS"}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: sm.color }}>{sm.label}</span><span>·</span><span>{relTime(o.updatedAt ?? o.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
