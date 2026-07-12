import { Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { BranchFormModal } from "../components/BranchFormModal";
import { filterBranches, formatBranchDate, getBranchStatusLabel, getBranchStatusTone } from "../branches.adapter";
import type { BranchActiveFilter, BranchItem, BranchesFilters } from "../branches.types";
import { useBranches } from "../useBranches";

// Lista de "Filiais" (Ω2-b) — ligada ao endpoint real /api/v1/branches.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: BranchesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

// Situação (enum `status`) — FEMININO (filial). Desativar/reativar acontece no modal de edição.
const ACTIVE_TABS: readonly { value: BranchActiveFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };

export function FiliaisPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useBranches(STABLE_FILTERS);

  const [editing, setEditing] = useState<BranchItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("branches:create");
  const canUpdate = can("branches:update");

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

  function openEdit(branch: BranchItem) {
    setEditing(branch);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const columns: DenseColumn<BranchItem>[] = [
    { key: "name", header: "Nome", sortable: true, sortValue: (branch) => branch.name, render: (branch) => <strong>{branch.name}</strong> },
    {
      key: "code",
      header: "Código",
      sortable: true,
      tabular: true,
      sortValue: (branch) => branch.code,
      render: (branch) => branch.code || <span style={mutedStyle}>—</span>,
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (branch) => getBranchStatusLabel(branch.status),
      render: (branch) => <Chip tone={getBranchStatusTone(branch.status)}>{getBranchStatusLabel(branch.status)}</Chip>,
    },
    {
      key: "createdAt",
      header: "Criada em",
      sortable: true,
      tabular: true,
      sortValue: (branch) => branch.createdAt,
      render: (branch) => formatBranchDate(branch.createdAt),
    },
    {
      key: "actions",
      header: "Ações",
      render: (branch) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar filial ${branch.name}`} onClick={() => openEdit(branch)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<BranchItem>({ items, columns, filter: filterBranches, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Filiais</h1>
          <p>Filiais da organização — nome, código e situação de cada unidade operacional.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome ou código…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova filial
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as filiais" tone="warning">
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
        title="Filiais cadastradas"
        action={
          <span style={countStyle}>
            {dense.total} registro(s)
            {pagination.total > items.length ? ` · janela: primeiras ${items.length} de ${pagination.total}` : ""}
          </span>
        }
      >
        {loading && items.length === 0 ? <Skeleton lines={5} /> : null}

        {!loading && !error && dense.total === 0 ? (
          <EmptyState
            title="Nenhuma filial cadastrada"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou a situação para encontrar filiais." : "Cadastre a primeira filial para organizar as unidades da operação."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(branch) => branch.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <BranchFormModal
          key={editing?.id ?? "new"}
          branch={editing}
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

export default FiliaisPage;
