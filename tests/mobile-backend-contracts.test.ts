import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

test("mobile bootstrap returns tenant-scoped contract and ignores requested tenant override", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, `/api/v1/mobile/bootstrap?tenantId=${seed.tenantB.id}`, {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.contract.name, "mobile_bootstrap");
    assert.equal(response.body.data.contract.version, "2026-06-14.b098a");
    assert.equal(response.body.data.contract.schemaVersion, 2);
    assert.equal(response.body.data.contract.status, "expanded");
    assert.equal(response.body.data.mobile_app.platform, "flutter");
    assert.equal(response.body.data.mobile_app.min_supported_version, "0.1.0");
    assert.equal(response.body.data.cache.ttl_seconds, 300);
    assert.equal(response.body.data.cache.stale_while_revalidate_seconds, 900);
    assert.deepEqual(response.body.data.cache.vary_by, ["tenant", "user", "roles", "permissions", "modules"]);
    assert.match(response.body.data.cache.cache_key, /^mobile-bootstrap:2026-06-14\.b098a:tenant:/);
    assert.equal(response.body.data.tenant.id, seed.tenantA.id);
    assert.equal(response.body.data.tenant.name, "Mobile Tenant A");
    assert.equal(response.body.data.user.id, seed.adminA.id);
    assert.equal(response.body.data.user.email, seed.adminA.email);
    assert.deepEqual(response.body.data.roles, ["tenant_admin"]);
    assert.equal(response.body.data.permissions.includes("work_orders:read"), true);
    assert.equal(response.body.data.modules.some((item: { key: string; enabled: boolean }) => item.key === "mobile" && item.enabled), true);
    assert.equal(response.body.data.modules.some((item: { key: string }) => item.key === "expense_management"), true);
    assert.equal(response.body.data.feature_flags.mobile_bootstrap_expanded.enabled, true);
    assert.equal(response.body.data.feature_flags.mobile_bootstrap_expanded.status, "implemented");
    assert.equal(response.body.data.feature_flags.work_order_sync.enabled, true);
    assert.equal(response.body.data.feature_flags.work_order_sync.status, "implemented");
    assert.equal(response.body.data.feature_flags.checklist_sync.enabled, true);
    assert.equal(response.body.data.feature_flags.checklist_sync.status, "partial");
    assert.equal(response.body.data.feature_flags.inventory_mobile.enabled, true);
    assert.equal(response.body.data.feature_flags.inventory_mobile.status, "partial");
    assert.equal(response.body.data.feature_flags.inventory_sync.enabled, true);
    assert.equal(response.body.data.feature_flags.inventory_sync.status, "partial");
    assert.equal(response.body.data.mobile_policy.auth.bearer_required, true);
    assert.equal(response.body.data.mobile_policy.auth.tenant_source, "authenticated_actor");
    assert.equal(response.body.data.mobile_policy.sync.actions_enabled, true);
    assert.deepEqual(response.body.data.mobile_policy.sync.implemented_domains, ["expenses", "work_orders"]);
    assert.deepEqual(response.body.data.mobile_policy.sync.partial_domains, ["checklists", "inventory"]);
    assert.deepEqual(response.body.data.mobile_policy.sync.planned_domains, []);
    assert.equal(response.body.data.catalogs.version, "mobile-catalogs:v1");
    assert.equal(response.body.data.catalogs.modules.status, "implemented");
    assert.equal(response.body.data.catalogs.permissions.status, "implemented");
    assert.equal(response.body.data.catalogs.expense_categories.status, "implemented");
    assert.equal(response.body.data.catalogs.endpoints.status, "partial");
    assert.equal(findCatalogEndpoint(response.body, "expense_sync").status, "implemented");
    assert.equal(findCatalogEndpoint(response.body, "work_order_sync").status, "implemented");
    assert.equal(findCatalogEndpoint(response.body, "checklist_sync").status, "partial");
    assert.equal(findCatalogEndpoint(response.body, "inventory_availability").status, "partial");
    assert.equal(findCatalogEndpoint(response.body, "inventory_sync").status, "partial");
    assert.equal(response.body.data.expenseCategories.length > 0, true);
    assert.equal(response.body.data.sync.workOrdersCursor, null);
    assert.equal(response.body.data.sync.checklistsCursor, null);
    assert.equal(response.body.data.sync.expensesCursor, null);
    assert.equal(response.body.data.sync.inventoryCursor, null);
    assert.equal(Number.isNaN(Date.parse(response.body.data.serverTime)), false);
    assert.equal(JSON.stringify(response.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(response.body);
  });
});

