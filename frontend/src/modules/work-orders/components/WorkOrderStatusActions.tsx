import { useState } from "react";

import { Button, Select } from "../../../components/ui";
import { getWorkOrderStatusLabel } from "../work-orders.adapter";
import { WORK_ORDER_STATUSES, type WorkOrderStatus } from "../work-orders.types";

export function WorkOrderStatusActions({
  currentStatus,
  disabled,
  onSubmit,
}: {
  readonly currentStatus: WorkOrderStatus;
  readonly disabled?: boolean;
  readonly onSubmit: (payload: { status: WorkOrderStatus; message: string; cancellationReason?: string }) => Promise<void>;
}) {
  const [status, setStatus] = useState<WorkOrderStatus>(currentStatus);
  const [message, setMessage] = useState("Operador iniciou deslocamento.");
  const [cancellationReason, setCancellationReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSubmit({
      status,
      message,
      ...(status === "cancelled" ? { cancellationReason } : {}),
    });
    setSaving(false);
  }

  return (
    <div className="work-order-action-form">
      <Select label="Novo status" value={status} onChange={(event) => setStatus(event.target.value as WorkOrderStatus)} disabled={disabled}>
        {WORK_ORDER_STATUSES.map((item) => (
          <option key={item} value={item}>{getWorkOrderStatusLabel(item)}</option>
        ))}
      </Select>
      <label className="ui-field">
        <span>Mensagem</span>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={disabled} />
      </label>
      {status === "cancelled" ? (
        <label className="ui-field">
          <span>Motivo do cancelamento</span>
          <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} disabled={disabled} />
        </label>
      ) : null}
      <Button type="button" onClick={submit} disabled={disabled || saving}>
        {saving ? "Atualizando..." : "Alterar status"}
      </Button>
    </div>
  );
}
