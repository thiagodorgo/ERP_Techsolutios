import { selectCloudChargeRule } from "./cloud-charge.rules.js";
import {
  CloudChargeError,
  type CalculateTenantChargesInput,
  type CloudChargeEngineResult,
  type CloudChargeMarkupType,
  type CloudChargeRoundingMode,
  type TenantCloudCharge,
} from "./cloud-charge.types.js";

export function calculateTenantCloudCharges(input: CalculateTenantChargesInput): CloudChargeEngineResult {
  const tenantNames = new Map(input.tenants.map((tenant) => [tenant.id, tenant.name]));
  const allocationGroups = groupAllocatedCostByTenant(input.allocations);
  const charges: Omit<TenantCloudCharge, "id" | "createdAt" | "updatedAt">[] = [];

  for (const [tenantId, allocatedCost] of allocationGroups.entries()) {
    const tenant = input.tenants.find((item) => item.id === tenantId) ?? { id: tenantId, name: tenantNames.get(tenantId) ?? tenantId };
    const rule = selectCloudChargeRule({
      tenant,
      rules: input.rules,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });

    if (!rule) {
      throw new CloudChargeError(422, "CLOUD_CHARGE_RULE_NOT_FOUND", "rule_not_found", `No active cloud charge rule applies to tenant ${tenantId}.`);
    }

    const includedCloudCost = Math.min(allocatedCost, rule.includedCloudCost);
    const billableCost = Math.max(0, allocatedCost - includedCloudCost);
    const grossChargeAmount = calculateGrossCharge(billableCost, rule.markupType, rule.markupValue);
    const chargeBeforeRounding = Math.max(grossChargeAmount, rule.minimumMonthlyCharge);
    const finalChargeAmount = applyRounding(chargeBeforeRounding, rule.roundingMode);
    if (finalChargeAmount < 0) {
      throw new CloudChargeError(422, "CLOUD_CHARGE_INVALID", "negative_charge", "Cloud charge calculation produced a negative final amount.");
    }
    const marginAmount = finalChargeAmount - allocatedCost;
    const marginPercentage = allocatedCost > 0 ? (marginAmount / allocatedCost) * 100 : undefined;

    charges.push({
      calculationRunId: input.calculationRunId,
      tenantId,
      sourceAllocationRunId: input.sourceAllocationRun.id,
      cloudChargeRuleId: rule.id,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      allocatedCost: roundMoney(allocatedCost),
      includedCloudCost: roundMoney(includedCloudCost),
      billableCost: roundMoney(billableCost),
      markupType: rule.markupType,
      markupValue: rule.markupValue,
      minimumMonthlyCharge: rule.minimumMonthlyCharge,
      grossChargeAmount: roundMoney(grossChargeAmount),
      discountAmount: roundMoney(includedCloudCost),
      finalChargeAmount: roundMoney(finalChargeAmount),
      marginAmount: roundMoney(marginAmount),
      marginPercentage: marginPercentage === undefined ? undefined : roundRatio(marginPercentage),
      currency: rule.currency,
      status: "draft",
      metadata: {
        ruleName: rule.name,
        tenantName: tenant.name,
        allocationCount: input.allocations.filter((allocation) => allocation.tenantId === tenantId).length,
        sourceAllocationRunStatus: input.sourceAllocationRun.status,
        roundingMode: rule.roundingMode,
      },
    });
  }

  return {
    charges,
    totalAllocatedCost: roundMoney(charges.reduce((total, charge) => total + charge.allocatedCost, 0)),
    totalChargeAmount: roundMoney(charges.reduce((total, charge) => total + charge.finalChargeAmount, 0)),
    totalMarginAmount: roundMoney(charges.reduce((total, charge) => total + charge.marginAmount, 0)),
    totalDiscountAmount: roundMoney(charges.reduce((total, charge) => total + charge.discountAmount, 0)),
    currency: uniqueCurrency(charges),
  };
}

export function calculateGrossCharge(
  billableCost: number,
  markupType: CloudChargeMarkupType,
  markupValue: number,
): number {
  if (billableCost < 0 || markupValue < 0) {
    throw new CloudChargeError(422, "CLOUD_CHARGE_INVALID", "negative_input", "Cloud charge inputs cannot be negative.");
  }

  switch (markupType) {
    case "percentage":
      return billableCost * (1 + markupValue / 100);
    case "fixed_multiplier":
      return billableCost * markupValue;
    case "fixed_amount":
      return billableCost + markupValue;
  }
}

export function applyRounding(value: number, mode: CloudChargeRoundingMode): number {
  switch (mode) {
    case "none":
      return value;
    case "nearest_cent":
      return Math.round(value * 100) / 100;
    case "nearest_10_cents":
      return Math.round(value * 10) / 10;
    case "nearest_real":
      return Math.round(value);
    case "ceil_real":
      return Math.ceil(value);
  }
}

function groupAllocatedCostByTenant(allocations: readonly { readonly tenantId: string; readonly allocatedCost: number }[]): Map<string, number> {
  const groups = new Map<string, number>();
  for (const allocation of allocations) {
    groups.set(allocation.tenantId, (groups.get(allocation.tenantId) ?? 0) + allocation.allocatedCost);
  }
  return groups;
}

function uniqueCurrency(charges: readonly { readonly currency: string }[]): string | undefined {
  const currencies = new Set(charges.map((charge) => charge.currency));
  return currencies.size === 1 ? [...currencies][0] : undefined;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(6));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(6));
}
