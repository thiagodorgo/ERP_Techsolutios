import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  buildIncomingCalls,
  formatIncomingCallSlaProxy,
  sortIncomingCalls,
} from "../src/modules/operations/map/operations-map.adapter";
import { getWorkOrderPriorityColor } from "../src/modules/operations/map/map/mapMarkers";
import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import type {
  OperationsIncomingCall,
  OperationsMapWorkOrderPin,
  OperationsMapWorkOrderWithoutLocation,
} from "../src/modules/operations/map/operations-map.types";

// M-4 (J-MAPAS-6) — LISTA REAL de "chamados que chegam" (requisito 1 do dono: lista com detalhes,
// prioridade e SLA). Prova: (1) `buildIncomingCalls` funde withLocation+withoutLocation e DESCARTA a
// coordenada (LGPD §12); (2) ORDENAÇÃO prioridade→SLA-proxy→abertura→id, determinística; (3) SLA-PROXY
// HONESTO ("Agendado para"/"Aberto há") — NUNCA "vence em"/prazo fabricado; (4) a lista renderiza itens
// reais (código/cliente/chip de prioridade/rótulo de prazo); (5) clique seleciona (onSelect); (6) estado
// vazio não fabrica OS; (7) item sem GPS é sinalizado. Adapter puro + componente por SSR/element-tree.

