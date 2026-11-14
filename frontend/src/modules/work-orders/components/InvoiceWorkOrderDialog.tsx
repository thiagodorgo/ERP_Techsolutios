import type { CSSProperties, FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { Alert, Button, Input, Modal } from "../../../components/ui";
import { invoiceWorkOrder } from "../financials.service";
import type { WorkOrderFinancialApiContext, WorkOrderFinancialItem, WorkOrderInvoiceResult } from "../financials.types";
import { createInvoiceSubmitter, formatMoney, type InvoiceOutcome } from "../work-order-invoice.model";

// B-SAN3-25 (item 50 do portão) — o diálogo de faturamento da OS, aberto pela aba Financeiro. Tela-modelo:
// `registry/service-quotes/components/ServiceQuoteApproveDialog.tsx` (mesmo `Modal`, `Alert`, `Input` e `Button` da
// biblioteca, mesma grade, a trava de envio duplo ligada por `useMemo`). Herda a aparência da aba, sem as 3 opções (Q3 = A,
// `D-DONO-TODAS-RECOMENDACOES-1111`). A regra de negócio (corpo, desfecho de cada recusa, trava) mora no modelo puro.
// A tela não soma: no 1º faturamento mostra o `totalAmount` do servidor; no complementar, diz que o servidor calcula.

export type InvoiceShown = { readonly amount: number | null; readonly count: number };

const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const bodyStyle: CSSProperties = { display: "grid", gap: "var(--space-12)", maxHeight: "min(64vh, 560px)", overflowY: "auto", paddingRight: "var(--space-4)" };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" };
const summaryStyle: CSSProperties = { margin: "0 0 var(--space-12)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const statusStyle: CSSProperties = { margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const listStyle: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-4)" };
const rowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: "var(--space-12)", fontSize: "var(--text-sm)" };
const moneyStyle: CSSProperties = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const totalStyle: CSSProperties = { ...rowStyle, paddingTop: "var(--space-8)", borderTop: "1px solid var(--border-subtle, #E2E8F0)", fontWeight: 800 };
const touchTarget: CSSProperties = { minHeight: 44 };

export function InvoiceWorkOrderDialog({
  context,
  workOrderId,
  workOrderCode,
  workOrderTitle,
  pendingItems,
  originalAmount,
  currency,
  onInvoiced,
  onFailed,
  onClose,
}: {
  readonly context: WorkOrderFinancialApiContext;
  readonly workOrderId: string;
  // Subtítulo "<código> · <título da OS>" (Emenda 2, E2.2); sem título, só o código.
  readonly workOrderCode?: string;
  readonly workOrderTitle?: string;
  readonly pendingItems: readonly WorkOrderFinancialItem[];
  // O `totalAmount` do servidor no 1º faturamento; `null` no complementar.
  readonly originalAmount: number | null;
  readonly currency: string;
  // 201: o resultado do servidor e o que a confirmação mostrou (para o aviso de divergência).
  readonly onInvoiced: (result: WorkOrderInvoiceResult, shown: InvoiceShown) => void;
  // Recusa que fecha o diálogo: a aba mostra a frase e relê a lista quando o desfecho manda.
  readonly onFailed: (outcome: InvoiceOutcome) => void;
  readonly onClose: () => void;
}) {
  const [dueDate, setDueDate] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [saving, setSaving] = useState(false);

  const contextRef = useRef(context);
  contextRef.current = context;

  // Envio com trava de envio duplo (R-UM-ENVIO). Um submetedor por OS aberta: um 2º envio com o 1º em voo é ignorado.
  const submit = useMemo(() => createInvoiceSubmitter({
    invoice: (body) => invoiceWorkOrder(contextRef.current, workOrderId, body),
  }), [workOrderId]);

  const subtitle = workOrderCode ? (workOrderTitle ? `${workOrderCode} · ${workOrderTitle}` : workOrderCode) : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const shown: InvoiceShown = { amount: originalAmount, count: pendingItems.length };
    setServerError(null);
    setSaving(true);
    const result = await submit(dueDate);
    if (result.kind === "ignored") return;
    setSaving(false);
    if (result.kind === "invoiced") {
      onInvoiced(result.result, shown);
      return;
    }
    if (result.outcome.keepOpen) {
      setServerError(result.outcome.message);
      setRetryable(result.outcome.retry);
      return;
    }
    onFailed(result.outcome);
  }

  return (
    <Modal title="Faturar ordem de serviço" open onClose={saving ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {subtitle ? <p style={summaryStyle}>{subtitle}</p> : null}

        <div style={bodyStyle}>
          <Alert title="Será criado um título a receber." tone="info">
            Faturar cria um título a receber para o cliente desta OS. Os itens faturados não podem mais ser editados nem excluídos.
          </Alert>

          {serverError ? (
            <div role="alert">
              <Alert title="Não foi possível faturar" tone="danger">
                {serverError}
              </Alert>
            </div>
          ) : null}

          <h3 style={sectionTitleStyle}>Itens a faturar</h3>
          <ul style={listStyle}>
            {pendingItems.map((item) => (
              <li key={item.id} style={rowStyle}>
                <span>{item.description}</span>
                <span style={moneyStyle}>{formatMoney(item.totalAmount, item.currency)}</span>
              </li>
            ))}
          </ul>

          {originalAmount !== null ? (
            <div style={totalStyle}>
              <span>Valor do título</span>
              <span style={moneyStyle}>{formatMoney(originalAmount, currency)}</span>
            </div>
          ) : (
            <p style={statusStyle}>O valor do título é a soma destes itens, calculada pelo servidor no faturamento.</p>
          )}

          <Input
            id="invoice-due-date"
            type="date"
            label="Vencimento (opcional)"
            value={dueDate}
            helper={dueDate ? undefined : "em 30 dias (padrão)"}
            disabled={saving}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" style={touchTarget} onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" style={touchTarget} disabled={saving} aria-busy={saving ? "true" : undefined}>
            {saving ? "Faturando…" : retryable ? "Tentar de novo" : "Faturar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
