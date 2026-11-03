import { Download, Filter, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useScreenAppearance } from "../../appearance";
import { RevokeDispatchPrompt } from "../components/RevokeDispatchPrompt";
import { WorkOrderDetailWindow } from "../components/WorkOrderDetailWindow";
import { WorkOrdersListFilterCard } from "../components/WorkOrdersListFilterCard";
import { exportAvailability, exportWorkOrdersCsv } from "../work-orders-export";
import { countActiveFilters, EMPTY_LIST_FILTERS, toApiFilters, type WorkOrdersListFilterState } from "../work-orders-list-filters";
import { runAdvance, runRevokeConfirm, runRevokeDiscovery, type RevokeTarget } from "../work-orders-row.handlers";
import { listStatusKind } from "../work-orders.state";
import { useWorkOrders } from "../useWorkOrders";
import type { WorkOrderListItem } from "../work-orders.types";
import { filterWorkOrderList, readTab, targetDef } from "./views/work-orders.shared";
import type { WorkOrdersListState, WorkOrdersViewModel } from "./views/work-orders.view-model";
import { WorkOrdersViewA } from "./views/WorkOrdersViewA";
import { WorkOrdersViewB } from "./views/WorkOrdersViewB";
import { WorkOrdersViewC } from "./views/WorkOrdersViewC";

// Contrato dos testes que já montam as peças da lista por este caminho (`work-orders-honest-errors.test.tsx`): as peças
// moraram aqui até o B-APAR-OS e agora vivem no módulo compartilhado das aparências.
export { WorkOrdersKpiGrid, WorkOrdersLoadState, type WorkOrdersKpis } from "./views/work-orders.shared";

// "Ordens de Serviço" (lista). B-APAR-OS — esta página é o CONTÊINER das 3 aparências aprovadas pelo dono
// (`screen-refs/ordens-de-servico-3opcoes.reference.html`: A · Padrão fiel, B · Analítica, C · Fila por agenda;
// D-APARENCIA-POR-USUARIO, padrão A por D-APARENCIA-RESPOSTAS (b)), no padrão do `FinanceiroPage`: lê a aparência PESSOAL
// (`useScreenAppearance("ordens-de-servico")`), chama a lista UMA vez (`useWorkOrders`, com a auto-atualização de hoje —
// trocar de aparência NÃO repete a chamada), guarda o estado navegável na querystring (`?aba=`, `?alvo=`, `?q=`, `?os=`;
// é o que deixa o "Ver fila" do Dashboard abrir a lista já recortada), monta UM modelo e entrega a uma view PURA. Os
// handlers de linha (dar andamento, revogar envio), o prompt de motivo, o cartão de filtros, o CSV e a janela fixa do
// detalhe (B e C) moram aqui. Nenhum número é fabricado (D-007): contagem sobre a lista carregada diz o universo quando o
// servidor tem mais OS; técnico sem nome na lista é "Atribuído" (P-WO-LIST-TECH-NAME).

