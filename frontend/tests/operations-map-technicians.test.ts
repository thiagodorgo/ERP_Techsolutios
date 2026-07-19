import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { GoogleMapsCanvas } from "../src/modules/operations/map/components/GoogleMapsCanvas";
// SSR-safe: o MapLibre só instancia WebGL por import() dinâmico dentro do efeito de montagem.
import { OperationsMapLibreCanvas } from "../src/modules/operations/map/components/OperationsMapLibreCanvas";
import { OperationsOperatorList } from "../src/modules/operations/map/components/OperationsOperatorList";
import {
  OPERATIONS_MAP_SOURCE_ID,
  WORK_ORDERS_MAP_SOURCE_ID,
  buildFieldLocationsFeatureCollection,
  getStatusColor,
  isRingAvailable,
  STALE_GRAY_MS,
} from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem, OperationsMapWorkOrderPin } from "../src/modules/operations/map/operations-map.types";

// M-3 (J-MAPAS-6) — Camada distinta de técnicos + disponibilidade (requisito 2 do dono: onde e COMO
// estão os técnicos). Prova: (1) a CAMADA de técnicos (fonte field-operators, anel por status) é
// distinta da de OS (teardrop por prioridade) e realça DISPONIBILIDADE nos dois canvases (espelho);
// (2) o rail direito destaca available/em rota/em atendimento/offline com getStatusColor (console de
// alocação); (3) terminologia §3 reconciliada ("Técnicos de Campo"); (4) a legenda de disponibilidade
// aparece nos DOIS canvases (paridade do rodapé M-2); (5) o fix P-MAPA-GOOGLE-PADDING-RESIZE re-enquadra
// o Google quando o padding dos rails muda; LGPD zero-coordenada nos canvases.

const SRC = new URL("../src/modules/operations/map/components/", import.meta.url);
const LIBRE_SRC = readFileSync(fileURLToPath(new URL("OperationsMapLibreCanvas.tsx", SRC)), "utf8");
const GOOGLE_SRC = readFileSync(fileURLToPath(new URL("GoogleMapsCanvas.tsx", SRC)), "utf8");

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    displayName: "Ana Souza",
    status: "available",
    latitude: -23.55052,
    longitude: -46.633308,
    capturedAt: new Date().toISOString(), // fresco por padrão (ao vivo)
    isStale: false,
    teamName: "Equipe Sul",
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

function renderGoogle(props: Partial<Parameters<typeof GoogleMapsCanvas>[0]> = {}): string {
  return renderToString(
    createElement(GoogleMapsCanvas, { loadState: "ready", locations: [], onSelect: () => undefined, ...props }),
  );
}

function renderList(locations: FieldLocationItem[]): string {
  return renderToString(
    createElement(OperationsOperatorList, { locations, onSelect: () => undefined }),
  );
}

// Extrai o fragmento do rodapé de legenda (mesmo utilitário do teste M-2) para comparar os dois canvases.
function footerFragment(html: string): string {
  const match = html.match(/<ul class="operations-map-legend-footer"[\s\S]*?<\/ul>/);
  assert.ok(match, "rodapé de legenda não encontrado no HTML");
  return match![0];
}

// 1 — isRingAvailable = "disponível AO VIVO": só verdadeiro para available com posição fresca (não mente
//     sobre posição velha). Fonte única do realce de disponibilidade dos dois canvases.
test("isRingAvailable é verdadeiro só para 'available' fresco (posição velha ou outro status = falso)", () => {
  const now = Date.now();
  assert.equal(isRingAvailable(makeLocation({ status: "available" }), now), true);
  assert.equal(isRingAvailable(makeLocation({ status: "on_route" }), now), false);
  assert.equal(isRingAvailable(makeLocation({ status: "offline" }), now), false);
  const staleAvailable = makeLocation({
    status: "available",
    capturedAt: new Date(now - STALE_GRAY_MS - 1000).toISOString(),
  });
  assert.equal(isRingAvailable(staleAvailable, now), false); // envelheceu → anel cinza, não "disponível"
});

// 2 — a CAMADA de técnicos carrega a prop `available` no GeoJSON: é o que o anel usa para realçar quem
//     está livre sem mudar o provider.
test("buildFieldLocationsFeatureCollection marca available só para técnico disponível ao vivo", () => {
  const now = Date.now();
  const fc = buildFieldLocationsFeatureCollection(
    [
      makeLocation({ id: "a", status: "available" }),
      makeLocation({ id: "b", status: "in_service" }),
      makeLocation({ id: "c", status: "available", capturedAt: new Date(now - STALE_GRAY_MS - 1000).toISOString() }),
    ],
    undefined,
    now,
  );
  const byId = new Map(fc.features.map((feature) => [feature.properties.id, feature.properties.available]));
  assert.equal(byId.get("a"), true);
  assert.equal(byId.get("b"), false);
  assert.equal(byId.get("c"), false); // available porém velho → não realçado
});

