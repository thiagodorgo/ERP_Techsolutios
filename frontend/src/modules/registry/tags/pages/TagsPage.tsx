import { Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { TagFormModal } from "../components/TagFormModal";
import { filterTags, formatTagColor, getTagStatusLabel, getTagStatusTone, truncateText } from "../tags.adapter";
import type { TagActiveFilter, TagItem, TagsFilters } from "../tags.types";
import { useTags } from "../useTags";

// Lista de "Tags" (Ω2-d) — ligada ao endpoint real /api/v1/tags.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: TagsFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

// Situação de cadastro (isActive) — FEMININO (etiqueta), como tarifa.
const ACTIVE_TABS: readonly { value: TagActiveFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const etiquetaCellStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-8)" };
const swatchStyle: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  flexShrink: 0,
  border: "1px solid rgba(15, 23, 42, .18)",
  display: "inline-block",
};
const descriptionCellStyle: CSSProperties = { maxWidth: 320, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" };

export function TagsPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useTags(STABLE_FILTERS);

  const [editing, setEditing] = useState<TagItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("tags:create");
  const canUpdate = can("tags:update");

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

  function openEdit(tag: TagItem) {
    setEditing(tag);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const columns: DenseColumn<TagItem>[] = [
    {
      key: "name",
      header: "Etiqueta",
      sortable: true,
      sortValue: (tag) => tag.name,
      render: (tag) => (
        <span style={etiquetaCellStyle}>
          {tag.color ? <span aria-hidden style={{ ...swatchStyle, background: tag.color }} /> : null}
          <strong>{tag.name}</strong>
        </span>
      ),
    },
    {
      key: "color",
      header: "Cor",
      sortable: true,
      tabular: true,
      sortValue: (tag) => tag.color ?? "",
      render: (tag) => (tag.color ? formatTagColor(tag.color) : <span style={mutedStyle}>—</span>),
    },
    {
      key: "description",
      header: "Descrição",
      sortable: true,
      sortValue: (tag) => tag.description ?? "",
      render: (tag) =>
        tag.description ? (
          <span style={descriptionCellStyle} title={tag.description}>
            {truncateText(tag.description)}
          </span>
        ) : (
          <span style={mutedStyle}>—</span>
        ),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (tag) => getTagStatusLabel(tag.isActive),
      render: (tag) => <Chip tone={getTagStatusTone(tag.isActive)}>{getTagStatusLabel(tag.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (tag) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar etiqueta ${tag.name}`} onClick={() => openEdit(tag)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<TagItem>({ items, columns, filter: filterTags, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Tags</h1>
          <p>Etiquetas da organização — nome, cor, descrição e situação.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, cor ou descrição…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova etiqueta
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as etiquetas" tone="warning">
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
        title="Etiquetas cadastradas"
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
            title="Nenhuma etiqueta cadastrada"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou a situação para encontrar etiquetas." : "Cadastre a primeira etiqueta para classificar registros da operação."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(tag) => tag.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <TagFormModal
          key={editing?.id ?? "new"}
          tag={editing}
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

export default TagsPage;
