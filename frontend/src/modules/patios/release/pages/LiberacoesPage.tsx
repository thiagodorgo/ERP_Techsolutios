import { RefreshCw, Unlock } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { DenseColumn, DenseListStatusFilter } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, Checkbox, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { ProcessStatusChip } from "../../processes/components/ProcessStatusChip";
import { formatDate, getVehicleLabel } from "../../processes/processes.adapter";
import type { ProcessesFilters, ProcessListItem } from "../../processes/processes.types";
import { useProcesses } from "../../processes/useProcesses";
import { filterReleasableProcesses } from "../release.adapter";

// Ω5P PR-11 — fila de Liberações (/patios/liberacoes). Reuso `useProcesses` + dense-list com filtro multi-status
// CLIENT-SIDE (RELEASE_IN_PROGRESS + RELEASED_FOR_REPAIR, e ACTIVE_CUSTODY quando "incluir elegíveis"). SEM
// endpoint novo (GET /impound-processes já traz o status). Governado por impound:read (esconde-fino no registry);
// cada linha linka ao dossiê, onde vive o painel de liberação. White-label; D-007: mock → vazio honesto.
const STABLE_FILTERS: ProcessesFilters = { status: "all", yardId: "", plate: "", limit: DENSE_LIST_FETCH_LIMIT };
const filterRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };

export function LiberacoesPage() {
  const navigate = useNavigate();
  const { activeContext } = useTenantContext();
  const { items, pagination, loading, error, refresh } = useProcesses(STABLE_FILTERS);
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [includeEligible, setIncludeEligible] = useState(false);

  const releasable = useMemo(() => filterReleasableProcesses(items, includeEligible), [items, includeEligible]);

  const filterAdapter = useCallback(
    (rows: readonly ProcessListItem[], filters: { search: string; isActive: DenseListStatusFilter }) => {
      void filters.isActive;
      const search = filters.search.trim().toLowerCase();
      if (!search) return [...rows];
      return rows.filter((row) => [row.vehiclePlate ?? "", row.originAuthority].join(" ").toLowerCase().includes(search));
    },
    [],
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
    // PADRÃO "LINHA CLICÁVEL" (2026-08-24): a coluna "Ações" saiu inteira — "Abrir dossiê" era a única ação e
    // agora é o clique em qualquer ponto da linha (o painel de liberação vive no dossiê).
  ];

  const dense = useDenseList<ProcessListItem>({ items: releasable, columns, filter: filterAdapter, defaultSort: { key: "enteredAt", dir: "desc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Pátios</span>
          <h1>
            <Unlock size={20} aria-hidden style={{ verticalAlign: "-3px", marginRight: 6 }} /> Liberações
          </h1>
          <p>Restituições e saídas para reparo em andamento — abra o dossiê para conduzir a liberação (quem retira, quitação, autorização e comprovante).</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por placa ou autoridade…" />
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar as liberações" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        </Alert>
      ) : null}

      <div style={filterRowStyle}>
        <Checkbox label="Incluir processos elegíveis (custódia ativa)" checked={includeEligible} onChange={(event) => setIncludeEligible(event.target.checked)} />
      </div>

      <Card
        title="Liberações"
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
            title="Nenhuma liberação em andamento"
            detail={
              includeEligible
                ? "Não há liberações em andamento nem processos elegíveis. Uma liberação começa no dossiê do processo, em custódia ativa."
                : "Não há restituições nem saídas para reparo em andamento. Marque 'incluir elegíveis' para ver processos em custódia ativa."
            }
          />
        ) : null}

        {!error && dense.total > 0 ? (
          <>
            <DenseTable
              rows={dense.visibleItems}
              keyForRow={(process) => process.id}
              columns={columns}
              sort={dense.sort}
              onSort={dense.toggleSort}
              onRowClick={(process) => navigate(`/patios/processos/${process.id}`)}
              rowLabel={(process) => `Abrir o dossiê do processo ${getVehicleLabel(process)}`}
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
    </section>
  );
}

export default LiberacoesPage;
