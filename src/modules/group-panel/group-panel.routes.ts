import { Router, type Response } from "express";

import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { GroupPanelController, type GroupPanelServiceResolver } from "./group-panel.controller.js";
import { createDefaultGroupPanelServiceResolver } from "./group-panel.factory.js";

// B-GRUPO-GESTOR (1a) — duas rotas, as duas GET e sem parâmetro. A porta não é uma permissão da organização ativa: é a
// marca de gestor do grupo (Emenda 2 §2.1, passo 0, conferida no serviço); a permissão do Financeiro é conferida pátio a
// pátio. Os demais métodos nas duas rotas caem no 404 de rota inexistente (RO-2).
export const GROUP_PANEL_SCOPE_PATH = "/group-panel/scope";
export const GROUP_PANEL_SUMMARY_PATH = "/group-panel/summary";

type ControllerResult = { readonly data: unknown };

export function createGroupPanelRouter(
  core: ICoreSaasService,
  resolveService: GroupPanelServiceResolver = createDefaultGroupPanelServiceResolver(core),
): Router {
  const router = Router();
  const controller = new GroupPanelController(resolveService);

  // Montado sob o prefixo largo /api/v1: o middleware fica restrito a /group-panel para não interceptar rotas irmãs.
  router.use("/group-panel", tenantContextMiddleware);

  router.get(
    GROUP_PANEL_SCOPE_PATH,
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.scope(request));
    }),
  );

  router.get(
    GROUP_PANEL_SUMMARY_PATH,
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.summary(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(200).json({ data: result.data });
}
