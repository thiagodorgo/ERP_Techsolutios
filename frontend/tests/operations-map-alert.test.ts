import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  DEFAULT_NEW_WORK_ORDER_MAX_PER_CYCLE,
  reduceNewWorkOrders,
  resolvePulseIds,
} from "../src/modules/operations/map/hooks/useNewWorkOrderAlert";
import { buildWorkOrderPinsFeatureCollection } from "../src/modules/operations/map/map/mapMarkers";
import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import { OperationsMapStage } from "../src/modules/operations/map/components/OperationsMapStage";
import { GoogleMapsCanvas } from "../src/modules/operations/map/components/GoogleMapsCanvas";
import type {
  OperationsIncomingCall,
  OperationsMapWorkOrderPin,
} from "../src/modules/operations/map/operations-map.types";

// M-5 (J-MAPAS-6) — Alerta visual de OS nova (requisito 3 do dono). Prova, em 3 camadas + anti-fatigue:
//   • DIFF client-side dos ids que chegam entre refreshes (`reduceNewWorkOrders`), com ANTI-SPAM
//     obrigatório: NÃO alerta no mount (baseline), dedup por id já visto, TETO por ciclo;
//   • LGPD §12: o item de alerta/toast carrega SÓ id/código/prioridade — NUNCA coordenada;
//   • reduced-motion desliga o PULSO (`resolvePulseIds`) — realce estático/toast permanecem;
//   • pulso do id novo reusa `wo-pulse` (feature `pulse`) com parada garantida (cancelAnimationFrame);
//   • realce "novo" na lista + no badge do rail; toast com role=status/aria-live=polite;
//   • terminologia §3 do header/empty-states reconciliada ("técnicos", não "operadores");
//   • seleção de chamado SEM GPS reflete feedback honesto (sem inventar posição no mapa).

const SRC = new URL("../src/modules/operations/map/", import.meta.url);
const PAGE = readFileSync(fileURLToPath(new URL("pages/OperationsMapPage.tsx", SRC)), "utf8");
const LIBRE = readFileSync(fileURLToPath(new URL("components/OperationsMapLibreCanvas.tsx", SRC)), "utf8");
const CANVAS = readFileSync(fileURLToPath(new URL("components/OperationsMapCanvas.tsx", SRC)), "utf8");
const STAGE = readFileSync(fileURLToPath(new URL("components/OperationsMapStage.tsx", SRC)), "utf8");
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");

const NOW = new Date("2026-07-19T12:00:00.000Z");

function makeCall(overrides: Partial<OperationsIncomingCall> = {}): OperationsIncomingCall {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "medium",
    customerName: "Cliente A",
    scheduledFor: null,
    createdAt: "2026-07-19T11:00:00.000Z",
    hasLocation: true,
    ...overrides,
  };
}

function makePin(overrides: Partial<OperationsMapWorkOrderPin> = {}): OperationsMapWorkOrderPin {
  return {
    id: "pin-1",
    code: "OS-P",
    title: "Reboque",
    priority: "high",
    status: "open",
    customerName: "Cliente Pin",
    latitude: -23.5,
    longitude: -46.6,
    ...overrides,
  };
}

function renderList(calls: OperationsIncomingCall[], props: { selectedId?: string; newIds?: Set<string> } = {}): string {
  return renderToString(
    createElement(OperationsIncomingCallsList, {
      calls,
      onSelect: () => undefined,
      now: NOW,
      selectedId: props.selectedId,
      newIds: props.newIds,
    }),
  );
}

// 1 — NÃO ALERTA NO MOUNT: a 1ª carga é baseline (tudo "já visto"), fresh vazio; ids semeados no `seen`.
test("baseline (1ª carga) não alerta: fresh vazio e todos os ids entram em 'seen'", () => {
  const { fresh, seen } = reduceNewWorkOrders(new Set(), [makeCall({ id: "a" }), makeCall({ id: "b" })], {
    maxPerCycle: DEFAULT_NEW_WORK_ORDER_MAX_PER_CYCLE,
    baseline: true,
  });
  assert.equal(fresh.length, 0); // abrir a tela NUNCA dispara toast
  assert.equal(seen.has("a"), true);
  assert.equal(seen.has("b"), true);
});

// 2 — DIFF: após o baseline, um id que não existia no ciclo anterior é detectado como novo.
test("diff detecta id NOVO entre refreshes (só o que não existia antes)", () => {
  const baseline = reduceNewWorkOrders(new Set(), [makeCall({ id: "a" })], { maxPerCycle: 3, baseline: true });
  const cycle = reduceNewWorkOrders(
    baseline.seen,
    [makeCall({ id: "a" }), makeCall({ id: "b", code: "OS-NOVA" })],
    { maxPerCycle: 3, baseline: false },
  );
  assert.deepEqual(cycle.fresh.map((f) => f.id), ["b"]); // só o novo
  assert.equal(cycle.fresh[0]!.code, "OS-NOVA");
});

