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
import { OperationsMapPanelsStack } from "../src/modules/operations/map/components/OperationsMapPanelsStack";
import { GoogleMapsCanvas } from "../src/modules/operations/map/components/GoogleMapsCanvas";
import type {
  OperationsIncomingCall,
  OperationsMapWorkOrderPin,
} from "../src/modules/operations/map/operations-map.types";

// M-5 (mantido no J-MAPAS-10) — Alerta visual de OS nova: núcleo (diff/dedup/teto/reduced-motion)
// INTACTO; integrações atualizadas para a tela pixel — realce no CONTADOR das pills/phead
// (opmap-cnt--new), pulso no LOSANGO (wo-pulse via `pulse`), selo "Novo" no card .opmap-os e a
// região viva de toasts da página preservada.

const SRC = new URL("../src/modules/operations/map/", import.meta.url);
const PAGE = readFileSync(fileURLToPath(new URL("pages/OperationsMapPage.tsx", SRC)), "utf8");
const LIBRE = readFileSync(fileURLToPath(new URL("components/OperationsMapLibreCanvas.tsx", SRC)), "utf8");
const CANVAS = readFileSync(fileURLToPath(new URL("components/OperationsMapCanvas.tsx", SRC)), "utf8");
const STACK = readFileSync(fileURLToPath(new URL("components/OperationsMapPanelsStack.tsx", SRC)), "utf8");
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");

const NOW = new Date("2026-07-19T12:00:00.000Z");

