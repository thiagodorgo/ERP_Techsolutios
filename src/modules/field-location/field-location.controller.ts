import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readString } from "../core-saas/routes/http.js";
import { toFieldOperatorLocationDto } from "./field-location.dto.js";
import {
  parseFieldLocationDateFilter,
  parseFieldLocationLimit,
  type FieldLocationService,
} from "./field-location.service.js";

export type FieldLocationServiceResolver = () => Promise<FieldLocationService>;

export class FieldLocationController {
  constructor(private readonly resolveService: FieldLocationServiceResolver) {}

  async recordMobileLocation(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const location = await service.recordMobileLocation(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "field_location.recorded",
      resourceType: "field_operator_location",
      resourceId: location.id,
      outcome: "success",
      severity: "info",
      metadata: {
        operatorUserId: location.operatorUserId,
        source: location.source,
        recordedAt: location.recordedAt.toISOString(),
        accuracyMeters: location.accuracyMeters,
      },
    });

    return {
      status: 201,
      data: toFieldOperatorLocationDto(location),
    };
  }

  // B-SAN3-17 — aceite (`granted = true`) ou revogação do PRÓPRIO consentimento. A auditoria vai com allowlist: o vínculo
  // (`userId`), o estado, a versão do texto, a hora da decisão e o desfecho. Nunca organização, coordenada nem
  // `client_action_id`. É best-effort, como toda auditoria de requisição (R13 do plano v2).
  async setOwnTrackingConsent(request: Request, granted: boolean) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.setOwnTrackingConsent(actor, granted, request.body ?? {});
    const action =
      result.status === "superseded"
        ? "field_location.consent_superseded"
        : result.granted
          ? "field_location.consent_granted"
          : "field_location.consent_revoked";

    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "operator_profile",
      resourceId: result.profileId,
      outcome: "success",
      severity: "info",
      metadata: {
        userId: actor.userId,
        hasConsent: result.granted,
        textVersion: result.textVersion,
        decidedAt: result.decidedAt.toISOString(),
        status: result.status,
      },
    });

    return {
      data: {
        granted: result.granted,
        granted_at: result.grantedAt ? result.grantedAt.toISOString() : null,
        client_action_id: result.clientActionId,
        status: result.status,
        profile_updated_at: result.profileUpdatedAt.toISOString(),
      },
    };
  }

  async listLatest(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const locations = await service.listLatest(actor, {
      since: parseFieldLocationDateFilter(request.query.since, "since"),
      limit: parseFieldLocationLimit(request.query.limit),
    });

    return {
      data: locations.map(toFieldOperatorLocationDto),
    };
  }

  async listHistory(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const operatorUserId = readString(request.query.operatorUserId);
    const locations = await service.listHistory(actor, {
      operatorUserId,
      from: parseFieldLocationDateFilter(request.query.from, "from"),
      to: parseFieldLocationDateFilter(request.query.to, "to"),
      limit: parseFieldLocationLimit(request.query.limit),
    });

    await recordRequestAuditBestEffort(request, {
      action: "field_location.history_viewed",
      resourceType: "field_operator_location",
      resourceId: operatorUserId,
      outcome: "success",
      severity: "info",
      metadata: {
        operatorUserId,
      },
    });

    return {
      data: locations.map(toFieldOperatorLocationDto),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
