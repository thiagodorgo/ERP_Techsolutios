import type { KeyboardEvent } from "react";

// B-ASS-10b (T5) — série de meses CLICÁVEL, SVG inline (PD-004), para a tela de custo e margem da plataforma
// (`screen-refs/platform-cloud-billing-3opcoes.reference.html`): "Assinaturas × custo · 6 meses" (A, `lines`), "6 meses:
// assinaturas, custo e margem" (B, `bars`) e "Margem mês a mês" (C, `margin`). A tela passa só GEOMETRIA (`a`, `b`: o
// número de desenho) e os textos já formatados (`label`, `sublabel`, `topLabel`); a proporção e o EIXO (os valores de
// escala em R$) nascem aqui dentro (L8 do plano), e cada `<text>` de escala leva `data-escala` (Emenda 1, A8-r2) para a
// cláusula (c) do T-UI-1 separá-lo dos valores do servidor. Nenhum mês é retirado: todo mês tem o seu botão; o mês sem o
// segundo valor desenha o tracejado; o mês que falhou ou não tem dado não desenha barra e diz isso no texto acessível.

export type MonthSeriesState = "ok" | "loading" | "error" | "empty";

export type MonthSeriesPoint = {
  /** O mês (`AAAA-MM`) — também a chave de `onSelect`. */
  readonly key: string;
  /** "out/26". */
  readonly label: string;
  /** Texto embaixo do mês (a margem em %, já formatada; "—" sem valor). */
  readonly sublabel: string;
  readonly sublabelTone?: "positive" | "negative" | "muted";
  /** Geometria da 1ª série (assinaturas; na `margin`, a margem). `null` = sem valor; na `margin`, `null` num mês `ok`
   *  é o mês com assinaturas e sem custo: a coluna vira o tracejado (o mês sem nada vem como `empty`). */
  readonly a: number | null;
  /** Geometria da 2ª série (custo). `null` com `a` presente = tracejado. */
  readonly b: number | null;
  /** Só na `margin`: o valor em cima da coluna e a linha embaixo dele (já formatados pela tela). */
  readonly topLabel?: string;
  readonly topSubLabel?: string;
  /** Só na `margin`: a coluna sem margem desenha o tracejado do CUSTO ausente. Padrão: `true`. A tela passa `false` quando
   *  a margem falta por outro motivo (há custo e não há assinatura): aí não há custo ausente a tracejar. */
  readonly dashed?: boolean;
  readonly state: MonthSeriesState;
  readonly ariaLabel: string;
};

export type MonthSeriesChartProps = {
  readonly mode: "lines" | "bars" | "margin";
  readonly points: readonly MonthSeriesPoint[];
  readonly pressedKey?: string | null;
  readonly onSelect?: (key: string) => void;
  readonly ariaLabel: string;
  /** Moeda do eixo (o texto de escala é formatado aqui dentro). */
  readonly currency?: string;
};

const W = 760;
const H = 206;
const X0 = 60;
const X1 = 752;
const Y0 = 166;
const Y1 = 14;
const COLOR_A = "#2563eb";
const COLOR_B = "#ef4444";

