import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { OperationsMapLegendFooter } from "../src/modules/operations/map/components/OperationsMapLegendFooter";
import { GoogleMapsCanvas } from "../src/modules/operations/map/components/GoogleMapsCanvas";
// SSR-safe: o MapLibre só carrega WebGL por import() dinâmico dentro do efeito de montagem,
// então importar o componente estaticamente não instancia o mapa em renderToString.
import { OperationsMapLibreCanvas } from "../src/modules/operations/map/components/OperationsMapLibreCanvas";
import {
  MAP_LEGEND_ITEMS,
  WORK_ORDER_PRIORITY_HEX,
  getStatusColor,
} from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

// M-2 (J-MAPAS-6) — Rodapé de legenda UNIFICADO. Prova: (a) o rodapé consome a FONTE ÚNICA
// MAP_LEGEND_ITEMS; (b) a `<ul>` flutuante `operations-map-libre__legend` foi REMOVIDA dos DOIS
// canvases; (c) PARIDADE do espelho — MapLibre e Google renderizam o MESMO rodapé byte-a-byte;
// (d) nenhum hex de status/prioridade solto (a cor vem só de item.color).

const SRC = new URL("../src/modules/operations/map/components/", import.meta.url);
const FOOTER_SRC = readFileSync(fileURLToPath(new URL("OperationsMapLegendFooter.tsx", SRC)), "utf8");
const LIBRE_SRC = readFileSync(fileURLToPath(new URL("OperationsMapLibreCanvas.tsx", SRC)), "utf8");
const GOOGLE_SRC = readFileSync(fileURLToPath(new URL("GoogleMapsCanvas.tsx", SRC)), "utf8");
const CSS = readFileSync(
  fileURLToPath(new URL("../src/styles/app.css", import.meta.url)),
  "utf8",
);

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    displayName: "Ana Souza",
    status: "on_route",
    latitude: -23.55052,
    longitude: -46.633308,
    capturedAt: "2026-07-19T12:00:00.000Z",
    isStale: false,
    ...overrides,
  };
}

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `regra CSS não encontrada: ${selector}`);
  return match![1];
}

// Rótulos com ">" (ex.: "Antiga > 3 min") saem escapados no HTML do React (&gt;); comparamos
// contra a mesma forma escapada.
function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Extrai o fragmento renderizado do rodapé (do <ul> ao primeiro </ul>).
function footerFragment(html: string): string {
  const match = html.match(/<ul class="operations-map-legend-footer"[\s\S]*?<\/ul>/);
  assert.ok(match, "rodapé de legenda não encontrado no HTML");
  return match![0];
}

// 1 — o rodapé consome MAP_LEGEND_ITEMS: 5 status/frescor + 3 prioridades + 1 separador, com a
//     cor de cada swatch vinda INLINE da fonte única (item.color).
test("rodapé renderiza todos os itens de MAP_LEGEND_ITEMS com a cor da fonte única", () => {
  const html = renderToString(createElement(OperationsMapLegendFooter));
  assert.match(html, /class="operations-map-legend-footer"/);

  const dots = (html.match(/operations-map-legend-footer__dot/g) ?? []).length;
  const pins = (html.match(/operations-map-legend-footer__pin/g) ?? []).length;
  const seps = (html.match(/operations-map-legend-footer__sep/g) ?? []).length;
  assert.equal(dots, 5);
  assert.equal(pins, 3);
  assert.equal(seps, 1);

  for (const item of MAP_LEGEND_ITEMS) {
    if (item.kind === "sep") continue;
    assert.ok(html.includes(escapeText(item.label)), `rótulo ausente: ${item.label}`);
    assert.match(html, new RegExp(`background:${item.color}`));
  }
  // Amostras semânticas: status "Disponível" (verde) e prioridade urgente (vermelho da fonte única).
  assert.match(html, new RegExp(`background:${getStatusColor("available")}`));
  assert.match(html, new RegExp(`background:${WORK_ORDER_PRIORITY_HEX.urgent}`));
});

