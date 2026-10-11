import { ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

export const PLATFORM_HONEST_STOP = true;
const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14 };

export function PlatformSettingsPage() {
  return <div style={{ color: "#0F172A" }}><div style={{ marginBottom: 18 }}><div style={{ fontSize: 20, fontWeight: 800 }}>Configurações da Plataforma</div><div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>governança global do serviço</div></div><div style={{ ...card, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 13 }}><div style={{ width: 54, height: 54, borderRadius: 14, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldCheck size={27} /></div><div style={{ fontSize: 17, fontWeight: 800 }}>Configurações globais ainda sem fonte</div><p style={{ maxWidth: 590, margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#475569" }}>Ainda não existe configuração persistida para autenticação adicional, retenção ou modos globais de operação. Nenhum controle aparece ligado e nenhuma alteração é oferecida enquanto o backend não for a autoridade desses valores.</p></div></div>;
}

export default PlatformSettingsPage;
