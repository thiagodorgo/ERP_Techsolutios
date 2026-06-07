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
  if (result.status === 204) {
    response.status(204).send();
    return;
  }

  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
