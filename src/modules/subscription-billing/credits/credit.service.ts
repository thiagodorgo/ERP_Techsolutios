// B-ASS-08 · F6 — efeitos de crédito na REVERSÃO (plano §12.2 D4, R-SET-3). O estorno/chargeback de um pagamento
// desconta PRIMEIRO do crédito que ESSE pagamento gerou, e só o resto de `applied_amount`:
//
//   - crédito `open`   → `written_off` (reason=reversal); consome até o valor do crédito;
//   - crédito `applied`→ DESAPLICA do demonstrativo-alvo (o `credits_applied` do alvo cai; alvo `paid` que ficar
//                        devendo volta a `closed`, com alerta `credit_reversed`);
//   - crédito `refunded`→ já saiu, nada a descontar.
//
// Opera DENTRO da transação da organização (usa só as primitivas de `StatementTx`). Não toca a rede.

import type { StatementTx } from "../statements/statement.repository.js";
import { recompute } from "../statements/statement.engine.js";
import type { SubscriptionCredit } from "../statements/statement.types.js";

export type CreditReversalEffect = {
  /** Quanto o crédito absorveu da reversão (não reduz `paid_amount`). */
  readonly absorbedByCredit: number;
  /** O que sobrou para descontar de `applied_amount` do pagamento. */
  readonly remainingForApplied: number;
  /** Alerta quando um crédito já aplicado a outro demonstrativo foi desfeito. */
  readonly creditReversed: boolean;
  /** Plano §4.8 (B2-2): o demonstrativo-ALVO que voltou a dever e quanto voltou à dívida dele, em centavos. Só no ramo `applied`. */
  readonly reversedTarget?: { readonly statementId: string; readonly returnedToDebtCents: number };
};

export class CreditService {
  /**
   * Absorve `reversedCents` no crédito que o pagamento gerou (se houver), na ordem da D4, e devolve o que sobra para
   * `applied_amount`. `now` carimba a resolução.
   */
  async absorbReversal(
    tx: StatementTx,
    input: { readonly ownCredit: SubscriptionCredit | undefined; readonly reversedCents: number; readonly now: Date },
  ): Promise<CreditReversalEffect> {
    let remaining = input.reversedCents;
    let absorbed = 0;
    let creditReversed = false;
    let reversedTarget: CreditReversalEffect["reversedTarget"];
    const credit = input.ownCredit ? await tx.lockCredit(input.ownCredit.id) : undefined;
    if (credit && remaining > 0) {
      if (credit.status === "open") {
        const take = Math.min(remaining, credit.amountCents);
        if (take > 0) {
          await tx.saveCredit({ ...credit, status: "written_off", resolutionNote: "reversal" });
          absorbed += take;
          remaining -= take;
        }
      } else if (credit.status === "applied" && credit.appliedToStatementId) {
        // Desaplica do alvo: o `credits_applied` do alvo cai; alvo `paid` que ficar devendo volta a `closed`.
        // B2-1 (D4): só a parte ESTORNADA do crédito sai do alvo (`take`), nunca o crédito inteiro: no estorno parcial de 20,00
        // de um crédito de 38,00, o alvo passa a dever 20,00, não 38,00.
        const take = Math.min(remaining, credit.amountCents);
        const target = await tx.lockById(credit.appliedToStatementId);
        let returnedToDebtCents = 0;
        if (target) {
          const creditsApplied = Math.max(0, target.creditsAppliedCents - take);
          returnedToDebtCents = target.creditsAppliedCents - creditsApplied;
          const latest = target.snapshot.latest ? { ...target.snapshot.latest, creditsAppliedCents: creditsApplied } : null;
          const totalCents = latest ? recompute(latest) : target.totalCents; // [CREDIT-RECOMPUTE]
          const stillPaid = target.paidCents >= totalCents;
          await tx.saveStatement({
            ...target,
            totalCents,
            creditsAppliedCents: creditsApplied,
            status: target.status === "paid" && !stillPaid ? "closed" : target.status,
            paidAt: target.status === "paid" && !stillPaid ? null : target.paidAt,
            snapshot: {
              ...target.snapshot,
              latest,
              history: [...target.snapshot.history, { at: input.now.toISOString(), event: "credit_reversed", by: null, totalCents }],
            },
          });
        }
        if (take < credit.amountCents) {
          // Estorno PARCIAL: o crédito se divide. A parte estornada vira uma linha `written_off` (`credit_reversed`), da mesma
          // origem — é ela que o `absorbedBefore` do próximo estorno conta —, e o resto continua `applied` no alvo.
          const reversedPart = await tx.insertCredit({
            tenantId: credit.tenantId,
            originStatementId: credit.originStatementId,
            originPaymentId: credit.originPaymentId,
            amountCents: take,
            reason: credit.reason,
            createdBy: null,
          });
          await tx.saveCredit({ ...reversedPart, status: "written_off", appliedToStatementId: credit.appliedToStatementId, resolutionNote: "credit_reversed" });
          await tx.saveCredit({ ...credit, amountCents: credit.amountCents - take });
        } else {
          await tx.saveCredit({ ...credit, status: "written_off", resolutionNote: "credit_reversed" });
        }
        absorbed += take;
        remaining -= take;
        creditReversed = true;
        if (target) reversedTarget = { statementId: target.id, returnedToDebtCents };
      }
      // `refunded`: nada a descontar.
    }
    return { absorbedByCredit: absorbed, remainingForApplied: remaining, creditReversed, ...(reversedTarget ? { reversedTarget } : {}) };
  }
}
