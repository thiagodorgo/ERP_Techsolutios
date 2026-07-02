import { useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

// "Organização · detalhe" (sc_tenantDetail). Alvo: screen-refs/web/organizacao-detalhe.png.

const TABS = ["Visão Geral", "Usuários", "Endereços", "Módulos"] as const;
type Tab = (typeof TABS)[number];

const STATS = [
  { value: "142", label: "Usuários ativos", color: "#0F172A" },
  { value: "9 / 12", label: "Módulos habilitados", color: "#0F172A" },
  { value: "R$ 12,4k", label: "MRR", color: "#0F172A" },
  { value: "99,9%", label: "Uptime 30d", color: "#059669" },
];

const CONTRACTED = [
  { name: "Estoque", on: true }, { name: "Financeiro", on: true }, { name: "Aprovações", on: true },
  { name: "Pedidos", on: true }, { name: "OS Mobile", on: true }, { name: "RDV", on: true },
  { name: "Analytics", on: false }, { name: "Integrações", on: false },
];

const HEALTH = [
  { label: "Latência média da API", value: "128 ms", color: "#2563EB" },
  { label: "Fila de sync (mobile)", value: "34 ações", color: "#D97706" },
  { label: "Erros 5xx (24h)", value: "0", color: "#0F172A" },
  { label: "Último backup", value: "hoje 03:00", color: "#0F172A" },
];

const USERS = [
  { name: "Marina Costa", email: "marina.costa@tsbh.com.br", role: "Administradora", status: "Ativo" },
  { name: "Rafael Lima", email: "rafael.lima@tsbh.com.br", role: "Gestor Operacional", status: "Ativo" },
  { name: "Bruna Alves", email: "bruna.alves@tsbh.com.br", role: "Operadora", status: "Ativo" },
  { name: "Carlos Nunes", email: "carlos.nunes@tsbh.com.br", role: "Técnico de Campo", status: "Inativo" },
];

const card: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13 };

export function PlatformTenantDetailPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Visão Geral");

  return (
    <div style={{ color: "#0F172A" }}>
      <div onClick={() => navigate("/platform/tenants")} style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", cursor: "pointer", marginBottom: 14 }}>← Voltar ao console</div>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#2563EB", flexShrink: 0 }}>TB</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Techsolutions BH</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>Plano Enterprise · ativo desde mar/2024 · 142 usuários</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ padding: "9px 18px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}>Editar</button>
          <span style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 99, background: "#ECFDF5", border: "1px solid #A7F3D0", fontSize: 13, fontWeight: 700, color: "#059669" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />Saudável
          </span>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: "-.4px" }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ padding: "8px 16px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: tab === t ? "#2563EB" : "transparent", color: tab === t ? "#fff" : "#64748B" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Visão Geral" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Módulos contratados</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CONTRACTED.map((m) => (
                <span key={m.name} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, fontSize: 12.5, fontWeight: 700, background: m.on ? "#ECFDF5" : "#F1F5F9", color: m.on ? "#059669" : "#94A3B8" }}>
                  {m.name}{m.on ? null : " ✕"}
                </span>
              ))}
            </div>
          </div>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Saúde do sistema</div>
            {HEALTH.map((h, i) => (
              <div key={h.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i === HEALTH.length - 1 ? "none" : "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 13, color: "#475569" }}>{h.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: h.color }}>{h.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "Usuários" ? (
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ display: "flex", padding: "9px 18px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9", gap: 10 }}>
            <span style={{ flex: 1.6, fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" }}>USUÁRIO</span>
            <span style={{ flex: 1.4, fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" }}>PERFIL</span>
            <span style={{ flex: 0.6, fontSize: 10.5, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", textAlign: "right" }}>STATUS</span>
          </div>
          {USERS.map((u) => (
            <div key={u.email} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #F8FAFC", gap: 10 }}>
              <div style={{ flex: 1.6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name}</div>
                <div style={{ fontSize: 11.5, color: "#94A3B8" }}>{u.email}</div>
              </div>
              <span style={{ flex: 1.4, fontSize: 13, color: "#475569" }}>{u.role}</span>
              <div style={{ flex: 0.6, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: u.status === "Ativo" ? "#ECFDF5" : "#F1F5F9", color: u.status === "Ativo" ? "#059669" : "#94A3B8" }}>{u.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "Endereços" ? (
        <div style={{ ...card, padding: 20, maxWidth: 520 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Endereço principal</div>
          <div style={{ fontSize: 13.5, color: "#0F172A", lineHeight: 1.6 }}>
            Av. Afonso Pena, 2000 — Centro<br />Belo Horizonte / MG · CEP 30130-007
          </div>
        </div>
      ) : null}

      {tab === "Módulos" ? (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Módulos habilitados</div>
          {CONTRACTED.map((m, i) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i === CONTRACTED.length - 1 ? "none" : "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.name}</span>
              <div style={{ width: 38, height: 22, borderRadius: 99, background: m.on ? "#2563EB" : "#E5E7EB", position: "relative" }}>
                <div style={{ position: "absolute", top: 2, [m.on ? "right" : "left"]: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff" } as CSSProperties} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default PlatformTenantDetailPage;
