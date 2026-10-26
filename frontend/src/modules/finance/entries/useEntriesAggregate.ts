import { useCallback, useEffect, useState } from "react";

import { useFinanceApiContext } from "../accounts/useFinancialAccounts";
import { getEntriesAggregate } from "./financial-entries.service";
import type { EntriesAggregate, EntriesAggregateQuery } from "./financial-entries.types";

// B-SAN3-12b — agregados do extrato somados no SERVIDOR (GET /financial-entries/aggregate, §4.5 do plano). A tela pede,
// numa carga, um conjunto NOMEADO de consultas (ex.: "a conciliar", "a conciliar na conta X") e recebe contagem e valores
// prontos — nunca soma no front (F8). Consulta que falha fica `null`: o número não é renderizado (F19). Em 2º plano, uma
// falha mantém o valor anterior.

export function useEntriesAggregate(queries: Readonly<Record<string, EntriesAggregateQuery>>, options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [data, setData] = useState<Readonly<Record<string, EntriesAggregate | null>>>({});
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(queries);

  const refresh = useCallback(
    async (background = false) => {
      if (!ready || !options.enabled) {
        setLoading(false);
        return;
      }
      if (!background) setLoading(true);
      const named = Object.entries(JSON.parse(key) as Record<string, EntriesAggregateQuery>);
      const results = await Promise.all(named.map(async ([name, query]) => [name, await getEntriesAggregate(context, query)] as const));
      setData((current) => Object.fromEntries(results.map(([name, value]) => [name, value ?? (background ? current[name] ?? null : null)])));
      setLoading(false);
    },
    [context, ready, options.enabled, key],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
