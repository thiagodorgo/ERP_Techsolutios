import { ArrowRight, Gavel, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { DenseColumn, DenseListStatusFilter } from "../../../../components/dense-list";
import { DenseListPagination, DenseTable, DENSE_LIST_FETCH_LIMIT, useDenseList } from "../../../../components/dense-list";
import { Alert, Button, Card, EmptyState, SearchBar, Skeleton } from "../../../../components/ui";
import { useAutoRefresh } from "../../../../hooks/useAutoRefresh";
import { useTenantContext } from "../../../../providers/TenantProvider";
import { ProcessStatusChip } from "../../processes/components/ProcessStatusChip";
import { formatDate, getVehicleLabel } from "../../processes/processes.adapter";
import type { ImpoundStatus, ProcessesFilters, ProcessListItem } from "../../processes/processes.types";
import { useProcesses } from "../../processes/useProcesses";
import { AUCTION_FUNNEL_STAGES, countAuctionStages, filterAuctionProcesses } from "../auction.adapter";

// Ω5P PR-15a — funil de Leilões (/patios/leiloes). Reuso `useProcesses` (1 só GET /impound-processes — SEM N+1:
// NUNCA chama .../auction nem .../settlement por linha) + dense-list com filtro de estado CLIENT-SIDE. Cabeçalho-
// funil VIVO = 6 cards de contagem clicáveis por estado de leilão (Elegíveis · Em preparação · Loteados ·
// Arrematados · Encerrados · Reciclagem) que filtram a lista. Governado por impound:read (esconde-fino no registry);
// cada linha linka ao dossiê, onde vive o painel de leilão. White-label; D-007: mock → vazio honesto.
const STABLE_FILTERS: ProcessesFilters = { status: "all", yardId: "", plate: "", limit: DENSE_LIST_FETCH_LIMIT };
const countStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 700 };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const funnelGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-8)" };

const TONE_ACCENT: Record<string, string> = { warning: "#B45309", danger: "#DC2626", default: "#475569" };

export function LeiloesPage() {
  const { activeContext } = useTenantContext();
  const { items, pagination, loading, error, refresh } = useProcesses(STABLE_FILTERS);
  useAutoRefresh(refresh, { enabled: Boolean(activeContext) });

  const [stageFilter, setStageFilter] = useState<ImpoundStatus | "all">("all");

  const counts = useMemo(() => countAuctionStages(items), [items]);
  const totalInFunnel = useMemo(() => filterAuctionProcesses(items, "all").length, [items]);
  const funnelItems = useMemo(() => filterAuctionProcesses(items, stageFilter), [items, stageFilter]);

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

  const dense = useDenseList<ProcessListItem>({ items: funnelItems, columns, filter: filterAdapter, defaultSort: { key: "enteredAt", dir: "desc" } });

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Pátios</span>
          <h1>
            <Gavel size={20} aria-hidden style={{ verticalAlign: "-3px", marginRight: 6 }} /> Leilões
          </h1>
          <p>Funil do leilão administrativo — do processo elegível à arrematação, encerramento e reciclagem. Abra o dossiê para conduzir o certame de cada processo.</p>
        </div>
        <div className="work-orders-actions">
          <SearchBar value={dense.search} onChange={dense.setSearch} placeholder="Buscar por placa ou autoridade…" />
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar os leilões" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden /> Tentar novamente
          </Button>
        </Alert>
      ) : null}

      <div style={funnelGrid} role="group" aria-label="Filtrar leilões por etapa">
        <FunnelCard label="Todos" count={totalInFunnel} accent="#2563EB" active={stageFilter === "all"} onClick={() => setStageFilter("all")} />
        {AUCTION_FUNNEL_STAGES.map((funnelStage) => (
          <FunnelCard
            key={funnelStage.status}
            label={funnelStage.label}
            count={counts[funnelStage.status] ?? 0}
            accent={TONE_ACCENT[funnelStage.tone] ?? "#475569"}
            active={stageFilter === funnelStage.status}
            onClick={() => setStageFilter(funnelStage.status)}
          />
        ))}
      </div>

      <Card
        title="Processos em leilão"
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
            title="Nenhum processo em leilão"
            detail={
              stageFilter === "all"
                ? "Nenhum processo entrou no funil de leilão. Um processo torna-se elegível no dossiê, em custódia ativa."
                : "Nenhum processo nesta etapa do leilão. Selecione 'Todos' para ver as demais etapas."
            }
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
    </section>
  );
}

// Card de contagem do funil — botão clicável (a11y: alvo >=44px, foco visível via .ui-* focus ring, aria-pressed).
function FunnelCard({
  label,
  count,
  accent,
  active,
  onClick,
}: {
  readonly label: string;
  readonly count: number;
  readonly accent: string;
  readonly active: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "flex-start",
        minHeight: 64,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${active ? accent : "#E2E8F0"}`,
        background: active ? "#F8FAFC" : "#FFFFFF",
        borderLeft: `4px solid ${accent}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1 }}>{count}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{label}</span>
    </button>
  );
}

export default LeiloesPage;
