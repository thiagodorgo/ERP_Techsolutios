import { isMockMode } from "../../config/env";
import { mockSession } from "../../mocks/auth/context";
import { loginWithJwt, logoutWithJwt, refreshWithJwt } from "./auth.adapter";
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
      throw new Error("Credenciais obrigatorias");
    }

    setStoredAuthSession(mockSession);
    return mockSession;
  }

  const session = await loginWithJwt(credentials);
  setStoredAuthSession(session);

  return session;
}

export async function refreshSession(): Promise<AuthSession> {
  if (isMockMode()) {
    setStoredAuthSession(mockSession);
    return mockSession;
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

export function getCurrentAuthState(): AuthSession | null {
  return getStoredAuthSession();
}

async function refreshStoredSession(): Promise<AuthSession> {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    clearStoredAuthSession();
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  try {
    const tokens = await refreshWithJwt(refreshToken);
    const session = updateStoredAuthTokens(tokens);

    if (!session) {
      throw new Error("Sessao local ausente.");
    }

    return session;
  } catch (error) {
    clearStoredAuthSession();
    throw error;
  }
}

export { clearStoredAuthSession, getStoredAuthSession, getStoredToken, setStoredAuthSession };
