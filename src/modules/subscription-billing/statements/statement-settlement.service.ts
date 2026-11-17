// B-ASS-08 · F5 — baixa automática vinda do provedor (plano §4.8 R-SET-1, R-WH-3/D6). Reusa a regra da baixa
// manual via `StatementService.recordProviderPayment` (G7: `applied = min(valor, saldo)`, excedente vira crédito) na
// PRIMEIRA baixa de uma cobrança, e trata a ATUALIZAÇÃO MONOTÔNICA da MESMA linha de pagamento quando a reconsulta
// traz um `paidCents` maior (D6: parcial 60 → quitação 100 em saldo 100 → `paid_amount = 100`, `paid`). Nunca cria
// duas linhas de pagamento para a mesma `(source, external_charge_id)` (UNIQUE no banco, F11).
//
// Conserto da J-530 (plano `B-ASS-08b-conserto-530-v2.md` §3.1): com `invoiceIntents`, a INTENÇÃO de nota nasce na MESMA
// transação do dinheiro — `invoice_issue` na transição para `paid` (1º pagamento e monotônico) e `invoice_cancel` no estorno
// total/chargeback de um demonstrativo com nota VIVA (`pending` ou `authorized`, lida da tabela da nota sob a trava do
// demonstrativo), para o provedor e o `seq` DESSA nota. Se a transação não commita, não fica nem dinheiro nem intenção; se
// commita, nenhuma falha posterior a apaga. Provedor de nota desligado → a linha nasce `provider_disabled` (visível).

import { CreditService } from "../credits/credit.service.js";
import { invoiceIntentDecision, type InvoiceIntentMode, type InvoiceIntentNoneReason } from "../invoices/invoice-intent-rules.js";
import type { StatementRepository, StatementTx } from "./statement.repository.js";
import type { StatementService } from "./statement.service.js";
import type { ChargeStatus, PaymentSource, StatementPayment, SubscriptionCredit, SubscriptionStatement } from "./statement.types.js";

export type ProviderSource = Exclude<PaymentSource, "manual">;

export type ReversalKind = "refund" | "chargeback";

export type ReversalResult = {
  readonly statement: SubscriptionStatement;
  readonly payment: StatementPayment;
  readonly fromApplied: number;
  readonly absorbedByCredit: number;
  readonly creditReversed: boolean;
  /** Havia nota viva a cancelar (R-SET-2/R-D). Com `invoiceIntents`, o `invoice_cancel` JÁ nasceu na transação. */
  readonly shouldCancelInvoice: boolean;
};

export type SettleResult =
  | { readonly kind: "settled"; readonly statement: SubscriptionStatement; readonly payment: StatementPayment; readonly credit: SubscriptionCredit | null }
  | { readonly kind: "ignored"; readonly reason: "not_monotonic" };

function balanceOf(statement: SubscriptionStatement): number {
  return Math.max(0, statement.totalCents - statement.paidCents);
}

/** Para onde vai a intenção de nota da rodada: o provedor de nota da EMISSÃO (o ligado; senão o configurado) e os provedores
 * de nota ligados agora (o cancelamento vai sempre ao provedor da nota viva). */
export type InvoiceIntents = {
  readonly issueTarget: { readonly provider: string; readonly enabled: boolean };
  readonly enabledInvoiceProviders: readonly string[];
};

type IntentTx = { readonly enqueueOutbox: NonNullable<StatementTx["enqueueOutbox"]>; readonly findLiveInvoice: NonNullable<StatementTx["findLiveInvoice"]> };

/** Fecha em caso de falha: com `invoiceIntents` configurado, um `tx` sem as duas operações derruba a transação. */
function intentTx(tx: StatementTx): IntentTx | null {
  const { enqueueOutbox, findLiveInvoice } = tx;
  // [INTX-08]
  if (!enqueueOutbox || !findLiveInvoice) throw new Error("invoice_intent_tx_unsupported");
  return { enqueueOutbox, findLiveInvoice };
}

/** B-ASS-08c2 (plano §4.1 item 3): as funções novas exigem também os fatos da intenção (`invoiceIntentFacts`); sem eles, falha
 * fechado, como o `intentTx` (o marcador INTX-08). */
