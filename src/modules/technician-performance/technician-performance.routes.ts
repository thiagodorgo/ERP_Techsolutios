import { Router, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import {
  TechnicianPerformanceController,
  type TechnicianPerformanceServiceResolver,
} from "./technician-performance.controller.js";
import { createDefaultTechnicianPerformanceService } from "./technician-performance.service.js";

type ControllerResult = { readonly status?: number; readonly body?: unknown; readonly data?: unknown };

// J-MAPAS-7 — Índice de conclusão de OS por técnico (ranking gerencial tenant-wide, agregado de leitura sobre
// work_orders). Gate = `field_dispatch:create` (a permissão de quem ALOCA): o ranking existe para apoiar a
// ALOCAÇÃO no Mapa, então só quem PODE alocar o vê — field_dispatcher / manager / tenant_admin. Isso EXCLUI
// corretamente o técnico de campo (`field_technician` tem `field_dispatch:read` mas NÃO `:create`) e os papéis
// só-leitura (operator/auditor/viewer) — coerente com o "field-scoped" da RBAC_MATRIX (achado ALTA da junta:
// gatear por :read exporia o ranking tenant-wide ao técnico de campo). Sem permissão nova (minimiza superfície).
export const TECHNICIAN_PERFORMANCE_PERMISSION = "field_dispatch:create" as const satisfies Permission;

export function createTechnicianPerformanceRouter(
  resolveService: TechnicianPerformanceServiceResolver = createDefaultTechnicianPerformanceService,
): Router {
  const router = Router();
  const controller = new TechnicianPerformanceController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/operations/technician-performance",
    requirePermission(TECHNICIAN_PERFORMANCE_PERMISSION),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
