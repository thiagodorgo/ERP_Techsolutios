import { Plus } from "lucide-react";
import type { CSSProperties } from "react";

import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "../../../../components/ui";
import {
  formatDateTime,
  formatMoney,
  formatRefDate,
  getDailyCapLabel,
  getDailyModelLabel,
  getDailyWindowLabel,
  getLinePrimaryLabel,
} from "../charges.adapter";
import type { ChargeLine, ChargeStatementView, DailyModel } from "../charges.types";

// (5) Guia de débitos — memória de cálculo do processo (RN-DIA-06). Componente PURO (presentational): recebe o
// statement já adaptado + estados. §7: skeleton, empty honesto (D-007), error+retry, acesso-negado. §2.8: dinheiro
// sempre BRL (Decimal→formatação), NUNCA tariffId/adjustmentOfChargeId cru. F4: DAILY identificada por periodSeq.
const legendStyle: CSSProperties = { fontSize: 11, color: "#64748B" };
const primaryStyle: CSSProperties = { fontSize: 14, color: "#0F172A", fontWeight: 600 };
const totalsRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", fontSize: 13, color: "#334155" };
const capBox: CSSProperties = { marginTop: 14, padding: 12, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" };
const capGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 8 };
const capLabel: CSSProperties = { fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" };
const capValue: CSSProperties = { fontSize: 14, color: "#0F172A" };
const numCell: CSSProperties = { textAlign: "right", whiteSpace: "nowrap" };

export function GuiaDebitos({
  statement,
  loading,
  error,
  denied,
  canCreate,
  onRetry,
  onLaunch,
}: {
  readonly statement: ChargeStatementView | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly denied: boolean;
  readonly canCreate: boolean;
  readonly onRetry: () => void;
  readonly onLaunch: () => void;
}) {
  const launchAction =
    canCreate && !denied ? (
      <Button type="button" size="sm" onClick={onLaunch} aria-label="Lançar encargo manual">
        <Plus size={14} aria-hidden /> Lançar encargo
      </Button>
    ) : undefined;

  const model: DailyModel = statement?.cap?.model ?? "ROLLING_24H";
  const hasLines = Boolean(statement && statement.lines.length > 0);

  return (
    <Card title="Guia de débitos" action={launchAction}>
      {denied ? (
        <EmptyState
          title="Sem acesso à guia de débitos"
          detail="Você não tem permissão para consultar os encargos deste processo de custódia."
        />
      ) : loading && !statement ? (
        <Skeleton lines={5} />
      ) : error ? (
        <Alert title="Não foi possível carregar a guia" tone="warning">
          {error}{" "}
          <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </Alert>
      ) : !hasLines ? (
        <EmptyState
          title="Nenhum encargo registrado"
          detail="Os encargos aparecem aqui conforme o motor de diárias acumula e os lançamentos manuais são registrados."
        />
      ) : statement ? (
        <>
          {statement.reconciliationPending || statement.overAccruedDailies > 0 ? (
            <Alert title="Reconciliação pendente" tone="warning">
              {`${statement.overAccruedDailies} ${statement.overAccruedDailies === 1 ? "diária acumulada" : "diárias acumuladas"} além do congelamento — o estorno é feito na liberação. Valor exibido apenas para conferência.`}
            </Alert>
          ) : null}

          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Encargo</th>
                  <th style={numCell}>Qtd.</th>
                  <th style={numCell}>Valor unitário</th>
                  <th style={numCell}>Total</th>
                </tr>
              </thead>
              <tbody>
                {statement.lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <ChargeLineLabel line={line} model={model} />
                    </td>
                    <td style={numCell}>{line.quantity}</td>
                    <td style={numCell}>{formatMoney(line.unitAmount, line.currency)}</td>
                    <td style={numCell}>{formatMoney(line.totalAmount, line.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12 }}>
            {statement.subtotals.map((subtotal) => (
              <div key={subtotal.kind} style={totalsRow}>
                <span>{`Subtotal · ${subtotal.kindLabel}`}</span>
                <span>{formatMoney(subtotal.total, statement.currency)}</span>
              </div>
            ))}
            <div style={{ ...totalsRow, borderTop: "1px solid #E2E8F0", marginTop: 4, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
              {/* Honestidade: sob reconciliação pendente o ledger (append-only) inclui diárias que o PR-10 estornará —
                  o rótulo vira "apurado" (memória de cálculo), não "devido". Caso normal = "Total devido". */}
              <span>{statement.reconciliationPending || statement.overAccruedDailies > 0 ? "Total apurado (memória de cálculo)" : "Total devido"}</span>
              <span>{formatMoney(statement.total, statement.currency)}</span>
            </div>
          </div>

          {statement.cap ? (
            <div style={capBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Teto de diárias</span>
                {statement.cap.capReached ? <Badge tone="warning">Teto atingido</Badge> : null}
              </div>
              <div style={capGrid}>
                <CapField label="Modelo" value={getDailyModelLabel(statement.cap.model)} />
                <CapField label="Teto" value={statement.cap.capCount != null ? `${statement.cap.capCount} diárias` : getDailyCapLabel(statement.cap.cap)} />
                <CapField label="Diárias devidas" value={`${statement.cap.nAccrue}${statement.cap.capCount != null ? ` de ${statement.cap.capCount}` : ""}`} />
              </div>
            </div>
          ) : null}

          <p style={{ ...legendStyle, marginTop: 12 }}>Projeção calculada em {formatDateTime(statement.asOf)}.</p>
        </>
      ) : null}
    </Card>
  );
}

// F4 — o identificador PRIMÁRIO de uma DAILY é o periodSeq ("Diária #N"); a janela de 24h é rótulo; a refDate é
// legenda SECUNDÁRIA (prefixada por "ref.") — nunca a chave visual. Demais linhas: description → kindLabel.
function ChargeLineLabel({ line, model }: { readonly line: ChargeLine; readonly model: DailyModel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={primaryStyle}>{getLinePrimaryLabel(line)}</span>
      {line.kind === "DAILY" ? (
        <small style={legendStyle}>{`${getDailyWindowLabel(model)} · ref. ${formatRefDate(line.refDate)}`}</small>
      ) : (
        <small style={legendStyle}>{line.kindLabel}</small>
      )}
      {line.settledAt ? <small style={{ ...legendStyle, color: "#16A34A" }}>Quitado em {formatDateTime(line.settledAt)}</small> : null}
    </div>
  );
}

function CapField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={capLabel}>{label}</span>
      <span style={capValue}>{value}</span>
    </div>
  );
}

export default GuiaDebitos;
