import type { CSSProperties } from "react";
import { useState } from "react";

import { Button, Modal } from "../../../../components/ui";
import { formatDamageDate, formatValor, getDamageStatusLabel, getDamageTipoLabel, getGravidadeLabel } from "../damages.adapter";
import type { Damage } from "../damages.types";

// Ω4C PR-09 (D-Ω4C-DANO-TERMO) — Imprimir o dano. 100% client-side (window.print()), espelhando
// PrintFineModal/PrintMaintenanceOrderModal: não há rota/endpoint de impressão nem PDF no backend.
// Imprime só dados JÁ carregados (nada fabricado). DUAS variantes controladas pelo toggle "Incluir termo de
// ciência": COM o parágrafo-padrão de reconhecimento do profissional, ou SEM. §2.8: o responsável sai só como
// NOME/rótulo (nunca CNH). A "Análise interna do dano" NUNCA é impressa (ANALISE:126) — nem no corpo, nem no
// termo. Nenhuma assinatura é fabricada: o termo traz apenas a linha em branco para a assinatura manual.

const PRINT_CSS = `
.damage-print-root { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .damage-print-hide { display: none !important; }
  .damage-print-root, .damage-print-root * { visibility: visible !important; }
  .damage-print-root { display: block !important; position: absolute !important; left: 0; top: 0; width: 100%; color: #000; }
  .ui-overlay { position: static !important; background: none !important; display: block !important; padding: 0 !important; }
  .ui-modal { position: static !important; overflow: visible !important; max-height: none !important; width: auto !important; border: none !important; box-shadow: none !important; background: none !important; }
  .damage-print-section { page-break-inside: avoid; }
}
`;

const introStyle: CSSProperties = { fontSize: 13, color: "#475569", marginBottom: 14 };
const toggleRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13, color: "#334155" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };

// Parágrafo-padrão do termo de ciência (reconhecimento do profissional). Texto honesto: não afirma que houve
// assinatura — apenas apresenta a declaração para leitura e assinatura manual do profissional.
const TERMO_CIENCIA =
  "Declaro estar ciente do dano acima descrito, a mim atribuído como responsável, e do respectivo desconto lançado no meu extrato de profissional, com cujo teor manifesto concordância.";

export function PrintDamageModal({
  damage,
  vehicleLabel,
  responsibleName,
  initialIncludeStatement = false,
  onClose,
}: {
  readonly damage: Damage;
  readonly vehicleLabel: string;
  readonly responsibleName: string | null;
  // Valor inicial do toggle (o checkbox controla depois). Prop existe para tornar as duas variantes testáveis.
  readonly initialIncludeStatement?: boolean;
  readonly onClose: () => void;
}) {
  const [includeStatement, setIncludeStatement] = useState(initialIncludeStatement);

  function handlePrint() {
    if (typeof window !== "undefined" && typeof window.print === "function") window.print();
  }

  const dispositionLabel = responsibleName
    ? `Responsável: ${responsibleName}${damage.statementDebit || damage.disposition === "statement" ? " · desconto lançado no extrato" : ""}`
    : "Sem responsável (empresa absorve)";

  return (
    <Modal title="Imprimir dano" open onClose={onClose}>
      <style>{PRINT_CSS}</style>

      <div className="damage-print-hide">
        <p style={introStyle}>Confira os dados antes de imprimir o dano.</p>
        <label style={toggleRowStyle}>
          <input
            type="checkbox"
            checked={includeStatement}
            onChange={(event) => setIncludeStatement(event.target.checked)}
            aria-label="Incluir termo de ciência do profissional na impressão"
          />
          Incluir termo de ciência (para assinatura do profissional)
        </label>
        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button type="button" onClick={handlePrint}>
            Imprimir
          </Button>
        </footer>
      </div>

      {/* Área imprimível: invisível na tela, é o que sai no papel. A Análise interna NUNCA entra aqui. */}
      <div className="damage-print-root">
        <h1 style={{ fontSize: 16, margin: "0 0 2px" }}>Registro de dano · {vehicleLabel}</h1>
        <div style={{ fontSize: 11, marginBottom: 12 }}>Impresso em {formatDamageDate(new Date().toISOString())}</div>

        <section className="damage-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Identificação</h2>
          <PrintRow label="Viatura" value={vehicleLabel} />
          <PrintRow label="Data do dano" value={formatDamageDate(damage.data)} />
          <PrintRow label="Tipo de dano" value={getDamageTipoLabel(damage.tipo)} />
          <PrintRow label="Gravidade" value={getGravidadeLabel(damage.gravidade)} />
          <PrintRow label="Situação" value={getDamageStatusLabel(damage.status)} />
        </section>

        <section className="damage-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Objeto do dano</h2>
          <PrintRow label="Objeto" value={damage.objeto || "—"} />
          <PrintRow label="Identificação do objeto" value={damage.identificacaoObjeto || "—"} />
          <PrintRow label="Origem" value={damage.origem || "—"} />
        </section>

        <section className="damage-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Descrição</h2>
          <p style={{ fontSize: 11, whiteSpace: "pre-wrap", margin: 0 }}>{damage.descricao || "—"}</p>
        </section>

        <section className="damage-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Valores e responsável</h2>
          <PrintRow label="Valor Total do dano" value={formatValor(damage.custoReal)} />
          {damage.statementDebit ? (
            <>
              <PrintRow label="Desconto do profissional" value={formatValor(damage.statementDebit.totalAmount)} />
              <PrintRow label="Parcelas" value={String(damage.statementDebit.installmentTotal)} />
            </>
          ) : null}
          <PrintRow label="Disposição" value={dispositionLabel} />
        </section>

        {includeStatement ? (
          <section className="damage-print-section" style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Termo de ciência</h2>
            <p style={{ fontSize: 11, margin: "0 0 28px" }}>{TERMO_CIENCIA}</p>
            <div style={{ fontSize: 11, display: "flex", gap: 40, marginTop: 24 }}>
              <div style={{ borderTop: "1px solid #000", paddingTop: 4, flex: 1 }}>Assinatura do profissional</div>
              <div style={{ borderTop: "1px solid #000", paddingTop: 4, width: 160 }}>Data</div>
            </div>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}

function PrintRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div style={{ fontSize: 11, display: "flex", gap: 6, padding: "1px 0" }}>
      <span style={{ fontWeight: 700, minWidth: 150 }}>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

export default PrintDamageModal;
