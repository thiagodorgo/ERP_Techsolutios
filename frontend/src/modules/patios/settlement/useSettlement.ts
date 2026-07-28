import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { getSettlement } from "./settlement.service";
import type { SettlementAllocationDto, SettlementDto } from "./settlement.types";

// Hook da liquidação do processo. GET /impound-processes/:id/auction/settlement (impound:read) + auto-refresh em
// segundo plano (o ciclo do saldo pode mudar por ação de outro operador). 404 settlement_not_found → null (EmptyState
// honesto: "Liquidação ainda não distribuída"). D-007: mock → null. `enabled` evita o GET (e o 404) quando não há
// liquidação possível (só AUCTION_CLOSED distribui) — a liquidação é registro sobre AUCTION_CLOSED.
export function useSettlement(processId: string | undefined, enabled: boolean) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("impound:read");

  const [settlement, setSettlement] = useState<SettlementDto | null>(null);
  const [allocations, setAllocations] = useState<SettlementAllocationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const active = Boolean(processId && activeContext && canRead && enabled);

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
      if (!processId || !activeContext || !canRead || !enabled) return;
      if (!background) setLoading(true);
      setError(null);
      try {
        const view = await getSettlement(context, processId);
        setSettlement(view?.settlement ?? null);
        setAllocations(view ? [...view.allocations] : []);
        setDenied(false);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setDenied(true);
        } else {
          setError("Não foi possível carregar a liquidação deste processo.");
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [processId, activeContext, canRead, enabled, context],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(reload, { enabled: active });

  return { settlement, allocations, loading, error, denied: denied || !canRead, loaded, reload };
}
