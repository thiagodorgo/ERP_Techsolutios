import type { CSSProperties } from "react";

import { Button, Modal } from "../../../../components/ui";
import {
  formatCost,
  formatMaintenanceDate,
  formatQuantity,
  getMaintenanceItemTypeLabel,
  getMaintenanceStatusLabel,
  getMaintenanceTypeLabel,
} from "../maintenance-orders.adapter";
import type { MaintenanceOrder, MaintenanceOrderItem, MaintenanceOrderTotals } from "../maintenance-orders.types";

// Ω4C PR-06 — Imprimir a manutenção. 100% client-side (window.print()), espelhando PrintWorkOrderModal: não há
// rota/endpoint de impressão nem PDF no backend. Imprime cabeçalho + itens + totais com os dados JÁ carregados
// (itens/totais DERIVADOS do backend) — nada é fabricado aqui; sem itens, imprime "Nenhum item…" honesto.

const PRINT_CSS = `
.mo-print-root { display: none; }
@media print {
  body * { visibility: hidden !important; }
  .mo-print-hide { display: none !important; }
  .mo-print-root, .mo-print-root * { visibility: visible !important; }
  .mo-print-root { display: block !important; position: absolute !important; left: 0; top: 0; width: 100%; color: #000; }
  .mo-print-anchor { position: static !important; }
  .ui-overlay { position: static !important; background: none !important; display: block !important; padding: 0 !important; }
  .ui-modal { position: static !important; overflow: visible !important; max-height: none !important; width: auto !important; border: none !important; box-shadow: none !important; background: none !important; }
  .mo-print-section { page-break-inside: avoid; }
}
`;

const introStyle: CSSProperties = { fontSize: 13, color: "#475569", marginBottom: 14 };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };
const printTh: CSSProperties = { fontSize: 10, textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #999", textTransform: "uppercase" };
const printThRight: CSSProperties = { ...printTh, textAlign: "right" };
const printTd: CSSProperties = { fontSize: 11, padding: "4px 6px", borderBottom: "1px solid #DDD" };
const printTdRight: CSSProperties = { ...printTd, textAlign: "right" };

export function PrintMaintenanceOrderModal({
  order,
  items,
  totals,
  vehicleLabel,
  onClose,
}: {
  readonly order: MaintenanceOrder;
  readonly items: readonly MaintenanceOrderItem[];
  readonly totals: MaintenanceOrderTotals;
  readonly vehicleLabel: string;
  readonly onClose: () => void;
}) {
  function handlePrint() {
    if (typeof window !== "undefined" && typeof window.print === "function") window.print();
  }

  return (
    <Modal title="Imprimir manutenção" open onClose={onClose}>
      <style>{PRINT_CSS}</style>

      <div className="mo-print-hide">
        <p style={introStyle}>Confira os dados antes de imprimir a manutenção.</p>
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
      <div className="mo-print-root">
        <h1 style={{ fontSize: 16, margin: "0 0 2px" }}>Manutenção · {vehicleLabel}</h1>
        <div style={{ fontSize: 11, marginBottom: 12 }}>Impressa em {formatMaintenanceDate(new Date().toISOString())}</div>

        <section className="mo-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Informações gerais</h2>
          <PrintRow label="Viatura" value={vehicleLabel} />
          <PrintRow label="Tipo" value={getMaintenanceTypeLabel(order.type)} />
          <PrintRow label="Situação" value={getMaintenanceStatusLabel(order.status)} />
          <PrintRow label="Agendada para" value={formatMaintenanceDate(order.scheduledFor)} />
          <PrintRow label="Concluída em" value={formatMaintenanceDate(order.completedAt)} />
          <PrintRow label="Próxima manutenção" value={formatMaintenanceDate(order.nextDueAt)} />
          {order.supplier ? <PrintRow label="Fornecedor" value={order.supplier} /> : null}
          {order.description ? <PrintRow label="Descrição" value={order.description} /> : null}
        </section>

        <section className="mo-print-section" style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 12.5, margin: "0 0 6px" }}>Itens</h2>
          {items.length === 0 ? (
            <div style={{ fontSize: 11 }}>Nenhum item cadastrado nesta manutenção.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={printTh}>Descrição</th>
                  <th style={printTh}>Tipo</th>
                  <th style={printThRight}>Qtd</th>
                  <th style={printThRight}>Valor unit.</th>
                  <th style={printThRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={printTd}>{item.description}</td>
                    <td style={printTd}>{getMaintenanceItemTypeLabel(item.itemType)}</td>
                    <td style={printTdRight}>{formatQuantity(item.quantity)}</td>
                    <td style={printTdRight}>{formatCost(item.unitValue)}</td>
                    <td style={printTdRight}>{formatCost(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...printTd, fontWeight: 700 }} colSpan={4}>
                    Total Serviços
                  </td>
                  <td style={{ ...printTdRight, fontWeight: 700 }}>{formatCost(totals.totalServices)}</td>
                </tr>
                <tr>
                  <td style={{ ...printTd, fontWeight: 700 }} colSpan={4}>
                    Total Produtos
                  </td>
                  <td style={{ ...printTdRight, fontWeight: 700 }}>{formatCost(totals.totalProducts)}</td>
                </tr>
                <tr>
                  <td style={{ ...printTd, fontWeight: 700 }} colSpan={4}>
                    Total
                  </td>
                  <td style={{ ...printTdRight, fontWeight: 700 }}>{formatCost(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
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

export default PrintMaintenanceOrderModal;
