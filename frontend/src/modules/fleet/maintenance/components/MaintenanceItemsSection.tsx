import { Plus, Printer, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";

import { Alert, Button, Chip, Skeleton } from "../../../../components/ui";
import { formatCost, formatQuantity, getMaintenanceItemTypeLabel, getMaintenanceItemTypeTone } from "../maintenance-orders.adapter";
import type { MaintenanceOrderItem, MaintenanceOrderTotals } from "../maintenance-orders.types";

// Ω4C PR-06 — grade de itens da manutenção + totalizadores. TODOS os valores (lineTotal por linha e os totais)
// são DERIVADOS server-side e exibidos como vêm (D-Ω4C-MANUT-TOTALS-DERIVED) — o cliente NUNCA fabrica total.

const sectionStyle: CSSProperties = { marginTop: "var(--space-16)" };
const headRowStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-8)", marginBottom: "var(--space-8)" };
const titleStyle: CSSProperties = { margin: 0, fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-secondary)" };
const toolbarStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-6)" };
const tableWrapStyle: CSSProperties = { border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-6)", overflow: "hidden" };
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" };
const thStyle: CSSProperties = { textAlign: "left", padding: "var(--space-8) var(--space-10)", fontSize: "var(--text-xs)", textTransform: "uppercase", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)" };
const thRight: CSSProperties = { ...thStyle, textAlign: "right" };
const tdStyle: CSSProperties = { padding: "var(--space-8) var(--space-10)", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "top" };
const tdRight: CSSProperties = { ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const emptyStyle: CSSProperties = { padding: "var(--space-16)", textAlign: "center", color: "var(--text-secondary)", fontSize: "var(--text-sm)" };
const iconBtnStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-4)" };
const totalsRowStyle: CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "var(--space-16)", marginTop: "var(--space-12)" };
const totalCellStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const totalGrandStyle: CSSProperties = { fontSize: "var(--text-md)", color: "var(--text-primary)", fontWeight: 700 };

export function MaintenanceItemsSection({
  items,
  totals,
  loading = false,
  error = null,
  canEdit = false,
  busyItemId = null,
  onAdd,
  onEditItem,
  onRemoveItem,
  onPrint,
}: {
  readonly items: readonly MaintenanceOrderItem[];
  readonly totals: MaintenanceOrderTotals;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly canEdit?: boolean;
  readonly busyItemId?: string | null;
  readonly onAdd: () => void;
  readonly onEditItem: (item: MaintenanceOrderItem) => void;
  readonly onRemoveItem: (item: MaintenanceOrderItem) => void;
  readonly onPrint: () => void;
}) {
  return (
    <section style={sectionStyle} aria-label="Itens da manutenção">
      <div style={headRowStyle}>
        <h3 style={titleStyle}>Itens</h3>
        <div style={toolbarStyle}>
          <Button type="button" size="sm" variant="ghost" aria-label="Imprimir manutenção" onClick={onPrint}>
            <Printer size={14} aria-hidden /> Imprimir
          </Button>
          {canEdit ? (
            <Button type="button" size="sm" aria-label="Adicionar item" onClick={onAdd}>
              <Plus size={14} aria-hidden /> Adicionar item
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert title="Não foi possível carregar os itens" tone="warning">
          {error}
        </Alert>
      ) : null}

      {loading && items.length === 0 ? <Skeleton lines={3} /> : null}

      {!loading || items.length > 0 ? (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Descrição</th>
                <th style={thStyle}>Tipo</th>
                <th style={thRight}>Quantidade</th>
                <th style={thRight}>Valor unitário</th>
                <th style={thRight}>Valor total</th>
                {canEdit ? <th style={thRight}>Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td style={emptyStyle} colSpan={canEdit ? 6 : 5}>
                    Nenhum item cadastrado nesta manutenção.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.description || "—"}</td>
                    <td style={tdStyle}>
                      <Chip tone={getMaintenanceItemTypeTone(item.itemType)}>{getMaintenanceItemTypeLabel(item.itemType)}</Chip>
                    </td>
                    <td style={tdRight}>{formatQuantity(item.quantity)}</td>
                    <td style={tdRight}>{formatCost(item.unitValue)}</td>
                    {/* Valor total DERIVADO do backend (unit × qty) — exibido como veio, nunca recalculado aqui. */}
                    <td style={tdRight}>{formatCost(item.lineTotal)}</td>
                    {canEdit ? (
                      <td style={tdRight}>
                        <span style={iconBtnStyle}>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            aria-label={`Editar item ${item.description}`}
                            disabled={busyItemId === item.id}
                            onClick={() => onEditItem(item)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Excluir item ${item.description}`}
                            disabled={busyItemId === item.id}
                            onClick={() => onRemoveItem(item)}
                          >
                            <Trash2 size={14} aria-hidden />
                          </Button>
                        </span>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Totalizadores DERIVADOS do backend (D-Ω4C-MANUT-TOTALS-DERIVED). ESTOQUE cai no bucket Produtos. */}
      <div style={totalsRowStyle}>
        <span style={totalCellStyle}>
          Total Serviços: <strong>{formatCost(totals.totalServices)}</strong>
        </span>
        <span style={totalCellStyle}>
          Total Produtos: <strong>{formatCost(totals.totalProducts)}</strong>
        </span>
        <span style={totalGrandStyle}>Total: {formatCost(totals.total)}</span>
      </div>
    </section>
  );
}

export default MaintenanceItemsSection;
