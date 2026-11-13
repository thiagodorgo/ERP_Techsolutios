import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import type { FinancialAccount } from "../../accounts/financial-accounts.types";
import { parseMoneyInput, titleOpenBalance } from "../../entries/useFinanceActions";
import { useFinancialTitles } from "../../titles/useFinancialTitles";
import { directionLabel } from "../cheque-actions";
import { formatMoney } from "../cheque-cash-impact";
import type { Cheque, ChequeDirection, EditChequePayload, RegisterChequePayload } from "../cheques.types";

// B-SAN3-24 (24a) — registrar e editar cheque. REGISTRAR (`POST /cheques`): conta ativa, direção, número, banco, valor,
// "bom para", observações e título opcional (o servidor exige valor IGUAL ao saldo em aberto do título). EDITAR
// (`PATCH /cheques/:id`, só registrado): o servidor só altera número, banco, "bom para", observações e o 1º vínculo;
// valor, conta e direção ele ignora com 200 (N-04 da crítica r2), por isso aqui eles aparecem só para leitura e nunca vão
// no corpo. Cheque já vinculado não manda `title_id` (R-VINCULO (iv)): tirar ou trocar o título é do Financeiro.

const field: CSSProperties = { display: "grid", gap: 5, fontSize: 12, fontWeight: 700, color: "#334155" };
const input: CSSProperties = { font: "inherit", fontWeight: 400, fontSize: 13, border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 10px", minHeight: 38 };

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <label style={field}>
      {label}
      {children}
    </label>
  );
}

function ReadOnly({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div style={field}>
      {label}
      <span style={{ ...input, background: "#F8FAFC", color: "#475569", display: "flex", alignItems: "center" }}>{value}</span>
    </div>
  );
}

export type ChequeFormSubmit =
  | { readonly mode: "register"; readonly payload: RegisterChequePayload }
  | { readonly mode: "edit"; readonly chequeId: string; readonly payload: EditChequePayload };

export function ChequeFormModal({
  cheque,
  accounts,
  busy,
  message,
  onSubmit,
  onCancel,
}: {
  /** null = registrar; um cheque = editar. */
  readonly cheque: Cheque | null;
  readonly accounts: readonly FinancialAccount[];
  readonly busy: boolean;
  readonly message: string | null;
  readonly onSubmit: (submit: ChequeFormSubmit) => void;
  readonly onCancel: () => void;
}) {
  const editing = cheque !== null;
  const activeAccounts = accounts.filter((account) => account.active);
  const [accountId, setAccountId] = useState(cheque?.accountId ?? activeAccounts[0]?.id ?? "");
  const [direction, setDirection] = useState<ChequeDirection>(cheque?.direction ?? "received");
  const [number, setNumber] = useState(cheque?.chequeNumber ?? "");
  const [bank, setBank] = useState(cheque?.bank ?? "");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(cheque?.dueDate ?? "");
  const [notes, setNotes] = useState(cheque?.notes ?? "");
  const [titleId, setTitleId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const linkable = !editing || cheque.titleId === null;
  const titleDirection = direction === "received" ? "receivable" : "payable";
  const titles = useFinancialTitles(titleDirection);
  const openTitles = useMemo(() => titles.items.filter((title) => title.status === "open" || title.status === "partially_paid"), [titles.items]);
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? "Conta não listada";

  function submit() {
    setLocalError(null);
    if (number.trim() === "" || bank.trim() === "") return setLocalError("Informe o número e o banco do cheque.");
    if (editing) {
      const payload: EditChequePayload = {
        cheque_number: number.trim(),
        bank: bank.trim(),
        due_date: dueDate === "" ? null : dueDate,
        notes: notes.trim() === "" ? null : notes.trim(),
        ...(linkable && titleId ? { title_id: titleId } : {}),
      };
      return onSubmit({ mode: "edit", chequeId: cheque.id, payload });
    }
    const value = parseMoneyInput(amount);
    if (!accountId) return setLocalError("Escolha a conta do cheque.");
    if (!Number.isFinite(value) || value <= 0) return setLocalError("Informe um valor maior que zero.");
    const payload: RegisterChequePayload = {
      account_id: accountId,
      direction,
      cheque_number: number.trim(),
      bank: bank.trim(),
      amount: value,
      ...(dueDate ? { due_date: dueDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(titleId ? { title_id: titleId } : {}),
    };
    return onSubmit({ mode: "register", payload });
  }

  return (
    <form
      style={{ display: "grid", gap: 12, color: "#0F172A" }}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {editing ? (
          <>
            <ReadOnly label="Conta" value={accountName(cheque.accountId)} />
            <ReadOnly label="Direção" value={directionLabel(cheque.direction)} />
          </>
        ) : (
          <>
            <Field label="Conta">
              <select style={input} value={accountId} onChange={(event) => setAccountId(event.currentTarget.value)}>
                {activeAccounts.length === 0 ? <option value="">Nenhuma conta ativa</option> : null}
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Direção">
              <select
                style={input}
                value={direction}
                onChange={(event) => {
                  setDirection(event.currentTarget.value as ChequeDirection);
                  setTitleId("");
                }}
              >
                <option value="received">A receber (recebido de cliente)</option>
                <option value="issued">A pagar (emitido a fornecedor)</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Número do cheque">
          <input style={input} value={number} maxLength={40} onChange={(event) => setNumber(event.currentTarget.value)} />
        </Field>
        <Field label="Banco">
          <input style={input} value={bank} maxLength={120} onChange={(event) => setBank(event.currentTarget.value)} />
        </Field>
        {editing ? (
          <ReadOnly label="Valor" value={formatMoney(cheque.amount)} />
        ) : (
          <Field label="Valor (R$)">
            <input style={input} value={amount} inputMode="decimal" placeholder="0,00" onChange={(event) => setAmount(event.currentTarget.value)} />
          </Field>
        )}
        <Field label="Bom para">
          <input style={input} type="date" value={dueDate} onChange={(event) => setDueDate(event.currentTarget.value)} />
        </Field>
      </div>
      {linkable ? (
        <Field label="Título (opcional — o cheque baixa o título ao compensar)">
          <select
            style={input}
            value={titleId}
            onChange={(event) => {
              const next = event.currentTarget.value;
              setTitleId(next);
              const chosen = openTitles.find((title) => title.id === next);
              if (chosen && !editing) setAmount(String(titleOpenBalance(chosen)).replace(".", ","));
            }}
          >
            <option value="">Sem título</option>
            {openTitles.map((title) => (
              <option key={title.id} value={title.id}>
                {`${title.document ?? "sem documento"} · ${title.partyName} · em aberto ${formatMoney(titleOpenBalance(title))}`}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <ReadOnly label="Título" value="Vinculado — trocar ou tirar o título é feito no Financeiro" />
      )}
      <Field label="Observações">
        <textarea style={{ ...input, resize: "vertical" }} rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
      </Field>
      {editing ? <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>Valor, conta e direção não mudam depois do registro.</p> : null}
      {localError || message ? (
        <p role="alert" className="pat-banner pat-banner--error" style={{ margin: 0 }}>
          {localError ?? message}
        </p>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="pat-btn" onClick={onCancel} disabled={busy}>
          Voltar
        </button>
        <button type="submit" className="pat-btn pat-btn--primary" disabled={busy}>
          {busy ? "Enviando…" : editing ? "Salvar alterações" : "Registrar cheque"}
        </button>
      </div>
    </form>
  );
}
