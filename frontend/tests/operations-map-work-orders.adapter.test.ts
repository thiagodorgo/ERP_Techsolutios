import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInServiceCalls,
  isInServiceWorkOrderStatus,
  resolveAssignedTechnicianName,
  selectMappableWorkOrders,
} from "../src/modules/operations/map/operations-map.adapter";
import type { WorkOrderListItem } from "../src/modules/work-orders/work-orders.types";
import type {
  FieldLocationItem,
  OperationsMapWorkOrderPin,
  OperationsMapWorkOrderWithoutLocation,
} from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 — adapter do split rec/atd: selectMappableWorkOrders agora carrega status + ids do
// técnico atribuído (para o painel "Em Atendimento" e as rotas); buildInServiceCalls resolve o
// NOME do técnico pelas MESMAS listas (assigned ids ↔ locations; fallback despacho; sem match "—").

function makeWO(overrides: Partial<WorkOrderListItem> = {}): WorkOrderListItem {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Atendimento",
    status: "open",
    priority: "high",
    customerName: "Cliente A",
    serviceAddress: "Rua 1, 100",
    serviceLatitude: -23.5,
    serviceLongitude: -46.6,
    createdAt: "2026-07-10T12:00:00.000Z",
    ...overrides,
  } as WorkOrderListItem;
}

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    userId: "user-1",
    displayName: "Camila Nunes",
    status: "in_service",
    latitude: -25.49,
    longitude: -49.24,
    capturedAt: "2026-07-10T12:00:00.000Z",
    isStale: false,
    ...overrides,
  };
}

function makePin(overrides: Partial<OperationsMapWorkOrderPin> = {}): OperationsMapWorkOrderPin {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Atendimento",
    priority: "high",
    status: "assigned",
    latitude: -25.49,
    longitude: -49.24,
    assignedOperatorId: null,
    assignedUserId: null,
    ...overrides,
  };
}

function makeWithout(
  overrides: Partial<OperationsMapWorkOrderWithoutLocation> = {},
): OperationsMapWorkOrderWithoutLocation {
  return {
    id: "no-1",
    code: "OS-N",
    title: "Sem GPS",
    priority: "low",
    status: "assigned",
    serviceAddress: "Av. X",
    ...overrides,
  };
}

// 1 — separação com/sem localização + exclusão de terminais intacta.
test("selectMappableWorkOrders separa com/sem localização e exclui terminais", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "com" }),
    makeWO({ id: "sem", serviceLatitude: null, serviceLongitude: null, serviceAddress: "Av. X" }),
    makeWO({ id: "terminal", status: "completed" }),
  ]);
  assert.deepEqual(withLocation.map((pin) => pin.id), ["com"]);
  assert.deepEqual(withoutLocation.map((wo) => wo.id), ["sem"]);
});

// 2 — OS "fantasma" 0/0 cai em sem-localização (R2), não some.
test("OS com coord 0/0 cai em Sem localização (R2)", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "ghost", serviceLatitude: 0, serviceLongitude: 0, serviceAddress: "Rua Y" }),
  ]);
  assert.equal(withLocation.length, 0);
  assert.deepEqual(withoutLocation.map((wo) => wo.id), ["ghost"]);
});

// 3 — J-MAPAS-10: o pin E o sem-GPS carregam STATUS + assignedOperatorId/assignedUserId (aditivo).
test("selectMappableWorkOrders propaga status e ids do técnico atribuído (pin e sem-GPS)", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "atd", status: "on_route", assignedOperatorId: "op-9", assignedUserId: "user-9" }),
    makeWO({
      id: "sem",
      status: "assigned",
      serviceLatitude: null,
      serviceLongitude: null,
      serviceAddress: "Av. X",
      assignedUserId: "user-7",
    }),
  ]);
  const pin = withLocation.find((p) => p.id === "atd")!;
  assert.equal(pin.status, "on_route");
  assert.equal(pin.assignedOperatorId, "op-9");
  assert.equal(pin.assignedUserId, "user-9");
  const sem = withoutLocation.find((w) => w.id === "sem")!;
  assert.equal(sem.status, "assigned");
  assert.equal(sem.assignedUserId, "user-7");
});

// 4 — M-7 mantido: slaDueAt propaga para pin e sem-localização; ausência → null.
test("slaDueAt propaga para pin e sem-localização; ausência → null", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "com-prazo", slaDueAt: "2026-07-19T13:00:00.000Z" }),
    makeWO({ id: "sem-gps", serviceLatitude: null, serviceLongitude: null, serviceAddress: "Av. X", slaDueAt: "2026-07-19T14:00:00.000Z" }),
    makeWO({ id: "sem-prazo" }),
  ]);
  assert.equal(withLocation.find((p) => p.id === "com-prazo")!.slaDueAt, "2026-07-19T13:00:00.000Z");
  assert.equal(withLocation.find((p) => p.id === "sem-prazo")!.slaDueAt, null);
  assert.equal(withoutLocation.find((w) => w.id === "sem-gps")!.slaDueAt, "2026-07-19T14:00:00.000Z");
});

