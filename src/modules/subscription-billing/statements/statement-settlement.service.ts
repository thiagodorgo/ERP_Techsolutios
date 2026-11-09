// B-ASS-08 · F5 — baixa automática vinda do provedor (plano §4.8 R-SET-1, R-WH-3/D6). Reusa a regra da baixa
// manual via `StatementService.recordProviderPayment` (G7: `applied = min(valor, saldo)`, excedente vira crédito) na
// PRIMEIRA baixa de uma cobrança, e trata a ATUALIZAÇÃO MONOTÔNICA da MESMA linha de pagamento quando a reconsulta
// traz um `paidCents` maior (D6: parcial 60 → quitação 100 em saldo 100 → `paid_amount = 100`, `paid`). Nunca cria
// duas linhas de pagamento para a mesma `(source, external_charge_id)` (UNIQUE no banco, F11).

import { CreditService } from "../credits/credit.service.js";
import type { StatementRepository } from "./statement.repository.js";
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
  /** O chamador (reconcile) enfileira `invoice_cancel` quando isto é verdadeiro (R-SET-2/R-D). */
  readonly shouldCancelInvoice: boolean;
};

export type SettleResult =
  | { readonly kind: "settled"; readonly statement: SubscriptionStatement; readonly payment: StatementPayment; readonly credit: SubscriptionCredit | null }
  | { readonly kind: "ignored"; readonly reason: "not_monotonic" };

function balanceOf(statement: SubscriptionStatement): number {
  return Math.max(0, statement.totalCents - statement.paidCents);
}

export class StatementSettlementService {
  readonly #credits = new CreditService();

  constructor(
    private readonly repository: StatementRepository,
    private readonly statements: StatementService,
  ) {}

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
  }): Promise<ReversalResult | { readonly kind: "no_payment" }> {
    const payments = await this.repository.listPayments(input.tenantId, input.statementId);
    const payment = payments.find((row) => row.source !== "manual" && row.externalChargeId === input.externalChargeId);
    if (!payment) return { kind: "no_payment" };
    const ownCredit = (await this.repository.listCredits(input.tenantId)).find(
      (credit) => credit.originPaymentId === payment.id && (credit.status === "open" || credit.status === "applied"),
    );

    return this.repository.transaction(input.tenantId, async (tx) => {
      const current = (await tx.lockPayment(payment.id))!;
      const statement = (await tx.lockById(input.statementId))!;
      const effect = await this.#credits.absorbReversal(tx, { ownCredit, reversedCents: input.reversedCents, now: input.now });
      const fromApplied = Math.min(effect.remainingForApplied, current.appliedCents - current.reversedCents);
      const savedPayment = await tx.savePayment({
        ...current,
        reversedCents: current.reversedCents + input.reversedCents,
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
      const shouldCancelInvoice = totalReversal && statement.invoiceStatus === "authorized" && input.keepInvoice !== true;
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
        if (statement) await tx.saveStatement({ ...statement, chargeStatus: "confirmed" });
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
