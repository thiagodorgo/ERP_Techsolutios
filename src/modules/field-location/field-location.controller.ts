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
