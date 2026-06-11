import { createHash, randomUUID } from "node:crypto";

import type {
  CreateExpenseEventInput,
  CreateExpenseItemInput,
  CreateExpenseReportInput,
  CreateMobileActionReceiptInput,
  ExpenseEvent,
  ExpenseItem,
  ExpensePolicy,
  ExpenseReport,
  ListExpenseReportsInput,
  ListResult,
  MobileActionReceipt,
  UpdateExpenseReportInput,
} from "./expense-management.types.js";

export interface ExpenseManagementRepository {
  listPolicies(input: { readonly tenantId: string; readonly limit: number; readonly offset: number }): Promise<ListResult<ExpensePolicy>>;
  listReports(input: ListExpenseReportsInput): Promise<ListResult<ExpenseReport>>;
  getReport(input: { readonly tenantId: string; readonly reportId: string }): Promise<ExpenseReport | undefined>;
  createReport(input: CreateExpenseReportInput): Promise<ExpenseReport>;
  updateReport(input: UpdateExpenseReportInput): Promise<ExpenseReport>;
  addItem(input: CreateExpenseItemInput): Promise<ExpenseItem>;
  submitReport(input: { readonly tenantId: string; readonly reportId: string; readonly submittedAt: Date }): Promise<ExpenseReport>;
  findMobileActionReceipt(input: { readonly tenantId: string; readonly clientActionId: string }): Promise<MobileActionReceipt | undefined>;
  createMobileActionReceipt(input: CreateMobileActionReceiptInput): Promise<MobileActionReceipt>;
  createEvent(input: CreateExpenseEventInput): Promise<ExpenseEvent>;
  reset?(): void;
}

export class InMemoryExpenseManagementRepository implements ExpenseManagementRepository {
  private readonly policies = new Map<string, ExpensePolicy>();
  private readonly reports = new Map<string, ExpenseReport>();
  private readonly items = new Map<string, ExpenseItem>();
  private readonly receipts = new Map<string, MobileActionReceipt>();
  private readonly events = new Map<string, ExpenseEvent>();

