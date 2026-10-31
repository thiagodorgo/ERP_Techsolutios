export type DayBar = {
  readonly date: string;
  readonly inflow: number;
  readonly outflow: number;
  readonly count: number;
  readonly pendingCount: number | null;
};

export type DayBarsProps = {
  readonly days: readonly DayBar[] | null;
  /**
   * Datas civis do período pedido ao servidor. Com elas, todo dia vira uma coluna (a grade da referência); o dia sem
   * bucket aparece como "—", sem valor nenhum: ausência de lançamento nunca vira R$ 0,00 inventado.
   */
  readonly rangeDates?: readonly string[];
  readonly today?: string | null;
  readonly pressedDate?: string | null;
  readonly onDay?: (date: string) => void;
  readonly valueFormat: (value: number) => string;
};

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const BAR_MAX = 38;

function civilDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

const shortDate = (date: string) => date.split("-").reverse().slice(0, 2).join("/");

/** Barras diárias recebidas prontas do agregado; não completa bucket ausente com zero. */
export function DayBars({ days, rangeDates, today = null, pressedDate = null, onDay, valueFormat }: DayBarsProps) {
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
  if (days.length === 0 && !rangeDates?.length) return <div className="ui-day-bars ui-day-bars--empty">Nenhum dia foi retornado para o período.</div>;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const slots = [...new Set([...(rangeDates ?? []), ...days.map((day) => day.date)])].sort();
  const max = Math.max(1, ...days.flatMap((day) => [Math.abs(day.inflow), Math.abs(day.outflow)]));

  return (
    <div className="ui-day-bars" role="group" aria-label={`Movimento diário: ${days.length} dias retornados pelo servidor`} style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))` }}>
      {slots.map((date) => {
        const day = byDate.get(date);
        const weekday = civilDay(date);
        const classes = ["ui-day-bars__day"];
        if (weekday === 0 || weekday === 6) classes.push("ui-day-bars__day--weekend");
        if (date === today) classes.push("ui-day-bars__day--today");
        const label = day
          ? `${shortDate(date)}: ${day.count} lançamentos, entradas ${valueFormat(day.inflow)}, saídas ${valueFormat(day.outflow)}${day.pendingCount === null ? ", pendências indisponíveis" : `, ${day.pendingCount} a conciliar`} — ver o extrato do dia`
          : `${shortDate(date)}: o servidor não retornou lançamentos neste dia — ver o extrato do dia`;
        return (
          <button key={date} type="button" className={classes.join(" ")} aria-pressed={pressedDate === date} aria-label={label} onClick={() => onDay?.(date)}>
            <span className="ui-day-bars__weekday">{date === today ? "hoje" : WEEKDAYS[weekday]}</span>
            <span className="ui-day-bars__number">{date.slice(8, 10)}</span>
            <span className="ui-day-bars__bars" aria-hidden="true">
              {day ? (
                <>
                  <i className="ui-day-bars__bar ui-day-bars__bar--in" style={{ height: `${Math.max(2, (Math.abs(day.inflow) / max) * BAR_MAX)}px` }} />
                  <i className="ui-day-bars__bar ui-day-bars__bar--out" style={{ height: `${Math.max(2, (Math.abs(day.outflow) / max) * BAR_MAX)}px` }} />
                </>
              ) : null}
            </span>
            <span className="ui-day-bars__count">{day && day.count > 0 ? `${day.count} lanç.` : "—"}</span>
            <span className={day?.pendingCount ? "ui-day-bars__pending ui-day-bars__pending--open" : "ui-day-bars__pending"}>{!day ? " " : day.pendingCount === null ? "pend. —" : day.pendingCount ? `● ${day.pendingCount}` : "ok"}</span>
          </button>
        );
      })}
    </div>
  );
}

export type ColumnBarTone = "inflow" | "outflow" | "age-recent" | "age-week" | "age-old" | "age-critical";

export type ColumnBarsItem = {
  readonly key: string;
  readonly label: string;
  readonly ariaLabel: string;
  /** Número literal acima da coluna; `null` publica "—" (contagem indisponível, nunca zero). */
  readonly value?: number | null;
  readonly bars: readonly { readonly tone: ColumnBarTone; readonly value: number | null }[];
};

export type ColumnBarsProps = {
  readonly items: readonly ColumnBarsItem[];
  readonly ariaLabel: string;
  readonly pressedKey?: string | null;
  readonly onSelect?: (key: string) => void;
  /** Altura da faixa de colunas e altura máxima da barra, em px. */
  readonly height?: number;
  readonly barHeight?: number;
};

/** Colunas acionáveis que filtram a lista (meses, faixas de idade). A escala é geometria: o valor vem pronto do servidor. */
export function ColumnBars({ items, ariaLabel, pressedKey = null, onSelect, height = 132, barHeight = 90 }: ColumnBarsProps) {
  const max = Math.max(1, ...items.flatMap((item) => item.bars.map((bar) => Math.abs(bar.value ?? 0))));
  return (
    <div className="ui-column-bars" role="group" aria-label={ariaLabel} style={{ height }}>
      {items.map((item) => (
        <button key={item.key} type="button" className="ui-column-bars__column" aria-pressed={pressedKey === item.key} aria-label={item.ariaLabel} onClick={() => onSelect?.(item.key)}>
          {item.value !== undefined ? <b className="ui-column-bars__value">{item.value ?? "—"}</b> : null}
          <span className="ui-column-bars__bars" aria-hidden="true" style={item.value === undefined ? { height: barHeight } : undefined}>
            {item.bars.map((bar) =>
              bar.value === null ? null : <i key={bar.tone} className={`ui-column-bars__bar ui-column-bars__bar--${bar.tone}`} style={{ height: `${Math.max(3, (Math.abs(bar.value) / max) * barHeight)}px` }} />,
            )}
          </span>
          <span className="ui-column-bars__label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
