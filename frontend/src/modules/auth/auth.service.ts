import { isMockMode } from "../../config/env";
import { mockSession } from "../../mocks/auth/context";
import { loginWithJwt } from "./auth.adapter";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  getStoredToken,
  setStoredAuthSession,
} from "./auth.storage";
import type { AuthSession, LoginCredentials } from "./types";

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

export function logout(): void {
  clearStoredAuthSession();
}

export function getCurrentAuthState(): AuthSession | null {
  return getStoredAuthSession();
}

export { clearStoredAuthSession, getStoredAuthSession, getStoredToken, setStoredAuthSession };
