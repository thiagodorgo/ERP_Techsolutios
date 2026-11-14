import { CategoryDonut, ColumnBars, ScatterPlot, Sparkline, type CategoryDonutSegment, type ColumnBarsItem, type ColumnBarTone, type ScatterGuide, type ScatterPoint, type ScatterTone } from "../../../../components/charts";
import { ALERT_LABEL, alertLabelOf, monthName } from "../cloud-billing.labels";
import { formatBRL, formatCount, formatRate, geometryNumber, marginBandOf, type Geometry, type MarginBand } from "../cloud-billing.money";
import type { CloudBillingView, SeriesPoint } from "../cloud-billing.state";
import type { AlertKind } from "../cloud-billing.types";
import { buildKpis, Card, ChartLegend, CloudBillingBanners, CloudBillingHeader, CostShareBars, KpiBlock, ListPanel, plain, SixMonthsChart, type CloudBillingViewProps, type KpiKey, type KpiModel } from "./cloudBilling.shared";

// B-ASS-10b (T5, F5) — aparência B · Analítica (referência `screen-refs/platform-cloud-billing-3opcoes.reference.html`,
// `renderB`): ver de relance quem dá prejuízo e quem está perto. 4 indicadores grandes com a tendência de 6 meses, 4
// pequenos, a dispersão assinatura × custo com as linhas de 80 % e 100 %, a rosca da situação, a margem por faixa, os 6
// meses em barras, "Para onde vai o custo" e a lista (com a coluna Grupo e a barra do %). Só composição sobre o MESMO
// `CloudBillingView` (T-UI-1 (a)); todo valor exibido é o literal formatado de um campo do servidor, e a proporção, o
// eixo e a escala nascem nos componentes da biblioteca (L8; a tela passa só geometria).

const BIG: readonly KpiKey[] = ["sub", "custo", "margem", "alerta"];
const SMALL: readonly KpiKey[] = ["plat", "nr", "res", "semass"];

// ---- tendência dos 4 indicadores grandes (§6.3: mês sem custo válido fica sem ponto) --------------------------------
// A geometria fica marcada (`Geometry`) até entrar no componente da biblioteca; a de "em alerta" é contagem de linhas.
type Trend = { readonly values: readonly Geometry[] | readonly number[]; readonly tone: "accent" | "danger" | "success" };

function geometryTrend(series: readonly SeriesPoint[], pick: (point: SeriesPoint) => Geometry | null): readonly Geometry[] {
  return series.flatMap((point) => {
    const value = point.state === "ok" ? pick(point) : null;
    return value === null ? [] : [value];
  });
}

function countTrend(series: readonly SeriesPoint[]): readonly number[] {
  return series.flatMap((point) => (point.state === "ok" && point.alertCount !== null ? [point.alertCount] : []));
}

function trends(model: CloudBillingView): Readonly<Record<string, Trend>> {
  return {
    sub: { values: geometryTrend(model.series, (point) => geometryNumber(point.subscription)), tone: "accent" },
    custo: { values: geometryTrend(model.series, (point) => geometryNumber(point.cost)), tone: "danger" },
    margem: { values: geometryTrend(model.series, (point) => geometryNumber(point.margin)), tone: "success" },
    alerta: { values: countTrend(model.series), tone: "danger" },
  };
}

function TrendFooter({ trend }: { readonly trend: Trend | undefined }) {
  // Com menos de 2 meses não há tendência: o espaço fica, vazio (nada é inventado).
  if (!trend || trend.values.length < 2) return <div className="cb-spark" aria-hidden="true" />;
  return (
    <div className="cb-spark" aria-hidden="true">
      <Sparkline data={trend.values} tone={trend.tone} height={30} ariaLabel="tendência dos últimos 6 meses" />
    </div>
  );
}

// ---- indicador pequeno (o `mini-kpi` da referência), que filtra a lista ----------------------------------------------
function MiniKpi({ kpi, pressed, onTarget }: { readonly kpi: KpiModel; readonly pressed: boolean; readonly onTarget: (key: string) => void }) {
  const Icon = kpi.icon;
  return (
    <div className="cb-alvo" data-alvo={kpi.alvo}>
      <button type="button" className="cb-mini" aria-pressed={pressed} aria-label={`${kpi.label}: ${plain(kpi.value)} — filtrar a lista`} onClick={() => onTarget(kpi.alvo)}>
        <span className="pat-kpi__tile cb-mini__tile" style={{ background: kpi.iconBg, color: kpi.iconColor }} aria-hidden="true">
          <Icon size={14} />
        </span>
        <span className="cb-mini__text">
          {kpi.label}
          <small>{kpi.hint}</small>
        </span>
        <b className="cb-mini__value">{kpi.value}</b>
      </button>
    </div>
  );
}

