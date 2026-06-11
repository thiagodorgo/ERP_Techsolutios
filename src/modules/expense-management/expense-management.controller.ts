import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toExpenseCategoryDto,
  toExpenseItemDto,
  toExpensePolicyDto,
  toExpenseReportDto,
  toListDto,
  toSyncExpenseActionsDto,
} from "./expense-management.dto.js";
import type { ExpenseManagementService } from "./expense-management.service.js";

export type ExpenseManagementServiceResolver = () => Promise<ExpenseManagementService>;

export class ExpenseManagementController {
  constructor(private readonly resolveService: ExpenseManagementServiceResolver) {}

  async listPolicies(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    return {
      body: toListDto(await service.listPolicies(actor, request.query as Record<string, unknown>), toExpensePolicyDto),
    };
  }

  async listCategories(request: Request) {
    const [service] = await this.resolveServiceWithActor(request);
    return {
      body: toListDto(service.listCategories(), toExpenseCategoryDto),
    };
  }

  async listReports(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    return {
      body: toListDto(await service.listReports(actor, request.query as Record<string, unknown>), toExpenseReportDto),
    };
  }

  async createReport(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const report = await service.createReport(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "expense_report.created",
      resourceType: "expense_report",
      resourceId: report.id,
      outcome: "success",
      severity: "info",
      metadata: { status: report.status },
    });

    return { status: 201, data: toExpenseReportDto(report) };
  }

  async getReport(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    return {
      data: toExpenseReportDto(await service.getReport(actor, readRouteParam(request.params.reportId))),
    };
  }

  async updateReport(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const report = await service.updateReport(actor, readRouteParam(request.params.reportId), request.body ?? {});
    return { data: toExpenseReportDto(report) };
  }

  async addItem(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.addItem(actor, readRouteParam(request.params.reportId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "expense_item.created",
      resourceType: "expense_item",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { reportId: item.reportId, categoryKey: item.categoryKey },
    });

    return { status: 201, data: toExpenseItemDto(item) };
  }

  async submitReport(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const report = await service.submitReport(actor, readRouteParam(request.params.reportId));
    await recordRequestAuditBestEffort(request, {
      action: "expense_report.submitted",
      resourceType: "expense_report",
      resourceId: report.id,
      outcome: "success",
      severity: "info",
      metadata: { status: report.status },
    });

    return { data: toExpenseReportDto(report) };
  }

  async syncExpenseActions(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.syncExpenseActions(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "expense_report.synced_from_mobile",
      resourceType: "mobile_action_receipts",
      resourceId: "batch",
      outcome: "success",
      severity: "info",
      metadata: { count: result.results.length },
    });

    return { data: toSyncExpenseActionsDto(result) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
