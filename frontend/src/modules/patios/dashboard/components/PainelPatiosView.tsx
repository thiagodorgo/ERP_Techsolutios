import { AlertTriangle, Clock, FileStack, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import type { KpiDetail } from "../../../../components/kpi";
import { PageHeader } from "../../../../components/patterns";
import { EmptyState, ErrorState, Skeleton } from "../../../../components/ui";
import {
  ORDERED_PHASE_BUCKETS,
  formatDateTime,
  formatMoney,
  getBeneficiaryLabel,
  getPhaseBucketLabel,
  occupancyRate,
  sortByBeneficiaryTotal,
  totalOccupiedSpots,
  totalSpots,
} from "../dashboard.adapter";
import type { PatiosDashboardSummary } from "../dashboard.types";
import { ACTION_HIT_AREA, formatClock, formatShare, occupancyBand, shareOf } from "../dashboard.view-model";
import { ArrecadacaoCard } from "./ArrecadacaoCard";
import { OcupacaoPorPatioCard } from "./OcupacaoPorPatioCard";
import { PainelKpiBand } from "./PainelKpiBand";
import type { PainelKpiKey } from "./PainelKpiBand";
import { PrazosCard } from "./PrazosCard";
import { ProcessosPorFaseCard } from "./ProcessosPorFaseCard";

// Ω5P PR-20 — presentational view do painel gerencial dos Pátios, extraída de PainelPatiosPage para ser
// testável por props (mesmo padrão de GuiaDebitos: hook fica na page, os 5 estados obrigatórios (§7) viram
// props diretas aqui). A UI NÃO soma nada: cada card/gráfico/tabela exibe exatamente o agregado que o backend
// já calculou (I1 ocupação, I6 notificações, I7 arrecadação). D-007: sem dado → vazio honesto, nunca fabricado
// — nenhum gráfico é desenhado sobre série inexistente.
//
// Repaginação (demonstração ao investidor): a tela passou a usar o padrão transversal .pat-* (PageHeader +
// KpiStatCard + .pat-table/.pat-card), os mesmos já usados no cadastro de Pátios, e ganhou três gráficos em
// SVG inline SEM nenhuma dependência nova (PD-004): barra empilhada de ocupação por pátio, rosca de processos
// por fase e barras de participação na arrecadação. Tudo clicável leva a uma rota REAL ou ao pop-up de
// detalhamento — nenhuma rota foi inventada.

export type PainelPatiosViewProps = {
  summary: PatiosDashboardSummary | null;
  loading: boolean;
  error: string | null;
  denied: boolean;
  stale: boolean;
  updatedAt: Date | null;
  onReload: () => void;
};

const PAGE_TITLE = "Painel gerencial";
const PAGE_SUBTITLE =
  "Ocupação, processos por fase, fila de liberação, prazos e arrecadação de leilão — visão consolidada dos pátios de recolhimento.";
const ERROR_TITLE = "Não foi possível carregar o painel";

const pageStyle: CSSProperties = { color: "#0F172A" };
// Mesmas colunas da faixa real (PainelKpiBand) — se divergirem, a tela "pula" quando o resumo chega.
const skeletonBandStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  marginBottom: 14,
};
const bannerTextStyle: CSSProperties = { fontWeight: 600 };
// Cada cartão da linha fica com a ALTURA DO SEU CONTEÚDO. Esticar (padrão da grade) transformaria um vazio
// honesto — por exemplo, arrecadação ainda sem liquidação — num painel branco gigante ao lado de uma tabela cheia.
const chartsRowStyle: CSSProperties = { alignItems: "start" };
const updatedAtStyle: CSSProperties = { marginRight: 2 };

