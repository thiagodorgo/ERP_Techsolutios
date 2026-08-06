import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  buildOperationalMapStyle,
  OPERATIONAL_MAP_STYLE,
  OPERATIONAL_MAP_TOKENS,
  OPERATIONAL_MAP_DEFAULT_CENTER,
  OPERATIONAL_MAP_DEFAULT_ZOOM,
} from "../src/modules/operations/map/map/mapStyle";
import {
  buildFieldLocationsFeatureCollection,
  easeOutCubic,
  getInitials,
  interpolateCoords,
  lerp,
} from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (D1/D2/D4) — canvas MapLibre pixel do protótipo: estilo CLARO "voyager-like" próprio
// (CARTO rejeitado por ToS; OpenFreeMap keyless mantido), losangos/rotas/popup, memória da visão
// (Brasil z4 default) e REMOÇÃO do auto-fit/focus-city do caminho de câmera. SSR-safe preservado.

const SRC = new URL("../src/modules/operations/map/components/", import.meta.url);
const LIBRE_SRC = readFileSync(fileURLToPath(new URL("OperationsMapLibreCanvas.tsx", SRC)), "utf8");

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

// 1 — OpenFreeMap keyless MANTIDO (regra de ouro Ω1): mesma fonte de tiles, sem chave, sem Google/Mapbox.
test("estilo continua OpenFreeMap keyless (sem googleapis/mapbox/api_key no JSON)", () => {
  const style = buildOperationalMapStyle();
  assert.equal(style.version, 8);
  const source = style.sources.openmaptiles as { type: string; url?: string };
  assert.equal(source.type, "vector");
  assert.equal(source.url, "https://tiles.openfreemap.org/planet");
  assert.match(String(style.glyphs), /tiles\.openfreemap\.org\/fonts/);
  const serialized = JSON.stringify(style);
  assert.doesNotMatch(serialized, /googleapis|mapbox|api_key|access_token/i);
});

