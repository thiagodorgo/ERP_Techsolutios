import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
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
import type { ExpenseManagementRepository } from "./expense-management.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaExpenseManagementRepository implements ExpenseManagementRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async listPolicies(input: { readonly tenantId: string; readonly limit: number; readonly offset: number }): Promise<ListResult<ExpensePolicy>> {
    await this.ensureDefaultPolicy(input.tenantId);
    const where = { tenant_id: input.tenantId };
    const [items, total] = await Promise.all([
      this.client.expensePolicy.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.expensePolicy.count({ where }),
    ]);

    return { items: items.map(mapPolicyRecord), total, limit: input.limit, offset: input.offset };
  }

  async listReports(input: ListExpenseReportsInput): Promise<ListResult<ExpenseReport>> {
    const where: Prisma.ExpenseReportWhereInput = {
      tenant_id: input.tenantId,
      ...(input.employeeUserId ? { employee_user_id: input.employeeUserId } : {}),
      ...(input.status ? { status: input.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.client.expenseReport.findMany({
        where,
        include: reportInclude,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.expenseReport.count({ where }),
    ]);

    return { items: items.map(mapReportRecord), total, limit: input.limit, offset: input.offset };
  }

  async getReport(input: { readonly tenantId: string; readonly reportId: string }): Promise<ExpenseReport | undefined> {
    const report = await this.client.expenseReport.findFirst({
      where: { tenant_id: input.tenantId, id: input.reportId },
      include: reportInclude,
    });

    return report ? mapReportRecord(report) : undefined;
  }

  async createReport(input: CreateExpenseReportInput): Promise<ExpenseReport> {
    const report = await this.client.expenseReport.create({
      data: {
        tenant_id: input.tenantId,
        employee_user_id: input.employeeUserId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        origin: input.origin,
        work_order_id: input.workOrderId ?? null,
        project_id: input.projectId ?? null,
        cost_center: input.costCenter ?? null,
        city: input.city ?? null,
        advance_amount: input.advanceAmount,
        total_amount: 0,
        reimbursement_amount: input.advanceAmount,
        currency: input.currency,
        policy_version: input.policyVersion ?? null,
        created_by: input.createdBy,
      },
      include: reportInclude,
    });

    return mapReportRecord(report);
  }

  async updateReport(input: UpdateExpenseReportInput): Promise<ExpenseReport> {
    const current = await this.getReport({ tenantId: input.tenantId, reportId: input.reportId });
    if (!current) throw new Error("Report not found.");

    const report = await this.client.expenseReport.update({
      where: { tenant_id_id: { tenant_id: input.tenantId, id: input.reportId } },
      data: {
        ...(input.periodStart ? { period_start: input.periodStart } : {}),
        ...(input.periodEnd ? { period_end: input.periodEnd } : {}),
        ...(input.origin ? { origin: input.origin } : {}),
        ...(input.workOrderId !== undefined ? { work_order_id: input.workOrderId } : {}),
        ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
        ...(input.costCenter !== undefined ? { cost_center: input.costCenter } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.advanceAmount !== undefined ? { advance_amount: input.advanceAmount } : {}),
        ...(input.policyVersion !== undefined ? { policy_version: input.policyVersion } : {}),
      },
      include: reportInclude,
    });

    return this.recalculateReport(mapReportRecord(report));
  }

  async addItem(input: CreateExpenseItemInput): Promise<ExpenseItem> {
    const item = await this.client.expenseItem.create({
      data: {
        tenant_id: input.tenantId,
        report_id: input.reportId,
        category_key: input.categoryKey,
        spent_at: input.spentAt,
        city: input.city ?? null,
        vendor_name: input.vendorName ?? null,
        amount: input.amount,
        currency: input.currency,
        km: input.km ?? null,
        notes: input.notes ?? null,
        policy_flags: input.policyFlags ? toJsonObject(input.policyFlags) : undefined,
      },
    });

    await this.recalculatePersistedReport(input.tenantId, input.reportId);

    return mapItemRecord(item);
  }

  async submitReport(input: { readonly tenantId: string; readonly reportId: string; readonly submittedAt: Date }): Promise<ExpenseReport> {
    const report = await this.client.expenseReport.update({
      where: { tenant_id_id: { tenant_id: input.tenantId, id: input.reportId } },
      data: { status: "submitted", submitted_at: input.submittedAt },
      include: reportInclude,
    });

    return mapReportRecord(report);
  }

  async findMobileActionReceipt(input: { readonly tenantId: string; readonly clientActionId: string }): Promise<MobileActionReceipt | undefined> {
    const receipt = await this.client.mobileActionReceipt.findUnique({
      where: {
        tenant_id_client_action_id: {
          tenant_id: input.tenantId,
          client_action_id: input.clientActionId,
        },
      },
    });

    return receipt ? mapMobileActionReceiptRecord(receipt) : undefined;
  }

  async createMobileActionReceipt(input: CreateMobileActionReceiptInput): Promise<MobileActionReceipt> {
    const existing = await this.findMobileActionReceipt(input);
    if (existing) return existing;

    const receipt = await this.client.mobileActionReceipt.create({
      data: {
        tenant_id: input.tenantId,
        client_action_id: input.clientActionId,
        actor_user_id: input.actorUserId,
        action_type: input.actionType,
        status: input.status,
        result_ref: input.resultRef ?? null,
        processed_at: input.processedAt ?? null,
      },
    });

    return mapMobileActionReceiptRecord(receipt);
  }

  async createEvent(input: CreateExpenseEventInput): Promise<ExpenseEvent> {
    const event = await this.client.expenseEvent.create({
      data: {
        tenant_id: input.tenantId,
        aggregate_id: input.aggregateId,
        event_type: input.eventType,
        payload_hash: input.payloadHash,
        actor_user_id: input.actorUserId ?? null,
      },
    });

    return mapEventRecord(event);
  }

  private async recalculatePersistedReport(tenantId: string, reportId: string): Promise<void> {
    const report = await this.getReport({ tenantId, reportId });
    if (!report) return;
    await this.recalculateReport(report);
  }

  private async recalculateReport(report: ExpenseReport): Promise<ExpenseReport> {
    const totalAmount = report.items.reduce((sum, item) => sum + item.amount, 0);
    const reimbursementAmount = Math.abs(totalAmount - report.advanceAmount);
    const updated = await this.client.expenseReport.update({
      where: { tenant_id_id: { tenant_id: report.tenantId, id: report.id } },
      data: { total_amount: totalAmount, reimbursement_amount: reimbursementAmount },
      include: reportInclude,
    });

    return mapReportRecord(updated);
  }

  private async ensureDefaultPolicy(tenantId: string): Promise<void> {
    await this.client.expensePolicy.upsert({
      where: {
        tenant_id_version: {
          tenant_id: tenantId,
          version: "default",
        },
      },
      update: {},
      create: {
        tenant_id: tenantId,
        version: "default",
        name: "Politica padrao de despesas",
        status: "active",
        category_rules: {},
        limits: {},
        approval_rules: {},
        receipt_rules: {},
        effective_from: new Date(),
      },
    });
  }
}

export class RlsPrismaExpenseManagementRepository implements ExpenseManagementRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  listPolicies(input: { readonly tenantId: string; readonly limit: number; readonly offset: number }) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).listPolicies(input));
  }

  listReports(input: ListExpenseReportsInput) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).listReports(input));
  }

  getReport(input: { readonly tenantId: string; readonly reportId: string }) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).getReport(input));
  }

  createReport(input: CreateExpenseReportInput) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).createReport(input));
  }

  updateReport(input: UpdateExpenseReportInput) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).updateReport(input));
  }

  addItem(input: CreateExpenseItemInput) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).addItem(input));
  }

  submitReport(input: { readonly tenantId: string; readonly reportId: string; readonly submittedAt: Date }) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).submitReport(input));
  }

  findMobileActionReceipt(input: { readonly tenantId: string; readonly clientActionId: string }) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).findMobileActionReceipt(input));
  }

  createMobileActionReceipt(input: CreateMobileActionReceiptInput) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).createMobileActionReceipt(input));
  }

  createEvent(input: CreateExpenseEventInput) {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaExpenseManagementRepository(tx).createEvent(input));
  }
}

