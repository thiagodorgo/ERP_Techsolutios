import { useMemo, useState } from "react";

import { Modal } from "../../../components/ui";
import type { PlatformOrganization, PlatformStatusReason } from "../platform.types";
import type { PlatformTenantDetailData } from "../platform-tenant-detail.types";

export const PLATFORM_STATUS_REASONS: readonly PlatformStatusReason[] = ["nonpayment", "customer_request", "security", "other"];
const REASON_LABELS: Record<PlatformStatusReason, string> = { nonpayment: "Inadimplência", customer_request: "Pedido do cliente", security: "Segurança", other: "Outro" };

export function activeUsersInDetail(detail: PlatformTenantDetailData): number {
  return detail.detail?.users.filter((user) => user.status === "active").length ?? 0;
}

export function OrganizationStatusDialog({ organization, detail, onClose, onConfirm }: { readonly organization: PlatformOrganization; readonly detail: PlatformTenantDetailData; readonly onClose: () => void; readonly onConfirm: (input: { status: "active" | "suspended"; reason: PlatformStatusReason }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState<PlatformStatusReason | "">("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validRead = detail.source === "api" && !detail.forbidden && !detail.notFound && detail.detail !== null;
  const count = activeUsersInDetail(detail);
  const target = organization.status === "suspended" ? "active" : "suspended";
  const valid = validRead && name.trim() === organization.name && reason !== "" && !sending;
  const consultedAt = useMemo(() => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date()), []);
  async function confirm() {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    try { await onConfirm({ status: target, reason }); }
    catch { setError("A organização mudou ou a alteração foi recusada. Atualize os dados e confirme novamente."); setSending(false); }
  }
  return <Modal title={target === "suspended" ? "Suspender organização" : "Reativar organização"} open onClose={onClose}>
    {!validRead ? <div className="ui-alert ui-alert--warning">Não foi possível consultar os usuários. Atualize antes de confirmar.</div> : <p><strong>{count} Usuários ativos no cadastro consultado</strong> às {consultedAt}.</p>}
    <p>A alteração impede o acesso e encerra sessões desta organização. A contagem representa cadastros ativos, não sessões online.</p>
    <label className="ui-field"><span>Digite o nome atual</span><input className="ui-input" value={name} onChange={(event) => setName(event.currentTarget.value)} autoComplete="off" /></label>
    <label className="ui-field"><span>Motivo</span><select className="ui-input" value={reason} onChange={(event) => setReason(event.currentTarget.value as PlatformStatusReason | "")}><option value="">Selecione</option>{PLATFORM_STATUS_REASONS.map((value) => <option key={value} value={value}>{REASON_LABELS[value]}</option>)}</select></label>
    {error ? <div role="alert" className="form-error">{error}</div> : null}
    <div className="platform-organizations__dialog-actions"><button type="button" className="pat-btn" onClick={onClose}>Cancelar</button><button type="button" className={target === "suspended" ? "pat-btn ui-button--danger" : "pat-btn pat-btn--primary"} disabled={!valid} onClick={() => void confirm()}>{sending ? "Salvando…" : "Confirmar"}</button></div>
  </Modal>;
}
