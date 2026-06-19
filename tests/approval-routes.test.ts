import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("approval routes listam, aprovam, rejeitam e aplicam RBAC/tenant", async () => {
  await withApprovalApi(async ({ baseUrl, seed, approvalService }) => {
    const workOrderId = randomUUID();
    const approvalA = await approvalService.request({
      tenantId: seed.tenantA.id,
      entityType: "work_order",
      entityId: workOrderId,
      workOrderId,
      requestedByUserId: seed.managerA.id,
      pendingReason: "OS concluida.",
    });
    const approvalB = await approvalService.request({
      tenantId: seed.tenantA.id,
      entityType: "evidence",
      entityId: "evidence-public-ref",
      workOrderId,
      requestedByUserId: seed.managerA.id,
      pendingReason: "Evidencia armazenada.",
    });

    const listed = await requestJson(baseUrl, `/api/v1/approvals/pending?work_order_id=${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const detailed = await requestJson(baseUrl, `/api/v1/approvals/${approvalA.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const forbidden = await requestJson(baseUrl, `/api/v1/approvals/${approvalA.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: {},
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/approvals/${approvalA.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    const rejectWithoutReason = await requestJson(baseUrl, `/api/v1/approvals/${approvalB.id}/reject`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {},
    });
    const approved = await requestJson(baseUrl, `/api/v1/approvals/${approvalA.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { note: "Conferido com evidencias." },
    });
    const rejected = await requestJson(baseUrl, `/api/v1/approvals/${approvalB.id}/reject`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "Foto obrigatoria ausente." },
    });
    const secondDecision = await requestJson(baseUrl, `/api/v1/approvals/${approvalA.id}/reject`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { reason: "Tentativa duplicada." },
    });

    assert.equal(listed.status, 200);
    assert.equal(listed.body.data.length, 2);
    assert.equal(detailed.body.data.status, "pending_approval");
    assert.equal(forbidden.status, 403);
    assert.equal(crossTenant.status, 404);
    assert.equal(rejectWithoutReason.status, 400);
    assert.equal(rejectWithoutReason.body.error.reason, "required_field");
    assert.equal(approved.body.data.status, "approved");
    assert.equal(approved.body.data.safe_message, "Aprovacao registrada.");
    assert.equal(rejected.body.data.status, "rejected");
    assert.equal(rejected.body.data.safe_message, "Reprovacao registrada.");
    assert.equal(secondDecision.status, 409);
    assert.equal(secondDecision.body.error.reason, "approval_already_decided");

    for (const response of [listed, detailed, approved, rejected, secondDecision]) {
      const serialized = JSON.stringify(response.body);
      for (const unsafe of ["Authorization", "Bearer", "accessToken", "refreshToken", "base64", "file_data", "local_path", "storage_key", "storageKey", "bucket", "stack"]) {
        assert.equal(serialized.includes(unsafe), false);
      }
    }
  });
});

test("conclusao de OS cria pendencia operacional idempotente", async () => {
  await withApprovalApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.managerA, "manager");
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers,
      body: { title: "OS pronta para aprovacao" },
    });
    const workOrderId = created.body.data.id;
    await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/assign`, {
      method: "POST",
      headers,
      body: { operatorId: randomUUID(), userId: randomUUID() },
    });
    for (const status of ["accepted", "on_route", "on_site", "in_progress", "completed"]) {
      const response = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/status`, {
        method: "PATCH",
        headers,
        body: { status },
      });
      assert.equal(response.status, 200);
    }

    const pending = await requestJson(baseUrl, `/api/v1/approvals/pending?work_order_id=${workOrderId}`, {
      headers,
    });
    assert.equal(pending.status, 200);
    assert.equal(pending.body.data.length, 1);
    assert.equal(pending.body.data[0].entity_type, "work_order");
    assert.equal(pending.body.data[0].entity_id, workOrderId);
    assert.equal(pending.body.data[0].status, "pending_approval");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly viewerA: User;
};

async function withApprovalApi(
  callback: (context: {
    readonly baseUrl: string;
    readonly seed: SeedData;
    readonly approvalService: Awaited<ReturnType<typeof import("../src/modules/work-orders/approval.service.js")["createDefaultApprovalService"]>>;
  }) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createApp },
    approvalModule,
    notificationModule,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  approvalModule.resetApprovalRuntimeForTests();
  notificationModule.resetNotificationRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
      approvalService: await approvalModule.createDefaultApprovalService(),
    });
  } finally {
    await closeServer(server);
    approvalModule.resetApprovalRuntimeForTests();
    notificationModule.resetNotificationRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Approval A", modules: ["work_orders"] });
  const tenantB = service.createTenant({ name: "Approval B", modules: ["work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "approval-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "approval-b@example.com", roles: ["manager"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "approval-viewer@example.com", roles: ["viewer"] });
  return { tenantA, tenantB, managerA, managerB, viewerA };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
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
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
