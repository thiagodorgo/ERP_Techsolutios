import { Ban, Pencil, Plus, RefreshCw, RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { ServiceFormModal } from "../components/ServiceFormModal";
import {
  filterServiceItems,
  formatBRL,
  formatDuration,
  formatServiceDate,
  getServiceStatusLabel,
  getServiceStatusOptionLabel,
  getServiceStatusTone,
} from "../service-catalog.adapter";
import { updateServiceItem } from "../service-catalog.service";
import type { ServiceCatalogFilters, ServiceCatalogStatusFilter, ServiceItem } from "../service-catalog.types";
import { useServiceCatalog } from "../useServiceCatalog";

// Lista de "Serviços" (Catálogo de Serviço) — ligada ao endpoint real /api/v1/service-catalog.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: ServiceCatalogFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const STATUS_TABS: readonly { value: ServiceCatalogStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

export function ServicosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useServiceCatalog(STABLE_FILTERS);

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

  const columns: DenseColumn<ServiceItem>[] = [
    { key: "name", header: "Nome", sortable: true, sortValue: (service) => service.name, render: (service) => <strong>{service.name}</strong> },
    { key: "category", header: "Categoria", sortable: true, sortValue: (service) => service.category, render: (service) => service.category ?? "—" },
    {
      key: "duration",
      header: "Duração",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (service) => service.estimatedDurationMinutes,
      render: (service) => formatDuration(service.estimatedDurationMinutes),
    },
    {
      key: "basePrice",
      header: "Preço base",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (service) => service.basePrice,
      render: (service) => formatBRL(service.basePrice),
    },
    {
      key: "opstatus",
      header: "Status",
      sortable: true,
      sortValue: (service) => getServiceStatusOptionLabel(service.status),
      render: (service) => getServiceStatusOptionLabel(service.status),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (service) => getServiceStatusLabel(service.isActive),
      render: (service) => <Chip tone={getServiceStatusTone(service.isActive)}>{getServiceStatusLabel(service.isActive)}</Chip>,
    },
    {
      key: "createdAt",
      header: "Criado em",
      sortable: true,
      tabular: true,
      sortValue: (service) => service.createdAt,
      render: (service) => formatServiceDate(service.createdAt),
    },
    {
      key: "actions",
      header: "Ações",
      render: (service) =>
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

  const dense = useDenseList<ServiceItem>({ items, columns, filter: filterServiceItems, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Serviços</h1>
          <p>Catálogo de Serviços da organização — nome, categoria, duração estimada e preço base.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, categoria ou descrição…" />
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
        title="Serviços cadastrados"
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
            title="Nenhum serviço cadastrado"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou o filtro de situação para encontrar serviços." : "Cadastre o primeiro serviço para começar a operar."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(service) => service.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
