import { Router, type Request, type Response } from "express";

import {
  AuthorityPortalController,
  type AuthorityPortalServiceResolver,
  type AuthorityRemovalServiceResolver,
} from "./authority-portal.controller.js";
import { createDefaultAuthorityPortalService } from "./authority-portal.runtime.js";
import { createDefaultAuthorityRemovalService } from "./authority-removal.runtime.js";

// Ω5P PR-18a/b — router do authority-portal, montado em /portal/v1/authority pelo portal-app (aditivo; o ownerRouter
// segue intacto). NUNCA sob /api/v1, NUNCA com attachAuthenticatedActor. Rotas: PoW + login (18a) + solicitar
// remoção (18b). Erro inesperado → 500 GENÉRICO (nunca vaza stack/PII). Wrapper de erro LOCAL (isolamento).
export function createAuthorityPortalRouter(
  resolveService: AuthorityPortalServiceResolver = createDefaultAuthorityPortalService,
  resolveRemovalService: AuthorityRemovalServiceResolver = createDefaultAuthorityRemovalService,
): Router {
  const router = Router();
  const controller = new AuthorityPortalController(resolveService, resolveRemovalService);

  router.post(
    "/challenge",
    handle((request) => controller.challenge(request)),
  );
  router.post(
    "/login",
    handle((request) => controller.login(request)),
  );
  // Ω5P PR-18b — solicitar remoção → origina WorkOrder(open) → (na conclusão) custódia. Bearer JWE obrigatório.
  router.post(
    "/removals",
    handle((request) => controller.requestRemoval(request)),
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
