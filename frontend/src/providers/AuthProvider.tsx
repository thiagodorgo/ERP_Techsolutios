import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authSessionChangedEvent, getStoredAuthSession } from "../modules/auth/auth.storage";
import { login, logout } from "../modules/auth/auth.service";
import type { AuthSession, LoginCredentials } from "../modules/auth/types";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  // B-USERS-ACESSO-SEG (T1) — sessão da senha provisória: só a troca de senha abre.
  passwordChangeRequired: boolean;
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
      // B-USERS-ACESSO-SEG (T1, RQ-1) — a propriedade num ponto só: a sessão RESTRITA (`mustChangePassword === true`) não
      // conta como autenticada, e os 4 portões de tela (AppShell, ContextSelectionPage, PermissionGuard, PlatformGuard),
      // que leem este booleano, a mandam para /login, que a leva à troca de senha. Sessão guardada sem o campo é inteira.
      // Quem decide é o backend (P-SESSAO-RESTRITA); aqui a web só molda a navegação.
      isAuthenticated: !!session && session.mustChangePassword !== true,
      passwordChangeRequired: !!session && session.mustChangePassword === true,
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
