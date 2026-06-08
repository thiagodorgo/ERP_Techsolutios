import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("notification routes expose only the authenticated user's inbox", async () => {
  await withNotificationApi(async ({ baseUrl, seed, service }) => {
    const own = await service.createNotification({
      tenantId: seed.tenantA.id,
      recipientUserId: seed.adminA.id,
      type: "checklist_run.completed",
      title: "Checklist concluido",
      message: "Execucao concluida.",
      severity: "success",
      metadata: {
        storageKey: "private",
      },
    });
    await service.createNotification({
      tenantId: seed.tenantA.id,
      recipientUserId: seed.operatorA.id,
      type: "checklist_run.divergence_reported",
      title: "Outra inbox",
      message: "Nao deve aparecer.",
      severity: "warning",
    });
    await service.createNotification({
      tenantId: seed.tenantB.id,
      recipientUserId: seed.adminB.id,
      type: "checklist_run.completed",
      title: "Outro tenant",
      message: "Nao deve aparecer.",
    });

    const withoutTenant = await requestJson(baseUrl, "/api/v1/notifications", {
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
    });
    const withoutPermission = await requestJson(baseUrl, "/api/v1/notifications", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin", ["os.read"]),
    });
    const list = await requestJson(baseUrl, "/api/v1/notifications", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    const unread = await requestJson(baseUrl, "/api/v1/notifications/unread-count", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    const crossUserRead = await requestJson(baseUrl, `/api/v1/notifications/${own.id}/read`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });
    const markRead = await requestJson(baseUrl, `/api/v1/notifications/${own.id}/read`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    const unreadAfterRead = await requestJson(baseUrl, "/api/v1/notifications/unread-count", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });

    assert.equal(withoutTenant.status, 403);
    assert.equal(withoutTenant.body.error.reason, "tenant_required");
    assert.equal(withoutPermission.status, 403);
    assert.equal(withoutPermission.body.error.reason, "permission_required");
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].id, own.id);
    assert.equal(list.body.data[0].recipientUserId, undefined);
    assert.deepEqual(list.body.data[0].metadata, { storageKey: "[REDACTED]" });
    assert.equal(unread.status, 200);
    assert.equal(unread.body.data.count, 1);
    assert.equal(crossUserRead.status, 404);
    assert.equal(crossUserRead.body.error.reason, "notification_not_found");
    assert.equal(markRead.status, 200);
    assert.equal(markRead.body.data.status, "read");
    assert.equal(unreadAfterRead.body.data.count, 0);
  });
});

test("notification routes mark all as read and archive own notifications", async () => {
  await withNotificationApi(async ({ baseUrl, seed, service }) => {
    const first = await service.createNotification({
      tenantId: seed.tenantA.id,
      recipientUserId: seed.adminA.id,
      type: "one",
      title: "One",
      message: "One",
    });
    await service.createNotification({
      tenantId: seed.tenantA.id,
      recipientUserId: seed.adminA.id,
      type: "two",
      title: "Two",
      message: "Two",
    });

    const readAll = await requestJson(baseUrl, "/api/v1/notifications/read-all", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    const archive = await requestJson(baseUrl, `/api/v1/notifications/${first.id}/archive`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    const archivedList = await requestJson(baseUrl, "/api/v1/notifications?status=archived", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });

    assert.equal(readAll.status, 200);
    assert.equal(readAll.body.data.updated, 2);
    assert.equal(archive.status, 200);
    assert.equal(archive.body.data.status, "archived");
    assert.equal(archivedList.status, 200);
    assert.equal(archivedList.body.data.length, 1);
    assert.equal(archivedList.body.data[0].id, first.id);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
  readonly operatorA: User;
};

type NotificationApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly service: import("../src/modules/notifications/index.js").NotificationService;
};

async function withNotificationApi(callback: (context: NotificationApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetNotificationRuntimeForTests, createMemoryNotificationService },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/notifications/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetNotificationRuntimeForTests();

  const service = createMemoryNotificationService();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
      service,
    });
  } finally {
    await closeServer(server);
    resetNotificationRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Notifications A",
  });
  const tenantB = service.createTenant({
    name: "Tenant Notifications B",
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "notifications-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin B",
    email: "notifications-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "notifications-operator-a@example.com",
    roles: ["operator"],
  });

  return {
    tenantA,
    tenantB,
    adminA,
    adminB,
    operatorA,
  };
}

function authHeaders(
  tenant: Tenant,
  user: User,
  role = "tenant_admin",
  permissions?: readonly string[],
): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
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
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
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
