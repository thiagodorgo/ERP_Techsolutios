import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../../database/rls.js";
import { createLogger } from "../../../infra/logging/logger.js";
import type { DispatchAuditEvent } from "./outbox.dispatcher.js";

const HOUR_MS = 60 * 60 * 1000;
type Key = `${string}:${string}`;

/** A-8 (plano §4.6, "por processo"): o estado do anti-avalanche vive no MÓDULO, não no sink. O job monta um runtime (e um sink)
 * novo a cada rodada; com o mapa dentro do sink, o throttle zerava a cada tick e não segurava nada em produção. */
const PROCESS_THROTTLE = new Map<Key, number>();

export function createPersistedDispatchAuditSink(
  prisma: PrismaClient,
  options: { readonly throttle?: Map<Key, number> } = {},
): (event: DispatchAuditEvent) => Promise<void> {
  const logger = createLogger();
  const throttled = options.throttle ?? PROCESS_THROTTLE;

  return async (event) => {
    try {
      if (event.action === "billing_outbox.invoice_sweep_failed") {
        const key = `${event.tenantId ?? "platform"}:${event.code}` as Key;
        const now = Date.now();
        const last = throttled.get(key) ?? 0;
        if (last > 0 && now - last < HOUR_MS) return; // [TRILHA-THROTTLE]
        // Conserto da junta do #608 (C2-N8): a chave só é marcada DEPOIS da gravação com sucesso. Marcada antes, uma gravação
        // que falha (o `catch` abaixo só registra no log) silenciava a mesma (organização, código) por 1 h. [THROTTLE-APOS-GRAVAR]

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
          throttled.set(key, now);
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
        throttled.set(key, now);
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
