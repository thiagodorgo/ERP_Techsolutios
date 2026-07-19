import type { CSSProperties } from "react";

// WS-UI-CARDS+CHARTS (PD-004) — gráfico temporal SVG inline, ZERO dependência. Escala linear num viewBox
// unitless (0 0 100 40) + vectorEffect="non-scaling-stroke" → responsivo por width:100% sem ResizeObserver
// nem cálculo de pixel. Cor via tokens do DS. Tooltip nativo via <title>. NÃO fabrica dado: série vazia →
// estado honesto. Só renderiza o que recebe (o front nunca soma — D-007).

export type ChartTone = "accent" | "primary" | "success" | "warning" | "danger" | "info" | "pending" | "neutral";

const TONE_VAR: Record<ChartTone, string> = {
  accent: "var(--color-core-accent)",
  primary: "var(--color-core-primary)",
  success: "var(--color-status-success)",
  warning: "var(--color-status-warning)",
  danger: "var(--color-status-danger)",
  info: "var(--color-status-info)",
  pending: "var(--color-status-pending)",
  neutral: "var(--color-neutral-300)",
};

export type TrendSeries = {
  readonly id: string;
  readonly label: string;
  readonly values: readonly number[];
  readonly tone?: ChartTone;
  readonly color?: string;
};

export type TrendChartProps = {
  /** Série única (atalho). Use `series` para multi-série (ex.: entradas × saídas). */
  readonly data?: readonly number[];
  readonly series?: readonly TrendSeries[];
  /** Rótulos do eixo X (ex.: meses) — usados no tooltip e no texto de acessibilidade. */
  readonly labels?: readonly string[];
  readonly type?: "line" | "area" | "bar";
  readonly tone?: ChartTone;
  readonly color?: string;
  readonly height?: number;
  readonly showTooltip?: boolean;
  readonly showLegend?: boolean;
  /** Ancorar a base no zero (default para barras). */
  readonly includeZero?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly emptyLabel?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
};

const VBW = 100;
const VBH = 40;
const PAD = 3;

function normalizeSeries(props: TrendChartProps): TrendSeries[] {
  if (props.series && props.series.length > 0) return [...props.series];
  if (props.data && props.data.length > 0) {
    return [{ id: "s0", label: props.ariaLabel ?? "série", values: props.data, tone: props.tone, color: props.color }];
  }
  return [];
}

function seriesColor(series: TrendSeries, fallbackTone: ChartTone): string {
  return series.color ?? TONE_VAR[series.tone ?? fallbackTone];
}

export function TrendChart(props: TrendChartProps) {
  const {
    type = "line",
    tone = "accent",
    height = 56,
    showTooltip = true,
    includeZero = type === "bar",
    valueFormat = (v) => String(v),
    labels,
    emptyLabel = "Sem dados no período.",
    className,
  } = props;

  const series = normalizeSeries(props);
  const showLegend = props.showLegend ?? series.length > 1;
  const n = Math.max(0, ...series.map((s) => s.values.length));

  if (series.length === 0 || n === 0) {
    return (
      <div
        className={`ui-trendchart ui-trendchart--empty ${className ?? ""}`}
        style={{ height, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: "var(--text-secondary, #94A3B8)" }}
      >
        {emptyLabel}
      </div>
    );
  }

  const all = series.flatMap((s) => [...s.values]);
  const lo = includeZero ? Math.min(0, ...all) : Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1; // guarda: valores iguais / tudo-zero → linha reta, sem divisão por zero

  const x = (i: number): number => (n === 1 ? VBW / 2 : (i / (n - 1)) * VBW);
  const y = (v: number): number => VBH - PAD - ((v - lo) / span) * (VBH - 2 * PAD);

  const ariaLabel = props.ariaLabel ?? buildAriaLabel(series, labels, valueFormat);
  const legendStyle: CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6, justifyContent: "center" };

  return (
    <figure className={`ui-trendchart ui-trendchart--${type} ${className ?? ""}`} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        style={{ display: "block", overflow: "visible" }}
      >
        {type === "bar"
          ? renderBars(series, n, x, y, includeZero ? y(0) : y(lo), tone, showTooltip, valueFormat, labels)
          : series.map((s) => renderPath(s, type, x, y, tone, showTooltip, valueFormat, labels))}
      </svg>

      {showLegend ? (
        <figcaption style={legendStyle}>
          {series.map((s) => (
            <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: seriesColor(s, tone), display: "inline-block" }} />
              {s.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderPath(
  s: TrendSeries,
  type: "line" | "area",
  x: (i: number) => number,
  y: (v: number) => number,
  fallbackTone: ChartTone,
  showTooltip: boolean,
  valueFormat: (v: number) => string,
  labels: readonly string[] | undefined,
) {
  const color = seriesColor(s, fallbackTone);
  const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${x(s.values.length - 1)},${VBH - PAD} L ${x(0)},${VBH - PAD} Z`;

  return (
    <g key={s.id}>
      {type === "area" ? <path d={area} fill={color} fillOpacity={0.14} stroke="none" /> : null}
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      {showTooltip
        ? s.values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={1.6} fill={color} vectorEffect="non-scaling-stroke">
              <title>{`${labels?.[i] ? `${labels[i]} · ` : ""}${s.label}: ${valueFormat(v)}`}</title>
            </circle>
          ))
        : null}
    </g>
  );
}

function renderBars(
  series: readonly TrendSeries[],
  n: number,
  x: (i: number) => number,
  y: (v: number) => number,
  base: number,
  fallbackTone: ChartTone,
  showTooltip: boolean,
  valueFormat: (v: number) => string,
  labels: readonly string[] | undefined,
) {
  const band = VBW / n;
  const seriesCount = series.length;
  const bw = (band * 0.72) / seriesCount;
  const gap = band * 0.14;

  return series.flatMap((s, si) =>
    s.values.map((v, i) => {
      const bx = i * band + gap + si * bw;
      const top = y(v);
      // Suporta valores NEGATIVOS: a barra vai da base ao valor em qualquer direção (rect entre min/max).
      const ry = Math.min(top, base);
      const h = Math.abs(base - top);
      return (
        <rect key={`${s.id}-${i}`} x={bx} y={ry} width={bw} height={h} rx={0.8} fill={seriesColor(s, fallbackTone)}>
          {showTooltip ? <title>{`${labels?.[i] ? `${labels[i]} · ` : ""}${s.label}: ${valueFormat(v)}`}</title> : null}
        </rect>
      );
    }),
  );
}

function buildAriaLabel(series: readonly TrendSeries[], labels: readonly string[] | undefined, valueFormat: (v: number) => string): string {
  const parts = series.map((s) => {
    const first = s.values[0];
    const last = s.values[s.values.length - 1];
    const dir = last > first ? "em alta" : last < first ? "em queda" : "estável";
    return `${s.label}: ${dir}, de ${valueFormat(first)} a ${valueFormat(last)}`;
  });
  const range = labels && labels.length > 0 ? ` (${labels[0]} a ${labels[labels.length - 1]})` : "";
  return `Gráfico de tendência${range}. ${parts.join("; ")}.`;
}
