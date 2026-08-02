import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ImpoundController, type ImpoundServiceResolver } from "./impound.controller.js";
import { createDefaultImpoundService } from "./impound.service.js";
import { NotificationController, type NotificationServiceResolver } from "./impound.notifications.controller.js";
import { createDefaultNotificationService } from "./impound.notifications.service.js";
import { ImpoundChecklistLinkController, type ImpoundChecklistLinkServiceResolver } from "./impound.checklist-link.controller.js";
import { createDefaultImpoundChecklistLinkService } from "./impound.checklist-link.service.js";
import { ImpoundCustodyHistoryController, type ImpoundCustodyHistoryServiceResolver } from "./impound.custody-history.controller.js";
import { createDefaultImpoundCustodyHistoryService } from "./impound.custody-history.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// D-Ω5P-IMP-05 — impound:transition é permissão PRÓPRIA (≠ update): dirigir a FSM é ato de peso jurídico/
// probatório (muda o estado de custódia, gera evento imutável), distinto de corrigir metadado do veículo. Os PRs
// futuros SOMAM portões por-transição (aprovação da autoridade na liberação PR-10, leilão PR-12). assignSpot/
// recepção/vistoria/transferência = superfície HTTP de PR-06.
// PR-06 (D-Ω5P-REC-06) — 2 permissões NOVAS: impound:inspect (vistoria de recepção — operador de recepção) e
// impound:allocate (allocate/vacate/move de vaga — operador de pátio). impound:transition/:read REUSADAS.
// PR-09 (D-Ω5P-NOTIF-03) — impound:notify é EIXO PRÓPRIO: registrar a EMISSÃO efetiva (DUE→ISSUED) e a DISPENSA
// (WAIVED) de notificações legais é ato jurídico/probatório (≠ editar metadado). A DUE-marking é do SISTEMA (job),
// sem ponta HTTP. Distribuição espelha impound:transition/inspect (gestão+admins).
export const IMPOUND_PERMISSIONS = {
  read: "impound:read",
  create: "impound:create",
  update: "impound:update",
  transition: "impound:transition",
  inspect: "impound:inspect",
  allocate: "impound:allocate",
  notify: "impound:notify",
} as const;

export function createImpoundRouter(
  resolveService: ImpoundServiceResolver = createDefaultImpoundService,
  resolveNotificationService: NotificationServiceResolver = createDefaultNotificationService,
  resolveChecklistLinkService: ImpoundChecklistLinkServiceResolver = createDefaultImpoundChecklistLinkService,
  resolveCustodyHistoryService: ImpoundCustodyHistoryServiceResolver = createDefaultImpoundCustodyHistoryService,
): Router {
  const router = Router();
  const controller = new ImpoundController(resolveService);
  const notificationController = new NotificationController(resolveNotificationService);
  const checklistLinkController = new ImpoundChecklistLinkController(resolveChecklistLinkService);
  const custodyHistoryController = new ImpoundCustodyHistoryController(resolveCustodyHistoryService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Processos de custódia
  router.get(
    "/impound-processes",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/impound-processes",
    requirePermission(IMPOUND_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );
  router.get(
    "/impound-processes/:processId",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  router.patch(
    "/impound-processes/:processId",
    requirePermission(IMPOUND_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );
  // Timeline de eventos (read-only, append-only na origem). Paths de 3 segmentos — sem colisão com :processId.
  router.get(
    "/impound-processes/:processId/events",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listEvents(request));
    }),
  );
  // Verificação da cadeia de hash (I2) — detecta adulteração.
  router.get(
    "/impound-processes/:processId/verify",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.verify(request));
    }),
  );
  // Transição de estado (FSM §4.2) — permissão dedicada.
  router.post(
    "/impound-processes/:processId/transitions",
    requirePermission(IMPOUND_PERMISSIONS.transition),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.transition(request));
    }),
  );

  // ── Vistoria de recepção (I3) — impound:inspect ─────────────────────────────────────────────────────────
  router.get(
    "/impound-processes/:processId/inspection",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getInspection(request));
    }),
  );
  router.put(
    "/impound-processes/:processId/inspection",
    requirePermission(IMPOUND_PERMISSIONS.inspect),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.saveInspection(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/inspection/photos",
    requirePermission(IMPOUND_PERMISSIONS.inspect),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.addInspectionPhoto(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/inspection/complete",
    requirePermission(IMPOUND_PERMISSIONS.inspect),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.completeInspection(request));
    }),
  );

  // ── Ocupação atômica da vaga (I1) — impound:allocate ────────────────────────────────────────────────────
  router.post(
    "/impound-processes/:processId/spot",
    requirePermission(IMPOUND_PERMISSIONS.allocate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.assignSpot(request));
    }),
  );
  router.delete(
    "/impound-processes/:processId/spot",
    requirePermission(IMPOUND_PERMISSIONS.allocate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.vacateSpot(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/spot/move",
    requirePermission(IMPOUND_PERMISSIONS.allocate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.moveSpot(request));
    }),
  );

  // ── PR-09: trilha de notificações legais (I6) ───────────────────────────────────────────────────────────────
  // Leitura da trilha sob impound:read (distribuição ampla, = charging:read cobrindo o ledger). A EMISSÃO/DISPENSA
  // sob impound:notify (ato probatório). SEM POST de criação manual (o marco DEVIDO é do SISTEMA — job). Paths de
  // 3/5 segmentos — sem colisão com :processId, .../events, .../verify, .../inspection, .../spot, .../charges.
  router.get(
    "/impound-processes/:processId/notifications",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await notificationController.list(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/notifications/:notificationId/issue",
    requirePermission(IMPOUND_PERMISSIONS.notify),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await notificationController.issue(request));
    }),
  );
  router.post(
    "/impound-processes/:processId/notifications/:notificationId/waive",
    requirePermission(IMPOUND_PERMISSIONS.notify),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await notificationController.waive(request));
    }),
  );

  // ── Ω-VID PR-04 (§Parte D): vínculo dossiê↔checklist do guincho ─────────────────────────────────────────────
  // link-checklist-run: impound:update REUSADA (decisão da junta de arquitetura — ação reversível/aditiva,
  // diferente do merge de identidade). checklist-runs: guarda DUPLA impound:read + checklist_runs:read (achado
  // da junta: field_technician tem a 1ª sem a 2ª — reusar só impound:read vazaria dado hoje escondido dele).
  // requirePermission encadeados = AND (o Express só chama o próximo se o anterior chamar next()).
  router.post(
    "/impound-processes/:processId/link-checklist-run",
    requirePermission(IMPOUND_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await checklistLinkController.link(request));
    }),
  );
  router.get(
    "/impound-processes/:processId/checklist-runs",
    requirePermission(IMPOUND_PERMISSIONS.read),
    requirePermission("checklist_runs:read"),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await checklistLinkController.listChecklistRuns(request));
    }),
  );

  // ── Ω-VID PR-09: Histórico de Custódias ─────────────────────────────────────────────────────────────────────
  // Os outros processos de custódia do MESMO veículo (identidade). Gate impound:read (mesma do dossiê — resumo
  // estreito da mesma classe de dado que o ator já lê; identity_id resolvido server-side, nunca sai no DTO).
  router.get(
    "/impound-processes/:processId/custody-history",
    requirePermission(IMPOUND_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await custodyHistoryController.listCustodyHistory(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
