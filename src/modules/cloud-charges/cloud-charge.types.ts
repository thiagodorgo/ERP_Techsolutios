import type {
  CloudCostAllocationRun,
  TenantCloudCostAllocation,
} from "../cloud-cost-allocation/cloud-cost-allocation.types.js";

export const CLOUD_CHARGE_MARKUP_TYPES = ["percentage", "fixed_multiplier", "fixed_amount"] as const;
export type CloudChargeMarkupType = (typeof CLOUD_CHARGE_MARKUP_TYPES)[number];

export const CLOUD_CHARGE_ROUNDING_MODES = [
  "none",
  "nearest_cent",
  "nearest_10_cents",
  "nearest_real",
  "ceil_real",
] as const;
export type CloudChargeRoundingMode = (typeof CLOUD_CHARGE_ROUNDING_MODES)[number];

export const CLOUD_CHARGE_CALCULATION_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type CloudChargeCalculationStatus = (typeof CLOUD_CHARGE_CALCULATION_STATUSES)[number];

export const CLOUD_CHARGE_CALCULATION_STRATEGIES = ["markup_rules_v1"] as const;
export type CloudChargeCalculationStrategy = (typeof CLOUD_CHARGE_CALCULATION_STRATEGIES)[number];

export const TENANT_CLOUD_CHARGE_STATUSES = ["draft", "ready", "locked", "voided"] as const;
export type TenantCloudChargeStatus = (typeof TENANT_CLOUD_CHARGE_STATUSES)[number];

export type CloudChargeMetadata = Record<string, unknown>;

export type CloudChargeRule = {
  readonly id: string;
  readonly tenantId?: string;
  readonly planCode?: string;
  readonly name: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly priority: number;
  readonly effectiveFrom: Date;
  readonly effectiveUntil?: Date;
  readonly currency: string;
  readonly markupType: CloudChargeMarkupType;
  readonly markupValue: number;
  readonly minimumMonthlyCharge: number;
  readonly includedCloudCost: number;
  readonly includedUsageAmount?: number;
  readonly includedUsageMetricKey?: string;
  readonly overageMarkupType?: CloudChargeMarkupType;
  readonly overageMarkupValue?: number;
  readonly roundingMode: CloudChargeRoundingMode;
  readonly metadata: CloudChargeMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CloudChargeCalculationRun = {
  readonly id: string;
  readonly status: CloudChargeCalculationStatus;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly sourceAllocationRunId: string;
  readonly strategy: CloudChargeCalculationStrategy;
  readonly totalAllocatedCost: number;
  readonly totalChargeAmount: number;
  readonly totalMarginAmount: number;
  readonly totalDiscountAmount: number;
  readonly currency?: string;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly createdBy?: string;
  readonly errorMessage?: string;
  readonly metadata: CloudChargeMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type TenantCloudCharge = {
  readonly id: string;
  readonly calculationRunId: string;
  readonly tenantId: string;
  readonly sourceAllocationRunId: string;
  readonly cloudChargeRuleId?: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly allocatedCost: number;
  readonly includedCloudCost: number;
  readonly billableCost: number;
  readonly markupType: CloudChargeMarkupType;
  readonly markupValue: number;
  readonly minimumMonthlyCharge: number;
  readonly grossChargeAmount: number;
  readonly discountAmount: number;
  readonly finalChargeAmount: number;
  readonly marginAmount: number;
  readonly marginPercentage?: number;
  readonly currency: string;
  readonly status: TenantCloudChargeStatus;
  readonly metadata: CloudChargeMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CloudChargeTenant = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly planCode?: string;
};

export type CreateCloudChargeRuleInput = {
  readonly tenantId?: string;
  readonly planCode?: string;
  readonly name: string;
  readonly description?: string;
  readonly isActive?: boolean;
  readonly priority?: number;
  readonly effectiveFrom: Date;
  readonly effectiveUntil?: Date;
  readonly currency: string;
  readonly markupType: CloudChargeMarkupType;
  readonly markupValue: number;
  readonly minimumMonthlyCharge?: number;
  readonly includedCloudCost?: number;
  readonly includedUsageAmount?: number;
  readonly includedUsageMetricKey?: string;
  readonly overageMarkupType?: CloudChargeMarkupType;
  readonly overageMarkupValue?: number;
  readonly roundingMode?: CloudChargeRoundingMode;
  readonly metadata?: CloudChargeMetadata;
};

export type UpdateCloudChargeRuleInput = Partial<CreateCloudChargeRuleInput>;

export type CloudChargeRuleFilters = {
  readonly tenantId?: string;
  readonly planCode?: string;
  readonly isActive?: boolean;
};

export type CreateCloudChargeCalculationRunInput = {
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly sourceAllocationRunId: string;
  readonly strategy?: CloudChargeCalculationStrategy;
  readonly createdBy?: string;
  readonly metadata?: CloudChargeMetadata;
};

export type UpdateCloudChargeCalculationRunInput = {
  readonly status: CloudChargeCalculationStatus;
  readonly totalAllocatedCost?: number;
  readonly totalChargeAmount?: number;
  readonly totalMarginAmount?: number;
  readonly totalDiscountAmount?: number;
  readonly currency?: string;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly errorMessage?: string;
  readonly metadata?: CloudChargeMetadata;
};

export type CloudChargeCalculationRunFilters = {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly status?: CloudChargeCalculationStatus;
  readonly sourceAllocationRunId?: string;
};

export type TenantCloudChargeFilters = {
  readonly tenantId?: string;
  readonly status?: TenantCloudChargeStatus;
};

export type CalculateTenantChargesInput = {
  readonly calculationRunId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly sourceAllocationRun: CloudCostAllocationRun;
  readonly allocations: readonly TenantCloudCostAllocation[];
  readonly rules: readonly CloudChargeRule[];
  readonly tenants: readonly CloudChargeTenant[];
};

export type CloudChargeEngineResult = {
  readonly charges: readonly Omit<TenantCloudCharge, "id" | "createdAt" | "updatedAt">[];
  readonly totalAllocatedCost: number;
  readonly totalChargeAmount: number;
  readonly totalMarginAmount: number;
  readonly totalDiscountAmount: number;
  readonly currency?: string;
};

export type CloudChargeSummary = {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly currency?: string;
  readonly totalAllocatedCost: number;
  readonly totalChargeAmount: number;
  readonly totalMarginAmount: number;
  readonly totalDiscountAmount: number;
  readonly totalMarginPercentage?: number;
  readonly tenants: readonly {
    readonly tenantId: string;
    readonly tenantName?: string;
    readonly allocatedCost: number;
    readonly finalChargeAmount: number;
    readonly marginAmount: number;
    readonly marginPercentage?: number;
    readonly status: TenantCloudChargeStatus;
  }[];
  readonly generatedAt: string;
};

export class CloudChargeError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CloudChargeError";
  }
}
