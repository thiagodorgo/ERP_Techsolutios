import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { getPlatformHealth } from "./platform-health.service";
import type { PlatformHealthData } from "./platform-health.types";
import { emptyPlatformHealth } from "./platform-health.types";

export function usePlatformHealth() {
  const [data, setData] = useState<PlatformHealthData>(() => emptyPlatformHealth("api"));
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true); else setLoading(true);
    const next = await getPlatformHealth();
    setData((current) => background && next.source === "fallback" && current.source === "api" ? { ...current, stale: true } : next);
    setLoading(false); setIsRefreshing(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useAutoRefresh(refresh);
  return { data, loading, isRefreshing, refresh };
}
