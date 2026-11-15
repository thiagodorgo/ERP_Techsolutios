import { useId, type KeyboardEvent } from "react";

// B-ASS-10b (T5) — dispersão SVG inline (PD-004), nascida para "Assinatura × custo por organização" da aparência B do
// Cloud Billing (`screen-refs/platform-cloud-billing-3opcoes.reference.html`, `dispersao()`). Genérica: recebe pontos já
// prontos (x, y em número de DESENHO, nunca dinheiro para exibir), o tom de cada ponto (a cor vem da regra do servidor,
// não daqui) e o texto acessível de cada um. Cada ponto é um botão (`role="button"`, Tab, Enter/Espaço, `aria-pressed`).
// Linhas-guia passam pela origem (`y = slope × x`) e pintam as faixas entre elas. O texto do eixo é ESCALA: calculado aqui
// dentro e marcado `data-escala` (Emenda 1 do plano, A8-r2), para nunca ser confundido com valor de negócio. Cada ponto
// leva `data-alvo` com a própria chave (como as linhas do `ProportionBars`), para a tela e o T-UI-1 acharem o bloco.
// Sem ponto desenhável → "Sem dados para comparar.", nunca um gráfico vazio que pareça zero.

export type ScatterTone = "danger" | "warning" | "success" | "neutral" | "muted";

export type ScatterPoint = {
  readonly key: string;
  /** Eixo X (número de desenho). `null` põe o ponto na faixa à esquerda (`nullLaneLabel`), fora da escala. */
  readonly x: number | null;
  /** Eixo Y (número de desenho). */
  readonly y: number;
  readonly tone: ScatterTone;
  /** Texto acessível do ponto, montado pelo chamador com os valores literais. */
  readonly ariaLabel: string;
  /** Rótulo curto opcional desenhado ao lado do ponto (ex.: nome de quem está em alerta). */
  readonly label?: string;
};

export type ScatterGuide = {
  /** Inclinação da reta pela origem: `y = slope × x` (ex.: 1 = custo igual à assinatura; 0,8 = 80 %). */
  readonly slope: number;
  readonly label: string;
  readonly tone?: "danger" | "warning";
};

export type ScatterPlotProps = {
  readonly points: readonly ScatterPoint[];
  readonly guides?: readonly ScatterGuide[];
  readonly pressedKey?: string | null;
  readonly onSelect?: (key: string) => void;
  readonly ariaLabel: string;
  /** Título do eixo X (ex.: "assinatura do mês →"). */
  readonly xLabel?: string;
  /** Título do eixo Y (ex.: "↑ custo"). */
  readonly yLabel?: string;
  /** Rótulo da faixa dos pontos sem x; quebra em duas linhas no primeiro espaço. */
  readonly nullLaneLabel?: string;
  /** Formato do texto de ESCALA dos eixos. O padrão é o curto em reais da referência ("R$ 12,3 mil"). */
  readonly scaleFormat?: (value: number) => string;
  readonly emptyLabel?: string;
};

const WIDTH = 760;
const HEIGHT = 292;
const X_RIGHT = 744;
const Y_BOTTOM = 250;
const Y_TOP = 16;
const LANE_CENTER = 46;
const X_LEFT_WITH_LANE = 132;
const X_LEFT = 64;
const TICKS = 3;

const isDrawable = (point: ScatterPoint) => Number.isFinite(point.y) && (point.x === null || Number.isFinite(point.x));

