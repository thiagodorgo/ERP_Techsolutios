import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";
import type { MaintenanceOrder } from "../src/modules/fleet/maintenance/maintenance-orders.types";
import type { InsurancePolicy } from "../src/modules/fleet/insurance/insurance.types";

// F6 — Mapa Operacional REAL. Cobre D-007 (mock/erro → dataset VAZIO, nunca pins
// fabricados), stale no limiar (R6.1), vínculo OS→viatura e badges de Frota
// permission-gated (R6.4), estado vazio orientado (R6.2) e links do painel.

type FetchCall = { readonly url: string; readonly init: RequestInit };

function installFetchSequence(responses: readonly { payload: unknown; status?: number }[]) {
  const calls: FetchCall[] = [];
  let index = 0;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;

      return new Response(JSON.stringify(response.payload), {
        status: response.status ?? 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  return calls;
}

function makeLocation(partial: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "usr-1",
    userId: "usr-1",
    displayName: "Operadora Alfa",
    teamName: "Equipe Norte",
    status: "on_route",
    latitude: -23.55,
    longitude: -46.63,
    capturedAt: "2026-07-08T11:55:00.000Z",
    isStale: false,
    ...partial,
  };
}

function makeMaintenanceOrder(partial: Partial<MaintenanceOrder> & Pick<MaintenanceOrder, "id" | "vehicleId">): MaintenanceOrder {
  return {
    type: "corretiva",
    status: "em_execucao",
    scheduledFor: null,
    completedAt: null,
    cost: null,
    supplier: null,
    odometer: null,
    description: "Troca de embreagem",
    isActive: true,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T08:00:00.000Z",
    ...partial,
  };
}

function makePolicy(partial: Partial<InsurancePolicy> & Pick<InsurancePolicy, "id" | "vehicleId">): InsurancePolicy {
  return {
    seguradora: "Porto Seguro",
    numeroApolice: `AP-${partial.id}`,
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2026-12-31",
    valor: 2480,
    cobertura: null,
    status: "vigente",
    isActive: true,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...partial,
  };
}

const FULL_PERMISSIONS = [
  "field_location:read",
  "work_orders:read",
  "field_dispatch:read",
  "maintenance_orders:read",
  "insurance_policies:read",
];

test("D-007: modo mock → dataset VAZIO, sem fetch e sem pins fabricados", async () => {
  process.env.VITE_USE_MOCKS = "true";
  process.env.VITE_API_BASE_URL = "/api/v1";
  const calls = installFetchSequence([{ payload: { data: [] } }]);
  const { getLatestFieldLocations, getFieldLocationHistory } = await import("../src/modules/operations/map/operations-map.service");

  const data = await getLatestFieldLocations({ token: "jwt", permissions: FULL_PERMISSIONS });
  const history = await getFieldLocationHistory({ token: "jwt", permissions: FULL_PERMISSIONS }, { operatorUserId: "usr-1" });

  assert.equal(data.source, "mock");
  assert.equal(data.locations.length, 0);
  assert.equal(history.length, 0);
  assert.equal(calls.length, 0); // mock nunca chama a API
  assert.doesNotMatch(JSON.stringify(data), /Marina Costa|Roberto Lima|Ana Martins|Caio Nunes/);

  process.env.VITE_USE_MOCKS = "false";
});

test("D-007: erro real da API → dataset VAZIO + razão (source fallback)", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  const calls = installFetchSequence([{ payload: { message: "boom" }, status: 500 }]);
  const { getLatestFieldLocations } = await import("../src/modules/operations/map/operations-map.service");

  const data = await getLatestFieldLocations({ token: "jwt", permissions: FULL_PERMISSIONS });

  assert.equal(calls[0].url, "/api/v1/field-locations/latest");
  assert.equal(data.source, "fallback");
  assert.equal(data.locations.length, 0);
  assert.match(data.fallbackReason ?? "", /localização/i);
  assert.doesNotMatch(JSON.stringify(data), /Marina Costa|Roberto Lima|Ana Martins|Caio Nunes/);
});

