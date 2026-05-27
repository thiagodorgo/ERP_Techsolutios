import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { DomainRail, SecurityNotice } from "../components/erp";
import { Button, Card, Input, PasswordInput } from "../components/ui";
import { useAuth } from "../providers/AuthProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("marina.costa@techsolutions.example");
  const [password, setPassword] = useState("operacao-demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      navigate("/select-context");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Falha de autenticacao");
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
