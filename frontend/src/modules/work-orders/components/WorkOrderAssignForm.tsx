import { useState } from "react";
import { UserRound } from "lucide-react";

import { Button, Input } from "../../../components/ui";

export function WorkOrderAssignForm({
  disabled,
  onSubmit,
}: {
  readonly disabled?: boolean;
  readonly onSubmit: (payload: { operatorId: string; userId?: string; message: string }) => Promise<void>;
}) {
  const [operatorId, setOperatorId] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("Atribuido ao operador informado.");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!operatorId.trim()) return;

    setSaving(true);
    await onSubmit({
      operatorId: operatorId.trim(),
      userId: userId.trim() || undefined,
      message,
    });
    setSaving(false);
  }

  return (
    <div className="work-order-action-form">
      <p className="work-order-helper">Informe o ID do operador/usuario. A selecao visual sera implementada na etapa de despacho.</p>
      <Input label="Operator ID" value={operatorId} onChange={(event) => setOperatorId(event.target.value)} disabled={disabled} placeholder="UUID do operador" />
      <Input label="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} disabled={disabled} placeholder="UUID do usuario, opcional" />
      <label className="ui-field">
        <span>Mensagem</span>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={disabled} />
      </label>
      <Button type="button" onClick={submit} disabled={disabled || saving || !operatorId.trim()}>
        <UserRound size={16} /> {saving ? "Atribuindo..." : "Atribuir operador"}
      </Button>
    </div>
  );
}