// 2 — D1: token-set CLARO "voyager-like" — fundo creme, água azul-clara, vias brancas/amarelas,
//     rótulo cinza-escuro com halo branco. O navy antigo morreu.
test("tokens CLAROS: fundo creme, água azul-clara, vias claras, rótulos cinza-escuros (navy morto)", () => {
  const t = OPERATIONAL_MAP_TOKENS;
  assert.equal(t.background, "#f6f2ea");
  assert.equal(t.water, "#b7d9ec");
  assert.equal(t.roadMinor, "#ffffff");
  assert.equal(t.roadMajor, "#fbe7a3");
  assert.equal(t.label, "#3f4a5c");
  assert.equal(t.labelHalo, "#ffffff");
  // Nenhum token do basemap navy antigo sobrou no estilo.
  const serialized = JSON.stringify(buildOperationalMapStyle());
  assert.doesNotMatch(serialized, /#0f1722|#13233a|#101d28/);
  assert.match(String(buildOperationalMapStyle().name), /claro/i);
});

// 3 — o estilo pinta as camadas com os tokens claros (background/água/rótulo).
test("OPERATIONAL_MAP_STYLE aplica os tokens claros em background, água e place-label", () => {
  const background = OPERATIONAL_MAP_STYLE.layers.find((layer) => layer.id === "background");
  const water = OPERATIONAL_MAP_STYLE.layers.find((layer) => layer.id === "water");
  const placeLabel = OPERATIONAL_MAP_STYLE.layers.find((layer) => layer.id === "place-label");
  assert.equal((background as { paint: Record<string, unknown> }).paint["background-color"], OPERATIONAL_MAP_TOKENS.background);
  assert.equal((water as { paint: Record<string, unknown> }).paint["fill-color"], OPERATIONAL_MAP_TOKENS.water);
  assert.equal((placeLabel as { paint: Record<string, unknown> }).paint["text-color"], OPERATIONAL_MAP_TOKENS.label);
});

// 4 — D4: default de câmera = BRASIL z4 (verbatim do protótipo), ordem [lng, lat] do MapLibre.
test("default de câmera é Brasil ([-52.5, -15.5] z4) — o focus-city saiu do caminho da câmera", () => {
  assert.deepEqual(OPERATIONAL_MAP_DEFAULT_CENTER, [-52.5, -15.5]);
  assert.equal(OPERATIONAL_MAP_DEFAULT_ZOOM, 4);
});

// 5 — AUTO-FIT REMOVIDO (D4): o canvas não chama mais fitBounds nem deriva câmera do conjunto de ids;
//     o easeTo de seleção permanece; a memória da visão manda na câmera inicial.
test("canvas: sem fitBounds/auto-fit; com initialView/onMoveEnd (memória da visão) e easeTo de seleção", () => {
  assert.doesNotMatch(LIBRE_SRC, /fitBounds/);
  assert.doesNotMatch(LIBRE_SRC, /fitKeyRef|idSetKey/);
  assert.match(LIBRE_SRC, /initialView/);
  assert.match(LIBRE_SRC, /onMoveEnd/);
  assert.match(LIBRE_SRC, /map\.on\("moveend"/);
  assert.match(LIBRE_SRC, /panTarget/);
  // Diretiva do dono: NENHUM movimento automático — o único easeTo é o pan explícito por clique.
  assert.doesNotMatch(LIBRE_SRC, /panToSelected/);
  assert.match(LIBRE_SRC, /cluster: false/);
  // Zero movimento por mudança de seleção: mudar seleção (inclusive por HOVER) só REPINTA.
  // A câmera é do operador — só a memória da visão e o pan explícito (panTarget) a movem.
  assert.doesNotMatch(LIBRE_SRC, /prevSelectedIdRef/);
  assert.doesNotMatch(LIBRE_SRC, /fitBounds/);
});

// 6 — marcador do técnico no formato do protótipo: anel 16 (borda por grupo) + miolo 13 (avatar AVC)
//     + iniciais; grupo off esmaece 0.75; cores vêm das props do GeoJSON (fonte única).
test("canvas: círculo 32px (r16 borda + r13 avatar) com iniciais; off esmaecido; cores por props", () => {
  assert.match(LIBRE_SRC, /"circle-radius":\s*16/);
  assert.match(LIBRE_SRC, /"circle-radius":\s*13/);
  assert.match(LIBRE_SRC, /\["get",\s*"borderColor"\]/);
  assert.match(LIBRE_SRC, /\["get",\s*"avatarColor"\]/);
  assert.match(LIBRE_SRC, /0\.75/);
  assert.match(LIBRE_SRC, /"text-field":\s*\["get",\s*"initials"\]/);
});

// 7 — OS = LOSANGO por prioridade (substitui o teardrop) com variante selecionada; pulso/anel mantidos.
test("canvas: icon-image wo-diamond-{prioridade}[-sel]; teardrop morto; wo-pulse e wo-selected-ring vivos", () => {
  assert.match(LIBRE_SRC, /wo-diamond-/);
  assert.match(LIBRE_SRC, /workOrderDiamondSvg/);
  assert.doesNotMatch(LIBRE_SRC, /teardrop/i);
  assert.match(LIBRE_SRC, /"icon-anchor":\s*"center"/);
  assert.match(LIBRE_SRC, /wo-pulse/);
  assert.match(LIBRE_SRC, /wo-selected-ring/);
});

// 8 — ROTAS TRACEJADAS: camada wo-routes com o estilo verbatim (2.5px, #3b82f6, dash, 0.8).
test("canvas: camada wo-routes (LineString por despacho ativo) com dash/cor/largura do protótipo", () => {
  assert.match(LIBRE_SRC, /wo-routes/);
  assert.match(LIBRE_SRC, /WORK_ORDER_ROUTES_SOURCE_ID/);
  assert.match(LIBRE_SRC, /WORK_ORDER_ROUTE_DASHARRAY/);
  assert.match(LIBRE_SRC, /applyRoutesData/);
});

// 9 — POPUP React do marker: root dedicado + unmount no close (leak guard) + fechamento por sinal.
test("canvas: popup com createRoot + unmount adiado no close + closePopupSignal (sem leak)", () => {
  assert.match(LIBRE_SRC, /createRoot/);
  assert.match(LIBRE_SRC, /root\.unmount\(\)/);
  assert.match(LIBRE_SRC, /popup\.on\("close"/);
  assert.match(LIBRE_SRC, /closePopupSignal/);
  assert.match(LIBRE_SRC, /closeWorkOrderPopup\(\)/);
});

// 10 — SSR-safety preservada: renderToString não instancia WebGL (import dinâmico no efeito).
test("SSR: canvas renderiza container + loading sem carregar WebGL", async () => {
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

// 11 — helpers de animação intactos (interpolação mantida; cluster DESLIGADO por paridade pixel).
test("interpolação da animação segue ease-out e ancorada nos extremos (D2: animação mantida)", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.deepEqual(interpolateCoords([0, 0], [10, 20], 0), [0, 0]);
  assert.deepEqual(interpolateCoords([0, 0], [10, 20], 1), [10, 20]);
});

// 12 — GeoJSON dos técnicos segue válido ([lng,lat], seleção, iniciais, coords inválidas fora).
test("buildFieldLocationsFeatureCollection gera [lng,lat], marca selecionado e descarta inválidas", () => {
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
  assert.equal(feature.properties.selected, true);
  assert.equal(feature.properties.initials, getInitials("Ana Souza"));
});

// 13 — LGPD: o canvas não registra coordenada em log.
test("LGPD: canvas MapLibre não loga coordenada", () => {
  const forbidden = /console\.[a-z]+\([^)]*(latitude|longitude|coordinates|\blat\b|\blng\b)/i;
  assert.doesNotMatch(LIBRE_SRC, forbidden);
});
