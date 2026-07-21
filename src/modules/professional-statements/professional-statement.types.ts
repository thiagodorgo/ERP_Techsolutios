import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4C PR-03 (D-Ω4C-EXTRATO-MODEL) — Extrato do profissional (razão financeiro POR profissional). Uma linha por
// PARCELA, agrupada por groupId (o "lançamento" é lógico). Enums em INGLÊS no código/schema; labels PT-BR
// (DANO/MULTA/REMUNERAÇÃO/AJUSTE) só na fronteira de apresentação. SEM CHECK no banco — validado na app.

export const PROFESSIONAL_STATEMENT_ENTRY_TYPES = ["damage", "fine", "remuneration", "adjustment"] as const;
export const PROFESSIONAL_STATEMENT_DIRECTIONS = ["debit", "credit"] as const;
export const PROFESSIONAL_STATEMENT_STATUSES = ["pending", "settled", "cancelled"] as const;
export const PROFESSIONAL_STATEMENT_SOURCE_TYPES = ["damage", "fine", "remuneration", "manual"] as const;
export const PROFESSIONAL_STATEMENT_CURRENCIES = ["BRL"] as const;

export type ProfessionalStatementEntryType = (typeof PROFESSIONAL_STATEMENT_ENTRY_TYPES)[number];
export type ProfessionalStatementDirection = (typeof PROFESSIONAL_STATEMENT_DIRECTIONS)[number];
export type ProfessionalStatementStatus = (typeof PROFESSIONAL_STATEMENT_STATUSES)[number];
export type ProfessionalStatementSourceType = (typeof PROFESSIONAL_STATEMENT_SOURCE_TYPES)[number];

export type ProfessionalStatementActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Uma PARCELA do extrato. entry_type/direction/description/source/installment_total são snapshot repetido e
// imutável em cada linha-irmã do mesmo groupId (RN-EXT-10). amount é o valor DA PARCELA (> 0).
export type ProfessionalStatementEntry = {
  readonly id: string;
  readonly tenantId: string;
  readonly operatorProfileId: string;
  readonly groupId: string;
  readonly entryType: string;
  readonly direction: string;
  readonly description?: string;
  readonly amount: number;
  readonly currency: string;
  readonly installmentNumber: number;
  readonly installmentTotal: number;
  readonly dueDate: Date;
  readonly competencia: string;
  readonly status: string;
  readonly settledAt?: Date;
  readonly settlementRef?: string;
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

// Uma PARCELA a inserir (o serviço monta o plano; o repositório persiste o grupo inteiro atomicamente).
export type ProfessionalStatementInstallmentInput = {
  readonly installmentNumber: number;
  readonly installmentTotal: number;
  readonly amount: number;
  readonly dueDate: Date;
  readonly competencia: string;
};

// Cria um LANÇAMENTO (grupo) inteiro — N parcelas que compartilham groupId + o snapshot imutável.
export type CreateProfessionalStatementGroupInput = {
  readonly tenantId: string;
  readonly operatorProfileId: string;
  readonly groupId: string;
  readonly entryType: string;
  readonly direction: string;
  readonly description?: string;
  readonly currency: string;
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly installments: readonly ProfessionalStatementInstallmentInput[];
};

// Consulta do razão de UM profissional (todas as parcelas ATIVAS; a paginação/saldo corrente é derivada no
// serviço sobre o conjunto ordenado — ledger por profissional é pequeno, R1 do plano).
export type ProfessionalStatementLedgerQuery = {
  readonly tenantId: string;
  readonly operatorProfileId: string;
  readonly entryType?: string;
  readonly from?: Date;
  readonly to?: Date;
};

// Lookup do profissional (posse no tenant + rótulo). Retorna undefined → 404 cross-tenant (EXT-03). Expõe
// SÓ o full_name como label — jamais CNH/dado sensível (§2.8/LGPD). Espelha o AccountResolver de financial-titles.
export type ProfessionalOperatorSummary = { readonly fullName?: string };
export type OperatorProfileLookup = (
  tenantId: string,
  operatorProfileId: string,
) => Promise<ProfessionalOperatorSummary | undefined>;

// Resumo agregado do extrato (DERIVADO server-side): Saldo = Σcredit − Σdebit.
export type ProfessionalStatementSummary = {
  readonly currentBalance: number;
  readonly totalDebits: number;
  readonly totalCredits: number;
  readonly count: number;
};

export class ProfessionalStatementError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ProfessionalStatementError";
  }
}
