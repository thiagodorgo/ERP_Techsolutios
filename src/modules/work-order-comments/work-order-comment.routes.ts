import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { UserNameResolver } from "../core-saas/users/user-name-resolver.js";
import { WorkOrderCommentController, type WorkOrderCommentServiceResolver } from "./work-order-comment.controller.js";
import { createDefaultWorkOrderCommentService } from "./work-order-comment.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// Ω3F-5 — Comentários da OS (agregado próprio) + tags do comentário. Router PRÓPRIO (não toca o
// work-orders router), montado em src/app.ts no padrão de work-order-financials. GET = work_orders:read;
// mutações = work_orders:comment (o service ainda exige autor OU work_orders:update para editar/excluir).
export const WORK_ORDER_COMMENT_PERMISSIONS = {
  read: "work_orders:read",
  comment: "work_orders:comment",
} as const;

export function createWorkOrderCommentRouter(
  resolveService: WorkOrderCommentServiceResolver = createDefaultWorkOrderCommentService,
  // Ω3F-5b — resolver de NOME do autor (composto no app.ts a partir do core service): a UI mostra o nome,
  // nunca o UUID (§11.2). Ausente → authorName null (rótulo neutro no front).
  resolveUserName?: UserNameResolver,
): Router {
  const router = Router();
  const controller = new WorkOrderCommentController(resolveService, resolveUserName);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/work-orders/:workOrderId/comments",
    requirePermission(WORK_ORDER_COMMENT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/work-orders/:workOrderId/comments",
    requirePermission(WORK_ORDER_COMMENT_PERMISSIONS.comment),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.patch(
    "/work-orders/:workOrderId/comments/:commentId",
    requirePermission(WORK_ORDER_COMMENT_PERMISSIONS.comment),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.delete(
    "/work-orders/:workOrderId/comments/:commentId",
    requirePermission(WORK_ORDER_COMMENT_PERMISSIONS.comment),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
    }),
  );

  // Tags do comentário (attach/detach). Mesma permissão de escrita de comentário.
  router.post(
    "/work-orders/:workOrderId/comments/:commentId/tags/:tagId",
    requirePermission(WORK_ORDER_COMMENT_PERMISSIONS.comment),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.attachTag(request));
    }),
  );

  router.delete(
    "/work-orders/:workOrderId/comments/:commentId/tags/:tagId",
    requirePermission(WORK_ORDER_COMMENT_PERMISSIONS.comment),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.detachTag(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  if (result.status === 204) {
    response.status(204).send();
    return;
  }
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