test("D-007: lista vazia da API é estado vazio LEGÍTIMO (source api, sem enriquecimento)", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  const calls = installFetchSequence([{ payload: { data: [] } }]);
  const { getLatestFieldLocations } = await import("../src/modules/operations/map/operations-map.service");

  const data = await getLatestFieldLocations({ token: "jwt", permissions: FULL_PERMISSIONS });

  assert.equal(data.source, "api");
  assert.equal(data.locations.length, 0);
  assert.equal(data.fallbackReason, undefined);
  assert.equal(calls.length, 1); // sem locations não há fetch de OS/despachos/frota
});

test("R6.1: stale derivado client-side no limiar exato + 'último visto há X'", async () => {
  const { adaptFieldLocationsResponse, FIELD_LOCATION_STALE_THRESHOLD_MS, isFieldLocationTimestampStale, formatLastSeen } = await import(
    "../src/modules/operations/map/operations-map.adapter"
  );

  const now = new Date("2026-07-08T12:00:00.000Z");
  const atThreshold = new Date(now.getTime() - FIELD_LOCATION_STALE_THRESHOLD_MS).toISOString();
  const pastThreshold = new Date(now.getTime() - FIELD_LOCATION_STALE_THRESHOLD_MS - 1_000).toISOString();

  // Limiar: exatamente no threshold NÃO é stale; 1s além é.
  assert.equal(isFieldLocationTimestampStale(Date.parse(atThreshold), now.getTime()), false);
  assert.equal(isFieldLocationTimestampStale(Date.parse(pastThreshold), now.getTime()), true);

  const locations = adaptFieldLocationsResponse(
    {
      data: [
        { id: "loc-fresh", operator_user_id: "usr-1", latitude: -23.5, longitude: -46.6, captured_at: atThreshold },
        { id: "loc-stale", operator_user_id: "usr-2", latitude: -23.6, longitude: -46.7, captured_at: pastThreshold },
        // Flag explícita da API é respeitada quando presente (não re-deriva).
        { id: "loc-api-flag", operator_user_id: "usr-3", latitude: -23.7, longitude: -46.8, captured_at: atThreshold, is_stale: true },
      ],
    },
    { now },
  );

  assert.equal(locations.find((location) => location.id === "loc-fresh")?.isStale, false);
  assert.equal(locations.find((location) => location.id === "loc-stale")?.isStale, true);
  assert.equal(locations.find((location) => location.id === "loc-api-flag")?.isStale, true);

  assert.equal(formatLastSeen(new Date(now.getTime() - 18 * 60_000).toISOString(), now), "há 18 min");
  assert.equal(formatLastSeen(new Date(now.getTime() - 30_000).toISOString(), now), "agora");
  assert.equal(formatLastSeen(new Date(now.getTime() - 2 * 60 * 60_000).toISOString(), now), "há 2 h");
  assert.equal(formatLastSeen(undefined, now), "sem registro");
});

