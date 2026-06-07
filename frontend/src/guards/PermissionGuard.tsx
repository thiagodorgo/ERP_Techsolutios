import type { ReactNode } from "react";

import { ErrorState } from "../components/ui";
import { usePermissions } from "../providers/PermissionProvider";

export function PermissionGuard({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: string[];
}) {
  const { can } = usePermissions();

  if (!permissions.some(can)) {
    return (
      <ErrorState
        title="Acesso nao autorizado"
        detail="Seu usuario nao possui permissao para visualizar esta area."
      />
    );
  }

  return <>{children}</>;
}
