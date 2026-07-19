import { Ban, Pencil, RefreshCw, RotateCcw, UserPlus } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { CustomerFormModal } from "../components/CustomerFormModal";
import { filterCustomers, formatCustomerDate, formatCustomerLocation, getCustomerStatusLabel, getCustomerStatusTone } from "../customers.adapter";
import { updateCustomer } from "../customers.service";
import type { Customer, CustomersFilters, CustomersStatusFilter } from "../customers.types";
import { useCustomers } from "../useCustomers";

// Lista de "Clientes" (cadastro) — ligada ao endpoint real /api/v1/customers.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: CustomersFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const STATUS_TABS: readonly { value: CustomersStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

export function ClientesPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useCustomers(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [editing, setEditing] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = can("customers:create");
  const canUpdate = can("customers:update");

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

  function openEdit(customer: Customer) {
    setEditing(customer);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function toggleActive(customer: Customer) {
    setBusyId(customer.id);
    setActionError(null);
    try {
      await updateCustomer(context, customer.id, { isActive: !customer.isActive });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${customer.isActive ? "desativar" : "reativar"} o cliente ${customer.name}. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<Customer>[] = [
    { key: "name", header: "Nome", sortable: true, sortValue: (customer) => customer.name, render: (customer) => <strong>{customer.name}</strong> },
    { key: "document", header: "Documento", render: (customer) => customer.document ?? "—" },
    { key: "phone", header: "Telefone", render: (customer) => customer.phone ?? "—" },
    { key: "location", header: "Cidade/UF", sortable: true, sortValue: (customer) => customer.city, render: (customer) => formatCustomerLocation(customer) },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (customer) => getCustomerStatusLabel(customer.isActive),
      render: (customer) => <Chip tone={getCustomerStatusTone(customer.isActive)}>{getCustomerStatusLabel(customer.isActive)}</Chip>,
    },
    {
      key: "createdAt",
      header: "Cadastrado em",
      sortable: true,
      tabular: true,
      sortValue: (customer) => customer.createdAt,
      render: (customer) => formatCustomerDate(customer.createdAt),
    },
    {
      key: "actions",
      header: "Ações",
      render: (customer) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar ${customer.name}`} onClick={() => openEdit(customer)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busyId === customer.id}
              aria-label={customer.isActive ? `Desativar ${customer.name}` : `Reativar ${customer.name}`}
              onClick={() => void toggleActive(customer)}
            >
              {customer.isActive ? <Ban size={14} aria-hidden /> : <RotateCcw size={14} aria-hidden />}
              {customer.isActive ? "Desativar" : "Reativar"}
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<Customer>({ items, columns, filter: filterCustomers, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Clientes</h1>
          <p>Cadastro central de clientes da organização — contato, endereço e situação de atendimento.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, documento ou cidade…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <UserPlus size={16} aria-hidden /> Novo cliente
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os clientes" tone="warning">
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
        title="Clientes cadastrados"
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
            title="Nenhum cliente cadastrado"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou o filtro de situação para encontrar clientes." : "Cadastre o primeiro cliente para começar a atender."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(customer) => customer.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <CustomerFormModal
          key={editing?.id ?? "new"}
          customer={editing}
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

export default ClientesPage;
