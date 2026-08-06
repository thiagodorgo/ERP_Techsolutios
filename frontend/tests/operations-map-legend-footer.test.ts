import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { OperationsMapLegendFooter } from "../src/modules/operations/map/components/OperationsMapLegendFooter";
import {
  buildLegendFilterEntries,
  countLegendGroups,
  LEGEND_FILTER_ALL_ON,
} from "../src/modules/operations/map/hooks/useLegendFilter";
import {
  MAP_LEGEND_FILTER_ITEMS,
  TECH_GROUP_HEX,
  TECH_STALE_HEX,
  WORK_ORDER_PRIORITY_HEX,
} from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (D6) — a legenda do rodapé VIROU LEGENDA-FILTRO: 8 itens verbatim do protótipo com
// contagem REAL no tooltip (data-tip) e toggle que esconde a camada. Prova: fonte única de cores,
// rótulos verbatim, quadrado rotacionado para OS, estado off, wiring do toggle e hint verbatim.

const SRC = new URL("../src/modules/operations/map/components/", import.meta.url);
const LIBRE_SRC = readFileSync(fileURLToPath(new URL("OperationsMapLibreCanvas.tsx", SRC)), "utf8");
const GOOGLE_SRC = readFileSync(fileURLToPath(new URL("GoogleMapsCanvas.tsx", SRC)), "utf8");
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    displayName: "Ana Souza",
    status: "available",
    latitude: -23.55052,
    longitude: -46.633308,
    capturedAt: "2026-07-19T12:00:00.000Z",
    isStale: false,
    ...overrides,
  };
}

const LOCATIONS = [
  makeLocation({ id: "a", status: "available" }),
  makeLocation({ id: "b", status: "on_route" }),
  makeLocation({ id: "c", status: "in_service" }),
  makeLocation({ id: "d", status: "offline", isStale: true }),
];
const PINS = [
  { priority: "urgent" as const },
  { priority: "high" as const },
  { priority: "medium" as const },
  { priority: "low" as const },
];

function entries() {
  return buildLegendFilterEntries(LEGEND_FILTER_ALL_ON, countLegendGroups(LOCATIONS, PINS));
}

function renderFooter(state = LEGEND_FILTER_ALL_ON, onToggle: (key: string) => void = () => undefined): string {
  const built = buildLegendFilterEntries(state, countLegendGroups(LOCATIONS, PINS));
  return renderToString(
    createElement(OperationsMapLegendFooter, { entries: built, onToggle: onToggle as never }),
  );
}

// 1 — 8 itens com os RÓTULOS VERBATIM do protótipo, na ordem exata.
test("legenda-filtro tem 8 itens verbatim na ordem do protótipo", () => {
  assert.deepEqual(
    MAP_LEGEND_FILTER_ITEMS.map((item) => item.label),
    [
      "Disponível",
      "Em rota",
      "Em atendimento",
      "Localização antiga",
      "Fora de serviço",
      "OS urgente",
      "OS alta",
      "OS média/baixa",
    ],
  );
});

// 2 — cores da FONTE ÚNICA (grupos de status + prioridades do protótipo), nunca hex divergente.
test("cores dos itens vêm da fonte única (TECH_GROUP_HEX / TECH_STALE_HEX / WORK_ORDER_PRIORITY_HEX)", () => {
  const byKey = new Map(MAP_LEGEND_FILTER_ITEMS.map((item) => [item.key, item.color]));
  assert.equal(byKey.get("disp"), TECH_GROUP_HEX.disp);
  assert.equal(byKey.get("rota"), TECH_GROUP_HEX.rota);
  assert.equal(byKey.get("atend"), TECH_GROUP_HEX.atend);
  assert.equal(byKey.get("antiga"), TECH_STALE_HEX);
  assert.equal(byKey.get("off"), TECH_GROUP_HEX.off);
  assert.equal(byKey.get("urg"), WORK_ORDER_PRIORITY_HEX.urgent);
  assert.equal(byKey.get("alta"), WORK_ORDER_PRIORITY_HEX.high);
  assert.equal(byKey.get("mb"), WORK_ORDER_PRIORITY_HEX.medium);
});

// 3 — contagem REAL no tooltip: data-tip = "{n} {sufixo verbatim}" das listas completas.
test("tooltip data-tip carrega contagem real ('1 disponíveis', '1 com localização antiga', '1 OS urgentes')", () => {
  const html = renderFooter();
  assert.match(html, /data-tip="1 disponíveis"/);
  assert.match(html, /data-tip="1 em rota"/);
  assert.match(html, /data-tip="1 em atendimento"/);
  assert.match(html, /data-tip="1 com localização antiga"/);
  assert.match(html, /data-tip="1 fora de serviço"/);
  assert.match(html, /data-tip="1 OS urgentes"/);
  assert.match(html, /data-tip="1 OS alta"/);
  assert.match(html, /data-tip="2 OS média\/baixa"/); // medium + low fundem no grupo mb
});

