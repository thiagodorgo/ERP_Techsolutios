import { Router, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { InventoryController, type InventoryServiceResolver } from "./inventory.controller.js";
import { createDefaultInventoryService } from "./inventory.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const INVENTORY_ITEM_PERMISSIONS = {
  read: "inventory_items:read",
  create: "inventory_items:create",
  update: "inventory_items:update",
} as const satisfies Record<string, Permission>;

export const STOCK_MOVEMENT_PERMISSIONS = {
  read: "stock_movements:read",
  create: "stock_movements:create",
} as const satisfies Record<string, Permission>;

/**
 * B-SAN3-15a (P3) — o estoque do técnico usa a permissão de LEITURA de estoque que o técnico de campo, o técnico e o
 * gerente já têm (`catalog.ts`); nenhuma permissão nova. Sem ela (finance, support, field_dispatcher): 403.
 */
export const TECHNICIAN_STOCK_PERMISSION = "inventory.read" as const satisfies Permission;

export function createInventoryItemRouter(
  coreService: ICoreSaasService,
  resolveService: InventoryServiceResolver = () => createDefaultInventoryService(coreService),
): Router {
  const router = Router();
  const controller = new InventoryController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // B-SAN3-15a (P1, P2, P3) — o estoque sob a responsabilidade do ATOR (a custódia é escolhida pelo servidor, pelo
  // token; nada do pedido a escolhe). Contrato `technician_stock@2026-11.b-san3-15a`. O caminho é o que o app já tem
  // (`ApiContracts.technicianStock`); o roteador de estoque já está montado, então o `src/app.ts` não muda.
  router.get(
    "/mobile/technician/stock",
    requirePermission(TECHNICIAN_STOCK_PERMISSION),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.technicianStock(request));
    }),
  );

  router.get(
    "/inventory-items",
    requirePermission(INVENTORY_ITEM_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listItems(request));
    }),
  );

  router.post(
    "/inventory-items",
    requirePermission(INVENTORY_ITEM_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createItem(request));
    }),
  );

  // R7.4 — ABC recalc is a management action (mirrors item management: inventory_items:update).
  // Registered before the `:itemId` routes so "abc-recalculate" is never read as an id.
  router.post(
    "/inventory-items/abc-recalculate",
    requirePermission(INVENTORY_ITEM_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.recalculateAbc(request));
    }),
  );

  // Ω4C PR-08 (D-Ω4C-INV-CUSTODY-SUMMARY) — per-custody quantities + labelled professionals/vehicles.
  // Registered before the bare `:itemId` GET so the extra segment is never read as an id (literal-first).
  router.get(
    "/inventory-items/:itemId/custody-summary",
    requirePermission(INVENTORY_ITEM_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.custodySummary(request));
    }),
  );

  router.get(
    "/inventory-items/:itemId",
    requirePermission(INVENTORY_ITEM_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getItem(request));
    }),
  );

  router.patch(
    "/inventory-items/:itemId",
    requirePermission(INVENTORY_ITEM_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.updateItem(request));
    }),
  );

  return router;
}

/**
 * Movements are an IMMUTABLE ledger (R7.1 + D-Ω4C-INV-LEDGER-IMMUTABLE): the router deliberately exposes
 * NO PATCH and NO DELETE — corrections happen through a compensating movement. Ω4C PR-08 adds the explicit
 * estorno endpoint `POST /:movementId/reverse` (posts the opposite movement; the original stays intact).
 */
export function createStockMovementRouter(
  coreService: ICoreSaasService,
  resolveService: InventoryServiceResolver = () => createDefaultInventoryService(coreService),
): Router {
  const router = Router();
  const controller = new InventoryController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/stock-movements",
    requirePermission(STOCK_MOVEMENT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listMovements(request));
    }),
  );

  router.post(
    "/stock-movements",
    requirePermission(STOCK_MOVEMENT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createMovement(request));
    }),
  );

  // Ω4C PR-08 — estorno = movimento compensatório (perm stock_movements:create). Registered before the bare
  // `:movementId` GET so the extra segment is never read as an id.
  router.post(
    "/stock-movements/:movementId/reverse",
    requirePermission(STOCK_MOVEMENT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.reverseMovement(request));
    }),
  );

  router.get(
    "/stock-movements/:movementId",
    requirePermission(STOCK_MOVEMENT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getMovement(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
