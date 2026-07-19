import { AlertTriangle, Archive, ArchiveRestore, ArrowLeftRight, CheckCircle2, ClipboardList, Layers, Package, Pencil, Plus, ShoppingCart, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { DenseColumn } from "../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, Modal, SearchBar, Select, Skeleton } from "../../../components/ui";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import { useAuth } from "../../../providers/AuthProvider";
import { usePermissions } from "../../../providers/PermissionProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { useVehicles } from "../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../registry/vehicles/vehicles.types";
import { useWorkOrders } from "../../work-orders/useWorkOrders";
import type { WorkOrdersFilters } from "../../work-orders/work-orders.types";
import { CycleCountModal } from "../components/CycleCountModal";
import { CycleCountSessionDrawer } from "../components/CycleCountSessionDrawer";
import { InventoryItemFormModal } from "../components/InventoryItemFormModal";
import { StockMovementFormModal } from "../components/StockMovementFormModal";
import {
  getCycleCountClassLabel,
  getCycleCountStatusLabel,
  getCycleCountStatusTone,
} from "../cycle-counts.adapter";
import type { CycleCount, CycleCountClassFilter, CycleCountStatusFilter, CycleCountsFilters } from "../cycle-counts.types";
import {
  STOCK_MOVEMENT_TYPE_OPTIONS,
  computeInventoryTotals,
  filterInventoryItems,
  filterStockMovements,
  formatAbcRecalcSummary,
  formatMovementDateTime,
  formatQuantity,
  formatReorderPoint,
  formatSignedQuantity,
  formatValor,
  getAbcClassLabel,
  getMovementTypeLabel,
  getMovementTypeTone,
  getReorderChipLabel,
  getReorderChipTone,
  getReplenishmentLabel,
  getReplenishmentTone,
  isStockMovementType,
} from "../inventory.adapter";
import { recalculateAbc, updateInventoryItem } from "../inventory.service";
import type { InventoryItem, InventoryItemsFilters, InventoryStatusFilter, StockMovement, StockMovementsFilters } from "../inventory.types";
import { useCycleCounts } from "../useCycleCounts";
import { useInventoryItems } from "../useInventoryItems";
import { useStockMovements } from "../useStockMovements";

// F7a Estoque core + F7b Estoque avançado — "Estoque" (sc_estoque), ligado aos
// endpoints reais /api/v1/inventory-items, /stock-movements e /cycle-counts.
// A identidade visual da tela aprovada (cabeçalho, abas em pílula e cartões de
// indicador) foi preservada; as linhas fabricadas da casca estática seguem removidas (D-007).
// Abas: Itens | Movimentações | Contagem (estado na URL). F7b entrega a aba Contagem,
// o ponto de pedido/reposição sugerida (R7.5) e o recálculo ABC (R7.4).

const STABLE_MOVEMENTS_FILTERS: StockMovementsFilters = { limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_WORK_ORDER_FILTERS: WorkOrdersFilters = { search: "", status: "all", priority: "all", assignedOperatorId: "", from: "", to: "" };

type TabKey = "itens" | "movimentacoes" | "contagem";

const STATUS_TABS: readonly { value: InventoryStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

// F7b — opções de filtro da aba Contagem (situação e classe da sessão).
const CYCLE_COUNT_STATUS_OPTIONS: readonly { value: CycleCountStatusFilter; label: string }[] = [
  { value: "all", label: "Todas as situações" },
  { value: "aberta", label: "Aberta" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];
const CYCLE_COUNT_CLASS_OPTIONS: readonly { value: CycleCountClassFilter; label: string }[] = [
  { value: "all", label: "Todas as classes" },
  { value: "A", label: "Classe A" },
  { value: "B", label: "Classe B" },
  { value: "C", label: "Classe C" },
];

// Tokens visuais herdados da tela aprovada (casca sc_estoque).
const mono = "'JetBrains Mono', monospace";
const POSITIVE_QTY_COLOR = "#059669";
const NEGATIVE_QTY_COLOR = "#DC2626";

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  marginBottom: 16,
  paddingBottom: 16,
  borderBottom: "1px solid #F1F5F9",
  flexWrap: "wrap",
  gap: 12,
};
const titleStyle: CSSProperties = { fontSize: 20, fontWeight: 800, letterSpacing: "-.3px" };
const subtitleStyle: CSSProperties = { fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: 500 };
const headerActionsStyle: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const tabBarStyle: CSSProperties = { display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 10, padding: 4, marginBottom: 18, overflowX: "auto", flexWrap: "nowrap", width: "fit-content" };
const statGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 };
const statCardStyle: CSSProperties = { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 13, padding: 16 };
const statValueStyle: CSSProperties = { fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-.4px", marginBottom: 2, fontVariantNumeric: "tabular-nums" };
const statLabelStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: "#475569" };
const chipRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 14 };
const statusRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterGroupStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const filterFieldStyle: CSSProperties = { minWidth: 200 };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const alertSectionStyle: CSSProperties = { marginBottom: 14 };
const successBannerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
  padding: "11px 14px",
  borderRadius: 12,
  background: "#F0FDF4",
  border: "1px solid #BBF7D0",
  color: "#166534",
  fontSize: 13,
  fontWeight: 600,
};

function tabButtonStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 14px",
    border: "none",
    borderRadius: 7,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    background: active ? "#2563EB" : "transparent",
    color: active ? "#fff" : "#64748B",
  };
}

export function EstoquePage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const tab: TabKey = tabParam === "movimentacoes" ? "movimentacoes" : tabParam === "contagem" ? "contagem" : "itens";
  // Toggle "Abaixo do mínimo" na URL → refetch com below_min=true no servidor.
  const belowMinOnly = searchParams.get("below_min") === "true";
  // F7b — toggle "Precisa repor" na URL → refetch com needs_reorder=true no servidor.
  const needsReorderOnly = searchParams.get("needs_reorder") === "true";
  const movementItemFilter = searchParams.get("item") ?? "";
  const tipoParam = searchParams.get("tipo");
  const movementTypeFilter = isStockMovementType(tipoParam) ? tipoParam : undefined;

  const itemsFilters = useMemo<InventoryItemsFilters>(
    () => ({
      search: "",
      isActive: "all",
      belowMin: belowMinOnly || undefined,
      needsReorder: needsReorderOnly || undefined,
      limit: DENSE_LIST_FETCH_LIMIT,
    }),
    [belowMinOnly, needsReorderOnly],
  );

  const { items, pagination, loading, error, refresh } = useInventoryItems(itemsFilters);
  const {
    items: movements,
    pagination: movementsPagination,
    loading: movementsLoading,
    error: movementsError,
    refresh: refreshMovements,
  } = useStockMovements(STABLE_MOVEMENTS_FILTERS);
  const { items: workOrders } = useWorkOrders(STABLE_WORK_ORDER_FILTERS);
  const { items: vehicles } = useVehicles(STABLE_VEHICLE_FILTERS);

  const canCreateItem = can("inventory_items:create");
  const canUpdateItem = can("inventory_items:update");
  const canCreateMovement = can("stock_movements:create");
  // F7b — RBAC de contagem cíclica (RBAC_MATRIX: cycle_counts:read|create).
  const canReadCycleCount = can("cycle_counts:read");
  const canCreateCycleCount = can("cycle_counts:create");

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [movementFormOpen, setMovementFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // F7b — recálculo ABC (confirmação + feedback de sucesso).
  const [abcConfirmOpen, setAbcConfirmOpen] = useState(false);
  const [abcBusy, setAbcBusy] = useState(false);
  const [abcFeedback, setAbcFeedback] = useState<string | null>(null);
  const [abcError, setAbcError] = useState<string | null>(null);

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

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const workOrderById = useMemo(() => new Map(workOrders.map((workOrder) => [workOrder.id, workOrder])), [workOrders]);

  // Escreve um parâmetro extra preservando os demais; troca de filtro volta à primeira página.
  const setExtraParam = useCallback(
    (key: "below_min" | "needs_reorder" | "item" | "tipo", value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Troca de aba zera busca/filtros/ordenação/página (vocabulários diferentes por aba).
  const switchTab = useCallback(
    (next: TabKey) => {
      if (next === tab) return;
      const params = new URLSearchParams();
      if (next === "movimentacoes") params.set("tab", "movimentacoes");
      setSearchParams(params, { replace: true });
    },
    [tab, setSearchParams],
  );

  const refreshAll = useCallback(
    (background = false) => {
      void refresh(background);
      void refreshMovements(background);
    },
    [refresh, refreshMovements],
  );

  // WS-UI-REFRESH — o sistema recarrega itens e movimentações sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refreshAll, { enabled: Boolean(activeContext) });

  function openCreateItem() {
    setEditingItem(null);
    setItemFormOpen(true);
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    setItemFormOpen(true);
  }

  async function toggleItemActive(item: InventoryItem) {
    setBusyId(item.id);
    setActionError(null);
    try {
      await updateInventoryItem(context, item.id, { isActive: !item.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${item.isActive ? "desativar" : "reativar"} o item ${item.sku}. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  // F7b — recálculo ABC: reescreve TODAS as classes (Pareto 12m) → confirmar antes.
  async function runAbcRecalc() {
    setAbcBusy(true);
    setAbcError(null);
    try {
      const summary = await recalculateAbc(context);
      setAbcFeedback(`Classes ABC recalculadas. ${formatAbcRecalcSummary(summary)}`);
      setAbcConfirmOpen(false);
      await refresh();
    } catch {
      setAbcError("Não foi possível recalcular as classes ABC. Tente novamente.");
    } finally {
      setAbcBusy(false);
    }
  }

  // Totais reais das janelas carregadas — renderizam mesmo vazio.
  const totals = useMemo(() => computeInventoryTotals(items, movements), [items, movements]);

  return (
    <div style={{ color: "#0F172A" }}>
      {/* page header — identidade da tela aprovada: título + subtítulo + ações à direita */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Estoque</h1>
          <p style={subtitleStyle}>itens, saldos, custo médio e movimentações do estoque</p>
        </div>
        <div style={headerActionsStyle}>
          <SearchBar
            value={searchParams.get("q") ?? ""}
            onChange={(value) => {
              const next = new URLSearchParams(searchParams);
              if (value) next.set("q", value);
              else next.delete("q");
              next.delete("page");
              setSearchParams(next, { replace: true });
            }}
            placeholder={
              tab === "itens"
                ? "Buscar por SKU ou nome…"
                : tab === "movimentacoes"
                  ? "Buscar por item, OS ou motivo…"
                  : "Buscar por situação ou classe…"
            }
          />
          {canCreateItem ? (
            <Button type="button" variant="secondary" onClick={openCreateItem}>
              <Plus size={16} aria-hidden /> Novo item
            </Button>
          ) : null}
          {canCreateMovement ? (
            <Button type="button" onClick={() => setMovementFormOpen(true)}>
              <Plus size={16} aria-hidden /> Movimento
            </Button>
          ) : null}
        </div>
      </div>

      {/* abas em pílula — Itens | Movimentações | Contagem (F7b entrega a Contagem) */}
      <div style={tabBarStyle} role="tablist" aria-label="Seções do estoque">
        <button type="button" role="tab" aria-selected={tab === "itens"} style={tabButtonStyle(tab === "itens")} onClick={() => switchTab("itens")}>
          Itens
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "movimentacoes"}
          style={tabButtonStyle(tab === "movimentacoes")}
          onClick={() => switchTab("movimentacoes")}
        >
          Movimentações
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "contagem"}
          style={tabButtonStyle(tab === "contagem")}
          onClick={() => switchTab("contagem")}
        >
          Contagem
        </button>
      </div>

      {actionError ? (
        <div style={alertSectionStyle}>
          <Alert title="Ação não concluída" tone="danger">
            {actionError}
          </Alert>
        </div>
      ) : null}

      {/* F7b — feedback de sucesso do recálculo ABC (aria-live para leitores de tela) */}
      {abcFeedback ? (
        <div style={successBannerStyle} role="status" aria-live="polite">
          <CheckCircle2 size={18} aria-hidden style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{abcFeedback}</span>
          <button
            type="button"
            aria-label="Dispensar aviso"
            onClick={() => setAbcFeedback(null)}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#166534", display: "inline-flex" }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : null}

      {abcError ? (
        <div style={alertSectionStyle}>
          <Alert title="Não foi possível recalcular o ABC" tone="danger">
            {abcError}
          </Alert>
        </div>
      ) : null}

      {/* indicadores reais — cartões no estilo da tela aprovada */}
      <div style={statGridStyle}>
        <StatCard
          icon={<Package size={16} aria-hidden />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          value={totals.activeItems.toLocaleString("pt-BR")}
          label="Itens ativos"
          tag={`${items.length.toLocaleString("pt-BR")} na janela`}
          tagBg="#EFF6FF"
          tagColor="#2563EB"
        />
        <StatCard
          icon={<AlertTriangle size={16} aria-hidden />}
          iconBg="#FFFBEB"
          iconColor="#D97706"
          value={totals.belowMinItems.toLocaleString("pt-BR")}
          label="Abaixo do mínimo"
          tag={totals.belowMinItems > 0 ? "Atenção" : "OK"}
          tagBg={totals.belowMinItems > 0 ? "#FFFBEB" : "#ECFDF5"}
          tagColor={totals.belowMinItems > 0 ? "#D97706" : "#059669"}
        />
        <StatCard
          icon={<ShoppingCart size={16} aria-hidden />}
          iconBg="#FEF2F2"
          iconColor="#DC2626"
          value={totals.needsReorderItems.toLocaleString("pt-BR")}
          label="Precisam repor"
          tag={totals.needsReorderItems > 0 ? "Repor" : "OK"}
          tagBg={totals.needsReorderItems > 0 ? "#FEF2F2" : "#ECFDF5"}
          tagColor={totals.needsReorderItems > 0 ? "#DC2626" : "#059669"}
        />
        <StatCard
          icon={<ArrowLeftRight size={16} aria-hidden />}
          iconBg="#F5F3FF"
          iconColor="#7C3AED"
          value={totals.movementsCount.toLocaleString("pt-BR")}
          label="Movimentações no período"
          tag={movementsPagination.total > movements.length ? `de ${movementsPagination.total.toLocaleString("pt-BR")}` : "Janela carregada"}
          tagBg="#F5F3FF"
          tagColor="#7C3AED"
        />
      </div>

      {tab === "itens" ? (
        <ItemsTab
          items={items}
          paginationTotal={pagination.total}
          loading={loading}
          error={error}
          onRetry={() => void refresh()}
          belowMinOnly={belowMinOnly}
          onToggleBelowMin={() => setExtraParam("below_min", belowMinOnly ? "" : "true")}
          needsReorderOnly={needsReorderOnly}
          onToggleNeedsReorder={() => setExtraParam("needs_reorder", needsReorderOnly ? "" : "true")}
          canUpdate={canUpdateItem}
          onRecalcAbc={() => {
            setAbcFeedback(null);
            setAbcError(null);
            setAbcConfirmOpen(true);
          }}
          busyId={busyId}
          onEdit={openEditItem}
          onToggleActive={(item) => void toggleItemActive(item)}
        />
      ) : tab === "movimentacoes" ? (
        <MovementsTab
          movements={movements}
          items={items}
          itemById={itemById}
          workOrderById={workOrderById}
          paginationTotal={movementsPagination.total}
          loading={movementsLoading}
          error={movementsError}
          onRetry={() => void refreshMovements()}
          itemFilter={movementItemFilter}
          typeFilter={movementTypeFilter}
          onItemFilterChange={(value) => setExtraParam("item", value)}
          onTypeFilterChange={(value) => setExtraParam("tipo", value)}
        />
      ) : canReadCycleCount ? (
        <CycleCountsTab context={context} itemById={itemById} canCreate={canCreateCycleCount} canManage={canCreateCycleCount} />
      ) : (
        <Card title="Contagem cíclica">
          <EmptyState
            title="Sem acesso à contagem cíclica"
            detail="Seu perfil não tem permissão para consultar as contagens cíclicas desta organização."
          />
        </Card>
      )}

      {itemFormOpen ? (
        <InventoryItemFormModal
          key={editingItem?.id ?? "new"}
          item={editingItem}
          context={context}
          onClose={() => {
            setItemFormOpen(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setItemFormOpen(false);
            setEditingItem(null);
            void refresh();
          }}
        />
      ) : null}

      {movementFormOpen ? (
        <StockMovementFormModal
          items={items}
          workOrders={workOrders}
          vehicles={vehicles}
          context={context}
          onClose={() => setMovementFormOpen(false)}
          onSaved={() => {
            setMovementFormOpen(false);
            // Movimento altera o saldo → recarrega itens e movimentações.
            refreshAll();
          }}
        />
      ) : null}

      {/* F7b — confirmação do recálculo ABC (reescreve todas as classes) */}
      {abcConfirmOpen ? (
        <Modal title="Recalcular classes ABC" open onClose={() => (abcBusy ? undefined : setAbcConfirmOpen(false))}>
          <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.5 }}>
            O recálculo reordena os itens por <strong>valor de consumo dos últimos 12 meses</strong> (curva de Pareto) e{" "}
            <strong>reescreve a classe ABC de todos os itens</strong> desta organização. Esta ação substitui as classes atuais.
          </p>
          <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" }}>
            <Button type="button" variant="ghost" onClick={() => setAbcConfirmOpen(false)} disabled={abcBusy}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void runAbcRecalc()} disabled={abcBusy}>
              {abcBusy ? "Recalculando…" : "Recalcular ABC"}
            </Button>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  tag,
  tagBg,
  tagColor,
}: {
  readonly icon: ReactNode;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly value: string;
  readonly label: string;
  readonly tag: string;
  readonly tagBg: string;
  readonly tagColor: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
          {icon}
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: tagBg, color: tagColor }}>{tag}</span>
      </div>
      <div style={statValueStyle}>{value}</div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  );
}

// ── Aba Itens ─────────────────────────────────────────────────────────────────
function ItemsTab({
  items,
  paginationTotal,
  loading,
  error,
  onRetry,
  belowMinOnly,
  onToggleBelowMin,
  needsReorderOnly,
  onToggleNeedsReorder,
  canUpdate,
  onRecalcAbc,
  busyId,
  onEdit,
  onToggleActive,
}: {
  readonly items: readonly InventoryItem[];
  readonly paginationTotal: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly belowMinOnly: boolean;
  readonly onToggleBelowMin: () => void;
  readonly needsReorderOnly: boolean;
  readonly onToggleNeedsReorder: () => void;
  readonly canUpdate: boolean;
  readonly onRecalcAbc: () => void;
  readonly busyId: string | null;
  readonly onEdit: (item: InventoryItem) => void;
  readonly onToggleActive: (item: InventoryItem) => void;
}) {
  const columns: DenseColumn<InventoryItem>[] = [
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      sortValue: (item) => item.sku,
      render: (item) => (
        <Link to={`/inventory/${item.id}`} aria-label={`Abrir detalhe do item ${item.sku}`} style={{ fontFamily: mono }}>
          <strong>{item.sku}</strong>
        </Link>
      ),
    },
    {
      key: "name",
      header: "Nome",
      sortable: true,
      sortValue: (item) => item.name,
      render: (item) => item.name,
    },
    {
      key: "unit",
      header: "Unidade",
      render: (item) => item.unit,
    },
    {
      key: "saldo",
      header: "Saldo",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (item) => item.saldo,
      render: (item) => <strong>{formatQuantity(item.saldo)}</strong>,
    },
    {
      key: "minMax",
      header: "Mín/Máx",
      align: "right",
      tabular: true,
      render: (item) => `${formatQuantity(item.minQuantity)} / ${item.maxQuantity != null ? formatQuantity(item.maxQuantity) : "—"}`,
    },
    {
      // F7b — ponto de pedido (R7.5) + chip-link "Repor" (sugestão, sem automatizar compra).
      key: "reorderPoint",
      header: "Ponto de pedido",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (item) => item.reorderPoint,
      render: (item) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <span>{formatReorderPoint(item.reorderPoint)}</span>
          {item.needsReorder ? (
            <Link
              to="/purchase-orders"
              aria-label={`Sugerir reposição de ${item.sku} em Pedidos`}
              style={{ textDecoration: "none" }}
            >
              <Chip tone={getReorderChipTone()}>{getReorderChipLabel()}</Chip>
            </Link>
          ) : null}
        </span>
      ),
    },
    {
      key: "avgCost",
      header: "Custo médio",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (item) => item.avgCost,
      render: (item) => formatValor(item.avgCost),
    },
    {
      key: "abcClass",
      header: "Classe ABC",
      sortable: true,
      sortValue: (item) => item.abcClass ?? "",
      render: (item) => <Chip tone="default">{getAbcClassLabel(item.abcClass)}</Chip>,
    },
    {
      key: "replenishment",
      header: "Situação de reposição",
      sortable: true,
      sortValue: (item) => (item.belowMin ? 0 : 1),
      render: (item) => <Chip tone={getReplenishmentTone(item.belowMin)}>{getReplenishmentLabel(item.belowMin)}</Chip>,
    },
    {
      key: "active",
      header: "Situação",
      sortable: true,
      sortValue: (item) => (item.isActive ? 0 : 1),
      render: (item) => <Chip tone={item.isActive ? "success" : "default"}>{item.isActive ? "Ativo" : "Inativo"}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (item) => (
        <div className="work-orders-row-actions">
          {canUpdate ? (
            <>
              <Button type="button" size="sm" variant="secondary" aria-label={`Editar item ${item.sku}`} onClick={() => onEdit(item)}>
                <Pencil size={14} aria-hidden /> Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busyId === item.id}
                aria-label={`${item.isActive ? "Desativar" : "Reativar"} o item ${item.sku}`}
                onClick={() => onToggleActive(item)}
              >
                {item.isActive ? <Archive size={14} aria-hidden /> : <ArchiveRestore size={14} aria-hidden />}
                {item.isActive ? "Desativar" : "Reativar"}
              </Button>
            </>
          ) : (
            <span style={mutedStyle}>—</span>
          )}
        </div>
      ),
    },
  ];

  const denseFilter = useCallback(
    (rows: readonly InventoryItem[], base: { search: string; isActive: InventoryStatusFilter }) =>
      filterInventoryItems(rows, { ...base, belowMin: belowMinOnly || undefined, needsReorder: needsReorderOnly || undefined }),
    [belowMinOnly, needsReorderOnly],
  );

  const dense = useDenseList<InventoryItem>({ items, columns, filter: denseFilter, defaultSort: { key: "sku", dir: "asc" } });

  return (
    <>
      <div style={chipRowStyle}>
        <div style={statusRowStyle} role="group" aria-label="Filtrar itens por situação">
          {STATUS_TABS.map((statusTab) => (
            <Button
              key={statusTab.value}
              type="button"
              size="sm"
              variant={dense.status === statusTab.value ? "primary" : "ghost"}
              aria-pressed={dense.status === statusTab.value}
              onClick={() => dense.setStatus(statusTab.value)}
            >
              {statusTab.label}
            </Button>
          ))}
        </div>
        <div style={statusRowStyle}>
          <Button type="button" size="sm" variant={belowMinOnly ? "primary" : "ghost"} aria-pressed={belowMinOnly} onClick={onToggleBelowMin}>
            <AlertTriangle size={14} aria-hidden /> Abaixo do mínimo
          </Button>
          <Button type="button" size="sm" variant={needsReorderOnly ? "primary" : "ghost"} aria-pressed={needsReorderOnly} onClick={onToggleNeedsReorder}>
            <ShoppingCart size={14} aria-hidden /> Precisa repor
          </Button>
          {canUpdate ? (
            <Button type="button" size="sm" variant="secondary" onClick={onRecalcAbc}>
              <Layers size={14} aria-hidden /> Recalcular ABC
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div style={alertSectionStyle}>
          <Alert title="Não foi possível carregar os itens" tone="warning">
            {error}{" "}
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          </Alert>
        </div>
      ) : null}

      <Card
        title="Itens de estoque"
        action={
          <span style={countStyle}>
            {dense.total} item(ns)
            {paginationTotal > items.length ? ` · janela: primeiros ${items.length} de ${paginationTotal}` : ""}
          </span>
        }
      >
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhum item encontrado"
            detail={
              dense.hasActiveFilters || belowMinOnly || needsReorderOnly
                ? "Ajuste a busca, a situação ou os filtros de reposição para encontrar itens."
                : "Cadastre o primeiro item para controlar saldo, custo médio e reposição."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(item) => item.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
            <DenseListPagination
              page={dense.page}
              pageSize={dense.pageSize}
              pageSizeOptions={dense.pageSizeOptions}
              total={dense.total}
              totalPages={dense.totalPages}
              pageStart={dense.pageStart}
              pageEnd={dense.pageEnd}
              onPageChange={dense.setPage}
              onPageSizeChange={dense.setPageSize}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}

// ── Aba Movimentações (imutáveis — sem coluna de ações) ──────────────────────
function MovementsTab({
  movements,
  items,
  itemById,
  workOrderById,
  paginationTotal,
  loading,
  error,
  onRetry,
  itemFilter,
  typeFilter,
  onItemFilterChange,
  onTypeFilterChange,
}: {
  readonly movements: readonly StockMovement[];
  readonly items: readonly InventoryItem[];
  readonly itemById: ReadonlyMap<string, InventoryItem>;
  readonly workOrderById: ReadonlyMap<string, { code: string }>;
  readonly paginationTotal: number;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly itemFilter: string;
  readonly typeFilter: StockMovement["type"] | undefined;
  readonly onItemFilterChange: (value: string) => void;
  readonly onTypeFilterChange: (value: string) => void;
}) {
  const columns: DenseColumn<StockMovement>[] = [
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      tabular: true,
      sortValue: (movement) => Date.parse(movement.createdAt) || null,
      render: (movement) => formatMovementDateTime(movement.createdAt),
    },
    {
      key: "type",
      header: "Tipo",
      sortable: true,
      sortValue: (movement) => getMovementTypeLabel(movement.type),
      render: (movement) => <Chip tone={getMovementTypeTone(movement.type)}>{getMovementTypeLabel(movement.type)}</Chip>,
    },
    {
      key: "item",
      header: "Item",
      sortable: true,
      sortValue: (movement) => itemById.get(movement.itemId)?.name ?? "",
      render: (movement) => {
        const item = itemById.get(movement.itemId);
        return (
          <div>
            <Link to={`/inventory/${movement.itemId}`} aria-label={`Abrir detalhe do item ${item?.sku ?? movement.itemId}`}>
              <strong>{item?.name ?? "Abrir item"}</strong>
            </Link>
            {item ? <div style={{ ...mutedStyle, fontFamily: mono }}>{item.sku}</div> : null}
          </div>
        );
      },
    },
    {
      key: "quantidade",
      header: "Quantidade",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (movement) => movement.quantidadeSinalizada,
      render: (movement) => {
        const item = itemById.get(movement.itemId);
        // Sinal SEMPRE textual (+ credita / − debita), com cor de reforço.
        return (
          <strong style={{ color: movement.quantidadeSinalizada >= 0 ? POSITIVE_QTY_COLOR : NEGATIVE_QTY_COLOR }}>
            {formatSignedQuantity(movement.quantidadeSinalizada, item?.unit)}
          </strong>
        );
      },
    },
    {
      key: "unitCost",
      header: "Custo unit.",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (movement) => movement.unitCost,
      render: (movement) => formatValor(movement.unitCost),
    },
    {
      key: "workOrder",
      header: "OS",
      sortable: true,
      sortValue: (movement) => (movement.workOrderId ? workOrderById.get(movement.workOrderId)?.code ?? movement.workOrderId : ""),
      render: (movement) => {
        if (!movement.workOrderId) return <span style={mutedStyle}>—</span>;
        const workOrder = workOrderById.get(movement.workOrderId);
        return (
          <Link to={`/work-orders/${movement.workOrderId}`} aria-label={`Abrir OS ${workOrder?.code ?? movement.workOrderId}`}>
            {workOrder?.code ?? "Abrir OS"}
          </Link>
        );
      },
    },
    {
      key: "reason",
      header: "Motivo",
      render: (movement) => (movement.reason ? movement.reason : <span style={mutedStyle}>—</span>),
    },
  ];

  const resolveItemLabel = useCallback(
    (itemId: string) => {
      const item = itemById.get(itemId);
      return item ? `${item.sku} ${item.name}` : undefined;
    },
    [itemById],
  );
  const resolveWorkOrderCode = useCallback((workOrderId: string) => workOrderById.get(workOrderId)?.code, [workOrderById]);

  const denseFilter = useCallback(
    (rows: readonly StockMovement[], base: { search: string; isActive: InventoryStatusFilter }) =>
      filterStockMovements(rows, {
        search: base.search,
        type: typeFilter,
        itemId: itemFilter || undefined,
        resolveItemLabel,
        resolveWorkOrderCode,
      }),
    [typeFilter, itemFilter, resolveItemLabel, resolveWorkOrderCode],
  );

  const dense = useDenseList<StockMovement>({ items: movements, columns, filter: denseFilter, defaultSort: { key: "createdAt", dir: "desc" } });

  const hasExtraFilters = Boolean(typeFilter) || Boolean(itemFilter);

  return (
    <>
      <div style={chipRowStyle}>
        <div style={filterGroupStyle}>
          <div style={filterFieldStyle}>
            <Select label="Item" value={itemFilter} onChange={(event) => onItemFilterChange(event.target.value)}>
              <option value="">Todos os itens</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} — {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div style={filterFieldStyle}>
            <Select label="Tipo" value={typeFilter ?? ""} onChange={(event) => onTypeFilterChange(event.target.value)}>
              <option value="">Todos os tipos</option>
              {STOCK_MOVEMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <span style={mutedStyle}>Movimentações são definitivas — correções entram como ajuste.</span>
      </div>

      {error ? (
        <div style={alertSectionStyle}>
          <Alert title="Não foi possível carregar as movimentações" tone="warning">
            {error}{" "}
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          </Alert>
        </div>
      ) : null}

      <Card
        title="Movimentações"
        action={
          <span style={countStyle}>
            {dense.total} movimento(s)
            {paginationTotal > movements.length ? ` · janela: primeiros ${movements.length} de ${paginationTotal}` : ""}
          </span>
        }
      >
        {loading && movements.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhuma movimentação encontrada"
            detail={
              dense.hasActiveFilters || hasExtraFilters
                ? "Ajuste a busca, o item ou o tipo para encontrar movimentações."
                : "Registre o primeiro movimento (entrada, saída, consumo ou ajuste) pelo botão Movimento."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(movement) => movement.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
            <DenseListPagination
              page={dense.page}
              pageSize={dense.pageSize}
              pageSizeOptions={dense.pageSizeOptions}
              total={dense.total}
              totalPages={dense.totalPages}
              pageStart={dense.pageStart}
              pageEnd={dense.pageEnd}
              onPageChange={dense.setPage}
              onPageSizeChange={dense.setPageSize}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}

// ── Aba Contagem (F7b · R7.6 — sessões de contagem cíclica) ──────────────────
function CycleCountsTab({
  context,
  itemById,
  canCreate,
  canManage,
}: {
  readonly context: {
    readonly token?: string;
    readonly tenantId?: string;
    readonly branchId?: string;
    readonly role?: string;
    readonly permissions?: string[];
  };
  readonly itemById: ReadonlyMap<string, InventoryItem>;
  readonly canCreate: boolean;
  readonly canManage: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("cc_status");
  const ccStatus: CycleCountStatusFilter = isCycleCountStatusFilter(statusParam) ? statusParam : "all";
  const classParam = searchParams.get("cc_class");
  const ccClass: CycleCountClassFilter = isCycleCountClassFilter(classParam) ? classParam : "all";

  const filters = useMemo<CycleCountsFilters>(
    () => ({ status: ccStatus, abcClass: ccClass, limit: DENSE_LIST_FETCH_LIMIT }),
    [ccStatus, ccClass],
  );
  const { items: cycleCounts, pagination, loading, error, refresh } = useCycleCounts(filters);

  const [modalOpen, setModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const setFilterParam = useCallback(
    (key: "cc_status" | "cc_class", value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const columns: DenseColumn<CycleCount>[] = [
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      tabular: true,
      sortValue: (session) => Date.parse(session.createdAt) || null,
      render: (session) => formatMovementDateTime(session.createdAt),
    },
    {
      key: "abcClass",
      header: "Classe",
      sortable: true,
      sortValue: (session) => getCycleCountClassLabel(session.abcClass),
      render: (session) => getCycleCountClassLabel(session.abcClass),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (session) => getCycleCountStatusLabel(session.status),
      render: (session) => <Chip tone={getCycleCountStatusTone(session.status)}>{getCycleCountStatusLabel(session.status)}</Chip>,
    },
    {
      key: "progress",
      header: "Itens contados/total",
      align: "right",
      tabular: true,
      sortable: true,
      sortValue: (session) => session.countedCount,
      render: (session) => `${session.countedCount.toLocaleString("pt-BR")} / ${session.totalCount.toLocaleString("pt-BR")}`,
    },
    {
      key: "actions",
      header: "Ações",
      render: (session) => (
        <div className="work-orders-row-actions">
          <Button type="button" size="sm" variant="secondary" aria-label={`Abrir contagem de ${formatMovementDateTime(session.createdAt)}`} onClick={() => setSessionId(session.id)}>
            <ClipboardList size={14} aria-hidden /> Abrir
          </Button>
        </div>
      ),
    },
  ];

  const denseFilter = useCallback((rows: readonly CycleCount[], base: { search: string; isActive: InventoryStatusFilter }) => {
    const search = base.search.trim().toLowerCase();
    if (!search) return [...rows];
    return rows.filter((session) =>
      [getCycleCountStatusLabel(session.status), getCycleCountClassLabel(session.abcClass), session.id]
        .some((value) => value.toLowerCase().includes(search)),
    );
  }, []);

  const dense = useDenseList<CycleCount>({ items: cycleCounts, columns, filter: denseFilter, defaultSort: { key: "createdAt", dir: "desc" } });

  const hasExtraFilters = ccStatus !== "all" || ccClass !== "all";

  return (
    <>
      <div style={chipRowStyle}>
        <div style={filterGroupStyle}>
          <div style={filterFieldStyle}>
            <Select label="Situação" value={ccStatus} onChange={(event) => setFilterParam("cc_status", event.target.value)}>
              {CYCLE_COUNT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div style={filterFieldStyle}>
            <Select label="Classe" value={ccClass} onChange={(event) => setFilterParam("cc_class", event.target.value)}>
              {CYCLE_COUNT_CLASS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {canCreate ? (
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus size={16} aria-hidden /> Nova contagem
          </Button>
        ) : null}
      </div>

      {error ? (
        <div style={alertSectionStyle}>
          <Alert title="Não foi possível carregar as contagens" tone="warning">
            {error}{" "}
            <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
              Tentar novamente
            </Button>
          </Alert>
        </div>
      ) : null}

      <Card
        title="Contagens cíclicas"
        action={
          <span style={countStyle}>
            {dense.total} contagem(ns)
            {pagination.total > cycleCounts.length ? ` · janela: primeiras ${cycleCounts.length} de ${pagination.total}` : ""}
          </span>
        }
      >
        {loading && cycleCounts.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhuma contagem encontrada"
            detail={
              dense.hasActiveFilters || hasExtraFilters
                ? "Ajuste a busca, a situação ou a classe para encontrar contagens."
                : "Abra a primeira sessão por classe (A/B/C ou todas) — a variância apurada vira ajuste ao fechar."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(session) => session.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
            <DenseListPagination
              page={dense.page}
              pageSize={dense.pageSize}
              pageSizeOptions={dense.pageSizeOptions}
              total={dense.total}
              totalPages={dense.totalPages}
              pageStart={dense.pageStart}
              pageEnd={dense.pageEnd}
              onPageChange={dense.setPage}
              onPageSizeChange={dense.setPageSize}
            />
          </>
        ) : null}
      </Card>

      {modalOpen ? (
        <CycleCountModal
          context={context}
          onClose={() => setModalOpen(false)}
          onCreated={(created) => {
            setModalOpen(false);
            setSessionId(created.id);
            void refresh();
          }}
        />
      ) : null}

      {sessionId ? (
        <CycleCountSessionDrawer
          key={sessionId}
          cycleCountId={sessionId}
          context={context}
          itemById={itemById}
          canManage={canManage}
          onClose={() => {
            setSessionId(null);
            void refresh();
          }}
          onChanged={() => void refresh()}
        />
      ) : null}
    </>
  );
}

function isCycleCountStatusFilter(value: string | null): value is CycleCountStatusFilter {
  return value === "all" || value === "aberta" || value === "concluida" || value === "cancelada";
}

function isCycleCountClassFilter(value: string | null): value is CycleCountClassFilter {
  return value === "all" || value === "A" || value === "B" || value === "C";
}

export default EstoquePage;
