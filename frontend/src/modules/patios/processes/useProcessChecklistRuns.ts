import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { ApiError } from "../../../services/api/client";
import { listProcessChecklistRuns } from "./processes.service";
import type { ChecklistRunSummaryItem } from "./processes.types";

// Ω-VID PR-08 — hook da aba "Checklist do Guincho" do dossiê. Carrega GET /impound-processes/:id/checklist-runs
// (guarda DUPLA no backend: impound:read + checklist_runs:read). O guincheiro preenche no mobile; o dossiê só LÊ.
// Auto-atualiza em segundo plano (o guincheiro pode concluir/adicionar avaria enquanto o operador olha o dossiê).
// `denied` cobre tanto a falta local de checklist_runs:read quanto o 403 do backend (autoridade final).
export function useProcessChecklistRuns(processId: string | undefined, enabled = true) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const canRead = can("checklist_runs:read");

  const [runs, setRuns] = useState<ChecklistRunSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);

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

  const active = Boolean(enabled && processId && activeContext && canRead);

  const reload = useCallback(
    async (background = false) => {
      if (!active || !processId) return;
      if (!background) setLoading(true);
      setError(null);
      try {
        const next = await listProcessChecklistRuns(context, processId);
        setRuns(next);
        setDenied(false);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          setDenied(true);
        } else if (err instanceof ApiError && err.status === 404) {
          // processo inexistente/desatualizado → lista vazia honesta (o painel mostra o EmptyState de vínculo)
          setRuns([]);
        } else {
          setError("Não foi possível carregar os checklists do guincho.");
        }
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    },
    [active, processId, context],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(reload, { enabled: active });

  return { runs, loading, error, denied: denied || !canRead, loaded, reload };
}
