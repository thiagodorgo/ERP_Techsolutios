import { ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

// "Configurações da Plataforma" (sc_platformSettings). Alvo: ERP Web.dc.html.

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20 };

function Toggle({ on }: { on: boolean }) {
  return (
    <div style={{ width: 38, height: 22, borderRadius: 99, background: on ? "#2563EB" : "#E5E7EB", position: "relative", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, [on ? "right" : "left"]: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" } as CSSProperties} />
    </div>
  );
}

function Line({ title, meta, right }: { title: string; meta: string; right: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #F1F5F9" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F172A" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "#94A3B8" }}>{meta}</div>
      </div>
      {right}
    </div>
  );
}

function Pill({ text, bg, color }: { text: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>{text}</span>;
}

export function PlatformSettingsPage() {
  return (
    <div style={{ color: "#0F172A" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Configurações da Plataforma</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>governança global do SaaS</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Segurança e acesso</div>
          <Line title="MFA obrigatório para admins" meta="platform_admin e tenant_admin" right={<Toggle on />} />
          <Line title="Auditoria de operações críticas" meta="suspensão, módulos, credenciais" right={<Toggle on />} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Retenção de logs</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8" }}>365 dias</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>365 dias</span>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Modos de operação</div>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE", display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 12 }}>
            <ShieldCheck size={16} style={{ color: "#2563EB", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: "#1D4ED8", lineHeight: 1.45 }}>Administrador SaaS pode operar todos os modos (plataforma, organização, campo) com auditoria.</div>
          </div>
          <Line title="Modo plataforma" meta="" right={<Pill text="Ativo" bg="#ECFDF5" color="#059669" />} />
          <Line title="Impersonar organização" meta="" right={<Pill text="Com auditoria" bg="#FFFBEB" color="#D97706" />} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
            <span style={{ fontSize: 13.5 }}>Tema visual</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Light / Dark / Vivid</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button style={{ padding: "11px 18px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
        <button style={{ padding: "11px 20px", background: "#2563EB", border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Salvar alterações</button>
      </div>
    </div>
  );
}

export default PlatformSettingsPage;
