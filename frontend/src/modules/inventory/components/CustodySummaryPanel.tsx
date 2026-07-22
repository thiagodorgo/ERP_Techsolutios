import type { CSSProperties } from "react";

import { Alert, Button, EmptyState, Skeleton } from "../../../components/ui";
import { formatQuantity } from "../inventory.adapter";
import type { CustodySummary, InventoryItem } from "../inventory.types";

// Ω4C PR-08 — aba Resumo do modal de item: saldos POR CUSTÓDIA (Base/Profissional/Viatura) do
// custody-summary + saldo GLOBAL do item (Σ tudo — intocado). §2.8/LGPD: profissional só pelo nome
// (nunca CNH); viatura pela placa. Nada é fabricado — sem dado, mostra vazio honesto.

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-12)", marginBottom: "var(--space-16)" };
const cardStyle: CSSProperties = { background: "var(--surface-panel-muted)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-8)", padding: "var(--space-12)" };
const cardValueStyle: CSSProperties = { fontSize: 20, fontWeight: 800, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" };
const cardLabelStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", marginTop: 2 };
const sectionTitleStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 var(--space-8)" };
const tableWrapStyle: CSSProperties = { border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-8)", overflow: "hidden", marginBottom: "var(--space-16)" };
const rowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", fontSize: "var(--text-sm)" };
const rowLastStyle: CSSProperties = { ...rowStyle, borderBottom: "none" };
const qtyStyle: CSSProperties = { fontWeight: 700, fontVariantNumeric: "tabular-nums" };
const emptyRowStyle: CSSProperties = { padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--text-secondary)" };

export function CustodySummaryPanel({
  item,
  summary,
  loading,
  error,
  onRetry,
}: {
  readonly item: InventoryItem;
  readonly summary: CustodySummary | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry?: () => void;
}) {
  if (error) {
    return (
      <Alert title="Não foi possível carregar os saldos por custódia" tone="warning">
        {error}{" "}
        {onRetry ? (
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </Alert>
    );
  }

  if (loading && !summary) {
    return <Skeleton lines={5} />;
  }

  const baseQty = summary?.baseQty ?? 0;
  const professionalTotalQty = summary?.professionalTotalQty ?? 0;
  const vehicleTotalQty = summary?.vehicleTotalQty ?? 0;
  const professionals = summary?.professionals ?? [];
  const vehicles = summary?.vehicles ?? [];

  return (
    <div>
      <div style={gridStyle}>
        <Metric value={formatQuantity(baseQty, item.unit)} label="Qtd. Base" />
        <Metric value={formatQuantity(professionalTotalQty, item.unit)} label="Qtd. Profissional" />
        <Metric value={formatQuantity(vehicleTotalQty, item.unit)} label="Qtd. Viatura" />
        <Metric value={formatQuantity(item.saldo, item.unit)} label="Saldo global" />
      </div>

      <h3 style={sectionTitleStyle}>Profissionais</h3>
      <div style={tableWrapStyle}>
        {professionals.length === 0 ? (
          <div style={emptyRowStyle}>Nenhum item sob custódia de profissional.</div>
        ) : (
          professionals.map((entry, index) => (
            <div key={entry.operatorProfileId} style={index === professionals.length - 1 ? rowLastStyle : rowStyle}>
              <span>{entry.name ?? "Profissional"}</span>
              <span style={qtyStyle}>{formatQuantity(entry.qty, item.unit)}</span>
            </div>
          ))
        )}
      </div>

      <h3 style={sectionTitleStyle}>Viaturas</h3>
      <div style={tableWrapStyle}>
        {vehicles.length === 0 ? (
          <div style={emptyRowStyle}>Nenhum item sob custódia de viatura.</div>
        ) : (
          vehicles.map((entry, index) => (
            <div key={entry.vehicleId} style={index === vehicles.length - 1 ? rowLastStyle : rowStyle}>
              <span>{entry.plate ?? "Viatura"}</span>
              <span style={qtyStyle}>{formatQuantity(entry.qty, item.unit)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <div style={cardStyle}>
      <div style={cardValueStyle}>{value}</div>
      <div style={cardLabelStyle}>{label}</div>
    </div>
  );
}

export default CustodySummaryPanel;
