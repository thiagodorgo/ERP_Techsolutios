import type {
  CommissionBasisEvent,
  CommissionCalculation,
  CommissionPolicy,
  CommissionPolicyRule,
  CommissionStatement,
  CommissionSummaryResult,
  ListResult,
  SettleCalculationsResult,
} from "./commission.types.js";

export function toCommissionPolicyDto(policy: CommissionPolicy) {
  return {
    id: policy.id,
    name: policy.name,
    scope: policy.scope,
    vertical: policy.vertical,
    status: policy.status,
    effectiveFrom: policy.effectiveFrom.toISOString(),
    effectiveTo: policy.effectiveTo?.toISOString() ?? null,
    version: policy.version,
    createdBy: policy.createdBy ?? null,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
    rules: policy.rules.map(toCommissionPolicyRuleDto),
  };
}

export function toCommissionPolicyRuleDto(rule: CommissionPolicyRule) {
  return {
    id: rule.id,
    policyId: rule.policyId,
    ruleType: rule.ruleType,
    basisType: rule.basisType,
    rateType: rule.rateType,
    rateValue: rule.rateValue,
    conditions: rule.conditions,
    priority: rule.priority,
    active: rule.active,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export function toCommissionBasisEventDto(event: CommissionBasisEvent) {
  return {
    id: event.id,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    sourceEventName: event.sourceEventName,
    idempotencyKey: event.idempotencyKey,
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
    status: event.status,
    policyId: event.policyId ?? null,
    createdAt: event.createdAt.toISOString(),
  };
}

export function toCommissionCalculationDto(calculation: CommissionCalculation) {
  return {
    id: calculation.id,
    basisEventId: calculation.basisEventId,
    sourceType: calculation.sourceType ?? null,
    sourceId: calculation.sourceId ?? null,
    policyId: calculation.policyId,
    eligibleUserId: calculation.eligibleUserId ?? null,
    payeeId: calculation.payeeId ?? null,
    amount: calculation.amount,
    currency: calculation.currency,
    status: calculation.status,
    calculationSnapshot: calculation.calculationSnapshot,
    idempotencyKey: calculation.idempotencyKey,
    // Ω4C PR-10 (REM-01/REM-09) — a "bolinha" de liquidação + deep-link ao extrato. §2.8: nunca tenant_id/CNH.
    settledAt: calculation.settledAt ? calculation.settledAt.toISOString() : null,
    settlementRef: calculation.settlementRef ?? null,
    createdAt: calculation.createdAt.toISOString(),
    updatedAt: calculation.updatedAt.toISOString(),
  };
}

// Ω4C PR-10 — sumário da liquidação em lote (por linha + agregados). §2.8: só ids internos + agregado (sem
// tenant_id, sem payee cru, sem CNH).
export function toCommissionSettlementDto(result: SettleCalculationsResult) {
  return {
    settlementDate: dateOnly(result.settlementDate),
    settledCount: result.settledCount,
    settledTotal: result.settledTotal,
    lines: result.lines.map((line) => ({
      calculationId: line.calculationId,
      outcome: line.outcome,
      statementGroupId: line.statementGroupId ?? null,
      operatorProfileId: line.operatorProfileId ?? null,
    })),
  };
}

export function toCommissionStatementDto(statement: CommissionStatement) {
  return {
    id: statement.id,
    payeeId: statement.payeeId,
    periodStart: dateOnly(statement.periodStart),
    periodEnd: dateOnly(statement.periodEnd),
    status: statement.status,
    totalAmount: statement.totalAmount,
    currency: statement.currency,
    createdAt: statement.createdAt.toISOString(),
    updatedAt: statement.updatedAt.toISOString(),
  };
}

export function toCommissionSummaryDto(summary: CommissionSummaryResult) {
  return {
    items: summary.items.map((item) => ({
      payeeId: item.payeeId,
      total: item.total,
      count: item.count,
    })),
    total: summary.total,
    from: summary.from ? summary.from.toISOString() : null,
    to: summary.to ? summary.to.toISOString() : null,
  };
}

export function toListDto<T>(result: ListResult<T>, mapItem: (item: T) => unknown) {
  return {
    items: result.items.map(mapItem),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
