import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toInsurancePolicyDto, toInsurancePolicyListDto } from "./insurance-policy.dto.js";
import type { InsurancePolicyService } from "./insurance-policy.service.js";

export type InsurancePolicyServiceResolver = () => Promise<InsurancePolicyService>;

export class InsurancePolicyController {
  constructor(private readonly resolveService: InsurancePolicyServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toInsurancePolicyListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const policy = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "insurance_policy.created",
      resourceType: "insurance_policy",
      resourceId: policy.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: policy.vehicleId,
        status: policy.status,
      },
    });

    return {
      status: 201,
      data: toInsurancePolicyDto(policy),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const policy = await service.get(actor, readRouteParam(request.params.insurancePolicyId));

    return {
      data: toInsurancePolicyDto(policy),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const policy = await service.update(actor, readRouteParam(request.params.insurancePolicyId), body);

    const deactivating = body.is_active === false || body.isActive === false;
    const statusChanged = body.status !== undefined && body.status !== null && body.status !== "";

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "insurance_policy.deactivated" : "insurance_policy.updated",
      resourceType: "insurance_policy",
      resourceId: policy.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: policy.vehicleId,
        status: policy.status,
        ...(statusChanged ? { statusChanged: true } : {}),
        ...(deactivating ? { isActive: policy.isActive } : {}),
      },
    });

    return {
      data: toInsurancePolicyDto(policy),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
