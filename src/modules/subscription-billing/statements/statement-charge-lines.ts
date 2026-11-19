// B-ASS-08c1c (plano §4.0 item 6) — as decisões PURAS sobre a fila e a tabela de cobranças que o demonstrativo toma sob a
// própria trava: o refechamento (P6), a marcação imediata (P7, D2 (i)) e o reopen (A3). Sem I/O: o serviço lê as linhas e as
// cobranças NO MESMO `tx` do movimento, depois da trava do demonstrativo, e só executa o que estas funções devolvem.
//
// Conserto da J-579 (desenho (b)): as 3 decisões leem DUAS tabelas exaustivas — a do estado da cobrança (`CHARGE_RULES`,
// `charges/charge-rules.ts`) e a do estado da linha `charge_create` (`CHARGE_CREATE_LINE_RULES`, abaixo). Um membro novo em
// `CHARGE_STATUSES` ou em `OUTBOX_STATUSES` deixa o `tsc` vermelho até alguém escrever a linha dele. A cobrança que a linha SENT
// criou e que não está na tabela vale como estado desconhecido (falha fechado: alvo de cancelamento, não terminal).

import { CHARGE_RULES, chargeRule, chargeStatesWhere } from "../charges/charge-rules.js";
import type { SubscriptionStatementCharge } from "../charges/charges.types.js";
import type { BillingOutboxRow, OutboxStatus } from "../outbox/outbox.types.js";
import type { PaymentMethod } from "../providers/payment/payment-provider.port.js";
import type { ChargeStatus } from "./statement.types.js";

export const TERMINAL_CHARGE_STATES: ReadonlySet<ChargeStatus> = new Set(chargeStatesWhere("terminal")); // [TERMINAL-SET]

type LineRule = {
  readonly refecha: "refuse_inflight" | "refuse_review" | "by_charge" | "skip" | "ignore";
  readonly eager: "skip" | "by_charge" | "none";
  readonly reopen: "in_flight" | "by_charge" | "none";
};
export const CHARGE_CREATE_LINE_RULES = {
  PENDING:      { refecha: "skip",            eager: "skip",      reopen: "none" },      // [LINE-RULE-PENDING]
  PROCESSING:   { refecha: "refuse_inflight", eager: "none",      reopen: "in_flight" }, // [LINE-RULE-PROCESSING]
  SENT:         { refecha: "by_charge",       eager: "by_charge", reopen: "by_charge" }, // [LINE-RULE-SENT]
  FAILED:       { refecha: "ignore",          eager: "none",      reopen: "none" },      // [LINE-RULE-FAILED]
  NEEDS_REVIEW: { refecha: "refuse_review",   eager: "none",      reopen: "none" },      // [LINE-RULE-NEEDS-REVIEW]
  SKIPPED:      { refecha: "ignore",          eager: "none",      reopen: "none" },      // [LINE-RULE-SKIPPED]
} as const satisfies { readonly [S in OutboxStatus]: LineRule };

const lineRule = (line: BillingOutboxRow): LineRule => CHARGE_CREATE_LINE_RULES[line.status];

/** B-ASS-08c2 (plano §4.15, `P-579-LINERULE-NAO-EXAUSTIVA`): o ramo final de cada `switch` das ações. Uma ação nova na união
 * deixa o `tsc` vermelho (o argumento não é `never`); uma ação forjada em tempo de execução lança (falha fechado), em vez de
 * cair num ramo permissivo. */
function unreachable(value: never): never {
  void value;
  throw new Error("line_rule_action_unhandled");
}

/** O que o refechamento faz com UMA linha `charge_create`, pela ação da tabela (lida pelo `switch` exaustivo). */
type RefechaOutcome = "refuse_inflight" | "refuse_review" | "refuse_live" | "skip_pending" | "skip_sent_terminal" | "keep";
function refechaOutcome(line: BillingOutboxRow, charges: readonly SubscriptionStatementCharge[]): RefechaOutcome {
  const action = lineRule(line).refecha;
  switch (action) {
    case "refuse_inflight":
      return "refuse_inflight";
    case "refuse_review":
      return "refuse_review";
    case "by_charge":
      return chargeRule(chargeOf(line, charges)).terminal ? "skip_sent_terminal" : "refuse_live";
    case "skip":
      return "skip_pending";
    case "ignore":
      return "keep";
    default:
      return unreachable(action); // [ACTION-REFECHA]
  }
}

/** O que a marcação imediata faz com UMA linha `charge_create`. */
type EagerOutcome = "skip" | "cancel" | "none";
function eagerOutcome(line: BillingOutboxRow, charges: readonly SubscriptionStatementCharge[]): EagerOutcome {
  const action = lineRule(line).eager;
  switch (action) {
    case "skip":
      return "skip";
    case "by_charge":
      return chargeRule(chargeOf(line, charges)).cancelTarget ? "cancel" : "none";
    case "none":
      return "none";
    default:
      return unreachable(action); // [ACTION-EAGER]
  }
}

