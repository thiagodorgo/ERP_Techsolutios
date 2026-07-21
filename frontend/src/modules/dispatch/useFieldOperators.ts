import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getLatestFieldLocations } from "../operations/map/operations-map.service";
import { adaptFieldOperators } from "./field-operators.adapter";
import type { FieldOperatorsData } from "./field-operators.types";
import { emptyFieldOperators } from "./field-operators.types";

// PR-SCALE-4 — carrega os operadores de campo REAIS da tela "Operadores de Campo" REUSANDO a camada de
// dados do Mapa (getLatestFieldLocations, mesma fonte /field-locations/latest). Espelha useAuditEvents:
// monta o `context` da sessão/organização, faz a 1ª carga no mount e a cada mudança de contexto, e expõe
// {data,loading,isRefreshing,refresh} + auto-refresh. D-007: o front nunca inventa operador — em modo
// mock a lista já nasce VAZIA e honesta (sem skeleton eterno); erro real → source "fallback".
export function useFieldOperators() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<FieldOperatorsData>(() => emptyFieldOperators(isMockMode() ? "mock" : "api"));
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
    const map = await getLatestFieldLocations(context);
    setData({ operators: adaptFieldOperators(map.locations), source: map.source, fallbackReason: map.fallbackReason });
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useAutoRefresh(refresh);

  return { data, loading, isRefreshing, refresh };
}
