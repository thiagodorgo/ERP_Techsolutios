import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { UserRole } from "../modules/auth/types";
import type { TenantContext } from "../modules/context/types";
import { isPlatformAdmin } from "../navigation/types";
import { useAuth } from "./AuthProvider";
import { useTenantContext } from "./TenantProvider";

type PermissionContextValue = {
  can: (permission: string) => boolean;
  hasAny: (permissions: readonly string[]) => boolean;
  permissions: string[];
  roles: UserRole[];
  activeContext: TenantContext | null;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();

  const value = useMemo<PermissionContextValue>(
    () => {
      const permissions = [...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])])];
      const roles = [...new Set([...(session?.user.roles ?? []), ...(activeContext ? [activeContext.role] : [])])];

      return {
        permissions,
        roles,
        activeContext,
        can(permission) {
          return permissions.includes(permission) || isPlatformAdmin({ roles, permissions });
        },
        hasAny(requiredPermissions) {
          return requiredPermissions.some((permission) => permissions.includes(permission)) || isPlatformAdmin({ roles, permissions });
        },
      };
    },
    [activeContext, session],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error("usePermissions must be used within PermissionProvider");
  return context;
}
