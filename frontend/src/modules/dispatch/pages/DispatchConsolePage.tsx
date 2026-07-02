import { ClipboardList, MapPin, Send, SlidersHorizontal } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// "Console Dispatcher" (sc_dispatchConsole). Alvo: screen-refs/web/console-tempo-real.png.

const TENANT_NAME = "Techsolutions Industrial";

type Kpi = { n: string; label: string; color: string; bg: string };
type Alert = { dot: string; color: string; bg: string; border: string; tag: string; text: string; action: string };
type QueueItem = {
  code: string;
  client: string;
  type: string;
  priority: string;
  priorityColor: string;
  sla: string;
  slaColor: string;
  tech: string;
  status: string;
  statusBg: string;
  statusColor: string;
};
type Tech = {
  name: string;
  initials: string;
  team: string;
  status: string;
  statusColor: string;
  statusBg: string;
  os: string;
  osColor: string;
};

const KPIS: Kpi[] = [
  { n: "14", label: "Na fila", color: "#2563EB", bg: "#EFF6FF" },
  { n: "3", label: "SLA crítico", color: "#DC2626", bg: "#FEF2F2" },
  { n: "8", label: "Em atendimento", color: "#D97706", bg: "#FFFBEB" },
  { n: "5", label: "Disponíveis", color: "#059669", bg: "#ECFDF5" },
];