/** Escala curta da referência (`Rk`, a mesma do `ScatterPlot`): abaixo de 10 com centavos; de 1.000 em diante, "mil". */
function scaleText(value: number, currency: string): string {
  const symbol = currency === "BRL" ? "R$" : currency;
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (abs < 10) return `${sign}${symbol} ${abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 1000) return `${sign}${symbol} ${(abs / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
  return `${sign}${symbol} ${Math.round(abs)}`;
}

function onKey(event: KeyboardEvent<SVGGElement>, select: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    select();
  }
}

export function MonthSeriesChart({ mode, points, pressedKey = null, onSelect, ariaLabel, currency = "BRL" }: MonthSeriesChartProps) {
  if (mode === "margin") return <MarginColumns points={points} pressedKey={pressedKey} onSelect={onSelect} ariaLabel={ariaLabel} />;
  const values = points.flatMap((point) => (point.state === "ok" ? [point.a, point.b].filter((value): value is number => value !== null && Number.isFinite(value)) : []));
  const peak = Math.max(1000, ...values.map((value) => Math.abs(value)));
  const top = peak * 1.1;
  const n = Math.max(1, points.length);
  const cw = (X1 - X0) / n;
  const y = (value: number) => Y0 - (Math.max(0, value) / top) * (Y0 - Y1);
  const cx = (index: number) => X0 + (index + 0.5) * cw;
  const ticks = [0, 1, 2, 3, 4].map((k) => (peak * k) / 4);

  const path = (pick: (point: MonthSeriesPoint) => number | null) => {
    let d = "";
    points.forEach((point, index) => {
      const value = point.state === "ok" ? pick(point) : null;
      if (value === null) return;
      d += `${d ? " L" : "M"}${cx(index).toFixed(1)} ${y(value).toFixed(1)}`;
    });
    return d;
  };

  return (
    <svg className="ui-month-series" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={ariaLabel}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={X0} x2={X1} y1={y(tick)} y2={y(tick)} className="ui-month-series__grid" />
          <text x={X0 - 6} y={y(tick) + 3} className="ui-month-series__scale" textAnchor="end" data-escala="">
            {scaleText(tick, currency)}
          </text>
        </g>
      ))}
      {points.map((point, index) => {
        const pressed = pressedKey === point.key;
        const center = cx(index);
        const missingB = point.state === "ok" && point.a !== null && point.b === null;
        return (
          <g
            key={point.key}
            role="button"
            tabIndex={0}
            aria-pressed={pressed}
            aria-label={point.ariaLabel}
            className={pressed ? "ui-month-series__month ui-month-series__month--pressed" : "ui-month-series__month"}
            data-mes={point.key}
            data-estado={point.state}
            onClick={() => onSelect?.(point.key)}
            onKeyDown={(event) => onKey(event, () => onSelect?.(point.key))}
          >
            <rect className="ui-month-series__hit" x={X0 + index * cw + 3} y={Y1 - 6} width={cw - 6} height={Y0 - Y1 + 34} rx={6} />
            {mode === "bars" && point.state === "ok" && point.a !== null ? <rect x={center - 17} y={y(point.a)} width={15} height={Y0 - y(point.a)} rx={3} fill={COLOR_A} pointerEvents="none" /> : null}
            {mode === "bars" && point.state === "ok" && point.b !== null ? <rect x={center + 2} y={y(point.b)} width={15} height={Y0 - y(point.b)} rx={3} fill="#f87171" pointerEvents="none" /> : null}
            {mode === "bars" && missingB ? <rect x={center + 2} y={Y0 - 30} width={15} height={30} rx={3} className="ui-month-series__dashed" pointerEvents="none" /> : null}
            {mode === "lines" && point.state === "ok" && point.a !== null && point.b !== null ? (
              <rect x={center - 7} y={Math.min(y(point.a), y(point.b))} width={14} height={Math.abs(y(point.a) - y(point.b))} rx={3} fill={point.a >= point.b ? "#bbf7d0" : "#fecaca"} pointerEvents="none" />
            ) : null}
            {mode === "lines" && missingB ? <line x1={center} x2={center} y1={y(point.a ?? 0)} y2={Y0} className="ui-month-series__dashed-line" pointerEvents="none" /> : null}
            <text x={center} y={Y0 + 16} textAnchor="middle" className={pressed ? "ui-month-series__label ui-month-series__label--pressed" : "ui-month-series__label"} pointerEvents="none">
              {point.label}
            </text>
            <text x={center} y={Y0 + 30} textAnchor="middle" className={`ui-month-series__sublabel ui-month-series__sublabel--${point.sublabelTone ?? "positive"}`} pointerEvents="none">
              {point.sublabel}
            </text>
          </g>
        );
      })}
      {mode === "lines" ? (
        <>
          <path d={path((point) => point.a)} fill="none" stroke={COLOR_A} strokeWidth={2.4} pointerEvents="none" />
          <path d={path((point) => point.b)} fill="none" stroke={COLOR_B} strokeWidth={2.4} pointerEvents="none" />
          {points.map((point, index) =>
            point.state === "ok" ? (
              <g key={`p-${point.key}`} pointerEvents="none">
                {point.a !== null ? <circle cx={cx(index)} cy={y(point.a)} r={3.5} fill="#fff" stroke={COLOR_A} strokeWidth={2} /> : null}
                {point.b !== null ? <circle cx={cx(index)} cy={y(point.b)} r={3.5} fill="#fff" stroke={COLOR_B} strokeWidth={2} /> : null}
              </g>
            ) : null,
          )}
        </>
      ) : null}
    </svg>
  );
}

/** "Margem mês a mês" (C): uma coluna por mês, verde ou vermelha, com o valor e o % em cima e "mês · dólar" embaixo. */
function MarginColumns({ points, pressedKey, onSelect, ariaLabel }: { readonly points: readonly MonthSeriesPoint[]; readonly pressedKey: string | null; readonly onSelect?: (key: string) => void; readonly ariaLabel: string }) {
  const peak = Math.max(1, ...points.flatMap((point) => (point.state === "ok" && point.a !== null ? [Math.abs(point.a)] : [])));
  return (
    <div className="ui-month-columns" role="group" aria-label={ariaLabel}>
      {points.map((point) => {
        const negative = point.a !== null && point.a < 0;
        const height = point.state === "ok" && point.a !== null ? Math.max(3, (Math.abs(point.a) / peak) * 64) : 0;
        // §6.5.1: o mês com assinaturas e sem custo continua no gráfico, com o custo tracejado (o mesmo traço do `bars`)
        const missing = point.state === "ok" && point.a === null && (point.dashed ?? true);
        return (
          <button
            key={point.key}
            type="button"
            className={negative ? "ui-month-columns__col ui-month-columns__col--neg" : "ui-month-columns__col"}
            aria-pressed={pressedKey === point.key}
            aria-label={point.ariaLabel}
            data-mes={point.key}
            data-estado={point.state}
            onClick={() => onSelect?.(point.key)}
          >
            <b className={point.a === null ? "ui-month-columns__value ui-month-columns__value--muted" : "ui-month-columns__value"}>{point.topLabel ?? "—"}</b>
            <em>{point.topSubLabel ?? ""}</em>
            {missing ? (
              <svg className="ui-month-columns__missing" width={15} height={30} viewBox="0 0 15 30" aria-hidden="true">
                <rect className="ui-month-series__dashed" x={0.5} y={0.5} width={14} height={29} rx={3} />
              </svg>
            ) : (
              <i style={{ height: `${height}px` }} aria-hidden="true" />
            )}
            <span>{point.label}</span>
          </button>
        );
      })}
    </div>
  );
}
