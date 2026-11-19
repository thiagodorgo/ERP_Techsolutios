import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../../database/rls.js";
import { createLogger } from "../../../infra/logging/logger.js";
import type { DispatchAuditEvent } from "./outbox.dispatcher.js";

const HOUR_MS = 60 * 60 * 1000;
type Key = `${string}:${string}`;

export function createPersistedDispatchAuditSink(prisma: PrismaClient): (event: DispatchAuditEvent) => Promise<void> {
  const logger = createLogger();
  const throttled = new Map<Key, number>();

  return async (event) => {
    try {
      if (event.action === "billing_outbox.invoice_sweep_failed") {
        const key = `${event.tenantId ?? "platform"}:${event.code}` as Key;
        const now = Date.now();
        const last = throttled.get(key) ?? 0;
        if (last > 0 && now - last < HOUR_MS) return; // [TRILHA-THROTTLE]
        throttled.set(key, now);

        if (event.tenantId === null) {
          await prisma.platformAuditLog.create({
            data: {
              actor_user_id: null,
              action: event.action,
              entity: "billing_outbox",
              entity_id: undefined,
              tenant_id: undefined,
              metadata: { kind: "invoice_sweep", code: event.code, count: 1 },
            },
          });
          return;
        }

        const tenantId = event.tenantId;
        await withTenantRls(prisma, tenantId, async (tx) => {
          await tx.auditLog.create({
            data: {
              tenant_id: tenantId,
              actor_user_id: undefined,
              action: event.action,
              entity: "billing_outbox",
              entity_id: undefined,
              metadata: { kind: "invoice_sweep", code: event.code, count: 1 },
            },
          });
        });
        return;
      }

      await withTenantRls(prisma, event.tenantId, async (tx) => {
        await tx.auditLog.create({
          data: {
            tenant_id: event.tenantId,
            actor_user_id: undefined,
            action: event.action,
            entity: "billing_outbox",
            entity_id: event.statementId,
            metadata: { statementId: event.statementId, kind: event.kind, code: event.code },
          },
        });
      });
    } catch {
      logger.warn({ tenantId: event.tenantId, action: event.action, code: event.code }, "billing.dispatch-audit: failed to persist dispatch audit event");
    }
  };
}
