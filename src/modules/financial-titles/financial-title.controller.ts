import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFinancialTitleDto, toFinancialTitleListDto } from "./financial-title.dto.js";
import type { FinancialTitle } from "./financial-title.types.js";
import type { FinancialTitleService } from "./financial-title.service.js";

export type FinancialTitleServiceResolver = () => Promise<FinancialTitleService>;

export class FinancialTitleController {
  constructor(private readonly resolveService: FinancialTitleServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toFinancialTitleListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await this.audit(request, "financial_title.created", item);
    return { status: 201, data: toFinancialTitleDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.financialTitleId));
    return { data: toFinancialTitleDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.financialTitleId), body);
    await this.audit(request, "financial_title.updated", item);
    return { data: toFinancialTitleDto(item) };
  }

  async changeStatus(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.changeStatus(actor, readRouteParam(request.params.financialTitleId), body);
    await this.audit(request, "financial_title.status_changed", item);
    return { data: toFinancialTitleDto(item) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    // DELETE = exclusão LÓGICA: 200 com o registro já com deleted_at carimbado (active=false).
    const item = await service.delete(actor, readRouteParam(request.params.financialTitleId));
    await this.audit(request, "financial_title.deleted", item);
    return { data: toFinancialTitleDto(item) };
  }

  // §2.8 — metadados SEM tenant_id nem valores sensíveis (nada de party_name/document/amount/valores).
  // Só a "forma" do título: {direction, status, party_type}.
  private async audit(request: Request, action: string, item: FinancialTitle): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "financial_title",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { direction: item.direction, status: item.status, party_type: item.partyType },
    });
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