test("R6.4: attach OS→operador preserva vehicleId e o adapter lê vehicle_id da lista", async () => {
  const { attachWorkOrdersToFieldLocations } = await import("../src/modules/operations/map/operations-map.adapter");
  const { adaptWorkOrdersResponse } = await import("../src/modules/work-orders/work-orders.adapter");

  const workOrders = adaptWorkOrdersResponse({
    data: {
      items: [
        {
          id: "wo-1",
          code: "OS-1",
          title: "Atendimento",
          status: "in_progress",
          priority: "high",
          assigned_user_id: "usr-1",
          vehicle_id: "veh-1",
          created_at: "2026-07-08T09:00:00.000Z",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  }).items;

  assert.equal(workOrders[0].vehicleId, "veh-1");

  const enriched = attachWorkOrdersToFieldLocations([makeLocation()], workOrders);
  assert.equal(enriched[0].currentWorkOrder?.id, "wo-1");
  assert.equal(enriched[0].currentWorkOrder?.vehicleId, "veh-1");
});

test("R6.4: conjuntos de Frota derivam só de em_execucao ativos e vigentes ativas", async () => {
  const { deriveMaintenanceVehicleIds, deriveInsuredVehicleIds } = await import("../src/modules/operations/map/operations-map.adapter");

  const maintenanceIds = deriveMaintenanceVehicleIds([
    makeMaintenanceOrder({ id: "mo-1", vehicleId: "veh-1", status: "em_execucao" }),
    makeMaintenanceOrder({ id: "mo-2", vehicleId: "veh-2", status: "agendada" }), // não conta
    makeMaintenanceOrder({ id: "mo-3", vehicleId: "veh-3", status: "em_execucao", isActive: false }), // desativada não conta
    makeMaintenanceOrder({ id: "mo-4", vehicleId: "veh-1", status: "em_execucao" }), // duplicada → set único
  ]);
  assert.deepEqual(maintenanceIds, ["veh-1"]);

  const insuredIds = deriveInsuredVehicleIds([
    makePolicy({ id: "pol-1", vehicleId: "veh-1", status: "vigente" }),
    makePolicy({ id: "pol-2", vehicleId: "veh-2", status: "vencida" }), // vencida não protege
    makePolicy({ id: "pol-3", vehicleId: "veh-3", status: "vigente", isActive: false }), // desativada não protege
  ]);
  assert.deepEqual(insuredIds, ["veh-1"]);
});

test("R6.4: badges do pin — em manutenção, sem seguro e ausência de fonte", async () => {
  const { getVehicleFleetBadges } = await import("../src/modules/operations/map/operations-map.adapter");

  const withVehicle = makeLocation({
    currentWorkOrder: {
      id: "wo-1",
      code: "OS-1",
      title: "Atendimento",
      status: "in_progress",
      priority: "high",
      vehicleId: "veh-1",
    },
  });

  // Viatura no conjunto em_execucao → badge "Em manutenção".
  const inMaintenance = getVehicleFleetBadges(withVehicle, { maintenanceVehicleIds: ["veh-1"], insuredVehicleIds: ["veh-1"] });
  assert.equal(inMaintenance?.inMaintenance, true);
  assert.equal(inMaintenance?.missingInsurance, false);

  // Viatura FORA do conjunto vigente → badge "Sem seguro".
  const uninsured = getVehicleFleetBadges(withVehicle, { maintenanceVehicleIds: [], insuredVehicleIds: ["veh-9"] });
  assert.equal(uninsured?.missingInsurance, true);
  assert.equal(uninsured?.inMaintenance, false);

  // Sem permissão (conjuntos ausentes) → NENHUM badge (nunca acusa sem fonte real).
  assert.equal(getVehicleFleetBadges(withVehicle, {}), null);

  // Sem viatura vinculada à OS → sem badge.
  assert.equal(getVehicleFleetBadges(makeLocation(), { maintenanceVehicleIds: ["veh-1"], insuredVehicleIds: [] }), null);

  // Viatura segurada e fora de manutenção → sem badge.
  assert.equal(getVehicleFleetBadges(withVehicle, { maintenanceVehicleIds: [], insuredVehicleIds: ["veh-1"] }), null);
});

test("R6.4: service busca Frota UMA vez por refresh, com querystring exata e gated por permissão", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  const locationPayload = {
    data: [
      {
        id: "loc-1",
        operatorUserId: "usr-1",
        displayName: "Operadora Alfa",
        status: "in_service",
        latitude: -23.55,
        longitude: -46.63,
        capturedAt: new Date().toISOString(),
      },
    ],
  };
  const workOrdersPayload = {
    data: {
      items: [
        {
          id: "wo-1",
          code: "OS-1",
          title: "Atendimento",
          status: "in_progress",
          priority: "high",
          assigned_user_id: "usr-1",
          vehicle_id: "veh-1",
          created_at: "2026-07-08T09:00:00.000Z",
        },
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  };
  const calls = installFetchSequence([
    { payload: locationPayload },
    { payload: workOrdersPayload },
    { payload: { data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } } }, // despachos
    {
      payload: {
        data: {
          items: [{ id: "mo-1", vehicle_id: "veh-1", type: "corretiva", status: "em_execucao", description: "Freios", is_active: true }],
          pagination: { limit: 200, offset: 0, total: 1 },
        },
      },
    },
    {
      payload: {
        data: {
          items: [
            {
              id: "pol-1",
              vehicle_id: "veh-2",
              seguradora: "Porto",
              numero_apolice: "AP-1",
              vigencia_inicio: "2026-01-01",
              vigencia_fim: "2026-12-31",
              valor: 1000,
              status: "vigente",
              is_active: true,
            },
          ],
          pagination: { limit: 200, offset: 0, total: 1 },
        },
      },
    },
  ]);
  const { getLatestFieldLocations } = await import("../src/modules/operations/map/operations-map.service");

  const data = await getLatestFieldLocations({ token: "jwt", permissions: FULL_PERMISSIONS });

  assert.equal(calls[0].url, "/api/v1/field-locations/latest");
  assert.equal(calls[1].url, "/api/v1/work-orders");
  assert.equal(calls[2].url, "/api/v1/operations/dispatches");
  assert.equal(calls[3].url, "/api/v1/maintenance-orders?status=em_execucao&is_active=true&limit=200");
  assert.equal(calls[4].url, "/api/v1/insurance-policies?status=vigente&is_active=true&limit=200");
  assert.equal(calls.length, 5); // uma busca de cada fonte por refresh

  assert.deepEqual(data.maintenanceVehicleIds, ["veh-1"]);
  assert.deepEqual(data.insuredVehicleIds, ["veh-2"]);
  assert.equal(data.locations[0].currentWorkOrder?.vehicleId, "veh-1");

  // Sem as permissões de Frota → nenhuma chamada extra e nenhum conjunto (sem badge).
  const gatedCalls = installFetchSequence([{ payload: locationPayload }, { payload: workOrdersPayload }]);
  const gated = await getLatestFieldLocations({
    token: "jwt",
    permissions: ["field_location:read", "work_orders:read"],
  });

  assert.equal(gatedCalls.length, 2); // latest + work-orders; sem despachos/frota
  assert.equal(gated.maintenanceVehicleIds, undefined);
  assert.equal(gated.insuredVehicleIds, undefined);
});

test("R6.1/R6.4: painel lateral — link /work-orders/:id, badges com deep-link e alerta stale", async () => {
  const { OperationsOperatorDetailPanel } = await import("../src/modules/operations/map/components/OperationsOperatorDetailPanel");

  const staleLocation = makeLocation({
    isStale: true,
    capturedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    currentWorkOrder: {
      id: "wo-77",
      code: "OS-77",
      title: "Reboque",
      status: "on_route",
      priority: "urgent",
      vehicleId: "veh-7",
    },
  });

  const html = renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(OperationsOperatorDetailPanel, {
        location: staleLocation,
        showWorkOrder: true,
        maintenanceVehicleIds: ["veh-7"],
        insuredVehicleIds: ["veh-outra"],
      }),
    ),
  );

  assert.match(html, /Abrir OS/);
  assert.match(html, /\/work-orders\/wo-77/);
  assert.match(html, /Em manutenção/);
  assert.match(html, /\/fleet\/maintenance/);
  assert.match(html, /Sem seguro/);
  assert.match(html, /\/fleet\/insurance\?vehicle=veh-7/);
  assert.match(html, /Localização antiga/);
  assert.match(html, /Último visto/);
  assert.match(html, /há 22 min/);
});

test("R6.1: painel sem OS ativa diz isso explicitamente; sem badges sem fonte", async () => {
  const { OperationsOperatorDetailPanel } = await import("../src/modules/operations/map/components/OperationsOperatorDetailPanel");

  const html = renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(OperationsOperatorDetailPanel, {
        location: makeLocation(),
        showWorkOrder: true,
      }),
    ),
  );

  assert.match(html, /Sem OS atual/);
  assert.doesNotMatch(html, /Em manutenção|Sem seguro/);
});

