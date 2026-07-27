import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toChargeStatementDto, toProcessChargeDto, toProcessChargeListDto, toSettleResultDto } from "./charge.dto.js";
import type { ChargeService } from "./charge.service.js";

export type ChargeServiceResolver = () => Promise<ChargeService>;

export class ChargeController {
  constructor(private readonly resolveService: ChargeServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const charges = await service.list(actor, readRouteParam(request.params.processId));
    return { body: toProcessChargeListDto(charges) };
  }

  async statement(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const statement = await service.getStatement(actor, readRouteParam(request.params.processId));
    return { body: toChargeStatementDto(statement) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const charge = await service.createManual(actor, readRouteParam(request.params.processId), request.body ?? {});
    // Auditoria best-effort SEM PII/valores (§2.8): só id/kind (nunca amount/tarifa/placa/origem).
    await recordRequestAuditBestEffort(request, {
      action: "charging.charge.created",
      resourceType: "process_charge",
      resourceId: charge.id,
      outcome: "success",
      severity: "info",
      metadata: { kind: charge.kind },
    });
    return { status: 201, data: toProcessChargeDto(charge) };
  }

  // POST /impound-processes/:id/charges/settle — QUITAÇÃO manual (charging:settle). Auditoria §2.8: só contagens/
  // total agregado (nunca placa/origem/PII).
  async settle(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.settle(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "charging.settled",
      resourceType: "process_charge_settlement",
      resourceId: readRouteParam(request.params.processId),
      outcome: "success",
      severity: "info",
      metadata: { settledCount: result.settledCount, estornoCount: result.estornoCount },
    });
    return { body: { data: toSettleResultDto(result) } };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
