import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ReleaseController, type ReleaseServiceResolver } from "./release.controller.js";
import { createDefaultReleaseService } from "./release.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// Ω5P PR-10a (D-Ω5P-REL / D-Ω5P-12) — Liberação I5.
// release:process = montar o dossiê (recipient + requirement checks) — gestão+admins (= impound:transition).
// release:approve = ATO DA AUTORIDADE — narrow (tenant_admin+manager como stand-in até o authority-portal Fase 5).
// impound:read  = ler a liberação em curso (leitura ampla, = charging:read).
// Os SALTOS da FSM (start/consume) reusam impound:transition (eixo jurídico já existente) — o release.service é
// quem resolve o gate I5 e dispara a transição via resolveTransition (guardas PURAS SOMADAS em impound.transitions).
export const RELEASE_PERMISSIONS = {
  read: "impound:read",
  process: "release:process",
  approve: "release:approve",
  transition: "impound:transition",
} as const;

export function createReleaseRouter(resolveService: ReleaseServiceResolver = createDefaultReleaseService): Router {
  const router = Router();
  const controller = new ReleaseController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Leitura da liberação em curso (impound:read). Paths de 3/4 segmentos — sem colisão com o router de impound
  // (/impound-processes/:id, .../events, .../verify, .../inspection, .../spot, .../notifications) nem de charging
  // (.../charges, .../charges/statement, .../charges/settle).
  router.get(
    "/impound-processes/:processId/release",
    requirePermission(RELEASE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  // Salto A — abrir a liberação + freeze (impound:transition dirige a FSM; o gate é resolvido pelo release.service).
  router.post(
    "/impound-processes/:processId/release/start",
    requirePermission(RELEASE_PERMISSIONS.transition),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.start(request));
    }),
  );
  // Dossiê — quem retira + requisitos (release:process).
  router.post(
    "/impound-processes/:processId/release/recipient",
    requirePermission(RELEASE_PERMISSIONS.process),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.setRecipient(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/release/checks",
    requirePermission(RELEASE_PERMISSIONS.process),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.setRequirement(request));
    }),
  );
  // Ato da autoridade (release:approve).
  router.post(
    "/impound-processes/:processId/release/approve",
    requirePermission(RELEASE_PERMISSIONS.approve),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.approve(request));
    }),
  );
  // Salto B — consumar a liberação (impound:transition).
  router.post(
    "/impound-processes/:processId/release/consume",
    requirePermission(RELEASE_PERMISSIONS.transition),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.consume(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