test("§7 dados desatualizados: falha de refresh preserva o último dataset REAL (nunca fabrica, nunca apaga)", async () => {
  const { mergeOperationsMapRefresh } = await import("../src/modules/operations/map/useOperationsMap");

  const lastGood = {
    locations: [makeLocation()],
    source: "api" as const,
    maintenanceVehicleIds: ["veh-1"],
    insuredVehicleIds: ["veh-2"],
  };
  const failed = { locations: [], source: "fallback" as const, fallbackReason: "Não foi possível consultar a API de localização." };

  // Falha com dados reais na tela → preserva locations + conjuntos de Frota, sinaliza fallback.
  const preserved = mergeOperationsMapRefresh(lastGood, failed);
  assert.equal(preserved.source, "fallback");
  assert.equal(preserved.locations.length, 1);
  assert.equal(preserved.locations[0].displayName, "Operadora Alfa");
  assert.deepEqual(preserved.maintenanceVehicleIds, ["veh-1"]);
  assert.match(preserved.fallbackReason ?? "", /localização/i);

  // Refresh bem-sucedido substitui tudo (inclusive limpa fallbackReason e conjuntos ausentes).
  const fresh = { locations: [makeLocation({ id: "loc-2" })], source: "api" as const };
  const replaced = mergeOperationsMapRefresh(preserved, fresh);
  assert.equal(replaced, fresh);

  // D-007: falha SEM dados prévios continua vazia — nada é fabricado.
  const emptyBefore = { locations: [], source: "api" as const };
  const stillEmpty = mergeOperationsMapRefresh(emptyBefore, failed);
  assert.equal(stillEmpty.locations.length, 0);
  assert.equal(stillEmpty.source, "fallback");
});

