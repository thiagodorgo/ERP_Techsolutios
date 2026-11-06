// B-ASS-04 · F9 — rotas da ORGANIZAÇÃO (cliente) sobre a própria assinatura: `/api/v1/billing/subscription*`.
// A organização vem SEMPRE das claims (tenantContext); `tenantId` em query é recusado com 400. Ator de plataforma (papel
// em PLATFORM_ROLES) ou organização de sistema (`slug = "platform"`) → 403 `platform_actor_not_a_customer` (R-ST-9, S14):
// o `super_admin` tem `billing:read` pelo catálogo inteiro e responderia 200 pela organização de sistema.
// Classificação para o CE-1 do B-SAN3-18: núcleo, sem módulo.

import { Router, type NextFunction, type Request, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { PLATFORM_ROLES } from "../core-saas/permissions/catalog.js";
import { handleAsyncRoute, sendRouteError } from "../core-saas/routes/http.js";
import { createDefaultStatementRuntime } from "./statements/statement.factory.js";
import { StatementError } from "./statements/statement.types.js";
import { buildTenantSubscriptionView, buildUsageHistory } from "./statements/subscription-view.js";

const BASE = "/billing/subscription";
const PLATFORM_ROLE_SET = new Set<string>(PLATFORM_ROLES);

function rejectTenantOverride(request: Request, response: Response, next: NextFunction): void {
  if (request.query.tenantId !== undefined) {
    sendRouteError(response, new StatementError(400, "tenant_id_not_allowed", "The organization comes from the session, not from the query."));
    return;
  }
  next();
}

/** R-ST-9: papel de plataforma ou organização de sistema não é cliente. */
async function rejectPlatformActor(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const roles = request.tenantContext?.roles ?? [];
    if (roles.some((role) => PLATFORM_ROLE_SET.has(role))) {
      throw new StatementError(403, "platform_actor_not_a_customer", "Platform actors are not subscription customers.");
    }
    const { tenants } = await createDefaultStatementRuntime();
    const tenant = await tenants.getTenantById(tenantIdOf(request));
    if (tenant?.slug === "platform") {
      throw new StatementError(403, "platform_actor_not_a_customer", "Platform actors are not subscription customers.");
    }
  } catch (error) {
    sendRouteError(response, error);
    return;
  }
  next();
}

function tenantIdOf(request: Request): string {
  return request.tenantContext?.tenantId ?? "";
}

export function createSubscriptionBillingTenantRouter(): Router {
  const router = Router();

  router.use(BASE, tenantContextMiddleware);
  router.use(BASE, createPersistentRbacContextMiddleware());
  router.use(BASE, requirePermission("billing:read"));
  router.use(BASE, rejectPlatformActor);
  router.use(BASE, rejectTenantOverride);

  router.get(
    BASE,
    handleAsyncRoute(async (request, response) => {
      const runtime = await createDefaultStatementRuntime();
      response.status(200).json({ data: await buildTenantSubscriptionView(runtime, tenantIdOf(request), new Date()) });
    }),
  );

  router.get(
    `${BASE}/usage-history`,
    handleAsyncRoute(async (request, response) => {
      const raw = request.query.months === undefined ? "6" : String(request.query.months);
      if (!/^\d{1,2}$/.test(raw) || Number(raw) < 1 || Number(raw) > 12) {
        throw new StatementError(400, "invalid_months", "months must be between 1 and 12.");
      }
      const runtime = await createDefaultStatementRuntime();
      response.status(200).json({ data: await buildUsageHistory(runtime, tenantIdOf(request), Number(raw), new Date()) });
    }),
  );

  return router;
}
