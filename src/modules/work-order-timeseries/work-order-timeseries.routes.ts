import { Router, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import {
  WorkOrderTimeseriesController,
  type WorkOrderTimeseriesServiceResolver,
} from "./work-order-timeseries.controller.js";
import { createDefaultWorkOrderTimeseriesService } from "./work-order-timeseries.service.js";

type ControllerResult = { readonly status?: number; readonly body?: unknown; readonly data?: unknown };

// Série temporal de OS (agregado de LEITURA sobre work_orders) — alimenta os GRÁFICOS TEMPORAIS do Dashboard
// operacional. Gate = `work_orders:read`: a MESMA permissão que já libera a lista/dashboard operacional de OS
// (manager/operator/viewer/field_technician/auditor a têm; finance/inventory/support NÃO). Sem permissão nova
// (minimiza superfície). §2.8: tenant sempre do ATOR autenticado (RLS), nunca de X-Tenant-Id cru.
export const WORK_ORDER_TIMESERIES_PERMISSION = "work_orders:read" as const satisfies Permission;

export function createWorkOrderTimeseriesRouter(
  resolveService: WorkOrderTimeseriesServiceResolver = createDefaultWorkOrderTimeseriesService,
): Router {
  const router = Router();
  const controller = new WorkOrderTimeseriesController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/operations/work-orders-timeseries",
    requirePermission(WORK_ORDER_TIMESERIES_PERMISSION),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
