import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { getPatiosDashboardSummary } from "./dashboard.service";
import type { PatiosDashboardSummary } from "./dashboard.types";

// Hook do painel gerencial dos Pátios (/patios/painel). GET /patios/dashboard/summary sob impound:read (REUSADA).
// Auto-refresh em segundo plano (mesmo padrão dos demais painéis de Pátios: a diária/ocupação mudam sem ação do
// operador). "Acesso não permitido" e "desatualizado" (dados carregados que a última atualização não confirmou)
// são estados de primeira classe — nunca um spinner infinito nem um número fabricado.
export function usePatiosDashboardSummary() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("impound:read");

  const [summary, setSummary] = useState<PatiosDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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
      if (!activeContext || !canRead) return;
      if (!background) setLoading(true);
      setError(null);
      try {
        const next = await getPatiosDashboardSummary(context);
        setSummary(next);
        setDenied(false);
        setStale(false);
        setUpdatedAt(new Date());
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setDenied(true);
        } else {
          setError("Não foi possível carregar o painel gerencial dos pátios.");
          // Dados carregados anteriormente seguem em tela, marcados como desatualizados (§7).
          if (summary) setStale(true);
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeContext, canRead, context],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(() => reload(true), { enabled: Boolean(activeContext && canRead) });

  return { summary, loading, error, denied: denied || !canRead, loaded, stale, updatedAt, reload };
}
