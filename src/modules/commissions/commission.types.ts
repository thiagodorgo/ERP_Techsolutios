import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const COMMISSION_POLICY_STATUSES = ["draft", "active", "paused", "archived"] as const;
export const COMMISSION_BASIS_EVENT_STATUSES = [
  "received",
  "eligible",
  "ineligible",
  "pending_review",
  "superseded",
] as const;
export const COMMISSION_CALCULATION_STATUSES = [
  "pending",
  "calculated",
  "disputed",
  "approved",
  "rejected",
  "reversed",
] as const;
export const COMMISSION_STATEMENT_STATUSES = ["open", "closed", "approved", "exported", "settled"] as const;

export type CommissionPolicyStatus = (typeof COMMISSION_POLICY_STATUSES)[number];
export type CommissionBasisEventStatus = (typeof COMMISSION_BASIS_EVENT_STATUSES)[number];
export type CommissionCalculationStatus = (typeof COMMISSION_CALCULATION_STATUSES)[number];
export type CommissionStatementStatus = (typeof COMMISSION_STATEMENT_STATUSES)[number];
export type CommissionJsonRecord = Record<string, unknown>;

export type CommissionActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type CommissionPolicyRule = {
  readonly id: string;
  readonly tenantId: string;
  readonly policyId: string;
  readonly ruleType: string;
  readonly basisType: string;
  readonly rateType: string;
  readonly rateValue: number;
  readonly conditions: CommissionJsonRecord;
  readonly priority: number;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CommissionPolicy = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly scope: string;
  readonly vertical: string;
  readonly status: CommissionPolicyStatus;
  readonly effectiveFrom: Date;
  readonly effectiveTo?: Date;
  readonly version: number;
  readonly createdBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly rules: readonly CommissionPolicyRule[];
};

export type CommissionBasisEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceEventName: string;
  readonly idempotencyKey: string;
  readonly payload: CommissionJsonRecord;
  readonly occurredAt: Date;
  readonly status: CommissionBasisEventStatus;
  readonly policyId?: string;
  readonly createdAt: Date;
};

export type CommissionCalculation = {
  readonly id: string;
  readonly tenantId: string;
  readonly basisEventId: string;
  readonly policyId: string;
  readonly eligibleUserId?: string;
  readonly payeeId?: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: CommissionCalculationStatus;
  readonly calculationSnapshot: CommissionJsonRecord;
  readonly idempotencyKey: string;
  // Ω4C PR-10 (D-Ω4C-REM-MODEL) — marcador de liquidação. settledAt = a "bolinha" (definida → liquidada);
  // settlementRef = o group_id do crédito no extrato do profissional (deep-link "Ver no extrato"). SEM
  // dinheiro (o crédito vive só no extrato); status legado permanece ortogonal.
  readonly settledAt?: Date;
  readonly settlementRef?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  // Basis origin resolved for the drill-down from the linked CommissionBasisEvent
  // (source_type/source_id). Undefined when the basis event cannot be resolved.
  readonly sourceType?: string;
  readonly sourceId?: string;
};

