import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { getPlatformTenantDetail } from "./platform-tenant-detail.service";
import type { PlatformTenantDetailData } from "./platform-tenant-detail.types";
import { emptyTenantDetail } from "./platform-tenant-detail.types";

// PR-SCALE-5c — carrega o "Detalhe da Organização" (GET /api/v1/platform/tenants/:tenantId/detail) para o
// Admin da Plataforma. Espelha usePlatformOverview: o contexto vem da SESSÃO do ator (permissões
// `platform:*` do JWT), NÃO do TenantProvider — o Admin da Plataforma administra QUALQUER org sem tê-la
// como organização ativa. O `tenantId` vem do parâmetro de rota (:tenantId). Recarrega no mount e sempre
// que o `tenantId` muda. Os dados vêm do backend (o front nunca inventa; D-007). Em modo mock nasce VAZIO
// e honesto (sem skeleton eterno).
export function usePlatformTenantDetail(tenantId: string | undefined) {
  const { session } = useAuth();
  const [data, setData] = useState<PlatformTenantDetailData>(() => emptyTenantDetail(isMockMode() ? "mock" : "api"));
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

  const refresh = useCallback(
    async (background = false) => {
      // Sem id na rota → nada a buscar: estado honesto "não encontrada" (não martela o endpoint).
      if (!tenantId) {
        setData({ ...emptyTenantDetail("api"), notFound: true });
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
      // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém o detalhe
      // atual visível, sem flicker no auto-refresh); só a 1ª carga usa `loading`.
      if (background) setIsRefreshing(true);
      else setLoading(true);
      setData(await getPlatformTenantDetail(tenantId, context));
      setLoading(false);
      setIsRefreshing(false);
    },
    [context, tenantId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sem re-polling quando o backend já respondeu 403 (gate) ou 404 (org inexistente): mantém o estado
  // honesto sem martelar um endpoint proibido/vazio a cada ciclo.
  useAutoRefresh(refresh, { enabled: !data.forbidden && !data.notFound });

  return { data, loading, isRefreshing, refresh };
}
