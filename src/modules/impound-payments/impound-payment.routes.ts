import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ImpoundPaymentController, type ImpoundPaymentServiceResolver } from "./impound-payment.controller.js";
import { createDefaultImpoundPaymentService } from "./impound-payment.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
};

// B-PATIO-REC-01 (v3 §6.1) — cobrança on-line da taxa de pátio. Montado como o charge.routes.ts.
// charging:online_payment = gerar a cobrança (mesma distribuição de charging:settle: gestão + admins; nunca operator).
// impound:read           = ler a cobrança viva e o histórico do processo (leitura da custódia).
// Cancelar, devolver, classificar e as demais ações nascem no REC-02a/REC-02b. Paths de 3 segmentos sem colisão com o
// impound (/events, /verify, /spot, …), o charging (/charges…) nem o release (/release…).
export const IMPOUND_PAYMENT_PERMISSIONS = {
  read: "impound:read",
  create: "charging:online_payment",
} as const;

export function createImpoundPaymentRouter(resolveService: ImpoundPaymentServiceResolver = createDefaultImpoundPaymentService): Router {
  const router = Router();
  const controller = new ImpoundPaymentController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/impound-processes/:processId/online-payment",
    requirePermission(IMPOUND_PAYMENT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getLive(request));
    }),
  );
  router.get(
    "/impound-processes/:processId/online-payments",
    requirePermission(IMPOUND_PAYMENT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/online-payment",
    requirePermission(IMPOUND_PAYMENT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? {});
}
