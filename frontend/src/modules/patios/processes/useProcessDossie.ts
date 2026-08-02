import { useCallback, useEffect, useMemo, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getYardOccupancy, listYardsFromApi } from "../yards/yards.service";
import { getInspection, getProcess, listEvents, verifyChain } from "./processes.service";
import type { CustodyEventItem, InspectionView, ProcessDetail, ProcessesApiContext, VerifyResult } from "./processes.types";

// Ω-VID PR-07 — hook COMPARTILHADO do dossiê de 1 processo. Extrai a lógica de fetch que a ProcessoDossiePage já
// tinha (getProcess + eventos/verify/vistoria em paralelo + join client-side de pátio/vaga) para que a página
// (deep-link/fallback) e o VehicleDossieModal (aberto pela vaga ocupada) leiam os MESMOS dados sem duplicar. Sem
// mudança de comportamento na página: mesmas chamadas, mesma ordem, mesmo auto-refresh em segundo plano.
export type CurrentSpot = { readonly id: string; readonly code: string };

export type ProcessDossie = {
  readonly process: ProcessDetail | null;
  readonly events: CustodyEventItem[];
  readonly verify: VerifyResult | null;
  readonly inspection: InspectionView;
  readonly yardName: string | null;
  readonly currentSpot: CurrentSpot | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly notFound: boolean;
  readonly reload: (background?: boolean) => Promise<void>;
  readonly context: ProcessesApiContext;
};

export function useProcessDossie(processId: string | undefined, enabled = true): ProcessDossie {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();

  const [process, setProcess] = useState<ProcessDetail | null>(null);
  const [events, setEvents] = useState<CustodyEventItem[]>([]);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [inspection, setInspection] = useState<InspectionView>(null);
  const [yardName, setYardName] = useState<string | null>(null);
  const [currentSpot, setCurrentSpot] = useState<CurrentSpot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const context = useMemo<ProcessesApiContext>(
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
      if (!processId || !activeContext || !enabled) return;
      if (!background) setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const detail = await getProcess(context, processId);
        if (!detail) {
          setNotFound(true);
          setProcess(null);
          return;
        }
        setProcess(detail);

        const [eventList, verifyResult, inspectionView] = await Promise.all([
          listEvents(context, processId).catch(() => []),
          verifyChain(context, processId).catch(() => null),
          getInspection(context, processId).catch(() => null),
        ]);
        setEvents(eventList);
        setVerify(verifyResult);
        setInspection(inspectionView);

        // Nome do pátio + vaga atual (join client-side: a vaga onde currentProcessId === este processo).
        if (detail.yardId) {
          const [yardsData, occupancy] = await Promise.all([
            listYardsFromApi(context, { limit: 100 }).catch(() => null),
            getYardOccupancy(context, detail.yardId).catch(() => null),
          ]);
          setYardName(yardsData?.items.find((yard) => yard.id === detail.yardId)?.name ?? null);
          const spot = occupancy?.items.find((item) => item.currentProcessId === processId);
          setCurrentSpot(spot ? { id: spot.id, code: spot.code } : null);
        } else {
          setYardName(null);
          setCurrentSpot(null);
        }
      } catch (err) {
        const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
        if (status === 404) setNotFound(true);
        else setError("Não foi possível carregar o dossiê do processo.");
      } finally {
        setLoading(false);
      }
    },
    [processId, activeContext, enabled, context],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useAutoRefresh(reload, { enabled: Boolean(processId && activeContext && enabled) });

  return { process, events, verify, inspection, yardName, currentSpot, loading, error, notFound, reload, context };
}
