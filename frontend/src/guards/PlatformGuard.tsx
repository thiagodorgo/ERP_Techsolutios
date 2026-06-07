import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { isPlatformAdmin } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";

export function PlatformGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { permissions, roles } = usePermissions();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isPlatformAdmin({ permissions, roles })) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
