import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useAuth } from "./AuthProvider";
import { useTenantContext } from "./TenantProvider";

type PermissionContextValue = {
  can: (permission: string) => boolean;
  permissions: string[];
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();

  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions: [...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])])],
      can(permission) {
        return (session?.user.permissions.includes(permission) || activeContext?.permissions.includes(permission)) ?? false;
      },
    }),
    [activeContext, session],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error("usePermissions must be used within PermissionProvider");
  return context;
}
