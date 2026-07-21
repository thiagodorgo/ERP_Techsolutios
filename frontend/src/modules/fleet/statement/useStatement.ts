import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { emptyLedger } from "./statement.adapter";
import { getProfessionalStatement } from "./statement.service";
import type { ProfessionalStatementLedger, StatementQuery } from "./statement.types";

// Extrato do profissional. Só busca quando há um profissional selecionado (operatorProfileId) e contexto
// ativo — sem profissional, o razão fica vazio (a tela mostra o prompt de seleção). Espelha useFuelLogs.
export function useStatement(operatorProfileId: string | null, filters: StatementQuery) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [ledger, setLedger] = useState<ProfessionalStatementLedger>(emptyLedger(operatorProfileId, "api"));
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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém o dado visível,
  // sem flicker no auto-refresh); só a 1ª carga / refresh explícito usa `loading`.
  const refresh = useCallback(
    async (background = false) => {
      if (!activeContext || !operatorProfileId) {
        setLedger(emptyLedger(operatorProfileId, "api"));
        setError(null);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (background) setIsRefreshing(true);
      else setLoading(true);
      setError(null);
      const next = await getProfessionalStatement(context, operatorProfileId, filters);
      setLedger(next);
      // 403 tem estado próprio na tela (acesso não permitido); só o fallback vira mensagem de erro.
      if (next.source === "fallback") setError(next.fallbackReason ?? "Fallback local ativo.");
      setLoading(false);
      setIsRefreshing(false);
    },
    [activeContext, context, operatorProfileId, filters],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ledger,
    items: ledger.items,
    summary: ledger.summary,
    pagination: ledger.pagination,
    source: ledger.source,
    forbidden: ledger.source === "forbidden",
    loading,
    isRefreshing,
    error,
    refresh,
  };
}
