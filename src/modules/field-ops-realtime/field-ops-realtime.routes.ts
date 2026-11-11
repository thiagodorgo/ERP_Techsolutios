import { Router, type Response } from "express";

import { sessionLiveness } from "../auth/services/session-liveness.service.js";
import type { AuthenticatedActor } from "../auth/types/auth.types.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission, requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { fieldOpsRealtimeBroker, type FieldOpsRealtimeEvent } from "./field-ops-realtime.broker.js";

const keepAliveIntervalMs = 25_000;
// B-USERS-SEG-DESATIVADO (Emenda 1, A1) — falhas SEGUIDAS da conferência da sessão que encerram o stream (50 s).
const SSE_LIVENESS_MAX_FAILURES = 2;

export function createFieldOpsRealtimeRouter(): Router {
  const router = Router();

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/operations/field-events/health",
    requirePermission("field_location:read"),
    handleAsyncRoute(async (request, response) => {
      const tenantContext = requireTenantContext(request);

      response.status(200).json({
        data: {
          status: "ok",
          transport: "sse",
          tenantScoped: true,
          activeSubscribers: fieldOpsRealtimeBroker.subscriberCount(tenantContext.tenantId),
          keepAliveIntervalMs,
          timestamp: new Date().toISOString(),
        },
      });
    }),
  );

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
      // B-USERS-SEG-DESATIVADO (P-SESSAO-VIVA; Emenda 1, A1) — o portão confere a sessão só na abertura; a cada
      // tique do keep-alive o stream a confere de novo. Sessão encerrada ou usuário desativado: `event:
      // session_inactive` e fim. Falha da conferência: 1 falha mantém o stream; 2 seguidas (50 s) encerram com
      // `event: session_check_unavailable`. Nenhuma falha escapa como rejeição sem tratamento (o processo da API não
      // cai), e com uma conferência pendente o tique não chama outra. O ator de cabeçalho legado (só dev e teste) não
      // é conferido. O vencimento do token NÃO encerra o stream (R7 do plano).
      const actor = request.actor;
      let livenessInFlight = false;
      let livenessFailures = 0;
      const runLivenessTick = async (current: AuthenticatedActor): Promise<void> => {
        try {
          const verdict = await sessionLiveness.check({
            userId: current.userId,
            tenantId: current.tenantId,
            ...(current.sessionId ? { sessionId: current.sessionId } : {}),
          });
          livenessFailures = 0;
          if (verdict === "inactive") {
            endSseStream(response, "session_inactive");
          }
        } catch {
          livenessFailures += 1;
          if (livenessFailures >= SSE_LIVENESS_MAX_FAILURES) {
            endSseStream(response, "session_check_unavailable");
          }
        } finally {
          livenessInFlight = false;
        }
      };
      const keepAlive = setInterval(() => {
        if (!response.writableEnded) {
          response.write(": keep-alive\n\n");
        }
        if (!actor || livenessInFlight || response.writableEnded) {
          return;
        }
        livenessInFlight = true;
        void runLivenessTick(actor);
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

// Último evento do stream, com corpo vazio, e o fim da resposta (o `close` da requisição limpa o intervalo e a
// assinatura).
function endSseStream(response: Response, eventName: "session_inactive" | "session_check_unavailable"): void {
  if (response.writableEnded) return;

  writeSseEvent(response, eventName, {});
  response.end();
}

function writeSseEvent(response: Response, eventName: string, data: FieldOpsRealtimeEvent | Record<string, unknown>): void {
  if (response.writableEnded) return;

  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}
