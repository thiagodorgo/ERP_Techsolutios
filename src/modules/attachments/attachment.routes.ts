import type { Readable } from "node:stream";

import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { sendVerifiedFile } from "../evidence/serve-verified-file.js";
import type { UserNameResolver } from "../core-saas/users/user-name-resolver.js";
import { AttachmentController, type AttachmentServiceResolver } from "./attachment.controller.js";
import { createDefaultAttachmentService } from "./attachment.service.js";

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

/**
 * Ω4C PR-01 — router de anexos genéricos POLIMÓRFICOS. SEM requirePermission estático: a permissão é
 * HERDADA da entidade-alvo e resolvida NO SERVICE (D-Ω4C-ANEXOS-RBAC) — o backend é a autoridade.
 * Endpoints: GET /attachments?entityType&entityId · POST /attachments (multipart) ·
 * GET /attachments/:attachmentId/download (só status=stored) · DELETE /attachments/:attachmentId (soft).
 */
export function createAttachmentsRouter(
  resolveService: AttachmentServiceResolver = createDefaultAttachmentService,
  resolveUserName?: UserNameResolver,
): Router {
  const router = Router();
  const controller = new AttachmentController(resolveService, resolveUserName);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/attachments",
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listAttachments(request));
    }),
  );

  router.post(
    "/attachments",
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createAttachment(request));
    }),
  );

  router.get(
    "/attachments/:attachmentId/download",
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.downloadAttachment(request));
    }),
  );

  router.delete(
    "/attachments/:attachmentId",
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.deleteAttachment(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  // Stream de arquivo (download): sem presigned, o servidor entrega o binário.
  // B-O6R-07b (Ω6R-SEC-004) — EGRESSO ENDURECIDO. Antes: `Content-Type` do que a LINHA dizia (isto é,
  // o que o cliente declarou no upload) + `Content-Disposition: inline`. Agora o tipo é re-derivado dos
  // BYTES no ato do download, e todo arquivo sai como `attachment` — ver serve-verified-file.ts.
  if (result.file) {
    response.status(result.status ?? 200);
    void sendVerifiedFile(response, result.file);
    return;
  }
  if (result.status === 204) {
    response.status(204).send();
    return;
  }
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
