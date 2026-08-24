import { AlertTriangle, Coins, FileStack, Gauge, Gavel, Unlock } from "lucide-react";
import type { CSSProperties } from "react";

import type { KpiDetail } from "../../../../components/kpi";
import { ClickableKpiCard } from "../../../../components/kpi";
import { KpiStatCard } from "../../../../components/patterns";
import type { KpiStatTag } from "../../../../components/patterns";
import { formatMoney } from "../dashboard.adapter";
import type { PatiosDashboardSummary } from "../dashboard.types";
import {
  CRITICAL_BORDER,
  DANGER_TONE,
  NEUTRAL_TONE,
  PLATFORM_TONE,
  REVENUE_TONE,
  SUCCESS_TONE,
  WARNING_TONE,
  occupancyBand,
  occupancyTone,
  type Tone,
} from "../dashboard.view-model";

// Faixa de indicadores do painel gerencial dos Pátios. Cada card é CLICÁVEL (ClickableKpiCard → pop-up do
// tema, com decomposição real e CTA para a tela cheia) e a COR SIGNIFICA (§11.5):
//   ocupação  → verde folgado / âmbar apertado / vermelho lotado (mesma faixa da lista de Pátios)
//   processos → azul plataforma        · lotes    → azul plataforma
//   vencidos  → vermelho SÓ quando > 0 · fila     → âmbar SÓ quando há fila
//   receita   → roxo
// Zero nunca é pintado de vermelho: sem ocorrência, o tom é neutro com selo verde "em dia" — é isso que faz a
// cor carregar informação em vez de decorar.
export type PainelKpiKey = "occupancy" | "processes" | "releaseQueue" | "overdue" | "lots" | "revenue";

export type PainelKpiBandProps = {
  readonly summary: PatiosDashboardSummary;
  readonly details: Record<PainelKpiKey, KpiDetail>;
  readonly rate: number | null;
  readonly occupied: number;
  readonly spots: number;
};

// Reusa a grade de faixa de KPI do design system (.work-orders-kpis); as colunas vêm daqui para caberem os
// 6 indicadores desta tela sem quebrar em telas estreitas.
const bandStyle: CSSProperties = {
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  marginBottom: 14,
};

// O invólucro clicável é o item da grade; `display:flex` faz o card interno esticar até a altura da linha,
// para que uma dica de duas linhas não deixe um card mais alto que o vizinho (borda desalinhada).
const cardStyle: CSSProperties = { display: "flex" };

// Dinheiro é o único indicador que pode passar de dez caracteres ("R$ 128.450,00") e o valor do card é 27px
// fixo do design system: numa coluna estreita ele VAZAVA para fora da borda. A coluna dupla resolve sem
// encolher fonte nem abreviar o número — e, num painel de investidor, a arrecadação merece mesmo o destaque.
const wideCardStyle: CSSProperties = { ...cardStyle, gridColumn: "span 2" };

function tag(label: string, tone: Tone): KpiStatTag {
  return { label, bg: tone.tag, fg: tone.fg };
}

