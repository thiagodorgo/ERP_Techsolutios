import { Archive, ArchiveRestore, CheckCircle2, ChevronDown, ClipboardList, Eye, Pencil, Plus, Wrench, ShieldAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Select, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { useVehicles } from "../../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../../registry/vehicles/vehicles.types";
import { useWorkOrders } from "../../../work-orders/useWorkOrders";
import type { WorkOrdersFilters } from "../../../work-orders/work-orders.types";
import { DamageDetailModal } from "../components/DamageDetailModal";
import { DamageFormModal } from "../components/DamageFormModal";
import {
  computeDamageTotals,
  filterDamages,
  formatDamageDate,
  formatValor,
  getDamageStatusLabel,
  getDamageStatusTone,
  getGravidadeLabel,
  getGravidadeTone,
  getValidDamageTransitions,
  interpretDamageSubmitError,
  isDamageGravidade,
  isDamageStatus,
  DAMAGE_GRAVIDADE_OPTIONS,
  DAMAGE_STATUS_OPTIONS,
} from "../damages.adapter";
import type { DamageTransition } from "../damages.adapter";
import { updateDamage } from "../damages.service";
import type { Damage, DamageFilters, DamageStatusFilter } from "../damages.types";
import { useDamages } from "../useDamages";

// F5 Danos — lista densa ligada ao endpoint real /api/v1/damages.
// Janela carregada uma vez (limit); situação/gravidade/viatura/busca/ordenação/paginação são client-side.
const STABLE_FILTERS: DamageFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_WORK_ORDER_FILTERS: WorkOrdersFilters = { search: "", status: "all", priority: "all", assignedOperatorId: "", from: "", to: "" };

const STATUS_TABS: readonly { value: DamageStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const chipRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-6)", flexWrap: "wrap" };
const statusRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between" };
const filterFieldStyle: CSSProperties = { minWidth: 200 };
const filterGroupStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const tabularStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const totalsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-10)" };
const menuWrapStyle: CSSProperties = { position: "relative", display: "inline-block" };
const menuOverlayStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 40, background: "transparent", border: "none", cursor: "default" };
const menuPanelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  right: 0,
  zIndex: 41,
  minWidth: 200,
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

