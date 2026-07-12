import { Pencil, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { DenseColumn } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Chip, EmptyState, SearchBar, Select, Skeleton } from "../../../../components/ui";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { TariffFormModal } from "../components/TariffFormModal";
import {
  filterTariffs,
  formatUnitPrice,
  formatValidity,
  getTariffActiveLabel,
  getTariffActiveTone,
} from "../tariffs.adapter";
import type { TariffActiveFilter, TariffItem, TariffsFilters } from "../tariffs.types";
import { useTariffReferences } from "../useTariffReferences";
import { useTariffs } from "../useTariffs";

// Lista de Tarifas (Ω2-a.2) — itens de preço ligados a uma Tabela de Valores. Endpoint /api/v1/tariffs.
// A janela (limit) é carregada por tabela selecionada; busca/situação/ordenação/paginação são client-side.
const ACTIVE_TABS: readonly { value: TariffActiveFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
];

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const filterLabelStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" };
const dividerStyle: CSSProperties = { width: 1, alignSelf: "stretch", background: "var(--border-subtle, #E2E8F0)", margin: "0 var(--space-4)" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const selectWrapStyle: CSSProperties = { minWidth: 240 };

export function TarifasPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();

  const [priceTableId, setPriceTableId] = useState<string>("");

  // Filtro server-side por Tabela de Valores muda a janela buscada; memorizado para não re-buscar em loop.
  const filters = useMemo<TariffsFilters>(
    () => ({ search: "", isActive: "all", priceTableId: priceTableId || undefined, limit: DENSE_LIST_FETCH_LIMIT }),
    [priceTableId],
  );

  const { items, pagination, loading, error, refresh } = useTariffs(filters);
  const references = useTariffReferences();

  const [editing, setEditing] = useState<TariffItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("tariffs:create");
  const canUpdate = can("tariffs:update");

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

  function openEdit(tariff: TariffItem) {
    setEditing(tariff);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // Serviço/Cliente são IDs no item; a tela resolve o rótulo pela lista de referência.
  // Vazio = tarifa geral ("Todos"); ID sem correspondência na janela = "—" (nunca vaza UUID cru).
  function renderService(tariff: TariffItem) {
    if (!tariff.serviceCatalogId) return <span style={mutedStyle}>Todos os serviços</span>;
    const label = references.serviceLabelById.get(tariff.serviceCatalogId);
    return label ? <span>{label}</span> : <span style={mutedStyle}>—</span>;
  }

  function renderCustomer(tariff: TariffItem) {
    if (!tariff.customerId) return <span style={mutedStyle}>Todos os clientes</span>;
    const label = references.customerLabelById.get(tariff.customerId);
    return label ? <span>{label}</span> : <span style={mutedStyle}>—</span>;
  }

  const columns: DenseColumn<TariffItem>[] = [
    {
      key: "service",
      header: "Serviço",
      sortable: true,
      sortValue: (tariff) => (tariff.serviceCatalogId ? references.serviceLabelById.get(tariff.serviceCatalogId) ?? "" : ""),
      render: renderService,
    },
    {
      key: "customer",
      header: "Cliente",
      sortable: true,
      sortValue: (tariff) => (tariff.customerId ? references.customerLabelById.get(tariff.customerId) ?? "" : ""),
      render: renderCustomer,
    },
    {
      key: "unitPrice",
      header: "Valor unitário",
      sortable: true,
      align: "right",
      tabular: true,
      sortValue: (tariff) => tariff.unitPrice,
      render: (tariff) => <strong>{formatUnitPrice(tariff.unitPrice, tariff.currency)}</strong>,
    },
    {
      key: "origin",
      header: "Origem",
      sortable: true,
      sortValue: (tariff) => tariff.origin,
      render: (tariff) => tariff.origin || <span style={mutedStyle}>—</span>,
    },
    {
      key: "validity",
      header: "Vigência",
      sortable: true,
      tabular: true,
      sortValue: (tariff) => tariff.validFrom ?? "",
      render: (tariff) => formatValidity(tariff.validFrom, tariff.validTo),
    },
    {
      key: "isActive",
      header: "Ativa",
      sortable: true,
      sortValue: (tariff) => getTariffActiveLabel(tariff.isActive),
      render: (tariff) => <Chip tone={getTariffActiveTone(tariff.isActive)}>{getTariffActiveLabel(tariff.isActive)}</Chip>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (tariff) =>
        canUpdate ? (
          <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="button" size="sm" variant="secondary" aria-label={`Editar tarifa ${tariff.origin || tariff.id}`} onClick={() => openEdit(tariff)}>
              <Pencil size={14} aria-hidden /> Editar
            </Button>
          </div>
        ) : (
          <span style={countStyle}>—</span>
        ),
    },
  ];

  const dense = useDenseList<TariffItem>({ items, columns, filter: filterTariffs, defaultSort: { key: "unitPrice", dir: "asc" } });

  const hasAnyFilter = dense.hasActiveFilters || priceTableId !== "";

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Cadastros</span>
          <h1>Tarifas</h1>
          <p>Itens de preço das tabelas de valores — serviço, cliente, valor unitário, origem e vigência.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por nome, origem, moeda ou regra…" />
          <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} aria-hidden /> Atualizar
          </Button>
          {canCreate ? (
            <Button type="button" onClick={openCreate}>
              <Plus size={16} aria-hidden /> Nova tarifa
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as tarifas" tone="warning">
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
        <span style={dividerStyle} aria-hidden />
        <span style={filterLabelStyle}>Tabela de Valores</span>
        <div style={selectWrapStyle}>
          <Select aria-label="Filtrar por Tabela de Valores" value={priceTableId} onChange={(event) => setPriceTableId(event.target.value)}>
            <option value="">Todas as tabelas</option>
            {references.priceTables.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {error ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        ) : null}
      </div>

      <Card
        title="Tarifas cadastradas"
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
            title="Nenhuma tarifa cadastrada"
            detail={hasAnyFilter ? "Ajuste a busca, a situação ou a Tabela de Valores para encontrar tarifas." : "Cadastre a primeira tarifa para precificar serviços e clientes."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(tariff) => tariff.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <TariffFormModal
          key={editing?.id ?? "new"}
          tariff={editing}
          context={context}
          priceTables={references.priceTables}
          services={references.services}
          customers={references.customers}
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

export default TarifasPage;
