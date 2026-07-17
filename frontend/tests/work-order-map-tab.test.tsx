import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { MapTab } from "../src/modules/work-orders/components/tabs/MapTab";
import { HaversineRouteProvider, createRouteProvider, STRAIGHT_LINE_LABEL } from "../src/modules/work-orders/map/routeProvider";
import type { WorkOrderMapStartPoints } from "../src/modules/work-orders/map/mapStartPoints.service";
import type { WorkOrderDetail } from "../src/modules/work-orders/work-orders.types";

// Ω3F-8b (J-MAPAS-5) — aba Mapa da OS (front). Rota+km = HAVERSINE em linha reta (US$ 0, sem chave, sem
// SKU pago). Rótulo HONESTO obrigatório "distância aproximada em linha reta" + mode 'straight-line'
// (item de veto do avaliador-mapas). Estados §7 (loading/vazio honesto/erro/desatualizado). SSR.

const ctx = { tenantId: "t1", token: "tok" };

const SAO_PAULO = { latitude: -23.55052, longitude: -46.633308 };
const CURITIBA = { latitude: -25.4284, longitude: -49.2733 };

function makeWorkOrder(overrides: Partial<WorkOrderDetail> = {}): WorkOrderDetail {
  return {
    id: "wo-1",
    code: "OS-000101",
    title: "Reboque",
    status: "assigned",
    priority: "high",
    checklistId: null,
    createdAt: "2026-07-10T11:20:00.000Z",
    links: null,
    ...overrides,
  };
}

// =============================== RouteProvider (haversine puro) ===============================

test("RouteProvider: haversine SP↔Curitiba ≈ 339 km, mode 'straight-line', rótulo honesto", () => {
  const route = new HaversineRouteProvider().computeRoute(null, SAO_PAULO, CURITIBA);
  assert.ok(Math.abs(route.km - 339) < 15, `esperado ≈339 km, obtido ${route.km}`);
  assert.equal(route.mode, "straight-line");
  assert.equal(route.label, STRAIGHT_LINE_LABEL);
  assert.equal(route.label, "distância aproximada em linha reta");
  assert.equal(route.geometry.length, 2);
});

test("RouteProvider: soma os trechos partida→origem→destino; um ponto só → 0 km", () => {
  const withStart = new HaversineRouteProvider().computeRoute({ latitude: -23.5, longitude: -46.6 }, SAO_PAULO, CURITIBA);
  assert.ok(withStart.km >= 339, "partida extra só aumenta a distância");
  assert.equal(withStart.geometry.length, 3);

  const single = new HaversineRouteProvider().computeRoute(null, SAO_PAULO, null);
  assert.equal(single.km, 0);
});

test("createRouteProvider: default é linha reta (US$ 0, sem chave) — nenhum provedor pago ativado", () => {
  const provider = createRouteProvider();
  const route = provider.computeRoute(null, SAO_PAULO, CURITIBA);
  assert.equal(route.mode, "straight-line");
});

// =============================== MapTab SSR ===============================

