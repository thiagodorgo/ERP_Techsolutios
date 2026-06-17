import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
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
    assert.equal(response.body.data.feature_flags.generic_evidence_upload.enabled, true);
    assert.equal(response.body.data.feature_flags.generic_evidence_upload.status, "partial");
    assert.equal(response.body.data.mobile_policy.auth.bearer_required, true);
    assert.equal(response.body.data.mobile_policy.auth.tenant_source, "authenticated_actor");
    assert.equal(response.body.data.mobile_policy.sync.actions_enabled, true);
    assert.deepEqual(response.body.data.mobile_policy.sync.implemented_domains, ["expenses", "work_orders"]);
    assert.deepEqual(response.body.data.mobile_policy.sync.partial_domains, ["checklists", "inventory", "evidence"]);
    assert.deepEqual(response.body.data.mobile_policy.sync.planned_domains, []);
    assert.equal(response.body.data.mobile_policy.evidence.work_order_evidence, "partial");
    assert.equal(response.body.data.mobile_policy.evidence.generic_upload, "partial");
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
    assert.equal(findCatalogEndpoint(response.body, "evidence_sync").status, "partial");
    assert.equal(findCatalogEndpoint(response.body, "evidence_upload").status, "partial");
    assert.equal(response.body.data.expenseCategories.length > 0, true);
    assert.equal(response.body.data.sync.workOrdersCursor, null);
    assert.equal(response.body.data.sync.checklistsCursor, null);
    assert.equal(response.body.data.sync.expensesCursor, null);
    assert.equal(response.body.data.sync.inventoryCursor, null);
    assert.equal(response.body.data.sync.evidenceCursor, null);
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

test("mobile backend exposes ready checklist, expense, work order, inventory, evidence and notification contracts", async () => {
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
    const evidenceSync = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers,
      body: { client_batch_id: "empty-evidence-batch", actions: [] },
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
    assert.equal(evidenceSync.status, 200);
    assert.equal(evidenceSync.body.data.contract.name, "mobile_evidence_actions_sync");
    assert.equal(evidenceSync.body.data.contract.status, "partial");
    assert.equal(evidenceSync.body.data.summary.received, 0);
    assert.deepEqual(evidenceSync.body.data.accepted, []);
    assert.deepEqual(evidenceSync.body.data.rejected, []);
    assert.deepEqual(evidenceSync.body.data.conflicts, []);
    assert.deepEqual(evidenceSync.body.data.already_applied, []);
    assert.equal(findCatalogEndpoint((await requestJson(baseUrl, "/api/v1/mobile/bootstrap", { headers })).body, "evidence_upload").status, "partial");
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
    assertNoStackTrace(evidenceSync.body);
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

test("mobile evidence sync accepts supported metadata, rejects invalid actions and isolates tenant context", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const response = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "evidence-batch-1",
        tenant_id: seed.tenantB.id,
        actions: [
          {
            client_evidence_id: "evidence-work-order-photo",
            type: "evidence.work_order_photo",
            local_created_at: "2026-06-15T12:00:00.000Z",
            payload: {
              tenant_id: seed.tenantB.id,
              work_order_id: "work-order-1",
              kind: "photo",
              file_name: "panel-before.jpg",
              content_type: "image/jpeg",
              size_bytes: 245000,
              sha256: "hash-or-placeholder",
              caption: "Before maintenance",
              gps: { lat: -23.55052, lng: -46.633308, accuracy_m: 18 },
              metadata: { tenant_id: seed.tenantB.id, source: "offline_queue" },
            },
          },
          {
            client_evidence_id: "evidence-field-observation",
            type: "evidence.field_observation",
            local_created_at: "2026-06-15T12:01:00.000Z",
            payload: {
              note: "Access gate was closed on arrival.",
              gps: { lat: -23.55, lng: -46.63 },
            },
          },
          {
            client_evidence_id: "evidence-unsupported",
            type: "evidence.video",
            local_created_at: "2026-06-15T12:02:00.000Z",
            payload: {},
          },
          {
            client_evidence_id: "evidence-invalid-photo",
            type: "evidence.field_photo",
            local_created_at: "2026-06-15T12:03:00.000Z",
            payload: {
              file_name: "missing-metadata.jpg",
              content_type: "image/jpeg",
            },
          },
          {
            client_evidence_id: "evidence-unsafe-path",
            type: "evidence.field_photo",
            local_created_at: "2026-06-15T12:04:00.000Z",
            payload: {
              file_name: "field.jpg",
              content_type: "image/jpeg",
              size_bytes: 1200,
              sha256: "field-hash",
              metadata: { local_path: "C:/private/field.jpg" },
            },
          },
        ],
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.tenant_id, seed.tenantA.id);
    assert.equal(response.body.data.contract.version, "2026-06-15.b098e");
    assert.equal(response.body.data.summary.received, 5);
    assert.equal(response.body.data.summary.accepted, 2);
    assert.equal(response.body.data.summary.rejected, 3);
    assert.equal(response.body.data.accepted[0].server_state.status, "metadata_registered");
    assert.equal(response.body.data.accepted[0].server_state.scope, "work_order");
    assert.equal(response.body.data.accepted[0].server_state.kind, "photo");
    assert.equal(response.body.data.accepted[1].server_state.scope, "field");
    assert.equal(response.body.data.rejected[0].error.reason, "unsupported_action_type");
    assert.equal(response.body.data.rejected[1].error.reason, "invalid_size_bytes");
    assert.equal(response.body.data.rejected[2].error.reason, "unsafe_payload");
    assert.equal(JSON.stringify(response.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(response.body);
  });
});

