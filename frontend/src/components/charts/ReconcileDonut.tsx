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
  const segments = [
    { key: "reconciled" as const, label: "Conciliados", count: cleanCount, color: "var(--color-status-success, #22C55E)" },
    { key: "value" as const, label: "Ressalva de valor", count: valueCount, color: "var(--color-status-warning, #F59E0B)" },
    { key: "date" as const, label: "Ressalva de data", count: dateCount, color: "var(--color-status-pending, #FBBF24)" },
    { key: "pending" as const, label: "A conciliar", count: pendingCount, color: "var(--color-status-info, #60A5FA)" },
  ];
  let offset = 0;

  return (
    <div className="ui-reconcile-donut" style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
      <svg viewBox="0 0 120 120" width={120} height={120} role="img" aria-label={ariaLabel ?? `${percent}% dos lançamentos conciliados`}>
        <circle cx={60} cy={60} r={RADIUS} fill="none" stroke="var(--color-neutral-100, #F1F5F9)" strokeWidth={16} />
        {segments.map((segment) => {
          const length = total === 0 ? 0 : (segment.count / total) * CIRCUMFERENCE;
          const circle =
            segment.count > 0 ? (
              <circle
                key={segment.key}
                cx={60}
                cy={60}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
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
        <text x={60} y={58} textAnchor="middle" fontSize={20} fontWeight={800} fill="var(--color-neutral-900, #0F172A)">{`${percent}%`}</text>
        <text x={60} y={74} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--color-neutral-500, #64748B)">conciliado</text>
      </svg>
      <div role="group" aria-label="Filtrar por situação da conciliação">
        {segments.map((segment) => (
          <button
            key={segment.key}
            type="button"
            className="pat-os-tab"
            aria-pressed={pressed === segment.key}
            aria-label={`${segment.label}: ${segment.count} — filtrar o extrato`}
            onClick={() => onFilter?.(segment.key)}
            style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, marginBottom: 4 }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: segment.color }} />
              {segment.label}
            </span>
            <b className="dense-col-tabular">{segment.count}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
