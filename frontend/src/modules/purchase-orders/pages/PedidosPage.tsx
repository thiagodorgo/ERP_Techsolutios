import { Plus } from "lucide-react";
import type { CSSProperties } from "react";

import { usePermissions } from "../../../providers/PermissionProvider";

// "Pedidos de Compra" (sc_pedidos). Alvo: screen-refs/web/pedidos-compra.png.

type OrderRow = {
  code: string;
  supplier: string;
  items: string;
  value: string;
  date: string;
  chip: string;
  chipBg: string;
  chipColor: string;
};

const ORDER_ROWS: OrderRow[] = [
  { code: "PC-0231", supplier: "Fornecedor Delta", items: "Compressor industrial 5cv", value: "R$ 8.400,00", date: "12/06", chip: "Aguardando aprovação", chipBg: "#FFFBEB", chipColor: "#D97706" },
  { code: "PC-0230", supplier: "Beta Suprimentos", items: "Cabos e conectores (8 itens)", value: "R$ 2.310,00", date: "10/06", chip: "Aprovado", chipBg: "#ECFDF5", chipColor: "#059669" },
  { code: "PC-0229", supplier: "Elétrica Sul", items: "Disjuntores e tomadas (5 itens)", value: "R$ 1.180,00", date: "08/06", chip: "Recebido", chipBg: "#EFF6FF", chipColor: "#2563EB" },
  { code: "PC-0228", supplier: "Fornecedor Delta", items: "Material hidráulico (12 itens)", value: "R$ 4.520,00", date: "05/06", chip: "Recebido", chipBg: "#EFF6FF", chipColor: "#2563EB" },
  { code: "PC-0227", supplier: "TechParts BR", items: "Resistores SMD (lote)", value: "R$ 890,00", date: "03/06", chip: "Recusado", chipBg: "#FEF2F2", chipColor: "#DC2626" },
];

const GRID: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1.6fr 2.2fr 1fr 1fr 1.4fr" };
const mono = "'JetBrains Mono', monospace";

export function PedidosPage() {
  const { can } = usePermissions();
  // Backend continua a autoridade — o gate server-side real deve existir quando o endpoint de Pedidos existir; aqui só UX.
  const canCreate = can("purchase_orders:create");
  return (
    <div style={{ color: "#0F172A" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Pedidos de Compra</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>5 pedidos · 1 aguardando aprovação</div>
        </div>
        {canCreate && (
          <button
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
          >
            <Plus size={15} />
            Novo pedido
          </button>
        )}
      </div>

      {/* card + table */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ ...GRID, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em" }}>
          <span>CÓDIGO</span>
          <span>FORNECEDOR</span>
          <span>ITENS</span>
          <span>VALOR</span>
          <span>DATA</span>
          <span style={{ textAlign: "right" }}>STATUS</span>
        </div>
        {ORDER_ROWS.map((o) => (
          <div
            key={o.code}
            style={{ ...GRID, padding: "14px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center", cursor: "pointer", transition: "background .12s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFC"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", fontFamily: mono }}>{o.code}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{o.supplier}</span>
            <span style={{ fontSize: 13, color: "#64748B" }}>{o.items}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{o.value}</span>
            <span style={{ fontSize: 12.5, color: "#94A3B8", fontFamily: mono }}>{o.date}</span>
            <span style={{ textAlign: "right" }}>
              <span style={{ background: o.chipBg, color: o.chipColor, fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 99, whiteSpace: "nowrap" }}>{o.chip}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PedidosPage;
