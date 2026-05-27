import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { TenantContext } from "../modules/context/types";

const tenantStorageKey = "erp-techsolutions.active-context";

type TenantContextValue = {
  activeContext: TenantContext | null;
  setActiveContext: (context: TenantContext) => void;
  clearContext: () => void;
};

const TenantContextState = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [activeContext, setStoredActiveContext] = useState<TenantContext | null>(() => {
    const stored = window.localStorage.getItem(tenantStorageKey);
    return stored ? (JSON.parse(stored) as TenantContext) : null;
  });

  const value = useMemo<TenantContextValue>(
    () => ({
      activeContext,
      setActiveContext(context) {
        window.localStorage.setItem(tenantStorageKey, JSON.stringify(context));
        setStoredActiveContext(context);
      },
      clearContext: () => {
        window.localStorage.removeItem(tenantStorageKey);
        setStoredActiveContext(null);
      },
    }),
    [activeContext],
  );

  return <TenantContextState.Provider value={value}>{children}</TenantContextState.Provider>;
}

export function useTenantContext() {
  const context = useContext(TenantContextState);
  if (!context) throw new Error("useTenantContext must be used within TenantProvider");
  return context;
}