test("mobile bootstrap marks unavailable catalogs when the actor lacks expense permission", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", {
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.roles, ["viewer"]);
    assert.equal(response.body.data.expenseCategories.length, 0);
    assert.equal(response.body.data.feature_flags.expense_management.enabled, false);
    assert.equal(response.body.data.feature_flags.expense_management.status, "implemented");
    assert.equal(response.body.data.catalogs.expense_categories.status, "unavailable");
    assert.equal(response.body.data.catalogs.expense_categories.reason, "permission_required");
    assert.deepEqual(response.body.data.catalogs.expense_categories.items, []);
    assertNoStackTrace(response.body);
  });
});

test("mobile bootstrap requires tenant, user and role context", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const missingTenant = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", {
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
    });
    const missingUser = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", {
      headers: {
        "x-tenant-id": seed.tenantA.id,
        "x-role": "tenant_admin",
      },
    });
    const missingRole = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", {
      headers: {
        "x-tenant-id": seed.tenantA.id,
        "x-user-id": seed.adminA.id,
      },
    });

    assert.equal(missingTenant.status, 403);
    assert.equal(missingTenant.body.error.reason, "tenant_required");
    assert.equal(missingUser.status, 403);
    assert.equal(missingUser.body.error.reason, "user_required");
    assert.equal(missingRole.status, 403);
    assert.equal(missingRole.body.error.reason, "role_required");
    assertNoStackTrace(missingTenant.body);
    assertNoStackTrace(missingUser.body);
    assertNoStackTrace(missingRole.body);
  });
});

test("mobile backend exposes ready checklist, expense, work order, inventory and notification contracts", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const checklists = await requestJson(baseUrl, "/api/v1/mobile/checklists/available", { headers });
    const expenseSync = await requestJson(baseUrl, "/api/v1/mobile/sync/expense-actions", {
      method: "POST",
      headers,
      body: { actions: [] },
    });
    const workOrderSync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers,
      body: { client_batch_id: "empty-work-order-batch", actions: [] },
    });
    const checklistSync = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers,
      body: { client_batch_id: "empty-checklist-batch", actions: [] },
    });
    const inventoryAvailability = await requestJson(baseUrl, "/api/v1/mobile/inventory/availability", { headers });
    const inventorySync = await requestJson(baseUrl, "/api/v1/mobile/sync/inventory-actions", {
      method: "POST",
      headers,
      body: { client_batch_id: "empty-inventory-batch", actions: [] },
    });
    const workOrders = await requestJson(baseUrl, "/api/v1/work-orders", { headers });
    const notifications = await requestJson(baseUrl, "/api/v1/notifications", { headers });

    assert.equal(checklists.status, 200);
    assert.ok(Array.isArray(checklists.body.data));
    assert.equal(expenseSync.status, 200);
    assert.ok(Array.isArray(expenseSync.body.data.results));
    assert.equal(expenseSync.body.data.results.length, 0);
    assert.equal(workOrderSync.status, 200);
    assert.equal(workOrderSync.body.data.contract.name, "mobile_work_order_actions_sync");
    assert.equal(workOrderSync.body.data.summary.received, 0);
    assert.deepEqual(workOrderSync.body.data.accepted, []);
    assert.deepEqual(workOrderSync.body.data.rejected, []);
    assert.deepEqual(workOrderSync.body.data.conflicts, []);
    assert.deepEqual(workOrderSync.body.data.already_applied, []);
    assert.equal(checklistSync.status, 200);
    assert.equal(checklistSync.body.data.contract.name, "mobile_checklist_actions_sync");
    assert.equal(checklistSync.body.data.contract.status, "partial");
    assert.equal(checklistSync.body.data.summary.received, 0);
    assert.deepEqual(checklistSync.body.data.accepted, []);
    assert.deepEqual(checklistSync.body.data.rejected, []);
    assert.deepEqual(checklistSync.body.data.conflicts, []);
    assert.deepEqual(checklistSync.body.data.already_applied, []);
    assert.equal(inventoryAvailability.status, 200);
    assert.equal(inventoryAvailability.body.data.contract.name, "mobile_inventory_availability");
    assert.equal(inventoryAvailability.body.data.contract.status, "partial");
    assert.equal(inventoryAvailability.body.data.tenant_id, seed.tenantA.id);
    assert.equal(inventoryAvailability.body.data.items.length > 0, true);
    assert.equal(inventoryAvailability.body.data.items[0].item_id.length > 0, true);
    assert.equal(inventoryAvailability.body.data.items[0].available_quantity >= 0, true);
    assert.equal(inventorySync.status, 200);
    assert.equal(inventorySync.body.data.contract.name, "mobile_inventory_actions_sync");
    assert.equal(inventorySync.body.data.contract.status, "partial");
    assert.equal(inventorySync.body.data.summary.received, 0);
    assert.deepEqual(inventorySync.body.data.accepted, []);
    assert.deepEqual(inventorySync.body.data.rejected, []);
    assert.deepEqual(inventorySync.body.data.conflicts, []);
    assert.deepEqual(inventorySync.body.data.already_applied, []);
    assert.equal(workOrders.status, 200);
    assert.ok(Array.isArray(workOrders.body.items));
    assert.equal(notifications.status, 200);
    assert.ok(Array.isArray(notifications.body.data));
    assertNoStackTrace(checklists.body);
    assertNoStackTrace(expenseSync.body);
    assertNoStackTrace(workOrderSync.body);
    assertNoStackTrace(checklistSync.body);
    assertNoStackTrace(inventoryAvailability.body);
    assertNoStackTrace(inventorySync.body);
    assertNoStackTrace(workOrders.body);
    assertNoStackTrace(notifications.body);
  });
});

