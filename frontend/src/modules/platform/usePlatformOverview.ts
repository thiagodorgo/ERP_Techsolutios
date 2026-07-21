import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { getPlatformOverview } from "./platform-overview.service";
import type { PlatformOverviewData } from "./platform-overview.types";
import { emptyPlatformOverview } from "./platform-overview.types";

// PR-SCALE-5a — carrega a "Visão Geral da Plataforma" (GET /api/v1/platform/overview) para o Admin da
// Plataforma. Espelha useAuditEvents, mas a Visão Geral é CROSS-tenant: o contexto vem da SESSÃO do ator
// (permissões `platform:*` do JWT), não do TenantProvider — o Admin da Plataforma navega sem organização
// ativa. Faz a 1ª carga no mount e a cada mudança de sessão, e expõe {data,loading,isRefreshing,refresh}.
// Os números vêm do backend (o front nunca inventa; D-007). Em modo mock a visão já nasce VAZIA e honesta
// (sem skeleton eterno), refletindo que não há dado real de plataforma no modo demonstração.
export function usePlatformOverview() {
  const { session } = useAuth();
  const [data, setData] = useState<PlatformOverviewData>(() => emptyPlatformOverview(isMockMode() ? "mock" : "api"));
  const [loading, setLoading] = useState(!isMockMode());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Contexto da SESSÃO (não de organização ativa): token + papel + permissões `platform:*`. O backend é a
  // autoridade final do gate; em dev os headers `X-*` (mock) reproduzem os claims.
  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: session?.tenant?.id,
      role: session?.user.roles[0],
      permissions: session?.user.permissions,
    }),
    [session],
  );

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém os números atuais
  // visíveis, sem flicker no auto-refresh); só a 1ª carga usa `loading`.
  const refresh = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true);
    else setLoading(true);
    setData(await getPlatformOverview(context));
    setLoading(false);
    setIsRefreshing(false);
  }, [context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sem re-polling quando o backend já respondeu 403 (gate `platform:tenants:read`): mantém a mensagem de
  // acesso negado sem martelar o endpoint proibido a cada ciclo.
  useAutoRefresh(refresh, { enabled: !data.forbidden });

  return { data, loading, isRefreshing, refresh };
}
