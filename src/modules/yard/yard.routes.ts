import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { YardController, type YardServiceResolver } from "./yard.controller.js";
import { createDefaultYardService } from "./yard.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// yard:manage DEFERIDO ao PR-06 (quando a ocupação ganha superfície HTTP dirigida pela autoridade/impound).
export const YARD_PERMISSIONS = {
  read: "yard:read",
  create: "yard:create",
  update: "yard:update",
} as const;

export function createYardRouter(
  resolveService: YardServiceResolver = createDefaultYardService,
): Router {
  const router = Router();
  const controller = new YardController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Pátios
  router.get(
    "/yards",
    requirePermission(YARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/yards",
    requirePermission(YARD_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );
  router.get(
    "/yards/:yardId",
    requirePermission(YARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  router.patch(
    "/yards/:yardId",
    requirePermission(YARD_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );
  // Mapa de ocupação do pátio (read-only). Não colide com /yards/:yardId (3 segmentos).
  router.get(
    "/yards/:yardId/occupancy",
    requirePermission(YARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.occupancy(request));
    }),
  );

  // Áreas de um pátio
  router.get(
    "/yards/:yardId/areas",
    requirePermission(YARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listAreas(request));
    }),
  );
  router.post(
    "/yards/:yardId/areas",
    requirePermission(YARD_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createArea(request));
    }),
  );
  router.get(
    "/yard-areas/:areaId",
    requirePermission(YARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getArea(request));
    }),
  );
  router.patch(
    "/yard-areas/:areaId",
    requirePermission(YARD_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.updateArea(request));
    }),
  );

  // Vagas de uma área
  router.get(
    "/yard-areas/:areaId/spots",
    requirePermission(YARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listSpots(request));
    }),
  );
  router.post(
    "/yard-areas/:areaId/spots",
    requirePermission(YARD_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createSpot(request));
    }),
  );
  router.get(
    "/yard-spots/:spotId",
    requirePermission(YARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getSpot(request));
    }),
  );
  router.patch(
    "/yard-spots/:spotId",
    requirePermission(YARD_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.updateSpot(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
