// B-ASS-08 · F7 — porta de elegibilidade da cobrança (R-PRF-1, G12). Antes de enfileirar `charge_create`, o perfil da
// organização tem de estar completo (`tenant_billing_profiles`); incompleto → `billing_profile_missing` com `missing[]`
// visível e NENHUMA chamada ao provedor. Reusa `missingFields` do perfil (B-ASS-04).
// Conserto J-522 (C3-01 / R-CHG-2, D1): `chargeCreateEligibility` — um `/charge` por demonstrativo, decidido ANTES de
// enfileirar, na transação com o demonstrativo travado (`requestChargeCreate`, `charge-request.service.ts`).

import { missingFields, type BillingProfileInput } from "../billing-profile/billing-profile.js";
import type { BillingOutboxRow } from "../outbox/outbox.types.js";
import type { SubscriptionStatement } from "../statements/statement.types.js";
import type { SubscriptionStatementCharge } from "./charges.types.js";

export type ChargeProfileGate = { readonly ok: true } | { readonly ok: false; readonly reason: "billing_profile_missing"; readonly missing: readonly string[] };

export function chargeProfileGate(profile: BillingProfileInput | null): ChargeProfileGate {
  const missing = missingFields(profile);
  return missing.length === 0 ? { ok: true } : { ok: false, reason: "billing_profile_missing", missing };
}

export type ChargeCreateEligibility =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "statement_not_closed" | "charge_already_exists" | "statement_partially_paid" };

/**
 * R-CHG-2 (D1, conserto J-522): um `/charge` por demonstrativo. PURA. `/charge` só em `closed` (`paid`/`cancelled`/
 * `open`/`reopened` → `statement_not_closed`); cobrança viva (`pending`/`confirmed` — o `findLive` já filtra) OU linha
 * `charge_create` em `PENDING`/`PROCESSING`/`SENT`/`NEEDS_REVIEW` → `charge_already_exists` (cobrar de novo é só via
 * `charge/cancel`, que deixa a linha `cancelled`/`SKIPPED`). Aplicada por `requestChargeCreate` DENTRO da transação com
 * o demonstrativo travado, ANTES de enfileirar.
 * B-ASS-08c1b (P4, Q4 = (a)): demonstrativo `closed` com pagamento parcial → `statement_partially_paid`. A régua de adoção
 * só aceita cobrança do valor cheio, e cobrar o cheio de quem já pagou parte geraria crédito de propósito (cobrar só o saldo
 * é a `P-ASS08C-COBRANCA-DO-SALDO`). Leitor sem `paidCents` conta como "sem pagamento".
 */
export function chargeCreateEligibility(
  statement: Pick<SubscriptionStatement, "status"> & { readonly paidCents?: number },
  liveCharge: SubscriptionStatementCharge | undefined,
  outboxLines: readonly BillingOutboxRow[],
): ChargeCreateEligibility {
  if (statement.status !== "closed") return { ok: false, reason: "statement_not_closed" };
  if (liveCharge) return { ok: false, reason: "charge_already_exists" };
  const liveLine = outboxLines.some(
    (line) =>
      line.kind === "charge_create" &&
      (line.status === "PENDING" || line.status === "PROCESSING" || line.status === "SENT" || line.status === "NEEDS_REVIEW"),
  );
  if (liveLine) return { ok: false, reason: "charge_already_exists" };
  if ((statement.paidCents ?? 0) > 0) return { ok: false, reason: "statement_partially_paid" }; // [CHARGE-PARTIAL]
  return { ok: true };
}
