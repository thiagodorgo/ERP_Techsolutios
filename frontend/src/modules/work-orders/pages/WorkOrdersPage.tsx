import { AlertTriangle, Plus, RefreshCw, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useWorkOrders } from "../useWorkOrders";
import type { WorkOrderListItem, WorkOrderPriority, WorkOrderStatus, WorkOrdersFilters } from "../work-orders.types";

// "Ordens de Serviço" (lista) — ligada a work-orders.service (real atrás de
// VITE_USE_MOCKS; fallback local em erro). Alvo visual: ERP Web.dc.html.

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

const PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

type Group = "all" | "scheduled" | "field" | "done";
const GROUPS: readonly { key: Group; label: string; match: (s: WorkOrderStatus) => boolean }[] = [
  { key: "all", label: "Todas", match: () => true },
  { key: "scheduled", label: "Agendadas", match: (s) => s === "open" || s === "assigned" || s === "accepted" },
  { key: "field", label: "Em campo", match: (s) => s === "on_route" || s === "on_site" || s === "in_progress" || s === "paused" },
  { key: "done", label: "Concluídas", match: (s) => s === "completed" },
];

const STABLE_FILTERS: WorkOrdersFilters = { search: "", status: "all", priority: "all", assignedOperatorId: "", from: "", to: "" };

const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };
const chipStyle = (active: boolean): CSSProperties => ({ padding: "8px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: active ? 700 : 600, cursor: "pointer", fontFamily: "inherit", border: active ? "1px solid #BFDBFE" : "1px solid #E2E8F0", background: active ? "#EFF6FF" : "#fff", color: active ? "#2563EB" : "#475569" });

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function KpiCard({ n, label, badge, bg, color }: { n: number; label: string; badge: string; bg: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{n}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</div>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color }}>{badge}</span>
      </div>
    </div>
  );
}

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const { items, loading, source, refresh } = useWorkOrders(STABLE_FILTERS);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<Group>("all");

  const kpis = useMemo(() => {
    const isFinal = (s: WorkOrderStatus) => s === "completed" || s === "cancelled" || s === "rejected";
    const inField = (s: WorkOrderStatus) => s === "on_route" || s === "on_site" || s === "in_progress" || s === "paused";
    return {
      abertas: items.filter((o) => !isFinal(o.status)).length,
      andamento: items.filter((o) => inField(o.status)).length,
      urgentes: items.filter((o) => o.priority === "urgent").length,
      concluidas: items.filter((o) => o.status === "completed").length,
    };
  }, [items]);

  const groupMatch = (GROUPS.find((g) => g.key === group) ?? GROUPS[0]).match;
  const q = search.trim().toLowerCase();
  const visible = items
    .filter((o) => groupMatch(o.status))
    .filter((o) => (q ? [o.code, o.title, o.customerName, o.serviceAddress].some((v) => (v ?? "").toLowerCase().includes(q)) : true));

  return (
    <div style={{ color: "#0F172A" }}>
      {/* page header — sempre renderiza (título + ações à direita) */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Ordens de Serviço</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>atribuição, execução, SLA e rastreabilidade</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => void refresh()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><RefreshCw size={14} />Atualizar</button>
          <button onClick={() => navigate("/work-orders/new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><Plus size={14} />Nova OS</button>
        </div>
      </div>

      {/* KPIs computados dos dados reais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        <KpiCard n={kpis.abertas} label="OS abertas" badge="Todas" bg="#EFF6FF" color="#2563EB" />
        <KpiCard n={kpis.andamento} label="Em andamento" badge="Agora" bg="#FFFBEB" color="#D97706" />
        <KpiCard n={kpis.urgentes} label="Urgentes" badge="Prioridade" bg="#FEF2F2" color="#DC2626" />
        <KpiCard n={kpis.concluidas} label="Concluídas" badge="Total" bg="#ECFDF5" color="#059669" />
      </div>

      {source === "fallback" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, marginBottom: 12, fontSize: 12.5, color: "#92400E" }}>
          <AlertTriangle size={14} /> Sem conexão com a API — exibindo dados locais.
        </div>
      ) : null}

      {/* busca + filtros de estado (funcionais) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={14} style={{ color: "#94A3B8" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar OS, cliente, endereço…" style={{ border: "none", outline: "none", fontSize: 13, color: "#0F172A", background: "transparent", width: "100%", fontFamily: "inherit" }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", letterSpacing: ".06em", flexShrink: 0 }}>ESTADO</span>
        {GROUPS.map((g) => (
          <button key={g.key} onClick={() => setGroup(g.key)} style={chipStyle(group === g.key)}>{g.label}</button>
        ))}
      </div>

      {/* tabela / estados */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
          <span style={{ ...th, flex: 0.9 }}>CÓDIGO</span>
          <span style={{ ...th, flex: 2.2 }}>CLIENTE / SERVIÇO</span>
          <span style={{ ...th, flex: 1.2 }}>TÉCNICO</span>
          <span style={{ ...th, flex: 0.9 }}>AGENDA</span>
          <span style={{ ...th, flex: 1, textAlign: "right" }}>STATUS</span>
          <span style={{ ...th, flex: 0.7, textAlign: "right" }}>AÇÃO</span>
        </div>

        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #F8FAFC", gap: 10 }}>
              <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, flex: 0.9 }} />
              <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, flex: 2.2 }} />
              <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, flex: 1.2 }} />
              <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, flex: 0.9 }} />
              <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, flex: 1 }} />
              <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, flex: 0.7 }} />
            </div>
          ))
        ) : visible.length === 0 ? (
          <div style={{ padding: "48px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Nenhuma ordem de serviço</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>{q || group !== "all" ? "Ajuste a busca ou os filtros de estado." : "As ordens atribuídas à sua organização aparecem aqui."}</div>
          </div>
        ) : (
          visible.map((o: WorkOrderListItem) => {
            const sm = STATUS_META[o.status];
            return (
              <div key={o.id} onClick={() => navigate(`/work-orders/${o.id}`)} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", gap: 10 }}>
                <div style={{ flex: 0.9 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", fontFamily: "'JetBrains Mono', monospace" }}>{o.code}</div>
                  <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{PRIORITY_LABEL[o.priority]}</div>
                </div>
                <div style={{ flex: 2.2, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.customerName ?? "Cliente não informado"}</div>
                  <div style={{ fontSize: 11.5, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.title}</div>
                  {o.checklistId ? (
                    <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "#EFF6FF", color: "#2563EB" }}>Checklist</span>
                    </div>
                  ) : null}
                </div>
                <div style={{ flex: 1.2, fontSize: 12.5, color: o.assignedOperatorId ? "#475569" : "#94A3B8" }}>{o.assignedOperatorId ? "Atribuída" : "A atribuir"}</div>
                <span style={{ flex: 0.9, fontSize: 12.5, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{fmtDate(o.scheduledFor)}</span>
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: sm.bg, color: sm.color, whiteSpace: "nowrap" }}>{sm.label}</span></div>
                <div style={{ flex: 0.7, display: "flex", justifyContent: "flex-end" }}><button style={{ padding: "5px 10px", background: "#F1F5F9", border: "none", borderRadius: 7, fontSize: 11.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>Abrir</button></div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default WorkOrdersPage;
