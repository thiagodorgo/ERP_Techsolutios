import { useState } from "react";

import { formatBRL, typedAmountToDecimal } from "../billing-ops.money";
import { capitalize, formatDay, METHOD_LABEL, monthLabel } from "../billing-ops.labels";
import { shiftDay } from "../billing-ops.service";
import type { Row } from "../billing-ops.state";
import type { ChargeMethod } from "../billing-ops.types";
import type { BillingOpsActions } from "../useBillingOpsActions";
import { ActionDialog, ChargeIdField, NoticeBox, ReasonField, reasonOk, CHARGE_ID, Summary } from "./dialog.shared";

// B-ASS-10c-OPERACAO — as janelas de escrita do demonstrativo (§3.2 do plano; textos da maquete aprovada, `DLG`): emitir
// cobrança, cancelar cobrança, cancelar cobrança vista só no provedor, registrar baixa manual e emitir nota. Cada uma faz
// UMA requisição com o `tenantId` da organização da linha (R-ORG); a de cobrança nunca leva valor (R-CORPO).

export type StatementDialogBase = {
  readonly row: Row;
  readonly actions: BillingOpsActions;
  readonly today: string;
  readonly channelOff: boolean | null;
  readonly invoiceOff: boolean | null;
  readonly onClose: () => void;
  readonly onDone: () => void;
  readonly onSeeChannel: () => void;
  readonly onCancelCharge: () => void;
};

const refOf = (row: Row) => ({ tenantId: row.org.id, statementId: row.statement.id });

export function StatementSummary({ row }: { readonly row: Row }) {
  return (
    <Summary
      items={[
        { label: "Organização", value: row.org.name },
        { label: "Mês", value: capitalize(monthLabel(row.statement.period)) },
        { label: "Saldo (do servidor)", value: formatBRL(row.statement.balance) },
      ]}
    />
  );
}

// ---- emitir cobrança (confirmação forte, emenda 1 E2) -------------------------------------------------------------------
export function ChargeDialog({ row, actions, today, channelOff, onClose, onDone, onSeeChannel }: StatementDialogBase) {
  const [method, setMethod] = useState<ChargeMethod>("pix");
  const [dueDate, setDueDate] = useState("");
  const [checked, setChecked] = useState(false);
  const due = row.statement.dueDate ? row.statement.dueDate.slice(0, 10) : null;
  const pastDue = due !== null && due < today;
  const maxDay = shiftDay(today, 60);
  const valid = !pastDue || (dueDate >= today && dueDate <= maxDay);
  return (
    <ActionDialog
      title="Emitir cobrança"
      twoStep
      confirmLabel="Confirmar envio"
      valid={valid}
      reviewValid={checked}
      form={
        <>
          <StatementSummary row={row} />
          <fieldset className="ui-field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Forma de pagamento</legend>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(Object.keys(METHOD_LABEL) as ChargeMethod[]).map((key) => (
                <label key={key} className="cb-dialog__check" style={{ minWidth: 150 }}>
                  <input type="radio" name="forma" value={key} checked={method === key} onChange={() => setMethod(key)} data-autofoco={key === "pix" ? "" : undefined} />
                  <span>{METHOD_LABEL[key]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {pastDue ? (
            <label className="ui-field">
              <span>
                Novo vencimento <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span>
              </span>
              <input className="ui-input" type="date" min={today} max={maxDay} value={dueDate} onChange={(event) => setDueDate(event.currentTarget.value)} />
              <small>O vencimento de {formatDay(due)} já passou. Escolha entre hoje e 60 dias.</small>
            </label>
          ) : (
            <p className="cb-dialog__text">Vencimento do demonstrativo: {formatDay(due)}.</p>
          )}
          <NoticeBox notice={{ tone: "info", title: "O valor é o do demonstrativo.", detail: "A tela não manda valor: quem monta a cobrança é o servidor, com o saldo dele." }} />
          {channelOff ? <NoticeBox notice={{ tone: "warning", title: "O canal de pagamento está desligado.", detail: "O servidor vai recusar o envio até o canal ser ligado." }} /> : null}
        </>
      }
      review={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">
            Enviar uma cobrança por <b>{METHOD_LABEL[method]}</b> com o saldo do demonstrativo, vencendo em <b>{formatDay(pastDue ? dueDate : due)}</b>. A organização recebe o aviso do provedor.
          </p>
          <label className="cb-dialog__check">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.currentTarget.checked)} data-autofoco="" />
            <span>
              Conferi a organização e o saldo: <b>{row.org.name}</b>, <b>{formatBRL(row.statement.balance)}</b>
            </span>
          </label>
        </>
      }
      onSubmit={() => actions.requestCharge(refOf(row), pastDue ? { method, dueDate } : { method })}
      onSuccess={() => ({ message: "Cobrança enviada para a fila de envio. A tela vai reler o demonstrativo." })}
      refusalExtra={(reason) =>
        reason === "payment_provider_disabled" ? (
          <button type="button" className="pat-btn" onClick={onSeeChannel}>
            Ver o canal
          </button>
        ) : null
      }
      onClose={onClose}
      onDone={onDone}
    />
  );
}

