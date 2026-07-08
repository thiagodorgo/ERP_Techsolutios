import { Ban, ChevronDown, Pencil, Plus, RefreshCw, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { useVehicles } from "../../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../../registry/vehicles/vehicles.types";
import { MaintenanceCompletionModal } from "../components/MaintenanceCompletionModal";
import { MaintenanceFormModal } from "../components/MaintenanceFormModal";
import {
  filterMaintenanceOrders,
  formatCost,
  formatMaintenanceDate,
  getMaintenanceStatusLabel,
  getMaintenanceStatusTone,
  getMaintenanceTypeLabel,
  getMaintenanceTypeTone,
  getValidTransitions,
  interpretMaintenanceSubmitError,
} from "../maintenance-orders.adapter";
import type { MaintenanceTransition } from "../maintenance-orders.adapter";
import { updateMaintenanceOrder } from "../maintenance-orders.service";
import type { MaintenanceOrder, MaintenanceOrdersFilters, MaintenanceStatusFilter, MaintenanceTab } from "../maintenance-orders.types";
import { useMaintenanceOrders } from "../useMaintenanceOrders";

// F2 Manutenção — lista densa ligada ao endpoint real /api/v1/maintenance-orders.
// Janela carregada uma vez (limit); abas/busca/ordenação/paginação são client-side sobre ela.
const STABLE_FILTERS: MaintenanceOrdersFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const WORKFLOW_TABS: readonly { value: MaintenanceTab; label: string }[] = [
  { value: "preventivas", label: "Preventivas" },
  { value: "corretivas", label: "Corretivas" },
  { value: "historico", label: "Histórico" },
];

const STATUS_TABS: readonly { value: MaintenanceStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

function isTab(value: string | null): value is MaintenanceTab {
  return value === "preventivas" || value === "corretivas" || value === "historico";
}

const tabRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" };
const statusRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const menuWrapStyle: CSSProperties = { position: "relative", display: "inline-block" };
const menuOverlayStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 40, background: "transparent", border: "none", cursor: "default" };
const menuPanelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  zIndex: 41,
  minWidth: 168,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  padding: "var(--space-6)",
  background: "var(--surface-panel)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-6)",
  boxShadow: "var(--shadow-overlay)",
};
const menuItemStyle: CSSProperties = {
  textAlign: "left",
  padding: "var(--space-6) var(--space-8)",
  borderRadius: "var(--radius-4)",
  border: "none",
  background: "transparent",
  color: "var(--text-primary)",
  font: "inherit",
  cursor: "pointer",
};

