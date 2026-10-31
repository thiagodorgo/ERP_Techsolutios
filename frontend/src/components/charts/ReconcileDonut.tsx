export type ReconcileDonutFilter = "pending" | "value" | "date" | "reconciled";

export type ReconcileDonutProps = {
  readonly pending: number | null;
  /** Total reconciliado retornado pelo servidor; inclui as duas categorias de ressalva. */
  readonly reconciled: number | null;
  readonly valueDivergence: number | null;
  readonly dateDivergence: number | null;
  readonly pressed?: ReconcileDonutFilter | null;
  readonly onFilter?: (filter: ReconcileDonutFilter) => void;
  readonly ariaLabel?: string;
};

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ReconcileDonut({ pending, reconciled, valueDivergence, dateDivergence, pressed = null, onFilter, ariaLabel }: ReconcileDonutProps) {
  const raw = [pending, reconciled, valueDivergence, dateDivergence];
  if (raw.some((value) => value === null || !Number.isInteger(value) || (value as number) < 0)) {
    return <div className="ui-reconcile-donut ui-reconcile-donut--empty">Conciliação indisponível.</div>;
  }
  const pendingCount = pending as number;
  const reconciledCount = reconciled as number;
  const valueCount = valueDivergence as number;
  const dateCount = dateDivergence as number;
  const cleanCount = reconciledCount - valueCount - dateCount;
  if (cleanCount < 0) return <div className="ui-reconcile-donut ui-reconcile-donut--empty">Conciliação indisponível.</div>;

  const total = pendingCount + reconciledCount;
  const percent = total === 0 ? 0 : Math.round((reconciledCount / total) * 100);
  const ring = [
    { key: "reconciled" as const, label: "Conciliados", count: cleanCount },
    { key: "value" as const, label: "Ressalva de valor", count: valueCount },
    { key: "date" as const, label: "Ressalva de data", count: dateCount },
    { key: "pending" as const, label: "A conciliar", count: pendingCount },
  ];
  // A legenda segue a ordem de trabalho da referência: o que falta primeiro, o que já fechou por último.
  const legend = [ring[3], ring[1], ring[2], ring[0]];
  let offset = 0;

  return (
    <div className="ui-reconcile-donut">
      <svg viewBox="0 0 120 120" width={120} height={120} role="img" aria-label={ariaLabel ?? `${percent}% dos lançamentos conciliados`}>
        <circle className="ui-reconcile-donut__track" cx={60} cy={60} r={RADIUS} fill="none" strokeWidth={16} />
        {ring.map((segment) => {
          const length = total === 0 ? 0 : (segment.count / total) * CIRCUMFERENCE;
          const circle =
            segment.count > 0 ? (
              <circle
                key={segment.key}
                className={`ui-reconcile-donut__segment ui-reconcile-donut__segment--${segment.key}`}
                cx={60}
                cy={60}
                r={RADIUS}
                fill="none"
                strokeWidth={16}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              >
                <title>{`${segment.label}: ${segment.count}`}</title>
              </circle>
            ) : null;
          offset += length;
          return circle;
        })}
        <text x={60} y={58} textAnchor="middle" fontSize={20} fontWeight={800} fill="#0F172A">{`${percent}%`}</text>
        <text x={60} y={74} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#64748B">conciliado</text>
      </svg>
      <div className="ui-reconcile-donut__legend" role="group" aria-label="Filtrar por situação da conciliação">
        {legend.map((segment) => (
          <button key={segment.key} type="button" className="ui-reconcile-donut__item" aria-pressed={pressed === segment.key} aria-label={`${segment.label}: ${segment.count} — filtrar o extrato`} onClick={() => onFilter?.(segment.key)}>
            <span className="ui-reconcile-donut__name">
              <i className={`ui-reconcile-donut__swatch ui-reconcile-donut__swatch--${segment.key}`} aria-hidden="true" />
              {segment.label}
            </span>
            <span className="ui-reconcile-donut__meter" aria-hidden="true">
              <b className={`ui-reconcile-donut__swatch--${segment.key}`} style={{ width: `${total === 0 ? 0 : (segment.count / total) * 100}%` }} />
            </span>
            <span className="ui-reconcile-donut__count">{segment.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
