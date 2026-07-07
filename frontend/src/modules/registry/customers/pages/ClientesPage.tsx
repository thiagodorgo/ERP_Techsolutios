import { Ban, Pencil, RefreshCw, RotateCcw, UserPlus } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton, Table } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { CustomerFormModal } from "../components/CustomerFormModal";
import { filterCustomers, formatCustomerLocation, getCustomerStatusLabel, getCustomerStatusTone } from "../customers.adapter";
import { updateCustomer } from "../customers.service";
import type { Customer, CustomersFilters, CustomersStatusFilter } from "../customers.types";
import { useCustomers } from "../useCustomers";

// Lista de "Clientes" (cadastro) — ligada ao endpoint real /api/v1/customers.
// Busca full-list uma vez (filtros estáveis) e filtra em memória para evitar refresh loop.
const STABLE_FILTERS: CustomersFilters = { search: "", isActive: "all" };

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
  const { items, loading, error, refresh } = useCustomers(STABLE_FILTERS);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomersStatusFilter>("all");
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

  const visible = useMemo(() => filterCustomers(items, { search, isActive: statusFilter }), [items, search, statusFilter]);
  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";

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

  const columns = [
    { key: "name", header: "Nome", render: (customer: Customer) => <strong>{customer.name}</strong> },
    { key: "document", header: "Documento", render: (customer: Customer) => customer.document ?? "—" },
    { key: "phone", header: "Telefone", render: (customer: Customer) => customer.phone ?? "—" },
    { key: "location", header: "Cidade/UF", render: (customer: Customer) => formatCustomerLocation(customer) },
    {
      key: "status",
      header: "Situação",
      render: (customer: Customer) => <Chip tone={getCustomerStatusTone(customer.isActive)}>{getCustomerStatusLabel(customer.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (customer: Customer) =>
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

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Clientes</h1>
          <p>Cadastro central de clientes da organização — contato, endereço e situação de atendimento.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome, documento ou cidade…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
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

      <Card title="Clientes cadastrados" action={<span style={countStyle}>{visible.length} registro(s)</span>}>
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && visible.length === 0 ? (
          <EmptyState
            title="Nenhum cliente cadastrado"
            detail={hasActiveFilters ? "Ajuste a busca ou o filtro de situação para encontrar clientes." : "Cadastre o primeiro cliente para começar a atender."}
          />
        ) : null}

        {!error && visible.length > 0 ? <Table rows={visible} keyForRow={(customer) => customer.id} columns={columns} /> : null}
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
