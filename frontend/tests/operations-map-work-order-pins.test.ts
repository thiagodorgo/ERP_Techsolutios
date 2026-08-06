import assert from "node:assert/strict";
import test from "node:test";

import {
  WORK_ORDER_PRIORITY_HEX,
  buildWorkOrderPinsFeatureCollection,
  getWorkOrderLegendGroup,
  getWorkOrderPriorityColor,
  getWorkOrderPriorityKey,
  isValidMapCoordinate,
  workOrderDiamondSvg,
} from "../src/modules/operations/map/map/mapMarkers";
import type { OperationsMapWorkOrderPin } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 — o pin de OS vira LOSANGO com as CORES DO PROTÓTIPO (D-MAPA-PIXEL div. 2):
// urg #ef4444 · alta #f59e0b · média #38bdf8 · baixa #64748b. Guard do plano §11.1 executado:
// nenhum consumidor de WORK_ORDER_PRIORITY_HEX fora do módulo mapa → troca de hex segura.

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

// 1 — paleta NOVA do protótipo (divergência 2 registrada) + fallback para média fora do enum.
test("WORK_ORDER_PRIORITY_HEX usa as cores do protótipo e cai para média fora do enum", () => {
  assert.equal(WORK_ORDER_PRIORITY_HEX.urgent, "#ef4444");
  assert.equal(WORK_ORDER_PRIORITY_HEX.high, "#f59e0b");
  assert.equal(WORK_ORDER_PRIORITY_HEX.medium, "#38bdf8");
  assert.equal(WORK_ORDER_PRIORITY_HEX.low, "#64748b");
  assert.equal(getWorkOrderPriorityColor("urgent"), "#ef4444");
  assert.equal(getWorkOrderPriorityColor("qualquer-coisa"), WORK_ORDER_PRIORITY_HEX.medium);
});

// 2 — chave PT-BR intacta (R8) — alimenta o icon-image wo-diamond-{chave}.
test("getWorkOrderPriorityKey traduz para PT-BR e cai para 'media' fora do enum", () => {
  assert.equal(getWorkOrderPriorityKey("low"), "baixa");
  assert.equal(getWorkOrderPriorityKey("medium"), "media");
  assert.equal(getWorkOrderPriorityKey("high"), "alta");
  assert.equal(getWorkOrderPriorityKey("urgent"), "urgente");
  assert.equal(getWorkOrderPriorityKey("xpto"), "media");
});

// 3 — LOSANGO do protótipo: quadrado 22px rotate(45°), radius 5, borda branca 2.5.
test("workOrderDiamondSvg: rect 22×22 rotate(45), rx 5, stroke branco 2.5, fill na cor da prioridade", () => {
  const svg = workOrderDiamondSvg(WORK_ORDER_PRIORITY_HEX.urgent);
  assert.match(svg, /width="22" height="22"/);
  assert.match(svg, /rx="5"/);
  assert.match(svg, /rotate\(45 /);
  assert.match(svg, /stroke="#ffffff" stroke-width="2\.5"/);
  assert.match(svg, /fill="#ef4444"/);
  // Sem variante selecionada não há anel azul.
  assert.doesNotMatch(svg, /59,130,246/);
});

// 4 — variante SELECIONADA ganha o anel azul rgba(59,130,246,0.65) (outline do protótipo).
test("workOrderDiamondSvg selecionado adiciona o anel azul de seleção", () => {
  const svg = workOrderDiamondSvg(WORK_ORDER_PRIORITY_HEX.high, true);
  assert.match(svg, /rgba\(59,130,246,0\.65\)/);
  assert.match(svg, /fill="none"/);
});

// 5 — grupo de legenda da OS (filtro D6): urgent→urg, high→alta, medium/low→mb.
test("getWorkOrderLegendGroup: urgent→urg, high→alta, medium/low→mb", () => {
  assert.equal(getWorkOrderLegendGroup("urgent"), "urg");
  assert.equal(getWorkOrderLegendGroup("high"), "alta");
  assert.equal(getWorkOrderLegendGroup("medium"), "mb");
  assert.equal(getWorkOrderLegendGroup("low"), "mb");
});

// 6 — coordenada válida: predicado único intacto (NaN/faixa/0-0/não-número).
test("isValidMapCoordinate rejeita NaN, fora de faixa, sentinela 0/0 e não-número", () => {
  assert.equal(isValidMapCoordinate(-23.5, -46.6), true);
  assert.equal(isValidMapCoordinate(Number.NaN, -46.6), false);
  assert.equal(isValidMapCoordinate(91, 0), false);
  assert.equal(isValidMapCoordinate(0, 181), false);
  assert.equal(isValidMapCoordinate(0, 0), false);
  assert.equal(isValidMapCoordinate("-23.5" as unknown, -46.6), false);
});

// 7 — GeoJSON do pin: [lng,lat], props (chave/cor NOVA), selecionado/urgente marcados.
test("buildWorkOrderPinsFeatureCollection gera [lng,lat] com a cor nova e marca selecionado/urgente", () => {
  const fc = buildWorkOrderPinsFeatureCollection(
    [makePin({ id: "a", priority: "urgent", longitude: -46.6, latitude: -23.5 })],
    "a",
  );
  assert.equal(fc.features.length, 1);
  const feature = fc.features[0]!;
  assert.deepEqual(feature.geometry.coordinates, [-46.6, -23.5]);
  assert.equal(feature.properties.priorityKey, "urgente");
  assert.equal(feature.properties.priorityColor, "#ef4444"); // cor NOVA do protótipo
  assert.equal(feature.properties.urgent, true);
  assert.equal(feature.properties.selected, true);
});

// 8 — pulso: só urgente pulsa por herança; selected=false/urgent=false para alta sem seleção.
test("só prioridade urgent marca urgent/pulse por herança", () => {
  const fc = buildWorkOrderPinsFeatureCollection([makePin({ priority: "high" })], undefined);
  assert.equal(fc.features[0]!.properties.urgent, false);
  assert.equal(fc.features[0]!.properties.pulse, false);
  assert.equal(fc.features[0]!.properties.selected, false);
});

// 9 — coordenada inválida é descartada (nunca "OS fantasma" em 0,0).
test("descarta coordenada inválida (0/0 e fora de faixa)", () => {
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

// 10 — M-7 mantido: slaDueAt do pin NÃO vaza para as properties do GeoJSON (countdown é da fila).
test("pin com slaDueAt gera feature sem vazar slaDueAt nas properties", () => {
  const fc = buildWorkOrderPinsFeatureCollection(
    [makePin({ id: "com-prazo", slaDueAt: "2026-07-19T13:00:00.000Z" })],
    undefined,
  );
  assert.equal(fc.features.length, 1);
  assert.ok(!("slaDueAt" in fc.features[0]!.properties));
});