test("mobile work order action sync accepts, deduplicates, rejects and reports conflicts by action", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers,
      body: {
        title: "Mobile roadside assistance",
        priority: "high",
      },
    });

    assert.equal(created.status, 201);
    const workOrderId = created.body.data.id;

    const firstSync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "wo-batch-1",
        tenant_id: seed.tenantB.id,
        actions: [
          {
            client_action_id: "wo-action-1",
            type: "work_order.status_change",
            local_created_at: "2026-06-14T12:00:00.000Z",
            payload: {
              tenant_id: seed.tenantB.id,
              work_order_id: workOrderId,
              status: "assigned",
              message: "Mobile accepted dispatch.",
            },
          },
          {
            client_action_id: "wo-action-invalid-status",
            type: "work_order.status_change",
            payload: {
              work_order_id: workOrderId,
              status: "invalid_status",
            },
          },
          {
            client_action_id: "wo-action-unsupported",
            type: "work_order.evidence_attach",
            payload: {
              work_order_id: workOrderId,
            },
          },
        ],
      },
    });

    assert.equal(firstSync.status, 200);
    assert.equal(firstSync.body.data.tenant_id, seed.tenantA.id);
    assert.equal(firstSync.body.data.summary.received, 3);
    assert.equal(firstSync.body.data.summary.accepted, 1);
    assert.equal(firstSync.body.data.summary.rejected, 2);
    assert.equal(firstSync.body.data.summary.conflicts, 0);
    assert.equal(firstSync.body.data.accepted[0].client_action_id, "wo-action-1");
    assert.equal(firstSync.body.data.accepted[0].server_state.status, "assigned");
    assert.equal(firstSync.body.data.rejected[0].client_action_id, "wo-action-invalid-status");
    assert.equal(firstSync.body.data.rejected[0].error.reason, "invalid_status");
    assert.equal(firstSync.body.data.rejected[1].client_action_id, "wo-action-unsupported");
    assert.equal(firstSync.body.data.rejected[1].error.reason, "unsupported_action_type");
    assert.equal(JSON.stringify(firstSync.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(firstSync.body);

    const duplicateSync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "wo-batch-2",
        actions: [
          {
            client_action_id: "wo-action-1",
            type: "work_order.status_change",
            payload: {
              work_order_id: workOrderId,
              status: "assigned",
              message: "Mobile accepted dispatch.",
            },
          },
          {
            client_action_id: "wo-action-1",
            type: "work_order.status_change",
            payload: {
              work_order_id: workOrderId,
              status: "cancelled",
              cancellation_reason: "Different offline payload.",
            },
          },
          {
            client_action_id: "wo-action-invalid-transition",
            type: "work_order.status_change",
            payload: {
              work_order_id: workOrderId,
              status: "completed",
            },
          },
        ],
      },
    });

    assert.equal(duplicateSync.status, 200);
    assert.equal(duplicateSync.body.data.summary.accepted, 0);
    assert.equal(duplicateSync.body.data.summary.rejected, 0);
    assert.equal(duplicateSync.body.data.summary.conflicts, 2);
    assert.equal(duplicateSync.body.data.summary.already_applied, 1);
    assert.equal(duplicateSync.body.data.already_applied[0].client_action_id, "wo-action-1");
    assert.equal(duplicateSync.body.data.conflicts[0].conflict.conflict_type, "idempotency_payload_mismatch");
    assert.equal(duplicateSync.body.data.conflicts[1].conflict.conflict_type, "invalid_status_transition");
    assertNoStackTrace(duplicateSync.body);
  });
});

