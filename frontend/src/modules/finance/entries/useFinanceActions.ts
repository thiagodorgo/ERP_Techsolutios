import { useMemo } from "react";

import { createFinancialAccount } from "../accounts/financial-accounts.service";
import type { CreateFinancialAccountPayload, FinancialAccount } from "../accounts/financial-accounts.types";
import { getFinancialTitle, payFinancialTitle } from "../titles/financial-titles.service";
import type { BaixaPaymentMethod, FinancialTitle, PayFinancialTitlePayload } from "../titles/financial-titles.types";
import { cancelCheque, getFinancialEntry, listPendingChequesForTitle, reconcileFinancialEntry, unlinkChequeFromTitle } from "./financial-entries.service";
import type { DivergenceType, FinanceApiContext, FinancialEntry, ReconcilePayload, TitleCheque, UnlinkResult } from "./financial-entries.types";

// B-SAN3-12b (§6.3 do plano) — as AÇÕES de dinheiro do Financeiro, as mesmas nas 3 aparências: baixar, reler o título,
// ler os cheques pendentes do título, trocar a vinculação do cheque, cancelar o cheque desvinculado (E2/R5),
// conciliar/desfazer, reler o lançamento e cadastrar conta. As regras de corpo são funções PURAS (testáveis sem DOM): o corpo da baixa (F1/F5), o corpo da conciliação com
// o estado lido (F10) e a régua da justificativa do desvínculo (a do servidor: 10–500).

/** Meios da baixa, na ordem da maquete. Cheque NÃO entra (D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO; F5). */
export const BAIXA_PAYMENT_METHODS: readonly { readonly value: BaixaPaymentMethod; readonly label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "transfer", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão" },
];

const PAYMENT_LABELS: Readonly<Record<string, string>> = {
  pix: "Pix",
  transfer: "Transferência",
  boleto: "Boleto",
  cash: "Dinheiro",
  card: "Cartão",
  check: "Cheque (pela compensação)",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? "Outro meio";
}

/** Identificação da baixa: nasce UMA vez por formulário aberto e se repete em todo reenvio dele (F2). */
export function newClientActionId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `baixa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** "1.234,56", "1234,56", "1234.56" ou "R$ 1.234,56" → 1234.56; texto inválido → NaN. */
export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/R\$/g, "").replace(/\s/g, "");
  if (cleaned === "") return Number.NaN;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number(normalized) * 100) / 100;
}

export function formatMoneyInput(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Saldo em aberto do título: valor − já pago, ambos do servidor; arredondado ao centavo. */
export function titleOpenBalance(title: Pick<FinancialTitle, "amount" | "paidAmount">): number {
  return Math.max(0, Math.round((title.amount - title.paidAmount) * 100) / 100);
}

export type BaixaFields = {
  readonly accountId: string;
  readonly amountText: string;
  /** Data civil `YYYY-MM-DD` do recebimento/pagamento. */
  readonly date: string;
  readonly method: BaixaPaymentMethod;
};

/** Corpo do POST /financial-titles/:id/pay (F1), ou null quando o formulário ainda não está completo. */
export function payPayloadFor(fields: BaixaFields, clientActionId: string): PayFinancialTitlePayload | null {
  const amount = parseMoneyInput(fields.amountText);
  if (!fields.accountId || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) return null;
  return { account_id: fields.accountId, amount, payment_method: fields.method, occurred_at: fields.date, client_action_id: clientActionId };
}

export type ReconcileChoice = {
  readonly reconciled: boolean;
  readonly divergence: DivergenceType | "none";
  readonly ref: string;
};

/** Corpo do PATCH …/reconcile: SEMPRE com o estado LIDO da linha (F10/F22; CAS por estado lógico, §4.6). */
export function reconcilePayloadFor(entry: Pick<FinancialEntry, "reconciled" | "reconciledAt">, choice: ReconcileChoice): ReconcilePayload {
  const ref = choice.ref.trim();
  return {
    reconciled: choice.reconciled,
    ...(choice.reconciled && choice.divergence !== "none" ? { divergence_type: choice.divergence } : {}),
    ...(choice.reconciled && ref ? { reconciliation_ref: ref } : {}),
    expected_reconciled: entry.reconciled,
    expected_reconciled_at: entry.reconciledAt,
  };
}

/** A régua do servidor para a justificativa da troca da vinculação (400 invalid_justification). */
export function unlinkJustificationError(value: string): string | null {
  const length = value.trim().length;
  if (length < 10) return "Escreva pelo menos 10 caracteres explicando a troca.";
  if (length > 500) return "A justificativa pode ter no máximo 500 caracteres.";
  return null;
}

export type FinanceActions = {
  readonly pay: (titleId: string, payload: PayFinancialTitlePayload) => Promise<FinancialTitle | null>;
  readonly rereadTitle: (titleId: string) => Promise<FinancialTitle>;
  readonly listPendingCheques: (titleId: string) => Promise<TitleCheque[]>;
  readonly unlinkCheque: (chequeId: string, justification: string) => Promise<UnlinkResult>;
  readonly cancelCheque: (chequeId: string) => Promise<void>;
  readonly reconcile: (entryId: string, payload: ReconcilePayload) => Promise<FinancialEntry>;
  readonly rereadEntry: (entryId: string) => Promise<FinancialEntry>;
  readonly createAccount: (payload: CreateFinancialAccountPayload) => Promise<FinancialAccount>;
};

export function useFinanceActions(context: FinanceApiContext): FinanceActions {
  return useMemo(
    () => ({
      pay: (titleId, payload) => payFinancialTitle(context, titleId, payload),
      rereadTitle: (titleId) => getFinancialTitle(context, titleId),
      listPendingCheques: (titleId) => listPendingChequesForTitle(context, titleId),
      unlinkCheque: (chequeId, justification) => unlinkChequeFromTitle(context, chequeId, justification),
      cancelCheque: (chequeId) => cancelCheque(context, chequeId),
      reconcile: (entryId, payload) => reconcileFinancialEntry(context, entryId, payload),
      rereadEntry: (entryId) => getFinancialEntry(context, entryId),
      createAccount: (payload) => createFinancialAccount(context, payload),
    }),
    [context],
  );
}
