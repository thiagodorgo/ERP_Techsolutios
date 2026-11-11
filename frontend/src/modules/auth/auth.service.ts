import { isMockMode } from "../../config/env";
import { mockSession, mockSessionForEmail } from "../../mocks/auth/context";
import {
  changePasswordWithJwt,
  loginWithJwt,
  logoutWithJwt,
  PasswordChangeError,
  refreshWithJwt,
  type PasswordChangeInput,
} from "./auth.adapter";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  getStoredRefreshToken,
  getStoredToken,
  setStoredAuthSession,
  updateStoredAuthTokens,
} from "./auth.storage";
import type { AuthSession, LoginCredentials } from "./types";

let refreshPromise: Promise<AuthSession> | undefined;

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  if (isMockMode()) {
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    if (!credentials.email || !credentials.password) {
      throw new Error("Credenciais obrigatórias");
    }

    // Perfil (plataforma/gestor/despacho/financeiro/admin/auditor) resolvido pelo e-mail.
    const session = mockSessionForEmail(credentials.email);
    setStoredAuthSession(session);
    return session;
  }

  const session = await loginWithJwt(credentials);
  setStoredAuthSession(session);

  return session;
}

export async function refreshSession(): Promise<AuthSession> {
  if (isMockMode()) {
    // Mantém o perfil logado (não reverte para o usuário padrão).
    const current = getStoredAuthSession() ?? mockSession;
    setStoredAuthSession(current);
    return current;
  }

  refreshPromise ??= refreshStoredSession().finally(() => {
    refreshPromise = undefined;
  });

  return refreshPromise;
}

export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  clearStoredAuthSession();

  if (!isMockMode() && refreshToken) {
    try {
      await logoutWithJwt(refreshToken);
    } catch {
      // Local logout must succeed even if the backend session is already gone.
    }
  }
}

/**
 * B-USERS-ACESSO-SEG (T1) — a pessoa troca a própria senha provisória. UMA requisição por tentativa (RQ-6: o adaptador
 * chama `fetch` direto, sem o refresh automático do cliente padrão). No 200 o backend revoga TODAS as sessões do par:
 * a sessão local é apagada aqui e a pessoa entra de novo com a senha nova. `onChanged` roda no MESMO passo, logo antes
 * de apagar, para a tela marcar o aviso no mesmo lote de renderização em que a sessão some. As senhas só passam por
 * memória: nada é gravado no navegador nem em log.
 */
export async function changeOwnPassword(
  input: PasswordChangeInput,
  options: { readonly onChanged?: () => void } = {},
): Promise<void> {
  const accessToken = getStoredToken();

  if (!accessToken) {
    throw new PasswordChangeError("session_expired");
  }

  await changePasswordWithJwt(accessToken, input);
  options.onChanged?.();
  clearStoredAuthSession();
}

export function getCurrentAuthState(): AuthSession | null {
  return getStoredAuthSession();
}

async function refreshStoredSession(): Promise<AuthSession> {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    clearStoredAuthSession();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    const tokens = await refreshWithJwt(refreshToken);
    const session = updateStoredAuthTokens(tokens);

    if (!session) {
      throw new Error("Sessão local ausente.");
    }

    return session;
  } catch (error) {
    clearStoredAuthSession();
    throw error;
  }
}

export { clearStoredAuthSession, getStoredAuthSession, getStoredToken, setStoredAuthSession };