  async listPolicies(input: { readonly tenantId: string; readonly limit: number; readonly offset: number }): Promise<ListResult<ExpensePolicy>> {
    this.ensureDefaultPolicy(input.tenantId);
    const items = [...this.policies.values()]
      .filter((policy) => policy.tenantId === input.tenantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return paginate(items, input.limit, input.offset);
  }

  async listReports(input: ListExpenseReportsInput): Promise<ListResult<ExpenseReport>> {
    const items = this.sortedReports()
      .filter((report) => report.tenantId === input.tenantId)
      .filter((report) => !input.employeeUserId || report.employeeUserId === input.employeeUserId)
      .filter((report) => !input.status || report.status === input.status);

    return paginate(items, input.limit, input.offset);
  }

  async getReport(input: { readonly tenantId: string; readonly reportId: string }): Promise<ExpenseReport | undefined> {
    const report = this.reports.get(input.reportId);
    if (!report || report.tenantId !== input.tenantId) return undefined;

    return this.attachItems(report);
  }

  async createReport(input: CreateExpenseReportInput): Promise<ExpenseReport> {
    const now = new Date();
    const report: ExpenseReport = {
      id: randomUUID(),
      tenantId: input.tenantId,
      employeeUserId: input.employeeUserId,
      status: "draft",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      origin: input.origin,
      workOrderId: input.workOrderId,
      projectId: input.projectId,
      costCenter: input.costCenter,
      city: input.city,
      advanceAmount: input.advanceAmount,
      totalAmount: 0,
      reimbursementAmount: 0,
      currency: input.currency,
      policyVersion: input.policyVersion,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      items: [],
    };

    this.reports.set(report.id, report);

    return report;
  }

  async updateReport(input: UpdateExpenseReportInput): Promise<ExpenseReport> {
    const current = await this.getReport({ tenantId: input.tenantId, reportId: input.reportId });
    if (!current) throw new Error("Report not found.");

    const updated = this.recalculate({
      ...current,
      periodStart: input.periodStart ?? current.periodStart,
      periodEnd: input.periodEnd ?? current.periodEnd,
      origin: input.origin ?? current.origin,
      workOrderId: input.workOrderId ?? current.workOrderId,
      projectId: input.projectId ?? current.projectId,
      costCenter: input.costCenter ?? current.costCenter,
      city: input.city ?? current.city,
      advanceAmount: input.advanceAmount ?? current.advanceAmount,
      policyVersion: input.policyVersion ?? current.policyVersion,
      updatedAt: new Date(),
    });

    this.reports.set(updated.id, { ...updated, items: [] });

    return updated;
  }

  async addItem(input: CreateExpenseItemInput): Promise<ExpenseItem> {
    const report = await this.getReport({ tenantId: input.tenantId, reportId: input.reportId });
    if (!report) throw new Error("Report not found.");

    const now = new Date();
    const item: ExpenseItem = {
      id: randomUUID(),
      tenantId: input.tenantId,
      reportId: input.reportId,
      categoryKey: input.categoryKey,
      spentAt: input.spentAt,
      city: input.city,
      vendorName: input.vendorName,
      amount: input.amount,
      currency: input.currency,
      km: input.km,
      notes: input.notes,
      policyFlags: input.policyFlags,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(item.id, item);
    const updated = this.recalculate({ ...report, items: [...report.items, item], updatedAt: now });
    this.reports.set(updated.id, { ...updated, items: [] });

    return item;
  }

  async submitReport(input: { readonly tenantId: string; readonly reportId: string; readonly submittedAt: Date }): Promise<ExpenseReport> {
    const report = await this.getReport({ tenantId: input.tenantId, reportId: input.reportId });
    if (!report) throw new Error("Report not found.");
    const updated = {
      ...report,
      status: "submitted" as const,
      submittedAt: input.submittedAt,
      updatedAt: input.submittedAt,
    };
    this.reports.set(updated.id, { ...updated, items: [] });

    return updated;
  }

  async findMobileActionReceipt(input: { readonly tenantId: string; readonly clientActionId: string }): Promise<MobileActionReceipt | undefined> {
    const receipt = this.receipts.get(receiptKey(input.tenantId, input.clientActionId));
    return receipt?.tenantId === input.tenantId ? receipt : undefined;
  }

  async createMobileActionReceipt(input: CreateMobileActionReceiptInput): Promise<MobileActionReceipt> {
    const existing = await this.findMobileActionReceipt(input);
    if (existing) return existing;

    const receipt: MobileActionReceipt = {
      tenantId: input.tenantId,
      clientActionId: input.clientActionId,
      actorUserId: input.actorUserId,
      actionType: input.actionType,
      status: input.status,
      resultRef: input.resultRef,
      processedAt: input.processedAt,
      createdAt: new Date(),
    };
    this.receipts.set(receiptKey(input.tenantId, input.clientActionId), receipt);

    return receipt;
  }

  async createEvent(input: CreateExpenseEventInput): Promise<ExpenseEvent> {
    const event: ExpenseEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payloadHash: input.payloadHash,
      actorUserId: input.actorUserId,
      createdAt: new Date(),
    };
    this.events.set(event.id, event);

    return event;
  }

  reset(): void {
    this.policies.clear();
    this.reports.clear();
    this.items.clear();
    this.receipts.clear();
    this.events.clear();
  }

  private sortedReports(): ExpenseReport[] {
    return [...this.reports.values()].map((report) => this.attachItems(report)).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  private attachItems(report: ExpenseReport): ExpenseReport {
    const items = [...this.items.values()].filter((item) => item.tenantId === report.tenantId && item.reportId === report.id);
    return this.recalculate({ ...report, items });
  }

  private recalculate(report: ExpenseReport): ExpenseReport {
    const totalAmount = report.items.reduce((sum, item) => sum + item.amount, 0);
    return {
      ...report,
      totalAmount,
      reimbursementAmount: Math.abs(totalAmount - report.advanceAmount),
    };
  }

  private ensureDefaultPolicy(tenantId: string): void {
    const key = `${tenantId}:default`;
    if (this.policies.has(key)) return;

    const now = new Date();
    this.policies.set(key, {
      id: randomUUID(),
      tenantId,
      version: "default",
      name: "Politica padrao de despesas",
      status: "active",
      categoryRules: {},
      limits: {},
      approvalRules: {},
      receiptRules: {},
      effectiveFrom: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export function hashExpensePayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function receiptKey(tenantId: string, clientActionId: string): string {
  return `${tenantId}:${clientActionId}`;
}

function paginate<T>(items: readonly T[], limit: number, offset: number): ListResult<T> {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
  };
}