test("MapTab: cabeçalho + estado de carregamento (§7) quando ainda sem dados", () => {
  const html = renderToString(<MapTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read"]} />);
  assert.match(html, /Mapa da ordem de serviço/);
  assert.match(html, /Carregando mapa da OS/);
});

test("MapTab: estado PRONTO mostra km com rótulo honesto e mode 'straight-line'", () => {
  const data: WorkOrderMapStartPoints = {
    origin: { latitude: SAO_PAULO.latitude, longitude: SAO_PAULO.longitude, address: "Av. Paulista, 1000" },
    destination: { latitude: CURITIBA.latitude, longitude: CURITIBA.longitude, address: "Rua XV de Novembro, 100" },
    technician: null,
    bases: [],
  };
  const html = renderToString(
    <MapTab workOrder={makeWorkOrder({ destinationAddress: "Rua XV de Novembro, 100" })} context={ctx} permissions={["work_orders:read"]} initialData={data} />,
  );
  // Rótulo honesto obrigatório + modo reta (VETO do avaliador se faltar).
  assert.match(html, /distância aproximada em linha reta/);
  assert.match(html, /data-route-mode="straight-line"/);
  // km presente e coerente (≈ 339 km).
  assert.match(html, /33\d\s?km/);
  // Endereços legíveis, NÃO coordenada crua feia.
  assert.match(html, /Av\. Paulista, 1000/);
  assert.doesNotMatch(html, /-46\.63/);
  assert.doesNotMatch(html, /-23\.55/);
});

test("MapTab: SEM chave / SEM SKU pago / SEM termo técnico cru na UI", () => {
  const data: WorkOrderMapStartPoints = {
    origin: { latitude: SAO_PAULO.latitude, longitude: SAO_PAULO.longitude, address: "Origem" },
    destination: { latitude: CURITIBA.latitude, longitude: CURITIBA.longitude, address: "Destino" },
    technician: null,
    bases: [],
  };
  const html = renderToString(<MapTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read"]} initialData={data} />);
  assert.doesNotMatch(html, /api.?key|apikey|VITE_GOOGLE|googleapis|mapbox|access.?token/i);
  assert.doesNotMatch(html, /tenant|place_id/i);
});

test("MapTab: estado VAZIO honesto (§7) — OS sem coordenada → CTA geocodificar, sem quebrar", () => {
  const data: WorkOrderMapStartPoints = { origin: null, destination: null, technician: null, bases: [] };
  const html = renderToString(
    <MapTab
      workOrder={makeWorkOrder({ serviceAddress: "Rua com endereço, 10" })}
      context={ctx}
      permissions={["work_orders:read", "work_orders:update"]}
      initialData={data}
    />,
  );
  assert.match(html, /ainda não tem coordenadas no mapa/i);
  assert.match(html, /Geocodificar origem/);
});

test("MapTab: sem work_orders:update → NÃO oferece o botão de geocodificar (backend é a autoridade)", () => {
  const data: WorkOrderMapStartPoints = { origin: null, destination: null, technician: null, bases: [] };
  const html = renderToString(
    <MapTab workOrder={makeWorkOrder({ serviceAddress: "Rua X, 10" })} context={ctx} permissions={["work_orders:read"]} initialData={data} />,
  );
  assert.doesNotMatch(html, /Geocodificar origem/);
});

test("MapTab: dados DESATUALIZADOS (§7) — carimbo de idade da posição do técnico", () => {
  const data: WorkOrderMapStartPoints = {
    origin: { latitude: SAO_PAULO.latitude, longitude: SAO_PAULO.longitude, address: "Origem" },
    destination: null,
    technician: { latitude: -23.5, longitude: -46.6, capturedAt: "2020-01-01T09:00:00.000Z" },
    bases: [],
  };
  const html = renderToString(<MapTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read"]} initialData={data} />);
  assert.match(html, /Posição do técnico/);
  assert.match(html, /desatualizada/i);
});

test("MapTab: partida SELECIONÁVEL aparece quando há técnico/base além da origem", () => {
  const data: WorkOrderMapStartPoints = {
    origin: { latitude: SAO_PAULO.latitude, longitude: SAO_PAULO.longitude, address: "Origem" },
    destination: { latitude: CURITIBA.latitude, longitude: CURITIBA.longitude, address: "Destino" },
    technician: { latitude: -23.5, longitude: -46.6, capturedAt: "2026-07-16T10:00:00.000Z" },
    bases: [{ id: "b1", name: "Base Central", latitude: -23.6, longitude: -46.7 }],
  };
  const html = renderToString(<MapTab workOrder={makeWorkOrder()} context={ctx} permissions={["work_orders:read"]} initialData={data} />);
  assert.match(html, /Partida/);
  assert.match(html, /Base Central/);
});