const ALERTS: Alert[] = [
  { dot: "#DC2626", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", tag: "SLA crítico", text: "OS-2901 · Indústria Alfa — vence em 28 min sem técnico atribuído", action: "Atribuir agora" },
  { dot: "#D97706", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", tag: "Técnico parado", text: "Pedro Anhaia — localização não atualizada há 7 min", action: "Verificar" },
  { dot: "#7C3AED", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", tag: "Reforço solicitado", text: "Equipe Sul — 4 OS abertas e 1 técnico disponível", action: "Alocar reforço" },
];

const QUEUE: QueueItem[] = [
  { code: "OS-2901", client: "Indústria Alfa", type: "Manutenção corretiva", priority: "Urgente", priorityColor: "#DC2626", sla: "28 min", slaColor: "#DC2626", tech: "", status: "Sem técnico", statusBg: "#FEF2F2", statusColor: "#DC2626" },
  { code: "OS-2898", client: "Beta Comércio", type: "Instalação elétrica", priority: "Alta", priorityColor: "#D97706", sla: "1h 12min", slaColor: "#D97706", tech: "Carlos Mendes", status: "Em rota", statusBg: "#EFF6FF", statusColor: "#2563EB" },
  { code: "OS-2895", client: "Gama Serviços", type: "Reparo de equipamento", priority: "Normal", priorityColor: "#64748B", sla: "2h 45min", slaColor: "#059669", tech: "Ana Pereira", status: "Em atendimento", statusBg: "#FFFBEB", statusColor: "#D97706" },
  { code: "OS-2893", client: "Delta Tech", type: "Vistoria técnica", priority: "Normal", priorityColor: "#64748B", sla: "4h 00min", slaColor: "#059669", tech: "", status: "Aguardando", statusBg: "#F1F5F9", statusColor: "#475569" },
  { code: "OS-2891", client: "Construtora Norte", type: "Manutenção preventiva", priority: "Baixa", priorityColor: "#94A3B8", sla: "6h 30min", slaColor: "#059669", tech: "João Silva", status: "Em rota", statusBg: "#EFF6FF", statusColor: "#2563EB" },
];

const TECHS: Tech[] = [
  { name: "João Silva", initials: "JS", team: "Equipe Sul", status: "Online", statusColor: "#059669", statusBg: "#ECFDF5", os: "Disponível", osColor: "#059669" },
  { name: "Carlos Mendes", initials: "CM", team: "Equipe Centro", status: "Em rota", statusColor: "#2563EB", statusBg: "#EFF6FF", os: "OS-2898", osColor: "#2563EB" },
  { name: "Ana Pereira", initials: "AP", team: "Equipe Centro", status: "Em atendimento", statusColor: "#D97706", statusBg: "#FFFBEB", os: "OS-2895", osColor: "#D97706" },
  { name: "Pedro Anhaia", initials: "PA", team: "Guincho", status: "Localiz. antiga", statusColor: "#F97316", statusBg: "#FFF7ED", os: "OS-2885", osColor: "#F97316" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, overflow: "hidden" };
const headBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" };
const colLabel: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

export function DispatchConsolePage() {
  const navigate = useNavigate();

  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Console Dispatcher</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>triagem, despacho, reagendamento e reforço operacional em tempo real · {TENANT_NAME}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={headBtn}><SlidersHorizontal size={14} />Filtrar</button>
          <button onClick={() => navigate("/operations/map")} style={headBtn}><MapPin size={14} />Ver mapa</button>
          <button style={{ ...headBtn, background: "#2563EB", border: "none", color: "#fff" }}><Send size={14} />Novo despacho</button>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", color: k.color, fontSize: 20, fontWeight: 800, flexShrink: 0 }}>{k.n}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#475569", lineHeight: 1.3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* alerts */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        {ALERTS.map((a) => (
          <div key={a.tag} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: a.bg, border: `1px solid ${a.border}`, flex: 1, minWidth: 260 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{a.tag}</span>
              <span style={{ fontSize: 12, color: "#475569", marginLeft: 6 }}>{a.text}</span>
            </div>
            <button style={{ padding: "4px 10px", background: "#fff", border: `1px solid ${a.border}`, borderRadius: 7, fontSize: 11.5, fontWeight: 700, color: a.color, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{a.action}</button>
          </div>
        ))}
      </div>

      {/* main layout: fila + técnicos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
        {/* fila */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Fila de Despacho</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>priorize por SLA</div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button style={{ padding: "6px 11px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><SlidersHorizontal size={13} />Filtrar</button>
              <button style={{ padding: "6px 11px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Prioridade</button>
            </div>
          </div>
          {/* column header */}
          <div style={{ display: "flex", alignItems: "center", padding: "8px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
            <span style={{ ...colLabel, flex: 1.2 }}>OS · CLIENTE</span>
            <span style={{ ...colLabel, flex: 1.4 }}>TIPO</span>
            <span style={{ ...colLabel, flex: 0.7 }}>PRIOR.</span>
            <span style={{ ...colLabel, flex: 0.7 }}>SLA</span>
            <span style={{ ...colLabel, flex: 1 }}>TÉCNICO</span>
            <span style={{ ...colLabel, flex: 0.9, textAlign: "right" }}>STATUS</span>
            <span style={{ ...colLabel, flex: 0.8, textAlign: "right" }}>AÇÃO</span>
          </div>
          {QUEUE.map((q) => (
            <div key={q.code} onClick={() => navigate("/work-orders")} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #F8FAFC", gap: 10, cursor: "pointer" }}>
              <div style={{ flex: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{q.code}</div>
                <div style={{ fontSize: 11.5, color: "#64748B" }}>{q.client}</div>
              </div>
              <span style={{ flex: 1.4, fontSize: 12.5, color: "#475569" }}>{q.type}</span>
              <span style={{ flex: 0.7, fontSize: 12.5, fontWeight: 700, color: q.priorityColor }}>{q.priority}</span>
              <span style={{ flex: 0.7, fontSize: 12.5, fontWeight: 700, color: q.slaColor, fontFamily: "'JetBrains Mono', monospace" }}>{q.sla}</span>
              <span style={{ flex: 1, fontSize: 12.5, color: "#475569" }}>{q.tech || "—"}</span>
              <div style={{ flex: 0.9, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: q.statusBg, color: q.statusColor, whiteSpace: "nowrap" }}>{q.status}</span>
              </div>
              <div style={{ flex: 0.8, display: "flex", justifyContent: "flex-end", gap: 4 }}>
                <button onClick={(e) => e.stopPropagation()} style={{ padding: "5px 10px", background: "#2563EB", border: "none", borderRadius: 7, fontSize: 11.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Despachar</button>
              </div>
            </div>
          ))}
        </div>

        {/* técnicos */}
        <div style={{ ...card, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Técnicos</div>
            <button onClick={() => navigate("/operations/map")} style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Ver mapa</button>
          </div>
          {TECHS.map((t) => (
            <div key={t.name} style={{ padding: "12px 16px", borderBottom: "1px solid #F8FAFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: t.statusBg, color: t.statusColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{t.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{t.team}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: t.statusBg, color: t.statusColor, whiteSpace: "nowrap" }}>{t.status}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 44 }}>
                <ClipboardList size={12} style={{ color: "#94A3B8" }} />
                <span style={{ fontSize: 11.5, color: t.osColor, fontWeight: 600 }}>{t.os}</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, paddingLeft: 44 }}>
                <button style={{ flex: 1, padding: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 11.5, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>Atribuir OS</button>
                <button style={{ flex: 1, padding: 6, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 11.5, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>Ver rota</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid #F1F5F9" }}>
            <button onClick={() => navigate("/operations/dispatches")} style={{ width: "100%", padding: 9, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>Ver fila completa de despacho</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatchConsolePage;
