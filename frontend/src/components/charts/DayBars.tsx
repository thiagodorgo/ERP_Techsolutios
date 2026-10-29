export type DayBar = {
  readonly date: string;
  readonly inflow: number;
  readonly outflow: number;
  readonly count: number;
  readonly pendingCount: number | null;
};

export type DayBarsProps = {
  readonly days: readonly DayBar[] | null;
  readonly pressedDate?: string | null;
  readonly onDay?: (date: string) => void;
  readonly valueFormat: (value: number) => string;
};

/** Barras diárias recebidas prontas do agregado; não completa bucket ausente com zero. */
export function DayBars({ days, pressedDate = null, onDay, valueFormat }: DayBarsProps) {
  if (
    days === null ||
    days.some(
      (day) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
        !Number.isFinite(day.inflow) ||
        !Number.isFinite(day.outflow) ||
        !Number.isInteger(day.count) ||
        day.count < 0 ||
        (day.pendingCount !== null && (!Number.isInteger(day.pendingCount) || day.pendingCount < 0)),
    )
  ) {
    return <div className="ui-day-bars ui-day-bars--empty">Movimento diário indisponível.</div>;
  }
  if (days.length === 0) return <div className="ui-day-bars ui-day-bars--empty">Nenhum dia foi retornado para o período.</div>;
  const max = Math.max(1, ...days.flatMap((day) => [Math.abs(day.inflow), Math.abs(day.outflow)]));

  return (
    <div className="ui-day-bars" role="group" aria-label={`Movimento diário: ${days.length} dias retornados pelo servidor`} style={{ display: "grid", gridTemplateColumns: `repeat(${days.length}, minmax(44px, 1fr))`, gap: 4, overflowX: "auto" }}>
      {days.map((day) => {
        const label = `${day.date.split("-").reverse().slice(0, 2).join("/")}: ${day.count} lançamentos, entradas ${valueFormat(day.inflow)}, saídas ${valueFormat(day.outflow)}${day.pendingCount === null ? ", pendências indisponíveis" : `, ${day.pendingCount} a conciliar`} — ver o extrato do dia`;
        return (
          <button key={day.date} type="button" className="pat-os-tab" aria-pressed={pressedDate === day.date} aria-label={label} onClick={() => onDay?.(day.date)} style={{ minHeight: 112, display: "grid", gridTemplateRows: "1fr auto auto", alignItems: "end", justifyItems: "center", gap: 4, padding: 6 }}>
            <span aria-hidden="true" style={{ height: 64, display: "flex", alignItems: "end", gap: 3 }}>
              <i style={{ display: "block", width: 10, height: `${Math.max(2, (Math.abs(day.inflow) / max) * 60)}px`, background: "var(--color-chart-inflow)" }} />
              <i style={{ display: "block", width: 10, height: `${Math.max(2, (Math.abs(day.outflow) / max) * 60)}px`, background: "var(--color-chart-outflow)" }} />
            </span>
            <b>{day.date.slice(8, 10)}</b>
            <small>{day.pendingCount === null ? "pend. —" : day.pendingCount ? `● ${day.pendingCount}` : "ok"}</small>
          </button>
        );
      })}
    </div>
  );
}
