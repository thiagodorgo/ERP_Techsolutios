import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFinancialAccountDto, toFinancialAccountListDto } from "./financial-account.dto.js";
import type { FinancialAccountService } from "./financial-account.service.js";

export type FinancialAccountServiceResolver = () => Promise<FinancialAccountService>;

export class FinancialAccountController {
  constructor(private readonly resolveService: FinancialAccountServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toFinancialAccountListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "financial_account.created",
      resourceType: "financial_account",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      // §2.8 — metadados SEM dados sensíveis (nada de document/account_number) e SEM tenant_id.
      metadata: { name: item.name, kind: item.kind, status: item.status },
    });
    return { status: 201, data: toFinancialAccountDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.financialAccountId));
    return { data: toFinancialAccountDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.financialAccountId), body);
    await recordRequestAuditBestEffort(request, {
      action: "financial_account.updated",
      resourceType: "financial_account",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, kind: item.kind, status: item.status },
    });
    return { data: toFinancialAccountDto(item) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    // DELETE = exclusão LÓGICA: 200 com o registro já inativo (is_active=false + status=inactive).
    const item = await service.delete(actor, readRouteParam(request.params.financialAccountId));
    await recordRequestAuditBestEffort(request, {
      action: "financial_account.deleted",
      resourceType: "financial_account",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, kind: item.kind, status: item.status },
    });
    return { data: toFinancialAccountDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
