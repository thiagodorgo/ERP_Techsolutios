// B-ASS-06 · F2 — mapa de estados Asaas → nosso enum (plano §4.6, R-PAY-2; D3/§12.2).
//
//  - pago: CONFIRMED, RECEIVED, RECEIVED_IN_CASH, DUNNING_RECEIVED.
//  - REFUNDED → refunded; OVERDUE → overdue; PENDING/AWAITING_RISK_ANALYSIS/DUNNING_REQUESTED → pending.
//  - chargeback: CHARGEBACK_REQUESTED/CHARGEBACK_DISPUTE → chargeback_disputed; AWAITING_CHARGEBACK_REVERSAL
//    → chargeback_disputed + dispute_won_pending (disputa VENCIDA — D3). `charged_back` NÃO nasce aqui: só na
//    máquina de estados do B-ASS-08 (reconsulta final REFUNDED após disputa, ou resolve { outcome: lost }).
//  - REFUND_REQUESTED/REFUND_IN_PROGRESS: N4 removeu `pending_refund`; são estados transitórios representados
//    pela linha `refund` da outbox (B-ASS-08), então mapeiam para `unknown` (o `raw` preserva tudo).

import type { ChargeStatus } from "../payment-provider.port.js";

export type AsaasChargeState = {
  readonly status: ChargeStatus;
  readonly disputeWonPending?: boolean;
};

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"]);
const PENDING = new Set(["PENDING", "AWAITING_RISK_ANALYSIS", "DUNNING_REQUESTED"]);

export function asaasStatusToOurs(providerStatus: string): AsaasChargeState {
  if (PAID.has(providerStatus)) return { status: "paid" };
  switch (providerStatus) {
    case "REFUNDED":
      return { status: "refunded" };
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
      return { status: "chargeback_disputed" };
    case "AWAITING_CHARGEBACK_REVERSAL":
      return { status: "chargeback_disputed", disputeWonPending: true };
    case "OVERDUE":
      return { status: "overdue" };
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
      return { status: "unknown" };
    default:
      return PENDING.has(providerStatus) ? { status: "pending" } : { status: "unknown" };
  }
}