export async function createPrismaExpenseManagementRepository(): Promise<RlsPrismaExpenseManagementRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaExpenseManagementRepository(prisma);
}

const reportInclude = {
  items: {
    orderBy: [{ spent_at: "asc" }, { created_at: "asc" }],
  },
} satisfies Prisma.ExpenseReportInclude;

function mapPolicyRecord(record: Prisma.ExpensePolicyGetPayload<Record<string, never>>): ExpensePolicy {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    version: record.version,
    name: record.name,
    status: record.status as ExpensePolicy["status"],
    categoryRules: toRecord(record.category_rules),
    limits: toRecord(record.limits),
    approvalRules: toRecord(record.approval_rules),
    receiptRules: toRecord(record.receipt_rules),
    effectiveFrom: record.effective_from,
    effectiveTo: record.effective_to ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapReportRecord(record: Prisma.ExpenseReportGetPayload<{ include: typeof reportInclude }>): ExpenseReport {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    employeeUserId: record.employee_user_id,
    status: record.status as ExpenseReport["status"],
    periodStart: record.period_start,
    periodEnd: record.period_end,
    origin: record.origin,
    workOrderId: record.work_order_id ?? undefined,
    projectId: record.project_id ?? undefined,
    costCenter: record.cost_center ?? undefined,
    city: record.city ?? undefined,
    advanceAmount: Number(record.advance_amount),
    totalAmount: Number(record.total_amount),
    reimbursementAmount: Number(record.reimbursement_amount),
    currency: record.currency,
    policyVersion: record.policy_version ?? undefined,
    createdBy: record.created_by,
    submittedAt: record.submitted_at ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    items: record.items.map(mapItemRecord),
  };
}

function mapItemRecord(record: Prisma.ExpenseItemGetPayload<Record<string, never>>): ExpenseItem {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    reportId: record.report_id,
    categoryKey: record.category_key,
    spentAt: record.spent_at,
    city: record.city ?? undefined,
    vendorName: record.vendor_name ?? undefined,
    amount: Number(record.amount),
    currency: record.currency,
    km: record.km === null ? undefined : Number(record.km),
    notes: record.notes ?? undefined,
    policyFlags: record.policy_flags ? toRecord(record.policy_flags) : undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapMobileActionReceiptRecord(record: Prisma.MobileActionReceiptGetPayload<Record<string, never>>): MobileActionReceipt {
  return {
    tenantId: record.tenant_id,
    clientActionId: record.client_action_id,
    actorUserId: record.actor_user_id,
    actionType: record.action_type,
    status: record.status as MobileActionReceipt["status"],
    resultRef: record.result_ref ?? undefined,
    processedAt: record.processed_at ?? undefined,
    createdAt: record.created_at,
  };
}

function mapEventRecord(record: Prisma.ExpenseEventGetPayload<Record<string, never>>): ExpenseEvent {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    aggregateId: record.aggregate_id,
    eventType: record.event_type,
    payloadHash: record.payload_hash,
    actorUserId: record.actor_user_id ?? undefined,
    createdAt: record.created_at,
  };
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

function toRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
