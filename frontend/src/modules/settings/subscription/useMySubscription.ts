import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { fetchMySubscription } from "./my-subscription.service";
import type { MySubscription, MySubscriptionApiContext } from "./my-subscription.types";

// B-ASS-11 (F2, Emenda 1 §6.1 e Emenda 1.1 §2.4) — carga da assinatura, no molde de `useCheques.ts` e de
// `useTenantSettings.ts`: a 1ª carga mostra o esqueleto; a atualização em 2º plano NÃO troca o dado pelo esqueleto. Falha
// em 2º plano com dado anterior → `stale` (o dado fica, com o aviso); falha sem dado anterior → erro; 403 → acesso não
// permitido. O "hoje" de São Paulo sai daqui, do ÚNICO relógio da pasta (`todayKey`), para a medição antiga e para
// "vence em"/"venceu em"; a hora da última atualização boa usa `Date.now()`.

const SAO_PAULO_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const SAO_PAULO_CLOCK = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** O que a última carga boa trouxe: a assinatura, ou "sem assinatura" (`data: null` do servidor). */
export type MySubscriptionLoaded = { readonly kind: "ready"; readonly subscription: MySubscription } | { readonly kind: "none" };

export type MySubscriptionState = {
  readonly data: MySubscriptionLoaded | null;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly failed: boolean;
  readonly forbidden: boolean;
  readonly stale: boolean;
  /** "09:40" — a hora da última carga boa, em São Paulo. */
  readonly lastUpdatedAt: string | null;
  readonly todayKey: string;
  readonly refresh: (background?: boolean) => Promise<void>;
};

export function useMySubscription(options: { readonly enabled: boolean }): MySubscriptionState {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<MySubscriptionLoaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<{ readonly status: number | null } | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const hasGood = useRef(false);

  const context = useMemo<MySubscriptionApiContext>(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );
  const ready = Boolean(activeContext);

  const refresh = useCallback(
    async (background = false) => {
      if (!ready || !options.enabled) {
        setLoading(false);
        return;
      }
      if (background) setRefreshing(true);
      else if (!hasGood.current) setLoading(true);
      else setRefreshing(true);
      const result = await fetchMySubscription(context);
      if (result.kind === "ready" || result.kind === "none") {
        setData(result);
        setFailure(null);
        hasGood.current = true;
        setLastUpdatedAt(SAO_PAULO_CLOCK.format(Date.now()));
      } else {
        setFailure({ status: result.kind === "forbidden" ? 403 : result.status });
      }
      setLoading(false);
      setRefreshing(false);
    },
    [context, ready, options.enabled],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const todayKey = SAO_PAULO_DAY.format(new Date());

  return {
    data,
    loading,
    refreshing,
    failed: failure !== null,
    forbidden: failure?.status === 403,
    stale: failure !== null && data !== null,
    lastUpdatedAt,
    todayKey,
    refresh,
  };
}