test("mobile checklist action sync accepts, deduplicates, rejects and reports conflicts by action", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const checklist = await createChecklistRunForSync(baseUrl, seed, headers);

    const firstSync = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "checklist-batch-1",
        tenant_id: seed.tenantB.id,
        actions: [
          {
            client_action_id: "checklist-action-1",
            type: "checklist.item_answer",
            local_created_at: "2026-06-14T12:00:00.000Z",
            payload: {
              tenant_id: seed.tenantB.id,
              run_id: checklist.runId,
              component_id: checklist.componentId,
              value: "Vehicle checked without damage.",
              metadata: { source: "offline_form" },
            },
          },
          {
            client_action_id: "checklist-action-note",
            type: "checklist.item_note",
            local_created_at: "2026-06-14T12:01:00.000Z",
            payload: {
              run_id: checklist.runId,
              component_id: checklist.componentId,
              note: "Driver confirmed condition.",
            },
          },
          {
            client_action_id: "checklist-action-unsupported",
            type: "checklist.item_attachment",
            local_created_at: "2026-06-14T12:02:00.000Z",
            payload: {
              run_id: checklist.runId,
              component_id: checklist.componentId,
            },
          },
        ],
      },
    });

    assert.equal(firstSync.status, 200);
    assert.equal(firstSync.body.data.tenant_id, seed.tenantA.id);
    assert.equal(firstSync.body.data.summary.received, 3);
    assert.equal(firstSync.body.data.summary.accepted, 2);
    assert.equal(firstSync.body.data.summary.rejected, 1);
    assert.equal(firstSync.body.data.summary.conflicts, 0);
    assert.equal(firstSync.body.data.accepted[0].client_action_id, "checklist-action-1");
    assert.equal(firstSync.body.data.accepted[0].server_state.answers[0].value, "Vehicle checked without damage.");
    assert.equal(firstSync.body.data.accepted[1].server_state.answers[0].metadata.note, "Driver confirmed condition.");
    assert.equal(firstSync.body.data.rejected[0].client_action_id, "checklist-action-unsupported");
    assert.equal(firstSync.body.data.rejected[0].error.reason, "unsupported_action_type");
    assert.equal(JSON.stringify(firstSync.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(firstSync.body);

    const duplicateSync = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "checklist-batch-2",
        actions: [
          {
            client_action_id: "checklist-action-1",
            type: "checklist.item_answer",
            local_created_at: "2026-06-14T12:03:00.000Z",
            payload: {
              run_id: checklist.runId,
              component_id: checklist.componentId,
              value: "Vehicle checked without damage.",
              metadata: { source: "offline_form" },
            },
          },
          {
            client_action_id: "checklist-action-1",
            type: "checklist.item_answer",
            local_created_at: "2026-06-14T12:04:00.000Z",
            payload: {
              run_id: checklist.runId,
              component_id: checklist.componentId,
              value: "Different offline answer.",
            },
          },
          {
            client_action_id: "checklist-action-complete",
            type: "checklist.complete",
            local_created_at: "2026-06-14T12:05:00.000Z",
            payload: {
              run_id: checklist.runId,
              has_divergence: false,
            },
          },
        ],
      },
    });

    assert.equal(duplicateSync.status, 200);
    assert.equal(duplicateSync.body.data.summary.accepted, 1);
    assert.equal(duplicateSync.body.data.summary.rejected, 0);
    assert.equal(duplicateSync.body.data.summary.conflicts, 1);
    assert.equal(duplicateSync.body.data.summary.already_applied, 1);
    assert.equal(duplicateSync.body.data.already_applied[0].client_action_id, "checklist-action-1");
    assert.equal(duplicateSync.body.data.conflicts[0].conflict.conflict_type, "idempotency_payload_mismatch");
    assert.equal(duplicateSync.body.data.accepted[0].server_state.run.status, "completed");
    assertNoStackTrace(duplicateSync.body);
  });
});

