import { AlertTriangle, ArrowLeft, Package, ShoppingCart } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// "Estoque · detalhe" (sc_estoqueDetail). Alvo: screen-refs/web/estoque-detalhe.png.

type Stat = { value: string; label: string; color: string };
type Move = { type: string; bg: string; color: string; desc: string; qty: string; who: string; date: string };

const STATS: Stat[] = [
  { value: "12 un", label: "Saldo atual", color: "#DC2626" },
  { value: "50 un", label: "Estoque mínimo", color: "#0F172A" },
  { value: "R$ 0,42", label: "Custo médio un.", color: "#0F172A" },
  { value: "8 dias", label: "Cobertura estimada", color: "#0F172A" },
];

const STOCK_MOVES: Move[] = [
  { type: "Saída", bg: "#FEF2F2", color: "#DC2626", desc: "OS-2891 · Indústria Alfa", qty: "-8 un", date: "13/06 09:42", who: "Carla Mendes" },
  { type: "Entrada", bg: "#ECFDF5", color: "#059669", desc: "NF-e 4471 · Fornecedor Beta", qty: "+50 un", date: "10/06 14:10", who: "Bruno Lima" },
  { type: "Ajuste", bg: "#FFFBEB", color: "#D97706", desc: "Inventário cíclico Q2", qty: "-2 un", date: "05/06 17:30", who: "Sistema" },
  { type: "Saída", bg: "#FEF2F2", color: "#DC2626", desc: "OS-2885 · Beta Comércio", qty: "-12 un", date: "02/06 11:05", who: "João Reis" },
];

const mono = "'JetBrains Mono', monospace";
const gridCols = "1fr 2.4fr 1fr 1.2fr 1.2fr";

export function EstoqueDetailPage() {
  const navigate = useNavigate();

  return (
    <div style={{ color: "#0F172A" }}>
      <div onClick={() => navigate("/inventory")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2563EB", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
        <ArrowLeft size={16} />Voltar ao estoque
      </div>

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626", flexShrink: 0 }}><Package size={26} /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Resistor 10kΩ 1/4W</div>
            <div style={{ fontSize: 13, color: "#64748B", fontFamily: mono }}>SKU-RES-10K · Componentes · Local A-12</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ padding: "9px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
          <button onClick={() => navigate("/purchase-orders")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><ShoppingCart size={15} />Repor estoque</button>
        </div>
      </div>

      {/* alerta de saldo crítico */}
      <div style={{ marginBottom: 16, padding: "13px 16px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 10 }}>
        <AlertTriangle size={18} style={{ color: "#DC2626", flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#991B1B" }}><strong>Saldo crítico:</strong> 12 un disponíveis, abaixo do mínimo de 50 un. Sugestão de compra: 80 un.</div>
      </div>

      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Movimentações */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Movimentações</div>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em" }}>
          <span>TIPO</span>
          <span>DESCRIÇÃO</span>
          <span>QTD</span>
          <span>RESPONSÁVEL</span>
          <span style={{ textAlign: "right" }}>DATA</span>
        </div>
        {STOCK_MOVES.map((m) => (
          <div key={`${m.desc}-${m.date}`} style={{ display: "grid", gridTemplateColumns: gridCols, padding: "13px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
            <span><span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: m.bg, color: m.color, fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>{m.type}</span></span>
            <span style={{ fontSize: 13, color: "#1E293B" }}>{m.desc}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: m.color }}>{m.qty}</span>
            <span style={{ fontSize: 13, color: "#475569" }}>{m.who}</span>
            <span style={{ fontSize: 12.5, color: "#94A3B8", textAlign: "right", fontFamily: mono }}>{m.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EstoqueDetailPage;