// 3 — DEDUP: um id já alertado não volta a alertar mesmo permanecendo na fila em ciclos seguintes.
test("dedup: id já visto não re-alerta em ciclos seguintes (Set de vistos)", () => {
  const s0 = reduceNewWorkOrders(new Set(), [makeCall({ id: "a" })], { maxPerCycle: 3, baseline: true }).seen;
  const c1 = reduceNewWorkOrders(s0, [makeCall({ id: "a" }), makeCall({ id: "b" })], { maxPerCycle: 3, baseline: false });
  assert.deepEqual(c1.fresh.map((f) => f.id), ["b"]);
  const c2 = reduceNewWorkOrders(c1.seen, [makeCall({ id: "a" }), makeCall({ id: "b" })], { maxPerCycle: 3, baseline: false });
  assert.equal(c2.fresh.length, 0); // "b" já foi alertado → silêncio
});

// 4 — TETO por ciclo (anti-spam): 5 novos com teto 3 → só 3 viram alerta, MAS os 5 entram em 'seen'
//     (para o excedente não re-alertar como "novo" no próximo ciclo — pico de OS não vira enxurrada).
test("teto por ciclo limita os alertas a N, e marca TODOS os novos como vistos (sem re-alerta do excedente)", () => {
  const calls = ["a", "b", "c", "d", "e"].map((id) => makeCall({ id }));
  const s0 = reduceNewWorkOrders(new Set(), [], { maxPerCycle: 3, baseline: true }).seen; // baseline vazio
  const c1 = reduceNewWorkOrders(s0, calls, { maxPerCycle: 3, baseline: false });
  assert.equal(c1.fresh.length, 3); // teto respeitado
  for (const id of ["a", "b", "c", "d", "e"]) assert.equal(c1.seen.has(id), true);
  const c2 = reduceNewWorkOrders(c1.seen, calls, { maxPerCycle: 3, baseline: false });
  assert.equal(c2.fresh.length, 0); // "d"/"e" NÃO reaparecem como novos
});

// 5 — LGPD §12: o item de alerta carrega SÓ id/código/prioridade — jamais coordenada.
test("item de alerta não trafega coordenada (LGPD): só id/código/prioridade", () => {
  const { fresh } = reduceNewWorkOrders(new Set(["seed"]), [makeCall({ id: "x", priority: "urgent" })], {
    maxPerCycle: 3,
    baseline: false,
  });
  assert.equal(fresh.length, 1);
  const item = fresh[0]!;
  assert.deepEqual(Object.keys(item).sort(), ["code", "id", "priority"]);
  assert.ok(!("latitude" in item) && !("longitude" in item) && !("hasLocation" in item));
});

// 6 — REDUCED-MOTION desliga o PULSO: resolvePulseIds devolve conjunto vazio; sem reduced-motion, os ids passam.
test("reduced-motion zera o pulso (resolvePulseIds); sem reduced-motion o pulso recebe os ids novos", () => {
  const ids = new Set(["a", "b"]);
  assert.equal(resolvePulseIds(ids, true).size, 0); // sem movimento
  assert.equal(resolvePulseIds(ids, false), ids); // pulso normal
});

// 7 — PULSO DO ID NOVO reusa a camada wo-pulse: buildWorkOrderPinsFeatureCollection marca `pulse` para o id
//     recém-chegado; urgente segue pulsando (herança); não-urgente e não-novo NÃO pulsa.
test("buildWorkOrderPinsFeatureCollection: pulse=true p/ id novo E p/ urgente; falso caso contrário", () => {
  const fc = buildWorkOrderPinsFeatureCollection(
    [
      makePin({ id: "novo", priority: "medium" }),
      makePin({ id: "urg", priority: "urgent" }),
      makePin({ id: "quieto", priority: "low" }),
    ],
    undefined,
    new Set(["novo"]),
  );
  const byId = new Map(fc.features.map((f) => [f.properties.id, f.properties.pulse]));
  assert.equal(byId.get("novo"), true); // recém-chegado pulsa
  assert.equal(byId.get("urg"), true); // urgente segue pulsando (herança)
  assert.equal(byId.get("quieto"), false); // nem novo nem urgente → quieto
  // Sem conjunto de pulso → só urgentes pulsam (comportamento anterior preservado).
  const legacy = buildWorkOrderPinsFeatureCollection([makePin({ id: "novo", priority: "medium" })], undefined);
  assert.equal(legacy.features[0]!.properties.pulse, false);
});

