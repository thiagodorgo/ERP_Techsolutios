import { useCallback, useEffect, useMemo, useState } from "react";

import { adaptBackendNavigationMenu } from "./navigation.adapter";
import { getMockNavigationMenu } from "./navigation.mock";
import { getNavigationMenu } from "./navigation.service";
import type { NavigationItem, NavigationMenuState, NavigationScope } from "./navigation.types";

type UseNavigationMenuOptions = {
  scope?: NavigationScope;
  enabled?: boolean;
};

export function useNavigationMenu(options: UseNavigationMenuOptions = {}): NavigationMenuState {
  const { scope, enabled = true } = options;
  const fallbackItems = useMemo(() => adaptBackendNavigationMenu(getMockNavigationMenu(scope)), [scope]);
  const [items, setItems] = useState<NavigationItem[]>(fallbackItems);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(true);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setItems(fallbackItems);
      setLoading(false);
      setError(null);
      setIsFallback(true);
      return;
    }

    setLoading(true);
    try {
      const response = await getNavigationMenu(scope);
      const nextItems = adaptBackendNavigationMenu(response);

      if (nextItems.length === 0 && fallbackItems.length > 0) {
        setItems(fallbackItems);
        setIsFallback(true);
      } else {
        setItems(nextItems);
        setIsFallback(false);
      }
      setError(null);
    } catch (caughtError) {
      setItems(fallbackItems);
      setError(caughtError instanceof Error ? caughtError : new Error("Navigation menu unavailable."));
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, fallbackItems, scope]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    items,
    loading,
    error,
    isFallback,
    refetch,
  };
}
