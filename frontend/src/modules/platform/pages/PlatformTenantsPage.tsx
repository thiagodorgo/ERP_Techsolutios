import { DollarSign, Filter, Plus, Server, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// "Organizações" (console). Alvo: ERP Web.dc.html (sc_console).

type Kpi = { icon: LucideIcon; iconBg: string; iconColor: string; risk: string; riskBg: string; riskColor: string; value: string; label: string; sub: string; subColor: string };
type OrgRow = { id: string; initials: string; name: string; since: string; plan: string; users: string; mrr: string; mods: string; health: string; healthColor: string; dot: string; lastEvent: string };

const KPIS: Kpi[] = [
  { icon: Server, iconBg: "#F1F5F9", iconColor: "#334155", risk: "Normal", riskBg: "#ECFDF5", riskColor: "#059669", value: "48", label: "Organizações ativas", sub: "+3 este mês", subColor: "#059669" },
  { icon: Users, iconBg: "#ECFDF5", iconColor: "#059669", risk: "Saudável", riskBg: "#ECFDF5", riskColor: "#059669", value: "2.184", label: "Usuários totais", sub: "94% ativos agora", subColor: "#059669" },
  { icon: DollarSign, iconBg: "#F5F3FF", iconColor: "#7C3AED", risk: "+9,2%", riskBg: "#F5F3FF", riskColor: "#7C3AED", value: "R$ 312k", label: "MRR consolidado", sub: "+9,2% vs maio", subColor: "#7C3AED" },
  { icon: ShieldCheck, iconBg: "#FEF2F2", iconColor: "#DC2626", risk: "Atenção", riskBg: "#FEF2F2", riskColor: "#DC2626", value: "2", label: "Organizações críticas", sub: "requer ação", subColor: "#DC2626" },
];

const ROWS: OrgRow[] = [
  { id: "ten-sp", initials: "TS", name: "Techsolutions SP", since: "cliente desde 2023", plan: "Enterprise", users: "684", mrr: "R$ 92k", mods: "12", health: "Saudável", healthColor: "#059669", dot: "#22C55E", lastEvent: "Módulo ativado · há 20 min" },
  { id: "ten-agromax", initials: "AM", name: "AgroMax Cooperativa", since: "cliente desde 2024", plan: "Pro", users: "412", mrr: "R$ 58k", mods: "9", health: "Atenção", healthColor: "#D97706", dot: "#F59E0B", lastEvent: "Pico de erros 5xx · há 1 h" },
  { id: "ten-delta", initials: "LD", name: "Logística Delta", since: "cliente desde 2024", plan: "Pro", users: "268", mrr: "R$ 41k", mods: "8", health: "Saudável", healthColor: "#059669", dot: "#22C55E", lastEvent: "Onboarding concluído · há 3 h" },
  { id: "ten-minas", initials: "MN", name: "Minas Norte Service", since: "cliente desde 2025", plan: "Business", users: "196", mrr: "R$ 33k", mods: "7", health: "Saudável", healthColor: "#059669", dot: "#22C55E", lastEvent: "Limite solicitado · ontem" },
  { id: "ten-latam", initials: "FO", name: "Field Operations LATAM", since: "cliente desde 2025", plan: "Business", users: "158", mrr: "R$ 27k", mods: "6", health: "Crítico", healthColor: "#DC2626", dot: "#EF4444", lastEvent: "Suspensão aplicada · 12/06" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };
const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

export function PlatformTenantsPage() {
  const navigate = useNavigate();

  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Organizações</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>organizações, planos, saúde e governança da plataforma</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><Filter size={14} />Filtrar</button>
          <button style={{ padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Exportar</button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><Plus size={14} />Nova Organização</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: k.iconColor }}><k.icon size={18} /></div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: k.riskBg, color: k.riskColor }}>{k.risk}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Server size={14} style={{ color: "#94A3B8" }} /><span style={{ fontSize: 13, color: "#94A3B8" }}>Buscar organização…</span>
        </div>
        <button style={{ padding: "8px 13px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>Todos</button>
        <button style={{ padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Enterprise</button>
        <button style={{ padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Pro</button>
        <button style={{ padding: "8px 13px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}>Crítico (2)</button>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
          <span style={{ ...th, flex: 2 }}>ORGANIZAÇÃO</span>
          <span style={{ ...th, flex: 0.9 }}>PLANO</span>
          <span style={{ ...th, flex: 0.7 }}>USUÁRIOS</span>
          <span style={{ ...th, flex: 0.9 }}>MRR</span>
          <span style={{ ...th, flex: 0.7 }}>MÓDULOS</span>
          <span style={{ ...th, flex: 1 }}>SAÚDE</span>
          <span style={{ ...th, flex: 1 }}>ÚLTIMO EVENTO</span>
          <span style={{ ...th, flex: 0.6, textAlign: "right" }}>AÇÃO</span>
        </div>
        {ROWS.map((t) => (
          <div key={t.id} onClick={() => navigate(`/platform/tenants/${t.id}`)} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", gap: 8 }}>
            <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#EFF6FF", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#2563EB" }}>{t.initials}</div>
              <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{t.since}</div></div>
            </div>
            <span style={{ flex: 0.9, fontSize: 12.5, color: "#475569" }}>{t.plan}</span>
            <span style={{ flex: 0.7, fontSize: 12.5, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{t.users}</span>
            <span style={{ flex: 0.9, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t.mrr}</span>
            <span style={{ flex: 0.7, fontSize: 12.5, color: "#475569" }}>{t.mods}</span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot, flexShrink: 0 }} /><span style={{ fontSize: 12.5, fontWeight: 600, color: t.healthColor }}>{t.health}</span></div>
            <span style={{ flex: 1, fontSize: 12, color: "#64748B" }}>{t.lastEvent}</span>
            <div style={{ flex: 0.6, display: "flex", justifyContent: "flex-end" }}>
              <button style={{ padding: "5px 12px", background: "#F1F5F9", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>Ver</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlatformTenantsPage;
