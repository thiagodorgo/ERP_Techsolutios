import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import { OperationsMapStage } from "../src/modules/operations/map/components/OperationsMapStage";
import { OperationsOperatorList } from "../src/modules/operations/map/components/OperationsOperatorList";
import type { FieldLocationItem, OperationsIncomingCall } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-6 (redesign) — o MAPA é o herói. Este PR SUPERSEDE o grid de 3 colunas do M-1 (que
// espremeu a largura do mapa). Os asserts do grid morreram POR DESIGN; aqui provamos o CONTAINER:
//   • mapa FULL-BLEED (100% da largura útil — largura recuperada) com a altura do M-1 preservada;
//   • rails de VIDRO NAVY absolute (overlays nas bordas, NÃO colunas), colapsáveis por data-collapsed;
//   • SPRINT POLISH (C): o modo "Maximizar" próprio do Stage MORREU (caía numa tela tosca) — o
//     fullscreen agora é NATIVO do mapa (FullscreenControl no MapLibre / fullscreenControl no Google,
//     ambos no canto inferior direito). Sem botão Maximizar, sem 4º quadrante, sem diálogo modal;
//   • SPRINT POLISH (B): rail COLAPSADO deixa de ser faixa de 56px full-height e vira pílula fina
//     top-anchored (width:auto/height:44px) que não interfere no mapa;
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

// M-4 — a fila real de "chamados que chegam" (o rail agora abre por default e renderiza esta lista).
const SAMPLE_CALLS: OperationsIncomingCall[] = [
  {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "urgent",
    customerName: "Cliente A",
    scheduledFor: null,
    createdAt: "2026-07-19T11:00:00.000Z",
    hasLocation: true,
  },
  {
    id: "wo-2",
    code: "OS-2",
    title: "Reparo",
    priority: "low",
    customerName: "Cliente B",
    scheduledFor: "2026-07-20T09:00:00.000Z",
    createdAt: "2026-07-19T10:00:00.000Z",
    hasLocation: false,
  },
];

function renderStage(): string {
  return renderToString(
    createElement(OperationsMapStage, {
      map: ({ resizeSignal }): ReactNode =>
        createElement("div", { "data-map": "true" }, `signal:${resizeSignal}`),
      calls: createElement(OperationsIncomingCallsList, {
        calls: SAMPLE_CALLS,
        onSelect: () => undefined,
        now: new Date("2026-07-19T12:00:00.000Z"),
      }),
      techs: createElement("div", null, "TECHS_SLOT"),
      callsCount: SAMPLE_CALLS.length,
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

// 4 — SPRINT POLISH (B): colapsado NÃO é mais faixa de 56px full-height que interfere no mapa —
//     vira PÍLULA fina top-anchored (width:auto/height:44px/bottom:auto). M-4 entregou a lista REAL →
//     default do plano: CHAMADOS ABERTO (master/triagem) e TÉCNICOS COLAPSADO (status já vive nos
//     marcadores). O badge do rail colapsado mostra a contagem real (callsCount/techsCount).
test("colapso: [data-collapsed=true] vira pílula fina (width:auto/height:44px/bottom:auto, não 56px full-height); CHAMADOS aberto, técnicos colapsado, aria-expanded coerente", () => {
  const collapsed = ruleBody('.operations-map-rail[data-collapsed="true"]');
  assert.match(collapsed, /width:\s*auto/);
  assert.match(collapsed, /height:\s*44px/);
  assert.match(collapsed, /bottom:\s*auto/);
  // A faixa de 56px full-height do modelo antigo (que cobria o mapa) não existe mais.
  assert.doesNotMatch(collapsed, /width:\s*56px/);
  const html = renderStage();
  assert.match(html, /operations-map-rail--calls[^>]*data-collapsed="false"/);
  assert.match(html, /operations-map-rail--techs[^>]*data-collapsed="true"/);
  assert.match(html, /aria-expanded="true"/); // um rail aberto (chamados)
  assert.match(html, /aria-expanded="false"/); // um rail colapsado (técnicos)
  // Badge de contagem no rail colapsado (técnicos): callsCount/techsCount reais alimentam o badge.
  assert.match(CSS, /operations-map-rail__badge/);
  assert.match(html, /operations-map-rail__badge/); // técnicos colapsado → badge com a contagem
  assert.match(html, />3</); // techsCount=3 renderizado no badge
  // Rótulos PT-BR (§11).
  assert.match(html, /Chamados que chegam/);
});

// 5 — SPRINT POLISH (C): o modo "Maximizar" próprio do Stage (botão + fixed/inset:0/z60 + 4º
//     quadrante de vidro) foi REMOVIDO — caía numa tela tosca. O fullscreen agora é NATIVO do mapa.
//     Provamos a AUSÊNCIA no STAGE, no CSS e no HTML renderizado (nada de andaime do modo antigo).
test("modo Maximizar próprio do Stage foi removido: sem botão/--maximized/quadrante no STAGE, no CSS nem no render", () => {
  // As classes do modo antigo saíram do CSS (removê-las evita ruleBody lançar por regra inexistente).
  assert.doesNotMatch(CSS, /\.operations-map-stage__maximize\b/);
  assert.doesNotMatch(CSS, /\.operations-map-stage--maximized\b/);
  assert.doesNotMatch(CSS, /\.operations-map-quadrant\b/);
  // O componente do Stage não referencia mais nenhum artefato do modo maximizar (classes/quadrante).
  // (A palavra "Maximizar" só sobrevive no comentário que DOCUMENTA a remoção — provamos a ausência
  //  real no HTML renderizado abaixo, onde não há mais botão.)
  assert.doesNotMatch(STAGE, /operations-map-stage__maximize/);
  assert.doesNotMatch(STAGE, /operations-map-stage--maximized/);
  assert.doesNotMatch(STAGE, /operations-map-quadrant/);

  const html = renderStage();
  assert.doesNotMatch(html, /operations-map-stage__maximize/);
  assert.doesNotMatch(html, /operations-map-stage--maximized/);
  assert.doesNotMatch(html, /operations-map-quadrant/);
  assert.doesNotMatch(html, /Maximizar/);
});

// 6 — SPRINT POLISH (C): sem modo maximizar próprio, o diálogo modal (role=dialog/aria-modal/Esc/
//     focus-trap) foi REMOVIDO do Stage — a acessibilidade do fullscreen fica por conta do controle
//     nativo do mapa. O que sobra válido: a transição do rail/toast respeita prefers-reduced-motion.
test("o diálogo modal do maximizar saiu do Stage (sem role=dialog/aria-modal/Esc/focus-trap) e reduced-motion segue honrado", () => {
  assert.doesNotMatch(STAGE, /role: "dialog"/);
  assert.doesNotMatch(STAGE, /"aria-modal": true/);
  assert.doesNotMatch(STAGE, /"Escape"/);
  assert.doesNotMatch(STAGE, /addEventListener\("keydown"/);
  assert.doesNotMatch(STAGE, /previouslyFocused/);
  // A supressão de movimento continua no CSS (transição do rail + animações do toast/badge).
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
});

// 7 — resize (CRÍTICO, regra do espelho): os 2 canvases aceitam resizeSignal+mapPadding e reagem
//     ~220ms — MapLibre chama resize()+setPadding; Google dispara trigger("resize"); o wrapper repassa.
//     SPRINT POLISH (C): o espelho também cobre o fullscreen NATIVO — MapLibre adiciona
//     FullscreenControl em "bottom-right"; Google seta fullscreenControl em RIGHT_BOTTOM.
test("resize do container + fullscreen nativo (espelho): MapLibre resize()/setPadding/FullscreenControl e Google trigger('resize')/fullscreenControl RIGHT_BOTTOM ~220ms; wrapper repassa", () => {
  for (const marker of ["resizeSignal", "mapPadding", ".resize()", "setPadding", "220", '"bottom-right"', "FullscreenControl"]) {
    assert.ok(LIBRE.includes(marker), `MapLibre sem: ${marker}`);
  }
  for (const marker of ["resizeSignal", "mapPadding", "google.maps.event.trigger", '"resize"', "220", "fullscreenControl", "RIGHT_BOTTOM"]) {
    assert.ok(GOOGLE.includes(marker), `Google sem: ${marker}`);
  }
  assert.match(CANVAS, /resizeSignal=\{resizeSignal\}/);
  assert.match(CANVAS, /mapPadding=\{mapPadding\}/);
});

// 8 — o rail de chamados agora é a LISTA REAL (M-4): itens com prioridade + SLA-PROXY honesto, sem
//     "vence em"/prazo fabricado; e o estado vazio não inventa OS.
test("chamados: lista real com prioridade + SLA-proxy honesto (sem 'vence em'); vazio não fabrica OS", () => {
  const html = renderToString(
    createElement(OperationsIncomingCallsList, {
      calls: SAMPLE_CALLS,
      onSelect: () => undefined,
      now: new Date("2026-07-19T12:00:00.000Z"),
    }),
  );
  assert.match(html, /Chamados que chegam/);
  assert.match(html, /OS-1/);
  assert.match(html, /Urgente/); // chip de prioridade PT-BR
  assert.match(html, /Aberto|Agendado para/); // rótulo de prazo derivado (honesto)
  assert.doesNotMatch(html, /vence em|prazo restante/i);
  assert.doesNotMatch(html, /próxima entrega/i); // placeholder do M-1 morreu

  const empty = renderToString(
    createElement(OperationsIncomingCallsList, { calls: [], onSelect: () => undefined }),
  );
  assert.match(empty, /Nenhum chamado aberto/);
  assert.doesNotMatch(empty, /OS-\d/);
});

// 9 — a página troca o grid pelo OperationsMapStage (slots map/calls/techs), sem duplicar a lista,
//     mantém a faixa de detalhe ABAIXO do stage e PRESERVA tudo da etapa Ω1.
test("página monta OperationsMapStage com slots, detalhe abaixo, lista não duplicada e Ω1 preservado", () => {
  assert.match(PAGE, /<OperationsMapStage/);
  assert.match(PAGE, /map=\{\(\{ resizeSignal, mapPadding \}\) =>/);
  // M-4 — o slot `calls` recebe a lista REAL com dados (buildIncomingCalls) + a contagem para o badge.
  assert.match(PAGE, /calls=\{[\s\S]*?<OperationsIncomingCallsList/);
  assert.match(PAGE, /buildIncomingCalls\(/);
  assert.match(PAGE, /callsCount=\{incomingCalls\.length\}/);
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
  // M-3 — terminologia §3 reconciliada: o card reusado agora diz "Técnicos de Campo" (era "Operadores
  // em campo"), casando com o rótulo do rail direito e com a linguagem PT-BR de negócio.
  assert.match(html, /Técnicos de Campo/);
  assert.doesNotMatch(html, /Operadores em campo/);
  assert.match(html, /operations-operator-card/); // visão compacta usada no rail
  // Legenda unificada (M-2) segue verde: os dois canvases consomem o rodapé e a classe existe.
  assert.match(LIBRE, /<OperationsMapLegendFooter \/>/);
  assert.match(GOOGLE, /<OperationsMapLegendFooter \/>/);
  assert.match(CSS, /\.operations-map-legend-footer\b/);
  // No rail, a tabela larga vira cartões compactos sobre o vidro navy.
  assert.match(CSS, /\.operations-map-rail--techs \.ui-table-wrap\s*\{\s*display:\s*none;/);
  assert.match(CSS, /\.operations-map-rail--techs \.operations-operator-cards\s*\{\s*display:\s*grid;/);
});
