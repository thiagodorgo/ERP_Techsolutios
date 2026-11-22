import { useState, type KeyboardEvent } from "react";

import type { GroupPanelCashFlowPoint, GroupPanelOrganization, GroupPanelSummary } from "../group-panel.types";
import { formatIndicator, formatMoney, GROUP_PANEL_INDICATORS, missingReason, monthName, monthShort, organizationValue, type GroupPanelIndicatorKey } from "../group-panel.state";

// B-GRUPO-GESTOR-1b — os dois gráficos do lote aprovado (itens 3 e 4), em SVG inline (PD-004, zero dependência), dentro
// dos cartões `.pat-an-card` da tela-modelo. Só composição: os pontos são os números do servidor; a escala usa o MAIOR
// valor para desenhar (comparar não é somar).

const INFLOW = "var(--color-chart-inflow, #16A34A)";
const OUTFLOW = "var(--color-chart-outflow, #DC2626)";
const BAR = "#2563EB";
const BAR_SELECTED = "#1D4ED8";

export function CashFlowChart({ points, scopeLabel, emptyLabel }: { readonly points: readonly GroupPanelCashFlowPoint[]; readonly scopeLabel: string; readonly emptyLabel: string }) {
  if (points.length === 0) {
    return <p className="pat-cell-muted" style={{ fontSize: 12, margin: "28px 0", textAlign: "center" }}>{emptyLabel}</p>;
  }
  const width = 640;
  const height = 180;
  const left = 24;
  const right = 616;
  const top = 14;
  const bottom = 150;
  const max = Math.max(1, ...points.map((point) => Math.max(point.inflow, point.outflow)));
  const x = (index: number) => (points.length === 1 ? (left + right) / 2 : left + 10 + (index * (right - left - 20)) / (points.length - 1));
  const y = (value: number) => bottom - (Math.max(0, value) / max) * (bottom - top);
  const line = (pick: (point: GroupPanelCashFlowPoint) => number) => points.map((point, index) => `${x(index).toFixed(1)},${y(pick(point)).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const label = `Recebido e pago de ${scopeLabel}, últimos ${points.length} meses. Em ${monthName(last.competencia)}: recebido ${formatMoney(last.inflow)}, pago ${formatMoney(last.outflow)}.`;

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ display: "block", width: "100%", height: "auto" }}>
        <g stroke="#E2E8F0">
          {[top, (top + bottom) / 2, bottom].map((lineY) => (
            <line key={lineY} x1={left} x2={right} y1={lineY} y2={lineY} />
          ))}
        </g>
        <polyline points={line((point) => point.inflow)} fill="none" stroke={INFLOW} strokeWidth={2.5} strokeLinejoin="round" />
        {/* Tracejada: as duas séries se distinguem também sem a cor (daltonismo). */}
        <polyline points={line((point) => point.outflow)} fill="none" stroke={OUTFLOW} strokeWidth={2.5} strokeDasharray="6 4" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={point.competencia}>
            <circle cx={x(index)} cy={y(point.inflow)} r={index === points.length - 1 ? 4 : 2.5} fill={INFLOW}>
              <title>{`${monthName(point.competencia)}: recebido ${formatMoney(point.inflow)}`}</title>
            </circle>
            <circle cx={x(index)} cy={y(point.outflow)} r={index === points.length - 1 ? 4 : 2.5} fill={OUTFLOW}>
              <title>{`${monthName(point.competencia)}: pago ${formatMoney(point.outflow)}`}</title>
            </circle>
            <text x={x(index)} y={height - 8} textAnchor="middle" fontSize={11} fill="#94A3B8">
              {monthShort(point.competencia)}
            </text>
          </g>
        ))}
      </svg>
      <div className="pat-lg-list" style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
        <div>
          <span aria-hidden="true" style={{ width: 10, height: 3, borderRadius: 2, background: INFLOW, display: "inline-block" }} /> Recebido
        </div>
        <div>
          <span aria-hidden="true" style={{ width: 12, height: 0, borderTop: `3px dashed ${OUTFLOW}`, display: "inline-block" }} /> Pago
        </div>
      </div>
    </>
  );
}

/** Comparação entre pátios do indicador ativo (lote item 4); clicar numa barra filtra a lista por aquele pátio. */
export function ComparisonChart({
  summary,
  indicator,
  selectedId,
  onSelect,
}: {
  readonly summary: GroupPanelSummary;
  readonly indicator: GroupPanelIndicatorKey;
  readonly selectedId: string | null;
  readonly onSelect: (organization: GroupPanelOrganization) => void;
}) {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const rows = summary.organizations.map((organization) => ({ organization, value: organizationValue(organization, summary.coverage, indicator) }));
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value ?? 0)));
  const rowHeight = 34;
  const width = 460;
  const labelWidth = 120;
  const barMax = 200;
  const label = GROUP_PANEL_INDICATORS.find((item) => item.key === indicator)?.label ?? "";

  const onKey = (event: KeyboardEvent<SVGGElement>, organization: GroupPanelOrganization) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(organization);
    }
  };

  return (
    <svg viewBox={`0 0 ${width} ${Math.max(rowHeight, rows.length * rowHeight)}`} role="group" aria-label={`${label} por pátio`} style={{ display: "block", width: "100%", height: "auto" }}>
      {rows.map(({ organization, value }, index) => {
        const yTop = index * rowHeight;
        const selected = selectedId === organization.id;
        const barWidth = value === null ? 0 : Math.max(2, (Math.abs(value) / max) * barMax);
        const valueText = value === null ? missingReason(organization, summary.coverage, indicator) || "sem número" : formatIndicator(indicator, value);
        return (
          <g
            key={organization.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${organization.name}: ${valueText}. Filtrar a lista por este pátio.`}
            style={{ cursor: "pointer", outline: "none" }}
            onFocus={() => setFocusedId(organization.id)}
            onBlur={() => setFocusedId((current) => (current === organization.id ? null : current))}
            onClick={() => onSelect(organization)}
            onKeyDown={(event) => onKey(event, organization)}
          >
            <rect x={0} y={yTop + 2} width={width} height={rowHeight - 4} rx={6} fill={selected ? "#EFF6FF" : "transparent"} stroke={focusedId === organization.id ? "#2563EB" : "none"} strokeWidth={2} />
            <text x={6} y={yTop + 21} fontSize={12} fill="#0F172A" fontWeight={selected ? 700 : 500}>
              {organization.name.length > 17 ? `${organization.name.slice(0, 16)}…` : organization.name}
              <title>{organization.name}</title>
            </text>
            {value !== null ? <rect x={labelWidth} y={yTop + 10} width={barWidth} height={14} rx={3} fill={value < 0 ? OUTFLOW : selected ? BAR_SELECTED : BAR} /> : null}
            <text x={labelWidth + barWidth + 6} y={yTop + 21} fontSize={11.5} fill={value === null ? "#94A3B8" : "#475569"} fontStyle={value === null ? "italic" : undefined}>
              {valueText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
