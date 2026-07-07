import { Ban, Pencil, Plus, RefreshCw, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton, Table } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { ServiceFormModal } from "../components/ServiceFormModal";
import {
  filterServiceItems,
  formatBRL,
  formatDuration,
  getServiceStatusLabel,
  getServiceStatusOptionLabel,
  getServiceStatusTone,
} from "../service-catalog.adapter";
import { updateServiceItem } from "../service-catalog.service";
import type { ServiceCatalogFilters, ServiceCatalogStatusFilter, ServiceItem } from "../service-catalog.types";
import { useServiceCatalog } from "../useServiceCatalog";

// Lista de "Serviços" (Catálogo de Serviço) — ligada ao endpoint real /api/v1/service-catalog.
// Busca full-list uma vez (filtros estáveis) e filtra em memória para evitar refresh loop.
const STABLE_FILTERS: ServiceCatalogFilters = { search: "", isActive: "all" };

const STATUS_TABS: readonly { value: ServiceCatalogStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const priceStyle: CSSProperties = { display: "block", textAlign: "right", fontVariantNumeric: "tabular-nums" };

export function ServicosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, loading, error, refresh } = useServiceCatalog(STABLE_FILTERS);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceCatalogStatusFilter>("all");
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("service_catalog:create");
  const canUpdate = can("service_catalog:update");

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

  const visible = useMemo(() => filterServiceItems(items, { search, isActive: statusFilter }), [items, search, statusFilter]);
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(service: ServiceItem) {
    setEditing(service);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function toggleActive(service: ServiceItem) {
    setBusyId(service.id);
    setActionError(null);
    try {
      await updateServiceItem(context, service.id, { isActive: !service.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${service.isActive ? "desativar" : "reativar"} o serviço ${service.name}. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: "name", header: "Nome", render: (service: ServiceItem) => <strong>{service.name}</strong> },
    { key: "category", header: "Categoria", render: (service: ServiceItem) => service.category ?? "—" },
    { key: "duration", header: "Duração", render: (service: ServiceItem) => formatDuration(service.estimatedDurationMinutes) },
    { key: "basePrice", header: "Preço base", render: (service: ServiceItem) => <span style={priceStyle}>{formatBRL(service.basePrice)}</span> },
    { key: "opstatus", header: "Status", render: (service: ServiceItem) => getServiceStatusOptionLabel(service.status) },
    {
      key: "status",
      header: "Situação",
      render: (service: ServiceItem) => <Chip tone={getServiceStatusTone(service.isActive)}>{getServiceStatusLabel(service.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (service: ServiceItem) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar ${service.name}`} onClick={() => openEdit(service)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === service.id}
              aria-label={service.isActive ? `Desativar ${service.name}` : `Reativar ${service.name}`}
              onClick={() => void toggleActive(service)}
            >
              {service.isActive ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {service.isActive ? "Desativar" : "Reativar"}
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
          <h1>Serviços</h1>
          <p>Catálogo de Serviços da organização — nome, categoria, duração estimada e preço base.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome, categoria ou descrição…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo serviço
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os serviços" tone="warning">
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

      <Card title="Serviços cadastrados" action={<span style={countStyle}>{visible.length} registro(s)</span>}>
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && visible.length === 0 ? (
          <EmptyState
            title="Nenhum serviço cadastrado"
            detail={hasActiveFilters ? "Ajuste a busca ou o filtro de situação para encontrar serviços." : "Cadastre o primeiro serviço para começar a operar."}
          />
        ) : null}

        {!error && visible.length > 0 ? <Table rows={visible} keyForRow={(service) => service.id} columns={columns} /> : null}
      </Card>

      {modalOpen ? (
        <ServiceFormModal
          key={editing?.id ?? "new"}
          service={editing}
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

export default ServicosPage;
