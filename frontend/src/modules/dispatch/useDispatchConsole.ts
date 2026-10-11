import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DashboardSummaryModel } from "../dashboard/dashboard.adapter";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { usePermissions } from "../../providers/PermissionProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import type { FieldLocationItem } from "../operations/map/operations-map.types";
import { initialBlockState, isLocationsEmpty, isQueueEmpty, isSummaryEmpty, nextBlockState, type ConsoleBlockState } from "./dispatch-console.logic";
import { loadDispatchConsole, type ConsoleWorkOrders } from "./dispatch-console.service";

// B-SAN3-06a (D-TELAS-SAN3-06a) — dados do Console Dispatcher. Espelha `useWorkOrders` (a tela-modelo): monta o
// `context` da sessão/organização, faz a 1ª carga no mount e a cada troca de contexto, recarrega sozinho em segundo
// plano (`useAutoRefresh`, 30 s) e decide o estado de cada bloco pelo redutor puro `nextBlockState`. Nada aqui fabrica
// dado; o gate por permissão de cada fonte vive em `loadDispatchConsole` (C7).

export type DispatchConsoleState = {
  readonly summary: ConsoleBlockState<DashboardSummaryModel>;
  readonly workOrders: ConsoleBlockState<ConsoleWorkOrders>;
  readonly locations: ConsoleBlockState<readonly FieldLocationItem[]>;
};

const INITIAL: DispatchConsoleState = {
  summary: initialBlockState(),
  workOrders: initialBlockState(),
  locations: initialBlockState(),
};

/** Nova tentativa explícita: o bloco em falha volta a "carregando" (o que tem dado fica na tela). */
function retrying<T>(block: ConsoleBlockState<T>): ConsoleBlockState<T> {
  return block.status === "error" || block.status === "forbidden" ? { ...block, status: "loading", error: null } : block;
}

export function useDispatchConsole() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const [state, setState] = useState<DispatchConsoleState>(INITIAL);
  const requestSeq = useRef(0);

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
      const seq = ++requestSeq.current;
      if (!background) {
        setState((prev) => ({ summary: retrying(prev.summary), workOrders: retrying(prev.workOrders), locations: retrying(prev.locations) }));
      }
      const snapshot = await loadDispatchConsole(context, can);
      if (seq !== requestSeq.current) return;
      setState((prev) => ({
        summary: nextBlockState(prev.summary, snapshot.summary, background, isSummaryEmpty),
        workOrders: nextBlockState(prev.workOrders, snapshot.workOrders, background, isQueueEmpty),
        locations: nextBlockState(prev.locations, snapshot.locations, background, isLocationsEmpty),
      }));
    },
    [activeContext, can, context],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  return { ...state, refresh, tenantName: activeContext?.tenantName ?? null };
}