test("mobile checklist action sync validates envelope, actor context, permissions and tenant spoofing", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const checklist = await createChecklistRunForSync(baseUrl, seed, headers);

    const invalidEnvelope = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers,
      body: { actions: "not-an-array" },
    });
    const missingTenant = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
      body: { actions: [] },
    });
    const missingPermission = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
      body: { actions: [] },
    });
    const perActionPermission = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers: {
        ...authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        "x-permissions": "checklist_runs:update",
      },
      body: {
        actions: [
          {
            client_action_id: "checklist-read-only-complete",
            type: "checklist.complete",
            local_created_at: "2026-06-14T12:06:00.000Z",
            payload: { run_id: checklist.runId },
          },
        ],
      },
    });
    const tenantSpoof = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "checklist-spoof",
        actions: [
          {
            client_action_id: "checklist-spoof-action",
            type: "checklist.item_answer",
            local_created_at: "2026-06-14T12:07:00.000Z",
            payload: {
              tenant_id: seed.tenantB.id,
              run_id: checklist.runId,
              component_id: checklist.componentId,
              value: "Tenant spoof ignored.",
            },
          },
        ],
      },
    });

    assert.equal(invalidEnvelope.status, 400);
    assert.equal(invalidEnvelope.body.error.reason, "invalid_envelope");
    assert.equal(missingTenant.status, 403);
    assert.equal(missingTenant.body.error.reason, "tenant_required");
    assert.equal(missingPermission.status, 403);
    assert.equal(missingPermission.body.error.reason, "permission_required");
    assert.equal(perActionPermission.status, 200);
    assert.equal(perActionPermission.body.data.rejected[0].error.reason, "permission_required");
    assert.equal(tenantSpoof.status, 200);
    assert.equal(tenantSpoof.body.data.tenant_id, seed.tenantA.id);
    assert.equal(tenantSpoof.body.data.summary.accepted, 1);
    assert.equal(JSON.stringify(tenantSpoof.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(invalidEnvelope.body);
    assertNoStackTrace(missingTenant.body);
    assertNoStackTrace(missingPermission.body);
    assertNoStackTrace(perActionPermission.body);
    assertNoStackTrace(tenantSpoof.body);
  });
});

test("mobile work order action sync validates envelope, actor context and permissions", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const invalidEnvelope = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: { actions: "not-an-array" },
    });
    const missingTenant = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
      body: { actions: [] },
    });
    const missingPermission = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
      body: { actions: [] },
    });

    assert.equal(invalidEnvelope.status, 400);
    assert.equal(invalidEnvelope.body.error.reason, "invalid_envelope");
    assert.equal(missingTenant.status, 403);
    assert.equal(missingTenant.body.error.reason, "tenant_required");
    assert.equal(missingPermission.status, 403);
    assert.equal(missingPermission.body.error.reason, "permission_required");
    assertNoStackTrace(invalidEnvelope.body);
    assertNoStackTrace(missingTenant.body);
    assertNoStackTrace(missingPermission.body);
  });
});

