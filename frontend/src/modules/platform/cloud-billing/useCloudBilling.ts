import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { nextRefreshState } from "../refresh-state";
import { currentBillingMonth, getCloudBilling, periodForMonth } from "./cloud-billing.service";
import type { CloudBillingData } from "./cloud-billing.types";
import { emptyCloudBilling } from "./cloud-billing.types";

export function useCloudBilling(month = currentBillingMonth()) {
  const period = periodForMonth(month);
  const [data, setData] = useState<CloudBillingData>(() => emptyCloudBilling(period, "api"));
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true);
    else setLoading(true);
    const next = await getCloudBilling(period);
    setData((current) => nextRefreshState(current, next, background));
    setLoading(false);
    setIsRefreshing(false);
  }, [period.end, period.start]);

  useEffect(() => { void refresh(); }, [refresh]);
  useAutoRefresh(refresh, { enabled: !data.forbidden });

  return { data, loading, isRefreshing, refresh };
}
