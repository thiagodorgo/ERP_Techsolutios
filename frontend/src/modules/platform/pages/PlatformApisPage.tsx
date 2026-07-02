import { Check, Plus, Server } from "lucide-react";
import type { CSSProperties } from "react";

// "APIs e Credenciais" (sc_apis). Alvo: ERP Web.dc.html.

type Api = { name: string; scope: string; dir: string; chip: string; chipBg: string; chipColor: string };

const APIS: Api[] = [
  { name: "API pública REST", scope: "/api/v1 · leitura e escrita", dir: "Saída", chip: "Ativa", chipBg: "#ECFDF5", chipColor: "#059669" },
  { name: "Webhook de eventos", scope: "work_order.* · checklist.*", dir: "Saída", chip: "Ativa", chipBg: "#ECFDF5", chipColor: "#059669" },
  { name: "Integração BI", scope: "export.analytics.daily", dir: "Saída", chip: "Ativa", chipBg: "#ECFDF5", chipColor: "#059669" },
  { name: "OCR de recibos", scope: "mobile.ocr.scan", dir: "Entrada", chip: "Ativa", chipBg: "#ECFDF5", chipColor: "#059669" },
  { name: "Gateway de pagamento", scope: "billing.charges", dir: "Entrada", chip: "Rotacionar", chipBg: "#FFFBEB", chipColor: "#D97706" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };
const mono = "'JetBrains Mono', monospace";

function Step({ done, current, n, title, hash }: { done?: boolean; current?: boolean; n: number; title: string; hash?: string }) {
  const bg = done ? "#10B981" : current ? "#2563EB" : "#E2E8F0";
  const color = done || current ? "#fff" : "#94A3B8";
  return (
    <div style={{ display: "flex", gap: 11, paddingBottom: n === 4 ? 0 : 14 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 11, fontWeight: 800 }}>
          {done ? <Check size={13} /> : n}
        </div>
        {n < 4 ? <div style={{ flex: 1, width: 1.5, background: "#E2E8F0", marginTop: 2 }} /> : null}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: done || current ? "#0F172A" : "#94A3B8" }}>{title}</div>
        {hash ? <div style={{ fontSize: 11.5, color: "#94A3B8", fontFamily: mono }}>{hash}</div> : null}
      </div>
    </div>
  );
}

export function PlatformApisPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>APIs e Credenciais</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>chaves, integrações e credenciais da plataforma, BI e automações</div>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}><Plus size={15} />Nova credencial</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "15px 18px", borderBottom: "1px solid #F1F5F9", fontSize: 15, fontWeight: 800 }}>Catálogo de APIs</div>
          {APIS.map((a) => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flexShrink: 0 }}><Server size={17} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8", fontFamily: mono }}>{a.scope}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", background: "#F1F5F9", padding: "3px 9px", borderRadius: 99 }}>{a.dir}</span>
              <span style={{ background: a.chipBg, color: a.chipColor, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>{a.chip}</span>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Prova blockchain</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16, lineHeight: 1.45 }}>O secret não vai para a blockchain — guardamos fingerprint/hash com salt e trilha auditável.</div>
          <Step done n={1} title="1. KMS/HSM gera secret" />
          <Step done n={2} title="2. Hash + fingerprint" />
          <Step current n={3} title="3. Anchor no ledger" hash="hash 0x9f2a…c81e" />
          <Step n={4} title="4. Tx/prova auditável" />
        </div>
      </div>
    </div>
  );
}

export default PlatformApisPage;
