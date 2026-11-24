import { decimalTextToCents } from "./commission-engine.js";
import type {
  CommissionBasisEvent,
  CommissionCalculation,
  CommissionOverviewResult,
  CommissionPayeeOverviewResult,
  CommissionPayeeRateRecord,
  CommissionPayeeRow,
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
  const snap = calculation.calculationSnapshot ?? {};
  const workOrderCode = typeof snap.workOrderCode === "string" ? snap.workOrderCode : null;
  const serviceCatalogId = typeof snap.serviceCatalogId === "string" ? snap.serviceCatalogId : null;
  const baseCents =
    typeof snap.baseCents === "number" && Number.isFinite(snap.baseCents)
      ? BigInt(Math.max(0, Math.round(snap.baseCents))).toString()
      : typeof snap.baseCents === "string" && /^\d+$/.test(snap.baseCents)
        ? snap.baseCents
        : null;
  const rateType = snap.rateType === "percent" || snap.rateType === "fixed" ? snap.rateType : null;
  const rateValue = typeof snap.rateValue === "string" ? snap.rateValue : null;
  const rateValueCents =
    rateType === "fixed" && rateValue !== null ? decimalTextToCents(rateValue).toString() : undefined;
  const outcome = typeof snap.outcome === "string" ? snap.outcome : null;
  const statusLabelKey = deriveCalculationStatusLabelKey(calculation);

  return {
    id: calculation.id,
    basisEventId: calculation.basisEventId,
    sourceType: calculation.sourceType ?? null,
    sourceId: calculation.sourceId ?? null,
    policyId: calculation.policyId,
    eligibleUserId: calculation.eligibleUserId ?? null,
    payeeId: calculation.payeeId ?? null,
    amount: calculation.amount,
    // B-APP-ORG-2S (S2e) — centavos exatos em texto; o app lê só este campo. `amount` (número) fica para a web.
    amountCents: calculation.amountCents,
    workOrderCode,
    serviceCatalogId,
    baseCents,
    rateType,
    rateValue,
    ...(rateValueCents !== undefined ? { rateValueCents } : {}),
    outcome,
    statusLabelKey,
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

function deriveCalculationStatusLabelKey(calculation: CommissionCalculation): string {
  if (calculation.status === "approved" && calculation.settledAt) {
    return "paid";
  }
  if (calculation.status === "approved") {
    return "to_receive";
  }
  if (calculation.status === "calculated") {
    return "forecast";
  }
  if (calculation.status === "disputed") {
    return "review";
  }
  if (calculation.status === "rejected") {
    return "rejected";
  }
  if (calculation.status === "reversed") {
    return "reversed";
  }
  return "pending";
}

// Ω4C PR-10 — sumário da liquidação em lote (por linha + agregados). §2.8: só ids internos + agregado (sem
// tenant_id, sem payee cru, sem CNH).
export function toCommissionSettlementDto(result: SettleCalculationsResult) {
  return {
    settlementDate: dateOnly(result.settlementDate),
    settledCount: result.settledCount,
    settledTotal: result.settledTotal,
    settledTotalCents: result.settledTotalCents ?? "0",
    ...(result.payees
      ? {
          payees: result.payees.map((p) => ({
            payeeId: p.payeeId,
            netCents: p.netCents,
            lines: p.lines.map((line) => ({
              calculationId: line.calculationId,
              outcome: line.outcome,
              statementGroupId: line.statementGroupId ?? null,
              operatorProfileId: line.operatorProfileId ?? null,
            })),
          })),
        }
      : {}),
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
      totalCents: item.totalCents,
      count: item.count,
    })),
    total: summary.total,
    totalCents: summary.totalCents,
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

export function toCommissionPayeeRateDto(rate: CommissionPayeeRateRecord) {
  return {
    ruleId: rate.ruleId,
    policyId: rate.policyId,
    payeeUserId: rate.payeeUserId,
    rateType: rate.rateType,
    rateValue: rate.rateValue,
    ...(rate.rateType === "fixed" && rate.rateValueCents !== undefined ? { rateValueCents: rate.rateValueCents } : {}),
    effectiveFrom: rate.effectiveFrom.toISOString(),
    effectiveTo: rate.effectiveTo ? rate.effectiveTo.toISOString() : null,
    active: rate.active,
    reason: rate.reason ?? null,
    changedBy: rate.changedBy ?? null,
    selfChange: rate.selfChange,
    createdAt: rate.createdAt.toISOString(),
  };
}

export function toCommissionMyRateDto(rate: CommissionPayeeRateRecord | null) {
  if (!rate) return null;
  return {
    ruleId: rate.ruleId,
    policyId: rate.policyId,
    payeeUserId: rate.payeeUserId,
    rateType: rate.rateType,
    rateValue: rate.rateValue,
    ...(rate.rateType === "fixed" && rate.rateValueCents !== undefined ? { rateValueCents: rate.rateValueCents } : {}),
    effectiveFrom: rate.effectiveFrom.toISOString(),
    effectiveTo: rate.effectiveTo ? rate.effectiveTo.toISOString() : null,
    active: rate.active,
  };
}

export function toCommissionOverviewDto(result: CommissionOverviewResult) {
  // B-COMISSAO:centavos-texto — M20: todo campo …Cents sai como texto de dígitos sem sinal (^[0-9]+$).
  return {
    toReceiveCents: result.toReceiveCents,
    forecastCents: result.forecastCents,
    paidInPeriodCents: result.paidInPeriodCents,
    paidThisMonthCents: result.paidThisMonthCents,
    noRuleCount: result.noRuleCount,
    reviewCount: result.reviewCount,
    rejectedCount: result.rejectedCount,
    counts: {
      noRule: result.noRuleCount,
      review: result.reviewCount,
      rejected: result.rejectedCount,
    },
    byMonth: result.byMonth.map((m) => ({
      month: m.month,
      calculatedCents: m.calculatedCents,
      paidCents: m.paidCents,
    })),
    byServiceType: result.byServiceType.map((s) => ({
      serviceCatalogId: s.serviceCatalogId,
      totalCents: s.totalCents,
      count: s.count,
    })),
    topPayees: result.topPayees.map((p) => ({
      payeeId: p.payeeId,
      totalCents: p.totalCents,
      toReceiveCents: p.toReceiveCents,
      paidCents: p.paidCents,
      count: p.count,
    })),
    changeCents: result.changeCents,
    changeDirection: result.changeDirection,
    from: result.from ? result.from.toISOString() : null,
    to: result.to ? result.to.toISOString() : null,
  };
}

export function toCommissionPayeeRowDto(row: CommissionPayeeRow) {
  return {
    payeeId: row.payeeId,
    toReceiveCents: row.toReceiveCents,
    paidThisMonthCents: row.paidThisMonthCents,
    paidInPeriodCents: row.paidInPeriodCents,
    forecastCents: row.forecastCents,
    count: row.count,
    currentRate: row.currentRate ? toCommissionPayeeRateDto(row.currentRate) : null,
  };
}

export function toCommissionPayeeOverviewDto(result: CommissionPayeeOverviewResult) {
  return {
    payeeId: result.payeeId,
    toReceiveCents: result.toReceiveCents,
    paidThisMonthCents: result.paidThisMonthCents,
    forecastCents: result.forecastCents,
    count: result.count,
    currentRate: result.currentRate
      ? result.isMine
        ? toCommissionMyRateDto(result.currentRate)
        : toCommissionPayeeRateDto(result.currentRate)
      : null,
    byMonth: result.byMonth.map((m) => ({
      month: m.month,
      calculatedCents: m.calculatedCents,
      paidCents: m.paidCents,
    })),
    byServiceType: result.byServiceType.map((s) => ({
      serviceCatalogId: s.serviceCatalogId,
      totalCents: s.totalCents,
      count: s.count,
    })),
    recentCalculations: result.recentCalculations.map(toCommissionCalculationDto),
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
