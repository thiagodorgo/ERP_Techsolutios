import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listFinancialTitlesFromApi } from "./financial-titles.service";
import type { FinancialTitleDirection, FinancialTitlesData } from "./financial-titles.types";

const PAGE_LIMIT = 100;

function mergePages(pages: readonly FinancialTitlesData[]) {
  const byId = new Map(pages.flatMap((page) => page.items).map((item) => [item.id, item]));
  return [...byId.values()];
}

// Hook parametrizado por direction — a MESMA lógica alimenta Cobranças (receivable) e Pagamentos
// (payable). O contexto (token/tenant/permissões) vem da sessão/organização ativa e serve tanto ao
// carregamento da lista quanto às ações de escrita (criar/transição de status).
export function useFinancialTitles(direction: FinancialTitleDirection) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<FinancialTitlesData>({
    items: [],
    pagination: { limit: 20, offset: 0, total: 0 },
    source: "api",
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const dataRef = useRef(data);
  const requestRound = useRef(0);
  const scopeRef = useRef("");

  const commitData = useCallback((nextData: FinancialTitlesData) => {
    dataRef.current = nextData;
    setData(nextData);
  }, []);

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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém o dado atual
  // visível, sem flicker no auto-refresh); só a 1ª carga / refresh explícito usa `loading`.
  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;
    const scope = `${activeContext.tenantId}:${activeContext.branchId ?? ""}:${direction}`;
    if (scopeRef.current !== scope) {
      scopeRef.current = scope;
      dataRef.current = { items: [], pagination: { limit: PAGE_LIMIT, offset: 0, total: 0 }, source: "api" };
    }
    const round = ++requestRound.current;
    // Uma releitura substitui qualquer paginação em voo; o resultado antigo será ignorado pelo `round`.
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (background) setIsRefreshing(true);
    else setLoading(true);
    const reached = Math.max(PAGE_LIMIT, dataRef.current.items.length);
    const offsets = Array.from({ length: Math.max(1, Math.ceil(reached / PAGE_LIMIT)) }, (_, index) => index * PAGE_LIMIT);
    const pages = await Promise.all(
      offsets.map((offset) => listFinancialTitlesFromApi(context, { direction, limit: PAGE_LIMIT, offset })),
    );
    if (round === requestRound.current) {
      const failed = pages.find((page) => page.source === "fallback");
      if (failed) {
        // Mesma forma de antes da paginação: a falha devolve o fallback vazio; quem mostra o último dado bom
        // é a tela (`useLastGood` na página; banner na lista legada).
        commitData(failed);
      } else {
        const items = mergePages(pages);
        const first = pages[0];
        commitData({
          items,
          pagination: { limit: PAGE_LIMIT, offset: 0, total: first.pagination.total },
          source: first.source,
        });
      }
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeContext, commitData, context, direction]);

  const loadMore = useCallback(async () => {
    if (!activeContext || loadingMoreRef.current) return;
    const current = dataRef.current;
    if (current.items.length >= current.pagination.total) return;
    const round = ++requestRound.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const page = await listFinancialTitlesFromApi(context, {
      direction,
      limit: PAGE_LIMIT,
      offset: current.items.length,
    });
    if (round === requestRound.current) {
      if (page.source === "fallback") {
        commitData({ ...current, source: "fallback", fallbackReason: page.fallbackReason });
      } else {
        const items = mergePages([current, page]);
        commitData({
          items,
          pagination: { limit: PAGE_LIMIT, offset: 0, total: page.pagination.total },
          source: page.source,
        });
      }
      loadingMoreRef.current = false;
      setLoadingMore(false);
      // `loadMore` pode ter substituído um refresh automático em voo. A lista já tem dado válido e não
      // pode deixar a faixa/skeleton presos quando o refresh superado finalmente retornar.
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [activeContext, commitData, context, direction]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items: data.items,
    pagination: data.pagination,
    total: data.pagination.total,
    hasMore: data.items.length < data.pagination.total,
    loadingMore,
    loadMore,
    source: data.source,
    fallbackReason: data.fallbackReason,
    loading,
    isRefreshing,
    refresh,
    context,
  };
}
