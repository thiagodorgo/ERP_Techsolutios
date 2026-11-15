import { useCallback, useEffect, useRef, useState } from "react";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import {
  currentBillingMonth,
  getCloudBilling,
  getEconomicGroup,
  getGlobalOverview,
  getInitialBillingMonth,
  getTenantOverview,
  listTenantAllocations,
  monthsEndingAt,
  periodForMonth,
  runLimited,
  type CloudBillingAccess,
} from "./cloud-billing.service";
import { isSamePeriod, nextCloudBillingState } from "./cloud-billing.state";
import type { BackgroundRead, CloudBillingData, CloudBillingSeries, EconomicGroupDetail, GlobalOverview, TenantAllocationLine, TenantOverview } from "./cloud-billing.types";
import { emptyCloudBilling } from "./cloud-billing.types";

// B-ASS-10b (T5) — a leitura da tela de custo e margem. O mês da tela vem de fora (a página); as 7 leituras do mês vêm
// juntas (A1: resposta de outro mês é descartada); a série de 6 meses (5 meses anteriores: global e por organização) e o
// detalhe de cada grupo vêm em SEGUNDO PLANO, no máximo 3 chamadas ao mesmo tempo (§6.3). Falha de uma leitura de
// segundo plano não derruba a tela: o mês dela fica "não foi possível carregar", com "Tentar de novo".

/** O mês em que a tela abre (§6.3.2): `null` enquanto a lista de rateios carrega. */
export function useInitialBillingMonth(): string | null {
  const [month, setMonth] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getInitialBillingMonth().then((initial) => {
      if (alive) setMonth(initial);
    });
    return () => {
      alive = false;
    };
  }, []);
  return month;
}

function emptySeries(month: string): CloudBillingSeries {
  return { months: monthsEndingAt(month, 6), global: {}, tenant: {} };
}

export function useCloudBilling(month = currentBillingMonth(), access: CloudBillingAccess = { readImports: true }) {
  const period = periodForMonth(month);
  const [data, setData] = useState<CloudBillingData>(() => emptyCloudBilling(month, period, "api"));
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [series, setSeries] = useState<CloudBillingSeries>(() => emptySeries(month));
  const [groupDetails, setGroupDetails] = useState<Readonly<Record<string, BackgroundRead<EconomicGroupDetail>>>>({});
  const [composition, setComposition] = useState<Readonly<Record<string, BackgroundRead<readonly TenantAllocationLine[]>>>>({});
  // A1: o período selecionado AGORA. Uma resposta que chega depois de o usuário trocar de mês é descartada, para o
  // dinheiro de um mês nunca aparecer sob o rótulo de outro (mesmo padrão de ref de `useAutoRefresh`).
  const selected = useRef(period);
  selected.current = period;
  const selectedMonth = useRef(month);
  selectedMonth.current = month;
  const readImports = access.readImports;

  const refresh = useCallback(async (background = false) => {
    if (background) setIsRefreshing(true);
    else setLoading(true);
    const next = await getCloudBilling(month, { readImports });
    if (!isSamePeriod(next.period, selected.current)) {
      if (background) setIsRefreshing(false);
      return;
    }
    setData((current) => nextCloudBillingState(current, next, background, selected.current));
    setLoading(false);
    setIsRefreshing(false);
  }, [month, readImports]);

  useEffect(() => { void refresh(); }, [refresh]);
  useAutoRefresh(refresh, { enabled: !data.forbidden });

  // Série de 6 meses: os 5 meses anteriores ao da tela (o mês da tela vem da leitura principal).
  const loadSeries = useCallback(async (only?: readonly string[]) => {
    const owner = month;
    const previous = monthsEndingAt(month, 6).slice(0, 5).filter((item) => !only || only.includes(item));
    const mark = (kind: "global" | "tenant", item: string, read: BackgroundRead<GlobalOverview> | BackgroundRead<TenantOverview>) =>
      setSeries((current) => (current.months[5] !== owner ? current : { ...current, [kind]: { ...current[kind], [item]: read } }));
    for (const item of previous) {
      mark("global", item, { state: "loading" });
      mark("tenant", item, { state: "loading" });
    }
    const tasks = previous.flatMap((item) => [
      async () => {
        try {
          const value = await getGlobalOverview(item);
          if (selectedMonth.current === owner) mark("global", item, { state: "ok", value });
        } catch {
          if (selectedMonth.current === owner) mark("global", item, { state: "error" });
        }
      },
      async () => {
        try {
          const value = await getTenantOverview(item);
          if (selectedMonth.current === owner) mark("tenant", item, { state: "ok", value });
        } catch {
          if (selectedMonth.current === owner) mark("tenant", item, { state: "error" });
        }
      },
    ]);
    await runLimited(tasks, 3);
  }, [month]);

  useEffect(() => {
    setSeries(emptySeries(month));
    setComposition({});
  }, [month]);

  const dataReady = data.source === "api" && data.month === month && !data.forbidden && data.failure === null;
  useEffect(() => {
    if (dataReady) void loadSeries();
  }, [dataReady, loadSeries]);

  // Detalhe de cada grupo (vínculos agendados e "desde"), em segundo plano: a lista de grupos não os traz (B9).
  const groupKey = data.groups.map((group) => group.id).join(",");
  const loadGroupDetails = useCallback(async () => {
    const ids = groupKey ? groupKey.split(",") : [];
    setGroupDetails(Object.fromEntries(ids.map((id) => [id, { state: "loading" } as const])));
    await runLimited(
      ids.map((id) => async () => {
        try {
          const value = await getEconomicGroup(id);
          setGroupDetails((current) => ({ ...current, [id]: { state: "ok", value } }));
        } catch {
          setGroupDetails((current) => ({ ...current, [id]: { state: "error" } }));
        }
      }),
      3,
    );
  }, [groupKey]);
  useEffect(() => {
    if (dataReady) void loadGroupDetails();
  }, [dataReady, loadGroupDetails]);

  /** A composição por serviço de uma organização (moeda original), lida quando o detalhe da linha abre. */
  const loadComposition = useCallback(async (runId: string, tenantId: string) => {
    const owner = month;
    setComposition((current) => ({ ...current, [tenantId]: { state: "loading" } }));
    try {
      const value = await listTenantAllocations(runId, tenantId);
      if (selectedMonth.current === owner) setComposition((current) => ({ ...current, [tenantId]: { state: "ok", value } }));
    } catch {
      if (selectedMonth.current === owner) setComposition((current) => ({ ...current, [tenantId]: { state: "error" } }));
    }
  }, [month]);

  const reloadAll = useCallback(async () => {
    await refresh();
    void loadSeries();
    void loadGroupDetails();
  }, [refresh, loadSeries, loadGroupDetails]);

  return { data, loading, isRefreshing, refresh, series, retrySeries: loadSeries, groupDetails, reloadGroupDetails: loadGroupDetails, composition, loadComposition, reloadAll };
}