// 3 — DISTINÇÃO de camadas no MapLibre: técnicos = fonte clusterizada `field-operators` (anel `op-ring`
//     por status) com realce de disponibilidade; OS = fonte `work-order-pins` (teardrop por prioridade).
//     Ids de fonte distintos garantem que técnico e OS nunca compartilham camada.
test("MapLibre: camada de técnico (field-operators/anel) distinta da de OS (work-order-pins/teardrop) + realça available", () => {
  assert.equal(OPERATIONS_MAP_SOURCE_ID, "field-operators");
  assert.equal(WORK_ORDERS_MAP_SOURCE_ID, "work-order-pins");
  assert.notEqual(OPERATIONS_MAP_SOURCE_ID, WORK_ORDERS_MAP_SOURCE_ID);
  // As duas fontes são referenciadas por constante (nunca string mágica repetida).
  assert.match(LIBRE_SRC, /source:\s*OPERATIONS_MAP_SOURCE_ID/);
  assert.match(LIBRE_SRC, /source:\s*WORK_ORDERS_MAP_SOURCE_ID/);
  // Anel do técnico realça disponibilidade via a prop de feature (raio maior + contorno).
  assert.match(LIBRE_SRC, /id:\s*"op-ring"/);
  assert.match(LIBRE_SRC, /\["boolean",\s*\["get",\s*"available"\],\s*false\]/);
  // OS é teardrop (símbolo por prioridade), não disco de técnico.
  assert.match(LIBRE_SRC, /wo-teardrop/);
  assert.match(LIBRE_SRC, /icon-image/);
});

// 4 — ESPELHO no Google: técnico disponível ao vivo ganha a classe --available (halo); OS é teardrop
//     `gmp-workorder-pin`, forma distinta do disco `gmp-operator-pin` do técnico.
test("Google (espelho): técnico available ganha --available; OS teardrop distinto do disco do técnico", () => {
  const html = renderGoogle({
    locations: [makeLocation({ status: "available" })],
    workOrderPins: [makePin({ priority: "urgent" })],
  });
  assert.match(html, /gmp-operator-pin--available/); // realce de disponibilidade no técnico
  assert.match(html, /gmp-workorder-pin/); // OS = teardrop, camada visual distinta
  // A cor do halo vem da fonte única (getStatusColor via --operator-ring), não de hex solto.
  assert.match(html, new RegExp(`--operator-ring:${getStatusColor("available")}`));
});

// 5 — o realce Google NÃO mente: outro status ou posição velha não recebe --available (só disco de status).
test("Google: sem --available para status não-disponível ou posição envelhecida", () => {
  const inService = renderGoogle({ locations: [makeLocation({ status: "in_service" })] });
  assert.doesNotMatch(inService, /gmp-operator-pin--available/);
  const stale = renderGoogle({
    locations: [makeLocation({ status: "available", capturedAt: new Date(Date.now() - STALE_GRAY_MS - 1000).toISOString() })],
  });
  assert.doesNotMatch(stale, /gmp-operator-pin--available/);
});

// 6 — REALCE no rail direito (console de alocação): cada cartão expõe data-status e a barra de
//     disponibilidade na cor de getStatusColor (available verde, em rota azul, offline cinza) — sem hex solto.
test("rail de técnicos realça disponibilidade: data-status + --operator-accent = getStatusColor por status", () => {
  const html = renderList([
    makeLocation({ id: "a", displayName: "Ana Souza", status: "available" }),
    makeLocation({ id: "b", displayName: "Bruno Dias", status: "on_route" }),
    makeLocation({ id: "c", displayName: "Caio Melo", status: "offline" }),
  ]);
  assert.match(html, /data-status="available"/);
  assert.match(html, /data-status="on_route"/);
  assert.match(html, /data-status="offline"/);
  assert.match(html, new RegExp(`--operator-accent:${getStatusColor("available")}`)); // verde = livre
  assert.match(html, new RegExp(`--operator-accent:${getStatusColor("on_route")}`));
  assert.match(html, new RegExp(`--operator-accent:${getStatusColor("offline")}`));
});

