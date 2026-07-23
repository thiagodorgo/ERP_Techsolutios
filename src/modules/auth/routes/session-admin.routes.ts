import { Router } from "express";

import { createPersistentRbacContextMiddleware } from "../../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission, requireTenantContext } from "../../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute, readRouteParam } from "../../core-saas/routes/http.js";
import { getSessionAdminService, type SessionAdminService } from "../services/session-admin.service.js";

// -----------------------------------------------------------------------------
// Ω4C PR-11 — Rotas administrativas de Sessões (Controle > Usuários). Montadas sob /api/v1 com
// attachAuthenticatedActor() (app.ts). O tenant vem SEMPRE do ator autenticado (nunca de X-Tenant-Id
// externo). RBAC (D-Ω4C-SESS-PERM): listar/histórico = sessions:read / audit.read; revogar = sessions:revoke
// (administrativa forte — tenant_admin/super_admin/platform_admin; auditor NÃO revoga).
// -----------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SessionAdminServiceResolver = () => Promise<SessionAdminService>;

export function createSessionAdminRouter(
  resolveService: SessionAdminServiceResolver = getSessionAdminService,
): Router {
  const router = Router();

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Acessos: último login por usuário (derivado de auth_sessions.created_at). Montado ANTES de "/sessions"
  // não é necessário (paths distintos), mas mantém a leitura junto às sessões. Reusa audit.read.
  router.get(
    "/sessions/access-history",
    requirePermission("audit.read"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const userId = readOptionalUuid(request.query.userId, "userId");
      const from = readOptionalDate(request.query.from, "from");
      const to = readOptionalDate(request.query.to, "to");

      const service = await resolveService();
      const data = await service.accessHistory(
        { tenantId: actor.tenantId, userId: actor.userId },
        { userId, from, to },
      );

      response.status(200).json({ data });
    }),
  );

  // Sessões ativas do tenant (revoked_at IS NULL AND expires_at > now), filtráveis por usuário.
  router.get(
    "/sessions",
    requirePermission("sessions:read"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const userId = readOptionalUuid(request.query.userId, "userId");

      const service = await resolveService();
      const data = await service.listActiveSessions(
        { tenantId: actor.tenantId, userId: actor.userId },
        { userId },
      );

      response.status(200).json({ data });
    }),
  );

  // Revogação administrativa por id (sem o refresh token da vítima). Idempotente (200 revoked:true);
  // id inexistente / de OUTRO tenant → 404 (nunca vaza existência cross-tenant). Sem 409 (estado terminal).
  router.post(
    "/sessions/:id/revoke",
    requirePermission("sessions:revoke"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const sessionId = readRequiredUuid(readRouteParam(request.params.id), "id");

      const service = await resolveService();
      const result = await service.revokeSession(
        { tenantId: actor.tenantId, userId: actor.userId },
        sessionId,
      );

      response.status(200).json({ data: result });
    }),
  );

  return router;
}

function readOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string" || !UUID_PATTERN.test(raw)) {
    throw unprocessable(field, `${field} must be a valid UUID.`);
  }

  return raw;
}

function readRequiredUuid(value: string, field: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw unprocessable(field, `${field} must be a valid UUID.`);
  }

  return value;
}

function readOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== "string") {
    throw unprocessable(field, `${field} must be an ISO-8601 date.`);
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw unprocessable(field, `${field} must be an ISO-8601 date.`);
  }

  return parsed;
}

function unprocessable(field: string, message: string) {
  return {
    statusCode: 422,
    code: "UNPROCESSABLE_ENTITY",
    reason: `invalid_${field}`,
    message,
  };
}
