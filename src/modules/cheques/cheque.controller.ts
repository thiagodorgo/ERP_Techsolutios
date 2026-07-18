import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toChequeDto, toChequeListDto } from "./cheque.dto.js";
import type { Cheque } from "./cheque.types.js";
import type { ChequeService } from "./cheque.service.js";

export type ChequeServiceResolver = () => Promise<ChequeService>;

export class ChequeController {
  constructor(private readonly resolveService: ChequeServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toChequeListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await this.audit(request, "cheque.registered", item);
    return { status: 201, data: toChequeDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.chequeId));
    return { data: toChequeDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.update(actor, readRouteParam(request.params.chequeId), (request.body ?? {}) as Record<string, unknown>);
    await this.audit(request, "cheque.updated", item);
    return { data: toChequeDto(item) };
  }

  async delete(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.delete(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.deleted", item);
    return { data: toChequeDto(item) };
  }

  async deposit(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.deposit(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.deposited", item);
    return { data: toChequeDto(item) };
  }

  async clear(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.clear(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.cleared", item);
    return { data: toChequeDto(item) };
  }

  async bounce(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.bounce(actor, readRouteParam(request.params.chequeId), (request.body ?? {}) as Record<string, unknown>);
    await this.audit(request, "cheque.bounced", item);
    return { data: toChequeDto(item) };
  }

  async cancel(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.cancel(actor, readRouteParam(request.params.chequeId));
    await this.audit(request, "cheque.cancelled", item);
    return { data: toChequeDto(item) };
  }

  // §2.8 — metadados SEM tenant_id nem valores sensíveis (nada de amount/cheque_number/bank). Só a "forma"
  // do instrumento: {direction, status}.
  private async audit(request: Request, action: string, item: Cheque): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "cheque",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { direction: item.direction, status: item.status },
    });
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
