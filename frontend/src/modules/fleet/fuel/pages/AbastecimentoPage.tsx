import { Ban, Droplets, Fuel, Gauge, Pencil, Plus, RefreshCw, Receipt, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, Input, SearchBar, Select, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { useVehicles } from "../../../registry/vehicles/useVehicles";
import type { VehiclesFilters } from "../../../registry/vehicles/vehicles.types";
import { FuelLogFormModal } from "../components/FuelLogFormModal";
import {
  computeFuelTotals,
  filterFuelLogs,
  formatBRL,
  formatFuelDate,
  formatKmPerLiter,
  formatLiters,
  formatOdometer,
  getFuelStatusLabel,
  getFuelStatusTone,
  getFuelTypeLabel,
} from "../fuel-logs.adapter";
import { updateFuelLog } from "../fuel-logs.service";
import type { FuelLog, FuelLogsFilters, FuelLogsStatusFilter } from "../fuel-logs.types";
import { useFuelLogs } from "../useFuelLogs";

// F1 Abastecimento — lista densa de lançamentos ligada ao endpoint real /api/v1/fuel-logs.
// Janela carregada uma vez (limit); busca/ordenação/paginação/filtros são client-side sobre ela.
const STABLE_FILTERS: FuelLogsFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };
const STABLE_VEHICLE_FILTERS: VehiclesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const STATUS_TABS: readonly { value: FuelLogsStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const statusRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
// auto-fit reflui os 4 cards em uma linha no desktop e colapsa em telas estreitas (paridade com .work-orders-kpis).
const totalsGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-10)" };
const filterFieldStyle: CSSProperties = { minWidth: 180 };

