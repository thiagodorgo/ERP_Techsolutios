import { useState, type FormEvent } from "react";

import { Modal } from "../../../../components/ui";
import { financeErrorMessage } from "../../entries/finance-errors";
import { parseMoneyInput } from "../../entries/useFinanceActions";
import type { CreateFinancialAccountPayload, FinancialAccount, FinancialAccountKind } from "../financial-accounts.types";

// B-SAN3-12b — cadastro de CONTA (POST /financial-accounts, `financial_accounts:create`). Só BRL (o servidor decide a
// moeda). Saldo inicial opcional; vazio não é enviado. Erro do servidor vira mensagem PT-BR; a janela só fecha no sucesso.

export function NovaContaModal({
  onClose,
  onCreate,
  onCreated,
}: {
  readonly onClose: () => void;
  readonly onCreate: (payload: CreateFinancialAccountPayload) => Promise<FinancialAccount>;
  readonly onCreated: (account: FinancialAccount) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FinancialAccountKind>("bank");
  const [opening, setOpening] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Dê um nome à conta.");
      return;
    }
    const openingValue = opening.trim() === "" ? undefined : parseMoneyInput(opening);
    if (openingValue !== undefined && !(Number.isFinite(openingValue) && openingValue >= 0)) {
      setError("O saldo inicial precisa ser um valor igual ou maior que zero.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const account = await onCreate({ name: trimmed, kind, ...(openingValue !== undefined ? { opening_balance: openingValue } : {}) });
      onCreated(account);
    } catch (caught) {
      setError(financeErrorMessage(caught));
      setSending(false);
    }
  }

  return (
    <Modal title="Nova conta" open onClose={onClose}>
      <form onSubmit={submit} aria-label="Nova conta" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
        <label className="ui-field">
          <span>Nome da conta</span>
          <input className="ui-input" name="nome" value={name} maxLength={160} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Banco do Brasil — conta movimento" />
        </label>
        <label className="ui-field">
          <span>Tipo</span>
          <select className="ui-input" name="tipo" value={kind} onChange={(event) => setKind(event.target.value as FinancialAccountKind)}>
            <option value="bank">Conta bancária</option>
            <option value="cash">Caixa</option>
            <option value="wallet">Carteira digital</option>
          </select>
        </label>
        <label className="ui-field">
          <span>Saldo inicial (opcional)</span>
          <input className="ui-input" name="saldo_inicial" inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} placeholder="0,00" />
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
            {sending ? "Cadastrando…" : "Cadastrar conta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