function makeCall(overrides: Partial<OperationsIncomingCall> = {}): OperationsIncomingCall {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "medium",
    customerName: "Cliente A",
    serviceAddress: null,
    scheduledFor: null,
    createdAt: "2026-07-19T11:00:00.000Z",
    slaDueAt: null,
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

// 1 — NÃO ALERTA NO MOUNT: baseline marca tudo visto, fresh vazio.
test("baseline (1ª carga) não alerta: fresh vazio e todos os ids entram em 'seen'", () => {
  const { fresh, seen } = reduceNewWorkOrders(new Set(), [makeCall({ id: "a" }), makeCall({ id: "b" })], {
    maxPerCycle: DEFAULT_NEW_WORK_ORDER_MAX_PER_CYCLE,
    baseline: true,
  });
  assert.equal(fresh.length, 0);
  assert.equal(seen.has("a"), true);
  assert.equal(seen.has("b"), true);
});

// 2 — DIFF: id novo entre refreshes é detectado.
test("diff detecta id NOVO entre refreshes (só o que não existia antes)", () => {
  const baseline = reduceNewWorkOrders(new Set(), [makeCall({ id: "a" })], { maxPerCycle: 3, baseline: true });
  const cycle = reduceNewWorkOrders(
    baseline.seen,
    [makeCall({ id: "a" }), makeCall({ id: "b", code: "OS-NOVA" })],
    { maxPerCycle: 3, baseline: false },
  );
  assert.deepEqual(cycle.fresh.map((f) => f.id), ["b"]);
  assert.equal(cycle.fresh[0]!.code, "OS-NOVA");
});

// 3 — DEDUP: id já alertado silencia nos ciclos seguintes.
test("dedup: id já visto não re-alerta em ciclos seguintes", () => {
  const s0 = reduceNewWorkOrders(new Set(), [makeCall({ id: "a" })], { maxPerCycle: 3, baseline: true }).seen;
  const c1 = reduceNewWorkOrders(s0, [makeCall({ id: "a" }), makeCall({ id: "b" })], { maxPerCycle: 3, baseline: false });
  assert.deepEqual(c1.fresh.map((f) => f.id), ["b"]);
  const c2 = reduceNewWorkOrders(c1.seen, [makeCall({ id: "a" }), makeCall({ id: "b" })], { maxPerCycle: 3, baseline: false });
  assert.equal(c2.fresh.length, 0);
});

// 4 — TETO por ciclo: N alertas, mas TODOS os novos marcados como vistos (sem re-alerta do excedente).
test("teto por ciclo limita a N e marca todos como vistos", () => {
  const calls = ["a", "b", "c", "d", "e"].map((id) => makeCall({ id }));
  const s0 = reduceNewWorkOrders(new Set(), [], { maxPerCycle: 3, baseline: true }).seen;
  const c1 = reduceNewWorkOrders(s0, calls, { maxPerCycle: 3, baseline: false });
  assert.equal(c1.fresh.length, 3);
  for (const id of ["a", "b", "c", "d", "e"]) assert.equal(c1.seen.has(id), true);
  const c2 = reduceNewWorkOrders(c1.seen, calls, { maxPerCycle: 3, baseline: false });
  assert.equal(c2.fresh.length, 0);
});

// 5 — LGPD: item de alerta = SÓ id/código/prioridade.
test("item de alerta não trafega coordenada (LGPD)", () => {
  const { fresh } = reduceNewWorkOrders(new Set(["seed"]), [makeCall({ id: "x", priority: "urgent" })], {
    maxPerCycle: 3,
    baseline: false,
  });
  assert.deepEqual(Object.keys(fresh[0]!).sort(), ["code", "id", "priority"]);
});

// 6 — reduced-motion zera o pulso; sem ele, os ids passam.
test("resolvePulseIds: reduced-motion → vazio; normal → ids", () => {
  const ids = new Set(["a", "b"]);
  assert.equal(resolvePulseIds(ids, true).size, 0);
  assert.equal(resolvePulseIds(ids, false), ids);
});

// 7 — pulso do LOSANGO novo reusa a feature `pulse` (novo OU urgente).
test("buildWorkOrderPinsFeatureCollection: pulse p/ id novo E urgente; quieto caso contrário", () => {
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
  assert.equal(byId.get("novo"), true);
  assert.equal(byId.get("urg"), true);
  assert.equal(byId.get("quieto"), false);
});

// 8 — MapLibre: gatilho `pulse` na camada wo-pulse + parada garantida; canvas aceita o conjunto e
//     o wrapper repassa (o efeito de OS agora inclui o popup vivo nas deps).
test("MapLibre: wo-pulse por 'pulse', pulsingWorkOrderIds nas deps e cancelAnimationFrame no unmount", () => {
  assert.match(LIBRE, /id:\s*"wo-pulse"/);
  assert.match(LIBRE, /\["get",\s*"pulse"\]/);
  assert.match(LIBRE, /pulsingWorkOrderIdsRef\.current/);
  assert.match(LIBRE, /cancelAnimationFrame\(woPulseRafRef\.current\)/);
  assert.match(LIBRE, /\[workOrderPins,\s*selectedWorkOrderId,\s*pulsingWorkOrderIds,\s*renderWorkOrderPopup\]/);
  assert.match(CANVAS, /pulsingWorkOrderIds=\{pulsingWorkOrderIds\}/);
});

// 9 — Google (espelho gracioso): --pulse para id recém-chegado; sem conjunto, sem pulso.
test("Google: marcador de OS recebe --pulse para id novo e nada quando ausente", () => {
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
  assert.doesNotMatch(quiet, /gmp-workorder-pin--pulse/);
});

// 10 — realce "novo" no CARD .opmap-os: selo "Novo" + is-new + aria; sem newIds nada.
test("card novo: selo 'Novo' + is-new + aria 'Novo chamado'; sem coordenada no HTML", () => {
  const html = renderList([makeCall({ id: "n", code: "OS-9" })], { newIds: new Set(["n"]) });
  assert.match(html, /is-new/);
  assert.match(html, />Novo</);
  assert.match(html, /aria-label="Novo chamado OS-9/);
  assert.doesNotMatch(html, /-23\.5|-46\.6|latitude|longitude/i);
  const plain = renderList([makeCall({ id: "n", code: "OS-9" })]);
  assert.doesNotMatch(plain, /is-new/);
});

// 11 — realce no CONTADOR (pills/phead): newCallsCount>0 → opmap-cnt--new + aria com a contagem.
test("stack: contador de Recebidas ganha opmap-cnt--new e aria de novos com newCallsCount>0", () => {
  const html = renderToString(
    createElement(OperationsMapPanelsStack, {
      calls: createElement("div", null, "CALLS"),
      inService: createElement("div", null, "ATD"),
      technicians: createElement("div", null, "TECHS"),
      recCount: 5,
      atdCount: 1,
      tecCount: 2,
      newCallsCount: 2,
    }),
  );
  assert.match(html, /opmap-cnt opmap-cnt--new/);
  assert.match(html, /aria-label="5 chamados, 2 novos"/);
  assert.match(CSS, /\.opmap-cnt--new/);
  assert.match(STACK, /hasNewCalls/);
});

// 12 — página: região viva do toast preservada (role=status/aria-live=polite; código+prioridade;
//      cor por token; sem coordenada no bloco do toast).
test("página: toast M-5 intacto (região viva polite, código+prioridade via token, sem coordenada)", () => {
  assert.match(PAGE, /useNewWorkOrderAlert\(\{ calls: incomingCalls \}\)/);
  assert.match(PAGE, /className="operations-map-toasts"/);
  assert.match(PAGE, /role="status"/);
  assert.match(PAGE, /aria-live="polite"/);
  assert.match(PAGE, /Novo chamado:/);
  assert.match(PAGE, /getWorkOrderPriorityLabel\(toast\.priority\)/);
  assert.match(PAGE, /"--call-priority":\s*getWorkOrderPriorityColor\(toast\.priority\)/);
  const toastBlock = PAGE.slice(PAGE.indexOf("operations-map-toasts"), PAGE.indexOf("opmap-stage"));
  assert.doesNotMatch(toastBlock, /latitude|longitude|\.lat\b|\.lng\b|coordinates/i);
});

// 13 — wiring da página: newIds → lista; pulseIds → canvas; newCallsCount → stack.
test("página liga newIds na lista, pulsingWorkOrderIds no canvas e newCallsCount no stack", () => {
  assert.match(PAGE, /newIds:\s*newCallIds/);
  assert.match(PAGE, /pulseIds:\s*pulsingWorkOrderIds/);
  assert.match(PAGE, /newIds=\{newCallIds\}/);
  assert.match(PAGE, /pulsingWorkOrderIds=\{pulsingWorkOrderIds\}/);
  assert.match(PAGE, /newCallsCount=\{newCallIds\.size\}/);
});

// 14 — terminologia §3: empty-states com "técnico"; nada de "operadores" na página.
test("terminologia §3: 'Nenhum técnico ou chamado no mapa' e sem 'operadores' na página", () => {
  assert.match(PAGE, /Nenhum técnico ou chamado no mapa/);
  assert.match(PAGE, /Quando os Técnicos de Campo enviarem localização/);
  assert.doesNotMatch(PAGE, /operadores em campo/i);
});

// 15 — A11y: reduced-motion desliga as animações CSS (toast M-5, selo Novo, contador novo, pulso Google).
test("CSS: @media reduced-motion cobre toast M-5, opmap-os__new, opmap-cnt--new e pulso Google", () => {
  const block = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(block, /\.operations-map-toast/);
  assert.match(block, /\.opmap-os__new/);
  assert.match(block, /\.opmap-cnt--new/);
  assert.match(block, /\.gmp-workorder-pin--pulse/);
  assert.match(CSS, /\.operations-map-toasts\s*\{[^}]*z-index:\s*70/);
});