test("mobile inventory availability filters tenant-scoped stock and rejects missing permission", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const availability = await requestJson(
      baseUrl,
      `/api/v1/mobile/inventory/availability?tenant_id=${seed.tenantB.id}&sku=CABO-REBOQUE-5T&work_order_id=wo-local-1`,
      { headers },
    );
    const missingPermission = await requestJson(baseUrl, "/api/v1/mobile/inventory/availability", {
      headers: authHeaders(seed.tenantA, seed.adminA, "support"),
    });

    assert.equal(availability.status, 200);
    assert.equal(availability.body.data.contract.name, "mobile_inventory_availability");
    assert.equal(availability.body.data.contract.status, "partial");
    assert.equal(availability.body.data.tenant_id, seed.tenantA.id);
    assert.equal(availability.body.data.filters.sku, "CABO-REBOQUE-5T");
    assert.equal(availability.body.data.filters.work_order_id, "wo-local-1");
    assert.equal(availability.body.data.items.length, 1);
    assert.deepEqual(Object.keys(availability.body.data.items[0]).sort(), [
      "available_quantity",
      "item_id",
      "name",
      "reserved_quantity",
      "sku",
      "status",
      "unit",
      "warehouse_id",
    ]);
    assert.equal(availability.body.data.items[0].item_id, "inv-item-tow-cable");
    assert.equal(JSON.stringify(availability.body).includes(seed.tenantB.id), false);
    assert.equal(missingPermission.status, 403);
    assert.equal(missingPermission.body.error.reason, "permission_required");
    assertNoStackTrace(availability.body);
    assertNoStackTrace(missingPermission.body);
  });
});

test("mobile inventory action sync accepts, deduplicates, rejects and reports conflicts by action", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const firstSync = await requestJson(baseUrl, "/api/v1/mobile/sync/inventory-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "inventory-batch-1",
        tenant_id: seed.tenantB.id,
        actions: [
          {
            client_action_id: "inventory-reserve-1",
            type: "inventory.reserve",
            local_created_at: "2026-06-15T12:00:00.000Z",
            payload: {
              tenant_id: seed.tenantB.id,
              item_id: "inv-item-tow-cable",
              warehouse_id: "mobile-warehouse-main",
              quantity: 2,
            },
          },
          {
            client_action_id: "inventory-consume-1",
            type: "inventory.consume",
            local_created_at: "2026-06-15T12:01:00.000Z",
            payload: {
              item_id: "inv-item-tow-cable",
              warehouse_id: "mobile-warehouse-main",
              quantity: 1,
            },
          },
          {
            client_action_id: "inventory-shortage-1",
            type: "inventory.shortage_report",
            local_created_at: "2026-06-15T12:02:00.000Z",
            payload: {
              item_id: "inv-item-fuse-kit",
              quantity: 3,
              reason: "Field team found fewer kits than expected.",
            },
          },
          {
            client_action_id: "inventory-invalid-payload",
            type: "inventory.reserve",
            local_created_at: "2026-06-15T12:03:00.000Z",
            payload: {
              item_id: "inv-item-tow-cable",
            },
          },
          {
            client_action_id: "inventory-unsupported",
            type: "inventory.adjust",
            local_created_at: "2026-06-15T12:04:00.000Z",
            payload: {
              item_id: "inv-item-tow-cable",
              quantity: 1,
            },
          },
        ],
      },
    });

    assert.equal(firstSync.status, 200);
    assert.equal(firstSync.body.data.contract.name, "mobile_inventory_actions_sync");
    assert.equal(firstSync.body.data.contract.status, "partial");
    assert.equal(firstSync.body.data.tenant_id, seed.tenantA.id);
    assert.equal(firstSync.body.data.summary.received, 5);
    assert.equal(firstSync.body.data.summary.accepted, 3);
    assert.equal(firstSync.body.data.summary.rejected, 2);
    assert.equal(firstSync.body.data.summary.conflicts, 0);
    assert.equal(firstSync.body.data.accepted[0].client_action_id, "inventory-reserve-1");
    assert.equal(firstSync.body.data.accepted[0].server_state.available_quantity, 4);
    assert.equal(firstSync.body.data.accepted[0].server_state.reserved_quantity, 2);
    assert.equal(firstSync.body.data.accepted[1].client_action_id, "inventory-consume-1");
    assert.equal(firstSync.body.data.accepted[1].server_state.available_quantity, 4);
    assert.equal(firstSync.body.data.accepted[1].server_state.reserved_quantity, 1);
    assert.equal(firstSync.body.data.accepted[2].server_state.status, "reported");
    assert.equal(firstSync.body.data.rejected[0].client_action_id, "inventory-invalid-payload");
    assert.equal(firstSync.body.data.rejected[0].error.reason, "invalid_quantity");
    assert.equal(firstSync.body.data.rejected[1].client_action_id, "inventory-unsupported");
    assert.equal(firstSync.body.data.rejected[1].error.reason, "unsupported_action_type");
    assert.equal(JSON.stringify(firstSync.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(firstSync.body);

    const duplicateSync = await requestJson(baseUrl, "/api/v1/mobile/sync/inventory-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "inventory-batch-2",
        actions: [
          {
            client_action_id: "inventory-reserve-1",
            type: "inventory.reserve",
            local_created_at: "2026-06-15T12:05:00.000Z",
            payload: {
              item_id: "inv-item-tow-cable",
              warehouse_id: "mobile-warehouse-main",
              quantity: 2,
            },
          },
          {
            client_action_id: "inventory-reserve-1",
            type: "inventory.reserve",
            local_created_at: "2026-06-15T12:06:00.000Z",
            payload: {
              item_id: "inv-item-tow-cable",
              warehouse_id: "mobile-warehouse-main",
              quantity: 3,
            },
          },
          {
            client_action_id: "inventory-reserve-conflict",
            type: "inventory.reserve",
            local_created_at: "2026-06-15T12:07:00.000Z",
            payload: {
              item_id: "inv-item-fuse-kit",
              quantity: 99,
            },
          },
        ],
      },
    });

    assert.equal(duplicateSync.status, 200);
    assert.equal(duplicateSync.body.data.summary.accepted, 0);
    assert.equal(duplicateSync.body.data.summary.rejected, 0);
    assert.equal(duplicateSync.body.data.summary.conflicts, 2);
    assert.equal(duplicateSync.body.data.summary.already_applied, 1);
    assert.equal(duplicateSync.body.data.already_applied[0].client_action_id, "inventory-reserve-1");
    assert.equal(duplicateSync.body.data.conflicts[0].conflict.conflict_type, "idempotency_payload_mismatch");
    assert.equal(duplicateSync.body.data.conflicts[1].conflict.conflict_type, "insufficient_available_quantity");
    assertNoStackTrace(duplicateSync.body);
  });
});