export function ManutencaoPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useMaintenanceOrders(STABLE_FILTERS);
  const { items: vehicles } = useVehicles(STABLE_VEHICLE_FILTERS);

  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<MaintenanceOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [completing, setCompleting] = useState<MaintenanceOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("maintenance_orders:create");
  const canUpdate = can("maintenance_orders:update");

  const activeTab: MaintenanceTab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as MaintenanceTab) : "preventivas";

  const setTab = useCallback(
    (tab: MaintenanceTab) => {
      const next = new URLSearchParams(searchParams);
      if (tab === "preventivas") next.delete("tab");
      else next.set("tab", tab);
      next.delete("page"); // troca de aba volta para a primeira página
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

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

  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const resolveVehicleName = useCallback(
    (id: string) => {
      const vehicle = vehicleById.get(id);
      return vehicle ? `${vehicle.plate} ${vehicle.model}` : undefined;
    },
    [vehicleById],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(order: MaintenanceOrder) {
    setEditing(order);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // Iniciar/Cancelar: transição direta (PATCH status). Concluir abre o modal de custo+data.
  async function applyTransition(order: MaintenanceOrder, transition: MaintenanceTransition) {
    if (transition.kind === "complete") {
      setActionError(null);
      setCompleting(order);
      return;
    }
    setBusyId(order.id);
    setActionError(null);
    try {
      await updateMaintenanceOrder(context, order.id, { status: transition.to });
      await refresh();
    } catch (submitError) {
      const feedback = interpretMaintenanceSubmitError(submitError, "transition");
      setActionError(feedback.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(order: MaintenanceOrder) {
    setBusyId(order.id);
    setActionError(null);
    try {
      await updateMaintenanceOrder(context, order.id, { isActive: !order.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${order.isActive ? "desativar" : "reativar"} a manutenção. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<MaintenanceOrder>[] = [
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (order) => getMaintenanceStatusLabel(order.status),
      render: (order) => <Chip tone={getMaintenanceStatusTone(order.status)}>{getMaintenanceStatusLabel(order.status)}</Chip>,
    },
    {
      key: "type",
      header: "Tipo",
      sortable: true,
      sortValue: (order) => getMaintenanceTypeLabel(order.type),
      render: (order) => <Chip tone={getMaintenanceTypeTone(order.type)}>{getMaintenanceTypeLabel(order.type)}</Chip>,
    },
    {
      key: "vehicle",
      header: "Viatura",
      sortable: true,
      sortValue: (order) => vehicleById.get(order.vehicleId)?.plate ?? "",
      render: (order) => {
        const vehicle = vehicleById.get(order.vehicleId);
        if (!vehicle) return <span style={mutedStyle}>—</span>;
        return (
          <div>
            <Link to="/cadastros/viaturas" aria-label={`Ver viatura ${vehicle.plate} em Cadastros`}>
              <strong>{vehicle.plate}</strong>
            </Link>
            {vehicle.model ? <div style={mutedStyle}>{vehicle.model}</div> : null}
          </div>
        );
      },
    },
    {
      key: "description",
      header: "Descrição",
      sortable: true,
      sortValue: (order) => order.description,
      render: (order) => (order.description ? order.description : <span style={mutedStyle}>—</span>),
    },
    {
      key: "scheduledFor",
      header: "Agendada para",
      sortable: true,
      tabular: true,
      sortValue: (order) => order.scheduledFor,
      render: (order) => formatMaintenanceDate(order.scheduledFor),
    },
    {
      key: "completedAt",
      header: "Concluída em",
      sortable: true,
      tabular: true,
      sortValue: (order) => order.completedAt,
      render: (order) => formatMaintenanceDate(order.completedAt),
    },
    {
      key: "cost",
      header: "Custo",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (order) => order.cost,
      render: (order) => formatCost(order.cost),
    },
    {
      key: "actions",
      header: "Ações",
      render: (order) => {
        if (!canUpdate) return <span style={countStyle}>—</span>;
        const vehicle = vehicleById.get(order.vehicleId);
        const ref = vehicle ? `${vehicle.plate} · ${getMaintenanceTypeLabel(order.type)}` : getMaintenanceTypeLabel(order.type);
        return (
          <div className="work-orders-row-actions">
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar manutenção ${ref}`} onClick={() => openEdit(order)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <StatusTransitionMenu order={order} disabled={busyId === order.id} onPick={(transition) => void applyTransition(order, transition)} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === order.id}
              aria-label={`${order.isActive ? "Desativar" : "Reativar"} manutenção ${ref}`}
              onClick={() => void toggleActive(order)}
            >
              {order.isActive ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {order.isActive ? "Desativar" : "Reativar"}
            </Button>
          </div>
        );
      },
    },
  ];

  const denseFilter = useCallback(
    (rows: readonly MaintenanceOrder[], base: { search: string; isActive: MaintenanceStatusFilter }) =>
      filterMaintenanceOrders(rows, { ...base, tab: activeTab, resolveVehicleName }),
    [activeTab, resolveVehicleName],
  );

  const dense = useDenseList<MaintenanceOrder>({ items, columns, filter: denseFilter, defaultSort: { key: "scheduledFor", dir: "desc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Frota</span>
          <h1>Manutenção</h1>
          <p>Ordens de manutenção preventivas e corretivas por viatura, com situação, custo e histórico de conclusão.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por viatura, descrição ou fornecedor…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova manutenção
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as manutenções" tone="warning">
          {error}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      <div style={tabRowStyle} role="group" aria-label="Filtrar manutenções por fluxo">
        {WORKFLOW_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant={activeTab === tab.value ? "primary" : "ghost"}
            aria-pressed={activeTab === tab.value}
            onClick={() => setTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div style={filterRowStyle}>
        <div style={statusRowStyle}>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={dense.status === tab.value ? "primary" : "ghost"}
              aria-pressed={dense.status === tab.value}
              onClick={() => dense.setStatus(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {error ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        ) : null}
      </div>

      <Card
        title="Manutenções"
        action={
          <span style={countStyle}>
            {dense.total} registro(s)
            {pagination.total > items.length ? ` · janela: primeiros ${items.length} de ${pagination.total}` : ""}
          </span>
        }
      >
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhuma manutenção nesta aba"
            detail={
              dense.hasActiveFilters
                ? "Ajuste a busca ou a situação para encontrar ordens de manutenção."
                : activeTab === "historico"
                  ? "Ordens concluídas ou canceladas aparecerão aqui."
                  : "Registre a primeira manutenção para acompanhar a frota."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(order) => order.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <MaintenanceFormModal
          key={editing?.id ?? "new"}
          order={editing}
          vehicles={vehicles}
          context={context}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
        />
      ) : null}

      {completing ? (
        <MaintenanceCompletionModal
          key={completing.id}
          order={completing}
          context={context}
          onClose={() => setCompleting(null)}
          onCompleted={() => {
            setCompleting(null);
            void refresh();
          }}
        />
      ) : null}
    </section>
  );
}

// Menu de transição: só oferece as próximas situações válidas a partir da atual.
function StatusTransitionMenu({
  order,
  disabled,
  onPick,
}: {
  readonly order: MaintenanceOrder;
  readonly disabled: boolean;
  readonly onPick: (transition: MaintenanceTransition) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const transitions = getValidTransitions(order.status);

  // Ao abrir, leva o foco ao primeiro item (navegação por teclado).
  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  // Fecha e devolve o foco ao gatilho (dismiss acessível — Escape / clique fora).
  const closeAndReturnFocus = useCallback(() => {
    setOpen(false);
    wrapRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.focus();
  }, []);

  if (transitions.length === 0) return null;

  return (
    <span ref={wrapRef} style={menuWrapStyle}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Avançar situação <ChevronDown size={14} aria-hidden />
      </Button>
      {open ? (
        <>
          <button type="button" aria-hidden tabIndex={-1} style={menuOverlayStyle} onClick={() => setOpen(false)} />
          <div
            role="menu"
            style={menuPanelStyle}
            aria-label={`Próxima situação de ${getMaintenanceTypeLabel(order.type)}`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closeAndReturnFocus();
              }
            }}
          >
            {transitions.map((transition, index) => (
              <button
                key={transition.to}
                ref={index === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                className="ui-menu-item"
                style={menuItemStyle}
                onClick={() => {
                  setOpen(false);
                  onPick(transition);
                }}
              >
                {transition.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </span>
  );
}

export default ManutencaoPage;
