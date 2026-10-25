import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFinancialAccountBalanceDto, toFinancialEntryDto, toFinancialEntryListDto } from "./financial-entry.dto.js";
import { FinancialEntryError, type FinancialEntry } from "./financial-entry.types.js";
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
    const { entry: item, delegated } = await service.reconcileWithOutcome(actor, readRouteParam(request.params.financialEntryId), body);
    await this.auditReconcile(request, item, delegated);
    return { data: toFinancialEntryDto(item) };
  }

  // B-SAN3-12a (§4.4) — `{ canUnreconcile, delegatedToFinance }` para o ator.
  async reconciliationPolicy(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    return { data: await service.reconciliationPolicy(actor) };
  }

  // B-SAN3-12a (§4.5) — `{ groupBy, currency, timezone, items }`, sem tenant_id.
  async aggregate(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    return { data: await service.aggregate(actor, request.query as Record<string, unknown>) };
  }

  async payTitle(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    let item: FinancialEntry;
    try {
      item = await service.payTitle(actor, readRouteParam(request.params.financialTitleId), body);
    } catch (error) {
      // B-SAN3-12a (§4.2) — o 422 `title_has_pending_cheque` leva o PRÓXIMO PASSO no corpo (`details`): os cheques
      // pendentes, o valor, "unlink_cheque" e a permissão exigida. O envelope comum (code/reason/message) não muda.
      if (error instanceof FinancialEntryError && error.details !== undefined) {
        return {
          status: error.statusCode,
          body: { error: { code: error.code, reason: error.reason, message: error.message, details: error.details } },
        };
      }
      throw error;
    }
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
  private async auditReconcile(request: Request, item: FinancialEntry, delegated: boolean): Promise<void> {
    await recordRequestAuditBestEffort(request, buildReconcileAudit(item, delegated));
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

/**
 * Entrada de auditoria da conciliação (pura, testável sem banco). B-SAN3-12a (§4.4): DESFAZER sai com severidade
 * `warning` (desfaz um metadado, o dinheiro não anda) e com `delegated: true` quando passou pela política da
 * organização (R4 do plano — a "permissão" por política fica auditada no uso).
 */
export function buildReconcileAudit(item: FinancialEntry, delegated: boolean) {
  return {
    // pós-análise B2: a ação distingue conciliar de desconciliar (trilha de auditoria — RN-AUD-005).
    action: item.reconciled ? "financial_entry.reconciled" : "financial_entry.unreconciled",
    resourceType: "financial_entry",
    resourceId: item.id,
    outcome: "success" as const,
    severity: item.reconciled ? ("info" as const) : ("warning" as const),
    metadata: item.reconciled
      ? { reconciled: item.reconciled, divergence_type: item.divergenceType ?? null }
      : { reconciled: item.reconciled, divergence_type: item.divergenceType ?? null, delegated },
  };
}
