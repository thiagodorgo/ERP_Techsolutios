import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { listAvailableContexts, switchTenantContext } from "../modules/context/repository";
import type { TenantContext } from "../modules/context/types";
import { useAuth } from "../providers/AuthProvider";
import { useTenantContext } from "../providers/TenantProvider";

// Seleção de organização (web) · alvo: docs/claude-code-handoff/Login.dc.html
// (login + seleção de organização). Sem termo técnico "tenant" na UI (§3/§11).

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "OR";
}

export function ContextSelectionPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, session } = useAuth();
  const { setActiveContext } = useTenantContext();
  const [contexts, setContexts] = useState<TenantContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  useEffect(() => {
    listAvailableContexts().then((items) => {
      setContexts(items);
      setLoading(false);
    });
  }, [session]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  async function handleActivate(context: TenantContext) {
    if (context.tenantStatus === "blocked") return;
    setActivateError(null);
    setActivating(context.tenantId);
    try {
      if (context.tenantId !== session?.tenant?.id) {
        await switchTenantContext(context.tenantId);
      }
      setActiveContext(context);
      navigate("/dashboard");
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : "Não foi possível acessar a organização.");
      setActivating(null);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#F1F5F9", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* marca */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7BE084" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21V11" /><path d="M12 11c-4 0-7-2.6-7.8-6.4C8 4 11 6 12 9.6" /><path d="M12 9.6C13 6 16 4 19.8 4.6 19 8.4 16 11 12 11" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-.3px" }}>TechSolutions</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#64748B", marginTop: 2 }}>Plataforma de operações de campo</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Selecione a organização</div>
          <div style={{ fontSize: 13.5, color: "#64748B", marginBottom: 22 }}>
            {session?.user.name}{session?.user.email ? ` · ${session.user.email}` : ""}
          </div>

          {activateError ? (
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 16 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{activateError}</span>
            </div>
          ) : null}

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ height: 84, borderRadius: 12, background: "#F1F5F9" }} />
              ))}
            </div>
          ) : null}

          {!loading && contexts.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "#64748B", fontSize: 13.5 }}>
              Nenhuma organização liberada. Solicite acesso ao administrador.
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {contexts.map((context) => {
              const blocked = context.tenantStatus === "blocked";
              const busy = activating === context.tenantId;
              return (
                <button
                  key={`${context.tenantId}-${context.branchId}-${context.role}`}
                  type="button"
                  disabled={blocked || activating !== null}
                  onClick={() => void handleActivate(context)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
                    padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", background: blocked ? "#F8FAFC" : "#fff",
                    cursor: blocked ? "not-allowed" : "pointer", opacity: blocked ? 0.72 : 1, fontFamily: "inherit",
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                    {initials(context.tenantName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{context.tenantName}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: blocked ? "#FEF2F2" : "#ECFDF5", color: blocked ? "#DC2626" : "#059669" }}>
                        {blocked ? "Bloqueada" : "Ativa"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748B" }}>{context.branchName} · {context.role}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: blocked ? "#94A3B8" : "#2563EB", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {busy ? "Acessando…" : blocked ? "Indisponível" : "Acessar →"}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", gap: 9 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#94A3B8", flexShrink: 0, marginTop: 5 }} />
            <span style={{ fontSize: 11.5, color: "#94A3B8", lineHeight: 1.45 }}>
              O acesso e as permissões são definidos pelo seu perfil na organização. A troca de organização é registrada para auditoria.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
