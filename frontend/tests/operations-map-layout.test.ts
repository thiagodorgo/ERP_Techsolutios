import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import { OperationsOperatorList } from "../src/modules/operations/map/components/OperationsOperatorList";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

// M-1 (J-MAPAS-6) — Fundação de layout do Mapa Operacional: grid de 3 colunas
// (chamados · mapa · Técnicos de Campo), altura do mapa dobrada e placeholder honesto de chamados.
// Estes testes provam a fundação SEM tocar em camadas de marcador/legenda/alerta (M-2..M-6).

const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
const PAGE = readFileSync(
  fileURLToPath(new URL("../src/modules/operations/map/pages/OperationsMapPage.tsx", import.meta.url)),
  "utf8",
);

// Extrai o corpo de uma regra CSS de classe única (sem chaves aninhadas).
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `regra CSS não encontrada: ${selector}`);
  return match![1];
}

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
    teamName: "Equipe Sul",
    ...overrides,
  };
}

// 1 — o grid é de 3 colunas: chamados (rail) · mapa (elástico) · técnicos (rail).
test("layout é grid de 3 colunas [chamados | mapa | técnicos] com rails de 300–340px", () => {
  const body = ruleBody(".operations-map-layout");
  assert.match(body, /display:\s*grid/);
  assert.match(
    body,
    /grid-template-columns:\s*minmax\(300px,\s*340px\)\s+minmax\(0,\s*1fr\)\s+minmax\(300px,\s*340px\)/,
  );
});

// 2 — a altura do mapa DOBRA nos dois canvases (regra do espelho), com teto por viewport.
test("os dois canvases usam clamp(760px, 82vh, 960px) — ≥2× o atual e paridade MapLibre/Google", () => {
  const libre = ruleBody(".operations-map-libre");
  const gmaps = ruleBody(".operations-map-canvas__gmaps");
  const clamp = /clamp\(760px,\s*82vh,\s*960px\)/;
  // Espelho: valor idêntico nos dois canvases, em min-height e height.
  assert.match(libre, new RegExp(`min-height:\\s*${clamp.source}`));
  assert.match(libre, new RegExp(`height:\\s*${clamp.source}`));
  assert.match(gmaps, new RegExp(`min-height:\\s*${clamp.source}`));
  assert.match(gmaps, new RegExp(`height:\\s*${clamp.source}`));
  // A altura antiga fixa desapareceu (libre 480px, gmaps 380px).
  assert.doesNotMatch(libre, /480px/);
  assert.doesNotMatch(gmaps, /380px/);
  // ≥2× o valor de origem: piso 760 = 2×380 (gmaps); teto 960 = 2×480 (libre).
  const floor = 760;
  const ceil = 960;
  assert.ok(floor >= 2 * 380, "piso deve ser ≥ 2× a altura antiga do gmaps (380px)");
  assert.ok(ceil >= 2 * 480, "teto deve ser ≥ 2× a altura antiga do libre (480px)");
});

// 3 — colapsa para 1 coluna abaixo de 1100px e o rail de técnicos usa a visão compacta de cartões.
test("colapsa em 1 coluna <1100px e a coluna de técnicos troca a tabela larga por cartões compactos", () => {
  assert.match(
    CSS,
    /@media \(max-width:\s*1100px\)\s*\{\s*\.operations-map-layout\s*\{\s*grid-template-columns:\s*1fr;/,
  );
  // Rail estreito: esconde a tabela e mostra os cartões dentro da coluna de técnicos.
  assert.match(CSS, /\.operations-map-technicians \.ui-table-wrap\s*\{\s*display:\s*none;/);
  assert.match(CSS, /\.operations-map-technicians \.operations-operator-cards\s*\{\s*display:\s*grid;/);
});

// 4 — a coluna de chamados é um PLACEHOLDER HONESTO: título + estado vazio, sem fabricar dados/SLA.
test("placeholder de chamados é honesto (título + 'próxima entrega'), sem inventar OS/prioridade/SLA", () => {
  const html = renderToString(createElement(OperationsIncomingCallsList));
  assert.match(html, /Chamados que chegam/);
  assert.match(html, /próxima entrega/i);
  // Nada de dado fabricado: sem código de OS, sem contagem regressiva, sem "vence em".
  assert.doesNotMatch(html, /OS-\d/);
  assert.doesNotMatch(html, /vence em|SLA|prazo restante|\d+\s*min\b/i);
});

// 5 — a coluna de técnicos RENDERIZA o OperationsOperatorList reusado (com um Técnico de Campo).
test("coluna de técnicos renderiza o OperationsOperatorList existente com o técnico em campo", () => {
  const html = renderToString(
    createElement(OperationsOperatorList, {
      locations: [makeLocation()],
      selectedId: "loc-1",
      onSelect: () => undefined,
    }),
  );
  assert.match(html, /Ana Souza/);
  assert.match(html, /Operadores em campo/); // título do card reusado (componente inalterado)
  assert.match(html, /operations-operator-card/); // visão compacta usada no rail
});

// 6 — a página posiciona os componentes nas colunas certas e PRESERVA tudo da etapa Ω1.
test("página monta chamados/técnicos nas colunas certas, lista NÃO duplicada e preserva Ω1", () => {
  // Placeholder de chamados na 1ª coluna; lista de técnicos na 3ª coluna.
  assert.match(PAGE, /operations-map-incoming/);
  assert.match(PAGE, /<OperationsIncomingCallsList/);
  assert.match(PAGE, /operations-map-technicians/);

  // OperationsOperatorList aparece UMA vez (movido, não duplicado)…
  const listUses = PAGE.match(/<OperationsOperatorList\b/g) ?? [];
  assert.equal(listUses.length, 1);
  // …e vive DENTRO da coluna de técnicos (entre o rail de técnicos e a faixa de detalhe).
  const techIdx = PAGE.indexOf("operations-map-technicians");
  const listIdx = PAGE.indexOf("<OperationsOperatorList");
  const detailIdx = PAGE.indexOf("operations-map-detail");
  assert.ok(techIdx > 0 && listIdx > techIdx && detailIdx > listIdx);

  // Preservação da etapa Ω1: header/realtime, KPIs, filtros, painel de detalhe, polling/SSE e estados §7.
  for (const marker of [
    "useOperationsMap",
    "OperationsMapSummaryCards",
    "OperationsMapFilters",
    "OperationsOperatorDetailPanel",
    "OperationsWorkOrdersWithoutLocationPanel",
    "realtime",
    "Privacidade operacional",
    "Skeleton",
    "EmptyState",
    "ErrorState",
    'source === "fallback"',
  ]) {
    assert.ok(PAGE.includes(marker), `marcador de preservação ausente: ${marker}`);
  }
});
