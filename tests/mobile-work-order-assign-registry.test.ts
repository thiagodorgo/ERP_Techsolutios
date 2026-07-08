import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// D1 — Selecao de viatura/equipe na atribuicao de OS.
// The `work_order.assign` action (mobile sync + REST) gains optional vehicle_id/
// team_id. When present, each reference is validated tenant-scoped via the same B1
// resolvers used on create, and the OS vehicle_id/team_id FKs are set. When absent,
// the existing operator/user assign behavior is unchanged. Permission stays
// work_orders:assign (D-009).

test("[mobile-sync] work_order.assign com vehicle_id e team_id valida e grava os FKs da OS", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const vehicle = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "ABC1D23", model: "Guincho Pesado" },
    });
    const team = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe Guincho Norte" },
    });
    const os = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS para atribuir com viatura/equipe" },
    });
    const vehicleId = vehicle.body.data.id as string;
    const teamId = team.body.data.id as string;
    const workOrderId = os.body.data.id as string;

    const sync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        client_batch_id: "d1-assign-batch-1",
        actions: [
          {
            client_action_id: "d1-assign-1",
            type: "work_order.assign",
            local_created_at: "2026-07-07T12:00:00.000Z",
            payload: {
              work_order_id: workOrderId,
              operator_id: randomUUID(),
              vehicle_id: vehicleId,
              team_id: teamId,
              message: "Atribuido com viatura e equipe no app.",
            },
          },
        ],
      },
    });

    // Detail (C2) exposes the resolved links from the FKs the assign set.
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(sync.status, 200);
    assert.equal(sync.body.data.summary.accepted, 1);
    assert.equal(sync.body.data.accepted[0].server_state.status, "assigned");
    assert.equal(sync.body.data.accepted[0].server_state.vehicleId, vehicleId);
    assert.equal(sync.body.data.accepted[0].server_state.teamId, teamId);

    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.vehicleId, vehicleId);
    assert.equal(detail.body.data.teamId, teamId);
    assert.equal(detail.body.data.links.vehicle.id, vehicleId);
    assert.equal(detail.body.data.links.vehicle.plate, "ABC1D23");
    assert.equal(detail.body.data.links.team.id, teamId);
    assert.equal(detail.body.data.links.team.name, "Equipe Guincho Norte");
  });
});

test("[mobile-sync] work_order.assign com vehicle_id inexistente/cross-tenant retorna 400 invalid_vehicle_reference", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const missingOs = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS com viatura inexistente" },
    });
    const crossOs = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS com viatura de outra org" },
    });
    // A vehicle owned by tenant B must not resolve for tenant A.
    const vehicleB = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { plate: "BBB2C33", model: "Veiculo da Org B" },
    });

    const missing = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        client_batch_id: "d1-assign-invalid-batch",
        actions: [
          {
            client_action_id: "d1-assign-missing-vehicle",
            type: "work_order.assign",
            payload: {
              work_order_id: missingOs.body.data.id,
              operator_id: randomUUID(),
              vehicle_id: randomUUID(),
            },
          },
          {
            client_action_id: "d1-assign-cross-vehicle",
            type: "work_order.assign",
            payload: {
              work_order_id: crossOs.body.data.id,
              operator_id: randomUUID(),
              vehicle_id: vehicleB.body.data.id,
            },
          },
        ],
      },
    });

    assert.equal(missing.status, 200);
    assert.equal(missing.body.data.summary.accepted, 0);
    assert.equal(missing.body.data.summary.rejected, 2);
    assert.equal(missing.body.data.rejected[0].error.reason, "invalid_vehicle_reference");
    assert.equal(missing.body.data.rejected[1].error.reason, "invalid_vehicle_reference");
    // No tenant B id leaks into the safe response envelope.
    assert.equal(JSON.stringify(missing.body).includes(seed.tenantB.id), false);
  });
});

test("[mobile-sync][regressao] work_order.assign sem viatura/equipe mantem o comportamento existente", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const os = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS atribuida sem viatura/equipe" },
    });
    const operatorId = randomUUID();

    const sync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        client_batch_id: "d1-assign-plain-batch",
        actions: [
          {
            client_action_id: "d1-assign-plain-1",
            type: "work_order.assign",
            payload: {
              work_order_id: os.body.data.id,
              operator_id: operatorId,
              message: "Atribuido sem viatura nem equipe.",
            },
          },
        ],
      },
    });

    assert.equal(sync.status, 200);
    assert.equal(sync.body.data.summary.accepted, 1);
    assert.equal(sync.body.data.accepted[0].server_state.status, "assigned");
    assert.equal(sync.body.data.accepted[0].server_state.assignedOperatorId, operatorId);
    // The FKs stay null: the assign never touches them when absent.
    assert.equal(sync.body.data.accepted[0].server_state.vehicleId, null);
    assert.equal(sync.body.data.accepted[0].server_state.teamId, null);
  });
});

test("[mobile-sync] work_order.assign continua exigindo work_orders:assign (D-009)", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const os = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS que o operador nao pode atribuir" },
    });

    // operator has work_orders:status (so the envelope passes) but NOT
    // work_orders:assign, so the assign action is rejected per-action.
    const sync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        client_batch_id: "d1-assign-perm-batch",
        actions: [
          {
            client_action_id: "d1-assign-perm-1",
            type: "work_order.assign",
            payload: {
              work_order_id: os.body.data.id,
              operator_id: randomUUID(),
            },
          },
        ],
      },
    });

    assert.equal(sync.status, 200);
    assert.equal(sync.body.data.summary.rejected, 1);
    assert.equal(sync.body.data.rejected[0].error.reason, "permission_required");
  });
});

test("[rest] POST /work-orders/:id/assign aceita vehicleId/teamId e grava os FKs", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const vehicle = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "XYZ9K88", model: "Prancha" },
    });
    const team = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Equipe REST" },
    });
    const os = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS atribuida via REST com viatura/equipe" },
    });
    const vehicleId = vehicle.body.data.id as string;
    const teamId = team.body.data.id as string;
    const workOrderId = os.body.data.id as string;

    const assigned = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/assign`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        operatorId: randomUUID(),
        vehicleId,
        teamId,
        message: "Atribuido via REST.",
      },
    });
    const forbidden = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/assign`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { operatorId: randomUUID(), vehicleId, teamId },
    });

    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.data.status, "assigned");
    assert.equal(assigned.body.data.vehicleId, vehicleId);
    assert.equal(assigned.body.data.teamId, teamId);
    // Permission still enforced at the REST route.
    assert.equal(forbidden.status, 403);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
};

type RegistryApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withRegistryApi(callback: (context: RegistryApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetCustomerRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetTeamRuntimeForTests },
    { resetServiceCatalogRuntimeForTests },
    { resetMobileWorkOrderSyncRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/customers/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/teams/index.js"),
    import("../src/modules/service-catalog/index.js"),
    import("../src/modules/mobile/mobile-work-order-sync.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetWorkOrderRuntimeForTests();
    resetCustomerRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetTeamRuntimeForTests();
    resetServiceCatalogRuntimeForTests();
    resetMobileWorkOrderSyncRuntimeForTests();
  };

  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetAll();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Assign A",
    modules: ["dashboard", "mobile", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Assign B",
    modules: ["dashboard", "mobile", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "assign-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "assign-manager-b@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "assign-operator-a@example.com",
    roles: ["operator"],
  });

  return { tenantA, tenantB, managerA, managerB, operatorA };
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
