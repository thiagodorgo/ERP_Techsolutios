import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission, requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { fieldOpsRealtimeBroker, type FieldOpsRealtimeEvent } from "./field-ops-realtime.broker.js";

const keepAliveIntervalMs = 25_000;

export function createFieldOpsRealtimeRouter(): Router {
  const router = Router();

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/operations/field-events/stream",
    requirePermission("field_location:read"),
    handleAsyncRoute(async (request, response) => {
      const tenantContext = requireTenantContext(request);
      configureSseResponse(response);
      writeSseEvent(response, "ready", {
        tenantId: tenantContext.tenantId,
        connectedAt: new Date().toISOString(),
      });

      const unsubscribe = fieldOpsRealtimeBroker.subscribe(tenantContext.tenantId, (event) => {
        writeSseEvent(response, "field_ops_event", event);
      });
      const keepAlive = setInterval(() => {
        if (!response.writableEnded) {
          response.write(": keep-alive\n\n");
        }
      }, keepAliveIntervalMs);

      request.on("close", () => {
        clearInterval(keepAlive);
        unsubscribe();
      });
    }),
  );

  return router;
}

function configureSseResponse(response: Response): void {
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();
}

function writeSseEvent(response: Response, eventName: string, data: FieldOpsRealtimeEvent | Record<string, unknown>): void {
  if (response.writableEnded) return;

  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}
