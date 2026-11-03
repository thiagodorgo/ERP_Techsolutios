import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// B-PATIO-REC-01 (plano v3 §4, emenda 1 §3.1/§6.2.2/§8.2.5) — domínio da intenção de pagamento on-line da taxa de pátio.
// Sem rede: nada aqui chama provedor. O dinheiro mora nas COLUNAS (§4.1), não no estado: o estado diz o que a intenção
// é; `paid = applied + held + refunded` diz onde cada centavo está. Enums em inglês validados na app E no banco (CHECK).

export type ImpoundPaymentActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// §4.2 — os 8 estados locais. Não há `paid`, `needs_review`, `refunded` nem `charged_back` como estado (L8b).
export const INTENT_STATUSES = [
  "pending",
  "cancel_requested",
  "cancelled",
  "expired",
  "settled",
  "funds_held",
  "disputed",
  "reversed",
] as const;
export type IntentStatus = (typeof INTENT_STATUSES)[number];

// §4.2 — LINK ABERTO: os únicos estados em que o pagador tem um link que pode pagar. É o conjunto da UNIQUE parcial
// do banco (`impound_payment_intents_live_link_key`, M-REC-1). O repositório em memória usa ESTA constante para imitar
// a UNIQUE, e o T-DOM-26 confere que ela é igual à lista do `WHERE` do índice no `migration.sql` (emenda F-1).
export const LIVE_LINK_STATUSES = ["pending", "cancel_requested"] as const;

// §4.2/§4.8 — INTENÇÃO VIVA: regra da APLICAÇÃO, sob a trava do processo (§5.2 (e)). O processo não ganha cobrança nova
// enquanto alguma intenção dele estiver num destes estados. NÃO é a UNIQUE do banco (P-REC-27).
export const LIVE_INTENT_STATUSES = ["pending", "cancel_requested", "funds_held", "disputed"] as const;
export const HELD_FUNDS_STATUSES = ["funds_held", "disputed"] as const;

// §4.1 — motivo de toda parte RETIDA (`held_cents > 0 ⇔ held_reason`).
export const HELD_REASONS = [
  "amount_short",
  "overpayment",
  "duplicate_payment",
  "paid_after_cancel",
  "paid_after_expire",
  "paid_after_manual_settlement",
  "paid_after_reversal",
  "reversal_remainder",
  "refund_requested",
  "refund_unclassified",
  "chargeback_disputed",
] as const;
export type HeldReason = (typeof HELD_REASONS)[number];

// §4.1 — em `settled`, o retido (se houver) só pode ser excedente ou pagamento em dobro.
export const SETTLED_HELD_REASONS = ["overpayment", "duplicate_payment"] as const;

