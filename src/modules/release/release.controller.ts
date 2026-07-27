import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toImpoundReleaseDto,
  toReleaseRequirementCheckDto,
  toReleaseViewDto,
} from "./release.dto.js";
import type { ReleaseService } from "./release.service.js";

export type ReleaseServiceResolver = () => Promise<ReleaseService>;

export class ReleaseController {
  constructor(private readonly resolveService: ReleaseServiceResolver) {}

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.get(actor, readRouteParam(request.params.processId));
    return { body: toReleaseViewDto(view) };
  }

  async start(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.start(actor, readRouteParam(request.params.processId), request.body ?? {});
    // §2.8: SÓ id/kind/status no audit (NUNCA recipient_name/document/authority_reference).
    await recordRequestAuditBestEffort(request, {
      action: "release.started",
      resourceType: "impound_release",
      resourceId: view.release.id,
      outcome: "success",
      severity: "info",
      metadata: { kind: view.release.kind, status: view.release.status },
    });
    return { status: 201, body: toReleaseViewDto(view) };
  }

  async setRecipient(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const release = await service.setRecipient(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "release.recipient_set",
      resourceType: "impound_release",
      resourceId: release.id,
      outcome: "success",
      severity: "info",
      metadata: { status: release.status },
    });
    return { body: { data: toImpoundReleaseDto(release) } };
  }

  async setRequirement(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const check = await service.setRequirement(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "release.requirement_checked",
      resourceType: "release_requirement_check",
      resourceId: check.id,
      outcome: "success",
      severity: "info",
      metadata: { code: check.code, satisfied: check.satisfied },
    });
    return { body: { data: toReleaseRequirementCheckDto(check) } };
  }

  async approve(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const release = await service.approve(actor, readRouteParam(request.params.processId), request.body ?? {});
    // §2.8: só id/status (NUNCA authority_reference/note — podem carregar contexto).
    await recordRequestAuditBestEffort(request, {
      action: "release.authority_approved",
      resourceType: "impound_release",
      resourceId: release.id,
      outcome: "success",
      severity: "info",
      metadata: { status: release.status },
    });
    return { body: { data: toImpoundReleaseDto(release) } };
  }

  async consume(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.consume(actor, readRouteParam(request.params.processId));
    await recordRequestAuditBestEffort(request, {
      action: "release.consumed",
      resourceType: "impound_release",
      resourceId: view.release.id,
      outcome: "success",
      severity: "info",
      metadata: { status: view.release.status },
    });
    return { body: toReleaseViewDto(view) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
