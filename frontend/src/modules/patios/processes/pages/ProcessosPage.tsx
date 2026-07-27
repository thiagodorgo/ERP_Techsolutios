import { ArrowRight, FileStack, Plus, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { DenseColumn, DenseListStatusFilter } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, EmptyState, SearchBar, Select, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useAuth } from "../../../../providers/AuthProvider";
import { usePermissions } from "../../../../providers/PermissionProvider";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { listYardsFromApi } from "../../yards/yards.service";
import type { YardItem } from "../../yards/yards.types";
import { NovoProcessoModal } from "../components/NovoProcessoModal";
import { ProcessStatusChip } from "../components/ProcessStatusChip";
import { filterProcesses, formatDate, getVehicleLabel, STATUS_OPTIONS } from "../processes.adapter";
import type { ProcessListItem, ProcessesFilters, ProcessStatusFilter } from "../processes.types";
import { useProcesses } from "../useProcesses";

// Ω5P PR-08a — Processos de custódia (dense-list ligada a GET /api/v1/impound-processes). Carrega a janela (limit)
// uma vez; filtros de estado/pátio/placa são client-side (padrão dos cadastros irmãos). Backend é a autoridade
// de RBAC (403 real); a criação manual mínima é gated por impound:create.
const STABLE_FILTERS: ProcessesFilters = { status: "all", yardId: "", plate: "", limit: DENSE_LIST_FETCH_LIMIT };

const filterRowStyle: CSSProperties = { display: "flex", alignItems: "flex-end", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };

export function ProcessosPage() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { can } = usePermissions();
  const { items, pagination, loading, error, refresh } = useProcesses(STABLE_FILTERS);
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [yards, setYards] = useState<YardItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProcessStatusFilter>("all");
  const [yardFilter, setYardFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = can("impound:create");

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

  useEffect(() => {
    if (!activeContext) return;
    let active = true;
    void listYardsFromApi(context, { limit: 100 }).then((data) => {
      if (active) setYards(data.items);
    });
    return () => {
      active = false;
    };
  }, [activeContext, context]);

  const yardNameById = useMemo(() => new Map(yards.map((yard) => [yard.id, yard.name])), [yards]);

  // A dense-list controla busca (placa)+ordenação+paginação; a situação (14 estados) e o pátio são filtros próprios
  // — o vocabulário "all/active/inactive" da dense-list não cobre os estados de custódia. isActive é ignorado aqui.
  const filterAdapter = useCallback(
    (rows: readonly ProcessListItem[], filters: { search: string; isActive: DenseListStatusFilter }) => {
      void filters.isActive;
      return filterProcesses(rows, { plate: filters.search, status: statusFilter, yardId: yardFilter });
    },
    [statusFilter, yardFilter],
  );

  const columns: DenseColumn<ProcessListItem>[] = [
    {
      key: "vehicle",
      header: "Identificação",
      sortable: true,
      sortValue: (process) => getVehicleLabel(process),
      render: (process) => (
        <Link to={`/patios/processos/${process.id}`} aria-label={`Abrir o dossiê do processo ${getVehicleLabel(process)}`}>
          <strong>{getVehicleLabel(process)}</strong>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Situação",
      sortable: true,
      sortValue: (process) => process.statusLabel,
      render: (process) => <ProcessStatusChip status={process.status} label={process.statusLabel} />,
    },
    {
      key: "yard",
      header: "Pátio",
      render: (process) => (process.yardId ? yardNameById.get(process.yardId) ?? "Pátio" : <span style={mutedStyle}>Sem pátio</span>),
    },
    {
      key: "enteredAt",
      header: "Entrada",
      sortable: true,
      sortValue: (process) => process.enteredAt ?? "",
      render: (process) => (process.enteredAt ? formatDate(process.enteredAt) : <span style={mutedStyle}>—</span>),
    },
    {
      key: "authority",
      header: "Autoridade solicitante",
      sortable: true,
      sortValue: (process) => process.originAuthority,
      render: (process) => process.originAuthority || <span style={mutedStyle}>—</span>,
    },
    {
      key: "actions",
      header: "Ações",
      render: (process) => (
        <div className="work-orders-row-actions" onClick={(event) => event.stopPropagation()}>
          <Link to={`/patios/processos/${process.id}`} className="ui-button ui-button--secondary ui-button--sm" aria-label={`Abrir o dossiê do processo ${getVehicleLabel(process)}`}>
            <ArrowRight size={14} aria-hidden /> Abrir dossiê
          </Link>
        </div>
      ),
    },
  ];

  const dense = useDenseList<ProcessListItem>({ items, columns, filter: filterAdapter, defaultSort: { key: "enteredAt", dir: "desc" } });

  const hasAnyFilter = dense.hasActiveFilters || statusFilter !== "all" || yardFilter.length > 0;

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Pátios</span>
          <h1>
            <FileStack size={20} aria-hidden style={{ verticalAlign: "-3px", marginRight: 6 }} /> Processos de custódia
          </h1>
          <p>Veículos sob custódia da organização — situação, pátio, data de entrada e autoridade solicitante de cada processo.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por placa ou autoridade…" />
          {canCreate ? (
            <Button type="button" onClick={() => setModalOpen(true)}>
              <Plus size={16} aria-hidden /> Novo processo
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os processos" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        </Alert>
      ) : null}

      <div style={filterRowStyle}>
        <Select label="Situação" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProcessStatusFilter)}>
          <option value="all">Todas as situações</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select label="Pátio" value={yardFilter} onChange={(event) => setYardFilter(event.target.value)}>
          <option value="">Todos os pátios</option>
          {yards.map((yard) => (
            <option key={yard.id} value={yard.id}>
              {yard.name}
            </option>
          ))}
        </Select>
      </div>

      <Card
        title="Processos"
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
            title="Nenhum processo de custódia"
            detail={hasAnyFilter ? "Ajuste a busca, a situação ou o pátio para encontrar processos." : "Os processos nascem da solicitação de remoção da autoridade. Você também pode registrar um processo manualmente."}
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable rows={dense.visibleItems} keyForRow={(process) => process.id} columns={columns} sort={dense.sort} onSort={dense.toggleSort} />
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
        <NovoProcessoModal
          context={context}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            void refresh();
          }}
        />
      ) : null}
    </section>
  );
}

export default ProcessosPage;
