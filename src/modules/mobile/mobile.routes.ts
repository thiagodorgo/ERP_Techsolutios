import { Router, type Response } from "express";

import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { createDefaultExpenseManagementService } from "../expense-management/expense-management.service.js";

type ExpenseCategoryDto = {
  readonly id: string;
  readonly name: string;
  readonly policy: {
    readonly receiptRequired: boolean;
    readonly defaultLimit: number | null;
  };
};

export function createMobileRouter(service: ICoreSaasService): Router {
  const router = Router();

  router.use(tenantContextMiddleware);

  router.get(
    "/mobile/bootstrap",
    handleAsyncRoute(async (request, response) => {
      const actor = request.tenantContext;

      if (!actor?.tenantId) {
        sendForbidden(response, "tenant_required", "Tenant context is required.");
        return;
      }

      if (!actor.userId || actor.userId === "anonymous") {
        sendForbidden(response, "user_required", "User context is required.");
        return;
      }

      if (actor.roles.length === 0) {
        sendForbidden(response, "role_required", "Role is required.");
        return;
      }

      const [tenant, user, expenseCategories] = await Promise.all([
        service.getTenantForActor(actor.tenantId, actor.tenantId),
        service.getUserForTenant(actor.userId, actor.tenantId),
        listExpenseCategoriesForBootstrap(actor),
      ]);

      response.json({
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
          },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          roles: [...actor.roles],
          permissions: [...actor.permissions],
          modules: tenant.modules.map((key) => ({
            key,
            enabled: true,
          })),
          expenseCategories,
          serverTime: new Date().toISOString(),
          sync: {
            workOrdersCursor: null,
            checklistsCursor: null,
            expensesCursor: null,
            inventoryCursor: null,
          },
        },
      });
    }),
  );

  return router;
}

async function listExpenseCategoriesForBootstrap(
  actor: AuthenticatedActor,
): Promise<ExpenseCategoryDto[]> {
  if (!canReadExpenseBootstrapCatalog(actor)) {
    return [];
  }

  const service = await createDefaultExpenseManagementService();

  return service.listCategories().items.map((category) => ({
    id: category.key,
    name: category.label,
    policy: {
      receiptRequired: category.receiptRequired,
      defaultLimit: category.defaultLimit ?? null,
    },
  }));
}

function canReadExpenseBootstrapCatalog(actor: AuthenticatedActor): boolean {
  return actor.permissions.some((permission) =>
    permission === "expense_policy:read" ||
    permission === "expense_report:read" ||
    permission === "expense_report:read_own" ||
    permission === "expense_report:create"
  );
}

function sendForbidden(
  response: Response,
  reason: string,
  message: string,
): void {
  response.status(403).json({
    error: {
      code: "FORBIDDEN",
      reason,
      message,
    },
  });
}