test("painel de despacho: rótulo de negócio no lugar do UUID cru (id só no deep-link)", async () => {
  const { OperationsOperatorDetailPanel } = await import("../src/modules/operations/map/components/OperationsOperatorDetailPanel");

  const withDispatch = makeLocation({
    currentWorkOrder: {
      id: "wo-77",
      code: "OS-77",
      title: "Reboque",
      status: "on_route",
      priority: "urgent",
    },
    currentDispatch: {
      id: "0f1e2d3c-uuid-cru-do-despacho",
      workOrderId: "wo-77",
      operatorUserId: "usr-1",
      status: "accepted",
      createdAt: "2026-07-08T10:00:00.000Z",
    },
  });

  const html = renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(OperationsOperatorDetailPanel, {
        location: withDispatch,
        showWorkOrder: true,
        showDispatch: true,
      }),
    ),
  );

  assert.match(html, /Despacho ativo/);
  assert.match(html, /Vinculado à OS OS-77/);
  assert.match(html, /Acompanhar despacho/);
  // O UUID pode viajar na querystring do link, mas nunca como texto visível.
  assert.doesNotMatch(html, />[^<]*0f1e2d3c-uuid-cru-do-despacho/);
});

test("R6.2: pins do canvas exibem stale e badges navegáveis fora do botão de seleção", async () => {
  process.env.VITE_USE_MOCKS = "false";
  delete process.env.VITE_GOOGLE_MAPS_API_KEY;
  const { OperationsMapCanvas } = await import("../src/modules/operations/map/components/OperationsMapCanvas");

  const locations = [
    makeLocation({
      id: "loc-stale",
      isStale: true,
      capturedAt: new Date(Date.now() - 40 * 60_000).toISOString(),
      currentWorkOrder: {
        id: "wo-1",
        code: "OS-1",
        title: "Atendimento",
        status: "in_progress",
        priority: "high",
        vehicleId: "veh-1",
      },
    }),
  ];

  const html = renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(OperationsMapCanvas, {
        locations,
        onSelect: () => undefined,
        maintenanceVehicleIds: ["veh-1"],
        insuredVehicleIds: [],
      }),
    ),
  );

  assert.match(html, /Último visto/);
  assert.match(html, /Em manutenção/);
  assert.match(html, /Sem seguro/);
  assert.match(html, /\/fleet\/insurance\?vehicle=veh-1/);
  // Badge é Link (navegável) e não fica aninhado dentro do botão do pin.
  assert.doesNotMatch(html, /<button[^>]*>(?:(?!<\/button>)[\s\S])*<a /);
});
