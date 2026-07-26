import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ImpoundController, type ImpoundServiceResolver } from "./impound.controller.js";
import { createDefaultImpoundService } from "./impound.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// D-Ω5P-IMP-05 — impound:transition é permissão PRÓPRIA (≠ update): dirigir a FSM é ato de peso jurídico/
// probatório (muda o estado de custódia, gera evento imutável), distinto de corrigir metadado do veículo. Os PRs
// futuros SOMAM portões por-transição (aprovação da autoridade na liberação PR-10, leilão PR-12). assignSpot/
// recepção/vistoria/transferência = superfície HTTP de PR-06.
export const IMPOUND_PERMISSIONS = {
  read: "impound:read",
  create: "impound:create",
  update: "impound:update",
  transition: "impound:transition",
} as const;

export function createImpoundRouter(
  resolveService: ImpoundServiceResolver = createDefaultImpoundService,
): Router {
  const router = Router();
  const controller = new ImpoundController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Processos de custódia
  router.get(
    "/impound-processes",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/impound-processes",
    requirePermission(IMPOUND_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );
  router.get(
    "/impound-processes/:processId",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  router.patch(
    "/impound-processes/:processId",
    requirePermission(IMPOUND_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );
  // Timeline de eventos (read-only, append-only na origem). Paths de 3 segmentos — sem colisão com :processId.
  router.get(
    "/impound-processes/:processId/events",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listEvents(request));
    }),
  );
  // Verificação da cadeia de hash (I2) — detecta adulteração.
  router.get(
    "/impound-processes/:processId/verify",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.verify(request));
    }),
  );
  // Transição de estado (FSM §4.2) — permissão dedicada.
  router.post(
    "/impound-processes/:processId/transitions",
    requirePermission(IMPOUND_PERMISSIONS.transition),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.transition(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
