import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getCustodySummary } from "./inventory.service";
import type { CustodySummary } from "./inventory.types";

// Ω4C PR-08 — saldos por custódia (Base/Profissional/Viatura) do GET /inventory-items/:id/custody-summary.
// `enabled=false` (ex.: aba Resumo ainda não aberta) mantém o hook inerte e sem requisição.
export function useCustodySummary(itemId: string | undefined, enabled: boolean) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [summary, setSummary] = useState<CustodySummary | null>(null);
  const [loading, setLoading] = useState(false);
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

  const refresh = useCallback(async () => {
    if (!enabled || !itemId || !activeContext) return;

    setLoading(true);
    setError(null);
    try {
      setSummary(await getCustodySummary(context, itemId));
    } catch {
      setError("Não foi possível carregar os saldos por custódia.");
    } finally {
      setLoading(false);
    }
  }, [enabled, itemId, activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
