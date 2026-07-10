import assert from "node:assert/strict";
import test from "node:test";

import {
  WORK_ORDER_PRIORITY_HEX,
  buildWorkOrderPinsFeatureCollection,
  getWorkOrderPriorityColor,
  getWorkOrderPriorityKey,
  isValidMapCoordinate,
} from "../src/modules/operations/map/map/mapMarkers";
import type { OperationsMapWorkOrderPin } from "../src/modules/operations/map/operations-map.types";

function makePin(overrides: Partial<OperationsMapWorkOrderPin> = {}): OperationsMapWorkOrderPin {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Atendimento",
    priority: "high",
    status: "open",
    customerName: "Cliente A",
    serviceAddress: "Rua 1",
    latitude: -23.5,
    longitude: -46.6,
    ...overrides,
  };
}

test("getWorkOrderPriorityColor cobre as 4 prioridades e cai para média fora do enum", () => {
  assert.equal(getWorkOrderPriorityColor("low"), WORK_ORDER_PRIORITY_HEX.low);
  assert.equal(getWorkOrderPriorityColor("medium"), WORK_ORDER_PRIORITY_HEX.medium);
  assert.equal(getWorkOrderPriorityColor("high"), WORK_ORDER_PRIORITY_HEX.high);
  assert.equal(getWorkOrderPriorityColor("urgent"), WORK_ORDER_PRIORITY_HEX.urgent);
  // R8 — priority free-form no banco: valor desconhecido cai para o hex de "medium".
  assert.equal(getWorkOrderPriorityColor("qualquer-coisa"), WORK_ORDER_PRIORITY_HEX.medium);
});

test("getWorkOrderPriorityKey traduz para PT-BR e cai para 'media' fora do enum (R8)", () => {
  assert.equal(getWorkOrderPriorityKey("low"), "baixa");
  assert.equal(getWorkOrderPriorityKey("medium"), "media");
  assert.equal(getWorkOrderPriorityKey("high"), "alta");
  assert.equal(getWorkOrderPriorityKey("urgent"), "urgente");
  assert.equal(getWorkOrderPriorityKey("xpto"), "media");
});

test("isValidMapCoordinate rejeita NaN, fora de faixa, sentinela 0/0 e não-número (R2)", () => {
  assert.equal(isValidMapCoordinate(-23.5, -46.6), true);
  assert.equal(isValidMapCoordinate(Number.NaN, -46.6), false);
  assert.equal(isValidMapCoordinate(91, 0), false);
  assert.equal(isValidMapCoordinate(0, 181), false);
  assert.equal(isValidMapCoordinate(0, 0), false); // sentinela de "não geocodificado"
  assert.equal(isValidMapCoordinate("-23.5" as unknown, -46.6), false);
  assert.equal(isValidMapCoordinate(null as unknown, null as unknown), false);
});

test("buildWorkOrderPinsFeatureCollection gera [lng,lat], props e marca selecionado/urgente", () => {
  const fc = buildWorkOrderPinsFeatureCollection(
    [makePin({ id: "a", priority: "urgent", longitude: -46.6, latitude: -23.5 })],
    "a",
  );
  assert.equal(fc.features.length, 1);
  const feature = fc.features[0]!;
  assert.deepEqual(feature.geometry.coordinates, [-46.6, -23.5]);
  assert.equal(feature.properties.priorityKey, "urgente");
  assert.equal(feature.properties.priorityColor, WORK_ORDER_PRIORITY_HEX.urgent);
  assert.equal(feature.properties.urgent, true);
  assert.equal(feature.properties.selected, true);
  assert.equal(feature.properties.code, "OS-1");
});

test("buildWorkOrderPinsFeatureCollection só marca urgente para prioridade urgent", () => {
  const fc = buildWorkOrderPinsFeatureCollection([makePin({ priority: "high" })], undefined);
  assert.equal(fc.features[0]!.properties.urgent, false);
  assert.equal(fc.features[0]!.properties.selected, false);
});

test("buildWorkOrderPinsFeatureCollection descarta coordenada inválida (0/0 e fora de faixa)", () => {
  const fc = buildWorkOrderPinsFeatureCollection(
    [
      makePin({ id: "ok", latitude: -23.5, longitude: -46.6 }),
      makePin({ id: "zero", latitude: 0, longitude: 0 }),
      makePin({ id: "range", latitude: 200, longitude: -46.6 }),
    ],
    undefined,
  );
  assert.equal(fc.features.length, 1);
  assert.equal(fc.features[0]!.properties.id, "ok");
});

test("buildWorkOrderPinsFeatureCollection vazio → FeatureCollection vazia", () => {
  const fc = buildWorkOrderPinsFeatureCollection([], undefined);
  assert.equal(fc.type, "FeatureCollection");
  assert.equal(fc.features.length, 0);
});
