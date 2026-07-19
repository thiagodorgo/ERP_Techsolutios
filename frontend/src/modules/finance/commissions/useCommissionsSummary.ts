import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { fetchCommissionSummary } from "./commissions.service";
import type { CommissionSummaryData, CommissionSummaryScope } from "./commissions.types";

const EMPTY: CommissionSummaryData = { summary: { items: [], total: 0, from: "", to: "" }, source: "api" };

// Carrega o extrato agregado conforme o escopo permitido ao chamador. `scope=null`
// (sem permissão) não dispara requisição. Filtros de período/operador vêm da URL como
// primitivos — a dependência é por valor, evitando re-fetch em loop por identidade de objeto.
export function useCommissionsSummary(
  scope: CommissionSummaryScope | null,
  from: string,
  to: string,
  payeeId: string,
) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<CommissionSummaryData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém o dado atual
  // visível, sem flicker no auto-refresh); só a 1ª carga / refresh explícito usa `loading`.
  const refresh = useCallback(async (background = false) => {
    if (!activeContext || !scope) return;

    if (background) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    const next = await fetchCommissionSummary(context, scope, {
      from: from || undefined,
      to: to || undefined,
      payeeId: payeeId || undefined,
    });
    setData(next);
    if (next.source === "fallback") setError(next.fallbackReason ?? "Fallback local ativo.");
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context, scope, from, to, payeeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    summary: data.summary,
    source: data.source,
    loading,
    isRefreshing,
    error,
    refresh,
  };
}