test("mobile evidence sync is idempotent by tenant, user and client evidence id", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const action = {
      client_evidence_id: "evidence-idempotent-1",
      type: "evidence.work_order_observation",
      local_created_at: "2026-06-15T13:00:00.000Z",
      payload: {
        work_order_id: "work-order-idempotency",
        note: "Equipment isolated before service.",
      },
    };
    const first = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers,
      body: { client_batch_id: "evidence-idempotency-1", actions: [action] },
    });
    const replay = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "evidence-idempotency-2",
        actions: [
          action,
          {
            ...action,
            payload: {
              work_order_id: "work-order-idempotency",
              note: "Different offline observation.",
            },
          },
        ],
      },
    });

    assert.equal(first.status, 200);
    assert.equal(first.body.data.summary.accepted, 1);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.data.summary.already_applied, 1);
    assert.equal(replay.body.data.summary.conflicts, 1);
    assert.equal(replay.body.data.already_applied[0].client_evidence_id, "evidence-idempotent-1");
    assert.equal(replay.body.data.conflicts[0].error.reason, "idempotency_payload_mismatch");
    assert.equal(replay.body.data.conflicts[0].conflict.next_action, "drop_duplicate_or_create_new_client_evidence_id");
    assertNoStackTrace(first.body);
    assertNoStackTrace(replay.body);
  });
});

test("mobile evidence sync validates envelope, actor and per-action permissions", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const missingPermission = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
      body: { actions: [] },
    });
    const invalidEnvelope = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: { actions: "not-an-array" },
    });
    const fieldOnlyHeaders = {
      ...authHeaders(seed.tenantA, seed.adminA, "technician"),
      "x-permissions": "field_location:send",
    };
    const perActionPermission = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers: fieldOnlyHeaders,
      body: {
        actions: [
          {
            client_evidence_id: "field-only-accepted",
            type: "evidence.field_observation",
            local_created_at: "2026-06-15T14:00:00.000Z",
            payload: { note: "Field observation allowed." },
          },
          {
            client_evidence_id: "work-order-rejected",
            type: "evidence.work_order_observation",
            local_created_at: "2026-06-15T14:01:00.000Z",
            payload: { work_order_id: "work-order-2", note: "Should be rejected." },
          },
        ],
      },
    });

    assert.equal(missingPermission.status, 403);
    assert.equal(missingPermission.body.error.reason, "permission_required");
    assert.equal(invalidEnvelope.status, 400);
    assert.equal(invalidEnvelope.body.error.reason, "invalid_envelope");
    assert.equal(perActionPermission.status, 200);
    assert.equal(perActionPermission.body.data.summary.accepted, 1);
    assert.equal(perActionPermission.body.data.summary.rejected, 1);
    assert.equal(perActionPermission.body.data.rejected[0].error.reason, "permission_required");
    assertNoStackTrace(missingPermission.body);
    assertNoStackTrace(invalidEnvelope.body);
    assertNoStackTrace(perActionPermission.body);
  });
});

