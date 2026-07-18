import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toFinancialPeriodCloseDto,
  toFinancialPeriodCloseListDto,
  toFinancialPeriodStatusDto,
} from "./financial-period-close.dto.js";
import type { FinancialPeriodClose } from "./financial-period-close.types.js";
import type { FinancialPeriodCloseService } from "./financial-period-close.service.js";

export type FinancialPeriodCloseServiceResolver = () => Promise<FinancialPeriodCloseService>;

export class FinancialPeriodCloseController {
  constructor(private readonly resolveService: FinancialPeriodCloseServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toFinancialPeriodCloseListDto(result) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const { record, period, checklist } = await service.get(actor, readRouteParam(request.params.period));
    return { data: toFinancialPeriodStatusDto(period, record, checklist) };
  }

  async close(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const { record, meta } = await service.close(actor, readRouteParam(request.params.period), body);
    // §2.8/RN-AUD-005 — metadata SEM valores de dinheiro (o snapshot vive na linha). Um force carrega
    // forced:true + os ids das disputas SOBREPOSTAS (server-side, nunca no snapshot público — e/ataque).
    await this.audit(request, "financial_period.closed", "close", record, {
      forced: meta.forced,
      ...(meta.forced ? { overriddenDisputeTitleIds: meta.overriddenDisputeTitleIds } : {}),
    });
    return { data: toFinancialPeriodCloseDto(record) };
  }

  async reopen(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const record = await service.reopen(actor, readRouteParam(request.params.period), body);
    await this.audit(request, "financial_period.reopened", "reopen", record, { reason: record.reopenReason ?? null });
    return { data: toFinancialPeriodCloseDto(record) };
  }

  private async audit(
    request: Request,
    action: string,
    verb: string,
    record: FinancialPeriodClose,
    extra: Record<string, unknown>,
  ): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "financial_period_close",
      resourceId: record.id,
      outcome: "success",
      severity: "info",
      metadata: { period: record.period, action: verb, ...extra },
    });
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
