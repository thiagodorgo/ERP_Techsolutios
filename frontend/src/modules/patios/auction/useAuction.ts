import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { getAuction } from "./auction.service";
import type { AuctionView } from "./auction.types";

// Hook do leilão do processo. GET /impound-processes/:id/auction (impound:read) + auto-refresh em segundo plano
// (a diária corre e o estado do certame muda por ação de outro operador). 404 process_not_found → null (EmptyState
// honesto). D-007: mock → null. O SIGILO art. 28 é do backend (o DTO omite appraisal/min_bid sem auction:appraise).
export function useAuction(processId: string | undefined) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("impound:read");

  const [auction, setAuction] = useState<AuctionView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  const reload = useCallback(
    async (background = false) => {
      if (!processId || !activeContext || !canRead) return;
      if (!background) setLoading(true);
      setError(null);
      try {
        const view = await getAuction(context, processId);
        setAuction(view);
        setDenied(false);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setDenied(true);
        } else {
          setError("Não foi possível carregar o leilão deste processo.");
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [processId, activeContext, canRead, context],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(reload, { enabled: Boolean(processId && activeContext && canRead) });

  return { auction, loading, error, denied: denied || !canRead, loaded, reload };
}
