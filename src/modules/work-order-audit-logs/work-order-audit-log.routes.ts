import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { UserNameResolver } from "../core-saas/users/user-name-resolver.js";
import {
  WorkOrderAuditLogController,
  type WorkOrderAuditLogServiceResolver,
} from "./work-order-audit-log.controller.js";
import { createDefaultWorkOrderAuditLogService } from "./work-order-audit-log.service.js";

// Ω3F-8a — Logs da OS (leitura da auditoria). Router PRÓPRIO (não toca o work-orders router), montado no
// app.ts no padrão de work-order-comments. Só leitura: GET exige work_orders:read.
export const WORK_ORDER_AUDIT_LOG_PERMISSIONS = {
  read: "work_orders:read",
} as const;

type ControllerResult = { readonly status?: number; readonly body?: unknown; readonly data?: unknown };

export function createWorkOrderAuditLogRouter(
  resolveService: WorkOrderAuditLogServiceResolver = createDefaultWorkOrderAuditLogService,
  // Resolver de NOME do autor (composto no app.ts): a UI mostra o nome, nunca o UUID (§11.2).
  resolveUserName?: UserNameResolver,
): Router {
  const router = Router();
  const controller = new WorkOrderAuditLogController(resolveService, resolveUserName);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/work-orders/:workOrderId/audit-logs",
    requirePermission(WORK_ORDER_AUDIT_LOG_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
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