test("mobile inventory action sync validates envelope, actor context, permissions and tenant spoofing", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const invalidEnvelope = await requestJson(baseUrl, "/api/v1/mobile/sync/inventory-actions", {
      method: "POST",
      headers,
      body: { actions: "not-an-array" },
    });
    const missingTenant = await requestJson(baseUrl, "/api/v1/mobile/sync/inventory-actions", {
      method: "POST",
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
      body: { actions: [] },
    });
    const missingPermission = await requestJson(baseUrl, "/api/v1/mobile/sync/inventory-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
      body: { actions: [] },
    });
    const tenantSpoof = await requestJson(baseUrl, "/api/v1/mobile/sync/inventory-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "inventory-spoof",
        actions: [
          {
            client_action_id: "inventory-spoof-action",
            type: "inventory.reserve",
            local_created_at: "2026-06-15T12:08:00.000Z",
            payload: {
              tenant_id: seed.tenantB.id,
              item_id: "inv-item-safety-cone",
              quantity: 1,
            },
          },
        ],
      },
    });

    assert.equal(invalidEnvelope.status, 400);
    assert.equal(invalidEnvelope.body.error.reason, "invalid_envelope");
    assert.equal(missingTenant.status, 403);
    assert.equal(missingTenant.body.error.reason, "tenant_required");
    assert.equal(missingPermission.status, 403);
    assert.equal(missingPermission.body.error.reason, "permission_required");
    assert.equal(tenantSpoof.status, 200);
    assert.equal(tenantSpoof.body.data.tenant_id, seed.tenantA.id);
    assert.equal(tenantSpoof.body.data.summary.accepted, 1);
    assert.equal(JSON.stringify(tenantSpoof.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(invalidEnvelope.body);
    assertNoStackTrace(missingTenant.body);
    assertNoStackTrace(missingPermission.body);
    assertNoStackTrace(tenantSpoof.body);
  });
});

