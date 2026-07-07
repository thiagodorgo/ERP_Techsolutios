import { Ban, Pencil, Plus, RefreshCw, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton, Table } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { VehicleFormModal } from "../components/VehicleFormModal";
import { filterVehicles, formatVehicleYear, getVehicleOperationalStatusLabel, getVehicleStatusLabel, getVehicleStatusTone } from "../vehicles.adapter";
import { updateVehicle } from "../vehicles.service";
import type { Vehicle, VehiclesFilters, VehiclesStatusFilter } from "../vehicles.types";
import { useVehicles } from "../useVehicles";

// Lista de "Viaturas" (cadastro) — ligada ao endpoint real /api/v1/vehicles.
// Busca full-list uma vez (filtros estáveis) e filtra em memória para evitar refresh loop.
const STABLE_FILTERS: VehiclesFilters = { search: "", isActive: "all" };

const STATUS_TABS: readonly { value: VehiclesStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

export function ViaturasPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, loading, error, refresh } = useVehicles(STABLE_FILTERS);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehiclesStatusFilter>("all");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("vehicles:create");
  const canUpdate = can("vehicles:update");

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

  const visible = useMemo(() => filterVehicles(items, { search, isActive: statusFilter }), [items, search, statusFilter]);
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function toggleActive(vehicle: Vehicle) {
    setBusyId(vehicle.id);
    setActionError(null);
    try {
      await updateVehicle(context, vehicle.id, { isActive: !vehicle.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${vehicle.isActive ? "desativar" : "reativar"} a viatura ${vehicle.plate}. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: "plate", header: "Placa", render: (vehicle: Vehicle) => <strong>{vehicle.plate}</strong> },
    { key: "model", header: "Modelo", render: (vehicle: Vehicle) => vehicle.model },
    { key: "type", header: "Tipo", render: (vehicle: Vehicle) => vehicle.type ?? "—" },
    { key: "year", header: "Ano", render: (vehicle: Vehicle) => formatVehicleYear(vehicle.year) },
    { key: "opstatus", header: "Status", render: (vehicle: Vehicle) => getVehicleOperationalStatusLabel(vehicle.status) },
    {
      key: "status",
      header: "Situação",
      render: (vehicle: Vehicle) => <Chip tone={getVehicleStatusTone(vehicle.isActive)}>{getVehicleStatusLabel(vehicle.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (vehicle: Vehicle) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar ${vehicle.plate}`} onClick={() => openEdit(vehicle)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === vehicle.id}
              aria-label={vehicle.isActive ? `Desativar ${vehicle.plate}` : `Reativar ${vehicle.plate}`}
              onClick={() => void toggleActive(vehicle)}
            >
              {vehicle.isActive ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {vehicle.isActive ? "Desativar" : "Reativar"}
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Viaturas</h1>
          <p>Cadastro central da frota da organização — placa, modelo, tipo e situação operacional.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por placa, modelo ou tipo…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova viatura
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as viaturas" tone="warning">
          {error}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
        </Alert>
      ) : null}

      <div style={filterRowStyle}>
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={statusFilter === tab.value ? "primary" : "ghost"}
            aria-pressed={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
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

      <Card title="Viaturas cadastradas" action={<span style={countStyle}>{visible.length} registro(s)</span>}>
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && visible.length === 0 ? (
          <EmptyState
            title="Nenhuma viatura cadastrada"
            detail={hasActiveFilters ? "Ajuste a busca ou o filtro de situação para encontrar viaturas." : "Cadastre a primeira viatura para começar a operar."}
          />
        ) : null}

        {!error && visible.length > 0 ? <Table rows={visible} keyForRow={(vehicle) => vehicle.id} columns={columns} /> : null}
      </Card>

      {modalOpen ? (
        <VehicleFormModal
          key={editing?.id ?? "new"}
          vehicle={editing}
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

export default ViaturasPage;
