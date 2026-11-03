// B-APAR-OS — rosca de categorias acionável (SVG inline, PD-004), nascida para a "Prioridade das OS abertas" da aparência
// B de Ordens de Serviço. O `ReconcileDonut` não serve: ele é preso à semântica de conciliação (pendente × conciliado ×
// ressalvas, com a conta "conciliado − ressalvas") e não aceita segmentos genéricos sem mudar o comportamento dele
// (medido em `ReconcileDonut.tsx`, B-APAR-OS). Até 5 categorias; cada segmento da legenda é um botão que filtra
// (`aria-pressed`), o anel é só desenho. Contagem inválida (negativa, não inteira, `null`) → "indisponível", nunca zero.

export type CategoryDonutSegment = {
  readonly key: string;
  readonly label: string;
  readonly count: number | null;
  /** Cor do segmento e da amostra na legenda. */
  readonly color: string;
};

export type CategoryDonutProps = {
  readonly segments: readonly CategoryDonutSegment[];
  /** Número do centro (ex.: total de abertas); `null` mostra "—". */
  readonly centerValue: number | null;
  readonly centerLabel: string;
  readonly ariaLabel: string;
  readonly pressedKey?: string | null;
  readonly onSelect?: (key: string) => void;
  /** Texto acessível do botão de cada categoria; o padrão é "<rótulo>: <n> — filtrar a lista". */
  readonly segmentAriaLabel?: (segment: CategoryDonutSegment) => string;
};

export const CATEGORY_DONUT_MAX_SEGMENTS = 5;
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const valid = (value: number | null): value is number => value !== null && Number.isInteger(value) && value >= 0;

export function CategoryDonut({ segments, centerValue, centerLabel, ariaLabel, pressedKey = null, onSelect, segmentAriaLabel }: CategoryDonutProps) {
  if (segments.length === 0 || segments.length > CATEGORY_DONUT_MAX_SEGMENTS || segments.some((segment) => !valid(segment.count))) {
    return <div className="ui-category-donut ui-category-donut--empty">Contagem indisponível.</div>;
  }
  const total = segments.reduce((sum, segment) => sum + (segment.count as number), 0);
  let offset = 0;
  return (
    <div className="ui-category-donut">
      <svg viewBox="0 0 100 100" width={100} height={100} role="img" aria-label={ariaLabel}>
        <circle className="ui-category-donut__track" cx={50} cy={50} r={RADIUS} fill="none" strokeWidth={14} />
        {segments.map((segment) => {
          const count = segment.count as number;
          if (count === 0 || total === 0) return null;
          const length = (count / total) * CIRCUMFERENCE;
          const arc = (
            <circle
              key={segment.key}
              cx={50}
              cy={50}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={14}
              strokeDasharray={`${length.toFixed(2)} ${(CIRCUMFERENCE - length).toFixed(2)}`}
              strokeDashoffset={(-offset).toFixed(2)}
              transform="rotate(-90 50 50)"
            />
          );
          offset += length;
          return arc;
        })}
        <text x={50} y={49} textAnchor="middle" fontSize={19} fontWeight={800} fill="#0f172a">
          {centerValue ?? "—"}
        </text>
        <text x={50} y={63} textAnchor="middle" fontSize={9.5} fill="#64748b">
          {centerLabel}
        </text>
      </svg>
      <div className="ui-category-donut__legend">
        {segments.map((segment) => (
          <button
            key={segment.key}
            type="button"
            className="ui-category-donut__item"
            aria-pressed={pressedKey === segment.key}
            aria-label={segmentAriaLabel ? segmentAriaLabel(segment) : `${segment.label}: ${segment.count} — filtrar a lista`}
            onClick={() => onSelect?.(segment.key)}
          >
            <span className="ui-category-donut__swatch" style={{ background: segment.color }} aria-hidden="true" />
            {segment.label}
            <b>{segment.count}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
