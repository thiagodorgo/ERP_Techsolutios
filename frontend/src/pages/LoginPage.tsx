import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { DomainRail, SecurityNotice } from "../components/erp";
import { Button, Card, Input, PasswordInput } from "../components/ui";
import { isPlatformAdmin } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";

const useMocks = import.meta.env.VITE_USE_MOCKS === "true";
const defaultTenantId = import.meta.env.VITE_DEFAULT_TENANT_ID ?? (useMocks ? "ten-industrial-01" : "");

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [tenantId, setTenantId] = useState(defaultTenantId);
  const [email, setEmail] = useState(useMocks ? "marina.costa@techsolutions.example" : "");
  const [password, setPassword] = useState(useMocks ? "operacao-demo" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await signIn({
        tenantId,
        email,
        password,
      });

      navigate(isPlatformAdmin(session.user) ? "/platform/tenants" : "/select-context");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Falha de autenticacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <span>ERP Techsolutions</span>
          <h1>Console operacional</h1>
          <p>Ordens de servico, SLA, despacho, auditoria e controle por tenant em uma base corporativa.</p>
        </div>
        <DomainRail />
      </section>
      <Card title="W01 Login">
        <form className="auth-form" onSubmit={handleSubmit}>
          <SecurityNotice />
          {!useMocks ? (
            <Input label="Tenant ID" value={tenantId} onChange={(event) => setTenantId(event.target.value)} autoComplete="organization" />
          ) : null}
          <Input label="E-mail corporativo" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          <PasswordInput label="Senha" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          {error ? <p className="form-error">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Autenticando..." : "Entrar"}
          </Button>
          <button className="text-action" type="button">Recuperar acesso</button>
        </form>
      </Card>
    </main>
  );
}