const PAGE = readFileSync(
  fileURLToPath(new URL("../src/modules/operations/map/pages/OperationsMapPage.tsx", import.meta.url)),
  "utf8",
);
const NOW = new Date("2026-07-19T12:00:00.000Z");
const iso = (hourUtc: number, minute = 0) =>
  `2026-07-19T${String(hourUtc).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;

function makeCall(overrides: Partial<OperationsIncomingCall> = {}): OperationsIncomingCall {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "medium",
    customerName: "Cliente A",
    scheduledFor: null,
    createdAt: iso(11),
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
    serviceAddress: "Rua 1",
    latitude: -23.5,
    longitude: -46.6,
    scheduledFor: null,
    createdAt: iso(10),
    ...overrides,
  };
}

function makeWithout(
  overrides: Partial<OperationsMapWorkOrderWithoutLocation> = {},
): OperationsMapWorkOrderWithoutLocation {
  return {
    id: "no-1",
    code: "OS-N",
    title: "Sem GPS",
    priority: "low",
    customerName: "Cliente Sem",
    serviceAddress: "Av. X",
    scheduledFor: null,
    createdAt: iso(9),
    ...overrides,
  };
}

function renderList(calls: OperationsIncomingCall[], selectedId?: string): string {
  return renderToString(
    createElement(OperationsIncomingCallsList, { calls, onSelect: () => undefined, now: NOW, selectedId }),
  );
}

// Percorre a árvore de elementos React devolvida pelo componente (sem hooks → chamada direta é pura)
// e coleta os <button> — permite exercitar o onClick de verdade sem DOM.
function collectButtons(node: unknown, acc: Array<{ props: Record<string, unknown> }> = []) {
  if (!node || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    for (const child of node) collectButtons(child, acc);
    return acc;
  }
  const element = node as { type?: unknown; props?: Record<string, unknown> };
  if (element.type === "button") acc.push(element as { props: Record<string, unknown> });
  if (element.props && "children" in element.props) collectButtons(element.props.children, acc);
  return acc;
}

// 1 — buildIncomingCalls funde as duas listas e DESCARTA a coordenada (LGPD §12): o item da lista nunca
//     carrega latitude/longitude. `hasLocation` distingue quem tem pin (pan) de quem é "sem GPS".
test("buildIncomingCalls funde withLocation+withoutLocation, marca hasLocation e NÃO trafega coordenada (LGPD)", () => {
  const calls = buildIncomingCalls([makePin({ id: "com" })], [makeWithout({ id: "sem" })]);
  assert.equal(calls.length, 2);
  const com = calls.find((c) => c.id === "com")!;
  const sem = calls.find((c) => c.id === "sem")!;
  assert.equal(com.hasLocation, true);
  assert.equal(sem.hasLocation, false);
  for (const call of calls) {
    assert.ok(!("latitude" in call), "item não pode carregar latitude");
    assert.ok(!("longitude" in call), "item não pode carregar longitude");
  }
});

// 2 — ORDENAÇÃO (o coração do M-4): PRIORIDADE (urgente→baixa) → SLA-PROXY (agenda/espera, ascendente) →
//     ABERTURA (createdAt) → id. Um cenário único cobre os quatro níveis, inclusive scheduled×opened.
test("sortIncomingCalls: prioridade → SLA-proxy → abertura → id (determinístico)", () => {
  const calls: OperationsIncomingCall[] = [
    makeCall({ id: "low-old", priority: "low", createdAt: iso(1) }),
    makeCall({ id: "urgent-sched-late", priority: "urgent", scheduledFor: iso(15), createdAt: iso(2) }),
    makeCall({ id: "urgent-open", priority: "urgent", scheduledFor: null, createdAt: iso(12) }),
    makeCall({ id: "urgent-sched-early", priority: "urgent", scheduledFor: iso(9), createdAt: iso(3) }),
    makeCall({ id: "high-mid", priority: "high", createdAt: iso(8) }),
    makeCall({ id: "urgent-tie-a", priority: "urgent", scheduledFor: iso(12), createdAt: iso(6) }),
    makeCall({ id: "urgent-tie-b", priority: "urgent", scheduledFor: iso(12), createdAt: iso(5) }),
  ];
  const ordered = sortIncomingCalls(calls).map((c) => c.id);
  assert.deepEqual(ordered, [
    "urgent-sched-early", // urgente, agenda mais próxima (09:00)
    "urgent-tie-b", // urgente, SLA 12:00, aberto mais cedo (05:00)
    "urgent-tie-a", // urgente, SLA 12:00, aberto 06:00
    "urgent-open", // urgente, SLA 12:00 (abertura), aberto 12:00
    "urgent-sched-late", // urgente, agenda distante (15:00)
    "high-mid", // alta
    "low-old", // baixa (prioridade domina, apesar de mais antigo)
  ]);
});

// 3 — SLA-PROXY honesto: com scheduledFor → "Agendado para {data}" (kind scheduled), NUNCA "vence em".
test("formatIncomingCallSlaProxy: agendado → 'Agendado para {data}', kind scheduled (sem 'vence em')", () => {
  const sla = formatIncomingCallSlaProxy(makeCall({ scheduledFor: iso(9), createdAt: iso(3) }), NOW);
  assert.equal(sla.kind, "scheduled");
  assert.ok(sla.label.startsWith("Agendado para "), sla.label);
  assert.doesNotMatch(sla.label, /vence em/i);
});

// 4 — sem agenda → "Aberto há {tempo}" a partir de createdAt (kind opened); jamais SLA fabricado.
test("formatIncomingCallSlaProxy: sem agenda → 'Aberto há {tempo}' de createdAt (kind opened, honesto)", () => {
  const sla = formatIncomingCallSlaProxy(makeCall({ scheduledFor: null, createdAt: iso(11, 30) }), NOW);
  assert.equal(sla.kind, "opened");
  assert.equal(sla.label, "Aberto há 30 min");
  assert.doesNotMatch(sla.label, /vence em|SLA|prazo restante/i);
});

// 5 — datas ausentes/inválidas: agenda inválida cai para abertura; sem nenhuma data → rótulo honesto
//     "Sem data de abertura" (kind unknown), nunca um prazo inventado.
test("formatIncomingCallSlaProxy: agenda inválida cai p/ abertura; sem datas → 'Sem data de abertura'", () => {
  const fallback = formatIncomingCallSlaProxy(makeCall({ scheduledFor: "not-a-date", createdAt: iso(11, 30) }), NOW);
  assert.equal(fallback.kind, "opened");
  assert.equal(fallback.label, "Aberto há 30 min");

  const none = formatIncomingCallSlaProxy({ scheduledFor: null, createdAt: null }, NOW);
  assert.equal(none.kind, "unknown");
  assert.equal(none.label, "Sem data de abertura");
});

// 6 — a lista renderiza ITENS REAIS: código + cliente + chip de prioridade PT-BR + rótulo de prazo.
test("lista renderiza itens reais (código, cliente, chip de prioridade PT-BR, rótulo de prazo)", () => {
  const html = renderList([
    makeCall({ id: "a", code: "OS-77", priority: "urgent", customerName: "Cliente Z", scheduledFor: null, createdAt: iso(11, 30) }),
  ]);
  assert.match(html, /Chamados que chegam/);
  assert.match(html, /OS-77/);
  assert.match(html, /Cliente Z/);
  assert.match(html, /Urgente/); // chip de prioridade (getWorkOrderPriorityLabel)
  assert.match(html, /Aberto há 30 min/); // SLA-proxy honesto
});

// 7 — a ordem da fila aparece no DOM: buildIncomingCalls ordena e a lista renderiza nessa ordem
//     (urgente antes de baixa, independentemente da abertura).
test("a ordem renderizada segue buildIncomingCalls (urgente antes de baixa)", () => {
  const calls = buildIncomingCalls(
    [makePin({ id: "u", code: "OS-URG", priority: "urgent", createdAt: iso(2) })],
    [makeWithout({ id: "l", code: "OS-LOW", priority: "low", createdAt: iso(1) })],
  );
  const html = renderList(calls);
  assert.ok(html.indexOf("OS-URG") < html.indexOf("OS-LOW"), "urgente deve renderizar antes de baixa");
});

// 8 — SLA-PROXY honesto na UI: nenhum item exibe prazo FABRICADO (a Fase 1 não tem deadline real).
//     Guarda nas frases proibidas — "vence em"/"prazo restante"/"prazo esgotado"/"vencido" — sem tropeçar
//     no identificador interno da classe (__sla).
test("a lista NUNCA exibe prazo fabricado ('vence em'/'prazo restante'/'vencido')", () => {
  const html = renderList([
    makeCall({ id: "a", scheduledFor: iso(15) }),
    makeCall({ id: "b", scheduledFor: null, createdAt: iso(11, 30) }),
  ]);
  assert.doesNotMatch(html, /vence em|prazo restante|prazo esgotado|vencido/i);
});

// 9 — estado vazio: EmptyState honesto, sem inventar OS.
test("lista vazia → EmptyState 'Nenhum chamado aberto', sem fabricar OS", () => {
  const html = renderList([]);
  assert.match(html, /Nenhum chamado aberto/);
  assert.doesNotMatch(html, /OS-\d/);
});

// 10 — CLIQUE seleciona: cada item é um <button> real e seu onClick chama onSelect com o chamado
//      correspondente (reusa o mecanismo de seleção → pan no mapa). Exercita o handler de verdade.
test("clique num chamado chama onSelect com o item (seleção → pan no mapa)", () => {
  const clicked: OperationsIncomingCall[] = [];
  const calls = buildIncomingCalls([makePin({ id: "primeiro", priority: "urgent", createdAt: iso(2) })], [makeWithout({ id: "segundo", priority: "low" })]);
  const tree = OperationsIncomingCallsList({ calls, onSelect: (call) => clicked.push(call), now: NOW });
  const buttons = collectButtons(tree);
  assert.equal(buttons.length, 2);
  (buttons[0]!.props.onClick as () => void)();
  assert.equal(clicked.length, 1);
  assert.equal(clicked[0]!.id, "primeiro"); // urgente veio primeiro na fila
});

// 11 — seleção refletida: o item selecionado ganha aria-current + is-selected; o acento lateral usa a
//      MESMA cor do pin (getWorkOrderPriorityColor via --call-priority), sem hex solto.
test("item selecionado marca aria-current/is-selected e acento = getWorkOrderPriorityColor (var --call-priority)", () => {
  const html = renderList([makeCall({ id: "sel", priority: "urgent" })], "sel");
  assert.match(html, /aria-current="true"/);
  assert.match(html, /operations-call is-selected/);
  assert.match(html, new RegExp(`--call-priority:${getWorkOrderPriorityColor("urgent")}`));
});

// 12 — item SEM GPS é sinalizado (honesto: não vira pin no mapa) e a lista jamais vaza coordenada.
test("chamado sem GPS mostra 'Sem GPS no mapa'; com GPS não mostra; nenhuma coordenada no HTML", () => {
  const semGps = renderList([makeCall({ id: "s", hasLocation: false })]);
  assert.match(semGps, /Sem GPS no mapa/);
  const comGps = renderList([makeCall({ id: "c", hasLocation: true })]);
  assert.doesNotMatch(comGps, /Sem GPS no mapa/);
  // LGPD: nem latitude nem longitude aparecem no HTML da lista.
  assert.doesNotMatch(semGps + comGps, /-23\.5|-46\.6|latitude|longitude/i);
});

// 13 — a página injeta os dados reais no slot `calls` e liga o clique ao estado de seleção existente,
//      além de expor `callsCount` para o badge do rail colapsado.
test("a página passa buildIncomingCalls ao slot, liga onSelect→setSelectedWorkOrderId e expõe callsCount", () => {
  assert.match(PAGE, /const incomingCalls = /);
  assert.match(PAGE, /buildIncomingCalls\(visibleWorkOrderPins, visibleWorkOrdersWithoutLocation\)/);
  assert.match(PAGE, /callsCount=\{incomingCalls\.length\}/);
  assert.match(PAGE, /calls=\{[\s\S]*?<OperationsIncomingCallsList/);
  assert.match(PAGE, /onSelect=\{\(call\) => setSelectedWorkOrderId\(call\.id\)\}/);
});