function invoiceFactsTx(tx: StatementTx): IntentTx & { readonly invoiceIntentFacts: NonNullable<StatementTx["invoiceIntentFacts"]> } {
  const intent = intentTx(tx)!;
  const { invoiceIntentFacts } = tx;
  if (!invoiceIntentFacts) throw new Error("invoice_intent_tx_unsupported");
  return { ...intent, invoiceIntentFacts };
}

export type InvoiceIssueOutcome =
  | { readonly kind: "created"; readonly seq: number; readonly providerDisabled: boolean }
  | { readonly kind: "none"; readonly reason: InvoiceIntentNoneReason };

export type InvoiceCancelOutcome = { readonly kind: "enqueued" } | { readonly kind: "confirmation_required" } | { readonly kind: "in_progress" } | { readonly kind: "none" };

/**
 * B-ASS-08c2 (plano §4.1 item 3, §4.2 a §4.5, §4.9) — a ÚNICA porta da intenção de EMISSÃO de nota nova: a baixa manual que
 * quita, o 1º pagamento e o monotônico do provedor, a varredura de recuperação e o `/invoice` do operador. Roda no `tx` do
 * movimento, DEPOIS da trava do demonstrativo: lê os fatos no MESMO `tx`, decide pela regra pura (`invoiceIntentDecision`) e,
 * se for criar, grava a linha com o `seq` seguinte e o índice do demonstrativo (com `provider` nulo e a organização do
 * demonstrativo TRAVADO). Provedor de nota desligado → a linha nasce `provider_disabled`, visível; o claim a limpa ao religar.
 */
export async function writeInvoiceIssueIntentInTx(
  tx: StatementTx,
  intents: InvoiceIntents,
  input: { readonly statement: SubscriptionStatement; readonly now: Date; readonly mode: InvoiceIntentMode; readonly cutoff?: Date },
): Promise<InvoiceIssueOutcome> {
  const { statement, now } = input;
  const intent = invoiceFactsTx(tx);
  const facts = await intent.invoiceIntentFacts(statement.id);
  const decision = invoiceIntentDecision({ statement, lines: facts.lines, live: facts.live !== undefined, maxInvoiceSeq: facts.maxInvoiceSeq, mode: input.mode, ...(input.cutoff ? { cutoff: input.cutoff } : {}) });
  if (decision.kind === "none") return decision;
  await intent.enqueueOutbox({ tenantId: statement.tenantId, statementId: statement.id, kind: "invoice_issue", provider: intents.issueTarget.provider, seq: decision.seq, payload: { seq: decision.seq }, skipReason: intents.issueTarget.enabled ? null : "provider_disabled" }, now); // [NOTA-SEQ]
  await tx.charging().putRef({ statementId: statement.id, tenantId: statement.tenantId, provider: null }, now); // [NOTA-REF]
  return { kind: "created", seq: decision.seq, providerDisabled: !intents.issueTarget.enabled };
}

/**
 * B-ASS-08c2 (plano §4.7, Emenda 1 §2.2) — a intenção de CANCELAR a nota viva no estorno manual que devolveu todo o valor, no
 * `tx` do estorno e depois da trava. Nota `pending`/`authorized`: sem `confirm`, nada é gravado e volta `confirmation_required`
 * (o cuidado 1 do dono: quem chama desfaz o estorno); com `confirm`, o `invoice_cancel` vai ao provedor e ao `seq` DELA (o molde
 * do cancelamento do provedor), `provider_disabled` se ele não estiver ligado. `cancel_pending` → o cancelamento já está em
 * curso. Sem nota viva → nada.
 */
export async function writeInvoiceCancelIntentInTx(
  tx: StatementTx,
  intents: InvoiceIntents,
  input: { readonly statementId: string; readonly tenantId: string; readonly now: Date; readonly confirm: boolean },
): Promise<InvoiceCancelOutcome> {
  const intent = invoiceFactsTx(tx);
  const live = await intent.findLiveInvoice(input.statementId);
  if (!live) return { kind: "none" };
  if (live.status === "cancel_pending") return { kind: "in_progress" };
  if (!input.confirm) return { kind: "confirmation_required" };
  const skipReason = intents.enabledInvoiceProviders.includes(live.provider) ? null : "provider_disabled";
  await intent.enqueueOutbox({ tenantId: input.tenantId, statementId: input.statementId, kind: "invoice_cancel", provider: live.provider, seq: live.seq, payload: { reason: "payment_reversed" }, skipReason }, input.now);
  return { kind: "enqueued" };
}

