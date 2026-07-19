import { TrendChart, type ChartTone } from "./TrendChart";

// Sparkline — TrendChart em modo linha compacto (para tendência inline dentro de um card/célula).
// Sem legenda; tooltip opcional. Mesmo motor SVG zero-dep.
export function Sparkline({
  data,
  labels,
  tone = "accent",
  height = 34,
  showTooltip = false,
  valueFormat,
  ariaLabel,
  className,
}: {
  readonly data: readonly number[];
  readonly labels?: readonly string[];
  readonly tone?: ChartTone;
  readonly height?: number;
  readonly showTooltip?: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly ariaLabel?: string;
  readonly className?: string;
}) {
  return (
    <TrendChart
      data={data}
      labels={labels}
      type="area"
      tone={tone}
      height={height}
      showTooltip={showTooltip}
      showLegend={false}
      valueFormat={valueFormat}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
