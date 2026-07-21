import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ProfessionalStatementController, type ProfessionalStatementServiceResolver } from "./professional-statement.controller.js";
import { createDefaultProfessionalStatementService } from "./professional-statement.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// D-Ω4C-EXTRATO-RBAC — permissão NOVA (a folha do profissional é razão distinta da tesouraria do tenant). O
// DELETE (soft = "retirar do extrato") corre sob :update (mutação de estado, padrão do repo — não é remoção física).
export const PROFESSIONAL_STATEMENT_PERMISSIONS = {
  read: "professional_statements:read",
  create: "professional_statements:create",
  update: "professional_statements:update",
} as const;

export function createProfessionalStatementRouter(
  resolveService: ProfessionalStatementServiceResolver = createDefaultProfessionalStatementService,
): Router {
  const router = Router();
  const controller = new ProfessionalStatementController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Extrato de UM profissional (operatorProfileId OBRIGATÓRIO → 400; profissional de outro tenant → 404).
  router.get(
    "/professional-statements",
    requirePermission(PROFESSIONAL_STATEMENT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  // POST cria SÓ AJUSTE manual (D-Ω4C-EXTRATO-CREATE-SCOPE).
  router.post(
    "/professional-statements",
    requirePermission(PROFESSIONAL_STATEMENT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  // Um lançamento (grupo) + suas parcelas.
  router.get(
    "/professional-statements/:groupId",
    requirePermission(PROFESSIONAL_STATEMENT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  // PATCH edita SÓ description; campo financeiro → 409 statement_entry_locked (RN-EXT-01).
  router.patch(
    "/professional-statements/:groupId",
    requirePermission(PROFESSIONAL_STATEMENT_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  // DELETE lógico ("retirar do extrato") sob :update; trava RN-EXT-01 se houver parcela liquidada.
  router.delete(
    "/professional-statements/:groupId",
    requirePermission(PROFESSIONAL_STATEMENT_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