export function DanosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useDamages(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });
  const { items: vehicles } = useVehicles(STABLE_VEHICLE_FILTERS);
  const { items: workOrders } = useWorkOrders(STABLE_WORK_ORDER_FILTERS);

  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<Damage | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Damage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("damages:create");
  const canUpdate = can("damages:update");

  // Filtros específicos de F5 (situação/gravidade/viatura) na URL, preservando os params da dense-list.
  const statusFilter = isDamageStatus(searchParams.get("situacao")) ? (searchParams.get("situacao") as Damage["status"]) : undefined;
  const gravidadeFilter = isDamageGravidade(searchParams.get("gravidade")) ? (searchParams.get("gravidade") as Damage["gravidade"]) : undefined;
  const vehicleFilter = searchParams.get("vehicle") ?? "";

  const setExtraParam = useCallback(
    (key: "situacao" | "gravidade" | "vehicle", value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page"); // troca de filtro volta para a primeira página
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
  const workOrderById = useMemo(() => new Map(workOrders.map((workOrder) => [workOrder.id, workOrder])), [workOrders]);
  const resolveVehicleName = useCallback(
    (id: string) => {
      const vehicle = vehicleById.get(id);
      return vehicle ? `${vehicle.plate} ${vehicle.model}` : undefined;
    },
    [vehicleById],
  );
  const resolveWorkOrderCode = useCallback((id: string) => workOrderById.get(id)?.code, [workOrderById]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(damage: Damage) {
    setEditing(damage);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  // Transição direta (PATCH status). 422 invalid_status_transition vira Alerta.
  async function applyTransition(damage: Damage, transition: DamageTransition) {
    setBusyId(damage.id);
    setActionError(null);
    try {
      await updateDamage(context, damage.id, { status: transition.to });
      await refresh();
    } catch (submitError) {
      const feedback = interpretDamageSubmitError(submitError, "transition");
      setActionError(feedback.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(damage: Damage) {
    setBusyId(damage.id);
    setActionError(null);
    try {
      await updateDamage(context, damage.id, { isActive: !damage.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${damage.isActive ? "desativar" : "reativar"} o dano. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<Damage>[] = [
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (damage) => getDamageStatusLabel(damage.status),
      render: (damage) => <Chip tone={getDamageStatusTone(damage.status)}>{getDamageStatusLabel(damage.status)}</Chip>,
    },
    {
      key: "gravidade",
      header: "Gravidade",
      sortable: true,
      sortValue: (damage) => getGravidadeLabel(damage.gravidade),
      render: (damage) => <Chip tone={getGravidadeTone(damage.gravidade)}>{getGravidadeLabel(damage.gravidade)}</Chip>,
    },
    {
      key: "vehicle",
      header: "Viatura",
      sortable: true,
      sortValue: (damage) => vehicleById.get(damage.vehicleId)?.plate ?? "",
      render: (damage) => {
        const vehicle = vehicleById.get(damage.vehicleId);
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
      key: "workOrder",
      header: "OS de origem",
      sortable: true,
      sortValue: (damage) => (damage.workOrderId ? workOrderById.get(damage.workOrderId)?.code ?? damage.workOrderId : ""),
      render: (damage) => {
        if (!damage.workOrderId) return <span style={mutedStyle}>—</span>;
        const workOrder = workOrderById.get(damage.workOrderId);
        return (
          <Link to={`/work-orders/${damage.workOrderId}`} aria-label={`Abrir OS de origem ${workOrder?.code ?? damage.workOrderId}`}>
            {workOrder?.code ?? "Abrir OS"}
          </Link>
        );
      },
    },
    {
      key: "data",
      header: "Data",
      sortable: true,
      tabular: true,
      sortValue: (damage) => (damage.data ? Date.parse(damage.data) : null),
      render: (damage) => formatDamageDate(damage.data),
    },
    {
      key: "custoEstimado",
      header: "Custo estimado",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (damage) => damage.custoEstimado,
      render: (damage) => formatValor(damage.custoEstimado),
    },
    {
      key: "custoReal",
      header: "Custo real",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (damage) => damage.custoReal,
      render: (damage) => formatValor(damage.custoReal),
    },
    {
      key: "actions",
      header: "Ações",
      render: (damage) => {
        const vehicle = vehicleById.get(damage.vehicleId);
        const ref = vehicle ? `${vehicle.plate} · ${formatDamageDate(damage.data)}` : formatDamageDate(damage.data);
        return (
          <div className="work-orders-row-actions">
            <Button type="button" size="sm" variant="secondary" aria-label={`Ver detalhes e fotos do dano ${ref}`} onClick={() => setDetail(damage)}>
              <Eye size={14} aria-hidden /> Detalhes
            </Button>
            {canUpdate ? (
              <>
                <Button type="button" size="sm" variant="secondary" aria-label={`Editar dano ${ref}`} onClick={() => openEdit(damage)}>
                  <Pencil size={14} aria-hidden /> Editar
                </Button>
                <StatusTransitionMenu damage={damage} disabled={busyId === damage.id} onPick={(transition) => void applyTransition(damage, transition)} />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busyId === damage.id}
                  aria-label={`${damage.isActive ? "Desativar" : "Reativar"} o registro do dano ${ref}`}
                  onClick={() => void toggleActive(damage)}
                >
                  {damage.isActive ? <Archive size={14} aria-hidden /> : <ArchiveRestore size={14} aria-hidden />}
                  {damage.isActive ? "Desativar" : "Reativar"}
                </Button>
              </>
            ) : null}
          </div>
        );
      },
    },
  ];

  const denseFilter = useCallback(
    (rows: readonly Damage[], base: { search: string; isActive: DamageStatusFilter }) =>
      filterDamages(rows, {
        ...base,
        status: statusFilter,
        gravidade: gravidadeFilter,
        vehicleId: vehicleFilter || undefined,
        resolveVehicleName,
        resolveWorkOrderCode,
      }),
    [statusFilter, gravidadeFilter, vehicleFilter, resolveVehicleName, resolveWorkOrderCode],
  );

  const dense = useDenseList<Damage>({ items, columns, filter: denseFilter, defaultSort: { key: "data", dir: "desc" } });

  // Totais/agregados da janela filtrada (o mesmo conjunto que a tabela pagina) — renderiza mesmo vazio.
  const totalsBase = useMemo(
    () => denseFilter(items, { search: dense.search, isActive: dense.status }),
    [denseFilter, items, dense.search, dense.status],
  );
  const totals = useMemo(() => computeDamageTotals(totalsBase), [totalsBase]);

  const hasExtraFilters = Boolean(statusFilter) || Boolean(gravidadeFilter) || Boolean(vehicleFilter);

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Frota</span>
          <h1>Danos</h1>
          <p>Danos por viatura, com situação, gravidade, OS de origem, custos e fotos anexadas.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por descrição, viatura ou OS de origem…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Registrar dano
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os danos" tone="warning">
          {error}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      <div style={totalsGridStyle}>
        <div className="work-orders-kpi">
          <span>
            <ShieldAlert size={16} aria-hidden /> Total de danos
          </span>
          <strong style={tabularStyle}>{totals.count.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <ClipboardList size={16} aria-hidden /> Registrados
          </span>
          <strong style={tabularStyle}>{totals.registradoCount.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Wrench size={16} aria-hidden /> Em tratativa
          </span>
          <strong style={tabularStyle}>{totals.emTratativaCount.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <CheckCircle2 size={16} aria-hidden /> Resolvidos
          </span>
          <strong style={tabularStyle}>{totals.resolvidoCount.toLocaleString("pt-BR")}</strong>
        </div>
      </div>

      <div style={chipRowStyle} role="group" aria-label="Filtrar danos por situação">
        <Button
          type="button"
          size="sm"
          variant={!statusFilter ? "primary" : "ghost"}
          aria-pressed={!statusFilter}
          onClick={() => setExtraParam("situacao", "")}
        >
          Todas
        </Button>
        {DAMAGE_STATUS_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={statusFilter === option.value ? "primary" : "ghost"}
            aria-pressed={statusFilter === option.value}
            onClick={() => setExtraParam("situacao", option.value)}
          >
            {option.label}
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
        <div style={filterGroupStyle}>
          <div style={filterFieldStyle}>
            <Select label="Gravidade" value={gravidadeFilter ?? ""} onChange={(event) => setExtraParam("gravidade", event.target.value)}>
              <option value="">Todas as gravidades</option>
              {DAMAGE_GRAVIDADE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div style={filterFieldStyle}>
            <Select label="Viatura" value={vehicleFilter} onChange={(event) => setExtraParam("vehicle", event.target.value)}>
              <option value="">Todas as viaturas</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate}
                  {vehicle.model ? ` — ${vehicle.model}` : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <Card
        title="Danos da frota"
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
            title="Nenhum dano encontrado"
            detail={
              dense.hasActiveFilters || hasExtraFilters
                ? "Ajuste a busca, a situação, a gravidade ou a viatura para encontrar danos."
                : "Registre o primeiro dano para acompanhar gravidade, custos e fotos da frota."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(damage) => damage.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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

      {formOpen ? (
        <DamageFormModal
          key={editing?.id ?? "new"}
          damage={editing}
          vehicles={vehicles}
          workOrders={workOrders}
          context={context}
          onClose={closeForm}
          onSaved={() => {
            closeForm();
            void refresh();
          }}
        />
      ) : null}

      {detail ? (
        <DamageDetailModal
          key={detail.id}
          damage={detail}
          vehicleLabel={resolveVehicleName(detail.vehicleId)}
          workOrderCode={detail.workOrderId ? resolveWorkOrderCode(detail.workOrderId) : undefined}
          canUpload={canCreate || canUpdate}
          canDelete={canUpdate}
          context={context}
          onClose={() => setDetail(null)}
          onChanged={() => void refresh()}
        />
      ) : null}
    </section>
  );
}

// Menu de transição: só oferece as próximas situações válidas a partir da atual (registrado→em_tratativa→resolvido).
function StatusTransitionMenu({
  damage,
  disabled,
  onPick,
}: {
  readonly damage: Damage;
  readonly disabled: boolean;
  readonly onPick: (transition: DamageTransition) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const transitions = getValidDamageTransitions(damage.status);

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
            aria-label={`Próxima situação do dano ${formatDamageDate(damage.data)}`}
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

export default DanosPage;
