import { BadgeCheck, Coins } from "lucide-react";
import type { CSSProperties } from "react";

import { Alert, Badge, Button, Card, EmptyState } from "../../../../components/ui";
import { formatMoney } from "../../charges/charges.adapter";
import type { ChargeStatementView } from "../../charges/charges.types";
import type { SettleResult } from "../release.types";

// §11 + honestidade de dinheiro — a quitação registra o ATO DE DINHEIRO (charging:settle, SEM PSP/PIX — D-Ω5P-07).
// A UI EXIBE o total apurado do backend e, após a quitação, o settledTotal/estornoCount REAIS. NUNCA afirma
// "quitado" enquanto há débito em aberto (o rótulo do total segue a reconciliação, igual à Guia de débitos).
const totalRow: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 16, fontWeight: 700, color: "#0F172A", padding: "8px 0" };
const legendStyle: CSSProperties = { fontSize: 12, color: "#64748B", margin: 0 };
const settledBox: CSSProperties = { marginTop: 12, padding: 12, borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0" };

export function QuitacaoPanel({
  statement,
  settleResult,
  canSettle,
  busy,
  error,
  onSettle,
}: {
  readonly statement: ChargeStatementView | null;
  readonly settleResult: SettleResult | null;
  readonly canSettle: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSettle: () => void;
}) {
  const currency = statement?.currency ?? "BRL";
  const underReconciliation = Boolean(statement && (statement.reconciliationPending || statement.overAccruedDailies > 0));

  return (
    <Card title="Quitação">
      {error ? (
        <Alert title="Não foi possível registrar a quitação" tone="danger">
          {error}
        </Alert>
      ) : null}

      {statement ? (
        <>
          <div style={totalRow}>
            {/* Honestidade: sob reconciliação pendente o total é "apurado" (memória de cálculo), não "devido" — o
                ledger append-only ainda inclui diárias que o estorno da quitação corrige. */}
            <span>{underReconciliation ? "Total apurado (memória de cálculo)" : "Total devido"}</span>
            <span>{formatMoney(statement.total, currency)}</span>
          </div>
          <p style={legendStyle}>
            A quitação registra o pagamento presencial (dinheiro/transferência fora do sistema) e reconcilia as
            diárias acumuladas além do congelamento por estorno. Não há cobrança online.
          </p>
        </>
      ) : (
        <EmptyState
          title="Guia de débitos indisponível"
          detail="Sem a guia de débitos deste processo, não é possível apurar nem registrar a quitação."
        />
      )}

      {settleResult ? (
        <div style={settledBox}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <BadgeCheck size={16} aria-hidden color="#16A34A" />
            <strong style={{ fontSize: 14, color: "#166534" }}>Quitação registrada</strong>
            <Badge tone="success">{`${settleResult.settledCount} ${settleResult.settledCount === 1 ? "encargo" : "encargos"}`}</Badge>
          </div>
          <div style={{ ...totalRow, fontSize: 15, color: "#166534" }}>
            <span>Total quitado</span>
            <span>{formatMoney(settleResult.settledTotal, currency)}</span>
          </div>
          {settleResult.estornoCount > 0 ? (
            <p style={legendStyle}>
              {`${settleResult.estornoCount} ${settleResult.estornoCount === 1 ? "estorno de reconciliação lançado" : "estornos de reconciliação lançados"} (diárias acumuladas além do congelamento).`}
            </p>
          ) : null}
        </div>
      ) : null}

      {canSettle && statement ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <Button type="button" variant={settleResult ? "secondary" : "primary"} onClick={onSettle} disabled={busy} aria-label="Registrar quitação">
            <Coins size={15} aria-hidden /> {busy ? "Registrando…" : settleResult ? "Registrar quitação novamente" : "Registrar quitação"}
          </Button>
        </div>
      ) : !canSettle ? (
        <p style={{ ...legendStyle, marginTop: 10 }}>Você não tem permissão para registrar a quitação.</p>
      ) : null}
    </Card>
  );
}

export default QuitacaoPanel;
