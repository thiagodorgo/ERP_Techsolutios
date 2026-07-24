import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getAuditEvents } from "./audit-events.service";
import type { AuditEventsData, AuditEventsQuery } from "./audit-events.types";
import { emptyAuditEvents } from "./audit-events.types";

// PR-SCALE-3 + Ω4C PR-11 — carrega a trilha de auditoria da organização ativa (GET /api/v1/audit-events) para
// a tela "Auditoria". D-Ω4C-AUD-FILTERS: filtros server-side (ação/ator/período) + paginação server-side por
// janela crescente (limit sobe no "Carregar mais"; o backend informa `nextOffset` quando há mais). Os eventos
// vêm do backend (o front nunca inventa; D-007). Em modo mock a lista já nasce VAZIA e honesta.

export type AuditFilters = {
  readonly action: string;
  readonly actorId: string;
  readonly from: string;
  readonly to: string;
};

const EMPTY_FILTERS: AuditFilters = { action: "", actorId: "", from: "", to: "" };
const PAGE_STEP = 50;

export function useAuditEvents() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<AuditEventsData>(() => emptyAuditEvents(isMockMode() ? "mock" : "api"));
  const [loading, setLoading] = useState(!isMockMode());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [limit, setLimit] = useState(PAGE_STEP);

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

  const query = useMemo<AuditEventsQuery>(
    () => ({
      action: filters.action || undefined,
      actorId: filters.actorId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      limit,
    }),
    [filters, limit],
  );

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém a lista atual visível,
  // sem flicker no auto-refresh); só a 1ª carga / mudança de filtro usa `loading`.
  const refresh = useCallback(
    async (background = false) => {
      if (!activeContext) return;
      if (background) setIsRefreshing(true);
      else setLoading(true);
      setData(await getAuditEvents(context, query));
      setLoading(false);
      setIsRefreshing(false);
    },
    [activeContext, context, query],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sem re-polling quando o gate `audit.read` respondeu 403 (mantém a mensagem de acesso negado).
  useAutoRefresh(refresh, { enabled: !data.forbidden });

  // Trocar um filtro reseta a janela para a primeira página (limit base) — a paginação é por janela crescente.
  const setFilter = useCallback((key: keyof AuditFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setLimit(PAGE_STEP);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setLimit(PAGE_STEP);
  }, []);

  const loadMore = useCallback(() => setLimit((prev) => prev + PAGE_STEP), []);

  const hasActiveFilters = Boolean(filters.action || filters.actorId || filters.from || filters.to);
  const hasMore = data.nextOffset !== undefined;

  return { data, loading, isRefreshing, refresh, filters, setFilter, clearFilters, loadMore, hasMore, hasActiveFilters };
}