export function AbastecimentoPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useFuelLogs(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });
  const { items: vehicles } = useVehicles(STABLE_VEHICLE_FILTERS);

  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<FuelLog | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("fuel_logs:create");
  const canUpdate = can("fuel_logs:update");

  // Filtros específicos de F1 (viatura/período) persistidos na URL, preservando os params da dense-list.
  const vehicleFilter = searchParams.get("vehicle") ?? "";
  const fromFilter = searchParams.get("from") ?? "";
  const toFilter = searchParams.get("to") ?? "";

  const setExtraParam = useCallback(
    (key: "vehicle" | "from" | "to", value: string) => {
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

  function openEdit(log: FuelLog) {
    setEditing(log);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function toggleActive(log: FuelLog) {
    setBusyId(log.id);
    setActionError(null);
    try {
      await updateFuelLog(context, log.id, { isActive: !log.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${log.isActive ? "desativar" : "reativar"} o lançamento. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<FuelLog>[] = [
    {
      key: "fueledAt",
      header: "Data",
      sortable: true,
      tabular: true,
      sortValue: (log) => log.fueledAt,
      render: (log) => formatFuelDate(log.fueledAt),
    },
    {
      key: "vehicle",
      header: "Viatura",
      sortable: true,
      sortValue: (log) => vehicleById.get(log.vehicleId)?.plate ?? "",
      render: (log) => {
        const vehicle = vehicleById.get(log.vehicleId);
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
      key: "fuelType",
      header: "Combustível",
      sortable: true,
      sortValue: (log) => getFuelTypeLabel(log.fuelType),
      render: (log) => getFuelTypeLabel(log.fuelType),
    },
    {
      key: "liters",
      header: "Litros",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (log) => log.liters,
      render: (log) => formatLiters(log.liters),
    },
    {
      key: "totalValue",
      header: "Valor",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (log) => log.totalValue,
      render: (log) => formatBRL(log.totalValue),
    },
    {
      key: "odometer",
      header: "Odômetro",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (log) => log.odometer,
      render: (log) => formatOdometer(log.odometer),
    },
    {
      key: "kmPerLiter",
      header: "km/L",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (log) => log.kmPerLiter,
      render: (log) => formatKmPerLiter(log.kmPerLiter),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (log) => getFuelStatusLabel(log.isActive),
      render: (log) => <Chip tone={getFuelStatusTone(log.isActive)}>{getFuelStatusLabel(log.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (log) => {
        if (!canUpdate) return <span style={countStyle}>—</span>;
        // Referência humana (placa · data) para distinguir os botões de cada linha no leitor de tela.
        const vehicle = vehicleById.get(log.vehicleId);
        const ref = vehicle ? `${vehicle.plate} · ${formatFuelDate(log.fueledAt)}` : formatFuelDate(log.fueledAt);
        return (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar lançamento ${ref}`} onClick={() => openEdit(log)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === log.id}
              aria-label={`${log.isActive ? "Desativar" : "Reativar"} lançamento ${ref}`}
              onClick={() => void toggleActive(log)}
            >
              {log.isActive ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {log.isActive ? "Desativar" : "Reativar"}
            </Button>
          </div>
        );
      },
    },
  ];

  const denseFilter = useCallback(
    (rows: readonly FuelLog[], base: { search: string; isActive: FuelLogsStatusFilter }) =>
      filterFuelLogs(rows, { ...base, vehicleId: vehicleFilter, from: fromFilter, to: toFilter, resolveVehicleName }),
    [vehicleFilter, fromFilter, toFilter, resolveVehicleName],
  );

  const dense = useDenseList<FuelLog>({ items, columns, filter: denseFilter, defaultSort: { key: "fueledAt", dir: "desc" } });

  // Totais/aggregado da janela filtrada (o mesmo conjunto que a tabela pagina).
  const totalsBase = useMemo(
    () => denseFilter(items, { search: dense.search, isActive: dense.status }),
    [denseFilter, items, dense.search, dense.status],
  );
  const totals = useMemo(() => computeFuelTotals(totalsBase), [totalsBase]);

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Frota</span>
          <h1>Abastecimento</h1>
          <p>Lançamentos de combustível por viatura e período, com consumo (km/L) derivado entre abastecimentos.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por viatura, posto ou observação…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo lançamento
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os abastecimentos" tone="warning">
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
            <Fuel size={16} aria-hidden /> Lançamentos na janela
          </span>
          <strong>{totals.count.toLocaleString("pt-BR")}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Droplets size={16} aria-hidden /> Total de litros
          </span>
          <strong>{formatLiters(totals.totalLiters)}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Receipt size={16} aria-hidden /> Total em R$
          </span>
          <strong>{formatBRL(totals.totalValue)}</strong>
        </div>
        <div className="work-orders-kpi">
          <span>
            <Gauge size={16} aria-hidden /> km/L médio da frota
          </span>
          <strong>{formatKmPerLiter(totals.fleetKmPerL)}</strong>
          <small style={mutedStyle}>
            {totals.vehiclesWithEfficiency > 0
              ? `${totals.vehiclesWithEfficiency} viatura(s) com consumo derivado`
              : "Sem consumo derivado na janela"}
          </small>
        </div>
      </div>

      <div style={filterRowStyle}>
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
        <div style={filterFieldStyle}>
          <Input label="De" type="date" value={fromFilter} max={toFilter || undefined} onChange={(event) => setExtraParam("from", event.target.value)} />
        </div>
        <div style={filterFieldStyle}>
          <Input label="Até" type="date" value={toFilter} min={fromFilter || undefined} onChange={(event) => setExtraParam("to", event.target.value)} />
        </div>
      </div>

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
        {error ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        ) : null}
      </div>

      <Card
        title="Abastecimentos"
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
            title="Nenhum abastecimento registrado"
            detail={
              dense.hasActiveFilters || vehicleFilter || fromFilter || toFilter
                ? "Ajuste a busca, a viatura ou o período para encontrar lançamentos."
                : "Registre o primeiro abastecimento para acompanhar consumo e custos da frota."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(log) => log.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <FuelLogFormModal
          key={editing?.id ?? "new"}
          log={editing}
          vehicles={vehicles}
          context={context}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            void refresh();
          }}
        />
      ) : null}
    </section>
  );
}

export default AbastecimentoPage;
