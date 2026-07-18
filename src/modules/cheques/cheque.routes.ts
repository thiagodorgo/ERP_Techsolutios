import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ChequeController, type ChequeServiceResolver } from "./cheque.controller.js";
import { createDefaultChequeService } from "./cheque.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const CHEQUE_PERMISSIONS = {
  read: "cheques:read",
  create: "cheques:create",
  update: "cheques:update",
} as const;

// Transições que MOVEM DINHEIRO (compensar/devolver-após-compensar) exigem, ALÉM de cheques:update, a
// permissão financeira forte financial_entries:create — a mesma que o POST /financial-entries exige. Fecha a
// escalada de privilégio (achado ALTA): a chamada service→service a entryService.create não reatravessa a
// rota de lançamentos, então o gate de dinheiro é declarado AQUI (cadeia de dois requirePermission).
const FINANCIAL_WRITE_PERMISSION = "financial_entries:create" as const;

export function createChequeRouter(resolveService: ChequeServiceResolver = createDefaultChequeService): Router {
  const router = Router();
  const controller = new ChequeController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/cheques",
    requirePermission(CHEQUE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/cheques",
    requirePermission(CHEQUE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/cheques/:chequeId",
    requirePermission(CHEQUE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/cheques/:chequeId",
    requirePermission(CHEQUE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  // DELETE lógico usa a permissão de update (mutação de estado via deleted_at, não remoção física).
  router.delete(
    "/cheques/:chequeId",
    requirePermission(CHEQUE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
    }),
  );

  // DEPOSITAR / CANCELAR — mudam estado, NÃO movem caixa → só cheques:update.
  router.post(
    "/cheques/:chequeId/deposit",
    requirePermission(CHEQUE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.deposit(request));
    }),
  );

  router.post(
    "/cheques/:chequeId/cancel",
    requirePermission(CHEQUE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.cancel(request));
    }),
  );

  // COMPENSAR / DEVOLVER — MOVEM caixa → cheques:update E financial_entries:create (gate financeiro forte).
  router.post(
    "/cheques/:chequeId/clear",
    requirePermission(CHEQUE_PERMISSIONS.update),
    requirePermission(FINANCIAL_WRITE_PERMISSION),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.clear(request));
    }),
  );

  router.post(
    "/cheques/:chequeId/bounce",
    requirePermission(CHEQUE_PERMISSIONS.update),
    requirePermission(FINANCIAL_WRITE_PERMISSION),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.bounce(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
