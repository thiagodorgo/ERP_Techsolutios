import { Banknote, CheckCircle2, Copy } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { FinancialAccount } from "../../accounts/financial-accounts.types";
import { formatBRL } from "../../titles/financial-titles.adapter";
import type { BaixaPaymentMethod, FinancialTitle, PayFinancialTitlePayload } from "../../titles/financial-titles.types";
import { financeErrorMessage, financeErrorReason } from "../finance-errors";
import type { TitleCheque, UnlinkResult } from "../financial-entries.types";
import { BAIXA_PAYMENT_METHODS, formatMoneyInput, newClientActionId, payPayloadFor, titleOpenBalance } from "../useFinanceActions";
import { DesvincularChequeModal } from "./DesvincularChequeModal";
import { localIsoDate } from "../../pages/financeiro.state";

// B-SAN3-12b — a BAIXA (registrar recebimento/pagamento) de um título, pela rota real POST /financial-titles/:id/pay (F1).
//   • F2: o `client_action_id` nasce quando o formulário abre e se repete em TODO reenvio dele; formulário novo, id novo.
//   • F3: depois de qualquer não-sucesso (409, 422, rede) a tela RELÊ o título antes de falar, e o reenvio fica travado
//     até a releitura voltar. Se a releitura mostra que o servidor já registrou, a tela diz isso — não pede outra baixa.
//   • F5: os meios são Pix, Transferência, Boleto, Dinheiro e Cartão — nunca cheque; o aviso fixo do cheque fica.
//   • F6/F21: 422 `title_has_pending_cheque` vira o bloco do cheque (valor e nº, lidos de GET /cheques?title_id=), SEM
//     campo de valor. Com `cheques:unlink_title`: "Desvincular o cheque" (justificativa → POST /unlink-title → a baixa
//     reabre). Sem: o pedido pronto para o administrador (v1 sem fila persistida — `P-SAN3-12-FILA-PEDIDO-DESVINCULO`).
//   • E2/R5 (R-res-3 e R-res-6 do plano): depois de desvincular um cheque REGISTRADO, quem tem `cheques:update` vê
//     "Cancelar o cheque nº X" em dois passos (POST /cheques/:id/cancel, sem corpo) — assim o mesmo dinheiro não entra
//     duas vezes. Cheque já depositado não oferece cancelar (ainda pode compensar); quem não tem a permissão recebe o aviso
//     para pedir a quem administra os cheques.

type ChequeFollowUp = {
  readonly cheque: TitleCheque;
  readonly stage: "offer" | "confirm" | "sending";
  readonly error: string | null;
};

type Phase = "form" | "sending" | "rereading" | "reread_failed" | "pending_cheque" | "done" | "already" | "closed";

export type BaixaActions = {
  readonly pay: (titleId: string, payload: PayFinancialTitlePayload) => Promise<FinancialTitle | null>;
  readonly rereadTitle: (titleId: string) => Promise<FinancialTitle>;
  readonly listPendingCheques: (titleId: string) => Promise<TitleCheque[]>;
  readonly unlinkCheque: (chequeId: string, justification: string) => Promise<UnlinkResult>;
  readonly cancelCheque: (chequeId: string) => Promise<void>;
};

function requestText(title: FinancialTitle, cheques: readonly TitleCheque[]): string {
  const doc = title.document ? `${title.document} (${title.partyName})` : title.partyName;
  const lista = cheques.map((c) => `cheque nº ${c.chequeNumber}${c.bank ? ` (${c.bank})` : ""} de ${formatBRL(c.amount)}`).join("; ");
  return [
    "Pedido de troca da vinculação do cheque",
    `Título: ${doc}, saldo em aberto ${formatBRL(titleOpenBalance(title))}.`,
    `Cheque vinculado aguardando compensação: ${lista}.`,
    "Motivo: o pagamento será feito por outro meio. Peço que o cheque seja desvinculado do título.",
  ].join("\n");
}

