import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4-4 — Lançamento de caixa (Caixa/Extrato) e LIQUIDAÇÃO de título. direction ∈ {in,out},
// payment_method ∈ {cash,pix,boleto,card,transfer,check}, currency = moeda da conta (BRL no v1) — todos
// validados na aplicação. competencia ('YYYY-MM') é DERIVADA de occurred_at no servidor (mesma
// deriveCompetencia do título). account_id é OBRIGATÓRIA e ATIVA. title_id só é preenchido pela
// liquidação. reversal_of aponta o lançamento original de um estorno (contra-lançamento). reconciled
// nasce false (Ω4-5). Delete LÓGICO via deleted_at.

export const FINANCIAL_ENTRY_DIRECTIONS = ["in", "out"] as const;
export const FINANCIAL_ENTRY_PAYMENT_METHODS = ["cash", "pix", "boleto", "card", "transfer", "check"] as const;
export const FINANCIAL_ENTRY_CURRENCIES = ["BRL"] as const;

// Ω4-5 — divergence_type ∈ {value,date}: "conciliado com ressalva" (bate no extrato, mas VALOR ou DATA
// divergem) → só faz sentido com reconciled=true. Estreitado do guia original {value,date,missing,duplicate}:
// missing/duplicate são razões de NÃO-conciliação (estado reconciled=false), inalcançáveis num write-path que
// só grava divergence quando reconciled=true — a semântica ficaria contraditória (ver P-Ω4-5-DIVERGENCE).
export const FINANCIAL_ENTRY_DIVERGENCE_TYPES = ["value", "date"] as const;
export type FinancialEntryDivergenceType = (typeof FINANCIAL_ENTRY_DIVERGENCE_TYPES)[number];

export type FinancialEntryDirection = (typeof FINANCIAL_ENTRY_DIRECTIONS)[number];
export type FinancialEntryPaymentMethod = (typeof FINANCIAL_ENTRY_PAYMENT_METHODS)[number];

export type FinancialEntryActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type FinancialEntry = {
  readonly id: string;
  readonly tenantId: string;
  readonly accountId: string;
  readonly titleId?: string;
  readonly direction: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: string;
  readonly category?: string;
  readonly occurredAt: Date;
  readonly competencia: string;
  readonly description?: string;
  readonly reversalOf?: string;
  readonly reconciled: boolean;
  readonly divergenceType?: string;
  readonly reconciliationRef?: string;
  readonly reconciledAt?: Date;
  readonly reconciledBy?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

// title_id/reversal_of NÃO entram pelo create público (avulso). title_id vem só da liquidação
// (payTitle); reversal_of vem só do estorno (reverse). reconciled nasce false (Ω4-5).
export type CreateFinancialEntryInput = {
  readonly tenantId: string;
  readonly accountId: string;
  readonly titleId?: string;
  readonly direction: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: string;
  readonly category?: string;
  readonly occurredAt: Date;
  readonly competencia: string;
  readonly description?: string;
  readonly reversalOf?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

// PATCH — editáveis: category/description. IMUTÁVEIS pós-create: amount/direction/account/occurred_at/
// competencia/currency (mexer em occurred_at moveria a competência e furaria o chokepoint do período).
export type UpdateFinancialEntryInput = {
  readonly tenantId: string;
  readonly financialEntryId: string;
  readonly category?: string;
  readonly description?: string;
  readonly updatedBy?: string;
};

// PATCH /reconcile — write-path da conciliação bancária (Ω4-5). O service SEMPRE resolve os 5 campos de
// estado (reconciled + os 4 metadados), inclusive null explícito no desconciliar (limpa divergence/ref/at/by).
export type ReconcileFinancialEntryInput = {
  readonly tenantId: string;
  readonly financialEntryId: string;
  readonly reconciled: boolean;
  readonly divergenceType: string | null;
  readonly reconciliationRef: string | null;
  readonly reconciledAt: Date | null;
  readonly reconciledBy: string | null;
  readonly updatedBy?: string;
};

export type ListFinancialEntryInput = {
  readonly tenantId: string;
  readonly includeDeleted: boolean;
  readonly accountId?: string;
  readonly direction?: string;
  readonly category?: string;
  readonly reconciled?: boolean;
  readonly divergenceType?: string;
  readonly occurredFrom?: Date;
  readonly occurredTo?: Date;
  readonly limit: number;
  readonly offset: number;
};

export type ListFinancialEntryResult = {
  readonly items: readonly FinancialEntry[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

// Saldo COMPUTADO no backend (front nunca soma): opening_balance + Σ(in ativos) − Σ(out ativos).
export type FinancialAccountBalance = {
  readonly accountId: string;
  readonly currency: string;
  readonly openingBalance: number;
  readonly in: number;
  readonly out: number;
  readonly balance: number;
};

export class FinancialEntryError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FinancialEntryError";
  }
}
