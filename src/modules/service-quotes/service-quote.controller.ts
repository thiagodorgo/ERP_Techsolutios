import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toServiceQuoteDto, toServiceQuoteListDto } from "./service-quote.dto.js";
import type { ServiceQuoteService } from "./service-quote.service.js";

export type ServiceQuoteServiceResolver = () => Promise<ServiceQuoteService>;

export class ServiceQuoteController {
  constructor(private readonly resolveService: ServiceQuoteServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toServiceQuoteListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    // Auditoria: só rastreabilidade não-sensível (nunca o valor bruto? total é dado de negócio, não PII —
    // registramos status/priceSource/total para trilha financeira, sem tokens/paths/tenant externo).
    await recordRequestAuditBestEffort(request, {
      action: "service_quote.created",
      resourceType: "service_quote",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { status: item.status, priceSource: item.priceSource, serviceCatalogId: item.serviceCatalogId },
    });
    return { status: 201, data: toServiceQuoteDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.serviceQuoteId));
    return { data: toServiceQuoteDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.update(actor, readRouteParam(request.params.serviceQuoteId), (request.body ?? {}) as Record<string, unknown>);
    await recordRequestAuditBestEffort(request, {
      action: "service_quote.updated",
      resourceType: "service_quote",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { status: item.status, priceSource: item.priceSource },
    });
    return { data: toServiceQuoteDto(item) };
  }

  async updateStatus(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.updateStatus(actor, readRouteParam(request.params.serviceQuoteId), (request.body ?? {}) as Record<string, unknown>);
    await recordRequestAuditBestEffort(request, {
      action: `service_quote.${item.status}`,
      resourceType: "service_quote",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { status: item.status },
    });
    return { data: toServiceQuoteDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