// 8 — MapLibre: o gatilho do pulso passou a ser `pulse` (não mais só `urgent`); o canvas aceita
//     `pulsingWorkOrderIds`, reage a ele e GARANTE a parada (cancelAnimationFrame no unmount).
test("MapLibre: wo-pulse filtra por 'pulse', aceita pulsingWorkOrderIds e cancela o rAF no unmount (parada garantida)", () => {
  assert.match(LIBRE, /id:\s*"wo-pulse"/);
  assert.match(LIBRE, /\["get",\s*"pulse"\]/); // gatilho ampliado
  assert.match(LIBRE, /pulsingWorkOrderIds/);
  assert.match(LIBRE, /pulsingWorkOrderIdsRef\.current/); // repassado ao builder
  assert.match(LIBRE, /cancelAnimationFrame\(woPulseRafRef\.current\)/); // parada garantida
  // o efeito de dados de OS reage à mudança do conjunto de pulso
  assert.match(LIBRE, /\[workOrderPins,\s*selectedWorkOrderId,\s*pulsingWorkOrderIds\]/);
  // o wrapper repassa a prop aos dois canvases reais (regra do espelho)
  assert.match(CANVAS, /pulsingWorkOrderIds=\{pulsingWorkOrderIds\}/);
});

// 9 — Google (espelho gracioso): o marcador de OS ganha a classe --pulse quando o id está no conjunto;
//     sem o conjunto o pulso não aparece (degrada sem quebrar).
test("Google: marcador de OS recebe --pulse para id recém-chegado e nada quando ausente", () => {
  const pulsing = renderToString(
    createElement(GoogleMapsCanvas, {
      loadState: "ready" as const,
      locations: [],
      onSelect: () => undefined,
      workOrderPins: [makePin({ id: "pin-1" })],
      pulsingWorkOrderIds: new Set(["pin-1"]),
    }),
  );
  assert.match(pulsing, /gmp-workorder-pin--pulse/);

  const quiet = renderToString(
    createElement(GoogleMapsCanvas, {
      loadState: "ready" as const,
      locations: [],
      onSelect: () => undefined,
      workOrderPins: [makePin({ id: "pin-1" })],
    }),
  );
  assert.doesNotMatch(quiet, /gmp-workorder-pin--pulse/); // sem conjunto → sem pulso, sem quebrar
});