// 2 — nenhum hex de status/prioridade SOLTO no componente: a cor só pode sair de item.color.
test("componente do rodapé não hardcoda hex — cor vem exclusivamente de MAP_LEGEND_ITEMS", () => {
  assert.match(FOOTER_SRC, /import \{ MAP_LEGEND_ITEMS \} from/);
  assert.match(FOOTER_SRC, /style=\{\{ background: item\.color \}\}/);
  // Sem literal de cor hex (#rrggbb) no componente — a paleta é única e mora em mapMarkers.
  assert.doesNotMatch(FOOTER_SRC, /#[0-9a-fA-F]{6}/);
});

// 3 — MapLibre passou a usar o rodapé unificado e REMOVEU a <ul> flutuante.
test("canvas MapLibre usa OperationsMapLegendFooter e removeu a <ul> flutuante", () => {
  const html = renderToString(
    createElement(OperationsMapLibreCanvas, { locations: [makeLocation()], onSelect: () => undefined }),
  );
  assert.match(html, /operations-map-legend-footer/);
  assert.doesNotMatch(html, /operations-map-libre__legend/);
  // Fonte do canvas: a classe flutuante antiga não existe mais e o componente é consumido.
  assert.doesNotMatch(LIBRE_SRC, /operations-map-libre__legend/);
  assert.match(LIBRE_SRC, /<OperationsMapLegendFooter \/>/);
});

// 4 — Google (espelho) passou a usar o mesmo rodapé e também removeu a <ul> flutuante.
test("canvas Google usa OperationsMapLegendFooter e removeu a <ul> flutuante", () => {
  const html = renderToString(
    createElement(GoogleMapsCanvas, {
      loadState: "ready",
      locations: [makeLocation()],
      onSelect: () => undefined,
    }),
  );
  assert.match(html, /operations-map-legend-footer/);
  assert.doesNotMatch(html, /operations-map-libre__legend/);
  assert.doesNotMatch(GOOGLE_SRC, /operations-map-libre__legend/);
  assert.match(GOOGLE_SRC, /<OperationsMapLegendFooter \/>/);
});

// 5 — PARIDADE (regra do espelho): os dois canvases renderizam o MESMO rodapé, byte-a-byte.
test("paridade do espelho: MapLibre e Google renderizam um rodapé idêntico", () => {
  const libreHtml = renderToString(
    createElement(OperationsMapLibreCanvas, { locations: [makeLocation()], onSelect: () => undefined }),
  );
  const googleHtml = renderToString(
    createElement(GoogleMapsCanvas, {
      loadState: "ready",
      locations: [makeLocation()],
      onSelect: () => undefined,
    }),
  );
  const libreFooter = footerFragment(libreHtml);
  const googleFooter = footerFragment(googleHtml);
  // Mesma fonte, mesmo componente → fragmento idêntico (guarda anti-divergência entre canvases).
  assert.equal(libreFooter, googleFooter);
  for (const item of MAP_LEGEND_ITEMS) {
    if (item.kind === "sep") continue;
    const label = escapeText(item.label);
    assert.ok(libreFooter.includes(label) && googleFooter.includes(label));
  }
});

// 6 — CSS: a regra flutuante saiu; o rodapé está ANCORADO à base (sem position:absolute) e com
//     borda superior (limite do container). Swatches sem cor no CSS (a cor é inline da fonte única).
test("CSS: rodapé ancorado à base substitui a regra flutuante .operations-map-libre__legend", () => {
  // A regra flutuante antiga e seus swatches deixaram de existir no CSS.
  assert.doesNotMatch(CSS, /\.operations-map-libre__legend\b/);
  assert.doesNotMatch(CSS, /\.operations-map-libre__dot\b/);
  assert.doesNotMatch(CSS, /\.operations-map-libre__pin\b/);

  const footer = ruleBody(".operations-map-legend-footer");
  assert.match(footer, /display:\s*flex/);
  assert.match(footer, /flex-wrap:\s*wrap/);
  assert.match(footer, /border-top:/); // limite superior do rodapé (base do container)
  assert.doesNotMatch(footer, /position:\s*absolute/); // não flutua sobre o canvas

  // Os swatches do rodapé só têm forma; a cor entra inline (nenhum hex de status/prioridade no CSS).
  const dot = ruleBody(".operations-map-legend-footer__dot");
  const pin = ruleBody(".operations-map-legend-footer__pin");
  assert.doesNotMatch(dot, /#[0-9a-fA-F]{6}/);
  assert.doesNotMatch(pin, /#[0-9a-fA-F]{6}/);
});
