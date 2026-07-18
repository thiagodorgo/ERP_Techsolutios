import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ChequeController, type ChequeServiceResolver } from "./cheque.controller.js";
import { FINANCIAL_WRITE_PERMISSION, createDefaultChequeService } from "./cheque.service.js";

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

// O gate financeiro forte (financial_entries:create) protege quem MOVE caixa. FINANCIAL_WRITE_PERMISSION vem do
// serviço (fonte única). /clear SEMPRE move caixa → gate na rota. /bounce é POLIMÓRFICO (deposited→bounced NÃO
// move caixa; cleared→bounced move) → a rota exige só cheques:update e o SERVIÇO aplica assertCanMoveMoney com
// precisão só no caminho que posta (evita over-block do deposited→bounced; condição BAIXA da junta).

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

  // /bounce polimórfico: só cheques:update na rota; o serviço aplica assertCanMoveMoney (403) só quando
  // cleared→bounced posta caixa. deposited→bounced (sem caixa) fica acessível a cheques:update.
  router.post(
    "/cheques/:chequeId/bounce",
    requirePermission(CHEQUE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.bounce(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
