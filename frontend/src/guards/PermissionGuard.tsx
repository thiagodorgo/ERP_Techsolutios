import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { ErrorState } from "../components/ui";
import { useAuth } from "../providers/AuthProvider";
import { usePermissions } from "../providers/PermissionProvider";

export function PermissionGuard({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: string[];
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasAny } = usePermissions();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAny(permissions)) {
    return (
      <ErrorState
        title="Acesso nao autorizado"
        detail="Seu usuario nao possui permissao para visualizar esta area."
      />
    );
  }

  return <>{children}</>;
}
