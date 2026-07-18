import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4-2a — Título financeiro (a pagar/receber). Agregado-núcleo do financeiro do tenant.
// direction ∈ {receivable,payable}, party_type ∈ {customer,supplier,other}, currency ∈ {BRL},
// status ∈ {open,scheduled,partially_paid,paid,in_dispute,cancelled} — todos validados na aplicação.
// competencia ('YYYY-MM') é DERIVADA de issue_date no servidor (NUNCA do corpo). paid_amount nasce 0 e
// é dirigido por pagamentos (Ω4-4). party_id é polimórfico (SEM FK nativa). Delete LÓGICO via deleted_at.

export const FINANCIAL_TITLE_DIRECTIONS = ["receivable", "payable"] as const;
export const FINANCIAL_TITLE_PARTY_TYPES = ["customer", "supplier", "other"] as const;
export const FINANCIAL_TITLE_CURRENCIES = ["BRL"] as const;
export const FINANCIAL_TITLE_STATUSES = [
  "open",
  "scheduled",
  "partially_paid",
  "paid",
  "in_dispute",
  "cancelled",
] as const;

export type FinancialTitleDirection = (typeof FINANCIAL_TITLE_DIRECTIONS)[number];
export type FinancialTitlePartyType = (typeof FINANCIAL_TITLE_PARTY_TYPES)[number];
export type FinancialTitleStatus = (typeof FINANCIAL_TITLE_STATUSES)[number];

export type FinancialTitleActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type FinancialTitle = {
  readonly id: string;
  readonly tenantId: string;
  readonly direction: string;
  readonly partyType: string;
  readonly partyId?: string;
  readonly partyName: string;
  readonly document?: string;
  readonly category?: string;
  readonly description?: string;
  readonly amount: number;
  readonly currency: string;
  readonly issueDate: Date;
  readonly dueDate: Date;
  readonly paidAmount: number;
  readonly status: string;
  readonly competencia: string;
  readonly accountId?: string;
  readonly workOrderId?: string;
  readonly serviceQuoteId?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

// paid_amount NÃO entra no create (nasce 0, dirigido por pagamentos no Ω4-4). work_order_id/
// service_quote_id são proveniência populada no Ω4-3 — não aceitos por esta fatia.
export type CreateFinancialTitleInput = {
  readonly tenantId: string;
  readonly direction: string;
  readonly partyType: string;
  readonly partyId?: string;
  readonly partyName: string;
  readonly document?: string;
  readonly category?: string;
  readonly description?: string;
  readonly amount: number;
  readonly currency: string;
  readonly issueDate: Date;
  readonly dueDate: Date;
  readonly status: string;
  readonly competencia: string;
  readonly accountId?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

// PATCH — editáveis nesta fatia: party_name/document/category/description/amount/due_date/account_id.
// IMUTÁVEIS pós-create: status/paid_amount/competencia/direction/party_type (não entram no update).
export type UpdateFinancialTitleInput = {
  readonly tenantId: string;
  readonly financialTitleId: string;
  readonly partyName?: string;
  readonly document?: string;
  readonly category?: string;
  readonly description?: string;
  readonly amount?: number;
  readonly dueDate?: Date;
  readonly accountId?: string;
  readonly updatedBy?: string;
};

export type ChangeFinancialTitleStatusInput = {
  readonly tenantId: string;
  readonly financialTitleId: string;
  readonly status: string;
  readonly updatedBy?: string;
};

export type ListFinancialTitleInput = {
  readonly tenantId: string;
  readonly includeDeleted: boolean;
  readonly direction?: string;
  readonly status?: string;
  readonly partyType?: string;
  readonly overdue?: boolean;
  readonly dueFrom?: Date;
  readonly dueTo?: Date;
  readonly limit: number;
  readonly offset: number;
};

export type ListFinancialTitleResult = {
  readonly items: readonly FinancialTitle[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export class FinancialTitleError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FinancialTitleError";
  }
}
