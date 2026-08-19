import { Router } from "express";

import { tenantContextMiddleware } from "../../core-saas/middleware/tenant-context.middleware.js";
import { createPersistentRbacContextMiddleware } from "../../core-saas/middleware/persistent-rbac-context.middleware.js";
import { handleAsyncRoute } from "../../core-saas/routes/http.js";
import type { ICoreSaasService } from "../../core-saas/services/core-saas-service.interface.js";
import { CoreSaasError } from "../../core-saas/types/core-saas.types.js";

export function createMeRouter(service: ICoreSaasService): Router {
  const router = Router();

  // Este router é montado no prefixo amplo /api/v1. Limitar os middlewares a
  // /me evita interceptar rotas irmãs (como /navigation/menu) antes do router dono.
  router.use(
    "/me",
    tenantContextMiddleware,
    createPersistentRbacContextMiddleware(),
  );

  router.get(
    "/me",
    handleAsyncRoute(async (request, response) => {
      const actor = request.tenantContext;

      if (!actor?.userId || actor.userId === "anonymous") {
        response.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        });
        return;
      }

      if (!actor.tenantId) {
        response.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Tenant context required." },
        });
        return;
      }

      try {
        const [user, tenant] = await Promise.all([
          service.getUserForTenant(actor.userId, actor.tenantId),
          service.getTenantForActor(actor.tenantId, actor.tenantId),
        ]);

        response.json({
          data: {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              status: user.status,
            },
            tenant: {
              id: tenant.id,
              name: tenant.name,
              status: tenant.status,
            },
            roles: [...actor.roles],
            permissions: [...actor.permissions],
          },
        });
      } catch (err) {
        if (err instanceof CoreSaasError && err.statusCode === 404) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "User or tenant not found." },
          });
          return;
        }

        throw err;
      }
    }),
  );

  router.get(
    "/me/tenants",
    handleAsyncRoute(async (request, response) => {
      const actor = request.actor;

      if (!actor?.email) {
        response.status(401).json({
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        });
        return;
      }

      // B-O6R-01 (Ω6R-TEN-001) — a listagem passa a vir dos VÍNCULOS da identidade do ator
      // (JWT), nunca da correlação por e-mail. Normaliza preguiçosamente o par do token (§3.4 —
      // escrita em caminho de leitura, declarado).
      const memberships = await service.listTenantsForIdentity(actor);

      response.json({
        data: memberships.map((m) => ({
          tenant: {
            id: m.tenant.id,
            name: m.tenant.name,
            status: m.tenant.status,
          },
          user: {
            id: m.user.id,
            roles: [...m.user.roles],
            status: m.user.status,
          },
        })),
      });
    }),
  );

  return router;
}
