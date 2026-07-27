import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { AuctionController, type AuctionServiceResolver } from "./auction.controller.js";
import { createDefaultAuctionService } from "./auction.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// Ω5P PR-12 (D-Ω5P-AUC-*) — Elegibilidade ao leilão + regra dos 2-strikes (I8). ZERO permissão nova: os 2 endpoints
// de escrita dirigem a FSM (elegibilidade + reclassificação) e REUSAM impound:transition (eixo jurídico já existente);
// a leitura reusa impound:read. O auction.service resolve o gate (6 pré-condições + 2 PISOS) e dispara a transição
// via resolveTransition (guardas PURAS SOMADAS em impound.transitions).
export const AUCTION_PERMISSIONS = {
  read: "impound:read",
  transition: "impound:transition",
} as const;

export function createAuctionRouter(resolveService: AuctionServiceResolver = createDefaultAuctionService): Router {
  const router = Router();
  const controller = new AuctionController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Leitura das tentativas + strikeCount derivado (impound:read). Paths de 3/4 segmentos — sem colisão com o router de
  // impound (.../events, .../verify, .../inspection, .../spot, .../notifications), de charging (.../charges*) nem de
  // release (.../release*).
  router.get(
    "/impound-processes/:processId/auction",
    requirePermission(AUCTION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  // GATE de elegibilidade (impound:transition dirige a FSM; o gate é resolvido pelo auction.service).
  router.post(
    "/impound-processes/:processId/auction/eligibility",
    requirePermission(AUCTION_PERMISSIONS.transition),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.markEligible(request));
    }),
  );
  // Fecho de rodada deserta + regra dos 2-strikes (impound:transition).
  router.post(
    "/impound-processes/:processId/auction/attempts",
    requirePermission(AUCTION_PERMISSIONS.transition),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.recordAttempt(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