// 4 — toggle: item OFF ganha .off + aria-pressed=false; clique chama onToggle com a key certa.
test("toggle: estado off vira classe .off/aria-pressed=false; onClick dispara onToggle(key)", () => {
  const offState = { ...LEGEND_FILTER_ALL_ON, urg: false };
  const html = renderFooter(offState);
  assert.match(html, /class="opmap-lg off"[^>]*data-key="urg"[^>]*aria-pressed="false"/);

  // Componente sem hooks → chamada direta é pura; exercita o onClick de verdade.
  const clicked: string[] = [];
  const tree = OperationsMapLegendFooter({
    entries: entries(),
    onToggle: (key) => clicked.push(key),
  }) as unknown as { props: { children: unknown[] } };
  const findButtons = (node: unknown, acc: Array<{ props: Record<string, unknown> }> = []) => {
    if (!node || typeof node !== "object") return acc;
    if (Array.isArray(node)) {
      for (const child of node) findButtons(child, acc);
      return acc;
    }
    const element = node as { type?: unknown; props?: Record<string, unknown> };
    if (element.type === "button") acc.push(element as { props: Record<string, unknown> });
    if (element.props && "children" in element.props) findButtons(element.props.children, acc);
    return acc;
  };
  const buttons = findButtons(tree);
  assert.equal(buttons.length, 8);
  (buttons[0]!.props.onClick as () => void)();
  (buttons[5]!.props.onClick as () => void)();
  assert.deepEqual(clicked, ["disp", "urg"]);
});

// 5 — item de OS usa o QUADRADO 8px rotacionado (losango) e o dot é redondo; barra verbatim.
test("CSS: item de OS = quadrado rotate(45deg) radius 2; barra bottom-0 com bg rgba(13,21,38,0.82)", () => {
  assert.match(CSS, /\.opmap-lg i\.sq\s*\{[^}]*border-radius:\s*2px/);
  assert.match(CSS, /\.opmap-lg i\.sq\s*\{[^}]*transform:\s*rotate\(45deg\)/);
  assert.match(CSS, /\.opmap-lg i\s*\{[^}]*width:\s*8px/);
  const bar = CSS.match(/(?:^|\n)\.opmap-legend\s*\{([^}]*)\}/);
  assert.ok(bar);
  assert.match(bar![1], /bottom:\s*0/);
  assert.match(bar![1], /background:\s*rgb\(13 21 38 \/ 82%\)/);
  assert.match(bar![1], /padding:\s*4px 10px/);
  // Tooltip ::after do protótipo (bottom calc(100% + 9px), bg #0f172a, radius 7).
  assert.match(CSS, /\.opmap-lg::after\s*\{[^}]*bottom:\s*calc\(100% \+ 9px\)/);
  assert.match(CSS, /\.opmap-lg::after\s*\{[^}]*background:\s*#0f172a/);
});

// 6 — hint verbatim + disclaimer honesto das estimativas presentes à direita da barra.
test("hint verbatim do protótipo + disclaimer de estimativas ('linha reta'/'sem trânsito')", () => {
  const html = renderFooter();
  assert.match(html, /Esc limpa a seleção · arraste uma OS até um técnico para alocar/);
  assert.match(html, /linha reta/);
  assert.match(html, /sem trânsito/);
});

// 7 — a legenda é PAGE-LEVEL (D6, paridade de graça): nenhum canvas renderiza legenda própria.
test("nenhum canvas renderiza a legenda (o filtro/legenda vive na página)", () => {
  assert.doesNotMatch(LIBRE_SRC, /OperationsMapLegendFooter/);
  assert.doesNotMatch(GOOGLE_SRC, /OperationsMapLegendFooter/);
  // A <ul> informativa antiga morreu junto com o CSS dela.
  assert.ok(!CSS.includes(".operations-map-legend-footer {"), "CSS da legenda informativa antiga sobrou");
});

// 8 — grupos vazios continuam contando 0 honestamente (nunca inventa contagem).
test("contagem honesta: sem dados → todos os grupos contam 0 (nada fabricado)", () => {
  const counts = countLegendGroups([], []);
  for (const item of MAP_LEGEND_FILTER_ITEMS) {
    assert.equal(counts[item.key], 0);
  }
  const built = buildLegendFilterEntries(LEGEND_FILTER_ALL_ON, counts);
  assert.ok(built.every((entry) => entry.tip.startsWith("0 ")));
});
