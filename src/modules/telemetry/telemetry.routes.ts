import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { TelemetryController, type TelemetryServiceResolver } from "./telemetry.controller.js";
import { createDefaultTelemetryService } from "./telemetry.service.js";

type ControllerResult = { readonly status?: number; readonly body?: unknown; readonly data?: unknown };

// Leitura do console de Telemetria (Quilometragem/Rastreamento/Recusas/Acessos/Dispositivos): permissão
// NOVA `telemetry:read` (admin/dispatcher/auditor — NÃO field_technician; a ingestão reusa field_location:send
// e vive na rota do mobile). Backend é a autoridade — a UI só molda.
export const TELEMETRY_PERMISSIONS = {
  read: "telemetry:read",
} as const;

export function createTelemetryRouter(
  resolveService: TelemetryServiceResolver = createDefaultTelemetryService,
): Router {
  const router = Router();
  const controller = new TelemetryController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/telemetry/km",
    requirePermission(TELEMETRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.km(request));
    }),
  );

  router.get(
    "/telemetry/track",
    requirePermission(TELEMETRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.track(request));
    }),
  );

  router.get(
    "/telemetry/refusals",
    requirePermission(TELEMETRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.refusals(request));
    }),
  );

  router.get(
    "/telemetry/access",
    requirePermission(TELEMETRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.access(request));
    }),
  );

  router.get(
    "/telemetry/devices",
    requirePermission(TELEMETRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.devices(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
