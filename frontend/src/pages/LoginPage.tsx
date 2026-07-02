import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { isMockMode, readFrontendEnv } from "../config/env";
import { isPlatformAdmin } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";

// Login web · alvo: docs/claude-code-handoff/Login.dc.html (card único centrado).

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const useMocks = isMockMode();
  const defaultTenantId = readFrontendEnv("VITE_DEFAULT_TENANT_ID", useMocks ? "ten-industrial-01" : "");
  const [tenantId] = useState(defaultTenantId);
  const [email, setEmail] = useState(useMocks ? "marina.costa@techsolutions.example" : "");
  const [password, setPassword] = useState(useMocks ? "operacao-demo" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function authenticate() {
    setLoading(true);
    setError("");
    try {
      const session = await signIn({ tenantId, email, password });
      navigate(isPlatformAdmin(session.user) ? "/platform/tenants" : "/select-context");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Falha de autenticação. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void authenticate();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "#F1F5F9",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        .lg-input{display:block;width:100%;padding:12px 14px;border:1.5px solid #E2E8F0;border-radius:10px;background:#fff;font-size:14px;color:#0F172A;font-family:inherit;outline:none}
        .lg-input:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
        .lg-input::placeholder{color:#94A3B8}
        @keyframes lg-spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* marca */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7BE084" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21V11" />
                <path d="M12 11c-4 0-7-2.6-7.8-6.4C8 4 11 6 12 9.6" />
                <path d="M12 9.6C13 6 16 4 19.8 4.6 19 8.4 16 11 12 11" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-.3px", whiteSpace: "nowrap" }}>TechSolutions</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#64748B", marginTop: 2 }}>Plataforma de operações de campo</div>
            </div>
          </div>
        </div>

        {/* card */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 36, boxShadow: "0 4px 24px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Entrar</div>
          <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>Acesse sua organização</div>

          {useMocks ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 13px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#D97706", flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E", lineHeight: 1.45 }}>Ambiente de demonstração · dados fictícios. Use qualquer e-mail e senha para entrar.</span>
            </div>
          ) : null}

          {error ? (
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 18 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 6 }}>E-mail corporativo</label>
              <input className="lg-input" type="email" autoComplete="email" placeholder="usuario@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Senha</label>
              <input className="lg-input" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={{ textAlign: "right", marginBottom: 24 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "#2563EB", cursor: "pointer" }}>Esqueci minha senha</span>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: 13, background: "#2563EB", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "#fff", cursor: loading ? "default" : "pointer", fontFamily: "inherit", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {loading ? <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", animation: "lg-spin .7s linear infinite", flexShrink: 0 }} /> : null}
              <span>{loading ? "Entrando…" : "Entrar"}</span>
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
            <span style={{ fontSize: 12.5, color: "#94A3B8", whiteSpace: "nowrap" }}>ou continue com</span>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>

          <button
            type="button"
            onClick={() => void authenticate()}
            style={{ width: "100%", padding: 12, background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 1.5px #E2E8F0", flexShrink: 0, overflow: "hidden", padding: 1 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </span>
            <span>Entrar com Google</span>
          </button>
        </div>
      </div>
    </main>
  );
}
