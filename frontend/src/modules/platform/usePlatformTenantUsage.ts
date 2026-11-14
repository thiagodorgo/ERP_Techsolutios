import { useCallback, useEffect, useRef, useState } from "react";

import { getPlatformTenantUsage, type TenantUsageData } from "./platform-tenant-usage.service";

// B-ASS-10b (T5, F10) — carrega o uso medido da organização do detalhe. Sem `enabled` (o perfil não tem
// `platform:cloud-usage:read`) ou sem organização na rota, NÃO chama a API: o bloco nem é montado, e esta trava é a
// segunda camada. Resposta de uma organização anterior (troca de rota no meio da leitura) é descartada.

export type PlatformTenantUsageState = {
  readonly data: TenantUsageData | null;
  readonly loading: boolean;
  readonly retry: () => void;
};

export function usePlatformTenantUsage(tenantId: string | undefined, enabled: boolean): PlatformTenantUsageState {
  const [data, setData] = useState<TenantUsageData | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled && tenantId));
  const request = useRef(0);

  const load = useCallback(() => {
    if (!enabled || !tenantId) {
      setData(null);
      setLoading(false);
      return;
    }
    const current = ++request.current;
    setLoading(true);
    void getPlatformTenantUsage(tenantId).then((next) => {
      if (current !== request.current) return;
      setData(next);
      setLoading(false);
    });
  }, [enabled, tenantId]);

  useEffect(() => {
    load();
    return () => {
      request.current += 1;
    };
  }, [load]);

  return { data, loading, retry: load };
}
