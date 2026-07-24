import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import {
  createDefaultTelemetryService,
  type TelemetryIngestSummary,
  type TelemetryService,
} from "../telemetry/telemetry.service.js";

// Ω4C PR-12 — ingestão de telemetria pela fila do app (espelha mobile-work-order-sync.ts). REUSA a permissão
// `field_location:send` (envio de localização própria do mobile) — o CONSENT-GATE (no serviço) é o controle
// real, não uma permissão nova (D-Ω4C-TELE-PERM). tenant_id/operator_profile são resolvidos pelo ATOR.
export async function syncMobileTelemetry(
  request: Request,
  resolveService: () => Promise<TelemetryService> = createDefaultTelemetryService,
): Promise<TelemetryIngestSummary> {
  const actor = request.tenantContext;
  assertTelemetryActor(actor);

  const service = await resolveService();
  const summary = await service.ingestBatch(actor, request.body ?? {});

  // §2.8 (D-Ω4C-TELE-2.8) — auditoria SÓ com contagens agregadas: NUNCA lat/lng, battery, device, sdk_int,
  // tracking_consent, client_action_id nem tenant_id externo. Tenant resolvido pelo ator autenticado.
  await recordRequestAuditBestEffort(request, {
    action: "telemetry.ingested",
    resourceType: "telemetry_batch",
    resourceId: actor.userId,
    outcome: "success",
    severity: "info",
    metadata: {
      received: summary.summary.received,
      accepted: summary.summary.accepted,
      rejected: summary.summary.rejected,
      alreadyApplied: summary.summary.already_applied,
    },
  });

  return summary;
}

function assertTelemetryActor(actor: AuthenticatedActor | undefined): asserts actor is AuthenticatedActor {
  if (!actor?.tenantId) {
    throw routeError(403, "FORBIDDEN", "tenant_required", "Tenant context is required.");
  }
  if (!actor.userId || actor.userId === "anonymous") {
    throw routeError(403, "FORBIDDEN", "user_required", "User context is required.");
  }
  if (actor.roles.length === 0) {
    throw routeError(403, "FORBIDDEN", "role_required", "Role is required.");
  }
  if (!actor.permissions.includes("field_location:send")) {
    throw routeError(403, "FORBIDDEN", "permission_required", "Permission field_location:send is required.");
  }
}

function routeError(statusCode: number, code: string, reason: string, message: string) {
  return { statusCode, code, reason, message };
}