// ---- dispersão assinatura × custo -----------------------------------------------------------------------------------
const SCATTER_TONE: Readonly<Record<AlertKind, ScatterTone>> = { critical: "danger", warning: "warning", none: "success", no_subscription: "neutral", cost_missing: "muted", unknown: "muted" };
/** As linhas-guia da regra do servidor (80 % e 100 % da assinatura), como mapa: o censo de literais do console não aceita
 * lista de objetos no topo do módulo (`scripts/san3-06b-literais-de-plataforma.mjs`, T33). */
const GUIDE: Readonly<Record<"limite" | "atencao", ScatterGuide>> = {
  limite: { slope: 1, label: "custo = assinatura", tone: "danger" },
  atencao: { slope: 0.8, label: "custo = 80 %", tone: "warning" },
};

function scatterPoints(model: CloudBillingView): ScatterPoint[] {
  return model.lines.flatMap((line) => {
    const y = geometryNumber(line.allocatedCost);
    if (y === null) return [];
    const inAlert = line.alert === "critical" || line.alert === "warning";
    return [
      {
        key: `org:${line.tenantId}`,
        x: geometryNumber(line.subscriptionAmount),
        y,
        tone: SCATTER_TONE[line.alert],
        ariaLabel: `${line.tenantName}: assinatura ${plain(formatBRL(line.subscriptionAmount))}, custo ${plain(formatBRL(line.allocatedCost))}, ${alertLabelOf(line)}`,
        label: inAlert ? line.tenantName.split(" ").slice(0, 2).join(" ") : undefined,
      },
    ];
  });
}

function ScatterCard({ model, onTarget }: Pick<CloudBillingViewProps, "model" | "onTarget">) {
  return (
    <Card
      className="cb-card--wide"
      title="Assinatura × custo por organização"
      hint="acima da linha vermelha, o custo passou da assinatura; entre as linhas, passou de 80 % · clique no ponto"
      legend={
        <ChartLegend
          items={[
            { label: "Crítico", color: "#dc2626" },
            { label: "Atenção", color: "#f59e0b" },
            { label: "Normal", color: "#10b981" },
            { label: "Sem assinatura", color: "#94a3b8" },
          ]}
        />
      }
    >
      {model.costValid ? (
        <ScatterPlot
          points={scatterPoints(model)}
          guides={[GUIDE.limite, GUIDE.atencao]}
          pressedKey={model.ui.alvo}
          onSelect={onTarget}
          ariaLabel="Assinatura e custo de cada organização"
          xLabel="assinatura do mês →"
          yLabel="↑ custo"
          nullLaneLabel="sem assinatura"
        />
      ) : (
        <div className="pat-table__empty">
          <div className="pat-table__empty-title">Sem custo no mês</div>
          <div className="pat-table__empty-detail">A dispersão volta quando o mês tiver custo em reais.</div>
        </div>
      )}
    </Card>
  );
}

// ---- situação (rosca) e margem por faixa ----------------------------------------------------------------------------
const SITUATION_ORDER: readonly AlertKind[] = ["critical", "warning", "none", "no_subscription", "cost_missing", "unknown"];
const SITUATION: Readonly<Record<AlertKind, { readonly label: string; readonly color: string }>> = {
  critical: { label: "Crítico", color: "#dc2626" },
  warning: { label: "Atenção", color: "#f59e0b" },
  none: { label: "Normal", color: "#10b981" },
  no_subscription: { label: "Sem assinatura própria", color: "#94a3b8" },
  cost_missing: { label: "Sem custo", color: "#cbd5e1" },
  unknown: { label: ALERT_LABEL.unknown, color: "#cbd5e1" },
};

function situationSegments(model: CloudBillingView): CategoryDonutSegment[] {
  const counts = model.counts;
  const countOf: Readonly<Record<AlertKind, number>> = {
    critical: counts.criticalCount,
    warning: counts.warningCount,
    none: counts.normalCount,
    no_subscription: counts.noSubscriptionCount,
    cost_missing: counts.costMissingCount,
    unknown: counts.unknownCount,
  };
  // As 4 primeiras sempre; "sem custo" quando há ou quando o mês não tem custo (a maquete); a não reconhecida só se houver.
  const shown = (key: AlertKind) => (key === "cost_missing" ? countOf.cost_missing > 0 || !model.costValid : key === "unknown" ? countOf.unknown > 0 : true);
  return SITUATION_ORDER.filter(shown).map((key) => ({ key: `alert:${key}`, label: SITUATION[key].label, count: countOf[key], color: SITUATION[key].color }));
}