/** B-ASS-08c2 (Emenda 1 §2.2): só leitura, no `tx` do estorno de só uma parte — o que acontece com a nota viva que FICA. */
export async function describeLiveInvoiceInTx(tx: StatementTx, statementId: string): Promise<"kept_partial_reversal" | "cancel_in_progress" | "none"> {
  const live = await intentTx(tx)!.findLiveInvoice(statementId);
  if (!live) return "none";
  return live.status === "cancel_pending" ? "cancel_in_progress" : "kept_partial_reversal";
}

export class StatementSettlementService {
  readonly #credits = new CreditService();

  constructor(
    private readonly repository: StatementRepository,
    private readonly statements: StatementService,
    private readonly invoiceIntents?: InvoiceIntents,
  ) {}

  /** (D) `invoice_issue` na transição para `paid`, no `tx` da baixa, depois da trava do demonstrativo. */
  async #issueIntent(tx: StatementTx, change: { readonly before: SubscriptionStatement; readonly after: SubscriptionStatement }, now: Date): Promise<void> {
    const intents = this.invoiceIntents;
    if (!intents || change.before.status === "paid" || change.after.status !== "paid") return;
    // [INTX-06a]
    await writeInvoiceIssueIntentInTx(tx, intents, { statement: change.after, now, mode: "auto" });
  }

  /** B-ASS-08c1c (R2-03, plano §4.7): o 1º pagamento do provedor, no `tx` da baixa — a tabela de cobranças passa a `confirmed`
   * (também com `applied = 0`: é a verdade do provedor) e depois a intenção de nota de sempre. */
  async #afterProviderPayment(tx: StatementTx, change: { readonly before: SubscriptionStatement; readonly after: SubscriptionStatement }, input: { readonly statementId: string; readonly externalChargeId: string; readonly now: Date }): Promise<void> {
    await tx.syncCharge(input.statementId, { externalChargeId: input.externalChargeId }, "confirmed"); // [CHG-SYNC-PAY]
    await this.#issueIntent(tx, change, input.now);
  }

  /**
   * Aplica (ou atualiza) a baixa de UMA cobrança do provedor. `paidCents` é o valor BRUTO da RECONSULTA (nunca o do
   * webhook — R-WH-4). A organização e o demonstrativo já foram resolvidos pelo NOSSO `statement_id` (R-WH-5).
   */
  async settle(input: {
    readonly tenantId: string;
    readonly statementId: string;
    readonly source: ProviderSource;
    readonly externalChargeId: string;
    readonly paidCents: number;
    readonly method: string | null;
    readonly now: Date;
  }): Promise<SettleResult> {
    const payments = await this.repository.listPayments(input.tenantId, input.statementId);
    const existing = payments.find((payment) => payment.source === input.source && payment.externalChargeId === input.externalChargeId);

    if (!existing) {
      const recorded = await this.statements.recordProviderPayment({
        tenantId: input.tenantId,
        statementId: input.statementId,
        source: input.source,
        externalChargeId: input.externalChargeId,
        amountCents: input.paidCents,
        method: input.method,
        now: input.now,
        // [INTX-01]
        afterWrite: (tx, change) => this.#afterProviderPayment(tx, change, input),
      });
      return { kind: "settled", statement: recorded.statement, payment: recorded.payment, credit: recorded.credit };
    }

    // D6 — monotônico: só CRESCE. `paidCents` menor ou igual ao já registrado → ignorado com motivo.
    if (input.paidCents <= existing.amountCents) {
      return { kind: "ignored", reason: "not_monotonic" };
    }

    const result = await this.repository.transaction(input.tenantId, async (tx) => {
      const payment = (await tx.lockPayment(existing.id)) ?? existing;
      const statement = (await tx.lockById(input.statementId))!;
      const delta = input.paidCents - payment.amountCents;
      const addApplied = Math.min(delta, balanceOf(statement)); // só abate até o saldo que falta
      const newApplied = payment.appliedCents + addApplied;
      const savedPayment = await tx.savePayment({ ...payment, amountCents: input.paidCents, appliedCents: newApplied });
      const paidCents = statement.paidCents + addApplied;
      const savedStatement = await tx.saveStatement({
        ...statement,
        paidCents,
        chargeStatus: "confirmed",
        status: paidCents >= statement.totalCents ? "paid" : statement.status,
        paidAt: paidCents >= statement.totalCents ? input.now : statement.paidAt,
      });
      await tx.syncCharge(input.statementId, { externalChargeId: input.externalChargeId }, "confirmed"); // [CHG-SYNC-MONO]
      const extra = delta - addApplied; // o que passou do saldo vira crédito (excedente)
      const credit =
        extra > 0
          ? await tx.insertCredit({
              tenantId: input.tenantId,
              originStatementId: statement.id,
              originPaymentId: savedPayment.id,
              amountCents: extra,
              reason: "overpayment",
              createdBy: null,
            })
          : null;
      // [INTX-02]
      await this.#issueIntent(tx, { before: statement, after: savedStatement }, input.now);
      return { statement: savedStatement, payment: savedPayment, credit };
    });

    return { kind: "settled", statement: result.statement, payment: result.payment, credit: result.credit };
  }

  /**
   * Estorno/chargeback de um pagamento do provedor (R-CB-1, R-SET-3/D4). Desconta PRIMEIRO do crédito que o pagamento
   * gerou e só o resto de `applied_amount`. `cancelled` NUNCA volta a `closed`. Devolve `shouldCancelInvoice` para o
   * reconcile enfileirar `invoice_cancel` — só em estorno TOTAL ou chargeback, com nota `authorized` e sem `keepInvoice`.
   */
  async applyReversal(input: {
    readonly tenantId: string;
    readonly statementId: string;
    readonly externalChargeId: string;
    readonly reversedCents: number;
    readonly kind: ReversalKind;
    readonly keepInvoice?: boolean;
    readonly now: Date;
  }): Promise<ReversalResult | { readonly kind: "no_payment" } | { readonly kind: "already_reversed" }> {
    const payments = await this.repository.listPayments(input.tenantId, input.statementId);
    const payment = payments.find((row) => row.source !== "manual" && row.externalChargeId === input.externalChargeId);
    if (!payment) return { kind: "no_payment" };
    const paymentCredits = (await this.repository.listCredits(input.tenantId)).filter((credit) => credit.originPaymentId === payment.id);
    const ownCredit = paymentCredits.find((credit) => credit.status === "open" || credit.status === "applied");

    return this.repository.transaction(input.tenantId, async (tx) => {
      const current = (await tx.lockPayment(payment.id))!;
      // IDEMPOTENTE (poll-settled reconsulta todo dia): só se reverte o que ainda falta. Pagamento já totalmente revertido
      // → nada muda. E o valor nunca passa do pagamento (a reconsulta sem valor chega como teto, não como estorno real).
      const remaining = current.amountCents - current.reversedCents;
      if (remaining <= 0) return { kind: "already_reversed" } as const;
      const toReverse = Math.min(input.reversedCents, remaining);
      const statement = (await tx.lockById(input.statementId))!;
      // D4: parte do já-revertido pode ter saído do CRÉDITO deste pagamento (não do aplicado). Sob lock, soma o que os
      // créditos dele já absorveram por reversão; só o resto do `reversedCents` saiu do aplicado.
      let absorbedBefore = 0;
      for (const credit of paymentCredits) {
        const locked = await tx.lockCredit(credit.id);
        if (locked && locked.status === "written_off" && (locked.resolutionNote === "reversal" || locked.resolutionNote === "credit_reversed")) {
          absorbedBefore += locked.amountCents;
        }
      }
      const appliedRemaining = Math.max(0, current.appliedCents - Math.max(0, current.reversedCents - absorbedBefore));
      const effect = await this.#credits.absorbReversal(tx, { ownCredit, reversedCents: toReverse, now: input.now });
      const fromApplied = Math.min(effect.remainingForApplied, appliedRemaining);
      const savedPayment = await tx.savePayment({
        ...current,
        reversedCents: current.reversedCents + toReverse,
        reversedAt: input.now,
        reversalReason: input.kind,
        reversalKind: input.kind,
      });
      const paidCents = Math.max(0, statement.paidCents - fromApplied);
      const totalReversal = input.kind === "chargeback" || savedPayment.reversedCents >= current.amountCents;
      const chargeStatus: ChargeStatus = input.kind === "chargeback" ? "charged_back" : totalReversal ? "refunded" : "partially_refunded";
      const status =
        statement.status === "cancelled"
          ? "cancelled"
          : statement.status === "paid" && paidCents < statement.totalCents
            ? "closed"
            : statement.status;
      const savedStatement = await tx.saveStatement({
        ...statement,
        paidCents,
        chargeStatus,
        status,
        paidAt: paidCents >= statement.totalCents ? statement.paidAt : null,
      });
      await tx.syncCharge(input.statementId, { externalChargeId: input.externalChargeId }, chargeStatus); // [CHG-SYNC-REV]
      // (B) a nota VIVA, lida sob a trava do demonstrativo; o cancelamento vai ao provedor e ao `seq` DELA.
      const intents = this.invoiceIntents;
      const intent = intents ? intentTx(tx) : null;
      const live = intent && totalReversal && input.keepInvoice !== true ? await intent.findLiveInvoice(input.statementId) : undefined;
      // [INTX-07]
      const cancelTo = live && intents ? { provider: live.provider, seq: live.seq } : undefined;
      // [INTX-06c]
      const cancelSkip = live && intents?.enabledInvoiceProviders.includes(live.provider) ? null : "provider_disabled";
      // [INTX-03]
      if (live && (live.status === "pending" || live.status === "authorized")) await intent!.enqueueOutbox({ tenantId: input.tenantId, statementId: input.statementId, kind: "invoice_cancel", provider: cancelTo!.provider, seq: cancelTo!.seq, payload: { reason: "payment_reversed" }, skipReason: cancelSkip }, input.now);
      // `cancel_pending` não gera intenção nova (o cancelamento já está em curso); sem nota viva, nada — e SEM throw: o
      // espelho deixou de decidir, e um estorno (dinheiro) nunca fica preso por ele.
      const shouldCancelInvoice = intents
        ? live !== undefined && (live.status === "pending" || live.status === "authorized")
        : totalReversal && statement.invoiceStatus === "authorized" && input.keepInvoice !== true;
      return {
        statement: savedStatement,
        payment: savedPayment,
        fromApplied,
        absorbedByCredit: effect.absorbedByCredit,
        creditReversed: effect.creditReversed,
        shouldCancelInvoice,
      };
    });
  }

  /**
   * Disputa de chargeback (D3/R-CB-2): `chargeback_disputed` NÃO afeta "em dia" nem cancela nota. Um
   * `PAYMENT_CONFIRMED`/`RECEIVED` seguinte volta a `confirmed` na mesma linha (via `settle`), nada a desfazer.
   */
  async markChargebackDisputed(input: { readonly tenantId: string; readonly statementId: string; readonly now: Date }): Promise<SubscriptionStatement | undefined> {
    return this.repository.transaction(input.tenantId, async (tx) => {
      const statement = await tx.lockById(input.statementId);
      if (!statement) return undefined;
      // §9 D-6: a função não recebe o id da cobrança (o chamador está em `webhooks/**`): a cobrança `confirmed` DO demonstrativo.
      await tx.syncCharge(input.statementId, { status: "confirmed" }, "chargeback_disputed"); // [CHG-SYNC-DISP]
      return tx.saveStatement({ ...statement, chargeStatus: "chargeback_disputed" });
    });
  }

  /** Resolução da disputa (R-CB-3): `won` → `confirmed`; `lost` → chargeback total (reverte). */
  async resolveChargeback(input: {
    readonly tenantId: string;
    readonly statementId: string;
    readonly externalChargeId: string;
    readonly outcome: "won" | "lost";
    readonly keepInvoice?: boolean;
    readonly now: Date;
  }): Promise<{ readonly chargeStatus: ChargeStatus }> {
    if (input.outcome === "won") {
      await this.repository.transaction(input.tenantId, async (tx) => {
        const statement = await tx.lockById(input.statementId);
        if (!statement) return;
        await tx.syncCharge(input.statementId, { externalChargeId: input.externalChargeId }, "confirmed"); // [CHG-SYNC-WON]
        await tx.saveStatement({ ...statement, chargeStatus: "confirmed" });
      });
      return { chargeStatus: "confirmed" };
    }
    const payment = (await this.repository.listPayments(input.tenantId, input.statementId)).find(
      (row) => row.source !== "manual" && row.externalChargeId === input.externalChargeId,
    );
    if (payment) {
      await this.applyReversal({
        tenantId: input.tenantId,
        statementId: input.statementId,
        externalChargeId: input.externalChargeId,
        reversedCents: payment.amountCents,
        kind: "chargeback",
        keepInvoice: input.keepInvoice,
        now: input.now,
      });
    }
    return { chargeStatus: "charged_back" };
  }
}
