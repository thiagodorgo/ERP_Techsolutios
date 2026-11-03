import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createLatestRequestGate } from "../../../hooks/latestRequestGate";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { getStatement } from "./charges.service";
import type { ChargeStatementView } from "./charges.types";

// Hook da guia de débitos. Carrega GET /charges/statement e auto-atualiza em segundo plano (o motor de diárias
// acumula por job — a memória de cálculo muda mesmo sem ação do operador). D-007: mock → null (guia vazia honesta).
export function useStatement(processId: string | undefined) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("charging:read");

  const [statement, setStatement] = useState<ChargeStatementView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Só a leitura mais nova vale: o auto-refresh que saiu ANTES do "Registrar encargo" e volta DEPOIS não pode
  // pintar a guia sem o encargo recém-lançado (demo 02/11).
  const gate = useRef(createLatestRequestGate()).current;

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
      if (!processId || !activeContext || !canRead) return;
      const ticket = gate.begin();
      if (!background) setLoading(true);
      setError(null);
      try {
        const next = await getStatement(context, processId);
        if (!gate.isLatest(ticket)) return;
        setStatement(next);
        setDenied(false);
      } catch (err) {
        if (!gate.isLatest(ticket)) return;
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setDenied(true);
        } else {
          setError("Não foi possível carregar a guia de débitos.");
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [processId, activeContext, canRead, context, gate],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(reload, { enabled: Boolean(processId && activeContext && canRead) });

  return { statement, loading, error, denied: denied || !canRead, loaded, reload };
}
