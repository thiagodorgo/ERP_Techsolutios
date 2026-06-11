import type {
  ExpenseCategory,
  ExpenseItem,
  ExpensePolicy,
  ExpenseReport,
  ListResult,
  SyncExpenseActionsResult,
} from "./expense-management.types.js";

export function toExpensePolicyDto(policy: ExpensePolicy) {
  return {
    id: policy.id,
    version: policy.version,
    name: policy.name,
    status: policy.status,
    categoryRules: policy.categoryRules,
    limits: policy.limits,
    approvalRules: policy.approvalRules,
    receiptRules: policy.receiptRules,
    effectiveFrom: policy.effectiveFrom.toISOString(),
    effectiveTo: policy.effectiveTo?.toISOString() ?? null,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

export function toExpenseCategoryDto(category: ExpenseCategory) {
  return {
    key: category.key,
    label: category.label,
    receiptRequired: category.receiptRequired,
    defaultLimit: category.defaultLimit ?? null,
  };
}

export function toExpenseReportDto(report: ExpenseReport) {
  return {
    id: report.id,
    employeeUserId: report.employeeUserId,
    status: report.status,
    periodStart: dateOnly(report.periodStart),
    periodEnd: dateOnly(report.periodEnd),
    origin: report.origin,
    workOrderId: report.workOrderId ?? null,
    projectId: report.projectId ?? null,
    costCenter: report.costCenter ?? null,
    city: report.city ?? null,
    advanceAmount: report.advanceAmount,
    totalAmount: report.totalAmount,
    reimbursementAmount: report.reimbursementAmount,
    currency: report.currency,
    policyVersion: report.policyVersion ?? null,
    createdBy: report.createdBy,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    items: report.items.map(toExpenseItemDto),
  };
}

export function toExpenseItemDto(item: ExpenseItem) {
  return {
    id: item.id,
    reportId: item.reportId,
    categoryKey: item.categoryKey,
    spentAt: item.spentAt.toISOString(),
    city: item.city ?? null,
    vendorName: item.vendorName ?? null,
    amount: item.amount,
    currency: item.currency,
    km: item.km ?? null,
    notes: item.notes ?? null,
    policyFlags: item.policyFlags ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toSyncExpenseActionsDto(result: SyncExpenseActionsResult) {
  return {
    results: result.results.map((item) => ({
      clientActionId: item.clientActionId,
      type: item.type,
      status: item.status,
      resultRef: item.resultRef ?? null,
      replayed: item.replayed,
    })),
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
