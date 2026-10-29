import type { KeyboardEvent } from "react";

export type BalanceBridgeDirection = "in" | "out";

export type BalanceBridgeProps = {
  readonly openingBalance: number | null;
  readonly inflow: number | null;
  readonly outflow: number | null;
  readonly balance: number | null;
  readonly pressedDirection?: BalanceBridgeDirection | null;
  readonly onDirection?: (direction: BalanceBridgeDirection) => void;
  readonly ariaLabel?: string;
  readonly valueFormat?: (value: number) => string;
};

const WIDTH = 470;
const HEIGHT = 176;
const BASELINE = 140;
const TOP = 22;

/**
 * Ponte explicativa do saldo. O saldo final é sempre o valor literal recebido do servidor; as contas abaixo servem
 * apenas para projetar a geometria SVG e nunca viram total financeiro de produto.
 */
export function BalanceBridge({ openingBalance, inflow, outflow, balance, pressedDirection = null, onDirection, ariaLabel = "De onde vem o saldo da conta", valueFormat = String }: BalanceBridgeProps) {
  const values = [openingBalance, inflow, outflow, balance];
  if (values.some((value) => value === null || !Number.isFinite(value))) {
    return <div className="ui-balance-bridge ui-balance-bridge--empty">Saldo da conta indisponível.</div>;
  }

  const opening = openingBalance as number;
  const incoming = inflow as number;
  const outgoing = outflow as number;
  const current = balance as number;
  const afterIncoming = opening + incoming;
  const afterOutgoing = afterIncoming - outgoing;
  const geometry = [0, opening, afterIncoming, afterOutgoing, current];
  let minimum = geometry[0];
  let maximum = geometry[0];
  for (const value of geometry) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const span = maximum - minimum || 1;
  const y = (value: number) => BASELINE - ((value - minimum) / span) * (BASELINE - TOP);
  const columns = [
    { label: "Abertura", value: opening, start: 0, end: opening, color: "var(--color-neutral-400, #94A3B8)", direction: null },
    { label: "Entradas", value: incoming, start: opening, end: afterIncoming, color: "var(--color-chart-inflow)", direction: "in" as const },
    { label: "Saídas", value: outgoing, start: afterIncoming, end: afterOutgoing, color: "var(--color-chart-outflow)", direction: "out" as const },
    { label: "Saldo atual", value: current, start: 0, end: current, color: "var(--color-core-accent, #2563EB)", direction: null },
  ];
  const band = WIDTH / columns.length;

  const activate = (direction: BalanceBridgeDirection) => onDirection?.(direction);
  const onKeyDown = (event: KeyboardEvent<SVGGElement>, direction: BalanceBridgeDirection) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(direction);
    }
  };

  return (
    <figure className="ui-balance-bridge" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="group" aria-label={ariaLabel} style={{ display: "block" }}>
        {columns.map((column, index) => {
          const center = index * band + band / 2;
          const top = Math.min(y(column.start), y(column.end));
          const height = Math.max(2, Math.abs(y(column.start) - y(column.end)));
          const content = (
            <>
              <title>{`${column.label}: ${valueFormat(column.value)}`}</title>
              {column.direction ? <rect className="ui-balance-bridge__hit" x={index * band + 6} y={2} width={band - 12} height={HEIGHT - 2} rx={8} fill="transparent" /> : null}
              <rect x={center - 26} y={top} width={52} height={height} rx={4} fill={column.color} />
              <text x={center} y={Math.max(14, top - 6)} textAnchor="middle" fontSize={11} fontWeight={800} fill="var(--color-neutral-900, #0F172A)" className="dense-col-tabular">
                {`${column.direction === "in" ? "+" : column.direction === "out" ? "−" : ""}${valueFormat(column.value)}`}
              </text>
              <text x={center} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-neutral-500, #64748B)">
                {column.label}
              </text>
              {index < columns.length - 1 ? <line x1={center + 26} x2={(index + 1) * band + band / 2 - 26} y1={y(column.end)} y2={y(column.end)} stroke="var(--color-neutral-300, #CBD5E1)" strokeDasharray="3 3" /> : null}
            </>
          );
          return column.direction ? (
            <g
              key={column.label}
              role="button"
              tabIndex={0}
              aria-pressed={pressedDirection === column.direction}
              aria-label={`${column.label}: ${valueFormat(column.value)} — ver só ${column.direction === "in" ? "as entradas" : "as saídas"} no extrato`}
              onClick={() => activate(column.direction!)}
              onKeyDown={(event) => onKeyDown(event, column.direction!)}
              style={{ cursor: "pointer" }}
            >
              {content}
            </g>
          ) : (
            <g key={column.label}>{content}</g>
          );
        })}
      </svg>
      <figcaption className="sr-only">{`${valueFormat(opening)} de abertura, ${valueFormat(incoming)} de entradas, ${valueFormat(outgoing)} de saídas e saldo atual ${valueFormat(current)}.`}</figcaption>
    </figure>
  );
}
