// B-ASS-08c1c (plano §4.0 item 6) — as decisões PURAS sobre a fila e a tabela de cobranças que o demonstrativo toma sob a
// própria trava: o refechamento (P6), a marcação imediata (P7, D2 (i)) e o reopen (A3). Sem I/O: o serviço lê as linhas e as
// cobranças NO MESMO `tx` do movimento, depois da trava do demonstrativo, e só executa o que estas funções devolvem.
//
// "Cancelável" = a cobrança da tabela em `pending` (R2-05). "Terminal" = `cancelled`, `refunded` ou `charged_back`. Qualquer
// outro estado (`confirmed`, `partially_refunded`, `chargeback_disputed`, `needs_review`, `failed`, `none`) não é cancelável
// nem terminal: falha fechado. Cobrança que não está na tabela não é terminal.

import type { SubscriptionStatementCharge } from "../charges/charges.types.js";
import type { BillingOutboxRow } from "../outbox/outbox.types.js";
import type { PaymentMethod } from "../providers/payment/payment-provider.port.js";
import type { ChargeStatus } from "./statement.types.js";

export const TERMINAL_CHARGE_STATES: ReadonlySet<ChargeStatus> = new Set<ChargeStatus>(["cancelled", "refunded", "charged_back"]); // [TERMINAL-SET]

/** A cobrança da tabela que a linha `charge_create` criou (pelo provedor e pelo `external_id`), se houver. */
export function chargeOf(line: BillingOutboxRow, charges: readonly SubscriptionStatementCharge[]): SubscriptionStatementCharge | undefined {
  if (line.externalId === null) return undefined;
  return charges.find((charge) => charge.provider === line.provider && charge.externalChargeId === line.externalId);
}

export function isTerminal(charge: SubscriptionStatementCharge | undefined): boolean {
  return charge !== undefined && TERMINAL_CHARGE_STATES.has(charge.status);
}

export function isCancelable(charge: SubscriptionStatementCharge | undefined): boolean {
  return charge !== undefined && charge.status === "pending";
}

export type ChargeLineRefusal = { readonly kind: "refuse"; readonly httpStatus: 409 | 422; readonly reason: "charge_in_flight" | "outbox_needs_review" | "charge_already_exists" };

export type RefechamentoPlan =
  | ChargeLineRefusal
  | {
      readonly kind: "proceed";
      /** `charge_create` PENDING → SKIPPED `statement_reopened` (o marcador REFECHA-01 no serviço). */
      readonly skipPending: readonly BillingOutboxRow[];
      /** `charge_create` SENT com a cobrança TERMINAL → SKIPPED `statement_reopened`, mantendo o `external_id` (REFECHA-02). */
      readonly skipSentTerminal: readonly BillingOutboxRow[];
    };

/**
 * P6 (plano §4.2) — o refechamento de um `reopened`, sob a trava; vale a primeira que casar: PROCESSING → 409
 * `charge_in_flight`; NEEDS_REVIEW → 422 `outbox_needs_review` (§9 D-1); SENT com a cobrança não terminal (ou fora da tabela)
 * → 422 `charge_already_exists`; senão, as PENDING e as SENT com cobrança terminal saem do conjunto vivo.
 */
export function refechamentoPlan(lines: readonly BillingOutboxRow[], charges: readonly SubscriptionStatementCharge[]): RefechamentoPlan {
  const creates = lines.filter((line) => line.kind === "charge_create");
  if (creates.some((line) => line.status === "PROCESSING")) return { kind: "refuse", httpStatus: 409, reason: "charge_in_flight" }; // [REFECHA-INFLIGHT]
  if (creates.some((line) => line.status === "NEEDS_REVIEW")) return { kind: "refuse", httpStatus: 422, reason: "outbox_needs_review" }; // [REFECHA-REVIEW]
  if (creates.some((line) => line.status === "SENT" && !isTerminal(chargeOf(line, charges)))) return { kind: "refuse", httpStatus: 422, reason: "charge_already_exists" }; // [REFECHA-LIVE]
  return {
    kind: "proceed",
    skipPending: creates.filter((line) => line.status === "PENDING"),
    skipSentTerminal: creates.filter((line) => line.status === "SENT" && isTerminal(chargeOf(line, charges))),
  };
}

export type EagerPlan = {
  /** `charge_create` PENDING → SKIPPED com o motivo do movimento. */
  readonly skippable: readonly BillingOutboxRow[];
  /** `charge_create` SENT com a cobrança CANCELÁVEL → `charge_cancel` pelo núcleo (o marcador CANCEL-CORE). */
  readonly cancelTargets: readonly BillingOutboxRow[];
};

/**
 * P7 (plano §4.3, D2 (i)) — a marcação imediata do movimento que tira a conta do "a cobrar" (baixa que quita, `cancel`,
 * `reopen`). PROCESSING → nada (quem fecha é a releitura do registro); NEEDS_REVIEW → nada (§9 D-2: a conferência é do
 * operador, e o claim nunca pega NEEDS_REVIEW).
 */
export function eagerPlan(lines: readonly BillingOutboxRow[], charges: readonly SubscriptionStatementCharge[]): EagerPlan {
  const creates = lines.filter((line) => line.kind === "charge_create");
  const skippable = creates.filter((line) => line.status === "PENDING"); // [EAGER-SKIPPABLE]
  return { skippable, cancelTargets: creates.filter((line) => line.status === "SENT" && isCancelable(chargeOf(line, charges))) };
}

/**
 * A3 (plano §4.6) — o que o reopen lê sob a trava, DEPOIS do marcador GUARD-01: a `charge_create` em voo, e a cobrança viva
 * pela TABELA (`pending`/`confirmed`), ou uma SENT cuja cobrança não é terminal (inclusive fora da tabela).
 */
export function reopenLiveCheck(
  lines: readonly BillingOutboxRow[],
  charges: readonly SubscriptionStatementCharge[],
): { readonly inFlight: boolean; readonly liveCharge: boolean } {
  const creates = lines.filter((line) => line.kind === "charge_create");
  return {
    inFlight: creates.some((line) => line.status === "PROCESSING"),
    liveCharge:
      charges.some((charge) => charge.status === "pending" || charge.status === "confirmed") ||
      creates.some((line) => line.status === "SENT" && !isTerminal(chargeOf(line, charges))),
  };
}

const CLOSING_METHODS: readonly PaymentMethod[] = ["pix", "boleto", "credit_card", "debit_card"];

/** §9 D-8: o método do fechamento vem do perfil de cobrança; ausente, `undefined` ou fora da lista → `pix` (o despacho manda o
 * perfil incompleto à conferência pelo gate de sempre). */
export function closingMethodOf(profileMethod: string | null | undefined): PaymentMethod {
  return typeof profileMethod === "string" && (CLOSING_METHODS as readonly string[]).includes(profileMethod) ? (profileMethod as PaymentMethod) : "pix";
}
