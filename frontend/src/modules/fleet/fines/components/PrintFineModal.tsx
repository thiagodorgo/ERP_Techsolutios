import type { CSSProperties } from "react";

import { Button, Modal } from "../../../../components/ui";
import { formatFineDate, formatPontos, formatValor, getFineStatusLabel } from "../fines.adapter";
import type { Fine } from "../fines.types";

// Ω4C PR-07 (D-Ω4C-MULSEG-PRINT) — Imprimir a multa. 100% client-side (window.print()), espelhando
// PrintMaintenanceOrderModal/PrintWorkOrderModal: não há rota/endpoint de impressão nem PDF no backend.
// Imprime cabeçalho + infração + valor/pontos/prazos + condutor responsável com os dados JÁ carregados —
// nada é fabricado. §2.8: o responsável sai só como NOME/rótulo (nunca CNH nem id técnico).

const PRINT_CSS = `
.fine-print-root { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .fine-print-hide { display: none !important; }
  .fine-print-root, .fine-print-root * { visibility: visible !important; }
  .fine-print-root { display: block !important; position: absolute !important; left: 0; top: 0; width: 100%; color: #000; }
  .ui-overlay { position: static !important; background: none !important; display: block !important; padding: 0 !important; }
  .ui-modal { position: static !important; overflow: visible !important; max-height: none !important; width: auto !important; border: none !important; box-shadow: none !important; background: none !important; }
  .fine-print-section { page-break-inside: avoid; }
}
`;

const introStyle: CSSProperties = { fontSize: 13, color: "#475569", marginBottom: 14 };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };

export function PrintFineModal({
  fine,
  vehicleLabel,
  responsibleName,
  onClose,
}: {
  readonly fine: Fine;
  readonly vehicleLabel: string;
  readonly responsibleName: string | null;
  readonly onClose: () => void;
}) {
  function handlePrint() {
    if (typeof window !== "undefined" && typeof window.print === "function") window.print();
  }

  const dispositionLabel =
    fine.disposition === "statement"
      ? `Lançada no extrato do condutor responsável${responsibleName ? ` (${responsibleName})` : ""}`
      : "Sem condutor responsável (empresa paga)";

  return (
    <Modal title="Imprimir multa" open onClose={onClose}>
      <style>{PRINT_CSS}</style>

      <div className="fine-print-hide">
        <p style={introStyle}>Confira os dados antes de imprimir a multa.</p>
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
      <div className="fine-print-root">
        <h1 style={{ fontSize: 16, margin: "0 0 2px" }}>Multa de trânsito · Auto {fine.numeroAuto}</h1>
        <div style={{ fontSize: 11, marginBottom: 12 }}>Impressa em {formatFineDate(new Date().toISOString())}</div>

        <section className="fine-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Identificação</h2>
          <PrintRow label="Nº do auto" value={fine.numeroAuto} />
          <PrintRow label="Viatura" value={vehicleLabel} />
          <PrintRow label="Órgão autuador" value={fine.orgao || "—"} />
          <PrintRow label="Situação" value={getFineStatusLabel(fine.status)} />
        </section>

        <section className="fine-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Infração</h2>
          <PrintRow label="Data da infração" value={formatFineDate(fine.dataInfracao)} />
          <PrintRow label="Descrição" value={fine.descricao || "—"} />
          <PrintRow label="Pontos" value={formatPontos(fine.pontos)} />
        </section>

        <section className="fine-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Valor e prazos</h2>
          <PrintRow label="Valor" value={formatValor(fine.valor)} />
          <PrintRow label="Prazo de recurso" value={formatFineDate(fine.prazoRecurso)} />
          <PrintRow label="Prazo de pagamento" value={formatFineDate(fine.prazoPagamento)} />
        </section>

        <section className="fine-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Condutor responsável</h2>
          <PrintRow label="Responsável" value={responsibleName ?? "—"} />
          <PrintRow label="Disposição" value={dispositionLabel} />
        </section>
      </div>
    </Modal>
  );
}

function PrintRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div style={{ fontSize: 11, display: "flex", gap: 6, padding: "1px 0" }}>
      <span style={{ fontWeight: 700, minWidth: 128 }}>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export default PrintFineModal;
