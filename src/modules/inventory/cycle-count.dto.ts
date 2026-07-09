import type {
  CycleCount,
  CycleCountEntry,
  CycleCountVarianceReport,
  CycleCountWithEntries,
  ListCycleCountsResult,
} from "./cycle-count.types.js";

/** `tenant_id` is never exposed (allowlist §2.8). */
export function toCycleCountSummaryDto(session: CycleCount) {
  return {
    id: session.id,
    abcClass: session.abcClass ?? null,
    status: session.status,
    notes: session.notes ?? null,
    isActive: session.isActive,
    createdBy: session.createdBy ?? null,
    updatedBy: session.updatedBy ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function toCycleCountEntryDto(entry: CycleCountEntry) {
  return {
    id: entry.id,
    cycleCountId: entry.cycleCountId,
    itemId: entry.itemId,
    systemQuantity: entry.systemQuantity,
    countedQuantity: entry.countedQuantity ?? null,
    variance: entry.variance ?? null,
    adjustmentMovementId: entry.adjustmentMovementId ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function toCycleCountDto(session: CycleCountWithEntries) {
  return {
    ...toCycleCountSummaryDto(session),
    entries: session.entries.map(toCycleCountEntryDto),
  };
}

export function toCycleCountListDto(result: ListCycleCountsResult) {
  return {
    items: result.items.map(toCycleCountSummaryDto),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

/** R7.6 — the close response: the closed session with its entries + the variance total. */
export function toVarianceReportDto(report: CycleCountVarianceReport) {
  return {
    ...toCycleCountDto(report.cycleCount),
    totalVarianceValue: report.totalVarianceValue,
  };
}
