import { Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { SupplierFormModal } from "../components/SupplierFormModal";
import { filterSuppliers, formatSupplierContact, getSupplierStatusLabel, getSupplierStatusTone } from "../suppliers.adapter";
import type { SupplierActiveFilter, SupplierItem, SuppliersFilters } from "../suppliers.types";
import { useSuppliers } from "../useSuppliers";

// Lista de "Fornecedores" (Ω2-b) — ligada ao endpoint real /api/v1/suppliers.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: SuppliersFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

// Situação de cadastro (isActive) — MASCULINO (fornecedor), como cliente/serviço.
const ACTIVE_TABS: readonly { value: SupplierActiveFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };

export function FornecedoresPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useSuppliers(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [editing, setEditing] = useState<SupplierItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("suppliers:create");
  const canUpdate = can("suppliers:update");

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

  function openEdit(supplier: SupplierItem) {
    setEditing(supplier);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const columns: DenseColumn<SupplierItem>[] = [
    { key: "name", header: "Nome", sortable: true, sortValue: (supplier) => supplier.name, render: (supplier) => <strong>{supplier.name}</strong> },
    {
      key: "document",
      header: "CNPJ/CPF",
      tabular: true,
      render: (supplier) => supplier.document ?? <span style={mutedStyle}>—</span>,
    },
    { key: "contact", header: "Contato", render: (supplier) => formatSupplierContact(supplier) },
    {
      key: "category",
      header: "Categoria",
      sortable: true,
      sortValue: (supplier) => supplier.category ?? "",
      render: (supplier) => supplier.category ?? <span style={mutedStyle}>—</span>,
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (supplier) => getSupplierStatusLabel(supplier.isActive),
      render: (supplier) => <Chip tone={getSupplierStatusTone(supplier.isActive)}>{getSupplierStatusLabel(supplier.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (supplier) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar fornecedor ${supplier.name}`} onClick={() => openEdit(supplier)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<SupplierItem>({ items, columns, filter: filterSuppliers, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Fornecedores</h1>
          <p>Fornecedores da organização — documento, contato, categoria e situação.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, documento, contato ou categoria…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo fornecedor
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os fornecedores" tone="warning">
          {error}
        </Alert>
      ) : null}

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>Situação</span>
        {ACTIVE_TABS.map((tab) => (
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
        title="Fornecedores cadastrados"
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
            title="Nenhum fornecedor cadastrado"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou a situação para encontrar fornecedores." : "Cadastre o primeiro fornecedor para abastecer compras e estoque."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(supplier) => supplier.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <SupplierFormModal
          key={editing?.id ?? "new"}
          supplier={editing}
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

export default FornecedoresPage;
