import type { CSSProperties } from "react";

import { Chip } from "../../../../components/ui";
import {
  formatMoney,
  getSettlementStatusTone,
  hasShortfall,
  splitCascade,
} from "../settlement.adapter";
import type { SettlementAllocationDto, SettlementDto } from "../settlement.types";

// §11 — tabela da CASCATA §6º: linhas ordenadas por orderSeq (a ordem legal) → cada tier com valor RECLAMADO e
// ALOCADO; o resíduo OWNER_BALANCE em linha distinta; e o rodapé Σ das alocações = ARREMATE em DESTAQUE (a prova
// visual do I7). HONESTIDADE DE DINHEIRO: a UI NUNCA soma/calcula — o total exibido é o hammerAmount CRU do DTO
// (a autoridade da soma é o backend, que a impõe por construção: Σ alocações == arremate). §2.8: reference já vem
// mascarada; nenhum UUID de ator é renderizado.
const cellStyle: CSSProperties = { padding: "8px 10px", fontSize: 13, color: "#0F172A", borderTop: "1px solid #F1F5F9", verticalAlign: "top" };
const numCell: CSSProperties = { ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const headCellStyle: CSSProperties = { padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".03em", textAlign: "left" };
const numHead: CSSProperties = { ...headCellStyle, textAlign: "right" };
const mutedStyle: CSSProperties = { color: "#94A3B8" };
const refStyle: CSSProperties = { fontSize: 11, color: "#64748B" };

export function CascataTable({
  settlement,
  allocations,
}: {
  readonly settlement: SettlementDto;
  readonly allocations: readonly SettlementAllocationDto[];
}) {
  const { tiers, ownerBalance } = splitCascade(allocations);
  const currency = settlement.currency || "BRL";
  const shortfall = hasShortfall(settlement);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Chip tone={getSettlementStatusTone(settlement.status)}>{settlement.statusLabel}</Chip>
        {settlement.soldRound != null ? <Chip tone="default">Rodada {settlement.soldRound}ª</Chip> : null}
      </div>

      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>
        Distribuição do valor arrematado na ordem legal do §6º: custeio do leilão, remoção e estada (computada),
        tributos, credores preferenciais e multas. O resíduo é o saldo ao proprietário.
      </p>

      <div className="ui-table-wrap">
        <table className="ui-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={headCellStyle}>Ordem</th>
              <th style={headCellStyle}>Beneficiário</th>
              <th style={numHead}>Reclamado</th>
              <th style={numHead}>Alocado</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr key={tier.id}>
                <td style={cellStyle}>
                  <strong>{tier.orderSeq}º</strong>
                </td>
                <td style={cellStyle}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{tier.beneficiaryLabel}</span>
                    {tier.reference ? <span style={refStyle}>{tier.reference}</span> : null}
                  </div>
                </td>
                <td style={numCell}>{tier.claimAmount != null ? formatMoney(tier.claimAmount, currency) : <span style={mutedStyle}>—</span>}</td>
                <td style={numCell}>{formatMoney(tier.amount, currency)}</td>
              </tr>
            ))}

            {/* Resíduo OWNER_BALANCE — o que sobra do arremate após a cascata (§12). SEM valor reclamado. */}
            {ownerBalance ? (
              <tr style={{ background: "#F8FAFC" }}>
                <td style={cellStyle}>
                  <strong>{ownerBalance.orderSeq}º</strong>
                </td>
                <td style={cellStyle}>
                  <strong>{ownerBalance.beneficiaryLabel}</strong>
                  <span style={{ ...refStyle, display: "block" }}>Resíduo da cascata</span>
                </td>
                <td style={numCell}>
                  <span style={mutedStyle}>—</span>
                </td>
                <td style={{ ...numCell, fontWeight: 700 }}>{formatMoney(ownerBalance.amount, currency)}</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            {/* PROVA VISUAL do I7: Σ das alocações == ARREMATE. Exibimos o hammerAmount CRU do DTO (a soma é
                imposta pelo backend por construção — a UI não recalcula o total). */}
            <tr>
              <td style={{ ...cellStyle, borderTop: "2px solid #CBD5E1" }} colSpan={2}>
                <strong style={{ fontSize: 14 }}>Σ das alocações = arremate</strong>
                <span style={{ ...refStyle, display: "block" }}>Soma garantida pelo backend (invariante I7).</span>
              </td>
              <td style={{ ...numCell, borderTop: "2px solid #CBD5E1" }} />
              <td style={{ ...numCell, borderTop: "2px solid #CBD5E1", fontWeight: 700, fontSize: 15, color: "#0F172A" }}>
                {formatMoney(settlement.hammerAmount, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Honestidade: se as despesas excederam o arremate, os tiers inferiores e o saldo ficaram 0 — sem implicar
          pagamento integral. */}
      {shortfall ? (
        <p style={{ fontSize: 12, color: "#B45309", margin: "10px 0 0" }}>
          As despesas superaram o valor arrematado em {formatMoney(settlement.shortfallAmount, currency)}. A cascata paga
          na ordem legal §6º até esgotar o arremate; os níveis seguintes e o saldo ao proprietário ficam zerados.
        </p>
      ) : null}
    </div>
  );
}

export default CascataTable;