test("mobile evidence file upload stores binary metadata safely and enforces tenant, permission and validation boundaries", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const clientEvidenceId = "woevid-local-upload-1";
    const bytes = Buffer.from("fake-jpeg-bytes");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const noMetadata = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: `evidence:${seed.tenantA.id}:woevid-local-unsynced`,
        client_evidence_id: "woevid-local-unsynced",
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "unsynced.jpg", contentType: "image/jpeg", bytes }],
    });
    const registered = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers,
      body: {
        client_batch_id: "evidence-upload-register",
        actions: [
          {
            client_evidence_id: clientEvidenceId,
            type: "evidence.work_order_photo",
            local_created_at: "2026-06-17T12:00:00.000Z",
            payload: {
              work_order_id: "work-order-upload-1",
              kind: "photo",
              file_name: "panel-before.jpg",
              content_type: "image/jpeg",
              size_bytes: bytes.length,
              sha256,
            },
          },
        ],
      },
    });

    assert.equal(registered.status, 200);
    const evidenceId = registered.body.data.accepted[0].evidence_id as string;
    const differentClientEvidenceId = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: `evidence:${seed.tenantA.id}:woevid-local-upload-different`,
        client_evidence_id: "woevid-local-upload-different",
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "different.jpg", contentType: "image/jpeg", bytes }],
    });
    const workOrderMismatch = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        work_order_id: "work-order-upload-divergent",
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "panel-before.jpg", contentType: "image/jpeg", bytes }],
    });
    const upload = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        tenant_id: seed.tenantB.id,
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        work_order_id: "work-order-upload-1",
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "../panel-before.jpg", contentType: "image/jpeg", bytes }],
    });
    const tenantSpoof = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        tenant_id: seed.tenantB.id,
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "panel-before.jpg", contentType: "image/jpeg", bytes }],
    });
    const wrongTenantEvidence = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: `evidence:${seed.tenantB.id}:${clientEvidenceId}`,
        client_evidence_id: clientEvidenceId,
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "panel-before.jpg", contentType: "image/jpeg", bytes }],
    });
    const missingPermission = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
      fields: {
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "panel-before.jpg", contentType: "image/jpeg", bytes }],
    });
    const invalidMime = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        sha256,
        size_bytes: String(bytes.length),
        content_type: "application/pdf",
      },
      files: [{ fieldName: "file", fileName: "panel-before.pdf", contentType: "application/pdf", bytes }],
    });
    const checksumMismatch = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        sha256: "0".repeat(64),
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "panel-before.jpg", contentType: "image/jpeg", bytes }],
    });
    const tooLarge = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        sha256,
        size_bytes: String(10 * 1024 * 1024 + 1),
        content_type: "image/jpeg",
      },
      files: [{ fieldName: "file", fileName: "panel-before.jpg", contentType: "image/jpeg", bytes }],
    });
    const multipleFiles = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [
        { fieldName: "file", fileName: "panel-before.jpg", contentType: "image/jpeg", bytes },
        { fieldName: "file", fileName: "panel-after.jpg", contentType: "image/jpeg", bytes },
      ],
    });
    const missingFile = await requestMultipart(baseUrl, "/api/v1/mobile/evidence-uploads", {
      headers,
      fields: {
        evidence_id: evidenceId,
        client_evidence_id: clientEvidenceId,
        sha256,
        size_bytes: String(bytes.length),
        content_type: "image/jpeg",
      },
      files: [],
    });

    assert.equal(noMetadata.status, 409);
    assert.equal(noMetadata.body.error.reason, "evidence_metadata_required");
    assert.equal(differentClientEvidenceId.status, 409);
    assert.equal(differentClientEvidenceId.body.error.reason, "evidence_metadata_required");
    assert.equal(workOrderMismatch.status, 409);
    assert.equal(workOrderMismatch.body.error.reason, "work_order_mismatch");
    assert.equal(upload.status, 201);
    assert.equal(upload.body.data.contract.name, "mobile_evidence_file_upload");
    assert.equal(upload.body.data.contract.version, "2026-06-17.b104");
    assert.equal(upload.body.data.contract.status, "partial");
    assert.equal(upload.body.data.evidence_id, evidenceId);
    assert.equal(upload.body.data.status, "uploaded");
    assert.equal(upload.body.data.size_bytes, bytes.length);
    assert.equal(upload.body.data.content_type, "image/jpeg");
    assert.equal(upload.body.data.sha256, sha256);
    assert.equal(JSON.stringify(upload.body).includes("panel-before.jpg"), false);
    assert.equal(JSON.stringify(upload.body).includes("erp-mobile-evidence-uploads"), false);
    assert.equal(JSON.stringify(upload.body).includes("\\\\"), false);
    assert.equal(tenantSpoof.status, 201);
    assert.equal(tenantSpoof.body.data.evidence_id, evidenceId);
    assert.equal(wrongTenantEvidence.status, 403);
    assert.equal(wrongTenantEvidence.body.error.reason, "evidence_tenant_mismatch");
    assert.equal(missingPermission.status, 403);
    assert.equal(missingPermission.body.error.reason, "permission_required");
    assert.equal(invalidMime.status, 400);
    assert.equal(invalidMime.body.error.reason, "unsupported_content_type");
    assert.equal(checksumMismatch.status, 400);
    assert.equal(checksumMismatch.body.error.reason, "sha256_mismatch");
    assert.equal(tooLarge.status, 413);
    assert.equal(tooLarge.body.error.reason, "file_too_large");
    assert.equal(multipleFiles.status, 400);
    assert.equal(multipleFiles.body.error.reason, "too_many_files");
    assert.equal(missingFile.status, 400);
    assert.equal(missingFile.body.error.reason, "file_required");
    assertNoStackTrace(noMetadata.body);
    assertNoStackTrace(differentClientEvidenceId.body);
    assertNoStackTrace(workOrderMismatch.body);
    assertNoStackTrace(upload.body);
    assertNoStackTrace(wrongTenantEvidence.body);
    assertNoStackTrace(missingPermission.body);
    assertNoStackTrace(invalidMime.body);
    assertNoStackTrace(checksumMismatch.body);
    assertNoStackTrace(tooLarge.body);
    assertNoStackTrace(multipleFiles.body);
    assertNoStackTrace(missingFile.body);
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
  const { resetMobileEvidenceSyncRuntimeForTests } = await import("../src/modules/mobile/mobile-evidence-sync.js");
  const {
    configureMobileEvidenceUploadStorageForTests,
    resetMobileEvidenceUploadRuntimeForTests,
  } = await import("../src/modules/mobile/mobile-evidence-upload.js");
  const { resetMobileInventoryRuntimeForTests } = await import("../src/modules/mobile/mobile-inventory-sync.js");
  const { resetMobileWorkOrderSyncRuntimeForTests } = await import("../src/modules/mobile/mobile-work-order-sync.js");
  const { resetWorkOrderRuntimeForTests } = await import("../src/modules/work-orders/index.js");
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(registry);
  const app = createApp(new MemoryCoreSaasAdapter(registry));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);
  const uploadStorageRoot = path.join(tmpdir(), `erp-mobile-evidence-upload-${process.pid}-${Date.now()}`);

  resetChecklistRuntimeForTests();
  resetMobileChecklistSyncRuntimeForTests();
  resetMobileEvidenceSyncRuntimeForTests();
  configureMobileEvidenceUploadStorageForTests(uploadStorageRoot);
  await resetMobileEvidenceUploadRuntimeForTests();
  resetMobileInventoryRuntimeForTests();
  resetMobileWorkOrderSyncRuntimeForTests();
  resetWorkOrderRuntimeForTests();

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    await resetMobileEvidenceUploadRuntimeForTests();
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

async function requestMultipart(
  baseUrl: string,
  routePath: string,
  options: {
    readonly headers?: Record<string, string>;
    readonly fields: Record<string, string>;
    readonly files: readonly {
      readonly fieldName: string;
      readonly fileName: string;
      readonly contentType: string;
      readonly bytes: Buffer;
    }[];
  },
) {
  const form = new FormData();

  for (const [key, value] of Object.entries(options.fields)) {
    form.append(key, value);
  }

  for (const file of options.files) {
    form.append(file.fieldName, new Blob([file.bytes], { type: file.contentType }), file.fileName);
  }

  const response = await fetch(`${baseUrl}${routePath}`, {
    method: "POST",
    headers: options.headers,
    body: form,
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
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
