import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ChargeController, type ChargeServiceResolver } from "./charge.controller.js";
import { createDefaultChargeService } from "./charge.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// Ω5P PR-07 (D-Ω5P-CHG) — 2 permissões: charging:read (ver ledger + memória de cálculo; distribuição ampla =
// impound:read) e charging:create (registrar REMOVAL/ADDITIONAL/ADJUSTMENT manual; gestão+admins). SEM
// charging:update/:delete (ledger AMOUNT-IMUTÁVEL — correção = ADJUSTMENT) e SEM charging:manage (permissão morta).
// A acumulação de DIÁRIA roda como SISTEMA (job, fora do RBAC HTTP). O settlement (settled_*) é PR-10.
export const CHARGING_PERMISSIONS = {
  read: "charging:read",
  create: "charging:create",
} as const;

export function createChargeRouter(resolveService: ChargeServiceResolver = createDefaultChargeService): Router {
  const router = Router();
  const controller = new ChargeController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Ledger de encargos (read-only via HTTP; DIÁRIA só pelo motor). Paths de 3 segmentos — sem colisão com o
  // router de impound (/impound-processes, /impound-processes/:id, .../events, .../verify, .../inspection, .../spot).
  router.get(
    "/impound-processes/:processId/charges",
    requirePermission(CHARGING_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  // Memória de cálculo (RN-DIA-06) — a base fiel da guia PDF client-side (PR-08). Path de 4 segmentos.
  router.get(
    "/impound-processes/:processId/charges/statement",
    requirePermission(CHARGING_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.statement(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/charges",
    requirePermission(CHARGING_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
