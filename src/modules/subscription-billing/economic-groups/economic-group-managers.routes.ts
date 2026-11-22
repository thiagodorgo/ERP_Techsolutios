import { Router, type Request } from "express";

import { resolveRequestActor } from "../../auth/middleware/authenticated-actor.middleware.js";
import { handleAsyncRoute, readRouteParam } from "../../core-saas/routes/http.js";
import { requirePlatformPermission } from "../../platform/platform-permissions.js";
import { createDefaultEconomicGroupManagersService } from "./economic-group-managers.factory.js";
import type { GroupManager } from "./economic-group-managers.repository.js";

export function createEconomicGroupManagersPlatformRouter(): Router {
  const router = Router();

  router.get("/economic-groups/:groupId/managers", requirePlatformPermission("platform:billing:read"), handleAsyncRoute(async (request, response) => {
    const service = await createDefaultEconomicGroupManagersService();
    response.status(200).json({ data: (await service.list(readRouteParam(request.params.groupId))).map(dto) });
  }));

  router.post("/economic-groups/:groupId/managers", requirePlatformPermission("platform:users:create_admin"), handleAsyncRoute(async (request, response) => {
    const service = await createDefaultEconomicGroupManagersService();
    const actor = actorOf(request);
    const body = objectBody(request.body);
    const manager = await service.grant({ groupId: readRouteParam(request.params.groupId), organizationId: requiredText(body.organizationId), userId: requiredText(body.userId), actorTenantId: actor.tenantId, actorUserId: actor.userId });
    response.status(201).json({ data: dto(manager) });
  }));

  router.delete("/economic-groups/:groupId/managers/:managerId", requirePlatformPermission("platform:users:create_admin"), handleAsyncRoute(async (request, response) => {
    const service = await createDefaultEconomicGroupManagersService();
    await service.revoke(readRouteParam(request.params.groupId), readRouteParam(request.params.managerId), actorOf(request).userId);
    response.status(204).end();
  }));

  return router;
}

function dto(manager: GroupManager) { return { managerId: manager.id, grantedAt: manager.grantedAt.toISOString(), accounts: manager.accounts }; }
function objectBody(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function requiredText(value: unknown): string { const text = typeof value === "string" ? value.trim() : ""; if (!text) throw new Error("invalid_group_manager_body"); return text; }
function actorOf(request: Request): { tenantId: string; userId: string | null } { const actor = resolveRequestActor(request); if (!actor?.tenantId) throw new Error("platform_actor_context_missing"); return { tenantId: actor.tenantId, userId: actor.userId ?? null }; }
