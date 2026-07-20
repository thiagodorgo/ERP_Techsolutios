import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getAuditEvents } from "./audit-events.service";
import type { AuditEventsData } from "./audit-events.types";
import { emptyAuditEvents } from "./audit-events.types";

// PR-SCALE-3 — carrega a trilha de auditoria da organização ativa (GET /api/v1/audit-events) para a
// tela "Auditoria". Espelha useWorkOrderTimeseries: monta o `context` da sessão/organização, faz a 1ª
// carga no mount e a cada mudança de contexto, e expõe {data,loading,isRefreshing,refresh}. Os eventos
// vêm do backend (o front nunca inventa; D-007). Em modo mock a lista já nasce VAZIA e honesta (sem
// skeleton eterno), refletindo que não há dado real de auditoria no modo demonstração.
export function useAuditEvents() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<AuditEventsData>(() => emptyAuditEvents(isMockMode() ? "mock" : "api"));
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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém a lista atual
  // visível, sem flicker no auto-refresh); só a 1ª carga usa `loading`.
  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;
    if (background) setIsRefreshing(true);
    else setLoading(true);
    setData(await getAuditEvents(context));
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sem re-polling quando o backend já respondeu 403 (gate `audit.read`): mantém a mensagem de acesso
  // negado sem martelar o endpoint proibido a cada ciclo.
  useAutoRefresh(refresh, { enabled: !data.forbidden });

  return { data, loading, isRefreshing, refresh };
}
