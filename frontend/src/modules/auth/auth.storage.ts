import type { AuthSession } from "./types";

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

export function clearStoredToken(): void {
  clearStoredAuthSession();
}

function notifyAuthSessionChanged(): void {
  window.dispatchEvent(new Event(authSessionChangedEvent));
}
