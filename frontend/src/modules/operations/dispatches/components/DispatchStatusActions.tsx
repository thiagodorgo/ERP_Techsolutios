import { useState } from "react";

import { Button, Select } from "../../../../components/ui";
import { getDispatchStatusLabel } from "../dispatches.adapter";
import { DISPATCH_STATUSES, type DispatchStatus } from "../dispatches.types";

export function DispatchStatusActions({
  currentStatus,
  canCancel,
  disabled,
  onSubmit,
}: {
  readonly currentStatus: DispatchStatus;
  readonly canCancel: boolean;
  readonly disabled?: boolean;
  readonly onSubmit: (payload: { status: DispatchStatus; observation: string; reason?: string }) => Promise<void>;
}) {
  const [status, setStatus] = useState<DispatchStatus>(currentStatus);
  const [observation, setObservation] = useState("Status atualizado pela operacao.");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const options = DISPATCH_STATUSES.filter((item) => item !== "cancelled" || canCancel);

  async function submit() {
    setSaving(true);
    await onSubmit({
      status,
      observation,
      ...(status === "cancelled" ? { reason } : {}),
    });
    setSaving(false);
  }

  return (
    <div className="work-order-action-form">
      <Select label="Novo status" value={status} onChange={(event) => setStatus(event.target.value as DispatchStatus)} disabled={disabled}>
        {options.map((item) => (
          <option key={item} value={item}>{getDispatchStatusLabel(item)}</option>
        ))}
      </Select>
      <label className="ui-field">
        <span>Observacao</span>
        <textarea value={observation} onChange={(event) => setObservation(event.target.value)} disabled={disabled} />
      </label>
      {status === "cancelled" ? (
        <label className="ui-field">
          <span>Motivo do cancelamento</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={disabled} />
        </label>
      ) : null}
      <Button type="button" onClick={submit} disabled={disabled || saving || (status === "cancelled" && !reason.trim())}>
        {saving ? "Atualizando..." : status === "cancelled" ? "Cancelar despacho" : "Alterar status"}
      </Button>
    </div>
  );
}
