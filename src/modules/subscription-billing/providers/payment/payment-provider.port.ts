// B-ASS-06 · F1 — a PORTA comum de pagamento (plano §4.6). Tudo o que o serviço/outbox (B-ASS-08)
// conhece é esta interface; cada provedor implementa um adaptador. Nada aqui toca a rede.
//
// `createCharge` sempre recebe `externalReference = statement_id` (nosso UUID). Estados do provedor
// são mapeados para o NOSSO enum (G9) por tabela em cada adaptador.

export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "boleto";

export type ChargeStatus =
  | "pending"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "chargeback_disputed"
  | "charged_back"
  | "unknown";

export type CustomerProfile = {
  readonly name: string;
  /** cpfCnpj, como o provedor usa para localizar o cliente antes de criar. */
  readonly document: string;
  readonly email?: string;
  readonly phone?: string;
};

export type CreateChargeInput = {
  readonly customerId: string;
  readonly amountCents: number;
  /** Data de vencimento, `YYYY-MM-DD`. */
  readonly dueDate: string;
  readonly description?: string;
  /** `statement_id` (nosso UUID). */
  readonly externalReference: string;
  readonly method: PaymentMethod;
  readonly idempotencyKey?: string;
};

export type ChargeResult = {
  readonly chargeId: string;
  readonly status: ChargeStatus;
  readonly payUrl?: string;
  readonly pixCopyPaste?: string;
  readonly boletoLine?: string;
  readonly boletoUrl?: string;
};

export type ChargeLookup = {
  readonly status: ChargeStatus;
  readonly paidAt?: string;
  readonly paidCents?: number;
  /** D3/§12.2: `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` → chargeback_disputed com disputa vencida pendente. */
  readonly disputeWonPending?: boolean;
  /** A resposta crua do provedor, para a máquina de estados do B-ASS-08. */
  readonly raw: Readonly<Record<string, unknown>>;
};

export type RegisterWebhookInput = {
  readonly url: string;
  /** O segredo nosso (webhook_secret do cofre). */
  readonly secret: string;
  readonly events: readonly string[];
};

export type RegisterWebhookResult = { readonly externalId: string } | { readonly manual: true };

export type VerifyWebhookInput = {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly rawBody: string;
  readonly query: Readonly<Record<string, string | string[] | undefined>>;
};

export type VerifyWebhookResult = {
  readonly ok: boolean;
  readonly eventId?: string;
  readonly chargeId?: string;
  readonly externalReference?: string;
  readonly kind?: string;
};

export type ProviderDescription = {
  readonly provider: string;
  readonly supportedMethods: readonly PaymentMethod[];
  readonly pendingHomologation: readonly string[];
  readonly webhookRegistration: "api" | "manual";
};

export interface PaymentProviderPort {
  ensureCustomer(profile: CustomerProfile): Promise<{ readonly customerId: string }>;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(chargeId: string): Promise<ChargeLookup>;
  findChargeByExternalReference(ref: string): Promise<{ readonly chargeId: string; readonly status: ChargeStatus } | null>;
  cancelCharge(chargeId: string): Promise<{ readonly chargeId: string; readonly status: ChargeStatus }>;
  refund(chargeId: string, amountCents?: number): Promise<{ readonly chargeId: string; readonly status: ChargeStatus }>;
  registerWebhook(input: RegisterWebhookInput): Promise<RegisterWebhookResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
  supportedMethods(): readonly PaymentMethod[];
  describe(): ProviderDescription;
}
