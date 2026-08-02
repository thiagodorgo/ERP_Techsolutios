import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { listCustodyHistory } from "./processes.service";
import type { CustodyHistoryItem } from "./processes.types";

// Ω-VID PR-09 — hook da aba "Histórico de Custódias". Carrega GET /impound-processes/:id/custody-history (impound:read,
// a mesma do dossiê — sem gate extra). Auto-atualiza em segundo plano (uma nova custódia do mesmo veículo pode abrir
// enquanto o dossiê está aberto). 404 → [] (processo desatualizado). O processo atual sempre volta na lista
// (`isCurrent`), então o histórico tem no mínimo 1 item quando o processo existe.
export function useCustodyHistory(processId: string | undefined, enabled = true) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("impound:read");

  const [items, setItems] = useState<CustodyHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const active = Boolean(enabled && processId && activeContext && canRead);

  const reload = useCallback(
    async (background = false) => {
      if (!active || !processId) return;
      if (!background) setLoading(true);
      setError(null);
      try {
        const next = await listCustodyHistory(context, processId);
        setItems(next);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setItems([]);
        } else {
          setError("Não foi possível carregar o histórico de custódias.");
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [active, processId, context],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(reload, { enabled: active });

  return { items, loading, error, loaded, reload };
}
