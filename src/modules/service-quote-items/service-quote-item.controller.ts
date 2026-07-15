import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toServiceQuoteItemDto, toServiceQuoteItemListDto } from "./service-quote-item.dto.js";
import type { ServiceQuoteItemService } from "./service-quote-item.service.js";

export type ServiceQuoteItemServiceResolver = () => Promise<ServiceQuoteItemService>;

export class ServiceQuoteItemController {
  constructor(private readonly resolveService: ServiceQuoteItemServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, readRouteParam(request.params.serviceQuoteId));
    return { body: toServiceQuoteItemListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const serviceQuoteId = readRouteParam(request.params.serviceQuoteId);
    const item = await service.create(actor, serviceQuoteId, (request.body ?? {}) as Record<string, unknown>);
    // Auditoria com metadados CURADOS (§2.8): rastreabilidade não-sensível, sem token/path/tenant
    // externo — padrão do controller do Financeiro da OS.
    await recordRequestAuditBestEffort(request, {
      action: "service_quote.item_added",
      resourceType: "service_quote",
      resourceId: serviceQuoteId,
      outcome: "success",
      severity: "info",
      metadata: { itemId: item.id, source: item.source, tariffId: item.tariffId ?? null },
    });
    return { status: 201, data: toServiceQuoteItemDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const serviceQuoteId = readRouteParam(request.params.serviceQuoteId);
    const item = await service.update(
      actor,
      serviceQuoteId,
      readRouteParam(request.params.itemId),
      (request.body ?? {}) as Record<string, unknown>,
    );
    await recordRequestAuditBestEffort(request, {
      action: "service_quote.item_updated",
      resourceType: "service_quote",
      resourceId: serviceQuoteId,
      outcome: "success",
      severity: "info",
      metadata: { itemId: item.id, source: item.source },
    });
    return { data: toServiceQuoteItemDto(item) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const serviceQuoteId = readRouteParam(request.params.serviceQuoteId);
    const removed = await service.delete(actor, serviceQuoteId, readRouteParam(request.params.itemId));
    await recordRequestAuditBestEffort(request, {
      action: "service_quote.item_deleted",
      resourceType: "service_quote",
      resourceId: serviceQuoteId,
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
