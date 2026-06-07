import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("checklist routes cover tenant templates, runs, divergence and acknowledgement", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const components = await requestJson(baseUrl, "/api/v1/tenant/checklist-components", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(components.status, 200);
    assert.deepEqual(
      components.body.data.map((component: { type: string }) => component.type),
      [
        "vehicle_selector",
        "damage_map",
        "photo_upload",
        "observation",
        "comparison",
        "acknowledgement",
        "before_after",
      ],
    );

    const createDraft = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        tenant_id: seed.tenantB.id,
        name: "Coleta guincho",
        description: "Checklist M10",
        type: "towing_collection",
        schema: {
          vehicleImage: "dynamic_by_type",
        },
        components: [
          {
            componentKey: "vehicle",
            type: "vehicle_selector",
            label: "Veiculo",
            required: true,
          },
          {
            componentKey: "photos",
            type: "photo_upload",
            label: "Fotos",
            required: true,
            config: {
              minPhotos: 1,
            },
          },
          {
            componentKey: "damage",
            type: "damage_map",
            label: "Avarias",
            required: false,
          },
          {
            componentKey: "observation",
            type: "observation",
            label: "Observacao",
            required: false,
          },
          {
            componentKey: "ack",
            type: "acknowledgement",
            label: "Ciencia",
            required: true,
          },
        ],
      },
    });

    assert.equal(createDraft.status, 201);
    assert.equal(createDraft.body.data.tenantId, seed.tenantA.id);
    assert.equal(createDraft.body.data.status, "draft");

    const checklistId = createDraft.body.data.id as string;
    const photoComponentId = findComponentId(createDraft.body.data, "photo_upload");

    const unpublishedRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        checklistId,
      },
    });
    assert.equal(unpublishedRun.status, 409);
    assert.equal(unpublishedRun.body.error.reason, "checklist_not_published");

    const tenantBAccess = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}`, {
      headers: authHeaders(seed.tenantB, seed.adminB),
    });
    assert.equal(tenantBAccess.status, 404);

    const listA = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(listA.status, 200);
    assert.equal(listA.body.data.length, 1);

    const publish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklistId}/publish`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(publish.status, 200);
    assert.equal(publish.body.data.status, "published");

    const render = await requestJson(baseUrl, `/api/v1/mobile/checklists/${checklistId}/render`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(render.status, 200);
    assert.equal(render.body.data.type, "towing_collection");
    assert.equal(render.body.data.components.length, 5);

    const createRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        checklistId,
        relatedEntityType: "work_order",
        relatedEntityId: "os_123",
        answers: [
          {
            componentId: render.body.data.components[0].id,
            value: {
              vehicleType: "car",
            },
          },
        ],
      },
    });
    assert.equal(createRun.status, 201);
    assert.equal(createRun.body.data.status, "in_progress");

    const runId = createRun.body.data.id as string;

    const attachment = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: photoComponentId,
        fileUrl: "https://storage.example/checklists/photo-1.jpg",
        fileName: "photo-1.jpg",
        mimeType: "image/jpeg",
      },
    });
    assert.equal(attachment.status, 201);

    const marker = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/markers`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: findComponentId(createDraft.body.data, "damage_map"),
        x: 0.32,
        y: 0.48,
        markerType: "scratch",
        description: "Risco lateral",
      },
    });
    assert.equal(marker.status, 201);

    const divergenceWithoutObservation = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/divergence`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: photoComponentId,
        fileUrl: "https://storage.example/checklists/divergence.jpg",
      },
    });
    assert.equal(divergenceWithoutObservation.status, 400);

    const divergence = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/divergence`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        componentId: photoComponentId,
        fileUrl: "https://storage.example/checklists/divergence.jpg",
        observation: "Divergencia encontrada na entrega.",
      },
    });
    assert.equal(divergence.status, 200);
    assert.equal(divergence.body.data.run.status, "pending_acknowledgement");

    const comparison = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/comparison`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });
    assert.equal(comparison.status, 200);
    assert.equal(comparison.body.data.comparison.divergence, true);

    const acknowledgement = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/acknowledgement`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        message: "Estou ciente da responsabilidade pela divergencia.",
      },
    });
    assert.equal(acknowledgement.status, 201);
    assert.equal(acknowledgement.body.data.run.run.status, "completed_with_divergence");
  });
});

test("checklist run can be completed without divergence", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const checklist = await createAndPublishChecklist(baseUrl, seed.tenantA, seed.adminA);
    const run = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        checklistId: checklist.id,
      },
    });

    const complete = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.body.data.id}/complete`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA),
      body: {
        hasDivergence: false,
      },
    });

    assert.equal(complete.status, 200);
    assert.equal(complete.body.data.run.status, "completed");
  });
});

async function createAndPublishChecklist(
  baseUrl: string,
  tenant: Tenant,
  user: User,
): Promise<{ id: string }> {
  const create = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: authHeaders(tenant, user),
    body: {
      name: "Evidencia tecnica",
      type: "technical_evidence",
      schema: {
        stages: ["before", "after"],
      },
      components: [
        {
          type: "before_after",
          label: "Antes e depois",
          required: true,
        },
      ],
    },
  });
  const publish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${create.body.data.id}/publish`, {
    method: "POST",
    headers: authHeaders(tenant, user),
  });

  return {
    id: publish.body.data.id as string,
  };
}

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
};

type ChecklistApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withChecklistApi(callback: (context: ChecklistApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetChecklistRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetChecklistRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
    });
  } finally {
    await closeServer(server);
    resetChecklistRuntimeForTests();
  }
}

function seedCoreSaas(service: CoreSaasRegistry): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Checklist A",
  });
  const tenantB = service.createTenant({
    name: "Tenant Checklist B",
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "checklist-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin B",
    email: "checklist-admin-b@example.com",
    roles: ["tenant_admin"],
  });

  return {
    tenantA,
    tenantB,
    adminA,
    adminB,
  };
}

function authHeaders(tenant: Tenant, user: User): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": "tenant_admin",
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

function findComponentId(template: { components: readonly { id: string; type: string }[] }, type: string): string {
  const component = template.components.find((item) => item.type === type);

  assert.ok(component);

  return component.id;
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
