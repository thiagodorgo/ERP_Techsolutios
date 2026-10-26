import { useCallback, useEffect, useRef, useState } from "react";

import { useFinanceApiContext } from "../accounts/useFinancialAccounts";
import { listFinancialEntries } from "./financial-entries.service";
import type { FinancialEntriesData, FinancialEntriesFilters, FinancialEntry } from "./financial-entries.types";

// B-SAN3-12b — extrato (GET /financial-entries) com os filtros da tela, todos aplicados no servidor. Uma requisição por
// carga e por mudança de filtro (F14). Atualização em 2º plano que falha com dado anterior → `stale` (o dado fica);
// `replaceItem` repinta UMA linha com o estado relido do servidor (F22: depois do 409 da conciliação).

const INITIAL: FinancialEntriesData = { items: [], pagination: { limit: 0, offset: 0, total: 0 }, source: "api" };

export function useFinancialEntries(filters: FinancialEntriesFilters, options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [data, setData] = useState<FinancialEntriesData>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const hasGood = useRef(false);
  const key = JSON.stringify(filters);

  const refresh = useCallback(
    async (background = false) => {
      if (!ready || !options.enabled) {
        setLoading(false);
        return;
      }
      if (!background) setLoading(true);
      const next = await listFinancialEntries(context, JSON.parse(key) as FinancialEntriesFilters);
      if (next.source === "fallback" && hasGood.current && background) {
        setStale(true);
      } else {
        setData(next);
        if (next.source !== "fallback") {
          hasGood.current = true;
          setStale(false);
          setLastUpdatedAt(new Date().toISOString());
        }
      }
      setLoading(false);
    },
    [context, ready, options.enabled, key],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const replaceItem = useCallback((entry: FinancialEntry) => {
    setData((current) => ({ ...current, items: current.items.map((item) => (item.id === entry.id ? entry : item)) }));
  }, []);

  return { ...data, loading, stale, lastUpdatedAt, refresh, replaceItem, context };
}
