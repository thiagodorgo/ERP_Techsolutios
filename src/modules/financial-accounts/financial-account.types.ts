import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type FinancialAccountActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω4-1 — Conta financeira (cadastro puro). Chave natural = [tenant_id, name] entre contas ATIVAS
// (unique PARCIAL WHERE is_active=true → 409 duplicate_account; recriar o nome após soft-delete é
// permitido). kind ∈ {cash,bank,wallet} e currency ∈ {BRL} são validados na aplicação. Delete é
// LÓGICO: is_active=false + status='inactive'. openingBalance é Decimal(12,2) ≥ 0 (número no DTO).
export type FinancialAccountKind = "cash" | "bank" | "wallet";

export const FINANCIAL_ACCOUNT_KINDS = ["cash", "bank", "wallet"] as const;
export const FINANCIAL_ACCOUNT_CURRENCIES = ["BRL"] as const;

export type FinancialAccount = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly kind: string;
  readonly currency: string;
  readonly openingBalance: number;
  readonly bankName?: string;
  readonly agency?: string;
  readonly accountNumber?: string;
  readonly document?: string;
  readonly notes?: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListFinancialAccountInput = {
  readonly tenantId: string;
  readonly includeInactive: boolean;
  readonly kind?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListFinancialAccountResult = {
  readonly items: readonly FinancialAccount[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateFinancialAccountInput = Omit<
  FinancialAccount,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

// PATCH — campos editáveis nesta fatia: name/kind/currency/openingBalance/bank_name/agency/
// account_number/document/notes. currency/openingBalance seguem editáveis (documentado: ainda não
// há movimento; é só o saldo de abertura). O ciclo de vida (is_active/status) é do DELETE lógico.
export type UpdateFinancialAccountInput = {
  readonly tenantId: string;
  readonly financialAccountId: string;
  readonly name?: string;
  readonly kind?: string;
  readonly currency?: string;
  readonly openingBalance?: number;
  readonly bankName?: string;
  readonly agency?: string;
  readonly accountNumber?: string;
  readonly document?: string;
  readonly notes?: string;
  readonly updatedBy?: string;
};

export class FinancialAccountError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FinancialAccountError";
  }
}