// ---- cancelar cobrança ----------------------------------------------------------------------------------------------------
export function CancelChargeDialog({ row, actions, onClose, onDone }: StatementDialogBase) {
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      title="Cancelar cobrança"
      danger
      twoStep
      confirmLabel="Confirmar cancelamento"
      valid={reasonOk(reason)}
      form={
        <>
          <StatementSummary row={row} />
          <ReasonField label="Motivo do cancelamento" help="Fica no histórico do demonstrativo." value={reason} onChange={setReason} autoFocus />
          <NoticeBox notice={{ tone: "warning", title: "A cobrança deixa de valer no provedor.", detail: "O demonstrativo continua com saldo; depois é possível emitir outra cobrança ou registrar a baixa." }} />
        </>
      }
      review={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">
            Cancelar a cobrança aberta, com o motivo: <b>“{reason.trim()}”</b>.
          </p>
        </>
      }
      onSubmit={() => actions.cancelCharge(refOf(row), reason.trim())}
      onSuccess={() => ({ message: "Cancelamento pedido. A tela vai reler o demonstrativo." })}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

// ---- cancelar cobrança vista só no provedor ---------------------------------------------------------------------------------
export function CancelUnknownChargeDialog({ row, actions, onClose, onDone }: StatementDialogBase) {
  const [chargeId, setChargeId] = useState("");
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      title="Cancelar cobrança vista só no provedor"
      danger
      twoStep
      confirmLabel="Confirmar cancelamento"
      valid={CHARGE_ID.test(chargeId) && reasonOk(reason)}
      form={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">Use quando o painel do provedor mostra uma cobrança deste demonstrativo que não aparece aqui (por exemplo, criada numa tentativa que não teve resposta).</p>
          <ChargeIdField value={chargeId} onChange={setChargeId} />
          <ReasonField label="Motivo" help="Fica no histórico." value={reason} onChange={setReason} />
        </>
      }
      review={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">
            Pedir ao provedor o cancelamento da cobrança com o código digitado, com o motivo <b>“{reason.trim()}”</b>.
          </p>
        </>
      }
      onSubmit={() => actions.cancelUnknownCharge(refOf(row), chargeId, reason.trim())}
      onSuccess={() => ({ message: "Pedido de cancelamento enviado para a fila. A tela vai reler o demonstrativo." })}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

// ---- registrar baixa manual (R-VALOR) -----------------------------------------------------------------------------------------
export function PaymentDialog({ row, actions, onClose, onDone, onCancelCharge }: StatementDialogBase) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const parsed = amount === "" ? null : typedAmountToDecimal(amount);
  return (
    <ActionDialog
      title="Registrar baixa manual"
      twoStep
      confirmLabel="Confirmar baixa"
      valid={parsed !== null && parsed.ok}
      form={
        <>
          <StatementSummary row={row} />
          <label className="ui-field">
            <span>
              Valor recebido <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span>
            </span>
            <input
              className="ui-input pat-mono"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ex.: 1.234,56"
              value={amount}
              onChange={(event) => setAmount(event.currentTarget.value)}
              aria-invalid={parsed && !parsed.ok ? "true" : undefined}
              aria-describedby={parsed && !parsed.ok ? "baixa-valor-erro" : undefined}
              data-autofoco=""
              data-campo="valor"
            />
            {parsed && !parsed.ok ? (
              <span className="form-error" id="baixa-valor-erro" role="alert">
                {parsed.message}
              </span>
            ) : (
              <small>Até o saldo: {formatBRL(row.statement.balance)}.</small>
            )}
          </label>
          <label className="ui-field">
            <span>Forma</span>
            <input className="ui-input" maxLength={40} placeholder="Pix na conta, transferência…" value={method} onChange={(event) => setMethod(event.currentTarget.value)} />
            <small>Opcional, até 40 caracteres.</small>
          </label>
          <label className="ui-field">
            <span>Observação</span>
            <textarea className="ui-input" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.currentTarget.value)} />
            <small>Opcional. Ex.: onde está o comprovante.</small>
          </label>
          {row.chargeAlive ? <NoticeBox notice={{ tone: "warning", title: "Há uma cobrança aberta no provedor.", detail: "Se a baixa for do valor cheio, cancele a cobrança depois, para não cobrar duas vezes." }} /> : null}
        </>
      }
      review={
        parsed && parsed.ok ? (
          <>
            <StatementSummary row={row} />
            <p className="cb-dialog__text">
              Registrar o recebimento de <b className="pat-mono">{formatBRL(parsed.value)}</b> em <b>{row.org.name}</b>, {monthLabel(row.statement.period)}
              {method.trim() ? `, por ${method.trim()}` : ""}.
            </p>
            <NoticeBox notice={{ tone: "info", title: "Confira o valor.", detail: "A tela grava exatamente o valor digitado; o novo saldo vem do servidor." }} />
          </>
        ) : null
      }
      onSubmit={() => {
        if (!parsed || !parsed.ok) return Promise.resolve({ ok: false as const, reason: "invalid_amount" });
        return actions.registerPayment(refOf(row), { amount: parsed.value, ...(method.trim() ? { method: method.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      }}
      onSuccess={(value) =>
        value.fullAmountChargeOpen
          ? {
              message: "Baixa registrada. A tela vai reler o demonstrativo, com o saldo do servidor.",
              warning: "Ainda há cobrança do valor cheio aberta no provedor. Cancele-a para não cobrar duas vezes.",
              extra: { label: "Cancelar cobrança", onClick: onCancelCharge },
            }
          : { message: "Baixa registrada. A tela vai reler o demonstrativo, com o saldo do servidor." }
      }
      onClose={onClose}
      onDone={onDone}
    />
  );
}

// ---- emitir ou reemitir nota ----------------------------------------------------------------------------------------------------
export function InvoiceDialog({ row, actions, invoiceOff, onClose, onDone }: StatementDialogBase) {
  const reissue = row.statement.invoiceStatus === "authorized" || row.statement.invoiceStatus === "rejected" || row.statement.invoiceStatus === "cancelled";
  return (
    <ActionDialog
      title="Emitir nota fiscal"
      confirmLabel={reissue ? "Reemitir nota" : "Emitir nota"}
      valid
      form={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">{reissue ? "Pedir uma nova emissão da nota deste demonstrativo." : "Pedir a emissão da nota deste demonstrativo pago."}</p>
          {invoiceOff ? <NoticeBox notice={{ tone: "warning", title: "O provedor de nota está desligado.", detail: "O pedido fica na fila até ele ser ligado." }} /> : null}
        </>
      }
      onSubmit={() => actions.requestInvoice(refOf(row))}
      onSuccess={(value) => ({ message: value.providerDisabled ? "A nota fica na fila até o provedor de nota ser ligado." : "Nota enviada para a fila de emissão." })}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
