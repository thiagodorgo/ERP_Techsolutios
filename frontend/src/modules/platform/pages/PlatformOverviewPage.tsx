import { BarChart3, DollarSign, Server, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

// Tela "Visão Geral da Plataforma" (platformDashboard). Alvo:
// screen-refs/web/visao-geral-plataforma.png + ERP Web.dc.html (sc_platformDashboard).

type Kpi = { icon: LucideIcon; iconBg: string; iconColor: string; risk: string; riskBg: string; riskColor: string; value: string; label: string; sub: string; subColor: string };
type MrrBar = { label: string; val: string; h: string; color: string; solid: boolean };
type Activity = { who: string; action: string; tag: string; dot: string; time: string };
type OrgRow = { name: string; plan: string; users: string; mrr: string; health: string; healthColor: string; dot: string };

const KPIS: Kpi[] = [
  { icon: Server, iconBg: "#F1F5F9", iconColor: "#334155", risk: "Normal", riskBg: "#ECFDF5", riskColor: "#059669", value: "48", label: "Organizações ativas", sub: "+3 este mês", subColor: "#059669" },
  { icon: Users, iconBg: "#ECFDF5", iconColor: "#059669", risk: "Saudável", riskBg: "#ECFDF5", riskColor: "#059669", value: "2.184", label: "Usuários totais", sub: "94% ativos agora", subColor: "#059669" },
  { icon: DollarSign, iconBg: "#F5F3FF", iconColor: "#7C3AED", risk: "+9,2%", riskBg: "#F5F3FF", riskColor: "#7C3AED", value: "R$ 312k", label: "MRR consolidado", sub: "+9,2% vs maio", subColor: "#7C3AED" },
  { icon: ShieldCheck, iconBg: "#FFFBEB", iconColor: "#D97706", risk: "SLA OK", riskBg: "#ECFDF5", riskColor: "#059669", value: "99,98%", label: "Uptime (30d)", sub: "SLA cumprido", subColor: "#D97706" },
];

const MRR_BARS: MrrBar[] = [
  { label: "Dez", val: "260k", h: "83%", color: "#BFDBFE", solid: false },
  { label: "Jan", val: "276k", h: "88%", color: "#BFDBFE", solid: false },
  { label: "Fev", val: "285k", h: "91%", color: "#BFDBFE", solid: false },
  { label: "Mar", val: "271k", h: "87%", color: "#BFDBFE", solid: false },
  { label: "Abr", val: "296k", h: "95%", color: "#BFDBFE", solid: false },
  { label: "Mai", val: "305k", h: "98%", color: "#BFDBFE", solid: false },
  { label: "Jun", val: "312k", h: "100%", color: "#2563EB", solid: true },
];

const ACTIVITY: Activity[] = [
  { who: "Techsolutions SP", action: "habilitou o módulo Analytics.", tag: "Info", dot: "#2563EB", time: "há 20 min" },
  { who: "AgroMax Cooperativa", action: "teve pico de erros 5xx mitigado.", tag: "Alerta", dot: "#DC2626", time: "há 1 h" },
  { who: "Logística Delta", action: "concluiu onboarding do plano Pro.", tag: "Sucesso", dot: "#059669", time: "há 3 h" },
  { who: "Plataforma", action: "aplicou atualização de segurança 2026.06.", tag: "Sistema", dot: "#7C3AED", time: "ontem" },
  { who: "Minas Norte Service", action: "solicitou aumento de limite de usuários.", tag: "Governança", dot: "#D97706", time: "ontem" },
];

const ORG_ROWS: OrgRow[] = [
  { name: "Techsolutions SP", plan: "Enterprise", users: "684", mrr: "R$ 92k", health: "Saudável", healthColor: "#059669", dot: "#22C55E" },
  { name: "AgroMax Cooperativa", plan: "Pro", users: "412", mrr: "R$ 58k", health: "Atenção", healthColor: "#D97706", dot: "#F59E0B" },
  { name: "Logística Delta", plan: "Pro", users: "268", mrr: "R$ 41k", health: "Saudável", healthColor: "#059669", dot: "#22C55E" },
  { name: "Minas Norte Service", plan: "Business", users: "196", mrr: "R$ 33k", health: "Saudável", healthColor: "#059669", dot: "#22C55E" },
  { name: "Field Operations LATAM", plan: "Business", users: "158", mrr: "R$ 27k", health: "Crítico", healthColor: "#DC2626", dot: "#EF4444" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };
const th: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

export function PlatformOverviewPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      {/* PAGE HEADER */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F1F5F9", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Visão Geral da Plataforma</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>governança, receita, saúde das organizações e atividade operacional</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Exportar</button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><BarChart3 size={14} />Atualizar</button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><BarChart3 size={14} />Ver relatório</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: k.iconColor }}>
                <k.icon size={18} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: k.riskBg, color: k.riskColor }}>{k.risk}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", marginBottom: 3 }}>{k.value}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* MRR + ATIVIDADE */}
      <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 14 }}>
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>MRR consolidado</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>Receita recorrente · últimos 7 meses · R$ mil</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.4px" }}>R$ 312k</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#059669" }}>↑ +9,2% vs mai</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130, paddingBottom: 24, position: "relative" }}>
            {MRR_BARS.map((b) => (
              <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", position: "relative" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: b.solid ? "#2563EB" : "#94A3B8", marginBottom: 3, whiteSpace: "nowrap" }}>{b.val}</div>
                <div style={{ width: "100%", background: b.color, borderRadius: "4px 4px 0 0", height: b.h }} />
                <div style={{ position: "absolute", bottom: -20, fontSize: 10.5, fontWeight: 600, color: b.solid ? "#2563EB" : "#94A3B8" }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: 20, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Atividade da plataforma</div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Ver todas</span>
          </div>
          {ACTIVITY.map((a, i) => (
            <div key={a.who + a.time} style={{ display: "flex", gap: 11, paddingBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: a.dot, marginTop: 4 }} />
                {i < ACTIVITY.length - 1 ? <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 4 }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.4 }}><strong style={{ fontWeight: 700 }}>{a.who}</strong> {a.action}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: a.dot }}>{a.tag}</span><span>·</span><span>{a.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SAÚDE DAS ORGANIZAÇÕES */}
      <div style={{ ...card, overflow: "hidden", marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Saúde das organizações</div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}>Ver todas</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
          <span style={{ ...th, flex: 2.2 }}>ORGANIZAÇÃO</span>
          <span style={{ ...th, flex: 1.2 }}>PLANO</span>
          <span style={{ ...th, flex: 0.9 }}>USUÁRIOS</span>
          <span style={{ ...th, flex: 1.3 }}>MRR</span>
          <span style={{ ...th, flex: 1.2, textAlign: "right" }}>STATUS</span>
        </div>
        {ORG_ROWS.map((t, i) => (
          <div key={t.name} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: i === ORG_ROWS.length - 1 ? "none" : "1px solid #F8FAFC", gap: 10 }}>
            <div style={{ flex: 2.2, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}><Server size={14} /></div>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</span>
            </div>
            <span style={{ flex: 1.2, fontSize: 13, color: "#475569" }}>{t.plan}</span>
            <span style={{ flex: 0.9, fontSize: 13, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{t.users}</span>
            <span style={{ flex: 1.3, fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t.mrr}</span>
            <div style={{ flex: 1.2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: t.healthColor }}>{t.health}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlatformOverviewPage;
