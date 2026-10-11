import { useCallback, useEffect, useRef, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { currentBillingMonth, getCloudBilling, periodForMonth } from "./cloud-billing.service";
import { isSamePeriod, nextCloudBillingState } from "./cloud-billing.state";
import type { CloudBillingData } from "./cloud-billing.types";
import { emptyCloudBilling } from "./cloud-billing.types";

export function useCloudBilling(month = currentBillingMonth()) {
  const period = periodForMonth(month);
  const [data, setData] = useState<CloudBillingData>(() => emptyCloudBilling(period, "api"));
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // A1: o período selecionado AGORA. Uma resposta que chega depois de o usuário trocar de mês é descartada, para o
  // dinheiro de um mês nunca aparecer sob o rótulo de outro (mesmo padrão de ref de `useAutoRefresh`).
  const selected = useRef(period);
  selected.current = period;

  const refresh = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true);
    else setLoading(true);
    const next = await getCloudBilling(period);
    if (!isSamePeriod(next.period, selected.current)) {
      if (background) setIsRefreshing(false);
      return;
    }
    setData((current) => nextCloudBillingState(current, next, background, selected.current));
    setLoading(false);
    setIsRefreshing(false);
  }, [period.end, period.start]);

  useEffect(() => { void refresh(); }, [refresh]);
  useAutoRefresh(refresh, { enabled: !data.forbidden });

  return { data, loading, isRefreshing, refresh };
}
