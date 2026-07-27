import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { getRelease } from "./release.service";
import type { ReleaseCheckDto, ReleaseDto } from "./release.types";

// Hook da liberação em curso. GET /impound-processes/:id/release (impound:read) + auto-refresh em segundo plano
// (a diária acumula por job; o dossiê muda mesmo sem ação do operador). 404 release_not_found → null (EmptyState
// honesto: "Nenhuma liberação em andamento"). D-007: mock → null.
export function useRelease(processId: string | undefined) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("impound:read");

  const [release, setRelease] = useState<ReleaseDto | null>(null);
  const [checks, setChecks] = useState<ReleaseCheckDto[]>([]);
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
        const view = await getRelease(context, processId);
        setRelease(view?.data ?? null);
        setChecks(view?.checks ?? []);
        setDenied(false);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setDenied(true);
        } else {
          setError("Não foi possível carregar a liberação deste processo.");
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

  return { release, checks, loading, error, denied: denied || !canRead, loaded, reload };
}
