import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toOperatorProfileDto, toOperatorProfileListDto } from "./operator-profile.dto.js";
import type { OperatorProfile } from "./operator-profile.types.js";
import type { OperatorProfileService } from "./operator-profile.service.js";

export type OperatorProfileServiceResolver = () => Promise<OperatorProfileService>;

export class OperatorProfileController {
  constructor(private readonly resolveService: OperatorProfileServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toOperatorProfileListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "operator_profile.created",
      resourceType: "operator_profile",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: auditMetadata(item),
    });
    return { status: 201, data: toOperatorProfileDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.profileId));
    return { data: toOperatorProfileDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.profileId), body);
    const deactivating = body.is_active === false || body.isActive === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "operator_profile.deactivated" : "operator_profile.updated",
      resourceType: "operator_profile",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: auditMetadata(item),
    });
    return { data: toOperatorProfileDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

// LGPD — allowlist estrita da auditoria: NUNCA cnh_number nem full_name (dado sensível). Só o vínculo
// (userId) e flags não identificáveis (tem consentimento? tem CNH cadastrada?).
function auditMetadata(item: OperatorProfile): Record<string, unknown> {
  return {
    userId: item.userId,
    hasConsent: item.trackingConsent,
    hasCnh: item.cnhNumber !== undefined,
  };
}
