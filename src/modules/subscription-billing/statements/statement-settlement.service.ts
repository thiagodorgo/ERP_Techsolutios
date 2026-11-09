// B-ASS-08 · F5 — baixa automática vinda do provedor (plano §4.8 R-SET-1, R-WH-3/D6). Reusa a regra da baixa
// manual via `StatementService.recordProviderPayment` (G7: `applied = min(valor, saldo)`, excedente vira crédito) na
// PRIMEIRA baixa de uma cobrança, e trata a ATUALIZAÇÃO MONOTÔNICA da MESMA linha de pagamento quando a reconsulta
// traz um `paidCents` maior (D6: parcial 60 → quitação 100 em saldo 100 → `paid_amount = 100`, `paid`). Nunca cria
// duas linhas de pagamento para a mesma `(source, external_charge_id)` (UNIQUE no banco, F11).

import type { StatementRepository } from "./statement.repository.js";
import type { StatementService } from "./statement.service.js";
import type { PaymentSource, StatementPayment, SubscriptionCredit, SubscriptionStatement } from "./statement.types.js";

export type ProviderSource = Exclude<PaymentSource, "manual">;

export type SettleResult =
  | { readonly kind: "settled"; readonly statement: SubscriptionStatement; readonly payment: StatementPayment; readonly credit: SubscriptionCredit | null }
  | { readonly kind: "ignored"; readonly reason: "not_monotonic" };

function balanceOf(statement: SubscriptionStatement): number {
  return Math.max(0, statement.totalCents - statement.paidCents);
}

export class StatementSettlementService {
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
}
