import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { isPlatformAdmin } from "../navigation/types";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";
import { resolveContextLandingRoute } from "../modules/context/landing-route";

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
    const landing = resolveContextLandingRoute(permissions);
    return <Navigate to={landing ?? "/select-context"} replace />;
  }

  return <>{children}</>;
}
