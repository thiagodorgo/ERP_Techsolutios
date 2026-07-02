import { Router, type Response } from "express";

import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import type { AuthenticatedActor } from "../core-saas/types/core-saas.types.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { createDefaultExpenseManagementService } from "../expense-management/expense-management.service.js";
import { syncMobileChecklistActions } from "./mobile-checklist-sync.js";
import { syncMobileEvidenceActions } from "./mobile-evidence-sync.js";
import { uploadMobileEvidenceFile } from "./mobile-evidence-upload.js";
import { getMobileInventoryAvailability, syncMobileInventoryActions } from "./mobile-inventory-sync.js";
import { syncMobileWorkOrderActions } from "./mobile-work-order-sync.js";

type ExpenseCategoryDto = {
  readonly id: string;
  readonly name: string;
  readonly policy: {
    readonly receiptRequired: boolean;
    readonly defaultLimit: number | null;
  };
};

type CapabilityStatus = "implemented" | "planned" | "unavailable" | "partial";

type FeatureFlagDto = {
  readonly enabled: boolean;
  readonly status: CapabilityStatus;
  readonly reason?: string;
};

const BOOTSTRAP_CONTRACT_VERSION = "2026-06-14.b098a";
const BOOTSTRAP_SCHEMA_VERSION = 2;
const BOOTSTRAP_TTL_SECONDS = 300;
const BOOTSTRAP_STALE_WHILE_REVALIDATE_SECONDS = 900;
const MOBILE_APP_MIN_SUPPORTED_VERSION = "0.1.0";
const MOBILE_APP_RECOMMENDED_VERSION = "0.1.0";
const MOBILE_CATALOG_VERSION = "mobile-catalogs:v1";

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
      const memberships = await service.listTenantsForUserEmail(user.email);
      const serverTime = new Date();
      const expiresAt = new Date(serverTime.getTime() + BOOTSTRAP_TTL_SECONDS * 1000);
      const featureFlags = buildFeatureFlags(tenant.modules, actor);

      response.json({
        data: {
          contract: {
            name: "mobile_bootstrap",
            version: BOOTSTRAP_CONTRACT_VERSION,
            schemaVersion: BOOTSTRAP_SCHEMA_VERSION,
            status: "expanded",
            generatedAt: serverTime.toISOString(),
          },
          mobile_app: {
            platform: "flutter",
            min_supported_version: MOBILE_APP_MIN_SUPPORTED_VERSION,
            recommended_version: MOBILE_APP_RECOMMENDED_VERSION,
            bootstrap_contract_version: BOOTSTRAP_CONTRACT_VERSION,
          },
          cache: {
            ttl_seconds: BOOTSTRAP_TTL_SECONDS,
            stale_while_revalidate_seconds: BOOTSTRAP_STALE_WHILE_REVALIDATE_SECONDS,
            generated_at: serverTime.toISOString(),
            expires_at: expiresAt.toISOString(),
            cache_key: buildBootstrapCacheKey(tenant.id, user.id),
            vary_by: ["tenant", "user", "roles", "permissions", "modules"],
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
          },
          available_tenants: memberships.map((m) => ({
            tenantId: m.tenant.id,
            displayName: m.tenant.name,
            userRole: m.user.roles[0] ?? "tenant_member",
          })),
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
          feature_flags: featureFlags,
          mobile_policy: buildMobilePolicy(),
          catalogs: buildCatalogs(tenant.modules, actor, expenseCategories),
          expenseCategories,
          serverTime: serverTime.toISOString(),
          sync: {
            workOrdersCursor: null,
            checklistsCursor: null,
            expensesCursor: null,
            inventoryCursor: null,
            evidenceCursor: null,
          },
        },
      });
    }),
  );

  router.post(
    "/mobile/sync/work-order-actions",
    handleAsyncRoute(async (request, response) => {
      response.json({
        data: await syncMobileWorkOrderActions(request.tenantContext, request.body ?? {}),
      });
    }),
  );

  router.post(
    "/mobile/sync/checklist-actions",
    handleAsyncRoute(async (request, response) => {
      response.json({
        data: await syncMobileChecklistActions(request.tenantContext, request.body ?? {}),
      });
    }),
  );

  router.get(
    "/mobile/inventory/availability",
    handleAsyncRoute(async (request, response) => {
      response.json({
        data: getMobileInventoryAvailability(request.tenantContext, request.query ?? {}),
      });
    }),
  );

  router.post(
    "/mobile/sync/inventory-actions",
    handleAsyncRoute(async (request, response) => {
      response.json({
        data: await syncMobileInventoryActions(request.tenantContext, request.body ?? {}),
      });
    }),
  );

  router.post(
    "/mobile/sync/evidence-actions",
    handleAsyncRoute(async (request, response) => {
      response.json({
        data: await syncMobileEvidenceActions(request.tenantContext, request.body ?? {}),
      });
    }),
  );

  router.post(
    "/mobile/evidence-uploads",
    handleAsyncRoute(async (request, response) => {
      response.status(201).json({
        data: await uploadMobileEvidenceFile(request.tenantContext, request),
      });
    }),
  );

  return router;
}

