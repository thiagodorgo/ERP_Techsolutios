import { Router, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requireAnyPermission, requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { DamageController, type DamageServiceResolver } from "./damage.controller.js";
import { createDefaultDamageService } from "./damage.service.js";

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

export const DAMAGE_PERMISSIONS = {
  read: "damages:read",
  create: "damages:create",
  update: "damages:update",
} as const satisfies Record<string, Permission>;

export function createDamageRouter(
  coreService: ICoreSaasService,
  resolveService: DamageServiceResolver = () => createDefaultDamageService(coreService),
): Router {
  const router = Router();
  const controller = new DamageController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/damages",
    requirePermission(DAMAGE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/damages",
    requirePermission(DAMAGE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/damages/:damageId",
    requirePermission(DAMAGE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/damages/:damageId",
    requirePermission(DAMAGE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.get(
    "/damages/:damageId/attachments",
    requirePermission(DAMAGE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listAttachments(request));
    }),
  );

  // Uploading a photo requires the ability to register OR treat a damage.
  router.post(
    "/damages/:damageId/attachments",
    requireAnyPermission([DAMAGE_PERMISSIONS.create, DAMAGE_PERMISSIONS.update]),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createAttachment(request));
    }),
  );

  router.get(
    "/damages/:damageId/attachments/:attachmentId/download",
    requirePermission(DAMAGE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.downloadAttachment(request));
    }),
  );

  router.delete(
    "/damages/:damageId/attachments/:attachmentId",
    requirePermission(DAMAGE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.deleteAttachment(request));
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
