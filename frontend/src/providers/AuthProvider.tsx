import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { signInWithCognitoCompatibleProvider } from "../modules/auth/repository";
import type { AuthSession } from "../modules/auth/types";

const authStorageKey = "erp-techsolutions.auth-session";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = window.localStorage.getItem(authStorageKey);
    return stored ? (JSON.parse(stored) as AuthSession) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      async signIn(email, password) {
        const nextSession = await signInWithCognitoCompatibleProvider(email, password);
        window.localStorage.setItem(authStorageKey, JSON.stringify(nextSession));
        setSession(nextSession);
      },
      signOut() {
        window.localStorage.removeItem(authStorageKey);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
