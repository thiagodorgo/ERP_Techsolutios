import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { VehicleIdentityController, type VehicleIdentityServiceResolver } from "./vehicle-identity.controller.js";
import { createDefaultVehicleIdentityService } from "./vehicle-identity.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// impound:read / impound:update REUSADAS (Ω-VID PR-02, D-Ω-VID-01) — CRUD básico sem permissão nova.
// Ω-VID PR-04 — 2 permissões NOVAS:
//   - vehicle_identity:merge: dedicada (mesmo padrão de release:approve/auction:appraise — NÃO coberta por
//     impound:update). Distribuição por HERANÇA do catálogo (PERMISSION_CATALOG): tenant_admin/super_admin/
//     platform_admin (catálogo integral/filtrado) + manager (lista explícita). Ver catalog.ts.
//   - platform:vehicle-identity-unmerge:manage: prefixo "platform:" (mesma convenção de authority_credentials:
//     manage) — TENANT_ADMIN_PERMISSIONS filtra TUDO que começa com "platform:", então só super_admin/
//     platform_admin (os 2 papéis que recebem o catálogo INTEGRAL sem filtro) a possuem. É a permissão MAIS
//     restrita alcançável nesta arquitetura de papéis (mais estreita que vehicle_identity:merge, que tenant_admin
//     e manager também têm) — condizente com "estorno administrativo" ser ainda mais sensível que o merge.
export const VEHICLE_IDENTITY_PERMISSIONS = {
  read: "impound:read",
  write: "impound:update",
  merge: "vehicle_identity:merge",
  unmergeAdmin: "platform:vehicle-identity-unmerge:manage",
} as const;

export function createVehicleIdentityRouter(
  resolveService: VehicleIdentityServiceResolver = createDefaultVehicleIdentityService,
): Router {
  const router = Router();
  const controller = new VehicleIdentityController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/vehicle-identities",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/vehicle-identities",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.write),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );
  router.get(
    "/vehicle-identities/:identityId",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  router.patch(
    "/vehicle-identities/:identityId",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.write),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );
  // Ω-VID PR-04 (§Parte A) — merge manual. Path de 3 segmentos, sem colisão com PATCH/GET :identityId.
  router.post(
    "/vehicle-identities/:targetId/merge",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.merge),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.merge(request));
    }),
  );
  // Ω-VID PR-04 (§Parte B) — estorno administrativo.
  router.post(
    "/vehicle-identities/:identityId/unmerge-admin",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.unmergeAdmin),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.unmergeAdmin(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