export function PainelKpiBand({ summary, details, rate, occupied, spots }: PainelKpiBandProps) {
  const occupancyToneValue = rate === null ? NEUTRAL_TONE : occupancyTone(rate);
  const occupancyBandValue = rate === null ? null : occupancyBand(rate);

  const overdue = summary.overdueNotifications;
  const overdueTone = overdue > 0 ? DANGER_TONE : NEUTRAL_TONE;
  // Dois conjuntos DIFERENTES: o valor do card conta notificações já REGISTRADAS como devidas e vencidas; a
  // tabela "Próximos prazos a tratar" lista os prazos do RITO ainda sem emissão nem dispensa. Quando o primeiro
  // é zero mas o segundo não, o selo NÃO pode dizer "em dia" — seria uma tranquilidade falsa. Ele passa a
  // apontar o volume a tratar, que é exatamente o que a tabela logo abaixo mostra.
  const riteBacklog = summary.deadlineAlerts.length;

  const queue = summary.releaseQueueDepth;
  const queueTone = queue > 0 ? WARNING_TONE : NEUTRAL_TONE;

  const lots = summary.openLots;
  const lotsTone = lots > 0 ? PLATFORM_TONE : NEUTRAL_TONE;

  const custody = summary.processesByPhase.CUSTODY;
  const beneficiaries = summary.auctionRevenue.byBeneficiary.length;

  return (
    <div className="work-orders-kpis" style={bandStyle} aria-live="polite">
      <ClickableKpiCard detail={details.occupancy} style={cardStyle}>
        <KpiStatCard
          icon={Gauge}
          iconColor={occupancyToneValue.fg}
          iconBg={occupancyToneValue.tile}
          value={rate === null ? "—" : `${rate}%`}
          label="Ocupação"
          hint={spots > 0 ? `${occupied} de ${spots} vagas` : "Sem vagas cadastradas"}
          tag={occupancyBandValue === null ? tag("sem vagas", NEUTRAL_TONE) : tag(occupancyBandValue, occupancyToneValue)}
          border={occupancyBandValue === "lotada" ? CRITICAL_BORDER : undefined}
        />
      </ClickableKpiCard>

      <ClickableKpiCard detail={details.processes} style={cardStyle}>
        <KpiStatCard
          icon={FileStack}
          iconColor={PLATFORM_TONE.fg}
          iconBg={PLATFORM_TONE.tile}
          value={summary.totalProcesses.toLocaleString("pt-BR")}
          label="Processos ativos"
          hint="no rito de custódia"
          tag={tag(`${custody.toLocaleString("pt-BR")} em custódia`, PLATFORM_TONE)}
        />
      </ClickableKpiCard>

      <ClickableKpiCard detail={details.releaseQueue} style={cardStyle}>
        <KpiStatCard
          icon={Unlock}
          iconColor={queueTone.fg}
          iconBg={queueTone.tile}
          value={queue.toLocaleString("pt-BR")}
          label="Fila de liberação"
          hint="aguardando restituição"
          tag={queue > 0 ? tag("na fila", WARNING_TONE) : tag("sem fila", SUCCESS_TONE)}
        />
      </ClickableKpiCard>

      <ClickableKpiCard detail={details.overdue} style={cardStyle}>
        <KpiStatCard
          icon={AlertTriangle}
          iconColor={overdueTone.fg}
          iconBg={overdueTone.tile}
          value={overdue.toLocaleString("pt-BR")}
          label="Prazos vencidos"
          hint="devidas sem emissão registrada"
          tag={
            overdue > 0
              ? tag("agir agora", DANGER_TONE)
              : riteBacklog > 0
                ? tag(`${riteBacklog.toLocaleString("pt-BR")} a tratar`, WARNING_TONE)
                : tag("em dia", SUCCESS_TONE)
          }
          border={overdue > 0 ? CRITICAL_BORDER : undefined}
        />
      </ClickableKpiCard>

      <ClickableKpiCard detail={details.lots} style={cardStyle}>
        <KpiStatCard
          icon={Gavel}
          iconColor={lotsTone.fg}
          iconBg={lotsTone.tile}
          value={lots.toLocaleString("pt-BR")}
          label="Lotes abertos"
          hint="aguardando o certame"
          tag={lots > 0 ? tag("em leilão", PLATFORM_TONE) : tag("nenhum", NEUTRAL_TONE)}
        />
      </ClickableKpiCard>

      <ClickableKpiCard detail={details.revenue} style={wideCardStyle}>
        <KpiStatCard
          icon={Coins}
          iconColor={REVENUE_TONE.fg}
          iconBg={REVENUE_TONE.tile}
          value={formatMoney(summary.auctionRevenue.currentMonthTotal)}
          label="Arrecadação do mês"
          hint={`Total acumulado: ${formatMoney(summary.auctionRevenue.grandTotal)}`}
          tag={
            beneficiaries > 0
              ? tag(`${beneficiaries} ${beneficiaries === 1 ? "beneficiário" : "beneficiários"}`, REVENUE_TONE)
              : tag("sem liquidação", NEUTRAL_TONE)
          }
        />
      </ClickableKpiCard>
    </div>
  );
}