test("permission error contract uses stable message for one or many required permissions", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const roles = await requestJson(baseUrl, "/api/v1/roles", {
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
    });
    const checklistRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
      body: {},
    });

    assert.equal(roles.status, 403);
    assert.equal(roles.body.error.reason, "permission_required");
    assert.equal(roles.body.error.message, "One of these permissions is required: roles.manage.");
    assert.equal(checklistRun.status, 403);
    assert.equal(checklistRun.body.error.reason, "permission_required");
    assert.equal(checklistRun.body.error.message, "One of these permissions is required: checklist_runs:create.");
    assertNoStackTrace(roles.body);
    assertNoStackTrace(checklistRun.body);
  });
});

async function withMobileContractApi(
  callback: (context: ApiContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const { createApp } = await import("../src/app.js");
  const { resetChecklistRuntimeForTests } = await import("../src/modules/checklists/index.js");
  const { resetMobileChecklistSyncRuntimeForTests } = await import("../src/modules/mobile/mobile-checklist-sync.js");
  const { resetMobileInventoryRuntimeForTests } = await import("../src/modules/mobile/mobile-inventory-sync.js");
  const { resetMobileWorkOrderSyncRuntimeForTests } = await import("../src/modules/mobile/mobile-work-order-sync.js");
  const { resetWorkOrderRuntimeForTests } = await import("../src/modules/work-orders/index.js");
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(registry);
  const app = createApp(new MemoryCoreSaasAdapter(registry));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  resetChecklistRuntimeForTests();
  resetMobileChecklistSyncRuntimeForTests();
  resetMobileInventoryRuntimeForTests();
  resetMobileWorkOrderSyncRuntimeForTests();
  resetWorkOrderRuntimeForTests();

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
  }
}

async function createChecklistRunForSync(
  baseUrl: string,
  seed: SeedData,
  headers: Record<string, string>,
) {
  const create = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers,
    body: {
      name: "Mobile checklist sync template",
      type: "technical_evidence",
      schema: { source: "mobile_contract_test" },
      components: [
        {
          componentKey: "condition_note",
          type: "observation",
          label: "Condition note",
          required: true,
          config: {},
          validationRules: {},
          visibilityRules: {},
        },
      ],
    },
  });

  assert.equal(create.status, 201);

  const publish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${create.body.data.id}/publish`, {
    method: "POST",
    headers,
    body: {},
  });

  assert.equal(publish.status, 200);

  const run = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
    method: "POST",
    headers,
    body: {
      checklistId: publish.body.data.id,
      relatedEntityType: "work_order",
      relatedEntityId: "local-work-order-1",
      answers: [],
    },
  });

  assert.equal(run.status, 201);

  return {
    runId: run.body.data.id as string,
    componentId: publish.body.data.components[0].id as string,
    tenantId: seed.tenantA.id,
  };
}

function seedCoreSaas(service: CoreSaasRegistry): SeedData {
  const tenantA = service.createTenant({
    name: "Mobile Tenant A",
    modules: [
      "dashboard",
      "mobile",
      "work_orders",
      "tenant_checklist",
      "expense_management",
      "inventory",
      "notifications",
      "field_operations",
    ],
  });
  const tenantB = service.createTenant({
    name: "Mobile Tenant B",
    modules: ["dashboard", "mobile"],
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Mobile Admin",
    email: "mobile-admin@example.com",
    roles: ["tenant_admin"],
  });

  return { tenantA, tenantB, adminA };
}

function authHeaders(
  tenant: Tenant,
  user: User,
  role: string,
): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: Record<string, unknown>;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function assertNoStackTrace(body: unknown): void {
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes("stack"), false);
  assert.equal(serialized.includes("node_modules"), false);
  assert.equal(serialized.includes("at "), false);
}

function findCatalogEndpoint(
  body: { readonly data: { readonly catalogs: { readonly endpoints: { readonly items: readonly Array<{ readonly key: string; readonly status: string }> } } } },
  key: string,
) {
  const endpoint = body.data.catalogs.endpoints.items.find((item) => item.key === key);

  assert.notEqual(endpoint, undefined);

  return endpoint as { readonly key: string; readonly status: string };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
