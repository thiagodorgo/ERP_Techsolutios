import { ArrowRight, Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { YardFormModal } from "../components/YardFormModal";
import { filterYards, getYardActiveLabel, getYardActiveTone } from "../yards.adapter";
import type { YardActiveFilter, YardItem, YardsFilters } from "../yards.types";
import { useYards } from "../useYards";

// Pátios (Ω5P PR-04) — dense-list ligada ao endpoint real /api/v1/yards. Carrega a janela (limit) uma vez;
// busca/situação/ordenação/paginação são client-side (padrão dos cadastros irmãos).
const STABLE_FILTERS: YardsFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

const ACTIVE_TABS: readonly { value: YardActiveFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };

export function PatiosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useYards(STABLE_FILTERS);
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [editing, setEditing] = useState<YardItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("yard:create");
  const canUpdate = can("yard:update");

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

  function openEdit(yard: YardItem) {
    setEditing(yard);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const columns: DenseColumn<YardItem>[] = [
    {
      key: "name",
      header: "Nome",
      sortable: true,
      sortValue: (yard) => yard.name,
      render: (yard) => (
        <Link to={`/patios/patios/${yard.id}`} aria-label={`Abrir o pátio ${yard.name}`}>
          <strong>{yard.name}</strong>
        </Link>
      ),
    },
    {
      key: "address",
      header: "Endereço",
      sortable: true,
      sortValue: (yard) => yard.address,
      render: (yard) => yard.address || <span style={mutedStyle}>—</span>,
    },
    {
      key: "timezone",
      header: "Fuso horário",
      sortable: true,
      sortValue: (yard) => yard.timezone,
      render: (yard) => yard.timezone,
    },
    {
      key: "active",
      header: "Situação",
      sortable: true,
      sortValue: (yard) => getYardActiveLabel(yard.active),
      render: (yard) => <Chip tone={getYardActiveTone(yard.active)}>{getYardActiveLabel(yard.active)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (yard) => (
        <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
          <Link to={`/patios/patios/${yard.id}`} className="ui-button ui-button--secondary ui-button--sm" aria-label={`Abrir o pátio ${yard.name}`}>
            <ArrowRight size={14} aria-hidden /> Abrir
          </Link>
          {canUpdate ? (
            <Button type="button" size="sm" variant="ghost" aria-label={`Editar o pátio ${yard.name}`} onClick={() => openEdit(yard)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const dense = useDenseList<YardItem>({ items, columns, filter: filterYards, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Pátios</span>
          <h1>Pátios</h1>
          <p>Pátios de recolhimento da organização — nome, endereço, fuso horário e situação de cada local de guarda.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome ou endereço…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo pátio
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os pátios" tone="warning">
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
        title="Pátios cadastrados"
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
            title="Nenhum pátio cadastrado"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou a situação para encontrar pátios." : "Cadastre o primeiro pátio para organizar as áreas e vagas de guarda."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(yard) => yard.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <YardFormModal
          key={editing?.id ?? "new"}
          yard={editing}
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

export default PatiosPage;
