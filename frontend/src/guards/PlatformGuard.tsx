import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";

export function PlatformGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { permissions } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!permissions.some((permission) => permission.startsWith("platform:"))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
