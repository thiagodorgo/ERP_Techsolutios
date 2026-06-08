import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authSessionChangedEvent, getStoredAuthSession } from "../modules/auth/auth.storage";
import { login, logout } from "../modules/auth/auth.service";
import type { AuthSession, LoginCredentials } from "../modules/auth/types";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  signIn: (credentials: LoginCredentials) => Promise<AuthSession>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const syncSession = () => setSession(getStoredAuthSession());

    window.addEventListener(authSessionChangedEvent, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(authSessionChangedEvent, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isLoading: false,
      isAuthenticating,
      async signIn(credentials) {
        setIsAuthenticating(true);
        try {
          const nextSession = await login(credentials);
          setSession(nextSession);
          return nextSession;
        } finally {
          setIsAuthenticating(false);
        }
      },
      signOut() {
        void logout();
        setSession(null);
      },
    }),
    [isAuthenticating, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
