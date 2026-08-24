import type { CSSProperties } from "react";

import { Alert, Badge, Button, Card, Chip, EmptyState, Skeleton, STATIC_ROW_CLASS } from "../../../../components/ui";
import { formatDate, getStatusLabel, getStatusTone, getVehicleLabel } from "../processes.adapter";
import type { CustodyHistoryItem } from "../processes.types";

// Ω-VID PR-09 — aba "Histórico de Custódias" do dossiê. Componente PURO: recebe os itens já adaptados + estados.
// Mostra as MÚLTIPLAS passagens do MESMO veículo (identidade) pelo pátio; a linha da custódia atual é destacada.
// §allowlist: nunca renderiza id do processo/identity como texto — só placa (rótulo público), estado, entrada, pátio.
const legendStyle: CSSProperties = { fontSize: 11, color: "#64748B" };
const primaryStyle: CSSProperties = { fontSize: 14, color: "#0F172A", fontWeight: 600 };
const numCell: CSSProperties = { whiteSpace: "nowrap" };
const currentRow: CSSProperties = { background: "#F0F9FF" };

export function CustodyHistoryPanel({
  items,
  loading,
  error,
  onRetry,
}: {
  readonly items: readonly CustodyHistoryItem[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
}) {
  const hasItems = items.length > 0;
  const countLabel =
    items.length > 1
      ? `${items.length} custódias registradas para este veículo.`
      : "Única custódia registrada para este veículo.";

  return (
    <Card title="Histórico de custódias">
      {loading && !hasItems ? (
        <Skeleton lines={4} />
      ) : error && !hasItems ? (
        <Alert title="Não foi possível carregar o histórico" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </Alert>
      ) : !hasItems ? (
        <EmptyState
          title="Sem histórico de custódias"
          detail="As passagens deste veículo pelo pátio aparecem aqui. Se esta custódia foi encerrada ou o vínculo está desatualizado, atualize a ocupação do pátio e tente de novo."
        />
      ) : (
        <>
          {error ? (
            <Alert title="Atualização em segundo plano falhou" tone="warning">
              {error}{" "}
              <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                Tentar novamente
              </Button>
            </Alert>
          ) : null}
          <p style={{ ...legendStyle, marginBottom: 10 }}>{countLabel}</p>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Veículo</th>
                  <th>Situação</th>
                  <th style={numCell}>Entrada</th>
                  <th>Pátio</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={STATIC_ROW_CLASS} style={item.isCurrent ? currentRow : undefined}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={primaryStyle}>{getVehicleLabel({ vehiclePlate: item.vehiclePlate, vehicleUnidentified: item.vehicleUnidentified })}</span>
                        {item.isCurrent ? <Badge tone="info">Custódia atual</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <Chip tone={getStatusTone(item.status)}>{getStatusLabel(item.status)}</Chip>
                    </td>
                    <td style={numCell}>{item.enteredAt ? formatDate(item.enteredAt) : "—"}</td>
                    <td>{item.yardName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export default CustodyHistoryPanel;
