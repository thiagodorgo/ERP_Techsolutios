import { useState } from "react";

import { errorText } from "../billing-ops.errors";
import { formatBRL } from "../billing-ops.money";
import { formatDay } from "../billing-ops.labels";
import type { Payment } from "../billing-ops.types";
import { ActionDialog, NoticeBox, ReasonField, reasonOk } from "./dialog.shared";
import { StatementSummary, type StatementDialogBase } from "./StatementDialogs";

// B-ASS-10c-OPERACAO · R-CONF — estornar a baixa manual. A 1ª tentativa NUNCA leva `confirmInvoiceCancel`; só depois de o
// servidor responder `invoice_cancel_confirmation_required` a janela mostra a caixa "Cancelar também a nota fiscal", e o
// reenvio leva `confirmInvoiceCancel: true` SÓ com a caixa marcada.

export function ReversePaymentDialog({ row, actions, payment, onClose, onDone }: StatementDialogBase & { readonly payment: Payment }) {
  const [reason, setReason] = useState("");
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [cancelInvoice, setCancelInvoice] = useState(false);
  const confirmInvoiceCancel = needsInvoice && cancelInvoice;
  return (
    <ActionDialog
      title="Estornar baixa"
      danger
      twoStep
      confirmLabel="Confirmar estorno"
      valid={reasonOk(reason) && (!needsInvoice || cancelInvoice)}
      form={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">
            Estornar a baixa de <b className="pat-mono">{formatBRL(payment.amount)}</b> de {formatDay(payment.paidAt)}. O saldo volta a ficar em aberto.
          </p>
          <ReasonField label="Motivo do estorno" help="Fica no histórico." value={reason} onChange={setReason} autoFocus />
          {needsInvoice ? (
            <>
              <label className="cb-dialog__check">
                <input type="checkbox" checked={cancelInvoice} onChange={(event) => setCancelInvoice(event.currentTarget.checked)} />
                <span>Cancelar também a nota fiscal deste mês</span>
              </label>
              <NoticeBox notice={{ tone: "danger", title: "O servidor pediu confirmação.", detail: errorText("invoice_cancel_confirmation_required") }} />
            </>
          ) : null}
        </>
      }
      review={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">
            Estornar <b className="pat-mono">{formatBRL(payment.amount)}</b>
            {confirmInvoiceCancel ? (
              <>
                {" "}
                e <b>cancelar a nota fiscal</b>
              </>
            ) : null}
            , com o motivo <b>“{reason.trim()}”</b>.
          </p>
        </>
      }
      onSubmit={() => actions.reversePayment({ tenantId: row.org.id, statementId: row.statement.id }, payment.id, confirmInvoiceCancel ? { reason: reason.trim(), confirmInvoiceCancel: true } : { reason: reason.trim() })}
      onSuccess={(value) => ({
        message: `Estorno registrado. ${value.invoiceCancelling ? "A nota fiscal entrou em cancelamento. " : value.invoiceKept ? "A nota fiscal fica: ainda há valor pago neste mês, e o contador é avisado. " : ""}A tela vai reler o demonstrativo.`,
      })}
      onRefusal={(reason) => {
        if (reason === "invoice_cancel_confirmation_required") {
          setNeedsInvoice(true);
          return "form-quiet";
        }
        return "final";
      }}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
