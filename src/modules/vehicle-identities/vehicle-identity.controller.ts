import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toVehicleIdentityDto, toVehicleIdentityListDto } from "./vehicle-identity.dto.js";
import type { VehicleIdentityService } from "./vehicle-identity.service.js";

export type VehicleIdentityServiceResolver = () => Promise<VehicleIdentityService>;

export class VehicleIdentityController {
  constructor(private readonly resolveService: VehicleIdentityServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toVehicleIdentityListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const identity = await service.create(actor, (request.body ?? {}) as Record<string, unknown>);
    // Auditoria best-effort: metadados SEM PII crua (só confidence/unidentified — nunca placa/chassi/Renavam).
    await recordRequestAuditBestEffort(request, {
      action: "vehicle_identity.created",
      resourceType: "vehicle_identity",
      resourceId: identity.id,
      outcome: "success",
      severity: "info",
      metadata: { confidence: identity.confidence, unidentified: identity.unidentified },
    });
    return { status: 201, data: toVehicleIdentityDto(identity) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const identity = await service.get(actor, readRouteParam(request.params.identityId));
    return { data: toVehicleIdentityDto(identity) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const identity = await service.update(actor, readRouteParam(request.params.identityId), body);
    await recordRequestAuditBestEffort(request, {
      action: "vehicle_identity.updated",
      resourceType: "vehicle_identity",
      resourceId: identity.id,
      outcome: "success",
      severity: "info",
      metadata: { confidence: identity.confidence, unidentified: identity.unidentified },
    });
    return { data: toVehicleIdentityDto(identity) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
