import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toJurisdictionDefaultsDto,
  toJurisdictionProfileDto,
  toJurisdictionProfileListDto,
} from "./jurisdiction.dto.js";
import type { JurisdictionService } from "./jurisdiction.service.js";

export type JurisdictionServiceResolver = () => Promise<JurisdictionService>;

export class JurisdictionController {
  constructor(private readonly resolveService: JurisdictionServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toJurisdictionProfileListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const profile = await service.create(actor, request.body ?? {});
    // Auditoria best-effort: metadados SEM PII/valores (só scope + active).
    await recordRequestAuditBestEffort(request, {
      action: "jurisdiction_profile.created",
      resourceType: "jurisdiction_profile",
      resourceId: profile.id,
      outcome: "success",
      severity: "info",
      metadata: { scope: profile.scope, active: profile.active },
    });
    return { status: 201, data: toJurisdictionProfileDto(profile) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const profile = await service.get(actor, readRouteParam(request.params.profileId));
    return { data: toJurisdictionProfileDto(profile) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const profile = await service.update(actor, readRouteParam(request.params.profileId), body);
    const deactivating = body.active === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "jurisdiction_profile.deactivated" : "jurisdiction_profile.updated",
      resourceType: "jurisdiction_profile",
      resourceId: profile.id,
      outcome: "success",
      severity: "info",
      metadata: { scope: profile.scope, active: profile.active },
    });
    return { data: toJurisdictionProfileDto(profile) };
  }

  // GET /jurisdiction-defaults?scope= — read-only, sem escrita/auditoria. Devolve os defaults federais da natureza.
  async defaults(request: Request) {
    const [service] = await this.resolveServiceWithActor(request);
    const { scope, defaults } = service.defaults(request.query as Record<string, unknown>);
    return { data: toJurisdictionDefaultsDto(scope, defaults) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
