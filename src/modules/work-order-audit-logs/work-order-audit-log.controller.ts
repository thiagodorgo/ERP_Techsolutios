import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { resolveUserNames, type UserNameResolver } from "../core-saas/users/user-name-resolver.js";
import { toWorkOrderAuditLogListDto } from "./work-order-audit-log.dto.js";
import type { WorkOrderAuditLogService } from "./work-order-audit-log.service.js";

export type WorkOrderAuditLogServiceResolver = () => Promise<WorkOrderAuditLogService>;

export class WorkOrderAuditLogController {
  // `resolveUserName` opcional (composto na raiz/app.ts): traduz o autor do log userId → NOME. Sem ele,
  // actorName sai null e o front cai em "Sistema" (NUNCA o UUID; §11.2).
  constructor(
    private readonly resolveService: WorkOrderAuditLogServiceResolver,
    private readonly resolveUserName?: UserNameResolver,
  ) {}

  async list(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const logs = await service.listWorkOrderAuditLogs(actor, readRouteParam(request.params.workOrderId));
    const names = await resolveUserNames(this.resolveUserName, actor.tenantId, logs.map((log) => log.actorUserId));
    return { body: toWorkOrderAuditLogListDto(logs, names) };
  }
}