export function WorkOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { appearance } = useScreenAppearance("ordens-de-servico");
  const { permissions } = usePermissions();

  const [listFilters, setListFilters] = useState<WorkOrdersListFilterState>(EMPTY_LIST_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { priority: filterPriority, from: filterFrom, to: filterTo } = listFilters;
  const apiFilters = useMemo(() => toApiFilters({ priority: filterPriority, from: filterFrom, to: filterTo }), [filterPriority, filterFrom, filterTo]);
  // B-SAN3-01 (P-008) — `status` decide o painel (§7): vazio ≠ erro ≠ sem permissão; `stale` acende a faixa
  // "dados desatualizados" sem apagar a lista. Nada aqui recebe OS fabricada.
  const { items, allItems, pagination, loading, source, status, error, stale, lastUpdatedAt, refresh, context } = useWorkOrders(apiFilters);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(context.tenantId) });

  const state: WorkOrdersListState = {
    tab: readTab(searchParams.get("aba")),
    target: targetDef(searchParams.get("alvo")) ? searchParams.get("alvo") : null,
    q: searchParams.get("q") ?? "",
    openId: searchParams.get("os") || null,
  };

  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Ω3F-9 — estado por-linha das ações (avançar/revogar) + o prompt de motivo do revogar.
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string | null>>({});
  const [revoke, setRevoke] = useState<RevokeTarget | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);

  const setBusy = useCallback((id: string, value: boolean) => setRowBusy((m) => ({ ...m, [id]: value })), []);
  const setError = useCallback((id: string, value: string | null) => setRowError((m) => ({ ...m, [id]: value })), []);
  const handleAdvance = useCallback((order: WorkOrderListItem) => runAdvance({ context, refresh, setBusy, setError }, order), [context, refresh, setBusy, setError]);
  const handleRevokeClick = useCallback(
    async (order: WorkOrderListItem) => {
      setRevokeError(null);
      const target = await runRevokeDiscovery({ context, setBusy, setError }, order);
      if (target) setRevoke(target);
    },
    [context, setBusy, setError],
  );
  const handleRevokeConfirm = useCallback(
    async (reason: string) => {
      if (!revoke) return;
      setRevokeBusy(true);
      setRevokeError(null);
      const result = await runRevokeConfirm({ context, refresh }, revoke, reason);
      if (result === true) setRevoke(null);
      else setRevokeError(result);
      setRevokeBusy(false);
    },
    [context, revoke, refresh],
  );

  // Fechar a janela devolve o foco à linha da OS (referência `fecharOS`); o resumo dela fica aberto.
  useEffect(() => {
    if (!focusRowId || typeof document === "undefined") return;
    const key = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(focusRowId) : focusRowId;
    const row = document.querySelector?.<HTMLElement>(`[data-row-key="${key}"]`);
    row?.focus?.();
    setFocusRowId(null);
  }, [focusRowId]);

  const writeState = (next: WorkOrdersListState, replace = true) => {
    const params = new URLSearchParams(searchParams);
    const put = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    put("aba", next.tab === "todas" ? null : next.tab);
    put("alvo", next.target);
    put("q", next.q || null);
    put("os", next.openId);
    setSearchParams(params, { replace });
  };
  const onState = (next: WorkOrdersListState) => {
    if (next.tab !== state.tab || next.target !== state.target || next.q !== state.q) setExpandedId(null);
    writeState(next);
  };

  const now = new Date();
  const visible = filterWorkOrderList(items, state, now);
  const activeFilterCount = countActiveFilters(listFilters);
  const kind = listStatusKind(status);
  const canCreate = permissions.includes("work_orders:create");
  const showListActions = status !== "forbidden";
  const exportState = exportAvailability({
    loading,
    failure: kind === "failure",
    total: visible.length,
    stale,
    demo: source === "mock",
    loaded: allItems.length,
    serverTotal: pagination.total,
  });
  const updateListFilters = (next: WorkOrdersListFilterState) => setListFilters(next);
  const openWindow = appearance !== "A";

  const headerActions =
    showListActions || canCreate ? (
      <>
        {showListActions ? (
          <>
            <button
              type="button"
              className={activeFilterCount > 0 ? "pat-btn pat-btn--engaged" : "pat-btn"}
              aria-expanded={filtersOpen}
              aria-controls={filtersOpen ? "os-filtros" : undefined}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Filter size={15} aria-hidden="true" />
              Filtrar
              {activeFilterCount > 0 ? <span className="pat-btn__count" aria-hidden="true">{activeFilterCount}</span> : null}
              {activeFilterCount > 0 ? <span className="sr-only">{activeFilterCount === 1 ? ", 1 filtro ativo" : `, ${activeFilterCount} filtros ativos`}</span> : null}
            </button>
            <button
              type="button"
              className="pat-btn"
              disabled={!exportState.enabled}
              style={exportState.enabled ? undefined : { opacity: 0.55, cursor: "not-allowed" }}
              title={exportState.hint}
              onClick={() => exportWorkOrdersCsv(visible, source, Date.now())}
            >
              <Download size={15} aria-hidden="true" />
              Exportar
            </button>
          </>
        ) : null}
        {canCreate ? (
          <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
            <Plus size={15} aria-hidden="true" />
            Nova OS
          </button>
        ) : null}
      </>
    ) : undefined;

  const filterCard =
    filtersOpen && showListActions ? (
      <WorkOrdersListFilterCard id="os-filtros" value={listFilters} now={now} onChange={updateListFilters} onClear={() => updateListFilters(EMPTY_LIST_FILTERS)} />
    ) : null;

  const openDetail = (id: string) => {
    if (openWindow) writeState({ ...state, openId: id });
    else navigate(`/work-orders/${id}`);
  };

  const model: WorkOrdersViewModel = {
    items,
    loaded: allItems.length,
    serverTotal: pagination.total,
    partial: pagination.total > allItems.length,
    status,
    loading,
    error,
    stale,
    lastUpdatedAt,
    demo: source === "mock" && !stale,
    now,
    access: { create: canCreate, dispatch: permissions.includes("field_dispatch:create"), permissions },
    state,
    activeFilterCount,
    headerActions,
    filterCard,
    expandedId,
    rowBusy,
    rowError,
    onState,
    onToggleRow: (id) => setExpandedId((current) => (current === id ? null : id)),
    onOpenDetail: openDetail,
    onLink: (id) => (openWindow ? writeState({ ...state, openId: id }) : navigate(`/work-orders/${id}?aba=informacoes-gerais`)),
    onAssign: (id) => navigate(`/operations/dispatches?workOrderId=${id}`),
    onAdvance: (order) => void handleAdvance(order),
    onRevoke: (order) => void handleRevokeClick(order),
    onCreate: () => navigate("/work-orders/new"),
    onRetry: () => void refresh(),
  };

  const closeWindow = () => {
    const id = state.openId;
    writeState({ ...state, openId: null });
    if (id) {
      setExpandedId(id);
      setFocusRowId(id);
    }
  };

  return (
    <>
      {appearance === "B" ? <WorkOrdersViewB {...model} /> : appearance === "C" ? <WorkOrdersViewC {...model} /> : <WorkOrdersViewA {...model} />}

      {openWindow && state.openId ? <WorkOrderDetailWindow key={state.openId} workOrderId={state.openId} onClose={closeWindow} /> : null}

      {revoke ? (
        <RevokeDispatchPrompt
          workOrderCode={revoke.workOrder.code}
          submitting={revokeBusy}
          errorMessage={revokeError}
          onConfirm={(reason) => void handleRevokeConfirm(reason)}
          onClose={() => setRevoke(null)}
        />
      ) : null}
    </>
  );
}

export default WorkOrdersPage;
