import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { selectMappableWorkOrders } from "../src/modules/operations/map/operations-map.adapter";
import { OperationsWorkOrderPinPanel } from "../src/modules/operations/map/components/OperationsWorkOrderPinPanel";
import { OperationsWorkOrdersWithoutLocationPanel } from "../src/modules/operations/map/components/OperationsWorkOrdersWithoutLocationPanel";
import type { WorkOrderListItem } from "../src/modules/work-orders/work-orders.types";
import type {
  OperationsMapWorkOrderPin,
  OperationsMapWorkOrderWithoutLocation,
} from "../src/modules/operations/map/operations-map.types";

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
  };
}

test("selectMappableWorkOrders separa com/sem localização e exclui terminais", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "com", serviceLatitude: -23.5, serviceLongitude: -46.6 }),
    makeWO({ id: "sem", serviceLatitude: null, serviceLongitude: null, serviceAddress: "Av. X" }),
    makeWO({ id: "terminal", status: "completed", serviceLatitude: -23.4, serviceLongitude: -46.5 }),
  ]);
  assert.deepEqual(
    withLocation.map((pin) => pin.id),
    ["com"],
  );
  assert.deepEqual(
    withoutLocation.map((wo) => wo.id),
    ["sem"],
  );
});

test("selectMappableWorkOrders: OS 'fantasma' com coord 0/0 cai em Sem localização (R2), não some", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "ghost", serviceLatitude: 0, serviceLongitude: 0, serviceAddress: "Rua Y" }),
  ]);
  assert.equal(withLocation.length, 0);
  assert.deepEqual(
    withoutLocation.map((wo) => wo.id),
    ["ghost"],
  );
});

test("selectMappableWorkOrders descarta OS aberta sem coord E sem endereço", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "nada", serviceLatitude: null, serviceLongitude: null, serviceAddress: null }),
    makeWO({ id: "vazio", serviceLatitude: null, serviceLongitude: null, serviceAddress: "   " }),
  ]);
  assert.equal(withLocation.length, 0);
  assert.equal(withoutLocation.length, 0);
});

test("selectMappableWorkOrders preserva prioridade e código no pin", () => {
  const { withLocation } = selectMappableWorkOrders([
    makeWO({ id: "u", code: "OS-9", priority: "urgent" }),
  ]);
  assert.equal(withLocation[0]!.priority, "urgent");
  assert.equal(withLocation[0]!.code, "OS-9");
});

// --- Painéis (SSR) ---

test("OperationsWorkOrderPinPanel mostra código, prioridade e ação Abrir OS", () => {
  const pin: OperationsMapWorkOrderPin = {
    id: "wo-7",
    code: "OS-7",
    title: "Reboque",
    priority: "urgent",
    status: "open",
    customerName: "Cliente Z",
    serviceAddress: "Marginal, km 5",
    latitude: -23.5,
    longitude: -46.6,
  };
  const html = renderToString(
    createElement(MemoryRouter, null, createElement(OperationsWorkOrderPinPanel, { pin })),
  );
  assert.match(html, /OS-7/);
  assert.match(html, /Urgente/);
  assert.match(html, /Abrir OS/);
  assert.match(html, /Marginal, km 5/);
});

test("OperationsWorkOrdersWithoutLocationPanel conta 'N sem GPS' e lista as OS", () => {
  const workOrders: OperationsMapWorkOrderWithoutLocation[] = [
    { id: "a", code: "OS-A", title: "T", priority: "medium", customerName: null, serviceAddress: "Rua A" },
    { id: "b", code: "OS-B", title: "T", priority: "low", customerName: null, serviceAddress: "Rua B" },
  ];
  const html = renderToString(
    createElement(MemoryRouter, null, createElement(OperationsWorkOrdersWithoutLocationPanel, { workOrders })),
  );
  assert.match(html, /2 sem GPS/);
  assert.match(html, /OS-A/);
  assert.match(html, /OS-B/);
});

test("OperationsWorkOrdersWithoutLocationPanel não renderiza quando vazio", () => {
  const html = renderToString(
    createElement(MemoryRouter, null, createElement(OperationsWorkOrdersWithoutLocationPanel, { workOrders: [] })),
  );
  assert.equal(html, "");
});
