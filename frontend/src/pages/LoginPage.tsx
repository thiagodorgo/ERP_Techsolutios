import { useState } from "react";
import type { FormEvent } from "react";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { PATIOSUL_LOGO_ALT, PATIOSUL_LOGO_LOGIN, PATIOSUL_LOGO_LOGIN_ESCURO, PATIOSUL_NOME, PATIOSUL_SLOGAN } from "../brand/patiosul";
import { PasswordInput } from "../components/ui";
import { isMockMode, readFrontendEnv } from "../config/env";
import { PASSWORD_CHANGE_MESSAGES, PASSWORD_CHANGED_NOTICE } from "../modules/auth/auth.adapter";
import type { AuthSession } from "../modules/auth/types";
import { isPlatformAdmin } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import type { LoginNotice } from "./ChangePasswordPage";

// Login web · alvo: docs/claude-code-handoff/Login.dc.html (card único centrado).

/**
 * B-USERS-ACESSO-SEG (T1) — o desvio da sessão restrita, num ponto só (RQ-1: o mesmo teste `=== true` da rota
 * /change-password): quem entra com a senha provisória, ou chega aqui com essa sessão, vai para a troca de senha.
 */
function isPasswordChangeSession(session: AuthSession | null): boolean {
  return session?.mustChangePassword === true;
}

/** O aviso que a troca de senha deixa no estado da navegação (nunca na URL). */
function readLoginNotice(state: unknown): LoginNotice | null {
  const notice = state && typeof state === "object" ? (state as { aviso?: unknown }).aviso : undefined;
  return notice === "senha-alterada" || notice === "sessao-expirada" ? notice : null;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session: currentSession, signIn } = useAuth();
  const useMocks = isMockMode();
  const defaultTenantId = readFrontendEnv("VITE_DEFAULT_TENANT_ID", useMocks ? "ten-industrial-01" : "");
  const [tenantId] = useState(defaultTenantId);
  const [email, setEmail] = useState(useMocks ? "marina.costa@techsolutions.example" : "");
  const [password, setPassword] = useState(useMocks ? "operacao-demo" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<LoginNotice | null>(() => readLoginNotice(location.state));

  async function authenticate() {
    setLoading(true);
    setError("");
    setNotice(null);
    try {
      const session = await signIn({ tenantId, email, password });
      if (isPasswordChangeSession(session)) {
        navigate("/change-password", { replace: true });
        return;
      }
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

  if (isPasswordChangeSession(currentSession)) return <Navigate to="/change-password" replace />;

  return (
    <main className="ps-login">
      {/* B-MARCA-LOGIN-SIDEBAR (fatia L) — alvo: docs/claude-code-handoff/screen-refs/login-patiosul.reference.html, nas 3 cores.
          A cor é o `data-tema` do elemento raiz (theme.boot.ts); esta tela só usa os tokens `--ps-*` (styles/marca.css). */}
      <section className="ps-login__marca" aria-label="Marca do sistema">
        <span className="ps-login__brasa" aria-hidden="true" />
        <img className="ps-login__logo ps-login__logo--amarelo" src={PATIOSUL_LOGO_LOGIN} width={709} height={259} alt={PATIOSUL_LOGO_ALT} />
        <img className="ps-login__logo ps-login__logo--escuro" src={PATIOSUL_LOGO_LOGIN_ESCURO} width={709} height={258} alt={PATIOSUL_LOGO_ALT} />
        <div className="ps-login__texto">
          <p className="ps-login__nome">{PATIOSUL_NOME}</p>
          <p className="ps-login__frase">{PATIOSUL_SLOGAN}</p>
        </div>
        <span className="ps-login__filete" aria-hidden="true" />
      </section>

      <div className="ps-login__entrada">
        <div className="ps-login__cartao">
          <h1 className="ps-login__titulo">Entrar</h1>
          <p className="ps-login__sub">Acesse sua organização</p>

          {useMocks ? (
            <div className="ps-login__faixa ps-login__faixa--aviso" data-faixa="demonstracao">
              <TriangleAlert size={16} aria-hidden="true" />
              <p>Ambiente de demonstração · dados fictícios. Use qualquer e-mail e senha para entrar.</p>
            </div>
          ) : null}

          {/* B-USERS-ACESSO-SEG (T1) — os avisos da troca de senha, agora nas faixas da marca. */}
          {notice === "senha-alterada" ? (
            <div role="status" data-aviso="senha-alterada" className="ps-login__faixa ps-login__faixa--ok">
              <CircleCheck size={16} aria-hidden="true" />
              <p>{PASSWORD_CHANGED_NOTICE}</p>
            </div>
          ) : null}
          {notice === "sessao-expirada" ? (
            <div role="alert" data-aviso="sessao-expirada" className="ps-login__faixa">
              <CircleAlert size={16} aria-hidden="true" />
              <p>{PASSWORD_CHANGE_MESSAGES.session_expired}</p>
            </div>
          ) : null}

          {error ? (
            <div role="alert" data-faixa="erro" className="ps-login__faixa">
              <CircleAlert size={16} aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          <form className="ps-login__form" onSubmit={handleSubmit}>
            <div className="ps-login__campo">
              <label className="ps-login__rotulo" htmlFor="login-email">
                E-mail
              </label>
              <input
                id="login-email"
                className="ps-login__input"
                type="email"
                autoComplete="email"
                placeholder="usuario@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="ps-login__campo">
              <PasswordInput
                label="Senha"
                id="login-password"
                className="ps-login__input"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <ForgotPasswordHint />
            <button type="submit" className="ps-login__botao" disabled={loading} aria-busy={loading ? true : undefined}>
              {loading ? <span className="ps-login__giro" aria-hidden="true" /> : null}
              <span>{loading ? "Entrando…" : "Entrar"}</span>
            </button>
          </form>

          <p className="ps-login__rodape">© {PATIOSUL_NOME}</p>
        </div>
      </div>
    </main>
  );
}

/**
 * "Esqueci minha senha" (plano do B-MARCA-LOGIN-SIDEBAR, seção 6.2, passo 6): um botão com foco e 44 px de alvo que abre,
 * logo abaixo, o recado da maquete aprovada. Não navega e não chama o servidor: não existe recuperação de senha por e-mail.
 */
function ForgotPasswordHint() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ps-login__linha-link">
        <button
          type="button"
          className="ps-login__esqueci"
          aria-expanded={open}
          aria-controls="login-esqueci-recado"
          onClick={() => setOpen((value) => !value)}
        >
          Esqueci minha senha
        </button>
      </div>
      <p id="login-esqueci-recado" className="ps-login__nota" role="status" hidden={!open}>
        Peça ao administrador da sua organização para redefinir o seu acesso. Você recebe uma senha provisória e cria uma nova no
        primeiro acesso.
      </p>
    </>
  );
}
