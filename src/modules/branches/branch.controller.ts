import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toBranchDto, toBranchListDto } from "./branch.dto.js";
import type { BranchService } from "./branch.service.js";

export type BranchServiceResolver = () => Promise<BranchService>;

export class BranchController {
  constructor(private readonly resolveService: BranchServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toBranchListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "branch.created",
      resourceType: "branch",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, code: item.code, status: item.status },
    });
    return { status: 201, data: toBranchDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.branchId));
    return { data: toBranchDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.branchId), body);
    const deactivating = body.status === "inactive";
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "branch.deactivated" : "branch.updated",
      resourceType: "branch",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, code: item.code, status: item.status },
    });
    return { data: toBranchDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
