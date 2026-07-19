import { Download, Filter, Search } from "lucide-react";
import type { CSSProperties } from "react";

// "Auditoria da Plataforma" (sc_auditPlatform). Alvo: screen-refs/web/auditoria-plataforma.png.
// Recriada 1:1 (auditoria de fidelidade §11): 4 KPIs (com "Mudanças de plano" em ROXO = receita, §11.5), header
// com ação primária, e tabela QUANDO/ORGANIZAÇÃO/EVENTO/SEVERIDADE (sem IP cru; severidade Info/Alta/OK como o PNG).

type Sev = "Info" | "Alta" | "OK";
type SevStyle = { bg: string; color: string };
const SEV: Record<Sev, SevStyle> = {
  Info: { bg: "#F5F3FF", color: "#7C3AED" }, // lavanda/roxo
  Alta: { bg: "#FFF7ED", color: "#EA580C" }, // âmbar
  OK: { bg: "#ECFDF5", color: "#059669" }, // verde
};

type AuditRow = { time: string; org: string; event: string; sev: Sev };
const ROWS: AuditRow[] = [
  { time: "12/06 09:41", org: "Field Operations LATAM", event: "Organização suspensa", sev: "Alta" },
  { time: "12/06 09:12", org: "Techsolutions SP", event: "Módulo Analytics habilitado", sev: "Info" },
  { time: "12/06 08:54", org: "AgroMax Cooperativa", event: "Upgrade de plano Pro → Business", sev: "Info" },
  { time: "11/06 22:03", org: "Logística Delta", event: "Impersonação de organização (com auditoria)", sev: "Info" },
  { time: "11/06 18:20", org: "Plataforma", event: "Backup global concluído", sev: "OK" },
  { time: "11/06 16:47", org: "Techsolutions BH", event: "Limite de usuários alterado", sev: "Info" },
];

const cols = "1.2fr 1.8fr 2.6fr 0.9fr";
const th: CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".03em" };
const mono = "'JetBrains Mono', monospace";

type AuditKpi = { label: string; value: string; tone: string };
const KPIS: AuditKpi[] = [
  { label: "Eventos (24h)", value: "1.284", tone: "#2563EB" }, // azul plataforma
  { label: "Organizações ativas", value: "48", tone: "#059669" }, // verde
  { label: "Mudanças de plano", value: "3", tone: "#7C3AED" }, // roxo = receita (§11.5)
  { label: "Incidentes", value: "0", tone: "#059669" }, // verde
];
const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18 };
const secondaryBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" };
const primaryBtn: CSSProperties = { display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" };

export function PlatformAuditPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      {/* header: título + subtítulo + ações à direita (secundário + PRIMÁRIO azul), §11 regra 4 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Auditoria da Plataforma</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>trilha global de eventos da plataforma</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={secondaryBtn}><Filter size={15} />Filtros</button>
          <button style={primaryBtn}><Download size={15} />Exportar</button>
        </div>
      </div>

      {/* 4 KPIs (§11 regra 6, composição completa) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {KPIS.map((k) => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.5px", color: k.tone }}>{k.value}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* tabela: QUANDO / ORGANIZAÇÃO / EVENTO / SEVERIDADE (sem IP cru) */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, width: 320, padding: "8px 12px", background: "#F1F5F9", borderRadius: 9 }}>
            <Search size={15} style={{ color: "#94A3B8" }} /><span style={{ fontSize: 13, color: "#94A3B8" }}>Buscar por organização ou evento…</span>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}><Filter size={14} />Severidade</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: cols, padding: "11px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
          <span style={th}>QUANDO</span><span style={th}>ORGANIZAÇÃO</span><span style={th}>EVENTO</span><span style={{ ...th, textAlign: "right" }}>SEVERIDADE</span>
        </div>
        {ROWS.map((a) => (
          <div key={a.time + a.event} style={{ display: "grid", gridTemplateColumns: cols, padding: "13px 18px", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#64748B", fontFamily: mono }}>{a.time}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.org}</span>
            <span style={{ fontSize: 13, color: "#1E293B" }}>{a.event}</span>
            <span style={{ textAlign: "right" }}><span style={{ background: SEV[a.sev].bg, color: SEV[a.sev].color, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>{a.sev}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlatformAuditPage;
