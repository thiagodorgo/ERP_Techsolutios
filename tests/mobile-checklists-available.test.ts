// B-101 — Backend Mobile Checklist Available Endpoint
//
// Covers GET /api/v1/mobile/checklists/available: route availability, auth/tenant
// rules, the Flutter B-100 contract (title/schema_version/status + items/meta
// envelope), tenant isolation, published-only filtering, and empty stability.

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
  readonly adminB: User;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

const AVAILABLE_PATH = "/api/v1/mobile/checklists/available";

test("mobile checklists available returns published templates in the Flutter B-100 contract", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const created = await publishTemplate(baseUrl, headers, "Inspecao de Seguranca");

    const response = await requestJson(baseUrl, AVAILABLE_PATH, { headers });

    assert.equal(response.status, 200);
    assert.notEqual(response.status, 404);
    assert.ok(Array.isArray(response.body.data));
    assert.ok(Array.isArray(response.body.items));
    assert.deepEqual(response.body.data, response.body.items);
    assert.equal(response.body.meta.source, "backend");
    assert.equal(response.body.meta.count, response.body.items.length);
    assert.equal(Number.isNaN(Date.parse(response.body.meta.generated_at)), false);

    const item = response.body.items.find((entry: { id: string }) => entry.id === created.id);
    assert.notEqual(item, undefined);
    assert.equal(item.id, created.id);
    assert.equal(item.tenant_id, seed.tenantA.id);
    assert.equal(item.title, "Inspecao de Seguranca");
    assert.equal(item.name, "Inspecao de Seguranca");
    // published is normalized to "active" so the Flutter activeTemplates filter keeps it.
    assert.equal(item.status, "active");
    assert.equal(typeof item.version, "number");
    assert.equal(item.schema_version, `v${item.version}`);
    assert.equal(item.is_required, false);
    assert.equal(Number.isNaN(Date.parse(item.updated_at)), false);
    assert.ok(Array.isArray(item.items));
    assert.equal(item.items[0].label, "O local esta seguro?");
    assert.equal(item.items[0].required, true);
    assertNoStackTrace(response.body);
  });
});

test("mobile checklists available returns a stable empty envelope when there are no published templates", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantB, seed.adminB, "tenant_admin");

    const response = await requestJson(baseUrl, AVAILABLE_PATH, { headers });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
    assert.deepEqual(response.body.items, []);
    assert.equal(response.body.meta.count, 0);
    assert.equal(response.body.meta.source, "backend");
    assertNoStackTrace(response.body);
  });
});

test("mobile checklists available only exposes published templates, not drafts", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const draft = await createTemplate(baseUrl, headers, "Rascunho nao publicado");
    const published = await publishTemplate(baseUrl, headers, "Publicado");

    const response = await requestJson(baseUrl, AVAILABLE_PATH, { headers });

    assert.equal(response.status, 200);
    const ids = response.body.items.map((entry: { id: string }) => entry.id);
    assert.equal(ids.includes(published.id), true);
    assert.equal(ids.includes(draft.id), false);
    assertNoStackTrace(response.body);
  });
});

test("mobile checklists available isolates templates by tenant", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const headersA = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const headersB = authHeaders(seed.tenantB, seed.adminB, "tenant_admin");
    const templateA = await publishTemplate(baseUrl, headersA, "Somente Tenant A");

    const responseB = await requestJson(baseUrl, AVAILABLE_PATH, { headers: headersB });

    assert.equal(responseB.status, 200);
    const idsB = responseB.body.items.map((entry: { id: string }) => entry.id);
    assert.equal(idsB.includes(templateA.id), false);
    assert.equal(JSON.stringify(responseB.body).includes(seed.tenantA.id), false);
    assertNoStackTrace(responseB.body);
  });
});

test("mobile checklists available enforces authentication, tenant and permission", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const missingTenant = await requestJson(baseUrl, AVAILABLE_PATH, {
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
    });
    const missingPermission = await requestJson(baseUrl, AVAILABLE_PATH, {
      headers: {
        ...authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        "x-permissions": "work_orders:read",
      },
    });
    const readOnly = await requestJson(baseUrl, AVAILABLE_PATH, {
      headers: {
        ...authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
        "x-permissions": "checklist_runs:read",
      },
    });

    assert.equal(missingTenant.status, 403);
    assert.equal(missingTenant.body.error.reason, "tenant_required");
    assert.equal(missingPermission.status, 403);
    assert.equal(missingPermission.body.error.reason, "permission_required");
    assert.equal(readOnly.status, 200);
    assert.ok(Array.isArray(readOnly.body.items));
    assertNoStackTrace(missingTenant.body);
    assertNoStackTrace(missingPermission.body);
    assertNoStackTrace(readOnly.body);
  });
});

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

async function withApi(callback: (context: ApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const { createApp } = await import("../src/app.js");
  const { resetChecklistRuntimeForTests } = await import("../src/modules/checklists/index.js");
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(registry);
  const app = createApp(new MemoryCoreSaasAdapter(registry));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  resetChecklistRuntimeForTests();

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
  }
}

async function createTemplate(
  baseUrl: string,
  headers: Record<string, string>,
  name: string,
): Promise<{ readonly id: string }> {
  const create = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers,
    body: {
      name,
      type: "technical_evidence",
      schema: { source: "b101_contract_test" },
      components: [
        {
          componentKey: "safety_ok",
          type: "observation",
          label: "O local esta seguro?",
          required: true,
          config: {},
          validationRules: {},
          visibilityRules: {},
        },
      ],
    },
  });

  assert.equal(create.status, 201);

  return { id: create.body.data.id as string };
}

async function publishTemplate(
  baseUrl: string,
  headers: Record<string, string>,
  name: string,
): Promise<{ readonly id: string }> {
  const created = await createTemplate(baseUrl, headers, name);
  const publish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${created.id}/publish`, {
    method: "POST",
    headers,
    body: {},
  });

  assert.equal(publish.status, 200);

  return { id: created.id };
}

function seedCoreSaas(service: CoreSaasRegistry): SeedData {
  const modules = ["dashboard", "mobile", "work_orders", "tenant_checklist"];
  const tenantA = service.createTenant({ name: "Checklist Tenant A", modules });
  const tenantB = service.createTenant({ name: "Checklist Tenant B", modules });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Checklist Admin A",
    email: "checklist-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Checklist Admin B",
    email: "checklist-admin-b@example.com",
    roles: ["tenant_admin"],
  });

  return { tenantA, tenantB, adminA, adminB };
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
