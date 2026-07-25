import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import type { TelemetryApiContext, TelemetryData, TelemetryPeriod } from "./telemetry.types";
import { emptyTelemetry } from "./telemetry.types";

// Ω4C PR-14 — carregador compartilhado das 4 telas de Telemetria. Espelha useSessions/useAuditEvents: monta
// o contexto da sessão/organização, faz a 1ª carga no mount e a cada mudança de contexto/profissional/
// período, e expõe {data,loading,isRefreshing,refresh}. Em modo mock a lista já nasce VAZIA e honesta.
//
// `requiresProfessional`: km/acessos/recusas exigem professionalId (backend 422 professional_required sem
// ele). Sem seleção, o endpoint NÃO é chamado — estado honesto "needs_professional" (D-007). Dispositivos
// dispensa (requiresProfessional=false).

type Loader<T> = (
  context: TelemetryApiContext,
  query: { professionalId?: string; period: TelemetryPeriod },
) => Promise<TelemetryData<T>>;

type UseTelemetryResourceOptions<T> = {
  readonly loader: Loader<T>;
  readonly period: TelemetryPeriod;
  readonly professionalId?: string;
  readonly requiresProfessional: boolean;
};

export function useTelemetryResource<T>({ loader, period, professionalId, requiresProfessional }: UseTelemetryResourceOptions<T>) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const missingProfessional = requiresProfessional && !professionalId?.trim();
  // Estado inicial honesto já na 1ª pintura (inclusive SSR, onde os efeitos não rodam): sem profissional
  // selecionado → "needs_professional"; senão mock/api conforme o modo.
  const initialSource = missingProfessional ? "needs_professional" : isMockMode() ? "mock" : "api";
  const [data, setData] = useState<TelemetryData<T>>(() => emptyTelemetry<T>(initialSource));
  const [loading, setLoading] = useState(!isMockMode() && !missingProfessional);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const context = useMemo<TelemetryApiContext>(
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
      // Sem profissional selecionado: estado honesto, o endpoint NÃO é chamado (não fabrica linha, D-007).
      if (missingProfessional) {
        setData(emptyTelemetry<T>("needs_professional"));
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
      if (background) setIsRefreshing(true);
      else setLoading(true);
      setData(await loader(context, { professionalId, period }));
      setLoading(false);
      setIsRefreshing(false);
    },
    [activeContext, context, loader, missingProfessional, period, professionalId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sem re-polling quando o gate respondeu 403 (mantém "acesso não permitido") ou quando falta seleção.
  useAutoRefresh(refresh, { enabled: data.source !== "forbidden" && data.source !== "needs_professional" });

  return { data, loading, isRefreshing, refresh };
}
