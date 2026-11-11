import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFinanceApiContext } from "../accounts/useFinancialAccounts";
import { getPeriod, listPeriods } from "./period-closes.service";
import type { PeriodDetail, PeriodRow } from "./period-closes.types";
import { previousPeriodKey, toPeriodKey } from "./period-keys";

// B-SAN3-24 (24b) — as competências da tela de Fechamento. A lista do servidor só tem as competências que já tiveram
// fechamento; a tela acrescenta a competência CORRENTE (no fuso de negócio, R-COMPETENCIA-SP) e a ANTERIOR quando o
// servidor não as tem (nunca fechadas = abertas), para o mês a fechar sempre aparecer. O detalhe de cada competência
// (situação, retrato congelado e checklist AO VIVO) vem de `GET /financial-periods/:period`, sob demanda.

export type PeriodsList = {
  readonly rows: readonly PeriodRow[];
  readonly currentKey: string;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly forbidden: boolean;
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
};

function withRecentKeys(rows: readonly PeriodRow[], currentKey: string): PeriodRow[] {
  const byKey = new Map(rows.map((row) => [row.period, row]));
  for (const key of [currentKey, previousPeriodKey(currentKey)]) {
    if (!byKey.has(key)) byKey.set(key, { period: key, status: "open", closedAt: null, reopenedAt: null });
  }
  return [...byKey.values()].sort((a, b) => b.period.localeCompare(a.period));
}

export function usePeriods(options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const currentKey = toPeriodKey(new Date());
  const [rows, setRows] = useState<readonly PeriodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ readonly status: number | null } | null>(null);
  const [stale, setStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const hasGood = useRef(false);

  const refresh = useCallback(
    async (background = false) => {
      if (!ready || !options.enabled) {
        setLoading(false);
        return;
      }
      if (!background) setLoading(true);
      const result = await listPeriods(context, { limit: 100 });
      if (result.source !== "fallback") {
        setRows(withRecentKeys(result.items, currentKey));
        setFailure(null);
        setStale(false);
        hasGood.current = true;
        setLastUpdatedAt(new Date().toISOString());
      } else if (hasGood.current && background) {
        setStale(true);
      } else {
        setFailure({ status: result.fallbackStatus ?? null });
      }
      setLoading(false);
    },
    [context, ready, options.enabled, currentKey],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const list: PeriodsList = { rows, currentKey, loading, failed: failure !== null, forbidden: failure?.status === 403, stale, lastUpdatedAt };
  return { list, refresh, context };
}

export type PeriodDetailState = { readonly loading: boolean; readonly detail: PeriodDetail | null; readonly failed: boolean };

/** Os detalhes pedidos (`keys`) e os abertos sob demanda (`load`), cada um de `GET /financial-periods/:period`. */
export function usePeriodDetails(keys: readonly string[], options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [details, setDetails] = useState<Readonly<Record<string, PeriodDetailState>>>({});
  const keysKey = keys.join(",");
  const wanted = useMemo(() => (keysKey ? keysKey.split(",") : []), [keysKey]);

  const load = useCallback(
    async (period: string) => {
      if (!ready || !options.enabled) return;
      setDetails((current) => ({ ...current, [period]: { loading: true, detail: current[period]?.detail ?? null, failed: false } }));
      try {
        const detail = await getPeriod(context, period);
        setDetails((current) => ({ ...current, [period]: { loading: false, detail, failed: false } }));
      } catch {
        setDetails((current) => ({ ...current, [period]: { loading: false, detail: current[period]?.detail ?? null, failed: true } }));
      }
    },
    [context, ready, options.enabled],
  );

  const refreshWanted = useCallback(async () => {
    await Promise.all(wanted.map((period) => load(period)));
  }, [wanted, load]);

  useEffect(() => {
    void refreshWanted();
  }, [refreshWanted]);

  return { details, load, refreshWanted };
}