function buildFeatureFlags(
  modules: readonly string[],
  actor: AuthenticatedActor,
): Record<string, FeatureFlagDto> {
  return {
    mobile_bootstrap_expanded: {
      enabled: true,
      status: "implemented",
    },
    expense_management: {
      enabled: hasModule(modules, "expense_management") && canReadExpenseBootstrapCatalog(actor),
      status: hasModule(modules, "expense_management") ? "implemented" : "unavailable",
      ...(hasModule(modules, "expense_management") ? {} : { reason: "module_disabled" }),
    },
    work_orders: {
      enabled: hasModule(modules, "work_orders") && hasPermission(actor, "work_orders:read"),
      status: hasModule(modules, "work_orders") ? "implemented" : "unavailable",
      ...(hasModule(modules, "work_orders") ? {} : { reason: "module_disabled" }),
    },
    checklists: {
      enabled: hasModule(modules, "tenant_checklist") && hasPermission(actor, "checklist_runs:read"),
      status: hasModule(modules, "tenant_checklist") ? "implemented" : "unavailable",
      ...(hasModule(modules, "tenant_checklist") ? {} : { reason: "module_disabled" }),
    },
    notifications: {
      enabled: hasModule(modules, "notifications") && hasPermission(actor, "notifications:read"),
      status: hasModule(modules, "notifications") ? "implemented" : "unavailable",
      ...(hasModule(modules, "notifications") ? {} : { reason: "module_disabled" }),
    },
    field_location: {
      enabled: hasModule(modules, "field_operations") && (
        hasPermission(actor, "field_location:send") ||
        hasPermission(actor, "field_location:read") ||
        hasPermission(actor, "field_location:history")
      ),
      status: hasModule(modules, "field_operations") ? "implemented" : "unavailable",
      ...(hasModule(modules, "field_operations") ? {} : { reason: "module_disabled" }),
    },
    expense_sync: {
      enabled: hasModule(modules, "expense_management") && canReadExpenseBootstrapCatalog(actor),
      status: "implemented",
    },
    work_order_sync: {
      enabled: hasModule(modules, "work_orders") && (
        hasPermission(actor, "work_orders:status") ||
        hasPermission(actor, "work_orders:assign")
      ),
      status: hasModule(modules, "work_orders") ? "implemented" : "unavailable",
      ...(hasModule(modules, "work_orders") ? {} : { reason: "module_disabled" }),
    },
    checklist_sync: {
      enabled: hasModule(modules, "tenant_checklist") && (
        hasPermission(actor, "checklist_runs:update") ||
        hasPermission(actor, "checklist_runs:complete")
      ),
      status: hasModule(modules, "tenant_checklist") ? "partial" : "unavailable",
      reason: hasModule(modules, "tenant_checklist") ? "minimal_replay_contract" : "module_disabled",
    },
    inventory_mobile: {
      enabled: hasModule(modules, "inventory") && hasPermission(actor, "inventory.read"),
      status: hasModule(modules, "inventory") ? "partial" : "unavailable",
      reason: hasModule(modules, "inventory") ? "availability_and_sync_partial" : "module_disabled",
    },
    inventory_sync: {
      enabled: hasModule(modules, "inventory") && hasPermission(actor, "inventory.manage"),
      status: hasModule(modules, "inventory") ? "partial" : "unavailable",
      reason: hasModule(modules, "inventory") ? "in_memory_contract" : "module_disabled",
    },
    generic_evidence_upload: {
      enabled: (
        hasModule(modules, "work_orders") && hasPermission(actor, "work_orders:update")
      ) || (
        hasModule(modules, "field_operations") && hasPermission(actor, "field_location:send")
      ),
      status: hasModule(modules, "work_orders") || hasModule(modules, "field_operations") ? "partial" : "unavailable",
      reason: hasModule(modules, "work_orders") || hasModule(modules, "field_operations")
        ? "metadata_and_binary_upload_partial"
        : "module_disabled",
    },
  };
}

