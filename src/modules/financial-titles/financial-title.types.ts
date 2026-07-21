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

// Ω4C PR-02 (D-Ω4C-FIN-SOURCE-ENUM) — enum-app das FONTES de frota que lançam contas a pagar por origem.
// Inglês no código; label PT-BR na fronteira de apresentação. `fine` já reservado aqui, mas o consumidor de
// Multa (condutor-responsável) fica para o PR-09 — nesta fatia só fuel_log/maintenance_order/insurance_policy
// montam a route-factory.
export const FINANCIAL_TITLE_SOURCE_TYPES = ["fuel_log", "maintenance_order", "fine", "insurance_policy"] as const;

export type FinancialTitleDirection = (typeof FINANCIAL_TITLE_DIRECTIONS)[number];
export type FinancialTitlePartyType = (typeof FINANCIAL_TITLE_PARTY_TYPES)[number];
export type FinancialTitleStatus = (typeof FINANCIAL_TITLE_STATUSES)[number];
export type FinancialTitleSourceType = (typeof FINANCIAL_TITLE_SOURCE_TYPES)[number];

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
  // Ω4C PR-02 — proveniência GENÉRICA (frota). Coexiste com workOrderId/serviceQuoteId.
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

// paid_amount NÃO entra no create (nasce 0, dirigido por pagamentos no Ω4-4). service_quote_id segue
// como proveniência não-aceita nesta fatia. Ω4-3: workOrderId É aceito, mas SÓ pelo caminho de
// faturamento (createForWorkOrder) — o create público sempre o deixa undefined.
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
  readonly workOrderId?: string;
  // Ω4C PR-02 — par genérico de proveniência (frota); só o caminho createForSource os popula.
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

// Ω4-3 (D-Ω4-C2) — payload do FATURAMENTO OS→Título. O agregado congelado (amount/currency) já vem
// SOMADO pelo módulo de faturamento; este caminho NUNCA relê tarifa. Grava work_order_id (proveniência
// + âncora da idempotência parcial). status nasce sempre 'open'; competencia é derivada de issueDate.
export type CreateFinancialTitleForWorkOrderInput = {
  readonly workOrderId: string;
  readonly direction: string;
  readonly partyType: string;
  readonly partyId?: string;
  readonly partyName: string;
  readonly amount: number;
  readonly currency: string;
  readonly issueDate: Date;
  readonly dueDate: Date;
};

// Ω4C PR-02 (D-Ω4C-FIN-ORIGEM) — payload do lançamento de conta a pagar POR ORIGEM (frota). Espelha o de
// faturamento OS, mas com o par GENÉRICO source_type/source_id (nunca work_order_id). direction é 'payable'
// nesta fatia; status nasce 'open'; competencia é derivada de issueDate (default = now). currency default BRL.
export type CreateFinancialTitleForSourceInput = {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly direction: string;
  readonly partyType: string;
  readonly partyId?: string;
  readonly partyName: string;
  readonly amount: number;
  readonly currency?: string;
  readonly issueDate?: Date;
  readonly dueDate: Date;
  readonly description?: string;
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

// Ω4-4 — WRITE-PATH dedicado da LIQUIDAÇÃO: grava paid_amount (valor ABSOLUTO novo, já validado
// <= amount) e status ('partially_paid'|'paid') JUNTOS. Contorna assertStatusTransition — é o único
// caminho que alcança partially_paid/paid (a máquina manual não tem aresta entrando neles).
export type ApplyTitlePaymentInput = {
  readonly tenantId: string;
  readonly financialTitleId: string;
  readonly paidAmount: number;
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
