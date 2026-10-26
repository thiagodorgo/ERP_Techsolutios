import { ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Modal } from "../../../../components/ui";
import { formatBRL } from "../../titles/financial-titles.adapter";
import { financeErrorMessage } from "../finance-errors";
import type { TitleCheque } from "../financial-entries.types";
import { unlinkJustificationError } from "../useFinanceActions";

// B-SAN3-12b — TROCAR A VINCULAÇÃO do cheque (POST /cheques/:id/unlink-title, §4.3): ação de privilégio alto
// (`cheques:unlink_title`, do Administrador), com justificativa obrigatória de 10 a 500 caracteres e registro Crítico na
// auditoria (feito pelo servidor). Só aparece para quem tem a permissão (F6); o servidor recusa de qualquer forma.

export function DesvincularChequeModal({
  cheque,
  onClose,
  onConfirm,
}: {
  readonly cheque: TitleCheque;
  readonly onClose: () => void;
  readonly onConfirm: (justification: string) => Promise<void>;
}) {
  const [justification, setJustification] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const invalid = unlinkJustificationError(justification);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onConfirm(justification.trim());
    } catch (caught) {
      setError(financeErrorMessage(caught));
      setSending(false);
    }
  }

  return (
    <Modal title="Desvincular o cheque" open onClose={onClose}>
      <form onSubmit={submit} aria-label="Desvincular o cheque" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
        <div className="pat-banner pat-banner--warning" role="note">
          <ShieldAlert size={14} aria-hidden="true" />
          <span>Ação do administrador: fica registrada na auditoria como crítica, com a sua justificativa.</span>
        </div>
        <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>
          {`Cheque nº ${cheque.chequeNumber}${cheque.bank ? ` · ${cheque.bank}` : ""} · ${formatBRL(cheque.amount)}. Depois de desvinculado, o título pode ser recebido por outro meio; o cheque continua registrado em Cheques.`}
        </p>
        <label className="ui-field">
          <span>Justificativa</span>
          <textarea
            className="ui-input"
            name="justificativa"
            rows={3}
            maxLength={500}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            placeholder="Ex.: o cliente pagou por Pix e o cheque será devolvido."
          />
        </label>
        {error ? (
          <div className="ui-alert ui-alert--danger" role="alert">
            {error}
          </div>
        ) : null}
        <div className="pat-ab-detail-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="pat-btn" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="submit" className="pat-btn pat-btn--primary" disabled={sending}>
            {sending ? "Desvinculando…" : "Desvincular"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
