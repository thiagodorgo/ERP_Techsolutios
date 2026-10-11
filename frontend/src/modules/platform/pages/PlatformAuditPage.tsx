import { ClipboardList } from "lucide-react";
import type { CSSProperties } from "react";

export const PLATFORM_HONEST_STOP = true;
const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

export function PlatformAuditPage() {
  return <div style={{ color: "#0F172A" }}><div style={{ marginBottom: 18 }}><div style={{ fontSize: 20, fontWeight: 800 }}>Auditoria da Plataforma</div><div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>trilha global de eventos da plataforma</div></div><div style={{ ...card, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 13 }}><div style={{ width: 54, height: 54, borderRadius: 14, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}><ClipboardList size={27} /></div><div style={{ fontSize: 17, fontWeight: 800 }}>Trilha global ainda sem fonte</div><p style={{ maxWidth: 590, margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#475569" }}>A plataforma ainda não oferece uma consulta consolidada de auditoria entre organizações. A auditoria por organização continua disponível dentro do respectivo contexto. Esta tela permanece sem indicadores ou eventos até existir uma fonte global real.</p></div></div>;
}

export default PlatformAuditPage;
