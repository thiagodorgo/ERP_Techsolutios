import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  buildOperationalMapStyle,
  OPERATIONAL_MAP_STYLE,
  OPERATIONAL_MAP_TOKENS,
  OPERATIONAL_MAP_DEFAULT_CENTER,
} from "../src/modules/operations/map/map/mapStyle";
import {
  buildFieldLocationsFeatureCollection,
  easeOutCubic,
  getInitials,
  getRingColor,
  getStaleLevel,
  getStatusColor,
  interpolateCoords,
  lerp,
  STALE_AMBER_MS,
  STALE_GRAY_MS,
} from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

const NOW = new Date("2026-07-10T12:00:00.000Z").getTime();

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

// --- mapStyle (basemap navy nos tokens do protótipo) ---

test("buildOperationalMapStyle usa OpenFreeMap (sem chave) e os tokens navy", () => {
  const style = buildOperationalMapStyle();
  assert.equal(style.version, 8);
  const source = style.sources.openmaptiles as { type: string; url?: string };
  assert.equal(source.type, "vector");
  assert.equal(source.url, "https://tiles.openfreemap.org/planet");
  assert.match(String(style.glyphs), /tiles\.openfreemap\.org\/fonts/);

  const background = style.layers.find((layer) => layer.id === "background");
  assert.ok(background);
  assert.equal((background as { paint: Record<string, unknown> }).paint["background-color"], OPERATIONAL_MAP_TOKENS.background);

  // Nenhuma dependência de Google/Mapbox (sem chave, sem custo — J-002).
  const serialized = JSON.stringify(style);
  assert.doesNotMatch(serialized, /googleapis|mapbox|api_key|access_token/i);
});

test("OPERATIONAL_MAP_STYLE pinta rótulos e água com os tokens", () => {
  const placeLabel = OPERATIONAL_MAP_STYLE.layers.find((layer) => layer.id === "place-label");
  const water = OPERATIONAL_MAP_STYLE.layers.find((layer) => layer.id === "water");
  assert.equal((placeLabel as { paint: Record<string, unknown> }).paint["text-color"], OPERATIONAL_MAP_TOKENS.label);
  assert.equal((water as { paint: Record<string, unknown> }).paint["fill-color"], OPERATIONAL_MAP_TOKENS.water);
  // Centro padrão é [lng, lat] (ordem MapLibre) — São Paulo.
  assert.equal(OPERATIONAL_MAP_DEFAULT_CENTER[0], -46.633308);
});

// --- mapMarkers (cores, frescor, iniciais, GeoJSON, animação) ---

test("getStaleLevel respeita as faixas de 3 e 10 minutos", () => {
  assert.equal(getStaleLevel(new Date(NOW - 1_000).toISOString(), NOW), "live");
  assert.equal(getStaleLevel(new Date(NOW - STALE_AMBER_MS).toISOString(), NOW), "amber");
  assert.equal(getStaleLevel(new Date(NOW - STALE_GRAY_MS).toISOString(), NOW), "gray");
  assert.equal(getStaleLevel("invalid-date", NOW), "gray");
});

test("getRingColor usa o status ao vivo e âmbar/cinza quando envelhece", () => {
  const live = makeLocation({ status: "available", capturedAt: new Date(NOW).toISOString() });
  assert.equal(getRingColor(live, NOW), getStatusColor("available"));

  const amber = makeLocation({ status: "available", capturedAt: new Date(NOW - STALE_AMBER_MS).toISOString() });
  assert.equal(getRingColor(amber, NOW), "#f59e0b");

  const gray = makeLocation({ status: "available", capturedAt: new Date(NOW - STALE_GRAY_MS).toISOString() });
  assert.equal(getRingColor(gray, NOW), "#64748b");
});

test("getInitials cobre nome vazio, uma e duas palavras", () => {
  assert.equal(getInitials("Ana Souza"), "AS");
  assert.equal(getInitials("Ana Beatriz Souza"), "AS");
  assert.equal(getInitials("Ana"), "AN");
  assert.equal(getInitials("   "), "?");
});

test("buildFieldLocationsFeatureCollection gera [lng,lat], marca selecionado e descarta coords inválidas", () => {
  const fc = buildFieldLocationsFeatureCollection(
    [
      makeLocation({ id: "a", longitude: -46.6, latitude: -23.5 }),
      makeLocation({ id: "b", longitude: 999, latitude: -23.5 }),
    ],
    "a",
    NOW,
  );
  assert.equal(fc.features.length, 1);
  const feature = fc.features[0]!;
  assert.deepEqual(feature.geometry.coordinates, [-46.6, -23.5]);
  assert.equal(feature.properties.id, "a");
  assert.equal(feature.properties.selected, true);
  assert.equal(feature.properties.initials, "AS");
});

test("interpolação da animação é ease-out e ancorada nos extremos", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5); // ease-out acelera cedo
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.deepEqual(interpolateCoords([0, 0], [10, 20], 0), [0, 0]);
  assert.deepEqual(interpolateCoords([0, 0], [10, 20], 1), [10, 20]);
});

// --- KPIs clicáveis que filtram o mapa ---

const SUMMARY = { total: 5, available: 2, onRoute: 1, inService: 1, stale: 1, offlineOrBlocked: 0 } as const;

test("OperationsMapSummaryCards vira botões acessíveis quando há handlers de filtro", async () => {
  const { OperationsMapSummaryCards } = await import(
    "../src/modules/operations/map/components/OperationsMapSummaryCards"
  );
  const html = renderToString(
    createElement(OperationsMapSummaryCards, {
      summary: SUMMARY,
      activeStatus: "available",
      staleOnly: false,
      onFilterStatus: () => undefined,
      onToggleStale: () => undefined,
    }),
  );
  assert.match(html, /operations-map-kpi-card/);
  assert.match(html, /aria-pressed="true"/); // "Disponíveis" ativo
  assert.match(html, /<button/);
});

test("OperationsMapSummaryCards permanece informativo (sem botão) sem handlers", async () => {
  const { OperationsMapSummaryCards } = await import(
    "../src/modules/operations/map/components/OperationsMapSummaryCards"
  );
  const html = renderToString(createElement(OperationsMapSummaryCards, { summary: SUMMARY }));
  assert.doesNotMatch(html, /operations-map-kpi-card/);
  assert.match(html, /ui-card/);
});

// --- SSR-safety: o canvas MapLibre não instancia WebGL durante renderToString ---

test("OperationsMapLibreCanvas renderiza container + loading no SSR sem carregar WebGL", async () => {
  const { OperationsMapLibreCanvas } = await import(
    "../src/modules/operations/map/components/OperationsMapLibreCanvas"
  );
  const html = renderToString(
    createElement(OperationsMapLibreCanvas, {
      locations: [makeLocation()],
      onSelect: () => undefined,
    }),
  );
  assert.match(html, /operations-map-libre__canvas/);
  assert.match(html, /Carregando mapa operacional/);
});
