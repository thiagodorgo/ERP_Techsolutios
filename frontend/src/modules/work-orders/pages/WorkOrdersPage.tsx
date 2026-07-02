import { AlertTriangle, Download, Filter, Plus, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// "Ordens de Serviço" (lista). Alvo: ERP Web.dc.html (sc_workOrders).

type Kpi = { n: string; label: string; badge: string; bg: string; color: string };
type Badge = { text: string; bg: string; color: string };
type Row = { id: string; code: string; type: string; client: string; service: string; badges: Badge[]; initials: string; tech: string; date: string; sla: string; slaColor: string; status: string; statusBg: string; statusColor: string };

const KPIS: Kpi[] = [
  { n: "38", label: "OS abertas", badge: "Todas", bg: "#EFF6FF", color: "#2563EB" },
  { n: "7", label: "Em andamento", badge: "Agora", bg: "#FFFBEB", color: "#D97706" },
  { n: "3", label: "SLA em risco", badge: "Crítico", bg: "#FEF2F2", color: "#DC2626" },
  { n: "12", label: "Concluídas hoje", badge: "Hoje", bg: "#ECFDF5", color: "#059669" },
];

const STATES = ["Agendada (14)", "Despachada (6)", "Em rota (4)", "No local (3)", "Em atendimento (7)", "Concluída (12)"];

const ROWS: Row[] = [
  { id: "os-2891", code: "OS-2891", type: "Reboque", client: "Indústria Alfa", service: "Guincho · veículo avariado", badges: [{ text: "Guincho", bg: "#EFF6FF", color: "#2563EB" }, { text: "SLA risco", bg: "#FEF2F2", color: "#DC2626" }], initials: "BA", tech: "Bruna Alves", date: "13/06 09:00", sla: "28 min", slaColor: "#DC2626", status: "Em atendimento", statusBg: "#FFFBEB", statusColor: "#D97706" },
  { id: "os-2884", code: "OS-2884", type: "Prestador", client: "Cooperativa AgroMax", service: "Assistência técnica", badges: [{ text: "Prestador", bg: "#F5F3FF", color: "#7C3AED" }], initials: "CN", tech: "Carlos Nunes", date: "13/06 10:30", sla: "52 min", slaColor: "#D97706", status: "Em rota", statusBg: "#EFF6FF", statusColor: "#2563EB" },
  { id: "os-2879", code: "OS-2879", type: "Reboque", client: "Logística Delta", service: "Guincho · pátio", badges: [{ text: "Guincho", bg: "#EFF6FF", color: "#2563EB" }], initials: "RS", tech: "Rafael Silva", date: "13/06 11:15", sla: "1 h 10", slaColor: "#D97706", status: "Despachada", statusBg: "#F1F5F9", statusColor: "#475569" },
  { id: "os-2872", code: "OS-2872", type: "Prestador", client: "Minas Norte", service: "Elétrica industrial", badges: [{ text: "Prestador", bg: "#F5F3FF", color: "#7C3AED" }], initials: "LM", tech: "Lucas Melo", date: "13/06 08:00", sla: "2 h 05", slaColor: "#059669", status: "No local", statusBg: "#ECFDF5", statusColor: "#059669" },
  { id: "os-2865", code: "OS-2865", type: "Reboque", client: "Transportes Sul", service: "Guincho · rodovia", badges: [], initials: "CN", tech: "Carlos Nunes", date: "12/06 16:40", sla: "—", slaColor: "#94A3B8", status: "Concluída", statusBg: "#ECFDF5", statusColor: "#059669" },
  { id: "os-2858", code: "OS-2858", type: "Prestador", client: "Field Operations", service: "Manutenção preventiva", badges: [{ text: "Aguard. aprovação", bg: "#F5F3FF", color: "#7C3AED" }], initials: "BA", tech: "Bruna Alves", date: "12/06 14:10", sla: "—", slaColor: "#94A3B8", status: "Ag. aprovação", statusBg: "#F5F3FF", statusColor: "#7C3AED" },
];

const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };
const chip = (active: boolean): CSSProperties => ({ padding: "8px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: active ? 700 : 600, cursor: "pointer", fontFamily: "inherit", border: active ? "1px solid #BFDBFE" : "1px solid #E2E8F0", background: active ? "#EFF6FF" : "#fff", color: active ? "#2563EB" : "#475569" });

export function WorkOrdersPage() {
  const navigate = useNavigate();

  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Ordens de Serviço</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>atribuição, execução, SLA e rastreabilidade · Techsolutions BH</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><Filter size={14} />Filtrar</button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><Download size={14} />Exportar</button>
          <button onClick={() => navigate("/work-orders/new")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><Plus size={14} />Nova OS</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.color, fontSize: 22, fontWeight: 800, flexShrink: 0 }}>{k.n}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{k.label}</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: k.bg, color: k.color }}>{k.badge}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={14} style={{ color: "#94A3B8" }} /><span style={{ fontSize: 13, color: "#94A3B8" }}>Buscar OS, cliente, técnico…</span>
        </div>
        <button style={chip(true)}>Todos os status</button>
        <button style={chip(false)}>Hoje</button>
        <button style={chip(false)}>Técnico</button>
        <button style={chip(false)}>Prioridade</button>
        <button style={{ padding: "8px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} />SLA em risco (3)</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, overflowX: "auto" }} className="scrl">
        <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", letterSpacing: ".06em", flexShrink: 0 }}>ESTADO</span>
        {STATES.map((s, i) => (
          <button key={s} style={{ ...chip(i === 0), whiteSpace: "nowrap", flexShrink: 0 }}>{s}</button>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
          <span style={{ ...th, flex: 0.9 }}>CÓDIGO</span>
          <span style={{ ...th, flex: 2.2 }}>CLIENTE / SERVIÇO</span>
          <span style={{ ...th, flex: 1.2 }}>TÉCNICO</span>
          <span style={{ ...th, flex: 0.9 }}>AGENDA</span>
          <span style={{ ...th, flex: 0.8 }}>SLA</span>
          <span style={{ ...th, flex: 1, textAlign: "right" }}>STATUS</span>
          <span style={{ ...th, flex: 0.7, textAlign: "right" }}>AÇÃO</span>
        </div>
        {ROWS.map((r) => (
          <div key={r.id} onClick={() => navigate(`/work-orders/${r.id}`)} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", gap: 10 }}>
            <div style={{ flex: 0.9 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", fontFamily: "'JetBrains Mono', monospace" }}>{r.code}</div>
              <div style={{ fontSize: 10.5, color: "#94A3B8" }}>{r.type}</div>
            </div>
            <div style={{ flex: 2.2, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.client}</div>
              <div style={{ fontSize: 11.5, color: "#64748B" }}>{r.service}</div>
              {r.badges.length ? (
                <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                  {r.badges.map((b) => <span key={b.text} style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: b.bg, color: b.color }}>{b.text}</span>)}
                </div>
              ) : null}
            </div>
            <div style={{ flex: 1.2, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#2563EB", flexShrink: 0 }}>{r.initials}</div>
              <span style={{ fontSize: 12.5, color: "#475569" }}>{r.tech}</span>
            </div>
            <span style={{ flex: 0.9, fontSize: 12.5, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{r.date}</span>
            <div style={{ flex: 0.8 }}><span style={{ fontSize: 12.5, fontWeight: 700, color: r.slaColor }}>{r.sla}</span></div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}><span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: r.statusBg, color: r.statusColor, whiteSpace: "nowrap" }}>{r.status}</span></div>
            <div style={{ flex: 0.7, display: "flex", justifyContent: "flex-end" }}><button style={{ padding: "5px 10px", background: "#F1F5F9", border: "none", borderRadius: 7, fontSize: 11.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>Abrir</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkOrdersPage;
