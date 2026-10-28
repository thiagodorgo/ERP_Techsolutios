import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getFinancialAccountBalance, listFinancialAccounts } from "./financial-accounts.service";
import type { FinancialAccountBalance, FinancialAccountsApiContext, FinancialAccountsData } from "./financial-accounts.types";

// B-SAN3-12b — contas da organização ativa + o saldo de cada conta ATIVA (um GET /balance por conta, somado no
// servidor). Estado §7 "dados desatualizados": se a atualização em 2º plano falha e já havia dado bom, o dado anterior
// FICA e `stale` liga (a tela mostra a faixa); sem dado anterior, a falha é erro (`source: "fallback"`).

const INITIAL: FinancialAccountsData = { items: [], pagination: { limit: 0, offset: 0, total: 0 }, source: "api" };

export function useFinanceApiContext(): { readonly context: FinancialAccountsApiContext; readonly ready: boolean } {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );
  return { context, ready: Boolean(activeContext) };
}

export function useFinancialAccounts(options: { readonly enabled: boolean }) {
  const { context, ready } = useFinanceApiContext();
  const [data, setData] = useState<FinancialAccountsData>(INITIAL);
  const [balances, setBalances] = useState<Readonly<Record<string, FinancialAccountBalance | null>>>({});
  const [loading, setLoading] = useState(true);
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
      const next = await listFinancialAccounts(context);
      if (next.source === "fallback" && hasGood.current) {
        setStale(true);
      } else {
        const pairs = await Promise.all(
          next.items.filter((account) => account.active).map(async (account) => [account.id, await getFinancialAccountBalance(context, account.id)] as const),
        );
        setData(next);
        setBalances(Object.fromEntries(pairs));
        if (next.source !== "fallback") {
          hasGood.current = true;
          setStale(false);
          setLastUpdatedAt(new Date().toISOString());
        }
      }
      setLoading(false);
    },
    [context, ready, options.enabled],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...data, balances, loading, stale, lastUpdatedAt, refresh, context };
}