/** Escala curta em reais, a mesma da referência (`Rk`): abaixo de 10 com centavos; de 1.000 em diante, "mil". */
function compactBRL(value: number): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs < 10) return `${sign}R$ ${abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 1000) return `${sign}R$ ${(abs / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
  return `${sign}R$ ${Math.round(abs)}`;
}

function laneLines(label: string): [string, string | null] {
  const space = label.indexOf(" ");
  return space < 0 ? [label, null] : [label.slice(0, space), label.slice(space + 1)];
}

export function ScatterPlot({ points, guides = [], pressedKey = null, onSelect, ariaLabel, xLabel, yLabel, nullLaneLabel = "sem dado", scaleFormat = compactBRL, emptyLabel = "Sem dados para comparar." }: ScatterPlotProps) {
  const clipId = `ui-scatter-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const drawable = points.filter(isDrawable);
  if (drawable.length === 0) return <div className="ui-scatter ui-scatter--empty">{emptyLabel}</div>;

  const withX = drawable.filter((point) => point.x !== null);
  const withoutX = drawable.filter((point) => point.x === null).sort((a, b) => b.y - a.y);
  const hasLane = withoutX.length > 0;
  const xLeft = hasLane ? X_LEFT_WITH_LANE : X_LEFT;

  // Domínio (geometria): de zero ao maior valor, com folga; nunca zero para não dividir por zero.
  const dataMaxX = Math.max(0, ...withX.map((point) => point.x as number));
  const dataMaxY = Math.max(0, ...drawable.map((point) => point.y));
  const spanX = (dataMaxX || 1) * 1.08;
  const spanY = (dataMaxY || 1) * 1.12;
  const sx = (value: number) => xLeft + (Math.max(0, value) / spanX) * (X_RIGHT - xLeft);
  const sy = (value: number) => Y_BOTTOM - (Math.max(0, value) / spanY) * (Y_BOTTOM - Y_TOP);
  const polygon = (pairs: readonly (readonly [number, number])[]) => pairs.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");

  const ordered = [...guides].filter((guide) => Number.isFinite(guide.slope) && guide.slope > 0).sort((a, b) => a.slope - b.slope);
  const tall = spanY * 4;

  const activate = (key: string) => onSelect?.(key);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>, key: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(key);
    }
  };

  const point = (item: ScatterPoint, cx: number, cy: number) => (
    <g
      key={item.key}
      className={`ui-scatter__point ui-scatter__point--${item.tone}`}
      role="button"
      tabIndex={0}
      aria-pressed={pressedKey === item.key}
      aria-label={item.ariaLabel}
      data-alvo={item.key}
      onClick={() => activate(item.key)}
      onKeyDown={(event) => onKeyDown(event, item.key)}
    >
      <circle className="ui-scatter__hit" cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={12} />
      <circle className="ui-scatter__ring" cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={10.5} />
      <circle className="ui-scatter__dot" cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={7} />
      {item.label ? (
        <text className="ui-scatter__label" x={(cx + 10).toFixed(1)} y={(cy + 3.5).toFixed(1)} fontSize={10} fontWeight={700} pointerEvents="none">
          {item.label}
        </text>
      ) : null}
    </g>
  );

  const [laneTop, laneBottom] = laneLines(nullLaneLabel);
  const ticks = Array.from({ length: TICKS }, (_, index) => index + 1);

  return (
    <figure className="ui-scatter">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="group" aria-label={ariaLabel}>
        <defs>
          <clipPath id={clipId}>
            <rect x={xLeft} y={Y_TOP} width={X_RIGHT - xLeft} height={Y_BOTTOM - Y_TOP} />
          </clipPath>
        </defs>
        {ordered.length > 0 ? (
          <g clipPath={`url(#${clipId})`}>
            <polygon className="ui-scatter__zone ui-scatter__zone--success" points={polygon([[0, 0], [spanX, 0], [spanX, spanX * ordered[0].slope]])} />
            {ordered.map((guide, index) => {
              const next = ordered[index + 1];
              const upper: readonly (readonly [number, number])[] = next ? [[spanX, spanX * next.slope]] : [[spanX, tall], [0, tall]];
              return <polygon key={`zona-${guide.slope}`} className={`ui-scatter__zone ui-scatter__zone--${guide.tone ?? "warning"}`} points={polygon([[0, 0], [spanX, spanX * guide.slope], ...upper])} />;
            })}
            {ordered.map((guide) => (
              <line key={`guia-${guide.slope}`} className={`ui-scatter__guide ui-scatter__guide--${guide.tone ?? "warning"}`} x1={sx(0)} y1={sy(0)} x2={sx(spanX)} y2={sy(spanX * guide.slope).toFixed(1)} />
            ))}
          </g>
        ) : null}
        {hasLane ? (
          <g className="ui-scatter__lane">
            <rect x={LANE_CENTER - 34} y={Y_TOP} width={68} height={Y_BOTTOM - Y_TOP} rx={6} />
            <text x={LANE_CENTER} y={Y_BOTTOM + 14} fontSize={9.5} textAnchor="middle">
              {laneTop}
            </text>
            {laneBottom ? (
              <text x={LANE_CENTER} y={Y_BOTTOM + 25} fontSize={9.5} textAnchor="middle">
                {laneBottom}
              </text>
            ) : null}
          </g>
        ) : null}
        <line className="ui-scatter__axis" x1={xLeft} x2={X_RIGHT} y1={Y_BOTTOM} y2={Y_BOTTOM} />
        <line className="ui-scatter__axis" x1={xLeft} x2={xLeft} y1={Y_TOP} y2={Y_BOTTOM} />
        {ticks.map((step) => {
          const vx = (dataMaxX || 1) * (step / TICKS);
          const vy = (dataMaxY || 1) * (step / TICKS);
          return (
            <g key={`escala-${step}`} className="ui-scatter__scale">
              <text data-escala="x" x={sx(vx).toFixed(1)} y={Y_BOTTOM + 14} fontSize={9.5} textAnchor="middle">
                {scaleFormat(vx)}
              </text>
              <text data-escala="y" x={xLeft - 6} y={(sy(vy) + 3).toFixed(1)} fontSize={9.5} textAnchor="end">
                {scaleFormat(vy)}
              </text>
            </g>
          );
        })}
        {xLabel ? (
          <text className="ui-scatter__title" x={X_RIGHT} y={Y_BOTTOM + 27} fontSize={10} fontWeight={700} textAnchor="end">
            {xLabel}
          </text>
        ) : null}
        {yLabel ? (
          <text className="ui-scatter__title" x={xLeft + 4} y={Y_TOP + 10} fontSize={10} fontWeight={700}>
            {yLabel}
          </text>
        ) : null}
        {ordered.map((guide, index) => {
          const last = index === ordered.length - 1;
          // Posição do rótulo ao longo da reta, dentro da área: a mais alta acima e à esquerda; as outras abaixo e à direita.
          const t = Math.min(spanX, spanY / guide.slope) * (last ? 0.5 : 0.72);
          return (
            <text
              key={`rotulo-${guide.slope}`}
              className={`ui-scatter__guide-label ui-scatter__guide-label--${guide.tone ?? "warning"}`}
              x={(sx(t) + (last ? -8 : 8)).toFixed(1)}
              y={(sy(t * guide.slope) + (last ? -4 : 12)).toFixed(1)}
              fontSize={9.5}
              fontWeight={800}
              textAnchor={last ? "end" : "start"}
            >
              {guide.label}
            </text>
          );
        })}
        {withX.map((item) => point(item, sx(item.x as number), sy(item.y)))}
        {withoutX.map((item, index) => point(item, LANE_CENTER - 18 + (index % 3) * 18, sy(item.y)))}
      </svg>
    </figure>
  );
}
