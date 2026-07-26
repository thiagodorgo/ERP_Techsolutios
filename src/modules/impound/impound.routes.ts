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
// PR-06 (D-Ω5P-REC-06) — 2 permissões NOVAS: impound:inspect (vistoria de recepção — operador de recepção) e
// impound:allocate (allocate/vacate/move de vaga — operador de pátio). impound:transition/:read REUSADAS.
export const IMPOUND_PERMISSIONS = {
  read: "impound:read",
  create: "impound:create",
  update: "impound:update",
  transition: "impound:transition",
  inspect: "impound:inspect",
  allocate: "impound:allocate",
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

  // ── Vistoria de recepção (I3) — impound:inspect ─────────────────────────────────────────────────────────
  router.get(
    "/impound-processes/:processId/inspection",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getInspection(request));
    }),
  );
  router.put(
    "/impound-processes/:processId/inspection",
    requirePermission(IMPOUND_PERMISSIONS.inspect),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.saveInspection(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/inspection/photos",
    requirePermission(IMPOUND_PERMISSIONS.inspect),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.addInspectionPhoto(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/inspection/complete",
    requirePermission(IMPOUND_PERMISSIONS.inspect),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.completeInspection(request));
    }),
  );

  // ── Ocupação atômica da vaga (I1) — impound:allocate ────────────────────────────────────────────────────
  router.post(
    "/impound-processes/:processId/spot",
    requirePermission(IMPOUND_PERMISSIONS.allocate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.assignSpot(request));
    }),
  );
  router.delete(
    "/impound-processes/:processId/spot",
    requirePermission(IMPOUND_PERMISSIONS.allocate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.vacateSpot(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/spot/move",
    requirePermission(IMPOUND_PERMISSIONS.allocate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.moveSpot(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