export function BaixaForm({
  title,
  accounts,
  canUnlinkCheque,
  canCancelCheque,
  actions,
  onDone,
  onClose,
}: {
  readonly title: FinancialTitle;
  readonly accounts: readonly FinancialAccount[];
  readonly canUnlinkCheque: boolean;
  /** `cheques:update` — o gate exato da rota POST /cheques/:id/cancel (CE-G2). */
  readonly canCancelCheque: boolean;
  readonly actions: BaixaActions;
  readonly onDone: (title: FinancialTitle) => void;
  readonly onClose: () => void;
}) {
  const receivable = title.direction === "receivable";
  const [clientActionId] = useState(newClientActionId);
  const [current, setCurrent] = useState(title);
  const [accountId, setAccountId] = useState("");
  const [amountText, setAmountText] = useState(() => formatMoneyInput(titleOpenBalance(title)));
  const [date, setDate] = useState(() => localIsoDate());
  const [method, setMethod] = useState<BaixaPaymentMethod>("pix");
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cheques, setCheques] = useState<readonly TitleCheque[]>([]);
  const [unlinking, setUnlinking] = useState<TitleCheque | null>(null);
  const [followUp, setFollowUp] = useState<ChequeFollowUp | null>(null);
  const [copied, setCopied] = useState(false);

  const activeAccounts = accounts.filter((account) => account.active);
  const locked = phase === "sending" || phase === "rereading" || phase === "reread_failed";

  async function reread(): Promise<FinancialTitle | null> {
    try {
      const fresh = await actions.rereadTitle(title.id);
      setCurrent(fresh);
      return fresh;
    } catch {
      return null;
    }
  }

  async function settleAfterFailure(error: unknown, before: FinancialTitle) {
    setPhase("rereading");
    const fresh = await reread();
    if (!fresh) {
      setMessage(financeErrorMessage(error));
      setPhase("reread_failed");
      return;
    }
    if (fresh.paidAmount > before.paidAmount) {
      setPhase("already");
      onDone(fresh);
      return;
    }
    const reason = financeErrorReason(error);
    if (reason === "title_has_pending_cheque") {
      let pending: TitleCheque[] = [];
      try {
        pending = await actions.listPendingCheques(title.id);
      } catch {
        pending = [];
      }
      setCheques(pending);
      setMessage(null);
      setPhase("pending_cheque");
      return;
    }
    setMessage(financeErrorMessage(error));
    setPhase(reason === "title_already_paid" || reason === "title_cancelled" || fresh.status === "paid" || fresh.status === "cancelled" ? "closed" : "form");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (phase !== "form") return;
    const payload = payPayloadFor({ accountId, amountText, date, method }, clientActionId);
    if (!payload) {
      setMessage(!accountId ? "Escolha a conta." : "Informe um valor maior que zero e a data.");
      return;
    }
    setMessage(null);
    setPhase("sending");
    const before = current;
    try {
      const paid = await actions.pay(title.id, payload);
      setPhase("done");
      onDone(paid ?? current);
    } catch (error) {
      await settleAfterFailure(error, before);
    }
  }

  async function retryReread() {
    setPhase("rereading");
    const fresh = await reread();
    setPhase(fresh ? "form" : "reread_failed");
  }

  async function confirmUnlink(cheque: TitleCheque, justification: string) {
    const result = await actions.unlinkCheque(cheque.id, justification);
    setUnlinking(null);
    const fresh = await reread();
    if (fresh) setAmountText(formatMoneyInput(titleOpenBalance(fresh)));
    const numero = cheque.chequeNumber;
    const deposited = result.stillDepositable || cheque.status === "deposited" || result.cheque.status === "deposited";
    if (deposited) {
      setFollowUp(null);
      setNotice(`Cheque nº ${numero} desvinculado deste título. Atenção: ele já estava depositado e ainda pode compensar — confira com o banco antes de receber por outro meio.`);
    } else {
      setFollowUp(canCancelCheque ? { cheque, stage: "offer", error: null } : null);
      setNotice(
        `Cheque nº ${numero} desvinculado deste título. Se ele não vai mais ser usado, cancele-o agora: assim o dinheiro não entra duas vezes.` +
          (canCancelCheque ? "" : ` Peça a quem administra os cheques para cancelar o cheque nº ${numero}.`),
      );
    }
    setPhase("form");
  }

  async function confirmCancelCheque(target: TitleCheque) {
    setFollowUp({ cheque: target, stage: "sending", error: null });
    try {
      await actions.cancelCheque(target.id);
      setFollowUp(null);
      setNotice(`Cheque nº ${target.chequeNumber} cancelado. Ele não entra mais no caixa.`);
    } catch (error) {
      setFollowUp({ cheque: target, stage: "offer", error: financeErrorMessage(error) });
    }
  }

  async function copyRequest(text: string) {
    try {
      await globalThis.navigator?.clipboard?.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (phase === "done" || phase === "already" || phase === "closed") {
    const text =
      phase === "done"
        ? receivable
          ? "Recebimento registrado. O lançamento já está no extrato da conta."
          : "Pagamento registrado. O lançamento já está no extrato da conta."
        : phase === "already"
          ? "Esta baixa já está registrada no servidor. Nada foi lançado em dobro."
          : (message ?? "Este título não recebe mais baixa.");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className={phase === "closed" ? "ui-alert ui-alert--danger" : "ui-alert"} role={phase === "closed" ? "alert" : "status"}>
          {phase === "closed" ? null : <CheckCircle2 size={16} aria-hidden="true" />} {text}
        </div>
        <div className="pat-ab-detail-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="pat-btn pat-btn--primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (phase === "pending_cheque") {
    const pedido = requestText(current, cheques);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="pat-banner pat-banner--warning" role="alert" style={{ alignItems: "flex-start" }}>
          <Banknote size={16} aria-hidden="true" />
          <div>
            <b>Há um cheque vinculado aguardando compensação.</b>
            <p>O título baixa sozinho quando o cheque compensar. Para receber por outro meio, é preciso trocar a vinculação do cheque — ação do administrador, com justificativa e registro na auditoria.</p>
          </div>
        </div>
        {cheques.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {cheques.map((cheque) => (
              <li key={cheque.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 13, border: "1px dashed #93C5FD", borderRadius: 8, padding: "8px 10px" }}>
                <span>{`Cheque nº ${cheque.chequeNumber}${cheque.bank ? ` · ${cheque.bank}` : ""} · ${cheque.status === "deposited" ? "depositado" : "registrado"}`}</span>
                <b>{formatBRL(cheque.amount)}</b>
                {canUnlinkCheque ? (
                  <button type="button" className="pat-btn" aria-label={`Desvincular o cheque nº ${cheque.chequeNumber}`} onClick={() => setUnlinking(cheque)}>
                    Desvincular o cheque
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Não foi possível listar o cheque agora. Tente de novo.</p>
        )}
        {!canUnlinkCheque ? (
          <label className="ui-field">
            <span>Pedido pronto para enviar ao administrador</span>
            <textarea className="ui-input" name="pedido" rows={5} readOnly value={pedido} />
            <span style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <button type="button" className="pat-btn" onClick={() => void copyRequest(pedido)}>
                <Copy size={14} aria-hidden="true" /> Copiar pedido
              </button>
              {copied ? <span className="pat-cell-muted">Pedido copiado.</span> : null}
            </span>
          </label>
        ) : null}
        <div className="pat-ab-detail-actions" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="pat-btn" onClick={onClose}>
            Fechar
          </button>
        </div>
        {unlinking ? (
          <DesvincularChequeModal cheque={unlinking} onClose={() => setUnlinking(null)} onConfirm={(justification) => confirmUnlink(unlinking, justification)} />
        ) : null}
      </div>
    );
  }

  const open = titleOpenBalance(current);
  return (
    <form onSubmit={submit} aria-label={receivable ? "Registrar recebimento" : "Registrar pagamento"} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>
        {`${current.document ? `${current.document} · ` : ""}${current.partyName} · saldo em aberto ${formatBRL(open)}`}
      </p>
      {notice ? (
        <div className="ui-alert" role="status">
          {notice}
        </div>
      ) : null}
      {followUp ? (
        <div role="group" aria-label={`Cancelar o cheque nº ${followUp.cheque.chequeNumber}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {followUp.error ? (
            <div className="ui-alert ui-alert--danger" role="alert">
              {followUp.error}
            </div>
          ) : null}
          <div className="pat-ab-detail-actions">
            {followUp.stage === "offer" ? (
              <button type="button" className="pat-btn" onClick={() => setFollowUp({ ...followUp, stage: "confirm", error: null })}>
                {`Cancelar o cheque nº ${followUp.cheque.chequeNumber}`}
              </button>
            ) : (
              <>
                <button type="button" className="pat-btn pat-btn--primary" disabled={followUp.stage === "sending"} onClick={() => void confirmCancelCheque(followUp.cheque)}>
                  Confirmar o cancelamento
                </button>
                <button type="button" className="pat-btn" disabled={followUp.stage === "sending"} onClick={() => setFollowUp({ ...followUp, stage: "offer", error: null })}>
                  Manter o cheque
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <label className="ui-field">
          <span>Valor (R$)</span>
          <input className="ui-input" name="valor" inputMode="decimal" value={amountText} disabled={locked} onChange={(event) => setAmountText(event.target.value)} />
          <small style={{ color: "#64748B" }}>Padrão: o saldo em aberto. Para receber só uma parte, informe um valor menor.</small>
        </label>
        <label className="ui-field">
          <span>{receivable ? "Data do recebimento" : "Data do pagamento"}</span>
          <input className="ui-input" name="data" type="date" value={date} disabled={locked} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="ui-field">
          <span>{receivable ? "Conta que recebeu" : "Conta de saída"}</span>
          <select className="ui-input" name="conta" value={accountId} disabled={locked} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Escolha a conta</option>
            {activeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span>Meio de pagamento</span>
          <select className="ui-input" name="meio" value={method} disabled={locked} onChange={(event) => setMethod(event.target.value as BaixaPaymentMethod)}>
            {BAIXA_PAYMENT_METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="pat-banner" role="note" style={{ alignItems: "flex-start", background: "#EFF6FF", borderColor: "#BFDBFE", color: "#1E40AF" }}>
        <Banknote size={16} aria-hidden="true" />
        <div>
          <b>{receivable ? "Recebeu em cheque?" : "Vai pagar com cheque?"}</b> Cheque não é baixado aqui. Registre o cheque em Cheques, vinculado a este título: o título baixa sozinho
          quando o cheque compensar, e o mesmo dinheiro não entra duas vezes. A tela de Cheques chega com o próximo bloco do Financeiro.
        </div>
      </div>
      {phase === "rereading" ? (
        <div className="ui-alert" role="status">
          Conferindo a situação do título antes de responder…
        </div>
      ) : null}
      {message ? (
        <div className="ui-alert ui-alert--danger" role="alert">
          {message}
          {phase === "reread_failed" ? (
            <>
              {" "}
              Não foi possível confirmar a situação do título.{" "}
              <button type="button" className="pat-link" onClick={() => void retryReread()}>
                Conferir de novo
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {activeAccounts.length === 0 ? <p style={{ fontSize: 12, color: "#B45309", margin: 0 }}>Nenhuma conta ativa: cadastre uma conta antes de registrar a baixa.</p> : null}
      <div className="pat-ab-detail-actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="pat-btn" onClick={onClose} disabled={phase === "sending"}>
          Cancelar
        </button>
        <button type="submit" className="pat-btn pat-btn--primary" disabled={locked}>
          {phase === "sending" ? "Registrando…" : receivable ? "Registrar recebimento" : "Registrar pagamento"}
        </button>
      </div>
      {message && phase === "form" ? <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>O reenvio usa a mesma identificação desta baixa: o servidor não lança em dobro.</p> : null}
    </form>
  );
}
