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
  readonly createdAt: Date;
  readonly updatedAt: Date;
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
};

export type ListCommissionStatementsInput = ListCommissionsInput & {
  readonly status?: CommissionStatementStatus;
  readonly payeeId?: string;
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
