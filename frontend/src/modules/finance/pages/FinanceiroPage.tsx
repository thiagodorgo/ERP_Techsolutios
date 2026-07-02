import { AlertTriangle, ArrowDownRight, ArrowUpRight, Download, Plus, Wallet } from "lucide-react";
import type { CSSProperties, ComponentType } from "react";

// "Financeiro" (sc_financeiro). Alvo: screen-refs/web/financeiro.png.

type IconType = ComponentType<{ size?: number }>;

type Kpi = { label: string; value: string; sub: string; Icon: IconType; iconBg: string; iconColor: string };
type Row = { doc: string; party: string; type: string; value: string; due: string; chip: string; chipBg: string; chipColor: string };
type Bar = { label: string; incH: string; outH: string };

const FIN_KPIS: Kpi[] = [
  { label: "A receber (30d)", value: "R$ 412k", sub: "18 títulos", Icon: ArrowUpRight, iconBg: "#ECFDF5", iconColor: "#059669" },
  { label: "A pagar (30d)", value: "R$ 268k", sub: "24 títulos", Icon: ArrowDownRight, iconBg: "#FEF2F2", iconColor: "#DC2626" },
  { label: "Saldo projetado", value: "R$ 144k", sub: "fluxo positivo", Icon: Wallet, iconBg: "#EFF6FF", iconColor: "#2563EB" },
  { label: "Inadimplência", value: "2,8%", sub: "R$ 11,5k vencido", Icon: AlertTriangle, iconBg: "#FFFBEB", iconColor: "#D97706" },
];

const FIN_ROWS: Row[] = [
  { doc: "NF-e 4471", party: "Indústria Alfa Ltda", type: "Receber", value: "R$ 24.800", due: "18/06", chip: "Em aberto", chipBg: "#EFF6FF", chipColor: "#2563EB" },
  { doc: "Fatura 8832", party: "Fornecedor Delta", type: "Pagar", value: "R$ 8.400", due: "20/06", chip: "Agendado", chipBg: "#F5F3FF", chipColor: "#7C3AED" },
  { doc: "NF-e 4468", party: "Beta Comércio SA", type: "Receber", value: "R$ 12.300", due: "09/06", chip: "Vencido", chipBg: "#FEF2F2", chipColor: "#DC2626" },
  { doc: "Boleto 1190", party: "Elétrica Sul", type: "Pagar", value: "R$ 1.180", due: "22/06", chip: "Agendado", chipBg: "#F5F3FF", chipColor: "#7C3AED" },
  { doc: "NF-e 4460", party: "Gama Serviços ME", type: "Receber", value: "R$ 6.750", due: "05/06", chip: "Recebido", chipBg: "#ECFDF5", chipColor: "#059669" },
];

const FIN_BARS: Bar[] = [
  { label: "Jan", incH: "60%", outH: "42%" },
  { label: "Fev", incH: "68%", outH: "50%" },
  { label: "Mar", incH: "55%", outH: "58%" },
  { label: "Abr", incH: "72%", outH: "49%" },
  { label: "Mai", incH: "80%", outH: "61%" },
  { label: "Jun", incH: "88%", outH: "55%" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const gridCols = "1.2fr 1.8fr 1fr 1fr 1.2fr";

export function FinanceiroPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Financeiro</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Contas a pagar e receber · fluxo de caixa · Techsolutions Industrial</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}><Download size={15} />Conciliar NF-e</button>
          <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><Plus size={15} />Novo lançamento</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {FIN_KPIS.map((k) => (
          <div key={k.label} style={{ ...card, padding: 18 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: k.iconBg, color: k.iconColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><k.Icon size={20} /></div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", whiteSpace: "nowrap" }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 1 }}>{k.label}</div>
            <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 5 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* chart + table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
        {/* fluxo de caixa */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 3 }}>Fluxo de caixa</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>Entradas vs saídas · 6 meses</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, height: 150 }}>
            {FIN_BARS.map((b) => (
              <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ width: "100%", display: "flex", gap: 3, alignItems: "flex-end", height: "100%", justifyContent: "center" }}>
                  <div style={{ width: "40%", background: "#10B981", borderRadius: "3px 3px 0 0", height: b.incH }} />
                  <div style={{ width: "40%", background: "#F87171", borderRadius: "3px 3px 0 0", height: b.outH }} />
                </div>
                <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{b.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, justifyContent: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#10B981" }} />Entradas</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#F87171" }} />Saídas</span>
          </div>
        </div>

        {/* títulos recentes */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800 }}>Títulos recentes</div>
          <div style={{ display: "grid", gridTemplateColumns: gridCols, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
            <span>DOCUMENTO</span>
            <span>PARTE</span>
            <span>VALOR</span>
            <span>VENC.</span>
            <span style={{ textAlign: "right" }}>STATUS</span>
          </div>
          {FIN_ROWS.map((f) => (
            <div
              key={f.doc}
              onClick={() => {}}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              style={{ display: "grid", gridTemplateColumns: gridCols, padding: "12px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center", cursor: "pointer", background: "transparent" }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{f.doc}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{f.type}</div>
              </div>
              <span style={{ fontSize: 13, color: "#1E293B" }}>{f.party}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{f.value}</span>
              <span style={{ fontSize: 12.5, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>{f.due}</span>
              <span style={{ textAlign: "right" }}>
                <span style={{ background: f.chipBg, color: f.chipColor, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>{f.chip}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FinanceiroPage;
