import { Archive, Plus, RefreshCw, Send } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { PriceTableFormModal } from "../components/PriceTableFormModal";
import {
  filterPriceTables,
  formatCurrency,
  formatTariffRange,
  formatValidity,
  formatVehicleCategory,
  formatVersion,
  getPriceTableActiveLabel,
  getPriceTableActiveTone,
  getPriceTableScopeLabel,
  getPriceTableScopeTone,
  getPriceTableStatusActions,
  getPriceTableStatusLabel,
  getPriceTableStatusTone,
} from "../price-tables.adapter";
import { updatePriceTable } from "../price-tables.service";
import type { PriceTableActiveFilter, PriceTableItem, PriceTablePublishFilter, PriceTableScopeFilter, PriceTableStatus, PriceTablesFilters } from "../price-tables.types";
import { usePriceTables } from "../usePriceTables";

// Lista de "Tabela de Valores" (Ω2-a.1) — ligada ao endpoint real /api/v1/price-tables.
// Carrega a janela de trabalho (limit) uma vez; busca/ordenação/paginação são client-side.
const STABLE_FILTERS: PriceTablesFilters = { search: "", isActive: "all", limit: DENSE_LIST_FETCH_LIMIT };

// Situação de cadastro (isActive) — FEMININO (tabela). Dimensão distinta do status de publicação.
const ACTIVE_TABS: readonly { value: PriceTableActiveFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

// Status de publicação (RN-CAD-008).
const PUBLISH_TABS: readonly { value: PriceTablePublishFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicada" },
  { value: "archived", label: "Arquivada" },
];

// Ω5P PR-04 — Escopo (dupla natureza tarifária, ESTUDO §9). Filtro client-side sobre a janela carregada.
const SCOPE_TABS: readonly { value: PriceTableScopeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "PUBLIC_AGREEMENT", label: "Convênio público" },
  { value: "PRIVATE_CONTRACT", label: "Contrato privado" },
];

