import { useState } from "react";
import { Modal } from "../../../components/ui";
import type { PlatformOrganization } from "../platform.types";

export function OrganizationEditNameDialog({ organization, onClose, onConfirm }: { readonly organization: PlatformOrganization; readonly onClose: () => void; readonly onConfirm: (name: string) => Promise<void> }) {
  const [name, setName] = useState(organization.name);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() { const value = name.trim(); if (!value || sending) return; setSending(true); setError(null); try { await onConfirm(value); } catch { setError("Já existe uma organização com esse nome neste grupo ou a alteração foi recusada."); setSending(false); } }
  return <Modal title="Editar nome" open onClose={onClose}><label className="ui-field"><span>Nome da organização</span><input className="ui-input" value={name} onChange={(event) => setName(event.currentTarget.value)} maxLength={160} /></label>{error ? <div role="alert" className="form-error">{error}</div> : null}<div className="platform-organizations__dialog-actions"><button type="button" className="pat-btn" onClick={onClose}>Cancelar</button><button type="button" className="pat-btn pat-btn--primary" disabled={!name.trim() || sending} onClick={() => void save()}>Salvar nome</button></div></Modal>;
}
