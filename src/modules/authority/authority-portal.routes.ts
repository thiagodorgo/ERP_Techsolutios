import { Router, type Request, type Response } from "express";

import { AuthorityPortalController, type AuthorityPortalServiceResolver } from "./authority-portal.controller.js";
import { createDefaultAuthorityPortalService } from "./authority-portal.runtime.js";

// Ω5P PR-18a — router do authority-portal, montado em /portal/v1/authority pelo portal-app (aditivo; o ownerRouter
// segue intacto). NUNCA sob /api/v1, NUNCA com attachAuthenticatedActor. Só 2 rotas em 18a: PoW + login (a
// solicitar-remoção é 18b). Erro inesperado → 500 GENÉRICO (nunca vaza stack/PII). Wrapper de erro LOCAL (isolamento).
export function createAuthorityPortalRouter(
  resolveService: AuthorityPortalServiceResolver = createDefaultAuthorityPortalService,
): Router {
  const router = Router();
  const controller = new AuthorityPortalController(resolveService);

  router.post(
    "/challenge",
    handle((request) => controller.challenge(request)),
  );
  router.post(
    "/login",
    handle((request) => controller.login(request)),
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
