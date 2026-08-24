import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { formatMoney, getBeneficiaryLabel, sortByBeneficiaryTotal } from "../dashboard.adapter";
import type { AuctionRevenueSummary } from "../dashboard.types";
import { ACTION_HIT_AREA, REVENUE_TONE, TRACK_COLOR, formatShare, shareOf, sumBeneficiaries } from "../dashboard.view-model";

// Arrecadação de leilão por beneficiário — tabela do padrão com a PARTICIPAÇÃO desenhada em barra SVG inline
// (zero dependência, PD-004), ordenada do maior para o menor. Roxo é o tom de receita (§11.5). O denominador
// da participação é a soma dos beneficiários exibidos; o total oficial acumulado vem do backend e aparece no
// rodapé — a UI NÃO soma nada que o servidor já não tenha somado.
// D-007: sem liquidação registrada, nenhuma barra é desenhada.

const BAR_HEIGHT = 8;
const GRID: CSSProperties = { gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 1fr) 118px" };
const railStyle: CSSProperties = { height: BAR_HEIGHT, borderRadius: 99, overflow: "hidden", background: TRACK_COLOR, flex: 1, minWidth: 40 };
const shareRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 9 };
const shareLabelStyle: CSSProperties = { fontSize: 11.5, fontWeight: 700, color: REVENUE_TONE.fg, fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right", flexShrink: 0 };
const amountStyle: CSSProperties = { fontSize: 13, fontWeight: 800, color: "#0F172A", fontVariantNumeric: "tabular-nums", textAlign: "right" };
const totalRowStyle: CSSProperties = { ...GRID, display: "grid", gap: 12, padding: "12px 18px", background: "#FBFCFE", alignItems: "center" };
const totalLabelStyle: CSSProperties = { fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", color: "#64748B" };
// Rótulos legais são longos ("Multas do órgão realizador") e a célula do padrão trunca com reticências.
// Numa tabela de distribuição, cortar o nome do beneficiário é perder a informação: aqui ela quebra em duas
// linhas em vez de truncar.
const labelStyle: CSSProperties = { whiteSpace: "normal", overflow: "visible", textOverflow: "clip", lineHeight: 1.35 };

export type ArrecadacaoCardProps = {
  readonly auctionRevenue: AuctionRevenueSummary;
};

export function ArrecadacaoCard({ auctionRevenue }: ArrecadacaoCardProps) {
  const rows = useMemo(() => {
    const sorted = sortByBeneficiaryTotal(auctionRevenue.byBeneficiary);
    const total = sumBeneficiaries(sorted);
    return sorted.map((row) => {
      const amount = Number(row.totalAmount);
      const share = shareOf(Number.isFinite(amount) ? amount : 0, total);
      return { ...row, label: getBeneficiaryLabel(row.beneficiaryKind), share };
    });
  }, [auctionRevenue.byBeneficiary]);

  return (
    <section className="pat-table">
      <div className="pat-table__topbar">
        <div>
          <div className="pat-table__title">Arrecadação de leilão por beneficiário</div>
          <div className="pat-table__subtitle">Distribuição dos leilões já liquidados</div>
        </div>
        <Link to="/patios/leiloes" className="pat-link" style={ACTION_HIT_AREA}>
          Ver leilões
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="pat-table__empty">
          <div className="pat-table__empty-title">Sem arrecadação registrada</div>
          <div className="pat-table__empty-detail">Nenhuma liquidação de leilão foi registrada ainda.</div>
        </div>
      ) : (
        <>
          <div className="pat-table__head" style={GRID}>
            <div>BENEFICIÁRIO</div>
            <div>PARTICIPAÇÃO</div>
            <div style={{ textAlign: "right" }}>VALOR</div>
          </div>

          {rows.map((row) => (
            <div key={row.beneficiaryKind} className="pat-table__row" style={GRID}>
              <span className="pat-cell-main" style={labelStyle}>
                {row.label}
              </span>
              <span style={shareRowStyle}>
                <span style={railStyle}>
                  <svg
                    viewBox="0 0 100 8"
                    width="100%"
                    height={BAR_HEIGHT}
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={`${row.label}: ${formatShare(row.share)} da arrecadação distribuída`}
                    style={{ display: "block" }}
                  >
                    <rect x={0} y={0} width={row.share} height={8} fill={REVENUE_TONE.solid} />
                  </svg>
                </span>
                <span style={shareLabelStyle}>{formatShare(row.share)}</span>
              </span>
              <span style={amountStyle}>{formatMoney(row.totalAmount)}</span>
            </div>
          ))}

          <div style={totalRowStyle}>
            <span style={totalLabelStyle}>TOTAL ACUMULADO</span>
            <span />
            <span style={{ ...amountStyle, color: REVENUE_TONE.fg }}>{formatMoney(auctionRevenue.grandTotal)}</span>
          </div>
        </>
      )}
    </section>
  );
}
