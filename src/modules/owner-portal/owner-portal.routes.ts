import { Router, type Request, type Response } from "express";

import { OwnerPortalController, type OwnerPortalServiceResolver } from "./owner-portal.controller.js";
import { createDefaultOwnerPortalService } from "./owner-portal.runtime.js";

// Ω5P PR-16 — router do owner-portal, montado em /portal/v1/owner pelo portal-app (D-Ω5P-PORTAL-01). NUNCA sob
// /api/v1, NUNCA com attachAuthenticatedActor. Só 2 rotas: PoW + consulta. Erro inesperado → 500 GENÉRICO (nunca
// vaza stack/PII). Wrapper de erro LOCAL (não importa o middleware do core → isolamento).
export function createOwnerPortalRouter(
  resolveService: OwnerPortalServiceResolver = createDefaultOwnerPortalService,
): Router {
  const router = Router();
  const controller = new OwnerPortalController(resolveService);

  router.post(
    "/challenge",
    handle((request) => controller.challenge(request)),
  );
  router.post(
    "/lookup",
    handle((request) => controller.lookup(request)),
  );

  return router;
}

function handle(
  fn: (request: Request) => Promise<{ status: number; body: unknown }>,
): (request: Request, response: Response) => void {
  return (request, response) => {
    fn(request)
      .then((result) => {
        response.status(result.status).json(result.body);
      })
      .catch(() => {
        response.status(500).json({ error: { code: "PORTAL_ERROR", message: "Não foi possível processar a solicitação." } });
      });
  };
}
