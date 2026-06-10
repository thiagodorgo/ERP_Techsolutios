import assert from "node:assert/strict";
import test from "node:test";

type FetchCall = {
  readonly url: string;
  readonly init: RequestInit;
};

test("dispatches adapter normaliza payload, enriquece com OS e filtra por prioridade", async () => {
  const {
    adaptDispatchesResponse,
    calculateDispatchesSummary,
    enrichDispatchesWithWorkOrders,
    filterDispatches,
    getDispatchStatusLabel,
  } = await import("../src/modules/operations/dispatches/dispatches.adapter");

  const data = adaptDispatchesResponse({
    items: [
      {
        id: "dispatch-1",
        work_order_id: "wo-1",
        operator_user_id: "usr-1",
        status: "on_route",
        observation: "Em deslocamento",
        created_at: "2026-06-09T12:00:00.000Z",
      },
      {
        id: "invalid",
        status: "unknown",
      },
    ],
    pagination: {
      total: 1,
      limit: 20,
      offset: 0,
    },
  });

  const enriched = enrichDispatchesWithWorkOrders(data.items, [
    {
      id: "wo-1",
      code: "OS-000777",
      title: "Atendimento urgente",
      status: "assigned",
      priority: "urgent",
      assignedOperatorId: "usr-1",
      assignedUserId: "usr-1",
      createdAt: "2026-06-09T11:00:00.000Z",
    },
  ]);
  const filtered = filterDispatches(enriched, {
    search: "OS-000777",
    status: "all",
    priority: "urgent",
    operatorUserId: "",
  });
  const summary = calculateDispatchesSummary(enriched);

  assert.equal(data.items.length, 1);
  assert.equal(enriched[0].workOrderCode, "OS-000777");
  assert.equal(enriched[0].priority, "urgent");
  assert.equal(filtered.length, 1);
  assert.equal(summary.inRoute, 1);
  assert.equal(summary.urgent, 1);
  assert.equal(getDispatchStatusLabel("on_route"), "Em deslocamento");
});

test("operations map adapter vincula despacho por operador e OS atual", async () => {
  const { attachDispatchesToFieldLocations } = await import("../src/modules/operations/map/operations-map.adapter");
  const [location] = attachDispatchesToFieldLocations(
    [
      {
        id: "loc-1",
        operatorId: "usr-1",
        userId: "usr-1",
        displayName: "Operador 1",
        status: "on_route",
        latitude: -23.55,
        longitude: -46.63,
        capturedAt: "2026-06-09T12:00:00.000Z",
        isStale: false,
        currentWorkOrder: {
          id: "wo-1",
          code: "OS-000777",
          title: "Atendimento urgente",
          status: "assigned",
          priority: "urgent",
        },
      },
    ],
    [
      {
        id: "dispatch-1",
        workOrderId: "wo-1",
        operatorUserId: "usr-1",
        status: "on_route",
        priority: "urgent",
        createdAt: "2026-06-09T11:00:00.000Z",
      },
    ],
  );

  assert.equal(location.currentDispatch?.id, "dispatch-1");
  assert.equal(location.currentDispatch?.status, "on_route");
});

test("dispatches service usa endpoints de status, cancelamento e reatribuicao", async () => {
  const previousUseMocks = process.env.VITE_USE_MOCKS;
  const previousApiBaseUrl = process.env.VITE_API_BASE_URL;
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  const calls: FetchCall[] = [];

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          data: {
            id: "dispatch-1",
            workOrderId: "wo-1",
            operatorUserId: "usr-2",
            status: "on_route",
            priority: "medium",
            createdAt: "2026-06-10T12:00:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    },
  });

  const { reassignDispatch, updateDispatchStatus } = await import("../src/modules/operations/dispatches/dispatches.service");
  const context = {
    token: "jwt-test-token",
    tenantId: "tenant-a",
    role: "Gestor Operacional",
    permissions: ["field_dispatch:update", "field_dispatch:cancel", "field_dispatch:reassign"],
  };

  await updateDispatchStatus(context, "dispatch-1", { status: "on_route", observation: "Pelo mapa" });
  await updateDispatchStatus(context, "dispatch-1", { status: "cancelled", observation: "Pelo mapa", reason: "Cliente indisponivel" });
  await reassignDispatch(context, "dispatch-1", { operatorUserId: "usr-2", observation: "Pelo mapa", reason: "Balanceamento" });

  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, "/api/v1/operations/dispatches/dispatch-1/status");
  assert.equal(calls[1].url, "/api/v1/operations/dispatches/dispatch-1/status");
  assert.equal(calls[2].url, "/api/v1/operations/dispatches/dispatch-1/reassign");
  assert.equal(calls[0].init.method, "PATCH");
  assert.equal(calls[2].init.method, "PATCH");
  assert.match(String(calls[1].init.body), /"status":"cancelled"/);
  assert.match(String(calls[1].init.body), /"reason":"Cliente indisponivel"/);
  assert.match(String(calls[2].init.body), /"operatorUserId":"usr-2"/);
  if (previousUseMocks === undefined) {
    delete process.env.VITE_USE_MOCKS;
  } else {
    process.env.VITE_USE_MOCKS = previousUseMocks;
  }
  if (previousApiBaseUrl === undefined) {
    delete process.env.VITE_API_BASE_URL;
  } else {
    process.env.VITE_API_BASE_URL = previousApiBaseUrl;
  }
});
