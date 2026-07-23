import type { CSSProperties } from "react";

import { Button, Modal } from "../../../../components/ui";
import {
  formatBRL,
  formatCommissionDate,
  getCommissionSourceLabel,
  getSettlementLabel,
  isCalculationSettled,
} from "../commissions.adapter";
import type { CommissionCalculation } from "../commissions.types";

// Ω4C PR-10 (D-Ω4C-REM-PRINT) — imprimir a conferência de remunerações. 100% client-side (window.print()),
// espelhando PrintFineModal/PrintDamageModal: não há rota/endpoint de impressão nem PDF no backend. Imprime
// SOMENTE as linhas já carregadas — nada é fabricado (D-007). §2.8: o profissional sai só como NOME/rótulo,
// nunca CNH nem id técnico.

const PRINT_CSS = `
.rem-print-root { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .rem-print-hide { display: none !important; }
  .rem-print-root, .rem-print-root * { visibility: visible !important; }
  .rem-print-root { display: block !important; position: absolute !important; left: 0; top: 0; width: 100%; color: #000; }
  .ui-overlay { position: static !important; background: none !important; display: block !important; padding: 0 !important; }
  .ui-modal { position: static !important; overflow: visible !important; max-height: none !important; width: auto !important; border: none !important; box-shadow: none !important; background: none !important; }
  .rem-print-section { page-break-inside: avoid; }
}
`;

const introStyle: CSSProperties = { fontSize: 13, color: "#475569", marginBottom: 14 };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };
const cellStyle: CSSProperties = { fontSize: 11, padding: "2px 8px 2px 0", textAlign: "left", verticalAlign: "top" };
const rightCellStyle: CSSProperties = { ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" };

export function PrintRemuneracoesModal({
  professionalName,
  periodLabel,
  calculations,
  total,
  onClose,
}: {
  readonly professionalName: string;
  readonly periodLabel: string;
  readonly calculations: readonly CommissionCalculation[];
  readonly total: number;
  readonly onClose: () => void;
}) {
  function handlePrint() {
    if (typeof window !== "undefined" && typeof window.print === "function") window.print();
  }

  return (
    <Modal title="Imprimir remunerações" open onClose={onClose}>
      <style>{PRINT_CSS}</style>

      <div className="rem-print-hide">
        <p style={introStyle}>Confira as remunerações antes de imprimir.</p>
        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button type="button" onClick={handlePrint}>
            Imprimir
          </Button>
        </footer>
      </div>

      {/* Área imprimível: invisível na tela, é o que sai no papel. */}
      <div className="rem-print-root">
        <h1 style={{ fontSize: 16, margin: "0 0 2px" }}>Remunerações · {professionalName}</h1>
        <div style={{ fontSize: 11, marginBottom: 12 }}>
          Período {periodLabel} · Impresso em {formatCommissionDate(new Date().toISOString())}
        </div>

        <section className="rem-print-section">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th style={cellStyle}>Data</th>
                <th style={cellStyle}>Origem</th>
                <th style={rightCellStyle}>Valor</th>
                <th style={cellStyle}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {calculations.map((calc) => (
                <tr key={calc.id} style={{ borderBottom: "1px solid #CBD5E1" }}>
                  <td style={cellStyle}>{formatCommissionDate(calc.createdAt)}</td>
                  <td style={cellStyle}>{getCommissionSourceLabel(calc.sourceType)}</td>
                  <td style={rightCellStyle}>{formatBRL(calc.amount)}</td>
                  <td style={cellStyle}>{getSettlementLabel(isCalculationSettled(calc))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid #000", fontWeight: 700 }}>
                <td style={cellStyle} colSpan={2}>
                  Total a pagar
                </td>
                <td style={rightCellStyle}>{formatBRL(total)}</td>
                <td style={cellStyle} />
              </tr>
            </tfoot>
          </table>
        </section>
      </div>
    </Modal>
  );
}

export default PrintRemuneracoesModal;
