import type {
  CloudChargeRule,
  CloudChargeTenant,
} from "./cloud-charge.types.js";

export function selectCloudChargeRule(input: {
  readonly tenant: CloudChargeTenant;
  readonly rules: readonly CloudChargeRule[];
  readonly periodStart: Date;
  readonly periodEnd: Date;
}): CloudChargeRule | undefined {
  const activeRules = input.rules
    .filter((rule) => rule.isActive)
    .filter((rule) => rule.effectiveFrom <= input.periodEnd)
    .filter((rule) => !rule.effectiveUntil || rule.effectiveUntil >= input.periodStart);

  const tenantRules = activeRules.filter((rule) => rule.tenantId === input.tenant.id);
  const planRules = input.tenant.planCode
    ? activeRules.filter((rule) => !rule.tenantId && rule.planCode === input.tenant.planCode)
    : [];
  const defaultRules = activeRules.filter((rule) => !rule.tenantId && (!rule.planCode || rule.planCode === "default"));

  return pickHighestPriority(tenantRules) ?? pickHighestPriority(planRules) ?? pickHighestPriority(defaultRules);
}

function pickHighestPriority(rules: readonly CloudChargeRule[]): CloudChargeRule | undefined {
  return [...rules].sort((a, b) => b.priority - a.priority || b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
}
