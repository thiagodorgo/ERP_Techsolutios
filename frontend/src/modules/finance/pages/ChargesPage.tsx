import { useState } from "react";
import type { CSSProperties } from "react";

// "Cobranças" (sc_charges). Alvo: screen-refs/web/cobrancas.png.

type Kpi = { value: string; label: string; color: string };

type Charge = {
  code: string;
  client: string;
  value: string;
  due: string;
  dueColor: string;
  dueWeight: number;
  plan: string;
  status: string;
  stBg: string;
  stCl: string;
  tab: TabKey;
};

type TabKey = "all" | "open" | "overdue" | "paid" | "disputed";

const KPIS: Kpi[] = [
  { value: "R$ 184k", label: "Em aberto", color: "#2563EB" },
  { value: "R$ 11,5k", label: "Vencidas", color: "#DC2626" },
  { value: "R$ 302k", label: "Recebidas (mês)", color: "#059669" },
  { value: "R$ 8,2k", label: "Em contestação", color: "#D97706" },
];

const CHARGES: Charge[] = [
  { code: "CHG-2041", client: "Indústria Alfa Ltda", value: "R$ 24.800", due: "18/06", dueColor: "#475569", dueWeight: 500, plan: "Enterprise", status: "Em aberto", stBg: "#EFF6FF", stCl: "#2563EB", tab: "open" },
  { code: "CHG-2040", client: "Beta Comércio SA", value: "R$ 12.300", due: "09/06", dueColor: "#DC2626", dueWeight: 700, plan: "Business", status: "Vencida", stBg: "#FEF2F2", stCl: "#DC2626", tab: "overdue" },
  { code: "CHG-2039", client: "Gama Serviços ME", value: "R$ 6.750", due: "05/06", dueColor: "#475569", dueWeight: 500, plan: "Starter", status: "Paga", stBg: "#ECFDF5", stCl: "#059669", tab: "paid" },
  { code: "CHG-2038", client: "Delta Tech S.A.", value: "R$ 18.900", due: "22/06", dueColor: "#475569", dueWeight: 500, plan: "Enterprise", status: "Em aberto", stBg: "#EFF6FF", stCl: "#2563EB", tab: "open" },
  { code: "CHG-2037", client: "Épsilon Log.", value: "R$ 8.200", due: "12/06", dueColor: "#D97706", dueWeight: 700, plan: "Business", status: "Em contestação", stBg: "#FFFBEB", stCl: "#D97706", tab: "disputed" },
  { code: "CHG-2036", client: "Zeta Indústria", value: "R$ 31.400", due: "01/06", dueColor: "#475569", dueWeight: 500, plan: "Enterprise", status: "Paga", stBg: "#ECFDF5", stCl: "#059669", tab: "paid" },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Em aberto" },
  { key: "overdue", label: "Vencidas" },
  { key: "paid", label: "Pagas" },
  { key: "disputed", label: "Em contestação" },
];

const GRID = "1fr 1.8fr 1fr 0.9fr 1fr 1.1fr 0.7fr";
const th: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" };

export function ChargesPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const rows = tab === "all" ? CHARGES : CHARGES.filter((c) => c.tab === tab);

  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>Cobranças</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 }}>cobranças a clientes, vencimentos e adimplência</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Exportar</button>
          <button style={{ padding: "8px 14px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>+ Nova cobrança</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: "-.4px" }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* tab bar */}
      <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 4, marginBottom: 18, width: "fit-content" }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ padding: "7px 16px", border: "none", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: active ? "#2563EB" : "transparent", color: active ? "#fff" : "#64748B" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* table */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
          <span style={th}>COBRANÇA</span>
          <span style={th}>CLIENTE</span>
          <span style={th}>VALOR</span>
          <span style={th}>VENC.</span>
          <span style={th}>PLANO</span>
          <span style={th}>STATUS</span>
          <span style={th}>AÇÃO</span>
        </div>
        {rows.map((c) => (
          <div key={c.code} style={{ display: "grid", gridTemplateColumns: GRID, padding: "13px 18px", borderBottom: "1px solid #F8FAFC", gap: 8, cursor: "pointer", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563EB", fontFamily: "'JetBrains Mono', monospace" }}>{c.code}</span>
            <span style={{ fontSize: 13, color: "#0F172A" }}>{c.client}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{c.value}</span>
            <span style={{ fontSize: 12.5, color: c.dueColor, fontWeight: c.dueWeight, fontFamily: "'JetBrains Mono', monospace" }}>{c.due}</span>
            <span style={{ fontSize: 12, color: "#475569" }}>{c.plan}</span>
            <span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: c.stBg, color: c.stCl }}>{c.status}</span>
            </span>
            <button style={{ padding: "5px 11px", background: "#F1F5F9", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, color: "#2563EB", cursor: "pointer", fontFamily: "inherit" }}>Ver</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChargesPage;