// §4.4 M1 (coluna CR) — por que o sistema pediu o cancelamento. O motivo decide o `held_reason` se o pagamento chegar
// na corrida (cancel/due_changed/sibling_funds_held/connection_retired → paid_after_cancel; expire → paid_after_expire;
// manual_settlement → paid_after_manual_settlement).
export const CANCEL_REASONS = ["cancel", "expire", "manual_settlement", "due_changed", "sibling_funds_held", "connection_retired"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

// P-REC-1 — os três meios obrigatórios. Boleto fora (L4/Q7: "o boleto atrasa a liberação").
export const PAYMENT_METHODS = ["pix", "credit_card", "debit_card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// P-REC-3 — só a TAXA DE PÁTIO é cobrável on-line: os encargos exigíveis do ledger do charging (remoção, diária e
// avulso). Multa e taxa do órgão "por lá" (REGISTRO-PENDENTE.md:86): nenhuma linha nem intenção as representa. O
// ADJUSTMENT não é encargo, é correção (entra no líquido da linha que aponta).
export const PAYABLE_CHARGE_KINDS = ["REMOVAL", "DAILY", "ADDITIONAL"] as const;
export type PayableChargeKind = (typeof PAYABLE_CHARGE_KINDS)[number];

// P-REC-22b (emenda §3.1, §6.2.3) — a conta de uma cobrança é a conexão PRÓPRIA da organização OU a conexão do GRUPO
// de que ela é membro. **Não há variante para a conta da plataforma**: o pátio nunca cobra nela, em modo nenhum.
export type IntentAccount =
  | { readonly scope: "organization"; readonly connectionId: string }
  | { readonly scope: "group"; readonly groupId: string; readonly groupConnectionId: string };
export type IntentAccountScope = IntentAccount["scope"];

// Os motivos de recusa da resolução da conta (emenda §2.2). O REC-01 só define a porta; o REC-04 injeta o resolvedor real.
export const PAYMENT_RESOLVER_REASONS = [
  "payment_mode_unset",
  "payment_group_unset",
  "group_connection_not_active",
  "connection_not_active",
  "provider_not_validated",
  "credential_unreadable",
  "payment_methods_insufficient",
] as const;
export type PaymentResolverReason = (typeof PAYMENT_RESOLVER_REASONS)[number];

export type PaymentConnectionResolution =
  | { readonly ok: true; readonly account: IntentAccount; readonly provider: string; readonly methods: readonly PaymentMethod[] }
  | { readonly ok: false; readonly reason: PaymentResolverReason };

// Porta da conexão (REC-04 injeta a real). PADRÃO FAIL-CLOSED: recusa com `payment_mode_unset` (LO-5/Q8b: sem modo, só
// baixa manual). Não é "noop": o padrão RECUSA.
export interface PaymentConnectionPort {
  resolve(tenantId: string): Promise<PaymentConnectionResolution>;
}

// Portão do canal (REC-02a injeta o real). PADRÃO FAIL-CLOSED: desligado → 422 `channel_disabled`, nada chama fora.
export interface OnlinePaymentChannelGate {
  isEnabled(tenantId: string): Promise<boolean>;
}

// §4.1 — a intenção. Dinheiro em CENTAVOS INTEIROS na app (no banco, Decimal(12,2), conversão exata).
export type ImpoundPaymentIntent = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly status: IntentStatus;
  readonly cancelReason?: CancelReason;
  readonly currency: string;
  readonly amountCents: number;
  readonly paidCents: number;
  readonly appliedCents: number;
  readonly heldCents: number;
  readonly heldReason?: HeldReason;
  readonly refundedCents: number;
  readonly methods: readonly PaymentMethod[];
  readonly payerName: string;
  readonly payerDocument: string;
  readonly provider: string;
  readonly account: IntentAccount;
  readonly externalChargeId?: string;
  readonly payUrl?: string;
  readonly pixCopyPaste?: string;
  readonly expiresAt: Date;
  readonly settledChargeIds: readonly string[];
  readonly settledAt?: Date;
  readonly reversedAt?: Date;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// v3 §5.5 — a referência GLOBAL (só ids e datas: nem valor, nem PII, nem estado de dinheiro).
export const WATCH_LEVELS = ["open", "hot", "warm", "cold", "none"] as const;
export type WatchLevel = (typeof WATCH_LEVELS)[number];

export type ImpoundPaymentRef = {
  readonly intentId: string;
  readonly tenantId: string;
  readonly provider: string;
  readonly account: IntentAccount;
  readonly externalChargeId?: string;
  readonly watch: WatchLevel;
  readonly nextCheckAt?: Date;
  readonly watchUntil?: Date;
  readonly refundRequestedAt?: Date;
};

// A linha de fila que o canal (REC-02a) despacha. Só ids e a referência tipada `patio:<id>`; corpo sem segredo e SEM
// `split` (R-KEEP-5).
export type PatioOutboxLine = {
  readonly kind: "patio_charge_create";
  readonly tenantId: string;
  readonly intentId: string;
  readonly reference: string;
};

export type NewIntentInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly methods: readonly PaymentMethod[];
  readonly payerName: string;
  readonly payerDocument: string;
  readonly provider: string;
  readonly account: IntentAccount;
  readonly expiresAt: Date;
  readonly actorId?: string;
  readonly occurredAt: Date;
};

// §5.1 — o devido CAPADO ao teto (dono = charging). `undefined` = processo inexistente para a organização.
export type SettleableDue = {
  readonly dueCents: number;
  readonly overAccruedUnreconciled: boolean;
  readonly currency: string;
};

// §5.2 (c) — o estado do processo e do dossiê de liberação, lido SOB a trava do processo.
export type ProcessReleaseState = {
  readonly processStatus: string;
  readonly activeReleaseKind?: "STANDARD" | "FOR_REPAIR";
};

export class ImpoundPaymentError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ImpoundPaymentError";
  }
}

export class IntentAccountError extends ImpoundPaymentError {
  constructor() {
    super(422, "ONLINE_PAYMENT_UNAVAILABLE", "account_not_allowed", "The resolved account is not allowed for a yard fee charge.");
    this.name = "IntentAccountError";
  }
}