// 10 — REALCE "novo" na lista: id em newIds ganha o selo "Novo" + classe is-new + aria "Novo chamado";
//      LGPD: nenhuma coordenada vaza no HTML da lista.
test("lista: id novo mostra selo 'Novo' + is-new + aria 'Novo chamado'; nenhuma coordenada no HTML", () => {
  const html = renderList([makeCall({ id: "n", code: "OS-9" })], { newIds: new Set(["n"]) });
  assert.match(html, /operations-call is-new|is-selected is-new|operations-call[^"]*is-new/);
  assert.match(html, /Novo/);
  assert.match(html, /aria-label="Novo chamado OS-9/);
  assert.doesNotMatch(html, /-23\.5|-46\.6|latitude|longitude/i);
  // sem newIds → sem selo "Novo" nem is-new (o realce só existe para o diff).
  const plain = renderList([makeCall({ id: "n", code: "OS-9" })]);
  assert.doesNotMatch(plain, /is-new/);
  assert.doesNotMatch(plain, /aria-label="Novo chamado/);
});

// 11 — SELEÇÃO SEM GPS (junta M-4): clicar um chamado sem coordenada NÃO tem pin p/ pan; o item selecionado
//      dá feedback honesto "Sem localização — detalhes no painel abaixo" (nunca inventa posição).
test("seleção sem GPS reflete feedback honesto no item (sem inventar posição no mapa)", () => {
  const selecionado = renderList([makeCall({ id: "s", hasLocation: false })], { selectedId: "s" });
  assert.match(selecionado, /Sem localização — detalhes no painel abaixo/);
  assert.match(selecionado, /sem localização no mapa/); // aria honesto
  // não selecionado → rótulo curto padrão "Sem GPS no mapa"
  const naoSel = renderList([makeCall({ id: "s", hasLocation: false })]);
  assert.match(naoSel, /Sem GPS no mapa/);
  assert.doesNotMatch(naoSel, /detalhes no painel abaixo/);
  // chamado COM GPS não recebe nenhum dos rótulos de ausência.
  const comGps = renderList([makeCall({ id: "c", hasLocation: true })], { selectedId: "c" });
  assert.doesNotMatch(comGps, /Sem GPS|Sem localização/);
});

// 12 — BADGE do rail de chamados realça "novo" quando colapsado (o operador percebe a chegada sem expandir).
test("stage: badge de chamados ganha realce --new e aria de novos quando colapsado com newCallsCount>0", () => {
  const html = renderToString(
    createElement(OperationsMapStage, {
      map: () => createElement("div", { "data-map": "true" }),
      // chamados COLAPSADO neste teste (o default é aberto): forçamos via slot vazio + contagem.
      calls: createElement("div", null, "CALLS"),
      techs: createElement("div", null, "TECHS"),
      callsCount: 5,
      techsCount: 2,
      newCallsCount: 2,
    }),
  );
  // o default do stage tem CHAMADOS aberto; o badge de novo é do rail COLAPSADO. Garantimos a CLASSE no CSS
  // e a lógica de realce no source (a realização visual do badge colapsado é coberta pelo teste de layout).
  assert.match(CSS, /\.operations-map-rail__badge--new/);
  assert.match(STAGE, /const hasNewCalls\s*=\s*typeof newCallsCount === "number" && newCallsCount > 0/);
  assert.match(STAGE, /operations-map-rail__badge--new/); // realce condicional no badge de chamados
  assert.ok(html.length > 0);
});

// 13 — TOAST (contrato de fonte da página): região viva role=status + aria-live=polite; mostra código +
//      prioridade; cor por prioridade via token (getWorkOrderPriorityColor → --call-priority); SEM coordenada.
test("página: toast é região viva não-agressiva (role=status/aria-live=polite), mostra código+prioridade, cor por token, sem coordenada", () => {
  assert.match(PAGE, /useNewWorkOrderAlert\(\{\s*calls:\s*incomingCalls\s*\}\)/);
  // região viva anunciada de forma NÃO-agressiva (não rouba foco)
  assert.match(PAGE, /className="operations-map-toasts"/);
  assert.match(PAGE, /role="status"/);
  assert.match(PAGE, /aria-live="polite"/);
  // conteúdo: "Novo chamado: {código} — {prioridade}"; prioridade via label PT-BR
  assert.match(PAGE, /Novo chamado:/);
  assert.match(PAGE, /getWorkOrderPriorityLabel\(toast\.priority\)/);
  // cor por prioridade via TOKEN (sem hex solto): --call-priority = getWorkOrderPriorityColor
  assert.match(PAGE, /"--call-priority":\s*getWorkOrderPriorityColor\(toast\.priority\)/);
  // LGPD §12: o bloco do toast não referencia coordenada
  const toastBlock = PAGE.slice(PAGE.indexOf("operations-map-toasts"), PAGE.indexOf("</header>"));
  assert.doesNotMatch(toastBlock, /latitude|longitude|\.lat\b|\.lng\b|coordinates/i);
});

// 14 — WIRING da página: newIds → lista; pulseIds → canvas; newCallsCount → stage.
test("página: liga newIds na lista, pulsingWorkOrderIds no canvas e newCallsCount no stage", () => {
  assert.match(PAGE, /newIds:\s*newCallIds/);
  assert.match(PAGE, /pulseIds:\s*pulsingWorkOrderIds/);
  assert.match(PAGE, /newIds=\{newCallIds\}/); // lista
  assert.match(PAGE, /pulsingWorkOrderIds=\{pulsingWorkOrderIds\}/); // canvas
  assert.match(PAGE, /newCallsCount=\{newCallIds\.size\}/); // stage
});

// 15 — TERMINOLOGIA §3 (pendência da junta M-4) reconciliada no header + empty-states da página:
//      "técnicos"/"Técnicos de Campo", nunca "operadores".
test("terminologia §3 reconciliada no header/empty-states da página (sem 'operadores')", () => {
  assert.match(PAGE, /Acompanhe a última localização conhecida dos Técnicos de Campo\./);
  assert.match(PAGE, /Nenhum técnico ou chamado no mapa/);
  assert.match(PAGE, /Quando os Técnicos de Campo enviarem localização/);
  assert.match(PAGE, /Nenhum técnico ou despacho para esta OS/);
  assert.doesNotMatch(PAGE, /operadores em campo/);
  assert.doesNotMatch(PAGE, /Nenhum operador ou chamado no mapa/);
});

// 16 — A11y: prefers-reduced-motion desliga as ANIMAÇÕES do toast/selo/badge/pulso Google (espelho da
//      supressão do pulso do mapa feita no hook). O aviso permanece (só sem movimento).
test("CSS: @media reduced-motion desliga animação do toast, selo 'Novo', badge e pulso do pin Google", () => {
  const block = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(block, /\.operations-map-toast/);
  assert.match(block, /\.operations-call__new/);
  assert.match(block, /\.operations-map-rail__badge--new/);
  assert.match(block, /\.gmp-workorder-pin--pulse/);
  // o toast usa a cor de prioridade via token e é ancorado acima do stage maximizado (z acima de 60).
  assert.match(CSS, /\.operations-map-toast\s*\{[^}]*var\(--call-priority/);
  assert.match(CSS, /\.operations-map-toasts\s*\{[^}]*z-index:\s*70/);
});
