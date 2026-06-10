import { useState } from "react";

import { Button, Input } from "../../../../components/ui";

export function DispatchReassignForm({
  currentOperatorUserId,
  disabled,
  onSubmit,
}: {
  readonly currentOperatorUserId: string;
  readonly disabled?: boolean;
  readonly onSubmit: (payload: { operatorUserId: string; observation: string; reason: string }) => Promise<void>;
}) {
  const [operatorUserId, setOperatorUserId] = useState("");
  const [observation, setObservation] = useState("Despacho reatribuido pela operacao.");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSubmit({ operatorUserId, observation, reason });
    setSaving(false);
    setOperatorUserId("");
    setReason("");
  }

  return (
    <div className="work-order-action-form">
      <Input label="Operador atual" value={currentOperatorUserId} disabled />
      <Input label="Novo operador" value={operatorUserId} onChange={(event) => setOperatorUserId(event.target.value)} disabled={disabled} placeholder="UUID ou user ID" />
      <label className="ui-field">
        <span>Observacao</span>
        <textarea value={observation} onChange={(event) => setObservation(event.target.value)} disabled={disabled} />
      </label>
      <label className="ui-field">
        <span>Motivo</span>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} disabled={disabled} />
      </label>
      <Button type="button" onClick={submit} disabled={disabled || saving || !operatorUserId.trim()}>
        {saving ? "Reatribuindo..." : "Reatribuir despacho"}
      </Button>
    </div>
  );
}
