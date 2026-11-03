import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createLatestRequestGate } from "../../../hooks/latestRequestGate";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { mergeReleaseCheck } from "./release.adapter";
import { getRelease } from "./release.service";
import type { ReleaseCheckDto, ReleaseDto } from "./release.types";

// Hook da liberação em curso. GET /impound-processes/:id/release (impound:read) + auto-refresh em segundo plano
// (a diária acumula por job; o dossiê muda mesmo sem ação do operador). 404 release_not_found → null (EmptyState
// honesto: "Nenhuma liberação em andamento"). D-007: mock → null.
export function useRelease(processId: string | undefined) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("impound:read");

  const [release, setRelease] = useState<ReleaseDto | null>(null);
  const [checks, setChecks] = useState<ReleaseCheckDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Só a leitura mais nova vale: uma resposta antiga (auto-refresh, recarga anterior) que chega depois não pinta de
  // novo o estado de ANTES de uma gravação.
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
        const view = await getRelease(context, processId);
        if (!gate.isLatest(ticket)) return;
        setRelease(view?.data ?? null);
        setChecks(view?.checks ?? []);
        setDenied(false);
      } catch (err) {
        if (!gate.isLatest(ticket)) return;
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setDenied(true);
        } else {
          setError("Não foi possível carregar a liberação deste processo.");
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [processId, activeContext, canRead, context, gate],
  );

  // Aplica o requisito como o SERVIDOR o gravou (resposta do POST) e descarta as leituras que já estavam em voo.
  const applyCheck = useCallback(
    (saved: ReleaseCheckDto) => {
      gate.invalidate();
      setChecks((current) => mergeReleaseCheck(current, saved));
    },
    [gate],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(reload, { enabled: Boolean(processId && activeContext && canRead) });

  return { release, checks, loading, error, denied: denied || !canRead, loaded, reload, applyCheck };
}
