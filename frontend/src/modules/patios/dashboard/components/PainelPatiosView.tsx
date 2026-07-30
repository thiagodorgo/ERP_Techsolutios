import { AlertTriangle, Coins, FileStack, Gavel, RefreshCw, Unlock, Warehouse } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { ClickableKpiCard } from "../../../../components/kpi";
import type { KpiDetail } from "../../../../components/kpi";
import { Alert, Card, EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import {
  formatDateTime,
  formatMoney,
  getBeneficiaryLabel,
  getNotificationKindLabel,
  getPhaseBucketLabel,
  isDeadlineOverdue,
  occupancyRate,
  ORDERED_PHASE_BUCKETS,
  sortByBeneficiaryTotal,
  totalOccupiedSpots,
  totalSpots,
} from "../dashboard.adapter";
import type { PatiosDashboardSummary } from "../dashboard.types";

// Ω5P PR-20 — presentational view do painel gerencial dos Pátios, extraída de PainelPatiosPage para ser
// testável por props (mesmo padrão de GuiaDebitos: hook fica na page, os 5 estados obrigatórios (§7) viram
// props diretas aqui). A UI NÃO soma nada: cada card/tabela exibe exatamente o agregado que o backend já
// calculou (I1 ocupação, I6 notificações, I7 arrecadação). D-007: sem dado → empty honesto, nunca fabricado.

export type PainelPatiosViewProps = {
  summary: PatiosDashboardSummary | null;
  loading: boolean;
  error: string | null;
  denied: boolean;
  stale: boolean;
  updatedAt: Date | null;
  onReload: () => void;
};

const kpiGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-10)" };
const tablesGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--space-16)" };
const mutedStyle: CSSProperties = { color: "var(--text-secondary)" };
const tabularStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };
const rowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--border-subtle, #F1F5F9)" };
const cardActionLinkStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--brand-primary, #2563EB)", textDecoration: "none" };

