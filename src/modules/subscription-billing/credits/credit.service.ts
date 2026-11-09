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
import type { SubscriptionCredit } from "../statements/statement.types.js";

export type CreditReversalEffect = {
  /** Quanto o crédito absorveu da reversão (não reduz `paid_amount`). */
  readonly absorbedByCredit: number;
  /** O que sobrou para descontar de `applied_amount` do pagamento. */
  readonly remainingForApplied: number;
  /** Alerta quando um crédito já aplicado a outro demonstrativo foi desfeito. */
  readonly creditReversed: boolean;
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
        const target = await tx.lockById(credit.appliedToStatementId);
        if (target) {
          const creditsApplied = Math.max(0, target.creditsAppliedCents - credit.amountCents);
          const stillPaid = target.paidCents >= target.totalCents;
          await tx.saveStatement({
            ...target,
            creditsAppliedCents: creditsApplied,
            status: target.status === "paid" && !stillPaid ? "closed" : target.status,
          });
        }
        await tx.saveCredit({ ...credit, status: "written_off", resolutionNote: "credit_reversed" });
        const take = Math.min(remaining, credit.amountCents);
        absorbed += take;
        remaining -= take;
        creditReversed = true;
      }
      // `refunded`: nada a descontar.
    }
    return { absorbedByCredit: absorbed, remainingForApplied: remaining, creditReversed };
  }
}
