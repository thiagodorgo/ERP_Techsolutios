import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import { OperationsMapStage } from "../src/modules/operations/map/components/OperationsMapStage";
import { OperationsOperatorList } from "../src/modules/operations/map/components/OperationsOperatorList";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-6 (redesign) — o MAPA é o herói. Este PR SUPERSEDE o grid de 3 colunas do M-1 (que
// espremeu a largura do mapa). Os asserts do grid morreram POR DESIGN; aqui provamos o CONTAINER:
//   • mapa FULL-BLEED (100% da largura útil — largura recuperada) com a altura do M-1 preservada;
//   • rails de VIDRO NAVY absolute (overlays nas bordas, NÃO colunas), colapsáveis por data-collapsed;
//   • Maximizar → stage fixed/inset:0/z60 + card de vidro no 4º QUADRANTE;
//   • sinal de resize (regra do espelho MapLibre↔Google) + padding dos rails;
//   • preservação de tudo da etapa Ω1 (markers/KPIs/filtros/detalhe/realtime/estados) e da legenda (M-2).

const SRC = new URL("../src/modules/operations/map/components/", import.meta.url);
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
const PAGE = readFileSync(
  fileURLToPath(new URL("../src/modules/operations/map/pages/OperationsMapPage.tsx", import.meta.url)),
  "utf8",
);
const STAGE = readFileSync(fileURLToPath(new URL("OperationsMapStage.tsx", SRC)), "utf8");
const LIBRE = readFileSync(fileURLToPath(new URL("OperationsMapLibreCanvas.tsx", SRC)), "utf8");
const GOOGLE = readFileSync(fileURLToPath(new URL("GoogleMapsCanvas.tsx", SRC)), "utf8");
const CANVAS = readFileSync(fileURLToPath(new URL("OperationsMapCanvas.tsx", SRC)), "utf8");

// Extrai o corpo de uma regra CSS de classe única (sem chaves aninhadas). Ancorado ao INÍCIO DE
// LINHA para nunca casar o mesmo nome dentro de um seletor descendente (ex.: a regra do maximizado
// `.operations-map-stage--maximized .operations-map-canvas__gmaps` NÃO deve mascarar a regra base).
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = CSS.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
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

function renderStage(): string {
  return renderToString(
    createElement(OperationsMapStage, {
      map: ({ resizeSignal }): ReactNode =>
        createElement("div", { "data-map": "true" }, `signal:${resizeSignal}`),
      calls: createElement(OperationsIncomingCallsList),
      techs: createElement("div", null, "TECHS_SLOT"),
      techsCount: 3,
    }),
  );
}

// 1 — o grid de 3 colunas MORREU: o stage é full-bleed (position:relative + isolation, sem grid).
test("stage é full-bleed (sem grid de 3 colunas): position:relative + isolation e o mapa ocupa 100%", () => {
  const body = ruleBody(".operations-map-stage");
  assert.match(body, /position:\s*relative/);
  assert.match(body, /isolation:\s*isolate/);
  assert.doesNotMatch(body, /display:\s*grid/);
  assert.doesNotMatch(body, /grid-template-columns/);
  // A classe do grid de 3 colunas (M-1) foi ELIMINADA do CSS (supersede).
  assert.doesNotMatch(CSS, /\.operations-map-layout\b/);
  // O slot do mapa ocupa 100% da largura útil — largura recuperada.
  assert.match(ruleBody(".operations-map-stage__map"), /width:\s*100%/);
});

// 2 — o mapa cobre uma área bem razoável: 100% de largura + a altura dobrada do M-1 preservada
//     nos DOIS canvases (regra do espelho MapLibre/Google).
test("mapa full-bleed: os dois canvases preservam clamp(760px,82vh,960px) e o mapa é 100% de largura", () => {
  const libre = ruleBody(".operations-map-libre");
  const gmaps = ruleBody(".operations-map-canvas__gmaps");
  const clamp = /clamp\(760px,\s*82vh,\s*960px\)/;
  assert.match(libre, new RegExp(`min-height:\\s*${clamp.source}`));
  assert.match(libre, new RegExp(`height:\\s*${clamp.source}`));
  assert.match(gmaps, new RegExp(`min-height:\\s*${clamp.source}`));
  assert.match(gmaps, new RegExp(`height:\\s*${clamp.source}`));
  assert.match(gmaps, /width:\s*100%/);
});

// 3 — os painéis viram OVERLAYS DE VIDRO NAVY absolute nas bordas (não colunas que roubam largura).
test("rails são overlays de vidro navy absolute (chamados à esquerda, técnicos à direita), sem cobrir a legenda", () => {
  const rail = ruleBody(".operations-map-rail");
  assert.match(rail, /position:\s*absolute/);
  assert.match(rail, /backdrop-filter:\s*blur\(18px\)/);
  // vidro navy via TOKEN de série (nunca hex solto §11/J-002): rgb(var(--surface-glass-navy-rgb) / alpha).
  assert.match(rail, /background:\s*rgb\(var\(--surface-glass-navy-rgb\) ?\/ ?90%\)/);
  assert.match(rail, /width:\s*clamp\(300px,\s*24vw,\s*358px\)/);
  // bottom folga p/ não cobrir a legenda ancorada na base do mapa (M-2).
  assert.match(rail, /bottom:\s*calc\(var\(--space-12\) \+ 40px\)/);
  // Fallback de vidro quando o navegador não suporta backdrop-filter.
  assert.match(CSS, /@supports not/);
  assert.match(CSS, /rgb\(var\(--surface-glass-navy-rgb\) ?\/ ?97%\)/);
  // Ancoragem lateral (esquerda/direita), não colunas.
  assert.match(ruleBody(".operations-map-rail--calls"), /left:/);
  assert.match(ruleBody(".operations-map-rail--techs"), /right:/);
});

// 4 — colapso por data-collapsed → 56px. Enquanto a lista real de chamados (M-4) não chega, o default abre
//     o rail de TÉCNICOS (dado real) e colapsa o de CHAMADOS (placeholder) — evita painel vazio na demo.
test("colapso: [data-collapsed=true] encolhe p/ 56px; técnicos aberto (dado real), chamados colapsado, aria-expanded coerente", () => {
  assert.match(ruleBody('.operations-map-rail[data-collapsed="true"]'), /width:\s*56px/);
  const html = renderStage();
  assert.match(html, /operations-map-rail--calls[^>]*data-collapsed="true"/);
  assert.match(html, /operations-map-rail--techs[^>]*data-collapsed="false"/);
  assert.match(html, /aria-expanded="true"/); // um rail aberto (técnicos)
  assert.match(html, /aria-expanded="false"/); // um rail colapsado (chamados)
  // Feature de badge de contagem no rail colapsado (aparece quando há contagem real; M-5 liga no alerta).
  assert.match(CSS, /operations-map-rail__badge/);
  // Rótulos PT-BR (§11).
  assert.match(html, /Chamados que chegam/);
});

// 5 — Maximizar: stage fixed/inset:0/z60 + card de vidro no 4º QUADRANTE; botão presente e stage
//     NÃO nasce maximizado (o quadrante só monta em tela cheia).
test("Maximizar vira fixed/inset:0/z60 + card de vidro no 4º quadrante; botão existe e stage não nasce maximizado", () => {
  const max = ruleBody(".operations-map-stage--maximized");
  assert.match(max, /position:\s*fixed/);
  assert.match(max, /inset:\s*0/);
  assert.match(max, /z-index:\s*60/);
  const quad = ruleBody(".operations-map-quadrant");
  assert.match(quad, /position:\s*absolute/);
  assert.match(quad, /right:\s*16px/);
  assert.match(quad, /bottom:\s*56px/);
  assert.match(quad, /backdrop-filter:\s*blur\(16px\)/);
  // 82% (subido de 72% p/ legibilidade sobre basemap claro — junta cognicao); via token de vidro navy.
  assert.match(quad, /background:\s*rgb\(var\(--surface-glass-navy-rgb\) ?\/ ?82%\)/);
  assert.match(STAGE, /operations-map-quadrant/);

  const html = renderStage();
  assert.match(html, /operations-map-stage__maximize/);
  assert.match(html, /Maximizar/);
  assert.match(html, /aria-pressed="false"/);
  assert.doesNotMatch(html, /operations-map-stage--maximized/);
  assert.doesNotMatch(html, /operations-map-quadrant/); // 4º quadrante só no maximizado
});

// 6 — maximizado é um diálogo modal acessível: role=dialog + aria-modal + Esc + focus-trap; e a
//     transição do rail respeita prefers-reduced-motion.
test("maximizado é diálogo modal acessível (role=dialog/aria-modal/Esc/focus-trap) e respeita reduced-motion", () => {
  assert.match(STAGE, /role: "dialog"/);
  assert.match(STAGE, /"aria-modal": true/);
  assert.match(STAGE, /"Escape"/);
  assert.match(STAGE, /addEventListener\("keydown"/);
  assert.match(STAGE, /previouslyFocused\?\.focus/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
});

// 7 — resize (CRÍTICO, regra do espelho): os 2 canvases aceitam resizeSignal+mapPadding e reagem
//     ~220ms — MapLibre chama resize()+setPadding; Google dispara trigger("resize"); o wrapper repassa.
test("resize do container: MapLibre resize()+setPadding e Google trigger('resize') ~220ms; wrapper repassa (espelho)", () => {
  for (const marker of ["resizeSignal", "mapPadding", ".resize()", "setPadding", "220", '"bottom-right"']) {
    assert.ok(LIBRE.includes(marker), `MapLibre sem: ${marker}`);
  }
  for (const marker of ["resizeSignal", "mapPadding", "google.maps.event.trigger", '"resize"', "220"]) {
    assert.ok(GOOGLE.includes(marker), `Google sem: ${marker}`);
  }
  assert.match(CANVAS, /resizeSignal=\{resizeSignal\}/);
  assert.match(CANVAS, /mapPadding=\{mapPadding\}/);
});

// 8 — o rail de chamados segue um PLACEHOLDER HONESTO (M-4 traz a lista real): sem inventar OS/SLA.
test("placeholder de chamados é honesto (título + 'próxima entrega'), sem fabricar OS/prioridade/SLA", () => {
  const html = renderToString(createElement(OperationsIncomingCallsList));
  assert.match(html, /Chamados que chegam/);
  assert.match(html, /próxima entrega/i);
  assert.doesNotMatch(html, /OS-\d/);
  assert.doesNotMatch(html, /vence em|SLA|prazo restante|\d+\s*min\b/i);
});

// 9 — a página troca o grid pelo OperationsMapStage (slots map/calls/techs), sem duplicar a lista,
//     mantém a faixa de detalhe ABAIXO do stage e PRESERVA tudo da etapa Ω1.
test("página monta OperationsMapStage com slots, detalhe abaixo, lista não duplicada e Ω1 preservado", () => {
  assert.match(PAGE, /<OperationsMapStage/);
  assert.match(PAGE, /map=\{\(\{ resizeSignal, mapPadding \}\) =>/);
  assert.match(PAGE, /calls=\{<OperationsIncomingCallsList \/>\}/);
  assert.match(PAGE, /techs=\{/);

  // A lista de técnicos aparece UMA vez (movida para o slot, não duplicada).
  const listUses = PAGE.match(/<OperationsOperatorList\b/g) ?? [];
  assert.equal(listUses.length, 1);

  // A faixa de detalhe da seleção segue ABAIXO do stage (nada da etapa Ω1 foi perdido).
  const stageIdx = PAGE.indexOf("<OperationsMapStage");
  const detailIdx = PAGE.indexOf("operations-map-detail");
  assert.ok(stageIdx > 0 && detailIdx > stageIdx);

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

// 10 — o rail de técnicos REUSA o OperationsOperatorList (cartões compactos) e a legenda unificada
//      do rodapé (M-2) permanece VERDE — os dois canvases seguem consumindo o mesmo rodapé.
test("técnicos reusa OperationsOperatorList (cartões compactos) e a legenda do rodapé (M-2) é preservada", () => {
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
  // Legenda unificada (M-2) segue verde: os dois canvases consomem o rodapé e a classe existe.
  assert.match(LIBRE, /<OperationsMapLegendFooter \/>/);
  assert.match(GOOGLE, /<OperationsMapLegendFooter \/>/);
  assert.match(CSS, /\.operations-map-legend-footer\b/);
  // No rail, a tabela larga vira cartões compactos sobre o vidro navy.
  assert.match(CSS, /\.operations-map-rail--techs \.ui-table-wrap\s*\{\s*display:\s*none;/);
  assert.match(CSS, /\.operations-map-rail--techs \.operations-operator-cards\s*\{\s*display:\s*grid;/);
});
