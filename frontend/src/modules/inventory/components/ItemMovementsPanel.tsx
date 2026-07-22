import { ArrowLeftRight, LogOut, Plus, RotateCcw, Unlink } from "lucide-react";
import type { CSSProperties } from "react";

import { Alert, Button, Chip, EmptyState, Skeleton } from "../../../components/ui";
import {
  buildMovementLedgerRows,
  formatMovementDateTime,
  formatSignedQuantity,
  getCustodyTypeLabel,
  getMovementTypeLabel,
  getMovementTypeTone,
} from "../inventory.adapter";
import type { MovementLedgerRow } from "../inventory.adapter";
import type { InventoryItem, StockMovement } from "../inventory.types";

// Ω4C PR-08 — aba Movimentação do modal de item. O razão é IMUTÁVEL: cada linha tem SÓ "Estornar"
// (nunca editar/excluir); a correção é sempre um movimento compensatório. Toolbar com 4 ações coloridas:
// laranja Entrada · azul Vincular · vermelho Saída · verde Desvincular (abrem sub-modais laranja).

const POSITIVE_QTY_COLOR = "#059669";
const NEGATIVE_QTY_COLOR = "#DC2626";
const mono = "'JetBrains Mono', monospace";

const toolbarStyle: CSSProperties = { display: "flex", gap: "var(--space-8)", flexWrap: "wrap", marginBottom: "var(--space-12)" };
const listWrapStyle: CSSProperties = { border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-8)", overflow: "hidden" };
const gridCols = "1.3fr 1fr 1.6fr 1fr auto";
const headStyle: CSSProperties = { display: "grid", gridTemplateColumns: gridCols, gap: 8, padding: "10px 12px", background: "var(--surface-panel-muted)", borderBottom: "1px solid var(--border-subtle)" };
const headCellStyle: CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: ".03em" };
const rowStyle: CSSProperties = { display: "grid", gridTemplateColumns: gridCols, gap: 8, padding: "11px 12px", borderBottom: "1px solid var(--border-subtle)", alignItems: "center" };
const mutedStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };

function colorButtonStyle(bg: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    border: "none",
    borderRadius: "var(--radius-6)",
    background: bg,
    color: "#fff",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

export function ItemMovementsPanel({
  item,
  movements,
  loading,
  error,
  onRetry,
  canCreateMovement,
  operatorNameById,
  vehiclePlateById,
  reversingId,
  onReverse,
  onOpenEntry,
  onOpenLink,
  onOpenUnlink,
  onOpenExit,
}: {
  readonly item: InventoryItem;
  readonly movements: readonly StockMovement[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry?: () => void;
  readonly canCreateMovement: boolean;
  readonly operatorNameById: ReadonlyMap<string, string>;
  readonly vehiclePlateById: ReadonlyMap<string, string>;
  readonly reversingId: string | null;
  readonly onReverse: (row: MovementLedgerRow) => void;
  readonly onOpenEntry: () => void;
  readonly onOpenLink: () => void;
  readonly onOpenExit: () => void;
  readonly onOpenUnlink: () => void;
}) {
  const rows: MovementLedgerRow[] = buildMovementLedgerRows(movements);

  function custodyRefLabel(row: MovementLedgerRow): string {
    if (row.custodyOperatorProfileId) return operatorNameById.get(row.custodyOperatorProfileId) ?? "Profissional";
    if (row.custodyVehicleId) return vehiclePlateById.get(row.custodyVehicleId) ?? "Viatura";
    return "";
  }

  function custodyLabel(row: MovementLedgerRow): string {
    const target = getCustodyTypeLabel(row.toCustodyType);
    const ref = custodyRefLabel(row);
    const targetWithRef = ref ? `${target} (${ref})` : target;
    if (row.fromCustodyType) {
      return `${getCustodyTypeLabel(row.fromCustodyType)} → ${targetWithRef}`;
    }
    return targetWithRef;
  }

  return (
    <div>
      {canCreateMovement ? (
        <div style={toolbarStyle} role="group" aria-label="Ações de movimentação de estoque">
          <button type="button" aria-label="Registrar entrada de estoque" style={colorButtonStyle("#EA580C")} onClick={onOpenEntry}>
            <Plus size={14} aria-hidden /> Entrada
          </button>
          <button type="button" aria-label="Vincular estoque a uma custódia" style={colorButtonStyle("#2563EB")} onClick={onOpenLink}>
            <ArrowLeftRight size={14} aria-hidden /> Vincular
          </button>
          <button type="button" aria-label="Registrar saída de estoque" style={colorButtonStyle("#DC2626")} onClick={onOpenExit}>
            <LogOut size={14} aria-hidden /> Saída
          </button>
          <button type="button" aria-label="Desvincular estoque de uma custódia" style={colorButtonStyle("#059669")} onClick={onOpenUnlink}>
            <Unlink size={14} aria-hidden /> Desvincular
          </button>
        </div>
      ) : null}

      {error ? (
        <Alert title="Não foi possível carregar as movimentações" tone="warning">
          {error}{" "}
          {onRetry ? (
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null}
        </Alert>
      ) : null}

      {loading && rows.length === 0 && !error ? <Skeleton lines={4} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="Nenhuma movimentação registrada"
          detail="Registre uma entrada, vincule/desvincule de uma custódia ou dê saída — o saldo é calculado a partir das movimentações."
        />
      ) : null}

      {!error && rows.length > 0 ? (
        <div style={listWrapStyle}>
          <div style={headStyle}>
            <span style={headCellStyle}>DATA</span>
            <span style={headCellStyle}>TIPO</span>
            <span style={headCellStyle}>CUSTÓDIA</span>
            <span style={{ ...headCellStyle, textAlign: "right" }}>QUANTIDADE</span>
            <span style={{ ...headCellStyle, textAlign: "right" }}>AÇÃO</span>
          </div>
          {rows.map((row) => (
            <div key={`${row.type}-${row.id}`} style={rowStyle}>
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)", fontFamily: mono }}>{formatMovementDateTime(row.createdAt)}</span>
              <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                <Chip tone={getMovementTypeTone(row.type)}>{getMovementTypeLabel(row.type)}</Chip>
                {row.isReversal ? <Chip tone="audit">Estorno</Chip> : null}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{custodyLabel(row)}</span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  color: row.quantidadeSinalizada >= 0 ? POSITIVE_QTY_COLOR : NEGATIVE_QTY_COLOR,
                }}
              >
                {formatSignedQuantity(row.quantidadeSinalizada, item.unit)}
              </span>
              <span style={{ textAlign: "right" }}>
                {row.reversed ? (
                  <Chip tone="default">Estornado</Chip>
                ) : canCreateMovement && !row.isReversal ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={reversingId === row.id}
                    aria-label={`Estornar movimento de ${formatMovementDateTime(row.createdAt)}`}
                    onClick={() => onReverse(row)}
                  >
                    <RotateCcw size={14} aria-hidden /> Estornar
                  </Button>
                ) : (
                  <span style={mutedStyle}>—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ItemMovementsPanel;
