import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const EXPENSE_REPORT_STATUSES = [
  "draft",
  "sync_pending",
  "ready_to_submit",
  "submitted",
  "under_review",
  "returned",
  "approved_manager",
  "approved_finance",
  "rejected",
  "scheduled_for_payment",
  "paid",
  "cancelled",
] as const;

export const EXPENSE_POLICY_STATUSES = ["draft", "active", "paused", "archived"] as const;
export const EXPENSE_RECEIPT_UPLOAD_STATUSES = ["local", "pending_upload", "uploading", "uploaded", "failed"] as const;
export const MOBILE_ACTION_RECEIPT_STATUSES = ["processed", "failed", "conflict"] as const;

export type ExpenseReportStatus = (typeof EXPENSE_REPORT_STATUSES)[number];
export type ExpensePolicyStatus = (typeof EXPENSE_POLICY_STATUSES)[number];
export type ExpenseReceiptUploadStatus = (typeof EXPENSE_RECEIPT_UPLOAD_STATUSES)[number];
export type MobileActionReceiptStatus = (typeof MOBILE_ACTION_RECEIPT_STATUSES)[number];
export type ExpenseJsonRecord = Record<string, unknown>;

export type ExpenseActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type ExpensePolicy = {
  readonly id: string;
  readonly tenantId: string;
  readonly version: string;
  readonly name: string;
  readonly status: ExpensePolicyStatus;
  readonly categoryRules: ExpenseJsonRecord;
  readonly limits: ExpenseJsonRecord;
  readonly approvalRules: ExpenseJsonRecord;
  readonly receiptRules: ExpenseJsonRecord;
  readonly effectiveFrom: Date;
  readonly effectiveTo?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ExpenseCategory = {
  readonly key: string;
  readonly label: string;
  readonly receiptRequired: boolean;
  readonly defaultLimit?: number;
};

export type ExpenseReport = {
  readonly id: string;
  readonly tenantId: string;
  readonly employeeUserId: string;
  readonly status: ExpenseReportStatus;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly origin: string;
  readonly workOrderId?: string;
  readonly projectId?: string;
  readonly costCenter?: string;
  readonly city?: string;
  readonly advanceAmount: number;
  readonly totalAmount: number;
  readonly reimbursementAmount: number;
  readonly currency: string;
  readonly policyVersion?: string;
  readonly createdBy: string;
  readonly submittedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly items: readonly ExpenseItem[];
};

export type ExpenseItem = {
  readonly id: string;
  readonly tenantId: string;
  readonly reportId: string;
  readonly categoryKey: string;
  readonly spentAt: Date;
  readonly city?: string;
  readonly vendorName?: string;
  readonly amount: number;
  readonly currency: string;
  readonly km?: number;
  readonly notes?: string;
  readonly policyFlags?: ExpenseJsonRecord;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ExpenseEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payloadHash: string;
  readonly actorUserId?: string;
  readonly createdAt: Date;
};

export type MobileActionReceipt = {
  readonly tenantId: string;
  readonly clientActionId: string;
  readonly actorUserId: string;
  readonly actionType: string;
  readonly status: MobileActionReceiptStatus;
  readonly resultRef?: string;
  readonly processedAt?: Date;
  readonly createdAt: Date;
};

export type ListResult<T> = {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type ListExpenseReportsInput = {
  readonly tenantId: string;
  readonly employeeUserId?: string;
  readonly status?: ExpenseReportStatus;
  readonly limit: number;
  readonly offset: number;
};

export type CreateExpenseReportInput = {
  readonly tenantId: string;
  readonly employeeUserId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly origin: string;
  readonly workOrderId?: string;
  readonly projectId?: string;
  readonly costCenter?: string;
  readonly city?: string;
  readonly advanceAmount: number;
  readonly currency: string;
  readonly policyVersion?: string;
  readonly createdBy: string;
};

export type UpdateExpenseReportInput = {
  readonly tenantId: string;
  readonly reportId: string;
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly origin?: string;
  readonly workOrderId?: string;
  readonly projectId?: string;
  readonly costCenter?: string;
  readonly city?: string;
  readonly advanceAmount?: number;
  readonly policyVersion?: string;
};

export type CreateExpenseItemInput = {
  readonly tenantId: string;
  readonly reportId: string;
  readonly categoryKey: string;
  readonly spentAt: Date;
  readonly city?: string;
  readonly vendorName?: string;
  readonly amount: number;
  readonly currency: string;
  readonly km?: number;
  readonly notes?: string;
  readonly policyFlags?: ExpenseJsonRecord;
};

export type CreateExpenseEventInput = {
  readonly tenantId: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payloadHash: string;
  readonly actorUserId?: string;
};

export type CreateMobileActionReceiptInput = {
  readonly tenantId: string;
  readonly clientActionId: string;
  readonly actorUserId: string;
  readonly actionType: string;
  readonly status: MobileActionReceiptStatus;
  readonly resultRef?: string;
  readonly processedAt?: Date;
};

export type SyncExpenseActionResult = {
  readonly clientActionId: string;
  readonly type: string;
  readonly status: MobileActionReceiptStatus;
  readonly resultRef?: string;
  readonly replayed: boolean;
};

export type SyncExpenseActionsResult = {
  readonly results: readonly SyncExpenseActionResult[];
};

export class ExpenseManagementError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ExpenseManagementError";
  }
}
