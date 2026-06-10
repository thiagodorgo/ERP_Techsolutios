import { useEffect, useState } from "react";

import { Alert, Button, Input, Select } from "../../../../components/ui";
import { validateDispatchCreate } from "../dispatches.adapter";

export function DispatchCreateForm({
  disabled,
  initialWorkOrderId = "",
  initialOperatorUserId = "",
  onSubmit,
}: {
  readonly disabled?: boolean;
  readonly initialWorkOrderId?: string;
  readonly initialOperatorUserId?: string;
  readonly onSubmit: (payload: { workOrderId: string; operatorUserId: string; status: "draft" | "assigned"; observation: string }) => Promise<void>;
}) {
  const [workOrderId, setWorkOrderId] = useState(initialWorkOrderId);
  const [operatorUserId, setOperatorUserId] = useState(initialOperatorUserId);
  const [status, setStatus] = useState<"draft" | "assigned">("assigned");
  const [observation, setObservation] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWorkOrderId(initialWorkOrderId);
  }, [initialWorkOrderId]);

  useEffect(() => {
    setOperatorUserId(initialOperatorUserId);
  }, [initialOperatorUserId]);

  async function submit() {
    const nextErrors = validateDispatchCreate({ workOrderId, operatorUserId });
    setErrors(nextErrors);
    if (nextErrors.length) return;

    setSaving(true);
    await onSubmit({ workOrderId, operatorUserId, status, observation });
    setSaving(false);
    setWorkOrderId("");
    setOperatorUserId("");
    setObservation("");
  }

  return (
    <div className="work-order-action-form">
      {errors.length ? (
        <Alert title="Revise o despacho" tone="warning">
          {errors.join(" ")}
        </Alert>
      ) : null}
      <Input label="OS" value={workOrderId} onChange={(event) => setWorkOrderId(event.target.value)} disabled={disabled} placeholder="workOrderId" />
      <Input label="Operador" value={operatorUserId} onChange={(event) => setOperatorUserId(event.target.value)} disabled={disabled} placeholder="operatorUserId" />
      <Select label="Status inicial" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "assigned")} disabled={disabled}>
        <option value="assigned">Atribuido</option>
        <option value="draft">Rascunho</option>
      </Select>
      <label className="ui-field">
        <span>Observacao</span>
        <textarea value={observation} onChange={(event) => setObservation(event.target.value)} disabled={disabled} />
      </label>
      <Button type="button" onClick={submit} disabled={disabled || saving}>
        {saving ? "Criando..." : "Criar despacho"}
      </Button>
    </div>
  );
}
