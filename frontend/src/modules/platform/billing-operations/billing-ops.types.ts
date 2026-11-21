import type { Money } from "./billing-ops.money";

// B-ASS-10c-OPERACAO — os tipos da tela de operação da cobrança da plataforma (`/platform/billing`). As respostas das rotas
// `/api/v1/platform/billing/*` (#608) chegam aqui JÁ LIDAS pelo adapter: dinheiro marcado (`Money`, a string do servidor),
// enumerações fechadas (o que o servidor mandar fora da lista vira "unknown"), e nada de `tenantId` de resposta na tela
// (a organização da linha é a da LEITURA, não a do corpo devolvido).

export const STATEMENT_STATUSES = ["open", "reopened", "closed", "paid", "cancelled"] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number] | "unknown";

export const CHARGE_STATUSES = ["none", "pending", "confirmed", "failed", "cancelled", "partially_refunded", "refunded", "chargeback_disputed", "charged_back", "needs_review"] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number] | "unknown";

export const INVOICE_STATUSES = ["none", "pending", "authorized", "rejected", "cancel_pending", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number] | "unknown";

export const QUEUE_KINDS = ["charge_create", "charge_cancel", "refund", "invoice_issue", "invoice_cancel"] as const;
export type QueueKind = (typeof QUEUE_KINDS)[number] | "unknown";

/** As duas situações da fila que a tela trabalha (as outras não são pedidas). */
export type QueueStatus = "NEEDS_REVIEW" | "FAILED";

export const BACKLOG_CATEGORIES = ["live_on_unpaid", "before_cutoff", "awaiting_provider", "needs_review", "no_intent"] as const;
export type BacklogCategory = (typeof BACKLOG_CATEGORIES)[number];

export const CHARGE_METHODS = ["pix", "boleto", "credit_card", "debit_card"] as const;
export type ChargeMethod = (typeof CHARGE_METHODS)[number];

export const PROVIDER_KINDS = ["payment", "invoice"] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

export const ENVIRONMENTS = ["sandbox", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const CREDENTIAL_KINDS = ["api_token", "webhook_secret", "certificate"] as const;
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export type Organization = { readonly id: string; readonly name: string };

export type HistoryEntry = { readonly at: string; readonly event: string; readonly note: string | null };

export type Statement = {
  readonly id: string;
  readonly period: string;
  readonly status: StatementStatus;
  readonly chargeStatus: ChargeStatus;
  readonly invoiceStatus: InvoiceStatus;
  readonly baseAmount: Money | null;
  readonly usersExtra: number | null;
  readonly usersExtraAmount: Money | null;
  readonly storageExtraAmount: Money | null;
  readonly trackingAmount: Money | null;
  readonly trackingBilledVehicles: number | null;
  readonly adjustmentsAmount: Money | null;
  readonly creditsAppliedAmount: Money | null;
  readonly totalAmount: Money | null;
  readonly paidAmount: Money | null;
  readonly balance: Money | null;
  readonly dueDate: string | null;
  readonly history: readonly HistoryEntry[];
};

export type Payment = {
  readonly id: string;
  readonly source: "manual" | "provider";
  readonly amount: Money | null;
  readonly reversedAmount: Money | null;
  readonly reversed: boolean;
  readonly paidAt: string | null;
  readonly method: string | null;
  readonly note: string | null;
};

export type Credit = { readonly id: string; readonly amount: Money | null; readonly reason: string; readonly status: string };

export type StatementDetail = Statement & { readonly payments: readonly Payment[]; readonly credits: readonly Credit[] };

export type Charge = {
  readonly id: string;
  readonly status: string;
  readonly payUrl: string | null;
  readonly dueDate: string | null;
  readonly createdAt: string | null;
  readonly cancelledAt: string | null;
};

export type ChargesView = { readonly charges: readonly Charge[]; readonly fullAmountChargeOpen: boolean };

export type QueueLine = {
  readonly id: string;
  readonly statementId: string;
  readonly kind: QueueKind;
  readonly status: QueueStatus;
  readonly attempts: number | null;
  readonly lastError: string | null;
  readonly occurredAt: string | null;
  readonly updatedAt: string | null;
};

export type BacklogLine = { readonly statementId: string; readonly period: string; readonly category: BacklogCategory };

export type BillingProfileSummary = { readonly complete: boolean; readonly missing: readonly string[] };

export type ProviderCredential = { readonly kind: CredentialKind; readonly last4: string; readonly createdAt: string | null };

export type Provider = {
  readonly provider: string;
  readonly label: string;
  readonly kind: ProviderKind;
  readonly environment: Environment;
  readonly enabled: boolean;
  readonly configured: boolean;
  readonly settings: Readonly<Record<string, string | number | boolean>>;
  readonly fiscalDataComplete: boolean;
  readonly missing: readonly string[];
  readonly credentials: readonly ProviderCredential[];
  readonly credentialsReadable: boolean | null;
  readonly pendingHomologationCount: number;
  readonly lastTest: { readonly at: string; readonly ok: boolean | null; readonly environment: Environment | null } | null;
};

/** O que foi lido de UMA organização (5 leituras, §3.1 do plano + emenda A3). `failed` = alguma das 5 falhou. */
export type OrganizationReading =
  | { readonly state: "loading" }
  | { readonly state: "failed" }
  | {
      readonly state: "ok";
      readonly statements: readonly Statement[];
      readonly review: readonly QueueLine[];
      readonly failedLines: readonly QueueLine[];
      readonly backlog: readonly BacklogLine[];
      readonly profile: BillingProfileSummary | null;
    };

export type ProvidersReading =
  | { readonly state: "loading" }
  | { readonly state: "forbidden" }
  | { readonly state: "failed" }
  | { readonly state: "ok"; readonly providers: readonly Provider[] };

export type BillingOpsData = {
  /** Leitura da lista de organizações: `forbidden` (403) e `failed` tomam a tela inteira. */
  readonly organizations: readonly Organization[];
  readonly listState: "loading" | "ok" | "forbidden" | "failed";
  readonly readings: Readonly<Record<string, OrganizationReading>>;
  readonly providers: ProvidersReading;
  /** A última releitura falhou e os dados de antes ficaram (estado "dados desatualizados"). */
  readonly stale: boolean;
  /** A última leitura confirmada (ISO), para o aviso de desatualizado. */
  readonly readAt: string | null;
};
