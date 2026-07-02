import type { CSSProperties } from "react";

// "Fila de Aprovações" (sc_approvals). Alvo: ERP Web.dc.html.

type Row = { code: string; type: string; chip: string; chipBg: string; chipColor: string; accent: string; title: string; who: string; age: string; flag: string; value: string };

const ROWS: Row[] = [
  { code: "APR-0040", type: "Compra", chip: "Escalado", chipBg: "#F5F3FF", chipColor: "#7C3AED", accent: "#7C3AED", title: "Peças — compressor industrial", who: "Bruno Lima", age: "há 18 h", flag: "acima da alçada", value: "R$ 8.400,00" },
  { code: "APR-0039", type: "OS", chip: "Prioridade alta", chipBg: "#FEF2F2", chipColor: "#DC2626", accent: "#DC2626", title: "Execução OS-2891 · Indústria Alfa", who: "Carla Mendes", age: "há 42 min", flag: "checklist + evidências", value: "R$ 3.150,00" },
  { code: "APR-0038", type: "RDV", chip: "No prazo", chipBg: "#ECFDF5", chipColor: "#059669", accent: "#059669", title: "Reembolso de despesas · pedágio + combustível", who: "Rafael Silva", age: "há 3 h", flag: "dentro da política", value: "R$ 612,40" },
];

const btn = (bg: string, color: string, border?: string): CSSProperties => ({ padding: "10px 17px", background: bg, border: border ?? "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color, cursor: "pointer", fontFamily: "inherit" });

export function ApprovalsPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Fila de Aprovações</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>3 itens aguardando · ordenados por prioridade</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button style={{ padding: "8px 15px", background: "#2563EB", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Pendentes · 3</button>
        <button style={{ padding: "8px 15px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Aprovadas</button>
        <button style={{ padding: "8px 15px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Recusadas</button>
      </div>

      {ROWS.map((a) => (
        <div key={a.code} style={{ background: "#fff", border: "1px solid #E2E8F0", borderLeft: `4px solid ${a.accent}`, borderRadius: 14, padding: 18, marginBottom: 13, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
              <span style={{ fontSize: 11.5, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{a.code}</span>
              <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99 }}>{a.type}</span>
              <span style={{ background: a.chipBg, color: a.chipColor, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99 }}>{a.chip}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>{a.title}</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Solicitado por {a.who} · {a.age} · <span style={{ color: "#D97706", fontWeight: 600 }}>{a.flag}</span></div>
          </div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 800, whiteSpace: "nowrap" }}>{a.value}</div></div>
          <div style={{ display: "flex", gap: 9 }}>
            <button style={btn("#fff", "#334155", "1px solid #E2E8F0")}>Detalhar</button>
            <button style={btn("#10B981", "#fff")}>Aprovar</button>
            <button style={btn("#fff", "#DC2626", "1px solid #FECACA")}>Recusar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ApprovalsPage;