export function PainelPatiosView({ summary, loading, error, denied, stale, updatedAt, onReload }: PainelPatiosViewProps) {
  const now = new Date();

  const rate = summary ? occupancyRate(summary.occupancy) : null;
  const occupied = summary ? totalOccupiedSpots(summary.occupancy) : 0;
  const spots = summary ? totalSpots(summary.occupancy) : 0;

  const kpiDetails = useMemo(() => (summary ? buildKpiDetails(summary, rate, occupied, spots) : null), [summary, rate, occupied, spots]);

  if (denied) {
    return (
      <div style={pageStyle}>
        <PageHeader kicker="PÁTIOS" title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
        <ErrorState
          title="Acesso não permitido"
          detail="Seu perfil não possui permissão para visualizar o painel gerencial dos pátios."
        />
      </div>
    );
  }

  const errorDetail =
    error && !error.trim().toLowerCase().startsWith(ERROR_TITLE.toLowerCase())
      ? error
      : "Verifique a conexão e tente novamente em instantes.";
  const clock = formatClock(updatedAt);

  return (
    <div style={pageStyle}>
      <PageHeader
        kicker="PÁTIOS"
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        actions={
          <>
            {clock ? (
              <span className="pat-table__count" style={updatedAtStyle}>
                {`Atualizado às ${clock}`}
              </span>
            ) : null}
            <button type="button" className="pat-btn" onClick={() => onReload()} aria-label="Atualizar os indicadores do painel">
              <RefreshCw size={15} aria-hidden="true" /> Atualizar
            </button>
            <Link to="/patios/processos" className="pat-btn pat-btn--primary" style={{ textDecoration: "none" }}>
              <FileStack size={15} aria-hidden="true" /> Ver processos
            </Link>
          </>
        }
      />

      {error ? (
        <div role="alert" className="pat-banner pat-banner--error">
          <AlertTriangle size={14} aria-hidden="true" />
          <strong>{ERROR_TITLE}</strong>
          <span style={bannerTextStyle}>{errorDetail}</span>
          <button type="button" className="pat-link" onClick={() => onReload()} style={ACTION_HIT_AREA}>
            <RefreshCw size={12} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Tentar novamente
          </button>
        </div>
      ) : null}

      {stale && !error ? (
        <div role="status" className="pat-banner pat-banner--warning">
          <Clock size={14} aria-hidden="true" />
          <strong>Dados podem estar desatualizados</strong>
          <span style={bannerTextStyle}>
            {`Exibindo os últimos indicadores carregados${
              updatedAt ? ` (atualizados às ${formatDateTime(updatedAt.toISOString())})` : ""
            }. Tentaremos novamente em segundo plano.`}
          </span>
        </div>
      ) : null}

      {loading && !summary ? (
        <>
          <div style={skeletonBandStyle} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="pat-kpi">
                <div className="pat-skel" style={{ width: 30, height: 30, borderRadius: 9 }} />
                <div style={{ marginTop: 12 }}>
                  <Skeleton lines={1} />
                </div>
                <div className="pat-skel" style={{ width: "70%", height: 12, marginTop: 8 }} />
              </div>
            ))}
          </div>
          <div className="pat-dash-charts" aria-hidden="true">
            <div className="pat-card">
              <Skeleton lines={4} />
            </div>
            <div className="pat-card">
              <Skeleton lines={4} />
            </div>
          </div>
        </>
      ) : null}

      {!loading && !summary && !error ? (
        <EmptyState
          title="Sem indicadores para exibir"
          detail="Não há dados suficientes para compor o painel gerencial dos pátios agora."
        />
      ) : null}

      {summary && kpiDetails ? (
        <>
          <PainelKpiBand summary={summary} details={kpiDetails} rate={rate} occupied={occupied} spots={spots} />

          <div className="pat-dash-charts" style={chartsRowStyle}>
            <OcupacaoPorPatioCard occupancy={summary.occupancy} />
            <ProcessosPorFaseCard processesByPhase={summary.processesByPhase} totalProcesses={summary.totalProcesses} />
          </div>

          <div className="pat-dash-charts" style={chartsRowStyle}>
            <PrazosCard alerts={summary.deadlineAlerts} now={now} />
            <ArrecadacaoCard auctionRevenue={summary.auctionRevenue} />
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Corpo do pop-up de cada indicador. A VARIANTE é ditada pelo dado que EXISTE (D-007): há decomposição real
 * (ocupação por pátio, fases, beneficiários) → `breakdown`; snapshot puro → `explain`. Todos apontam para uma
 * rota que existe hoje — nenhuma lista filtrada é prometida antes de existir.
 */
export function buildKpiDetails(
  summary: PatiosDashboardSummary,
  rate: number | null,
  occupied: number,
  spots: number,
): Record<PainelKpiKey, KpiDetail> {
  const beneficiaries = sortByBeneficiaryTotal(summary.auctionRevenue.byBeneficiary);
  const beneficiariesTotal = beneficiaries.reduce((sum, row) => {
    const value = Number(row.totalAmount);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    occupancy: {
      title: "Ocupação",
      value: rate === null ? "—" : `${rate}%`,
      caption: spots > 0 ? `${occupied} de ${spots} vagas ocupadas` : "Sem vagas cadastradas",
      body:
        summary.occupancy.length > 0
          ? {
              kind: "breakdown",
              parts: [...summary.occupancy]
                .map((yard) => {
                  const yardRate = yard.totalSpots > 0 ? Math.round((yard.occupiedSpots / yard.totalSpots) * 100) : null;
                  return {
                    label: yard.yardName,
                    value: yardRate === null ? "—" : `${yardRate}%`,
                    tone: yardRate === null ? ("neutral" as const) : bandTone(yardRate),
                    hint: `${yard.occupiedSpots} de ${yard.totalSpots} vagas · ${yard.freeSpots} livres${
                      yard.blockedSpots > 0 ? ` · ${yard.blockedSpots} bloqueada(s)` : ""
                    }`,
                    rate: yardRate,
                  };
                })
                .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))
                .map(({ label, value, tone, hint }) => ({ label, value, tone, hint })),
            }
          : {
              kind: "explain",
              text: "Percentual de vagas ocupadas sobre o total de vagas cadastradas em todos os pátios da organização.",
            },
      cta: { label: "Ver pátios", to: "/patios/patios" },
    },
    processes: {
      title: "Processos ativos",
      value: summary.totalProcesses.toLocaleString("pt-BR"),
      caption: "Distribuição pelas cinco fases do rito",
      body: {
        kind: "breakdown",
        parts: ORDERED_PHASE_BUCKETS.map((bucket) => ({
          label: getPhaseBucketLabel(bucket),
          value: summary.processesByPhase[bucket].toLocaleString("pt-BR"),
          hint: `${formatShare(shareOf(summary.processesByPhase[bucket], summary.totalProcesses))} do total`,
        })),
      },
      cta: { label: "Ver processos", to: "/patios/processos" },
    },
    releaseQueue: {
      title: "Fila de liberação",
      value: summary.releaseQueueDepth.toLocaleString("pt-BR"),
      body: {
        kind: "explain",
        text: "Processos com uma liberação (restituição ou saída para reparo) em andamento neste momento.",
      },
      cta: { label: "Ver liberações", to: "/patios/liberacoes" },
    },
    // Dois números distintos convivem nesta tela e a diferença precisa ficar explícita, senão o painel parece
    // contraditório: o CARD conta notificações JÁ REGISTRADAS como devidas e vencidas (status DUE), enquanto a
    // tabela de prazos lista os prazos do RITO (calculados a partir da entrada) ainda sem emissão nem dispensa —
    // este conjunto é mais amplo e pode ter linhas mesmo com o card em zero.
    overdue: {
      title: "Prazos vencidos",
      value: summary.overdueNotifications.toLocaleString("pt-BR"),
      caption: "Notificações devidas sem emissão registrada",
      body: {
        kind: "breakdown",
        parts: [
          {
            label: "Notificações devidas e vencidas",
            value: summary.overdueNotifications.toLocaleString("pt-BR"),
            hint: "já registradas pelo sistema, ainda sem emissão",
            tone: summary.overdueNotifications > 0 ? ("danger" as const) : ("success" as const),
          },
          {
            label: "Prazos do rito a tratar",
            value: summary.deadlineAlerts.length.toLocaleString("pt-BR"),
            hint: "vencidos, sem emissão nem dispensa registrada",
            tone: summary.deadlineAlerts.length > 0 ? ("warning" as const) : ("success" as const),
          },
        ],
      },
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
      body:
        beneficiaries.length > 0
          ? {
              kind: "breakdown",
              parts: beneficiaries.map((row) => ({
                label: getBeneficiaryLabel(row.beneficiaryKind),
                value: formatMoney(row.totalAmount),
                hint: `${formatShare(shareOf(Number(row.totalAmount), beneficiariesTotal))} do distribuído`,
                tone: "pending" as const,
              })),
            }
          : {
              kind: "explain",
              text: "Nenhuma liquidação de leilão foi registrada ainda — a arrecadação aparece aqui assim que o primeiro resultado for distribuído.",
            },
      cta: { label: "Ver leilões", to: "/patios/leiloes" },
    },
  };
}

/** Tom do pop-up para a faixa de ocupação de um pátio (mesma semântica de cor dos cards e da barra). */
function bandTone(rate: number): "success" | "warning" | "danger" {
  const band = occupancyBand(rate);
  if (band === "lotada") return "danger";
  if (band === "apertada") return "warning";
  return "success";
}
