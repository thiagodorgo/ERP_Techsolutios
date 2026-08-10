import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ChecklistController, type ChecklistServiceResolver } from "./checklist.controller.js";
import { CHECKLIST_PERMISSIONS, requireAnyChecklistPermission, requireChecklistPermission } from "./checklist.permissions.js";
import { createDefaultChecklistService } from "./checklist.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
  readonly file?: {
    readonly body: Buffer | NodeJS.ReadableStream;
    readonly fileName: string;
    readonly mimeType: string;
    readonly sizeBytes?: number;
  };
};

export function createChecklistRouter(
  resolveService: ChecklistServiceResolver = createDefaultChecklistService,
): Router {
  const router = Router();
  const controller = new ChecklistController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/tenant/checklist-components",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.readTemplates),
    handleAsyncRoute(async (_request, response) => {
      sendResult(response, await controller.listComponents());
    }),
  );

  router.get(
    "/tenant/checklists",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.readTemplates),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listTenantChecklists(request));
    }),
  );

  router.post(
    "/tenant/checklists",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.createTemplates),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createTenantChecklist(request));
    }),
  );

  router.get(
    "/tenant/checklists/templates",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.readTemplates),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listChecklistTemplates(request));
    }),
  );

  router.get(
    "/tenant/checklists/:checklistId",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.readTemplates),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getTenantChecklist(request));
    }),
  );

  router.patch(
    "/tenant/checklists/:checklistId",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.updateTemplates),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.updateTenantChecklist(request));
    }),
  );

  router.delete(
    "/tenant/checklists/:checklistId",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.updateTemplates),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.deleteTenantChecklist(request));
    }),
  );

  router.post(
    "/tenant/checklists/:checklistId/publish",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.publishTemplates),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.publishTenantChecklist(request));
    }),
  );

  router.get(
    "/mobile/checklists/available",
    requireAnyChecklistPermission([CHECKLIST_PERMISSIONS.readRuns, CHECKLIST_PERMISSIONS.createRuns]),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listAvailableMobileChecklists(request));
    }),
  );

  router.get(
    "/mobile/checklists/:checklistId/render",
    requireAnyChecklistPermission([CHECKLIST_PERMISSIONS.readRuns, CHECKLIST_PERMISSIONS.createRuns]),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.renderMobileChecklist(request));
    }),
  );

  // D-CHK-DISPATCH-CREATE — o guincheiro baixa a(s) run(s) pré-criada(s) da OS despachada (server_run_id) para
  // então responder/concluir/assinar. Gated `checklist_runs:read` (que o field_technician passa a ter no PR-A);
  // tenant-scoped. Declarado ANTES das rotas `/mobile/checklist-runs/:runId/...` (path distinto, sem conflito).
  router.get(
    "/mobile/checklist-runs",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.readRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listRunsForWorkOrder(request));
    }),
  );

  router.post(
    "/mobile/checklist-runs",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.createRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createChecklistRun(request));
    }),
  );

  router.patch(
    "/mobile/checklist-runs/:runId",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.updateRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.updateChecklistRun(request));
    }),
  );

  router.post(
    "/mobile/checklist-runs/:runId/attachments",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.updateRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createChecklistAttachment(request));
    }),
  );

  router.get(
    "/mobile/checklist-runs/:runId/attachments/:attachmentId/download",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.readRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.downloadChecklistAttachment(request));
    }),
  );

  router.post(
    "/mobile/checklist-runs/:runId/markers",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.updateRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createChecklistMarker(request));
    }),
  );

  router.post(
    "/mobile/checklist-runs/:runId/complete",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.completeRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.completeChecklistRun(request));
    }),
  );

  // CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE + D-CHK-P1-REOPEN-RBAC) — reabrir vistoria CONCLUÍDA cria uma
  // NOVA versão vinculada (a original nunca é editada). Gate PRÓPRIO `checklist_runs:reopen`: gestão + admins.
  // Deliberadamente NÃO reusa `checklist_runs:update`, que o campo tem — o guincheiro não destrava a própria
  // assinatura. Continua no namespace /mobile/checklist-runs porque é onde vive TODA a superfície de execução
  // (o console web consome as mesmas rotas); a renomeação do namespace é dívida conhecida, não deste PR.
  router.post(
    "/mobile/checklist-runs/:runId/reopen",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.reopenRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.reopenChecklistRun(request));
    }),
  );

  router.get(
    "/mobile/checklist-runs/:runId/comparison",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.readRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.compareChecklistRun(request));
    }),
  );

  router.post(
    "/mobile/checklist-runs/:runId/divergence",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.updateRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.registerChecklistDivergence(request));
    }),
  );

  router.post(
    "/mobile/checklist-runs/:runId/acknowledgement",
    requireChecklistPermission(CHECKLIST_PERMISSIONS.acknowledgeRuns),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.acknowledgeChecklistRun(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  if (result.file) {
    response.status(result.status ?? 200);
    response.setHeader("Content-Type", result.file.mimeType);
    if (result.file.sizeBytes !== undefined) {
      response.setHeader("Content-Length", result.file.sizeBytes.toString());
    }
    response.setHeader("Content-Disposition", `inline; filename="${escapeHeaderFileName(result.file.fileName)}"`);
    if (Buffer.isBuffer(result.file.body)) {
      response.send(result.file.body);
      return;
    }

    result.file.body.pipe(response);
    return;
  }

  if (result.status === 204) {
    response.status(204).send();
    return;
  }

  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}

function escapeHeaderFileName(fileName: string): string {
  return fileName.replace(/["\\\r\n]/g, "_");
}
