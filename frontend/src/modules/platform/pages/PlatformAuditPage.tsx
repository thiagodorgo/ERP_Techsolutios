import { Download, Filter, Search } from "lucide-react";
import type { CSSProperties } from "react";

// "Auditoria Global" (sc_auditPlatform). Alvo: ERP Web.dc.html.

type AuditRow = { time: string; actor: string; action: string; target: string; ip: string; sev: string; sevBg: string; sevColor: string };

const ROWS: AuditRow[] = [
  { time: "12/06 09:41", actor: "Admin Plataforma", action: "Suspendeu organização", target: "Field Operations LATAM", ip: "200.145.12.7", sev: "Crítico", sevBg: "#FEF2F2", sevColor: "#DC2626" },
  { time: "12/06 09:12", actor: "Marina Costa", action: "Ativou módulo Analytics", target: "Techsolutions SP", ip: "187.22.4.109", sev: "Alto", sevBg: "#FFF7ED", sevColor: "#EA580C" },
  { time: "12/06 08:54", actor: "Sistema", action: "Rotação de credencial de API", target: "Integração BI", ip: "10.0.3.44", sev: "Médio", sevBg: "#FFFBEB", sevColor: "#D97706" },
  { time: "11/06 22:03", actor: "Admin Plataforma", action: "Impersonou organização", target: "AgroMax Cooperativa", ip: "200.145.12.7", sev: "Alto", sevBg: "#FFF7ED", sevColor: "#EA580C" },
  { time: "11/06 18:20", actor: "Rafael Lima", action: "Alterou limite de usuários", target: "Logística Delta", ip: "191.5.88.2", sev: "Médio", sevBg: "#FFFBEB", sevColor: "#D97706" },
  { time: "11/06 16:47", actor: "Sistema", action: "Backup concluído", target: "Cluster produção", ip: "10.0.1.10", sev: "Baixo", sevBg: "#ECFDF5", sevColor: "#059669" },
];

const cols = "1.2fr 1.2fr 2fr 1.4fr 1fr 0.8fr";
const th: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em" };
const mono = "'JetBrains Mono', monospace";

export function PlatformAuditPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Auditoria Global</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>eventos críticos, trilhas de acesso e alterações sensíveis</div>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}><Download size={15} />Exportar logs</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, width: 300, padding: "8px 12px", background: "#F1F5F9", borderRadius: 9 }}>
            <Search size={15} style={{ color: "#94A3B8" }} /><span style={{ fontSize: 13, color: "#94A3B8" }}>Buscar por ator, ação ou organização…</span>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><Filter size={14} />Severidade</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: cols, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
          <span style={th}>QUANDO</span><span style={th}>ATOR</span><span style={th}>AÇÃO</span><span style={th}>ALVO</span><span style={th}>IP</span><span style={{ ...th, textAlign: "right" }}>SEVERIDADE</span>
        </div>
        {ROWS.map((a) => (
          <div key={a.time + a.action} style={{ display: "grid", gridTemplateColumns: cols, padding: "13px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#64748B", fontFamily: mono }}>{a.time}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.actor}</span>
            <span style={{ fontSize: 13, color: "#1E293B" }}>{a.action}</span>
            <span style={{ fontSize: 13, color: "#475569" }}>{a.target}</span>
            <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: mono }}>{a.ip}</span>
            <span style={{ textAlign: "right" }}><span style={{ background: a.sevBg, color: a.sevColor, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>{a.sev}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlatformAuditPage;