const BAND_ORDER: readonly MarginBand[] = ["neg", "0", "20", "50"];
const BAND: Readonly<Record<MarginBand, { readonly label: string; readonly tone: ColumnBarTone }>> = {
  neg: { label: "Negativa", tone: "age-critical" },
  "0": { label: "0 a 20 %", tone: "age-old" },
  "20": { label: "20 a 50 %", tone: "inflow" },
  "50": { label: "Acima de 50 %", tone: "inflow" },
};

function bandItems(model: CloudBillingView): ColumnBarsItem[] {
  return BAND_ORDER.map((key) => {
    const band = { key, ...BAND[key] };
    const count = model.lines.filter((line) => marginBandOf(line.marginPct) === band.key).length;
    const value = model.costValid ? count : null;
    return {
      key: `faixa:${band.key}`,
      label: band.label,
      ariaLabel: model.costValid ? `${band.label}: ${formatCount(count)} ${count === 1 ? "organização" : "organizações"} — filtrar a lista` : `${band.label}: sem custo no mês`,
      value,
      bars: [{ tone: band.tone, value }],
    };
  });
}

function SituationCard({ model, onTarget }: Pick<CloudBillingViewProps, "model" | "onTarget">) {
  return (
    <Card title="Situação das organizações" hint="regra de 80 % e 100 % da assinatura">
      <CategoryDonut
        segments={situationSegments(model)}
        centerValue={model.counts.lineCount}
        centerLabel="organizações"
        ariaLabel={`Situação das ${formatCount(model.counts.lineCount)} organizações`}
        pressedKey={model.ui.alvo}
        onSelect={onTarget}
        segmentAriaLabel={(segment) => `${segment.label}: ${formatCount(segment.count)} — filtrar a lista`}
      />
      <div className="cb-card__head cb-card__head--sub">
        <div>
          <h3 className="cb-card__title">Margem por faixa</h3>
          <div className="cb-card__hint">organizações com assinatura e custo</div>
        </div>
      </div>
      <div className="cb-bands">
        <ColumnBars items={bandItems(model)} ariaLabel="Organizações por faixa de margem" pressedKey={model.ui.alvo} onSelect={onTarget} height={140} barHeight={86} />
      </div>
    </Card>
  );
}

// ---- a aparência ------------------------------------------------------------------------------------------------------
export function CloudBillingViewB(props: CloudBillingViewProps) {
  const { model, access, onTarget, onMonth, onAction, onRetrySeries } = props;
  const kpis = buildKpis(model);
  const trend = trends(model);
  return (
    <div className="cb-view cb-view--b" data-aparencia="B">
      <CloudBillingHeader model={model} access={access} onMonth={onMonth} onAction={onAction} />
      <CloudBillingBanners model={model} access={access} onAction={onAction} />
      <div className="cb-kpis">
        {BIG.map((key) => (
          <KpiBlock key={key} kpi={kpis[key]} pressed={model.ui.alvo === key} onTarget={onTarget} footer={<TrendFooter trend={trend[key]} />} />
        ))}
      </div>
      <div className="cb-mini-grid">
        {SMALL.map((key) => (
          <MiniKpi key={key} kpi={kpis[key]} pressed={model.ui.alvo === key} onTarget={onTarget} />
        ))}
      </div>
      <div className="cb-ana">
        <ScatterCard model={model} onTarget={onTarget} />
        <SituationCard model={model} onTarget={onTarget} />
        <Card
          className="cb-card--wide"
          title="6 meses: assinaturas, custo e margem"
          hint="clique no mês para trocar o mês da tela · a % embaixo é a margem"
          legend={
            <ChartLegend
              items={[
                { label: "Assinaturas", color: "#2563eb" },
                { label: "Custo total", color: "#f87171" },
              ]}
            />
          }
        >
          <SixMonthsChart model={model} mode="bars" onMonth={onMonth} onRetrySeries={onRetrySeries} />
        </Card>
        <Card title="Para onde vai o custo" hint="parcelas do custo total">
          <CostShareBars model={model} onTarget={onTarget} short />
          <div className="cb-fx-note">
            Dólar de {monthName(model.month)}: <b className="pat-mono">{formatRate(model.fx?.rate ?? null, 6)}</b>
            {model.fx ? ` (versão ${model.fx.version})` : ""}
          </div>
        </Card>
      </div>
      <ListPanel {...props} showGroupColumn pctBar />
    </div>
  );
}
