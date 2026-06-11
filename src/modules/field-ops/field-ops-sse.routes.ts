import { Router } from "express";

import { getFieldOpsBroadcaster, type FieldOpsBroadcaster } from "../../infra/broadcaster/field-ops.broadcaster.js";
import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import type { Permission } from "../core-saas/permissions/catalog.js";

const FIELD_OPS_SSE_PERMISSIONS = [
  "field_location:read",
  "field_dispatch:read",
  "work_orders:read",
] as const satisfies readonly Permission[];

const EVENT_PERMISSION_MAP: Partial<Record<string, Permission>> = {
  "field_location.updated": "field_location:read",
  "field_dispatch.created": "field_dispatch:read",
  "field_dispatch.status_changed": "field_dispatch:read",
  "field_dispatch.cancelled": "field_dispatch:read",
  "field_dispatch.reassigned": "field_dispatch:read",
  "work_order.status_changed": "work_orders:read",
};

export type FieldOpsSseRouterOptions = {
  readonly heartbeatIntervalMs?: number;
  readonly broadcaster?: FieldOpsBroadcaster;
};

export function createFieldOpsSseRouter(options: FieldOpsSseRouterOptions = {}): Router {
  const router = Router();
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get("/operations/events/stream", (request, response) => {
    const tenantContext = request.tenantContext;

    if (!tenantContext?.tenantId) {
      response.status(403).json({
        error: { code: "FORBIDDEN", reason: "tenant_required", message: "Tenant context is required." },
      });
      return;
    }

    const hasAnyPermission = FIELD_OPS_SSE_PERMISSIONS.some((p) =>
      tenantContext.permissions.includes(p),
    );

    if (!hasAnyPermission) {
      response.status(403).json({
        error: {
          code: "FORBIDDEN",
          reason: "permission_required",
          message: `At least one of these permissions is required: ${FIELD_OPS_SSE_PERMISSIONS.join(", ")}.`,
        },
      });
      return;
    }

    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    const tenantId = tenantContext.tenantId;
    const permissions = [...tenantContext.permissions];

    const heartbeat = setInterval(() => {
      response.write(": heartbeat\n\n");
    }, heartbeatIntervalMs);

    const broadcaster = options.broadcaster ?? getFieldOpsBroadcaster();

    const unsubscribe = broadcaster.subscribe(tenantId, (event) => {
      const requiredPermission = EVENT_PERMISSION_MAP[event.name];
      if (!requiredPermission || !permissions.includes(requiredPermission)) return;

      const data = JSON.stringify(buildSafePayload(event));
      response.write(`event: ${event.name}\ndata: ${data}\n\n`);
    });

    request.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  return router;
}

function buildSafePayload(event: DomainEventEnvelope): Record<string, unknown> {
  const safePayload = stripCoordinates(event.payload as Record<string, unknown>);

  return {
    eventId: event.id,
    eventName: event.name,
    tenantId: event.tenantId,
    actorId: event.actorId,
    correlationId: event.correlationId,
    occurredAt: event.occurredAt,
    payload: safePayload,
  };
}

function stripCoordinates(payload: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (key === "latitude" || key === "longitude" || key === "lat" || key === "lng") continue;
    safe[key] = value;
  }

  return safe;
}
