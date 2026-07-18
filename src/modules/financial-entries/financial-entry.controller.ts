import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFinancialAccountBalanceDto, toFinancialEntryDto, toFinancialEntryListDto } from "./financial-entry.dto.js";
import type { FinancialEntry } from "./financial-entry.types.js";
import type { FinancialEntryService } from "./financial-entry.service.js";

export type FinancialEntryServiceResolver = () => Promise<FinancialEntryService>;

export class FinancialEntryController {
  constructor(private readonly resolveService: FinancialEntryServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toFinancialEntryListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await this.audit(request, "financial_entry.created", item);
    return { status: 201, data: toFinancialEntryDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.financialEntryId));
    return { data: toFinancialEntryDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.financialEntryId), body);
    await this.audit(request, "financial_entry.updated", item);
    return { data: toFinancialEntryDto(item) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    // DELETE = exclusão LÓGICA: 200 com o registro já com deleted_at carimbado (active=false).
    const item = await service.delete(actor, readRouteParam(request.params.financialEntryId));
    await this.audit(request, "financial_entry.deleted", item);
    return { data: toFinancialEntryDto(item) };
  }

  async reverse(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.reverse(actor, readRouteParam(request.params.financialEntryId));
    await this.audit(request, "financial_entry.reversed", item);
    return { status: 201, data: toFinancialEntryDto(item) };
  }

  async reconcile(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.reconcile(actor, readRouteParam(request.params.financialEntryId), body);
    await this.auditReconcile(request, item);
    return { data: toFinancialEntryDto(item) };
  }

  async payTitle(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.payTitle(actor, readRouteParam(request.params.financialTitleId), body);
    await this.audit(request, "financial_entry.title_settled", item);
    return { status: 201, data: toFinancialEntryDto(item) };
  }

  async balance(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.balance(actor, readRouteParam(request.params.financialAccountId));
    return { data: toFinancialAccountBalanceDto(result) };
  }

  // §2.8 — metadados SEM tenant_id nem valores sensíveis (nada de amount/description). Só a "forma" do
  // lançamento: {direction, payment_method}.
  private async audit(request: Request, action: string, item: FinancialEntry): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "financial_entry",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { direction: item.direction, payment_method: item.paymentMethod },
    });
  }

  // §2.8 — metadados SEM tenant_id nem valores sensíveis (nada de reconciliation_ref, texto/ref externa do
  // extrato). Só a "forma" da conciliação: {reconciled, divergence_type}.
  private async auditReconcile(request: Request, item: FinancialEntry): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action: "financial_entry.reconciled",
      resourceType: "financial_entry",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { reconciled: item.reconciled, divergence_type: item.divergenceType ?? null },
    });
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