// 5 — fases: isInServiceWorkOrderStatus cobre exatamente os 6 status em curso (open fica fora).
test("isInServiceWorkOrderStatus: assigned/accepted/on_route/on_site/in_progress/paused; open não", () => {
  for (const status of ["assigned", "accepted", "on_route", "on_site", "in_progress", "paused"] as const) {
    assert.equal(isInServiceWorkOrderStatus(status), true, status);
  }
  assert.equal(isInServiceWorkOrderStatus("open"), false);
  assert.equal(isInServiceWorkOrderStatus("completed"), false);
});

// 6 — resolução do técnico: assignedOperatorId/assignedUserId ↔ operatorId/userId das localizações.
test("resolveAssignedTechnicianName casa assigned ids com operatorId/userId", () => {
  const locations = [
    makeLocation({ id: "l1", operatorId: "op-A", userId: "user-A", displayName: "Ana Beatriz Rocha" }),
    makeLocation({ id: "l2", operatorId: "op-B", userId: "user-B", displayName: "Camila Nunes" }),
  ];
  assert.equal(
    resolveAssignedTechnicianName(makePin({ assignedUserId: "user-B" }), locations),
    "Camila Nunes",
  );
  assert.equal(
    resolveAssignedTechnicianName(makePin({ assignedOperatorId: "op-A" }), locations),
    "Ana Beatriz Rocha",
  );
});

// 7 — fallback pelo DESPACHO ativo (currentDispatch.workOrderId) quando não há assigned ids.
test("resolveAssignedTechnicianName usa o despacho ativo como fallback; sem match → '—'", () => {
  const byDispatch = makeLocation({
    id: "l3",
    operatorId: "op-C",
    userId: "user-C",
    displayName: "Rafael Mendes",
    currentDispatch: { id: "d1", workOrderId: "wo-77", operatorUserId: "user-C", status: "on_route", createdAt: "2026-07-10T12:00:00.000Z" },
  });
  assert.equal(resolveAssignedTechnicianName(makePin({ id: "wo-77" }), [byDispatch]), "Rafael Mendes");
  assert.equal(resolveAssignedTechnicianName(makePin({ id: "wo-99" }), [byDispatch]), "—"); // nunca inventa
});

// 8 — buildInServiceCalls: só OS em curso, com nome resolvido, ordenadas por prioridade → id;
//     LGPD: a projeção não carrega lat/lng.
test("buildInServiceCalls projeta só as OS em curso, resolve o técnico e não trafega coordenada", () => {
  const locations = [makeLocation({ operatorId: "op-B", userId: "user-B", displayName: "Camila Nunes" })];
  const calls = buildInServiceCalls(
    [
      makePin({ id: "atd-urg", code: "OS-98", priority: "urgent", status: "in_progress", assignedUserId: "user-B" }),
      makePin({ id: "aberta", code: "OS-1", priority: "urgent", status: "open" }),
      makePin({ id: "atd-med", code: "OS-97", priority: "medium", status: "assigned" }),
    ],
    [makeWithout({ id: "sem-atd", code: "OS-96", priority: "high", status: "paused" })],
    locations,
  );
  assert.deepEqual(calls.map((c) => c.id), ["atd-urg", "sem-atd", "atd-med"]); // urgente→alta→média
  assert.equal(calls[0]!.technicianName, "Camila Nunes");
  assert.equal(calls[2]!.technicianName, "—");
  assert.equal(calls.find((c) => c.id === "sem-atd")!.hasLocation, false);
  for (const call of calls) {
    assert.ok(!("latitude" in call) && !("longitude" in call), "projeção não pode carregar coordenada");
  }
});

// 9 — descarta OS aberta sem coord E sem endereço (nada a mostrar).
test("selectMappableWorkOrders descarta OS sem coord e sem endereço", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "nada", serviceLatitude: null, serviceLongitude: null, serviceAddress: null }),
    makeWO({ id: "vazio", serviceLatitude: null, serviceLongitude: null, serviceAddress: "   " }),
  ]);
  assert.equal(withLocation.length, 0);
  assert.equal(withoutLocation.length, 0);
});

// 10 — preserva prioridade/código no pin (base das cores do losango).
test("selectMappableWorkOrders preserva prioridade e código no pin", () => {
  const { withLocation } = selectMappableWorkOrders([makeWO({ id: "u", code: "OS-9", priority: "urgent" })]);
  assert.equal(withLocation[0]!.priority, "urgent");
  assert.equal(withLocation[0]!.code, "OS-9");
});