function buildMobilePolicy() {
  return {
    auth: {
      bearer_required: true,
      legacy_headers: "development_test_only",
      tenant_source: "authenticated_actor",
    },
    cache: {
      bootstrap_ttl_seconds: BOOTSTRAP_TTL_SECONDS,
      stale_while_revalidate_seconds: BOOTSTRAP_STALE_WHILE_REVALIDATE_SECONDS,
    },
    sync: {
      actions_enabled: true,
      read_only_bootstrap: false,
      client_action_id_required: true,
      max_batch_size: 50,
      retry_backoff_seconds: [10, 30, 120],
      implemented_domains: ["expenses", "work_orders"],
      partial_domains: ["checklists", "inventory", "evidence"],
      planned_domains: [],
    },
    evidence: {
      checklist_attachments: "implemented",
      work_order_evidence: "partial",
      generic_upload: "partial",
      max_upload_mb: 10,
      allowed_mime_types: ["image/jpeg", "image/png"],
    },
    diagnostics: {
      safe_logs_only: true,
      include_tokens: false,
      include_private_file_paths: false,
    },
  };
}

function buildCatalogs(
  modules: readonly string[],
  actor: AuthenticatedActor,
  expenseCategories: readonly ExpenseCategoryDto[],
) {
  const canReadExpenseCatalog = canReadExpenseBootstrapCatalog(actor);

  return {
    version: MOBILE_CATALOG_VERSION,
    modules: {
      status: "implemented",
      version: buildVersion("modules", modules),
      items: modules.map((key) => ({
        key,
        enabled: true,
      })),
    },
    permissions: {
      status: "implemented",
      version: buildVersion("permissions", actor.permissions),
      items: [...actor.permissions],
    },
    expense_categories: {
      status: canReadExpenseCatalog ? "implemented" : "unavailable",
      version: "expense-categories:v1",
      reason: canReadExpenseCatalog ? null : "permission_required",
      items: expenseCategories,
    },
    endpoints: {
      status: "partial",
      version: "mobile-endpoints:v1",
      items: [
        endpointCatalogItem("auth_login", "POST /api/v1/auth/login", "implemented"),
        endpointCatalogItem("auth_refresh", "POST /api/v1/auth/refresh", "implemented"),
        endpointCatalogItem("mobile_bootstrap", "GET /api/v1/mobile/bootstrap", "implemented"),
        endpointCatalogItem("work_orders", "GET /api/v1/work-orders", "implemented"),
        endpointCatalogItem("mobile_checklists", "GET /api/v1/mobile/checklists/available", "implemented"),
        endpointCatalogItem("expense_sync", "POST /api/v1/mobile/sync/expense-actions", "implemented"),
        endpointCatalogItem("notifications", "GET /api/v1/notifications", "implemented"),
        endpointCatalogItem("field_location_send", "POST /api/v1/mobile/field-locations", "implemented"),
        endpointCatalogItem("work_order_sync", "POST /api/v1/mobile/sync/work-order-actions", "implemented"),
        endpointCatalogItem("checklist_sync", "POST /api/v1/mobile/sync/checklist-actions", "partial"),
        endpointCatalogItem("inventory_availability", "GET /api/v1/mobile/inventory/availability", "partial"),
        endpointCatalogItem("inventory_sync", "POST /api/v1/mobile/sync/inventory-actions", "partial"),
        endpointCatalogItem("evidence_sync", "POST /api/v1/mobile/sync/evidence-actions", "partial"),
        endpointCatalogItem("evidence_upload", "POST /api/v1/mobile/evidence-uploads", "partial"),
      ],
    },
  };
}

function endpointCatalogItem(
  key: string,
  endpoint: string,
  status: CapabilityStatus,
) {
  return {
    key,
    endpoint,
    status,
  };
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

function buildBootstrapCacheKey(tenantId: string, userId: string): string {
  return `mobile-bootstrap:${BOOTSTRAP_CONTRACT_VERSION}:tenant:${tenantId}:user:${userId}`;
}

function buildVersion(prefix: string, values: readonly string[]): string {
  return `${prefix}:${values.length}:${values.join("|")}`;
}

function hasModule(modules: readonly string[], moduleKey: string): boolean {
  return modules.includes(moduleKey);
}

function hasPermission(
  actor: AuthenticatedActor,
  permission: AuthenticatedActor["permissions"][number],
): boolean {
  return actor.permissions.includes(permission);
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
