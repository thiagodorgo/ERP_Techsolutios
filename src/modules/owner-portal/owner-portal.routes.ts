import { Router, type Request, type Response } from "express";

import { OwnerPortalController, type ControllerResult, type OwnerPortalServiceResolver } from "./owner-portal.controller.js";
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
  // Ω5P PR-17 — rotas AUTORIZADAS POR SESSÃO (Authorization: Bearer <jwe>). O processId vem da sessão, nunca do
  // corpo/query. GET dossiê detalhado + POST intenção de liberação. Mesmo isolamento (sem /api/v1, sem RBAC do ERP).
  router.get(
    "/dossier",
    handle((request) => controller.dossier(request)),
  );
  // Ω5P PR-17b (D1, OBRIGATÓRIO) — foto MINIMIZADA. Vive SÓ neste router (owner-portal, isolado, montado em
  // /portal/v1/owner pelo portal-app). NUNCA sob /api/v1, NUNCA com attachAuthenticatedActor (o RBAC/sessão do
  // ERP é uma superfície DIFERENTE — o owner-portal usa SÓ a sessão JWE própria, resolveOwnerSession).
  router.get(
    "/photos/:opaqueRef",
    handle((request) => controller.photo(request)),
  );
  router.post(
    "/release-request",
    handle((request) => controller.releaseRequest(request)),
  );

  return router;
}

function handle(
  fn: (request: Request) => Promise<ControllerResult>,
): (request: Request, response: Response) => void {
  return (request, response) => {
    fn(request)
      .then((result) => {
        // Ω5P PR-17b — resposta BINÁRIA (foto) quando `contentType` vem preenchido; todas as demais rotas
        // continuam JSON (default). Nunca ambos no mesmo resultado.
        if (result.contentType) {
          response.status(result.status).type(result.contentType).send(result.body as Buffer);
          return;
        }
        response.status(result.status).json(result.body);
      })
      .catch(() => {
        response.status(500).json({ error: { code: "PORTAL_ERROR", message: "Não foi possível processar a solicitação." } });
      });
  };
}
