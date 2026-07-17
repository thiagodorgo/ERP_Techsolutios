import type { Readable } from "node:stream";

import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requireAnyPermission, requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ApprovalController } from "./approval.controller.js";
import { WorkOrderController, type WorkOrderServiceResolver } from "./work-order.controller.js";
import { createDefaultWorkOrderService } from "./work-order.service.js";
import type { UserNameResolver } from "../core-saas/users/user-name-resolver.js";
import { WorkOrderAttachmentController } from "./work-order-attachment.controller.js";
import { createDefaultWorkOrderAttachmentService } from "./work-order-attachment.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
  readonly file?: {
    readonly body: Buffer | Readable;
    readonly fileName: string;
    readonly mimeType: string;
    readonly sizeBytes?: number;
  };
};

export const WORK_ORDER_PERMISSIONS = {
  read: "work_orders:read",
  create: "work_orders:create",
  update: "work_orders:update",
  assign: "work_orders:assign",
  status: "work_orders:status",
  cancel: "work_orders:cancel",
  delete: "work_orders:delete",
  comment: "work_orders:comment",
  mileageCorrect: "work_orders:mileage_correct",
} as const;

export function createWorkOrderRouter(
  resolveService: WorkOrderServiceResolver = createDefaultWorkOrderService,
  // Ω3F-5b — resolver de NOME (composto no app.ts): a aba Arquivos mostra "Enviado por" com o nome do
  // usuário, nunca o UUID (§11.2). Ausente → uploadedByName null (rótulo neutro no front).
  resolveUserName?: UserNameResolver,
): Router {
  const router = Router();
  const controller = new WorkOrderController(resolveService);
  const approvalController = new ApprovalController();
  const attachmentController = new WorkOrderAttachmentController(createDefaultWorkOrderAttachmentService, resolveUserName);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/approvals/pending",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await approvalController.listPending(request));
    }),
  );

  router.get(
    "/approvals/:approvalId",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await approvalController.get(request));
    }),
  );

  router.post(
    "/approvals/:approvalId/approve",
    requirePermission(WORK_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await approvalController.approve(request));
    }),
  );

  router.post(
    "/approvals/:approvalId/reject",
    requirePermission(WORK_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await approvalController.reject(request));
    }),
  );

  router.get(
    "/work-orders",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/work-orders",
    requirePermission(WORK_ORDER_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/work-orders/:workOrderId",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/work-orders/:workOrderId",
    requirePermission(WORK_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.patch(
    "/work-orders/:workOrderId/status",
    requirePermission(WORK_ORDER_PERMISSIONS.status),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.changeStatus(request));
    }),
  );

  // Ω3F-7a (correção J-Ω3F-7A) — a BASE corrige a quilometragem (km) da OS. O app preenche pela fila
  // offline (POST /mobile/sync/work-order-actions, ação work_order.mileage, perm work_orders:status). A
  // correção do escritório exige a permissão DEDICADA `work_orders:mileage_correct` — NÃO `work_orders:update`
  // (que field_technician/technician/operator TÊM: gatear por :update deixaria o técnico de campo forjar
  // source='base', anulando a proveniência app×base que é a razão da feature). mileage_correct é dado só à
  // base/escritório (manager, operator=despacho web, tenant_admin, super/platform admin); campo NÃO corrige.
  router.patch(
    "/work-orders/:workOrderId/mileage",
    requirePermission(WORK_ORDER_PERMISSIONS.mileageCorrect),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.setMileage(request));
    }),
  );

  // Ω3F-6a (D-Ω3F-6-CANCEL) — cancelar com decisão financeira. Primeira rota a CONSUMIR
  // work_orders:cancel: cancelar decide o destino do dinheiro e por isso NÃO é `work_orders:status`
  // (que operator/técnico têm). Papéis com :cancel hoje: super_admin, platform_admin, tenant_admin, manager.
  // ATENÇÃO (J-Ω3F-6A): este NÃO é o único caminho de cancelamento — o PATCH /status legado (usado também
  // pela fila offline do mobile) ainda cancela, agora exigindo :cancel (o service barra 403 sem ela), porém
  // SEM gravar decisão financeira → `financial_cancellation_decision` fica NULL. Dívida em
  // P-Ω3F6-STATUS-BYPASS: fechar/redirecionar o cancelamento legado antes de Ω4/comissões. Não afirme que
  // este gate é a única porta enquanto isso não for feito.
  router.post(
    "/work-orders/:workOrderId/cancel",
    requirePermission(WORK_ORDER_PERMISSIONS.cancel),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.cancel(request));
    }),
  );

  // Ω3F-6a (D-Ω3F-6-DUPLICATE) — duplicar: o resultado é uma OS NOVA, então a permissão é a de criar.
  router.post(
    "/work-orders/:workOrderId/duplicate",
    requirePermission(WORK_ORDER_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.duplicate(request));
    }),
  );

  router.post(
    "/work-orders/:workOrderId/assign",
    requirePermission(WORK_ORDER_PERMISSIONS.assign),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.assign(request));
    }),
  );

  router.get(
    "/work-orders/:workOrderId/timeline",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.timeline(request));
    }),
  );

  // Ω3F-5 (D-Ω3F-5-COMMENT) — os comentários da OS saíram deste router: viraram AGREGADO PRÓPRIO
  // (`/work-orders/:id/comments`), servido por createWorkOrderCommentRouter (montado em src/app.ts).

  // Ω3-d — Anexos de OS (reuso do storage de checklist + AV-scan). Upload = create OU update (fiel a
  // Danos, inclui field_dispatcher). Download stream server-side (sem presigned). Delete lógico.
  router.get(
    "/work-orders/:workOrderId/attachments",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await attachmentController.listAttachments(request));
    }),
  );
  router.post(
    "/work-orders/:workOrderId/attachments",
    requireAnyPermission([WORK_ORDER_PERMISSIONS.create, WORK_ORDER_PERMISSIONS.update]),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await attachmentController.createAttachment(request));
    }),
  );
  router.get(
    "/work-orders/:workOrderId/attachments/:attachmentId/download",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await attachmentController.downloadAttachment(request));
    }),
  );
  router.delete(
    "/work-orders/:workOrderId/attachments/:attachmentId",
    requirePermission(WORK_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await attachmentController.deleteAttachment(request));
    }),
  );

  // Ω1b-2 — geocodificação sob demanda (gated OFF por env; backend é a autoridade de permissão).
  router.post(
    "/work-orders/:workOrderId/geocode",
    requirePermission(WORK_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.geocode(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  // Ω3-d — stream de arquivo (download de anexo): sem presigned, servidor entrega o binário.
  if (result.file) {
    response.status(result.status ?? 200);
    response.setHeader("Content-Type", result.file.mimeType);
    if (result.file.sizeBytes !== undefined) {
      response.setHeader("Content-Length", result.file.sizeBytes.toString());
    }
    response.setHeader("Content-Disposition", `inline; filename="${result.file.fileName.replace(/["\\\r\n]/g, "_")}"`);
    if (Buffer.isBuffer(result.file.body)) {
      response.send(result.file.body);
    } else {
      result.file.body.pipe(response);
    }
    return;
  }
  if (result.status === 204) {
    response.status(204).send();
    return;
  }
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
