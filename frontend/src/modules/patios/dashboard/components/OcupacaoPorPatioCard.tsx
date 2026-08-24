import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { CLICKABLE_ROW_CLASS } from "../../../../components/ui";
import type { YardOccupancySummary } from "../dashboard.types";
import {
  ACTION_HIT_AREA,
  BLOCKED_SPOTS_COLOR,
  FREE_SPOTS_COLOR,
  SUCCESS_TONE,
  TRACK_COLOR,
  WARNING_TONE,
  DANGER_TONE,
  toOccupancyRows,
} from "../dashboard.view-model";

// Ocupação por pátio — barra EMPILHADA horizontal (ocupadas · bloqueadas · livres), uma por pátio, em SVG
// inline sem nenhuma dependência (PD-004). O segmento "ocupadas" assume a cor da FAIXA daquele pátio
// (verde folgado / âmbar apertado / vermelho lotado), então a leitura de risco é imediata linha a linha —
// a legenda existe justamente para declarar esse código de cor. Cada linha NAVEGA para o pátio.
// D-007: sem pátio cadastrado, mostra vazio honesto — nenhuma barra é desenhada.

const BAR_HEIGHT = 10;

const railStyle: CSSProperties = {
  height: BAR_HEIGHT,
  borderRadius: 99,
  overflow: "hidden",
  background: TRACK_COLOR,
};

const rowStyle: CSSProperties = { gridTemplateColumns: "1fr", textDecoration: "none", color: "inherit" };
const legendStyle: CSSProperties = { padding: "10px 18px 12px", borderBottom: "1px solid #F1F5F9" };
const headRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 10, minWidth: 0 };
const nameStyle: CSSProperties = { flex: 1, minWidth: 0 };
const subStyle: CSSProperties = { marginTop: 6, fontVariantNumeric: "tabular-nums" };

const LEGEND: readonly { readonly label: string; readonly color: string }[] = [
  { label: "Folgada (até 59%)", color: SUCCESS_TONE.solid },
  { label: "Apertada (60% a 85%)", color: WARNING_TONE.solid },
  { label: "Lotada (acima de 85%)", color: DANGER_TONE.solid },
  { label: "Livres", color: FREE_SPOTS_COLOR },
  { label: "Bloqueadas", color: BLOCKED_SPOTS_COLOR },
];

export type OcupacaoPorPatioCardProps = {
  readonly occupancy: readonly YardOccupancySummary[];
};

export function OcupacaoPorPatioCard({ occupancy }: OcupacaoPorPatioCardProps) {
  const rows = useMemo(() => toOccupancyRows(occupancy), [occupancy]);

  return (
    <section className="pat-table">
      <div className="pat-table__topbar">
        <div>
          <div className="pat-table__title">Ocupação por pátio</div>
          <div className="pat-table__subtitle">Vagas ocupadas, bloqueadas e livres em cada local de guarda</div>
        </div>
        <Link to="/patios/patios" className="pat-link" style={ACTION_HIT_AREA}>
          Ver pátios
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="pat-table__empty">
          <div className="pat-table__empty-title">Nenhum pátio cadastrado</div>
          <div className="pat-table__empty-detail">Cadastre pátios e vagas para acompanhar a ocupação aqui.</div>
        </div>
      ) : (
        <>
          <div className="pat-dash-legend" style={legendStyle}>
            {LEGEND.map((item) => (
              <span key={item.label} className="pat-dash-legend__item">
                <span className="pat-dash-legend__swatch" style={{ background: item.color }} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>

          {rows.map((row) => {
            const counts = `${row.occupiedSpots}/${row.totalSpots} ocupadas`;
            const blocked = row.blockedSpots > 0 ? ` · ${row.blockedSpots} bloqueada(s)` : "";
            const free = ` · ${row.freeSpots} ${row.freeSpots === 1 ? "livre" : "livres"}`;
            const pctLabel = row.rate === null ? "—" : `${row.rate}%`;
            return (
              <Link
                key={row.yardId}
                to={`/patios/patios/${row.yardId}`}
                className={`pat-table__row ${CLICKABLE_ROW_CLASS}`}
                style={rowStyle}
                aria-label={`Abrir o pátio ${row.yardName} — ${row.occupiedSpots} de ${row.totalSpots} vagas ocupadas`}
              >
                <div>
                  <div style={headRowStyle}>
                    <span className="pat-cell-main" style={nameStyle}>
                      {row.yardName}
                    </span>
                    <span className="pat-occ-pct" style={{ color: row.tone.fg }}>
                      {pctLabel}
                    </span>
                    <ArrowRight size={13} aria-hidden="true" style={{ color: "#CBD5E1", flexShrink: 0 }} />
                  </div>

                  <div style={{ ...railStyle, marginTop: 7 }}>
                    <svg
                      viewBox="0 0 100 10"
                      width="100%"
                      height={BAR_HEIGHT}
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`${row.yardName}: ${row.occupiedSpots} ocupadas, ${row.blockedSpots} bloqueadas e ${row.freeSpots} livres de ${row.totalSpots} vagas.`}
                      style={{ display: "block" }}
                    >
                      <rect x={0} y={0} width={row.occupiedWidth} height={10} fill={row.tone.solid}>
                        <title>{`Ocupadas: ${row.occupiedSpots}`}</title>
                      </rect>
                      <rect x={row.occupiedWidth} y={0} width={row.blockedWidth} height={10} fill={BLOCKED_SPOTS_COLOR}>
                        <title>{`Bloqueadas: ${row.blockedSpots}`}</title>
                      </rect>
                      <rect
                        x={row.occupiedWidth + row.blockedWidth}
                        y={0}
                        width={row.freeWidth}
                        height={10}
                        fill={FREE_SPOTS_COLOR}
                      >
                        <title>{`Livres: ${row.freeSpots}`}</title>
                      </rect>
                    </svg>
                  </div>

                  <div className="pat-cell-sub" style={subStyle}>
                    {`${counts}${blocked}${free}`}
                  </div>
                </div>
              </Link>
            );
          })}
        </>
      )}
    </section>
  );
}
