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

// M-7 (J-MAPAS-8) — o prazo de SLA real (sla_due_at do DTO, PR-A) PROPAGA para o pin E para o item sem GPS;
// ausência → null (mantém o proxy). É o que habilita o countdown honesto na fila sem tocar o canvas.
test("selectMappableWorkOrders propaga slaDueAt para pin e sem-localização; ausência → null", () => {
  const { withLocation, withoutLocation } = selectMappableWorkOrders([
    makeWO({ id: "com-prazo", slaDueAt: "2026-07-19T13:00:00.000Z" }),
    makeWO({ id: "sem-gps", serviceLatitude: null, serviceLongitude: null, serviceAddress: "Av. X", slaDueAt: "2026-07-19T14:00:00.000Z" }),
    makeWO({ id: "sem-prazo" }),
  ]);
  assert.equal(withLocation.find((p) => p.id === "com-prazo")!.slaDueAt, "2026-07-19T13:00:00.000Z");
  assert.equal(withLocation.find((p) => p.id === "sem-prazo")!.slaDueAt, null);
  assert.equal(withoutLocation.find((w) => w.id === "sem-gps")!.slaDueAt, "2026-07-19T14:00:00.000Z");
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

test("Ω1b-2: botão 'Localizar no mapa' só aparece quando onGeocode é fornecido (gated por permissão)", () => {
  const workOrders: OperationsMapWorkOrderWithoutLocation[] = [
    { id: "a", code: "OS-A", title: "T", priority: "medium", customerName: null, serviceAddress: "Rua A" },
  ];
  const withAction = renderToString(
    createElement(
      MemoryRouter,
      null,
      createElement(OperationsWorkOrdersWithoutLocationPanel, { workOrders, onGeocode: async () => ({ geocoded: true }) }),
    ),
  );
  assert.match(withAction, /Localizar no mapa/);

  const readOnly = renderToString(
    createElement(MemoryRouter, null, createElement(OperationsWorkOrdersWithoutLocationPanel, { workOrders })),
  );
  assert.doesNotMatch(readOnly, /Localizar no mapa/);
});