/** O que o reopen lê de UMA linha `charge_create`. */
type ReopenOutcome = "in_flight" | "live" | "none";
function reopenOutcome(line: BillingOutboxRow, charges: readonly SubscriptionStatementCharge[]): ReopenOutcome {
  const action = lineRule(line).reopen;
  switch (action) {
    case "in_flight":
      return "in_flight";
    case "by_charge":
      return chargeRule(chargeOf(line, charges)).terminal ? "none" : "live";
    case "none":
      return "none";
    default:
      return unreachable(action); // [ACTION-REOPEN]
  }
}

/** A cobrança da tabela que a linha `charge_create` criou (pelo provedor e pelo `external_id`), se houver. */
export function chargeOf(line: BillingOutboxRow, charges: readonly SubscriptionStatementCharge[]): SubscriptionStatementCharge | undefined {
  if (line.externalId === null) return undefined;
  return charges.find((charge) => charge.provider === line.provider && charge.externalChargeId === line.externalId);
}

export function isTerminal(charge: SubscriptionStatementCharge | undefined): boolean {
  return chargeRule(charge).terminal;
}

export function isCancelable(charge: SubscriptionStatementCharge | undefined): boolean {
  return chargeRule(charge).cancelTarget;
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
  const outcomes = lines.filter((line) => line.kind === "charge_create").map((line) => ({ line, outcome: refechaOutcome(line, charges) }));
  if (outcomes.some((item) => item.outcome === "refuse_inflight")) return { kind: "refuse", httpStatus: 409, reason: "charge_in_flight" }; // [REFECHA-INFLIGHT]
  if (outcomes.some((item) => item.outcome === "refuse_review")) return { kind: "refuse", httpStatus: 422, reason: "outbox_needs_review" }; // [REFECHA-REVIEW]
  if (outcomes.some((item) => item.outcome === "refuse_live")) return { kind: "refuse", httpStatus: 422, reason: "charge_already_exists" }; // [REFECHA-LIVE]
  return {
    kind: "proceed",
    skipPending: outcomes.filter((item) => item.outcome === "skip_pending").map((item) => item.line),
    skipSentTerminal: outcomes.filter((item) => item.outcome === "skip_sent_terminal").map((item) => item.line),
  };
}

export type EagerPlan = {
  /** `charge_create` PENDING → SKIPPED com o motivo do movimento. */
  readonly skippable: readonly BillingOutboxRow[];
  /** `charge_create` SENT com a cobrança que é ALVO de cancelamento (a `pending` e o estado desconhecido) → `charge_cancel` pelo
   * núcleo (o marcador CANCEL-CORE); o despacho lista primeiro e manda à conferência quando a lista não prova. */
  readonly cancelTargets: readonly BillingOutboxRow[];
};

/**
 * P7 (plano §4.3, D2 (i)) — a marcação imediata do movimento que tira a conta do "a cobrar" (baixa que quita, `cancel`,
 * `reopen`). PROCESSING → nada (quem fecha é a releitura do registro); NEEDS_REVIEW → nada (§9 D-2: a conferência é do
 * operador, e o claim nunca pega NEEDS_REVIEW).
 */
export function eagerPlan(lines: readonly BillingOutboxRow[], charges: readonly SubscriptionStatementCharge[]): EagerPlan {
  const outcomes = lines.filter((line) => line.kind === "charge_create").map((line) => ({ line, outcome: eagerOutcome(line, charges) }));
  const skippable = outcomes.filter((item) => item.outcome === "skip").map((item) => item.line); // [EAGER-SKIPPABLE]
  const cancelTargets = outcomes.filter((item) => item.outcome === "cancel").map((item) => item.line); // [EAGER-CANCEL]
  return { skippable, cancelTargets };
}

/**
 * A3 (plano §4.6) — o que o reopen lê sob a trava, DEPOIS do marcador GUARD-01: a `charge_create` em voo, e a cobrança que
 * ocupa o lugar pela TABELA (`pending`/`confirmed`), ou uma SENT cuja cobrança não é terminal (inclusive fora da tabela).
 */
export function reopenLiveCheck(
  lines: readonly BillingOutboxRow[],
  charges: readonly SubscriptionStatementCharge[],
): { readonly inFlight: boolean; readonly liveCharge: boolean } {
  const outcomes = lines.filter((line) => line.kind === "charge_create").map((line) => reopenOutcome(line, charges));
  return {
    inFlight: outcomes.includes("in_flight"),
    liveCharge:
      charges.some((charge) => CHARGE_RULES[charge.status].occupiesSlot) || // [REOPEN-SLOT]
      outcomes.includes("live") || // [REOPEN-SENT-LIVE]
      false,
  };
}

const CLOSING_METHODS: readonly PaymentMethod[] = ["pix", "boleto", "credit_card", "debit_card"];

/** §9 D-8: o método do fechamento vem do perfil de cobrança; ausente, `undefined` ou fora da lista → `pix` (o despacho manda o
 * perfil incompleto à conferência pelo gate de sempre). */
export function closingMethodOf(profileMethod: string | null | undefined): PaymentMethod {
  return typeof profileMethod === "string" && (CLOSING_METHODS as readonly string[]).includes(profileMethod) ? (profileMethod as PaymentMethod) : "pix";
}
