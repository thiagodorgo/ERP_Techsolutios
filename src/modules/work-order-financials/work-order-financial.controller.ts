import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFinancialTitleDto } from "../financial-titles/financial-title.dto.js";
import { toWorkOrderFinancialItemDto, toWorkOrderFinancialListDto } from "./work-order-financial.dto.js";
import type { WorkOrderFinancialService, WorkOrderInvoicingService } from "./work-order-financial.service.js";

export type WorkOrderFinancialServiceResolver = () => Promise<WorkOrderFinancialService>;
export type WorkOrderInvoicingServiceResolver = () => Promise<WorkOrderInvoicingService>;

export class WorkOrderFinancialController {
  constructor(
    private readonly resolveService: WorkOrderFinancialServiceResolver,
    private readonly resolveInvoicingService: WorkOrderInvoicingServiceResolver,
  ) {}

  // Ω4-3 — POST /work-orders/:id/invoice: MINTA um Título a receber a partir do agregado congelado.
  async invoice(request: Request) {
    const invoicing = await this.resolveInvoicingService();
    const actor = requireTenantContext(request);
    const workOrderId = readRouteParam(request.params.workOrderId);
    const result = await invoicing.invoice(actor, workOrderId, (request.body ?? {}) as Record<string, unknown>);
    // §2.8 — auditoria com metadados CURADOS: só forma/contagem, NUNCA amount/party_name/tenant.
    await recordRequestAuditBestEffort(request, {
      action: "work_order.invoiced",
      resourceType: "work_order",
      resourceId: workOrderId,
      outcome: "success",
      severity: "info",
      metadata: { titleId: result.title.id, invoicedItemCount: result.invoicedItemCount, currency: result.currency },
    });
    // Resposta: o Título criado (DTO sem tenant_id) + o total faturado e a contagem de itens carimbados.
    return {
      status: 201,
      body: {
        data: toFinancialTitleDto(result.title),
        invoicedTotal: result.totalAmount,
        currency: result.currency,
        invoicedItemCount: result.invoicedItemCount,
      },
    };
  }

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
