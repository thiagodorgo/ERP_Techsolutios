import { Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { PoiFormModal } from "../components/PoiFormModal";
import { filterPois, formatCoordinate, getPoiStatusLabel, getPoiStatusTone, truncateText } from "../pois.adapter";
import type { PoiActiveFilter, PoiItem, PoisFilters } from "../pois.types";
import { usePois } from "../usePois";

// Lista de "Pontos de Interesse" (Ω2-d) — ligada ao endpoint real /api/v1/pois.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: PoisFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

// Situação de cadastro (isActive) — MASCULINO (ponto), como cliente/fornecedor.
const ACTIVE_TABS: readonly { value: PoiActiveFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const coordStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const addressCellStyle: CSSProperties = { maxWidth: 280, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" };

export function PontosInteressePage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = usePois(STABLE_FILTERS);

  const [editing, setEditing] = useState<PoiItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("pois:create");
  const canUpdate = can("pois:update");

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

  function openEdit(poi: PoiItem) {
    setEditing(poi);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const columns: DenseColumn<PoiItem>[] = [
    { key: "name", header: "Ponto", sortable: true, sortValue: (poi) => poi.name, render: (poi) => <strong>{poi.name}</strong> },
    {
      key: "category",
      header: "Categoria",
      sortable: true,
      sortValue: (poi) => poi.category ?? "",
      render: (poi) => poi.category ?? <span style={mutedStyle}>—</span>,
    },
    {
      key: "coordinate",
      header: "Coordenada",
      tabular: true,
      sortable: true,
      sortValue: (poi) => poi.latitude,
      render: (poi) => <span style={coordStyle}>{formatCoordinate(poi.latitude, poi.longitude)}</span>,
    },
    {
      key: "address",
      header: "Endereço",
      sortable: true,
      sortValue: (poi) => poi.address ?? "",
      render: (poi) =>
        poi.address ? (
          <span style={addressCellStyle} title={poi.address}>
            {truncateText(poi.address)}
          </span>
        ) : (
          <span style={mutedStyle}>—</span>
        ),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (poi) => getPoiStatusLabel(poi.isActive),
      render: (poi) => <Chip tone={getPoiStatusTone(poi.isActive)}>{getPoiStatusLabel(poi.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (poi) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar ponto de interesse ${poi.name}`} onClick={() => openEdit(poi)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<PoiItem>({ items, columns, filter: filterPois, defaultSort: { key: "name", dir: "asc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Pontos de Interesse</h1>
          <p>Pontos de interesse da organização — categoria, coordenada, endereço e situação.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, categoria ou endereço…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Novo ponto
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os pontos de interesse" tone="warning">
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
        title="Pontos de interesse cadastrados"
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
            title="Nenhum ponto de interesse cadastrado"
            detail={dense.hasActiveFilters ? "Ajuste a busca ou a situação para encontrar pontos." : "Cadastre o primeiro ponto de interesse para apoiar a operação de campo."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(poi) => poi.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <PoiFormModal
          key={editing?.id ?? "new"}
          poi={editing}
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

export default PontosInteressePage;
