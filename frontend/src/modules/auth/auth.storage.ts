import type { AuthSession } from "./types";
import type { AuthTokenUpdate } from "./types";

export const authSessionStorageKey = "erp-techsolutions.auth-session";
export const authSessionChangedEvent = "erp-techsolutions.auth-session-changed";
export const tenantContextClearedEvent = "erp-techsolutions.tenant-context-cleared";
const tenantContextStorageKey = "erp-techsolutions.active-context";

export function getStoredAuthSession(): AuthSession | null {
  const stored = window.localStorage.getItem(authSessionStorageKey);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function setStoredAuthSession(session: AuthSession): void {
  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
  notifyAuthSessionChanged();
}

export function clearStoredAuthSession(): void {
  window.localStorage.removeItem(authSessionStorageKey);
  window.localStorage.removeItem(tenantContextStorageKey);
  notifyAuthSessionChanged();
  window.dispatchEvent(new Event(tenantContextClearedEvent));
}

export function getStoredToken(): string | null {
  return getStoredAuthSession()?.accessToken ?? null;
}

export function getStoredRefreshToken(): string | null {
  return getStoredAuthSession()?.refreshToken ?? null;
}

export function setStoredToken(token: string): void {
  const session = getStoredAuthSession();

  if (!session) {
    return;
  }

  setStoredAuthSession({
    ...session,
    accessToken: token,
  });
}

export function updateStoredAuthTokens(tokens: AuthTokenUpdate): AuthSession | null {
  const session = getStoredAuthSession();

  if (!session) {
    return null;
  }

  const nextSession: AuthSession = {
    ...session,
    accessToken: tokens.accessToken,
    tokenType: tokens.tokenType,
    expiresAt: tokens.expiresAt,
    refreshToken: tokens.refreshToken ?? session.refreshToken,
    refreshExpiresAt: tokens.refreshExpiresAt ?? session.refreshExpiresAt,
    sessionId: tokens.sessionId ?? session.sessionId,
  };

  setStoredAuthSession(nextSession);

  return nextSession;
}

export function clearStoredToken(): void {
  clearStoredAuthSession();
}

function notifyAuthSessionChanged(): void {
  window.dispatchEvent(new Event(authSessionChangedEvent));
}
