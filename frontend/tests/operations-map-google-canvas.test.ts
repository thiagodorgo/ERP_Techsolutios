import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  MAP_LEGEND_ITEMS,
  WORK_ORDER_PRIORITY_HEX,
  getRingColor,
  getStatusColor,
  getWorkOrderPriorityColor,
  isValidMapCoordinate,
  STALE_AMBER_MS,
  STALE_GRAY_MS,
} from "../src/modules/operations/map/map/mapMarkers";
import { GoogleMapsCanvas } from "../src/modules/operations/map/components/GoogleMapsCanvas";
import type {
  FieldLocationItem,
  FieldLocationStatus,
  OperationsMapWorkOrderPin,
} from "../src/modules/operations/map/operations-map.types";

const NOW = new Date("2026-07-13T12:00:00.000Z").getTime();

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    displayName: "Ana Souza",
    status: "on_route",
    latitude: -23.55052,
    longitude: -46.633308,
    capturedAt: new Date(NOW).toISOString(),
    isStale: false,
    ...overrides,
  };
}

function makePin(overrides: Partial<OperationsMapWorkOrderPin> = {}): OperationsMapWorkOrderPin {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "high",
    status: "open",
    latitude: -23.5,
    longitude: -46.6,
    ...overrides,
  };
}

function renderCanvas(props: Partial<Parameters<typeof GoogleMapsCanvas>[0]> = {}): string {
  return renderToString(
    createElement(GoogleMapsCanvas, {
      loadState: "ready",
      locations: [],
      onSelect: () => undefined,
      ...props,
    }),
  );
}

// 1 — operador vivo usa a cor semântica de status (paridade com o MapLibre).
test("operador ao vivo colore o pin pela paleta REAL de status (getRingColor = getStatusColor)", () => {
  for (const status of ["available", "on_route", "in_service"] as FieldLocationStatus[]) {
    const live = makeLocation({ status, capturedAt: new Date(NOW).toISOString() });
    assert.equal(getRingColor(live, NOW), getStatusColor(status));
  }
  // Render SSR: a cor entra INLINE no disco (não mais os 3 tons antigos).
  const html = renderCanvas({
    locations: [makeLocation({ status: "in_service", capturedAt: new Date(Date.now()).toISOString() })],
  });
  assert.match(html, /class="gmp-operator-pin"/);
  assert.match(html, new RegExp(`background:${getStatusColor("in_service")}`));
});

// 2 — envelhecimento sobrepõe o status: âmbar >3min, cinza >10min.
test("localização antiga vira âmbar (>3min) e cinza (>10min) mesmo com status ao vivo", () => {
  const amber = makeLocation({ status: "available", capturedAt: new Date(NOW - STALE_AMBER_MS).toISOString() });
  assert.equal(getRingColor(amber, NOW), "#f59e0b");
  const gray = makeLocation({ status: "available", capturedAt: new Date(NOW - STALE_GRAY_MS).toISOString() });
  assert.equal(getRingColor(gray, NOW), "#64748b");
});

// 3 — GUARDA anti-UI-mentirosa: seleção muda geometria, NUNCA a cor de status.
test("seleção do operador não sobrescreve a cor de status (só adiciona --selected)", () => {
  const blocked = makeLocation({ status: "blocked", capturedAt: new Date(Date.now()).toISOString() });
  const html = renderCanvas({ locations: [blocked], selectedId: blocked.id });
  assert.match(html, /gmp-operator-pin--selected/);
  // Cor continua a de "blocked" (#ef4444) — não o antigo azul de seleção (#0f8fbf).
  assert.match(html, new RegExp(`background:${getStatusColor("blocked")}`));
  assert.doesNotMatch(html, /background:#0f8fbf/);
});

// 4 — pin de chamado usa getWorkOrderPriorityColor nas 4 prioridades + fallback "media".
test("pin de chamado colore por prioridade e cai para média fora do enum", () => {
  assert.equal(getWorkOrderPriorityColor("low"), WORK_ORDER_PRIORITY_HEX.low);
  assert.equal(getWorkOrderPriorityColor("medium"), WORK_ORDER_PRIORITY_HEX.medium);
  assert.equal(getWorkOrderPriorityColor("high"), WORK_ORDER_PRIORITY_HEX.high);
  assert.equal(getWorkOrderPriorityColor("urgent"), WORK_ORDER_PRIORITY_HEX.urgent);
  assert.equal(getWorkOrderPriorityColor("xpto"), WORK_ORDER_PRIORITY_HEX.medium);
  const html = renderCanvas({ workOrderPins: [makePin({ priority: "urgent" })] });
  assert.match(html, /class="gmp-workorder-pin"/);
  assert.match(html, new RegExp(`background:${WORK_ORDER_PRIORITY_HEX.urgent}`));
});

// 5 — chamado com coordenada 0/0 (não geocodificado) é descartado, nunca vira "OS fantasma".
test("pin com coordenada 0/0 é filtrado (isValidMapCoordinate) e não renderiza", () => {
  assert.equal(isValidMapCoordinate(0, 0), false);
  assert.equal(isValidMapCoordinate(-23.5, -46.6), true);
  const html = renderCanvas({
    workOrderPins: [makePin({ id: "ok", latitude: -23.5, longitude: -46.6 }), makePin({ id: "zero", latitude: 0, longitude: 0 })],
  });
  const pinCount = (html.match(/gmp-workorder-pin/g) ?? []).length;
  assert.equal(pinCount, 1); // só o chamado válido
  assert.match(html, /1 chamado no mapa/); // subtítulo conta só os válidos
});

// 6 — GUARDA anti-divergência: a legenda é a MESMA fonte dos dois canvases e bate com a paleta.
test("legenda (MAP_LEGEND_ITEMS) bate 1:1 com a paleta de status e de prioridade", () => {
  const dots = MAP_LEGEND_ITEMS.filter((item) => item.kind === "dot");
  const pins = MAP_LEGEND_ITEMS.filter((item) => item.kind === "pin");
  const seps = MAP_LEGEND_ITEMS.filter((item) => item.kind === "sep");
  assert.equal(dots.length, 5);
  assert.equal(pins.length, 3);
  assert.equal(seps.length, 1);

  const colors = MAP_LEGEND_ITEMS.filter((item) => item.kind !== "sep").map((item) =>
    "color" in item ? item.color : "",
  );
  assert.deepEqual(colors, [
    getStatusColor("available"),
    getStatusColor("on_route"),
    getStatusColor("in_service"),
    "#f59e0b",
    "#64748b",
    WORK_ORDER_PRIORITY_HEX.urgent,
    WORK_ORDER_PRIORITY_HEX.high,
    WORK_ORDER_PRIORITY_HEX.medium,
  ]);

  // M-2 — a legenda renderiza no canvas Google no RODAPÉ unificado (mesmo componente do MapLibre);
  // a antiga `<ul>` flutuante `operations-map-libre__legend` deixou de existir.
  const html = renderCanvas();
  assert.match(html, /operations-map-legend-footer/);
  assert.doesNotMatch(html, /operations-map-libre__legend/);
  assert.match(html, /Disponível/);
  assert.match(html, /Chamado urgente/);
});