export function PainelPatiosView({ summary, loading, error, denied, stale, updatedAt, onReload }: PainelPatiosViewProps) {
  const now = new Date();

  const rate = summary ? occupancyRate(summary.occupancy) : null;
  const occupied = summary ? totalOccupiedSpots(summary.occupancy) : 0;
  const spots = summary ? totalSpots(summary.occupancy) : 0;

  const phaseRows = useMemo(() => {
    if (!summary) return [];
    return ORDERED_PHASE_BUCKETS.map((bucket) => ({ bucket, label: getPhaseBucketLabel(bucket), count: summary.processesByPhase[bucket] }));
  }, [summary]);

  const beneficiaryRows = useMemo(() => (summary ? sortByBeneficiaryTotal(summary.auctionRevenue.byBeneficiary) : []), [summary]);

  const sortedAlerts = useMemo(() => {
    if (!summary) return [];
    return [...summary.deadlineAlerts].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [summary]);

  const kpiDetails = useMemo(() => {
    if (!summary) return null;
    return buildKpiDetails(summary, rate, occupied, spots);
  }, [summary, rate, occupied, spots]);

  if (denied) {
    return (
      <section className="page-stack">
        <header className="page-heading">
          <span>Pátios</span>
          <h1>Painel gerencial</h1>
        </header>
        <ErrorState title="Acesso não permitido" detail="Seu perfil não possui permissão para visualizar o painel gerencial dos pátios." />
      </section>
    );
  }

  return (
    <section className="page-stack work-orders-page">
      <header className="page-heading page-heading--row">
        <div>
          <span>Pátios</span>
          <h1>Painel gerencial</h1>
          <p>Ocupação, processos por fase, fila de liberação, prazos e arrecadação de leilão — visão consolidada dos pátios de recolhimento.</p>
        </div>
      </header>

      {error ? (
        <Alert title="Não foi possível carregar o painel" tone="warning">
          {error}{" "}
          <button
            type="button"
            className="ui-button ui-button--secondary ui-button--sm"
            onClick={() => onReload()}
            style={{ marginLeft: 8 }}
          >
            <RefreshCw size={14} aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} /> Tentar novamente
          </button>
        </Alert>
      ) : null}

      {stale && !error ? (
        <Alert title="Dados podem estar desatualizados" tone="warning">
          Exibindo os últimos indicadores carregados{updatedAt ? ` (atualizados às ${formatDateTime(updatedAt.toISOString())})` : ""}. Tentaremos novamente em segundo plano.
        </Alert>
      ) : null}

      {loading && !summary ? (
        <div style={kpiGridStyle} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <Skeleton lines={2} />
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && !summary && !error ? (
        <EmptyState title="Sem indicadores para exibir" detail="Não há dados suficientes para compor o painel gerencial dos pátios agora." />
      ) : null}

      {summary && kpiDetails ? (
        <div aria-live="polite" style={kpiGridStyle}>
          <ClickableKpiCard detail={kpiDetails.occupancy}>
            <div className="work-orders-kpi">
              <span>
                <Warehouse size={16} aria-hidden /> Ocupação
              </span>
              <strong style={tabularStyle}>{rate === null ? "—" : `${rate}%`}</strong>
              <span style={mutedStyle}>{spots > 0 ? `${occupied} de ${spots} vagas` : "Sem vagas cadastradas"}</span>
            </div>
          </ClickableKpiCard>

          <ClickableKpiCard detail={kpiDetails.processes}>
            <div className="work-orders-kpi">
              <span>
                <FileStack size={16} aria-hidden /> Processos ativos
              </span>
              <strong style={tabularStyle}>{summary.totalProcesses.toLocaleString("pt-BR")}</strong>
            </div>
          </ClickableKpiCard>

          <ClickableKpiCard detail={kpiDetails.releaseQueue}>
            <div className="work-orders-kpi">
              <span>
                <Unlock size={16} aria-hidden /> Fila de liberação
              </span>
              <strong style={tabularStyle}>{summary.releaseQueueDepth.toLocaleString("pt-BR")}</strong>
            </div>
          </ClickableKpiCard>

          <ClickableKpiCard detail={kpiDetails.overdue}>
            <div className="work-orders-kpi">
              <span>
                <AlertTriangle size={16} aria-hidden /> Prazos vencidos
              </span>
              <strong style={tabularStyle}>{summary.overdueNotifications.toLocaleString("pt-BR")}</strong>
            </div>
          </ClickableKpiCard>

          <ClickableKpiCard detail={kpiDetails.lots}>
            <div className="work-orders-kpi">
              <span>
                <Gavel size={16} aria-hidden /> Lotes abertos
              </span>
              <strong style={tabularStyle}>{summary.openLots.toLocaleString("pt-BR")}</strong>
            </div>
          </ClickableKpiCard>

          <ClickableKpiCard detail={kpiDetails.revenue}>
            <div className="work-orders-kpi">
              <span>
                <Coins size={16} aria-hidden /> Arrecadação do mês
              </span>
              <strong style={tabularStyle}>{formatMoney(summary.auctionRevenue.currentMonthTotal)}</strong>
              <span style={mutedStyle}>Total acumulado: {formatMoney(summary.auctionRevenue.grandTotal)}</span>
            </div>
          </ClickableKpiCard>
        </div>
      ) : null}

      {summary ? (
        <div style={tablesGridStyle}>
          <Card title="Ocupação por pátio" action={<Link to="/patios/patios" style={cardActionLinkStyle}>Ver pátios</Link>}>
            {summary.occupancy.length === 0 ? (
              <EmptyState title="Nenhum pátio cadastrado" detail="Cadastre pátios e vagas para acompanhar a ocupação aqui." />
            ) : (
              summary.occupancy.map((yard) => (
                <div key={yard.yardId} style={rowStyle}>
                  <span>{yard.yardName}</span>
                  <span style={tabularStyle}>
                    {yard.occupiedSpots}/{yard.totalSpots} ocupadas
                    {yard.blockedSpots > 0 ? ` · ${yard.blockedSpots} bloqueada(s)` : ""}
                  </span>
                </div>
              ))
            )}
          </Card>

          <Card title="Processos por fase" action={<Link to="/patios/processos" style={cardActionLinkStyle}>Ver processos</Link>}>
            {summary.totalProcesses === 0 ? (
              <EmptyState title="Nenhum processo em custódia" detail="Ainda não há processos de custódia registrados nesta organização." />
            ) : (
              phaseRows.map((row) => (
                <div key={row.bucket} style={rowStyle}>
                  <span>{row.label}</span>
                  <span style={tabularStyle}>{row.count.toLocaleString("pt-BR")}</span>
                </div>
              ))
            )}
          </Card>

          <Card title="Arrecadação de leilão por beneficiário" action={<Link to="/patios/leiloes" style={cardActionLinkStyle}>Ver leilões</Link>}>
            {beneficiaryRows.length === 0 ? (
              <EmptyState title="Sem arrecadação registrada" detail="Nenhuma liquidação de leilão foi registrada ainda." />
            ) : (
              beneficiaryRows.map((row) => (
                <div key={row.beneficiaryKind} style={rowStyle}>
                  <span>{getBeneficiaryLabel(row.beneficiaryKind)}</span>
                  <strong style={tabularStyle}>{formatMoney(row.totalAmount)}</strong>
                </div>
              ))
            )}
          </Card>

          <Card title="Próximos prazos" action={<Link to="/patios/processos" style={cardActionLinkStyle}>Ver processos</Link>}>
            {sortedAlerts.length === 0 ? (
              <EmptyState title="Nenhum prazo pendente" detail="Não há notificações ou editais com prazo em aberto no momento." />
            ) : (
              sortedAlerts.slice(0, 8).map((alert) => (
                <div key={`${alert.processId}-${alert.kind}`} style={rowStyle}>
                  <span>
                    <Link to={`/patios/processos/${alert.processId}`}>{getNotificationKindLabel(alert.kind)}</Link>
                    {isDeadlineOverdue(alert, now) ? <span style={{ color: "var(--color-danger, #DC2626)", fontWeight: 700 }}> · vencido</span> : null}
                  </span>
                  <span style={mutedStyle}>{formatDateTime(alert.dueAt)}</span>
                </div>
              ))
            )}
          </Card>
        </div>
      ) : null}
    </section>
  );
}

export function buildKpiDetails(
  summary: PatiosDashboardSummary,
  rate: number | null,
  occupied: number,
  spots: number,
): Record<"occupancy" | "processes" | "releaseQueue" | "overdue" | "lots" | "revenue", KpiDetail> {
  return {
    occupancy: {
      title: "Ocupação",
      value: rate === null ? "—" : `${rate}%`,
      caption: spots > 0 ? `${occupied} de ${spots} vagas ocupadas` : "Sem vagas cadastradas",
      body: { kind: "explain", text: "Percentual de vagas ocupadas sobre o total de vagas cadastradas em todos os pátios da organização." },
      cta: { label: "Ver pátios", to: "/patios/patios" },
    },
    processes: {
      title: "Processos ativos",
      value: summary.totalProcesses.toLocaleString("pt-BR"),
      body: { kind: "breakdown", parts: ORDERED_PHASE_BUCKETS.map((bucket) => ({ label: getPhaseBucketLabel(bucket), value: summary.processesByPhase[bucket].toLocaleString("pt-BR") })) },
      cta: { label: "Ver processos", to: "/patios/processos" },
    },
    releaseQueue: {
      title: "Fila de liberação",
      value: summary.releaseQueueDepth.toLocaleString("pt-BR"),
      body: { kind: "explain", text: "Processos com uma liberação (restituição ou saída para reparo) em andamento neste momento." },
      cta: { label: "Ver liberações", to: "/patios/liberacoes" },
    },
    overdue: {
      title: "Prazos vencidos",
      value: summary.overdueNotifications.toLocaleString("pt-BR"),
      body: { kind: "explain", text: "Notificações ao proprietário ou editais que já venceram o prazo devido e ainda não têm emissão nem dispensa registrada." },
      cta: { label: "Ver processos", to: "/patios/processos" },
    },
    lots: {
      title: "Lotes abertos",
      value: summary.openLots.toLocaleString("pt-BR"),
      body: { kind: "explain", text: "Processos já organizados em lote de leilão, aguardando o certame." },
      cta: { label: "Ver leilões", to: "/patios/leiloes" },
    },
    revenue: {
      title: "Arrecadação de leilão",
      value: formatMoney(summary.auctionRevenue.currentMonthTotal),
      caption: `Total acumulado: ${formatMoney(summary.auctionRevenue.grandTotal)}`,
      body: {
        kind: "breakdown",
        parts: sortByBeneficiaryTotal(summary.auctionRevenue.byBeneficiary).map((row) => ({ label: getBeneficiaryLabel(row.beneficiaryKind), value: formatMoney(row.totalAmount) })),
      },
      cta: { label: "Ver leilões", to: "/patios/leiloes" },
    },
  };
}
