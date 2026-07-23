import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { isMockMode } from "../../config/env";
import { getAccessHistory } from "./sessions.service";
import type { AccessData } from "./sessions.types";
import { emptyAccesses } from "./sessions.types";

// Ω4C PR-11 — carrega o histórico de acessos (último login por usuário) da organização
// (GET /sessions/access-history, gate audit.read). Derivado de auth_sessions.created_at (D-Ω4C-ACESSO-SOURCE).
export function useAccessHistory() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<AccessData>(() => emptyAccesses(isMockMode() ? "mock" : "api"));
  const [loading, setLoading] = useState(!isMockMode());
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const refresh = useCallback(
    async (background = false) => {
      if (!activeContext) return;
      if (background) setIsRefreshing(true);
      else setLoading(true);
      setData(await getAccessHistory(context));
      setLoading(false);
      setIsRefreshing(false);
    },
    [activeContext, context],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useAutoRefresh(refresh, { enabled: data.source !== "forbidden" });

  return { data, loading, isRefreshing, refresh };
}
