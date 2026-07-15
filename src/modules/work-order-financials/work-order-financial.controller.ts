import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toWorkOrderFinancialItemDto, toWorkOrderFinancialListDto } from "./work-order-financial.dto.js";
import type { WorkOrderFinancialService } from "./work-order-financial.service.js";

export type WorkOrderFinancialServiceResolver = () => Promise<WorkOrderFinancialService>;

export class WorkOrderFinancialController {
  constructor(private readonly resolveService: WorkOrderFinancialServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, readRouteParam(request.params.workOrderId));
    return { body: toWorkOrderFinancialListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const item = await service.create(actor, workOrderId, (request.body ?? {}) as Record<string, unknown>);
    // Auditoria com metadados CURADOS (§2.8): rastreabilidade não-sensível, sem token/path/tenant
    // externo — padrão do controller de orçamento.
    await recordRequestAuditBestEffort(request, {
      action: "work_order.financial_item_added",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { itemId: item.id, source: item.source, tariffId: item.tariffId ?? null },
    });
    return { status: 201, data: toWorkOrderFinancialItemDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const item = await service.update(
      actor,
      workOrderId,
      readRouteParam(request.params.itemId),
      (request.body ?? {}) as Record<string, unknown>,
    );
    await recordRequestAuditBestEffort(request, {
      action: "work_order.financial_item_updated",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { itemId: item.id, source: item.source },
    });
    return { data: toWorkOrderFinancialItemDto(item) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const removed = await service.delete(actor, workOrderId, readRouteParam(request.params.itemId));
    await recordRequestAuditBestEffort(request, {
      action: "work_order.financial_item_deleted",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { itemId: removed.id },
    });
    return { status: 204 };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
