import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { KpiDetail } from "../../../../components/kpi";
import { KpiDetailModal } from "../../../../components/kpi";
import { ORDERED_PHASE_BUCKETS, getPhaseBucketHint, getPhaseBucketLabel } from "../dashboard.adapter";
import type { ProcessesByPhase, ProcessPhaseBucket } from "../dashboard.types";
import { ACTION_HIT_AREA, PHASE_COLORS, TRACK_COLOR, formatShare, shareOf, type PhaseSlice } from "../dashboard.view-model";

// Processos por fase — ROSCA em SVG inline, zero dependência (PD-004), na ordem canônica do rito
// (Remoção/Recepção → Custódia → Liberação → Leilão → Encerrado). A cor é a do FUNIL, não de saúde: azul na
// entrada e no núcleo, verde na devolução ao proprietário, roxo no leilão (é o que arrecada) e neutro no
// encerrado. Cada fase é CLICÁVEL — pela legenda (alvo ≥44px, foco visível, teclado) e pelo próprio arco —
// e abre o detalhamento do que aquela fase agrega, com atalho para a lista de processos.
// D-007: sem processo, nenhuma rosca é desenhada; a tela diz que não há dado.

const SIZE = 132;
const CENTER = SIZE / 2;
const RADIUS = 50;
const THICKNESS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const layoutStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" };
const donutStyle: CSSProperties = { width: SIZE, height: SIZE, flexShrink: 0, margin: "2px auto" };
const legendStyle: CSSProperties = { flex: "1 1 220px", minWidth: 200 };
const centerValueStyle: CSSProperties = { fontSize: 26, fontWeight: 800, fill: "#0F172A", fontVariantNumeric: "tabular-nums" };
const centerCaptionStyle: CSSProperties = { fontSize: 10.5, fontWeight: 700, fill: "#94A3B8", letterSpacing: "0.06em" };

export type ProcessosPorFaseCardProps = {
  readonly processesByPhase: ProcessesByPhase;
  readonly totalProcesses: number;
};

export function ProcessosPorFaseCard({ processesByPhase, totalProcesses }: ProcessosPorFaseCardProps) {
  const [selected, setSelected] = useState<ProcessPhaseBucket | null>(null);

  const slices = useMemo<PhaseSlice[]>(
    () =>
      ORDERED_PHASE_BUCKETS.map((bucket) => {
        const count = processesByPhase[bucket];
        return {
          bucket,
          label: getPhaseBucketLabel(bucket),
          count,
          share: shareOf(count, totalProcesses),
          color: PHASE_COLORS[bucket],
        };
      }),
    [processesByPhase, totalProcesses],
  );

  const arcs = useMemo(() => {
    let offset = 0;
    return slices
      .filter((slice) => slice.count > 0)
      .map((slice) => {
        const length = (slice.share / 100) * CIRCUMFERENCE;
        const arc = { slice, length, offset };
        offset += length;
        return arc;
      });
  }, [slices]);

  const detail = useMemo<KpiDetail | null>(() => {
    if (!selected) return null;
    const slice = slices.find((item) => item.bucket === selected);
    if (!slice) return null;
    return {
      title: slice.label,
      value: slice.count.toLocaleString("pt-BR"),
      caption: `${formatShare(slice.share)} dos ${totalProcesses.toLocaleString("pt-BR")} processos ativos`,
      body: { kind: "explain", text: getPhaseBucketHint(slice.bucket) },
      cta: { label: "Ver processos", to: "/patios/processos" },
    };
  }, [selected, slices, totalProcesses]);

  return (
    <section className="pat-card">
      <div className="pat-card__head">
        <h2 className="pat-card__title">Processos por fase</h2>
        <Link to="/patios/processos" className="pat-link" style={ACTION_HIT_AREA}>
          Ver processos
        </Link>
      </div>
      <div className="pat-card__subtitle pat-card__subtitle--gap">Do recolhimento ao encerramento do processo</div>

      {totalProcesses === 0 ? (
        <div className="pat-dash-empty">
          <strong style={{ display: "block", fontSize: 13.5, color: "#0F172A" }}>Nenhum processo em custódia</strong>
          Ainda não há processos de custódia registrados nesta organização.
        </div>
      ) : (
        <div style={layoutStyle}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={donutStyle}
            role="img"
            aria-label={`Distribuição dos ${totalProcesses.toLocaleString("pt-BR")} processos por fase: ${slices
              .map((slice) => `${slice.label} ${slice.count}`)
              .join(", ")}.`}
          >
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke={TRACK_COLOR} strokeWidth={THICKNESS} />
            {arcs.map(({ slice, length, offset }) => (
              <circle
                key={slice.bucket}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={THICKNESS}
                strokeDasharray={`${length} ${Math.max(CIRCUMFERENCE - length, 0)}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(slice.bucket)}
              >
                <title>{`${slice.label}: ${slice.count} (${formatShare(slice.share)})`}</title>
              </circle>
            ))}
            <text x={CENTER} y={CENTER - 2} textAnchor="middle" dominantBaseline="middle" style={centerValueStyle}>
              {totalProcesses.toLocaleString("pt-BR")}
            </text>
            <text x={CENTER} y={CENTER + 18} textAnchor="middle" dominantBaseline="middle" style={centerCaptionStyle}>
              ATIVOS
            </text>
          </svg>

          <div style={legendStyle}>
            {slices.map((slice) => (
              <button
                key={slice.bucket}
                type="button"
                className="pat-dash-critical"
                onClick={() => setSelected(slice.bucket)}
                aria-label={`Detalhar a fase ${slice.label} — ${slice.count} processos`}
              >
                <span className="pat-dash-dot" style={{ background: slice.color }} aria-hidden="true" />
                <span className="pat-dash-item">
                  <span className="pat-dash-item__row">
                    <span className="pat-dash-item__title pat-dash-item__title--lg">{slice.label}</span>
                  </span>
                  <span className="pat-dash-item__meta">{formatShare(slice.share)} do total</span>
                </span>
                <span className="pat-dash-count">{slice.count.toLocaleString("pt-BR")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <KpiDetailModal detail={detail} open={detail !== null} onClose={() => setSelected(null)} />
    </section>
  );
}
