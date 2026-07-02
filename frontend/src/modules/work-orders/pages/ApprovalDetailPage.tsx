import { AlertTriangle, ArrowLeft, Check } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// "Aprovação · detalhe" (sc_approvalDetail). Alvo: screen-refs/web/aprovacao-detalhe.png.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const cellLabel: CSSProperties = { fontSize: 11.5, color: "#94A3B8" };
const cellValue: CSSProperties = { fontSize: 14, fontWeight: 600, color: "#0F172A", marginTop: 2 };

function SummaryCell({ label, value, valueColor, borderRight, borderBottom }: { label: string; value: string; valueColor?: string; borderRight?: boolean; borderBottom?: boolean }) {
  return (
    <div style={{ padding: "13px 16px", borderRight: borderRight ? "1px solid #F1F5F9" : undefined, borderBottom: borderBottom ? "1px solid #F1F5F9" : undefined }}>
      <div style={cellLabel}>{label}</div>
      <div style={{ ...cellValue, color: valueColor ?? "#0F172A" }}>{value}</div>
    </div>
  );
}

function ItemRow({ item, qty, unit, total, borderBottom }: { item: string; qty: string; unit: string; total: string; borderBottom?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr", padding: "13px 18px", borderBottom: borderBottom ? "1px solid #F1F5F9" : undefined, alignItems: "center" }}>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{item}</span>
      <span style={{ fontSize: 13, color: "#475569" }}>{qty}</span>
      <span style={{ fontSize: 13, color: "#475569" }}>{unit}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A", textAlign: "right" }}>{total}</span>
    </div>
  );
}

export function ApprovalDetailPage() {
  const navigate = useNavigate();

  return (
    <div style={{ color: "#0F172A" }}>
      <div onClick={() => navigate("/approvals")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2563EB", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
        <ArrowLeft size={16} />Voltar à fila
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        {/* left column */}
        <div>
          <div style={{ ...card, padding: 22, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>APR-0040</span>
              <span style={{ background: "#F5F3FF", color: "#7C3AED", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>Escalado</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Peças — compressor industrial</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>Pedido de compra PC-0231 · Fornecedor Delta · solicitado por Bruno Lima</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#0F172A", letterSpacing: "-1px", marginBottom: 18 }}>R$ 8.400,00</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #F1F5F9", borderRadius: 12, overflow: "hidden" }}>
              <SummaryCell label="Centro de custo" value="Manutenção · BH" borderRight borderBottom />
              <SummaryCell label="Alçada do gestor" value="R$ 5.000 (excedida)" valueColor="#DC2626" borderBottom />
              <SummaryCell label="Entrega prevista" value="25/06/2026" borderRight />
              <SummaryCell label="Condição" value="30 dias · boleto" />
            </div>
          </div>

          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Itens do pedido</div>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr", padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
              <span>ITEM</span>
              <span>QTD</span>
              <span>UNIT.</span>
              <span style={{ textAlign: "right" }}>TOTAL</span>
            </div>
            <ItemRow item="Compressor 5cv trifásico" qty="1" unit="R$ 7.200" total="R$ 7.200" borderBottom />
            <ItemRow item="Kit instalação + frete" qty="1" unit="R$ 1.200" total="R$ 1.200" />
          </div>
        </div>

        {/* right column */}
        <div>
          <div style={{ ...card, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 14 }}>Decisão</div>
            <button style={{ width: "100%", padding: 13, background: "#10B981", border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Check size={17} />Aprovar pedido
            </button>
            <button style={{ width: "100%", padding: 13, background: "#fff", border: "1px solid #FECACA", borderRadius: 11, fontSize: 14, fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>Recusar</button>
            <button style={{ width: "100%", padding: 13, background: "#F1F5F9", border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Solicitar revisão</button>
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", display: "flex", alignItems: "flex-start", gap: 9 }}>
              <AlertTriangle size={16} style={{ color: "#D97706", flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.45 }}>Valor acima da sua alçada. A aprovação será co-assinada pela diretoria.</div>
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 14 }}>Trilha de aprovação</div>

            {/* step 1 — done */}
            <div style={{ display: "flex", gap: 11, paddingBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Check size={13} /></div>
                <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 2 }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Solicitado</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8" }}>Bruno Lima · 12/06 16:20</div>
              </div>
            </div>

            {/* step 2 — current */}
            <div style={{ display: "flex", gap: 11, paddingBottom: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>2</div>
                <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 2 }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Gestor (você)</div>
                <div style={{ fontSize: 11.5, color: "#2563EB", fontWeight: 600 }}>Aguardando decisão</div>
              </div>
            </div>

            {/* step 3 — pending */}
            <div style={{ display: "flex", gap: 11 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 11, fontWeight: 800 }}>3</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8" }}>Diretoria</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8" }}>Pendente</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApprovalDetailPage;
