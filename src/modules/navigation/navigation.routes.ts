import { Router } from "express";

import { resolveRequestActor } from "../auth/middleware/authenticated-actor.middleware.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { getMenuForCurrentUser, isNavigationScope } from "./navigation.service.js";
import type { NavigationScope } from "./navigation.types.js";

export function createNavigationRouter(service?: ICoreSaasService): Router {
  const router = Router();

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/menu",
    handleAsyncRoute(async (request, response) => {
      const actor = resolveRequestActor(request);

      if (!actor) {
        response.status(401).json({
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication is required to resolve navigation menu.",
          },
        });
        return;
      }

      const scope = parseScope(request.query.scope);
      const tenantContext = request.tenantContext;
      const tenantId = tenantContext?.tenantId || actor.tenantId;
      const enabledModules = await resolveEnabledModules(service, tenantId);
      const roles = tenantContext?.roles ?? actor.roles;
      const permissions = tenantContext?.permissions ?? (actor.authType === "legacy_headers" ? actor.permissions : []);
      const menu = getMenuForCurrentUser({
        userId: actor.userId,
        tenantId,
        roles,
        permissions,
        enabledModules,
        ...(scope ? { scope } : {}),
      });

      response.status(200).json({
        data: menu,
        metadata: {
          generatedAt: new Date().toISOString(),
          ...(scope ? { scope } : {}),
          groups: [...new Set(menu.map((item) => item.group))],
        },
      });
    }),
  );

  return router;
}

function parseScope(queryValue: unknown): NavigationScope | undefined {
  const value = typeof queryValue === "string" ? queryValue.trim() : "";

  return value && isNavigationScope(value) ? value : undefined;
}

async function resolveEnabledModules(
  service: ICoreSaasService | undefined,
  tenantId: string | undefined,
): Promise<readonly string[] | undefined> {
  if (!service || !tenantId || tenantId === "platform") {
    return undefined;
  }

  try {
    const tenant = await service.getTenantForActor(tenantId, tenantId);
    return tenant.modules;
  } catch {
    return undefined;
  }
}
