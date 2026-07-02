import { CheckCircle2, ClipboardList, MapPin, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// "Ordem de Serviço · detalhe" (sc_workOrderDetail). Alvo: screen-refs/web/os-detalhe.png.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const cellLabel: CSSProperties = { fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginBottom: 4 };

function InfoCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={cellLabel}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: valueColor ?? "#0F172A" }}>{value}</div>
    </div>
  );
}

export function WorkOrderDetailPage() {
  const navigate = useNavigate();

  return (
    <div style={{ color: "#0F172A" }}>
      <div onClick={() => navigate("/work-orders")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#2563EB", cursor: "pointer", marginBottom: 14 }}>← Voltar às ordens</div>

      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "#FEF9C3", display: "flex", alignItems: "center", justifyContent: "center", color: "#CA8A04", flexShrink: 0 }}><ClipboardList size={22} /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" }}>OS-2891 · Manutenção preventiva</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>Indústria Alfa Ltda · Rua Augusta 1200 · SLA 4h restantes</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "9px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
          <button style={{ padding: "9px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>Reatribuir</button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><ClipboardList size={15} />Abrir checklist</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ borderRight: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ padding: 16 }}>
                  <div style={cellLabel}>Status</div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#EFF6FF", color: "#2563EB" }}>Agendada</span>
                </div>
              </div>
              <div style={{ borderBottom: "1px solid #F1F5F9" }}><InfoCell label="Prioridade" value="Alta · URGENTE" valueColor="#DC2626" /></div>
              <div style={{ borderRight: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}><InfoCell label="Técnico" value="Carla Mendes" /></div>
              <div style={{ borderBottom: "1px solid #F1F5F9" }}><InfoCell label="Agenda" value="13/06 às 10:00" /></div>
              <div style={{ borderRight: "1px solid #F1F5F9" }}><InfoCell label="SLA" value="4h restantes" valueColor="#D97706" /></div>
              <div><InfoCell label="Checklist" value="6 / 8 itens" /></div>
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Cliente e endereço</div>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}><MapPin size={14} />Abrir no mapa</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#2563EB", flexShrink: 0 }}>IA</div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>Indústria Alfa Ltda</div>
                <div style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono', monospace" }}>CNPJ 12.345.678/0001-90</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>Rua Augusta, 1200 · Savassi · Belo Horizonte / MG · CEP 30112-010</div>
          </div>
        </div>

        {/* right — aprovação operacional */}
        <div style={{ ...card, padding: 20, alignSelf: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Aprovação operacional</div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#FFFBEB", color: "#D97706" }}>Aguardando decisão</span>
          </div>
          <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 16, lineHeight: 1.45 }}>Decisão sobre a execução desta OS antes de liberar o faturamento.</div>
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            {[
              { k: "Entidade", v: "work_order · OS-2891" },
              { k: "Pendência", v: "Checklist + evidências" },
              { k: "Solicitado por", v: "Carla Mendes · 09:42" },
            ].map((r, i) => (
              <div key={r.k} style={{ display: "flex", gap: 10, padding: "11px 14px", borderBottom: i < 2 ? "1px solid #F1F5F9" : "none" }}>
                <span style={{ fontSize: 12, color: "#94A3B8", width: 90, flexShrink: 0 }}>{r.k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{r.v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "#059669", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><CheckCircle2 size={16} />Aprovar</button>
            <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "#fff", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}><XCircle size={16} />Reprovar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkOrderDetailPage;
