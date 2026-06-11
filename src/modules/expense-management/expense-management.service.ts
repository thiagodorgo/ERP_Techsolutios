import { env } from "../../config/env.js";
import type { Permission } from "../core-saas/permissions/catalog.js";
import {
  InMemoryExpenseManagementRepository,
  hashExpensePayload,
  type ExpenseManagementRepository,
} from "./expense-management.repository.js";
import {
  ExpenseManagementError,
  type CreateExpenseItemInput,
  type CreateExpenseReportInput,
  type ExpenseActorContext,
  type ExpenseCategory,
  type ExpenseReport,
  type ListResult,
  type SyncExpenseActionsResult,
} from "./expense-management.types.js";
import {
  assertNonEmptyString,
  optionalString,
  parseLimit,
  parseNonNegativeNumber,
  parseOffset,
  parseOptionalDate,
  parseOptionalUuid,
  parseReportStatus,
  parseRequiredDate,
  parseRequiredUuid,
  sanitizeJsonRecord,
} from "./expense-management.validators.js";

type RawRecord = Record<string, unknown>;

const editableStatuses = new Set(["draft", "returned"]);
const expenseCategories: ExpenseCategory[] = [
  { key: "fuel", label: "Combustivel", receiptRequired: true, defaultLimit: 300 },
  { key: "meal", label: "Alimentacao", receiptRequired: true, defaultLimit: 150 },
  { key: "hotel", label: "Hotel", receiptRequired: true, defaultLimit: 800 },
  { key: "toll", label: "Pedagio", receiptRequired: true },
  { key: "parking", label: "Estacionamento", receiptRequired: true },
  { key: "transport", label: "Transporte", receiptRequired: true },
  { key: "materials", label: "Materiais emergenciais", receiptRequired: true },
  { key: "other", label: "Outros", receiptRequired: false },
];

export class ExpenseManagementService {
  constructor(private readonly repository: ExpenseManagementRepository) {}