// 7 — TERMINOLOGIA §3 reconciliada: o card reusado diz "Técnicos de Campo" e a coluna "Técnico"
//     (era "Operadores em campo"/"Operador"), casando com o rótulo do rail direito.
test("terminologia §3: card 'Técnicos de Campo' + coluna 'Técnico'; nada de 'Operadores em campo'/'Operador'", () => {
  const html = renderList([makeLocation({ displayName: "Ana Souza" })]);
  assert.match(html, /Técnicos de Campo/); // título do card
  assert.match(html, /Técnico/); // cabeçalho da coluna
  assert.doesNotMatch(html, /Operadores em campo/);
  assert.doesNotMatch(html, /Operador/); // sem termo antigo (displayName não contém "Operador")
});

// 8 — a LEGENDA de disponibilidade do técnico aparece nos DOIS canvases (paridade do rodapé M-2): o
//     swatch "Disponível" usa a MESMA cor da fonte única (getStatusColor) e os rodapés são idênticos.
test("legenda de disponibilidade ('Disponível' verde) presente e IDÊNTICA nos dois canvases", () => {
  const libre = renderToString(
    createElement(OperationsMapLibreCanvas, { locations: [makeLocation()], onSelect: () => undefined }),
  );
  const google = renderGoogle({ locations: [makeLocation()] });
  const libreFooter = footerFragment(libre);
  const googleFooter = footerFragment(google);
  for (const footer of [libreFooter, googleFooter]) {
    assert.match(footer, /Disponível/);
    assert.match(footer, new RegExp(`background:${getStatusColor("available")}`));
  }
  // Paridade do espelho: mesmo rodapé byte-a-byte (a distinção técnico×OS mora na mesma fonte MAP_LEGEND_ITEMS).
  assert.equal(libreFooter, googleFooter);
});

// 9 — FIX P-MAPA-GOOGLE-PADDING-RESIZE: o Google guarda os pontos do cluster vencedor e RE-ENQUADRA com
//     o padding ATUAL quando o layout muda (resize dispara junto com a mudança de mapPadding) — antes só
//     aplicava padding no fitBounds inicial e um pin de borda ficava sob o vidro.
test("Google re-enquadra com o padding atual no resize (fecha P-MAPA-GOOGLE-PADDING-RESIZE)", () => {
  assert.match(GOOGLE_SRC, /winnerPointsRef\s*=\s*useRef/);
  assert.match(GOOGLE_SRC, /winnerPointsRef\.current\s*=\s*points/); // guarda os pontos no fitBounds inicial
  // O helper de enquadramento usa fitBounds com o padding dos rails.
  assert.match(GOOGLE_SRC, /fitInnerMapToWinner\s*=\s*\(innerMap[^)]*padding/);
  assert.match(GOOGLE_SRC, /innerMap\.fitBounds\(/);
  // No efeito de resize: dispara trigger("resize") E re-enquadra com o padding ATUAL (mapPaddingRef).
  assert.match(GOOGLE_SRC, /google\.maps\.event\.trigger\(innerMap,\s*"resize"\)/);
  assert.match(GOOGLE_SRC, /fitInnerMapToWinner\(innerMap,\s*mapPaddingRef\.current\)/);
  // Chamado em DOIS pontos (fit inicial + re-fit de resize).
  assert.equal((GOOGLE_SRC.match(/fitInnerMapToWinner\(innerMap/g) ?? []).length, 2);
});

// 10 — ESPELHO do resize: o MapLibre já reaplica setPadding persistente + resize(); o fix Google alinha o
//      comportamento. Guarda de paridade do padding entre os canvases.
test("espelho do padding no resize: MapLibre reaplica setPadding+resize e Google re-fitBounds com padding", () => {
  assert.match(LIBRE_SRC, /applyMapPadding\(map\)/);
  assert.match(LIBRE_SRC, /map\.setPadding\(/);
  assert.match(LIBRE_SRC, /map\.resize\(\)/);
  // Google: re-enquadramento com padding no mesmo gatilho ~220ms (regra do espelho).
  assert.match(GOOGLE_SRC, /fitInnerMapToWinner\(innerMap,\s*mapPaddingRef\.current\)/);
  assert.ok(GOOGLE_SRC.includes("220") && LIBRE_SRC.includes("220"));
});

// 11 — LGPD §12: nenhum canvas registra coordenada em log (posição de técnico é dado sensível).
test("LGPD: os canvases não logam coordenada (sem console com lat/lng/coordinates)", () => {
  const forbidden = /console\.[a-z]+\([^)]*(latitude|longitude|coordinates|\blat\b|\blng\b)/i;
  assert.doesNotMatch(LIBRE_SRC, forbidden);
  assert.doesNotMatch(GOOGLE_SRC, forbidden);
});
