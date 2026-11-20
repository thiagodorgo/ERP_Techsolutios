import { useState } from "react";

import { QUEUE_KIND_LABEL, formatDateTime } from "../billing-ops.labels";
import { shiftDay } from "../billing-ops.service";
import type { QueueLine } from "../billing-ops.types";
import { ActionDialog, CHARGE_ID, ChargeIdField, NoticeBox, ReasonField, reasonOk } from "./dialog.shared";
import { StatementSummary, type StatementDialogBase } from "./StatementDialogs";
import { queueReason } from "./queueText";

// B-ASS-10c-OPERACAO — as janelas da fila de envio (§3.2): resolver a linha em revisão, reprocessar a linha com falha e
// confirmar o cancelamento feito no painel do provedor (rota nova do #608). O `tenantId` é o da organização da LINHA
// (R-ORG: a janela recebe a linha já com a organização dela).

type QueueDialogProps = StatementDialogBase & { readonly line: QueueLine };
const withOrg = (props: QueueDialogProps) => ({ ...props.line, tenantId: props.row.org.id });

function LineBox({ line }: { readonly line: QueueLine }) {
  return (
    <NoticeBox
      notice={{
        tone: line.status === "NEEDS_REVIEW" ? "warning" : "danger",
        title: `${QUEUE_KIND_LABEL[line.kind]} · ${formatDateTime(line.updatedAt ?? line.occurredAt)}`,
        detail: queueReason(line),
      }}
    />
  );
}

export function ResolveQueueDialog(props: QueueDialogProps) {
  const { row, line, actions, onClose, onDone } = props;
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      title="Resolver linha da fila"
      confirmLabel="Resolver"
      valid={reasonOk(reason)}
      form={
        <>
          <StatementSummary row={row} />
          <LineBox line={line} />
          <ReasonField label="Como foi resolvido" help="Fica no histórico." value={reason} onChange={setReason} autoFocus />
        </>
      }
      onSubmit={() => actions.resolveQueueLine(withOrg(props), reason.trim())}
      onSuccess={() => ({ message: "Linha resolvida. A tela vai reler a fila." })}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

export function RetryQueueDialog(props: QueueDialogProps) {
  const { row, line, actions, today, onClose, onDone } = props;
  const [dueDate, setDueDate] = useState("");
  const maxDay = shiftDay(today, 60);
  const takesDueDate = line.kind === "charge_create";
  const valid = !dueDate || (dueDate >= today && dueDate <= maxDay);
  return (
    <ActionDialog
      title="Reprocessar linha da fila"
      confirmLabel="Reprocessar"
      valid={valid}
      form={
        <>
          <StatementSummary row={row} />
          <LineBox line={line} />
          {takesDueDate ? (
            <label className="ui-field">
              <span>Novo vencimento (opcional)</span>
              <input className="ui-input" type="date" min={today} max={maxDay} value={dueDate} onChange={(event) => setDueDate(event.currentTarget.value)} data-autofoco="" />
              <small>Entre hoje e 60 dias. Só vale se a cobrança for criada agora.</small>
            </label>
          ) : null}
        </>
      }
      onSubmit={() => actions.retryQueueLine(withOrg(props), takesDueDate && dueDate ? dueDate : undefined)}
      onSuccess={(value) => ({ message: "Linha de volta para a fila de envio. A tela vai reler a fila.", ...(value.dueDateOnlyIfCreated ? { warning: "A nova data só vale se a cobrança for criada agora." } : {}) })}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

export function ConfirmCancelledDialog(props: QueueDialogProps) {
  const { row, actions, onClose, onDone } = props;
  const [chargeId, setChargeId] = useState("");
  const [reason, setReason] = useState("");
  return (
    <ActionDialog
      title="Confirmar cancelamento feito no provedor"
      twoStep
      confirmLabel="Confirmar"
      valid={CHARGE_ID.test(chargeId) && reasonOk(reason)}
      form={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">Se a cobrança já aparece cancelada no painel do provedor, digite o código dela. O servidor confere com a linha da fila.</p>
          <ChargeIdField value={chargeId} onChange={setChargeId} />
          <ReasonField label="Motivo" help="Fica no histórico." value={reason} onChange={setReason} />
        </>
      }
      review={
        <>
          <StatementSummary row={row} />
          <p className="cb-dialog__text">Registrar que a cobrança foi cancelada no provedor e tirar a linha da revisão.</p>
        </>
      }
      onSubmit={() => actions.confirmCancelled(withOrg(props), chargeId, reason.trim())}
      onSuccess={() => ({ message: "Cancelamento confirmado. A linha saiu da revisão." })}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