  listPolicies(actor: ExpenseActorContext, query: RawRecord) {
    return this.repository.listPolicies({
      tenantId: actor.tenantId,
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  listCategories(): ListResult<ExpenseCategory> {
    return {
      items: expenseCategories,
      total: expenseCategories.length,
      limit: expenseCategories.length,
      offset: 0,
    };
  }

  listReports(actor: ExpenseActorContext, query: RawRecord) {
    const canReadAll = hasPermission(actor, "expense_report:read");
    return this.repository.listReports({
      tenantId: actor.tenantId,
      employeeUserId: canReadAll ? optionalString(query.employeeUserId ?? query.employee_user_id, 80) : actor.userId,
      status: parseReportStatus(query.status),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  async getReport(actor: ExpenseActorContext, reportId: string): Promise<ExpenseReport> {
    const report = await this.repository.getReport({ tenantId: actor.tenantId, reportId });
    if (!report) throw notFound();
    this.assertCanReadReport(actor, report);

    return report;
  }

  async createReport(actor: ExpenseActorContext, body: RawRecord): Promise<ExpenseReport> {
    const input = this.parseCreateReportInput(actor, body);
    const report = await this.repository.createReport(input);
    await this.recordEvent(actor, report.id, "expense_report.created", { status: report.status });

    return report;
  }

  async updateReport(actor: ExpenseActorContext, reportId: string, body: RawRecord): Promise<ExpenseReport> {
    const current = await this.getReport(actor, reportId);
    if (!editableStatuses.has(current.status)) {
      throw new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_editable", "Only draft or returned reports can be updated.");
    }

    const periodStart = parseOptionalDate(body.periodStart ?? body.period_start, "periodStart");
    const periodEnd = parseOptionalDate(body.periodEnd ?? body.period_end, "periodEnd");
    const advanceAmountValue = body.advanceAmount ?? body.advance_amount;
    const updated = await this.repository.updateReport({
      tenantId: actor.tenantId,
      reportId,
      periodStart,
      periodEnd,
      origin: optionalString(body.origin, 80),
      workOrderId: parseOptionalUuid(body.workOrderId ?? body.work_order_id, "workOrderId"),
      projectId: optionalString(body.projectId ?? body.project_id, 120),
      costCenter: optionalString(body.costCenter ?? body.cost_center, 120),
      city: optionalString(body.city, 120),
      advanceAmount: advanceAmountValue === undefined
        ? undefined
        : parseNonNegativeNumber(advanceAmountValue, "advanceAmount"),
      policyVersion: optionalString(body.policyVersion ?? body.policy_version, 80),
    });

    await this.recordEvent(actor, updated.id, "expense_report.updated", { status: updated.status });

    return updated;
  }

  async addItem(actor: ExpenseActorContext, reportId: string, body: RawRecord) {
    const current = await this.getReport(actor, reportId);
    if (!editableStatuses.has(current.status)) {
      throw new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_editable", "Only draft or returned reports can receive new items.");
    }

    const input = this.parseCreateItemInput(actor.tenantId, reportId, body);
    const item = await this.repository.addItem(input);
    await this.recordEvent(actor, reportId, "expense_item.created", { itemId: item.id, amount: item.amount });

    return item;
  }

  async submitReport(actor: ExpenseActorContext, reportId: string): Promise<ExpenseReport> {
    const current = await this.getReport(actor, reportId);
    if (!editableStatuses.has(current.status) && current.status !== "ready_to_submit") {
      throw new ExpenseManagementError(409, "EXPENSE_REPORT_LOCKED", "status_not_submittable", "Only draft, returned or ready_to_submit reports can be submitted.");
    }
    if (current.items.length === 0) {
      throw new ExpenseManagementError(422, "EXPENSE_REPORT_INVALID", "empty_report", "At least one expense item is required before submit.");
    }

    const submitted = await this.repository.submitReport({
      tenantId: actor.tenantId,
      reportId,
      submittedAt: new Date(),
    });
    await this.recordEvent(actor, submitted.id, "expense_report.submitted", { status: submitted.status });

    return submitted;
  }

  async syncExpenseActions(actor: ExpenseActorContext, body: RawRecord): Promise<SyncExpenseActionsResult> {
    const actions = body.actions;
    if (!Array.isArray(actions)) {
      throw new ExpenseManagementError(400, "EXPENSE_SYNC_INVALID", "invalid_actions", "actions must be an array.");
    }

    const results = [];
    for (const action of actions) {
      if (!isRecord(action)) {
        throw new ExpenseManagementError(400, "EXPENSE_SYNC_INVALID", "invalid_action", "Each action must be an object.");
      }

      const clientActionId = assertNonEmptyString(action.clientActionId ?? action.client_action_id, "clientActionId", 160);
      const type = assertNonEmptyString(action.type, "type", 80);
      const existing = await this.repository.findMobileActionReceipt({ tenantId: actor.tenantId, clientActionId });
      if (existing) {
        results.push({
          clientActionId,
          type: existing.actionType,
          status: existing.status,
          resultRef: existing.resultRef,
          replayed: true,
        });
        continue;
      }

      const payload = sanitizeJsonRecord(action.payload ?? {});
      const resultRef = await this.processSyncAction(actor, type, payload);
      await this.repository.createMobileActionReceipt({
        tenantId: actor.tenantId,
        clientActionId,
        actorUserId: actor.userId,
        actionType: type,
        status: "processed",
        resultRef,
        processedAt: new Date(),
      });
      await this.recordEvent(actor, resultRef, "expense_report.synced_from_mobile", { type, clientActionId });
      results.push({ clientActionId, type, status: "processed" as const, resultRef, replayed: false });
    }

    return { results };
  }

  private async processSyncAction(actor: ExpenseActorContext, type: string, payload: RawRecord): Promise<string> {
    if (type === "expense_report.create") {
      return (await this.createReport(actor, payload)).id;
    }
    if (type === "expense_item.create") {
      const reportId = parseRequiredUuid(payload.reportId ?? payload.report_id, "reportId");
      return (await this.addItem(actor, reportId, payload)).id;
    }
    if (type === "expense_report.submit") {
      const reportId = parseRequiredUuid(payload.reportId ?? payload.report_id, "reportId");
      return (await this.submitReport(actor, reportId)).id;
    }

    throw new ExpenseManagementError(400, "EXPENSE_SYNC_INVALID", "unsupported_action", `Unsupported sync action: ${type}.`);
  }

  private parseCreateReportInput(actor: ExpenseActorContext, body: RawRecord): CreateExpenseReportInput {
    const periodStart = parseRequiredDate(body.periodStart ?? body.period_start, "periodStart");
    const periodEnd = parseRequiredDate(body.periodEnd ?? body.period_end, "periodEnd");
    if (periodEnd < periodStart) {
      throw new ExpenseManagementError(400, "EXPENSE_INVALID", "invalid_period", "periodEnd must be after periodStart.");
    }

    return {
      tenantId: actor.tenantId,
      employeeUserId: this.resolveEmployeeUserId(actor, body),
      periodStart,
      periodEnd,
      origin: assertNonEmptyString(body.origin, "origin", 80),
      workOrderId: parseOptionalUuid(body.workOrderId ?? body.work_order_id, "workOrderId"),
      projectId: optionalString(body.projectId ?? body.project_id, 120),
      costCenter: optionalString(body.costCenter ?? body.cost_center, 120),
      city: optionalString(body.city, 120),
      advanceAmount: parseNonNegativeNumber(body.advanceAmount ?? body.advance_amount, "advanceAmount", 0),
      currency: optionalString(body.currency, 8) ?? "BRL",
      policyVersion: optionalString(body.policyVersion ?? body.policy_version, 80),
      createdBy: actor.userId,
    };
  }

  private parseCreateItemInput(tenantId: string, reportId: string, body: RawRecord): CreateExpenseItemInput {
    return {
      tenantId,
      reportId,
      categoryKey: assertNonEmptyString(body.categoryKey ?? body.category_key, "categoryKey", 80),
      spentAt: parseRequiredDate(body.spentAt ?? body.spent_at, "spentAt"),
      city: optionalString(body.city, 120),
      vendorName: optionalString(body.vendorName ?? body.vendor_name, 160),
      amount: parseNonNegativeNumber(body.amount, "amount"),
      currency: optionalString(body.currency, 8) ?? "BRL",
      km: body.km === undefined ? undefined : parseNonNegativeNumber(body.km, "km"),
      notes: optionalString(body.notes, 500),
      policyFlags: sanitizeJsonRecord(body.policyFlags ?? body.policy_flags ?? {}),
    };
  }

  private resolveEmployeeUserId(actor: ExpenseActorContext, body: RawRecord): string {
    const requestedEmployeeUserId = optionalString(body.employeeUserId ?? body.employee_user_id, 80);
    if (!requestedEmployeeUserId) return actor.userId;

    return hasPermission(actor, "expense_report:read") ? requestedEmployeeUserId : actor.userId;
  }

  private assertCanReadReport(actor: ExpenseActorContext, report: ExpenseReport): void {
    if (hasPermission(actor, "expense_report:read")) return;
    if (hasPermission(actor, "expense_report:read_own") && report.employeeUserId === actor.userId) return;

    throw new ExpenseManagementError(403, "FORBIDDEN", "permission_required", "Report is not visible for this actor.");
  }

  private recordEvent(actor: ExpenseActorContext, aggregateId: string, eventType: string, payload: RawRecord) {
    return this.repository.createEvent({
      tenantId: actor.tenantId,
      aggregateId,
      eventType,
      payloadHash: hashExpensePayload(payload),
      actorUserId: actor.userId,
    });
  }
}

const memoryRepository = new InMemoryExpenseManagementRepository();
let defaultServicePromise: Promise<ExpenseManagementService> | undefined;

export function createMemoryExpenseManagementService(): ExpenseManagementService {
  return new ExpenseManagementService(memoryRepository);
}

export function getMemoryExpenseManagementRepositoryForTests(): InMemoryExpenseManagementRepository {
  return memoryRepository;
}

export async function createDefaultExpenseManagementService(): Promise<ExpenseManagementService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryExpenseManagementService();
  }

  defaultServicePromise ??= createPrismaExpenseManagementService();

  return defaultServicePromise;
}

export function resetExpenseManagementRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaExpenseManagementService(): Promise<ExpenseManagementService> {
  const { createPrismaExpenseManagementRepository } = await import("./expense-management-prisma.repository.js");
  const repository = await createPrismaExpenseManagementRepository();

  return new ExpenseManagementService(repository);
}

function hasPermission(actor: ExpenseActorContext, permission: Permission): boolean {
  return actor.permissions.includes(permission);
}

function notFound(): ExpenseManagementError {
  return new ExpenseManagementError(404, "EXPENSE_NOT_FOUND", "not_found", "Expense report was not found.");
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