export type CommissionStatement = {
  readonly id: string;
  readonly tenantId: string;
  readonly payeeId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly status: CommissionStatementStatus;
  readonly totalAmount: number;
  readonly currency: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListCommissionsInput = {
  readonly tenantId: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListCommissionPoliciesInput = ListCommissionsInput & {
  readonly status?: CommissionPolicyStatus;
  readonly vertical?: string;
};

export type ListCommissionBasisEventsInput = ListCommissionsInput & {
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly status?: CommissionBasisEventStatus;
};

export type ListCommissionCalculationsInput = ListCommissionsInput & {
  readonly status?: CommissionCalculationStatus;
  readonly payeeId?: string;
  readonly from?: Date;
  readonly to?: Date;
};

export type ListCommissionStatementsInput = ListCommissionsInput & {
  readonly status?: CommissionStatementStatus;
  readonly payeeId?: string;
};

export type SummarizeCalculationsByPayeeInput = {
  readonly tenantId: string;
  readonly payeeId?: string;
  readonly from?: Date;
  readonly to?: Date;
};

export type CommissionPayeeSummaryItem = {
  readonly payeeId: string;
  readonly total: number;
  readonly count: number;
};

export type CommissionPayeeSummary = {
  readonly items: readonly CommissionPayeeSummaryItem[];
  readonly total: number;
};

export type CommissionSummaryResult = CommissionPayeeSummary & {
  readonly from?: Date;
  readonly to?: Date;
};

export type ListResult<T> = {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateCommissionPolicyRuleInput = {
  readonly tenantId: string;
  readonly policyId: string;
  readonly ruleType: string;
  readonly basisType: string;
  readonly rateType: string;
  readonly rateValue: number;
  readonly conditions: CommissionJsonRecord;
  readonly priority: number;
  readonly active: boolean;
};

export type CreateCommissionPolicyInput = {
  readonly tenantId: string;
  readonly name: string;
  readonly scope: string;
  readonly vertical: string;
  readonly status: CommissionPolicyStatus;
  readonly effectiveFrom: Date;
  readonly effectiveTo?: Date;
  readonly version: number;
  readonly createdBy?: string;
  readonly rules: readonly Omit<CreateCommissionPolicyRuleInput, "tenantId" | "policyId">[];
};

export type CreateCommissionBasisEventInput = {
  readonly tenantId: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly sourceEventName: string;
  readonly idempotencyKey: string;
  readonly payload: CommissionJsonRecord;
  readonly occurredAt: Date;
  readonly status: CommissionBasisEventStatus;
  readonly policyId?: string;
};

// Ω4C PR-10 (D-Ω4C-REM-SETTLE-RAIL) — liquidação em lote das linhas de remuneração já existentes. PR-10 NÃO
// computa/fabrica percentual (parada honesta D-Ω4C-REM-COMPUTE-DEFER): o valor de cada linha É
// `CommissionCalculation.amount` (NUNCA a tarifa de venda). O settle apenas CONFERE + CREDITA no extrato do
// profissional + marca o calculation como liquidado.
export type SettleCalculationsInput = {
  readonly calculationIds: readonly string[];
  readonly settlementDate: Date;
  readonly description?: string;
};

// Disposição por linha da liquidação. `settled` = crédito lançado + marcado; `already_settled` = idempotente
// (settled_at já definido, nada re-lançado); `skipped_zero` = amount ≤ 0 (não cria crédito vazio).
export const SETTLEMENT_OUTCOMES = ["settled", "already_settled", "skipped_zero"] as const;
export type SettlementOutcome = (typeof SETTLEMENT_OUTCOMES)[number];

export type SettlementLineResult = {
  readonly calculationId: string;
  readonly outcome: SettlementOutcome;
  // group_id do lançamento de crédito no extrato (deep-link "Ver no extrato"); presente em settled/already_settled.
  readonly statementGroupId?: string;
  // operator_profile creditado (para o deep-link /fleet/statement/:operatorProfileId no front).
  readonly operatorProfileId?: string;
};

export type SettleCalculationsResult = {
  readonly lines: readonly SettlementLineResult[];
  readonly settledCount: number;
  readonly settledTotal: number;
  readonly settlementDate: Date;
};

// D-Ω4C-REM-SETTLE-RAIL — seam de colaboradores (forward, sem ciclo: commissions → professional-statements /
// operator-profiles). Injetados via factory: nunca importados invertidamente pelos módulos-fonte.
export type CommissionStatementCreditInput = {
  readonly operatorProfileId: string;
  readonly sourceId: string; // = o calculationId (idempotência de origem do extrato)
  readonly amount: number; // já arredondado a Decimal(12,2) no seam
  readonly firstDueDate: Date;
  readonly description?: string;
};

// Posta o CRÉDITO no extrato (createForSource — entry_type/direction/source_type TIPADOS e FIXADOS; amount
// travado ao calc.amount; single-profissional; installmentTotal=1). Devolve o group_id do lançamento.
export type CommissionStatementCreditPoster = (
  actor: CommissionActorContext,
  input: CommissionStatementCreditInput,
) => Promise<{ readonly groupId: string }>;

// Resolve payee (User) → operator_profile (a folha). undefined → payee não é profissional de campo.
export type CommissionOperatorProfileByUserResolver = (
  tenantId: string,
  userId: string,
) => Promise<{ readonly operatorProfileId: string } | undefined>;

export type CommissionSettlementCollaborators = {
  readonly postStatementCredit: CommissionStatementCreditPoster;
  readonly resolveOperatorProfileByUser: CommissionOperatorProfileByUserResolver;
};

export class CommissionError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CommissionError";
  }
}