// Categoria de veículo — filtro por app-code curado ("" = Todas). Conveniência PT-BR (D-Ω5P-UI-05).
const CATEGORY_TABS: readonly { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "MOTORCYCLE", label: "Motocicleta" },
  { value: "CAR", label: "Automóvel" },
  { value: "TRUCK", label: "Caminhão / Pesado" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const dividerStyle: CSSProperties = { width: 1, alignSelf: "stretch", background: "var(--border-subtle, #E2E8F0)", margin: "0 var(--space-4)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };

export function TabelasValoresPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  // Ω5P PR-04 — a mesma tela é exposta em dois caminhos (GESTÃO→/cadastros/tabelas-valores e PÁTIOS→/patios/tarifas).
  // Só o cabeçalho é sensível à rota (breadcrumb/subtítulo coerentes com o grupo de origem) — sem duplicar a página.
  const { pathname } = useLocation();
  const inPatios = pathname.startsWith("/patios");
  const breadcrumb = inPatios ? "Pátios" : "Cadastros";
  const subtitle = inPatios
    ? "Tabelas de valores do pátio — itens e faixa de valor, escopo (público/privado), categoria de veículo, vigência e status de publicação."
    : "Tabelas de valores da organização — itens e faixa de valor, moeda, versão, vigência e status de publicação.";
  const { items, pagination, loading, error, refresh } = usePriceTables(STABLE_FILTERS);
  // WS-UI-REFRESH — o sistema recarrega sozinho em segundo plano (sem botão "Atualizar").
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [editing, setEditing] = useState<PriceTableItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishFilter, setPublishFilter] = useState<PriceTablePublishFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<PriceTableScopeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const canCreate = can("price_tables:create");
  const canUpdate = can("price_tables:update");

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

  // Filtros de publicação/escopo/categoria são pré-aplicados; a dense-list cuida de busca/situação/ordenação/paginação.
  const publishedFiltered = useMemo(
    () =>
      items.filter((table) => {
        if (publishFilter !== "all" && table.status !== publishFilter) return false;
        if (scopeFilter !== "all" && table.scope !== scopeFilter) return false;
        if (categoryFilter !== "all" && (table.vehicleCategory ?? "") !== categoryFilter) return false;
        return true;
      }),
    [items, publishFilter, scopeFilter, categoryFilter],
  );

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(table: PriceTableItem) {
    setEditing(table);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function changeStatus(table: PriceTableItem, target: PriceTableStatus) {
    setBusyId(table.id);
    setActionError(null);
    try {
      await updatePriceTable(context, table.id, { status: target });
      await refresh();
    } catch {
      setActionError(`Não foi possível ${target === "published" ? "publicar" : "arquivar"} a tabela ${table.name}. Tente novamente.`);
    } finally {
      setBusyId(null);
    }
  }

  const columns: DenseColumn<PriceTableItem>[] = [
    { key: "name", header: "Nome", sortable: true, sortValue: (table) => table.name, render: (table) => <strong>{table.name}</strong> },
    { key: "currency", header: "Moeda", sortable: true, sortValue: (table) => table.currency, render: (table) => formatCurrency(table.currency) },
    {
      // A coluna que faltava: a tela dizia a moeda e nunca um número. Aqui aparecem os itens da tabela
      // (Tarifas ativas) e a faixa de valor deles. Sem item → "—", nunca "R$ 0,00".
      key: "tariffRange",
      header: "Valores",
      sortable: true,
      tabular: true,
      // Ordena pelo piso da faixa; tabela sem valor conhecido vai para o fim (-1 é menor que qualquer preço).
      sortValue: (table) => (table.itemCount > 0 ? table.minUnitPrice ?? -1 : -1),
      render: (table) => <strong>{formatTariffRange(table)}</strong>,
    },
    {
      key: "version",
      header: "Versão",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (table) => table.version,
      render: (table) => formatVersion(table.version),
    },
    {
      key: "validity",
      header: "Vigência",
      sortable: true,
      tabular: true,
      sortValue: (table) => table.validFrom ?? "",
      render: (table) => formatValidity(table.validFrom, table.validTo),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (table) => getPriceTableStatusLabel(table.status),
      render: (table) => <Chip tone={getPriceTableStatusTone(table.status)}>{getPriceTableStatusLabel(table.status)}</Chip>,
    },
    {
      key: "scope",
      header: "Escopo",
      sortable: true,
      sortValue: (table) => getPriceTableScopeLabel(table.scope),
      render: (table) => <Chip tone={getPriceTableScopeTone(table.scope)}>{getPriceTableScopeLabel(table.scope)}</Chip>,
    },
    {
      key: "vehicleCategory",
      header: "Categoria",
      sortable: true,
      sortValue: (table) => formatVehicleCategory(table.vehicleCategory),
      render: (table) => formatVehicleCategory(table.vehicleCategory),
    },
    {
      key: "isActive",
      header: "Ativa",
      sortable: true,
      sortValue: (table) => getPriceTableActiveLabel(table.isActive),
      render: (table) => <Chip tone={getPriceTableActiveTone(table.isActive)}>{getPriceTableActiveLabel(table.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      // A coluna PERMANECE (rascunho e publicada têm ação), mas ARQUIVADA não tem
      // nenhuma transição de status — PRICE_TABLE_STATUS_TRANSITIONS.archived é `[]`.
      // Como o filtro padrão da tela é "all", a linha arquivada aparece; sem o
      // travessão a célula ficaria vazia, que é a "faixa fantasma" que a regra 2 do
      // padrão de linha clicável proíbe (COMPONENT_LIBRARY.md).
      render: (table) =>
        canUpdate && getPriceTableStatusActions(table.status).length > 0 ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            {getPriceTableStatusActions(table.status).map((action) => (
              <Button
                key={action.target}
                type="button"
                size="sm"
                variant="ghost"
                disabled={busyId === table.id}
                aria-label={`${action.label} ${table.name}`}
                onClick={() => void changeStatus(table, action.target)}
              >
                {action.target === "published" ? <Send size={14} aria-hidden /> : <Archive size={14} aria-hidden />}
                {action.label}
              </Button>
            ))}
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<PriceTableItem>({ items: publishedFiltered, columns, filter: filterPriceTables, defaultSort: { key: "name", dir: "asc" } });

  const hasAnyFilter = dense.hasActiveFilters || publishFilter !== "all" || scopeFilter !== "all" || categoryFilter !== "all";

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>{breadcrumb}</span>
          <h1>Tabela de Valores</h1>
          <p>{subtitle}</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, descrição ou moeda…" />
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova tabela
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as tabelas de valores" tone="warning">
          {error}
        </Alert>
      ) : null}

      {actionError ? (
        <Alert title="Ação não concluída" tone="danger">
          {actionError}
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
        <span style={dividerStyle} aria-hidden />
        <span style={filterLabelStyle}>Publicação</span>
        {PUBLISH_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={publishFilter === tab.value ? "primary" : "ghost"}
            aria-pressed={publishFilter === tab.value}
            onClick={() => setPublishFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
        <span style={dividerStyle} aria-hidden />
        <span style={filterLabelStyle}>Escopo</span>
        {SCOPE_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={scopeFilter === tab.value ? "primary" : "ghost"}
            aria-pressed={scopeFilter === tab.value}
            onClick={() => setScopeFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
        <span style={dividerStyle} aria-hidden />
        <span style={filterLabelStyle}>Categoria</span>
        {CATEGORY_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={categoryFilter === tab.value ? "primary" : "ghost"}
            aria-pressed={categoryFilter === tab.value}
            onClick={() => setCategoryFilter(tab.value)}
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
        title="Tabelas cadastradas"
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
            title="Nenhuma tabela de valores cadastrada"
            detail={hasAnyFilter ? "Ajuste a busca ou os filtros de situação e publicação para encontrar tabelas." : "Cadastre a primeira tabela de valores para começar a precificar."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable
              rows={dense.visibleItems}
              keyForRow={(table) => table.id}
              columns={columns}
              sort={dense.sort}
              onSort={dense.toggleSort}
              onRowClick={canUpdate ? openEdit : undefined}
              rowLabel={(table) => `Abrir tabela de valores ${table.name}`}
            />
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
        <PriceTableFormModal
          key={editing?.id ?? "new"}
          priceTable={editing}
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

export default TabelasValoresPage;
