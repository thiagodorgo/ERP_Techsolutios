import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { isMockMode } from "../../config/env";
import { getActiveSessions } from "./sessions.service";
import type { SessionsData } from "./sessions.types";
import { emptySessions } from "./sessions.types";

// Ω4C PR-11 — carrega as sessões ativas da organização (GET /sessions, gate sessions:read). Espelha
// useAuditEvents: monta o contexto da sessão/organização, faz a 1ª carga no mount e a cada mudança de
// contexto, e expõe {data,loading,isRefreshing,refresh}. Em modo mock a lista já nasce VAZIA e honesta.
export function useSessions() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<SessionsData>(() => emptySessions(isMockMode() ? "mock" : "api"));
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
      setData(await getActiveSessions(context));
      setLoading(false);
      setIsRefreshing(false);
    },
    [activeContext, context],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sem re-polling quando o gate sessions:read respondeu 403 (mantém a mensagem de acesso negado).
  useAutoRefresh(refresh, { enabled: data.source !== "forbidden" });

  return { data, loading, isRefreshing, refresh };
}
