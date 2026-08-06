import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  SLA_DUE_SOON_THRESHOLD_MS,
  buildIncomingCalls,
  formatIncomingCallSlaProxy,
  incomingCallSlaTone,
  sortIncomingCalls,
} from "../src/modules/operations/map/operations-map.adapter";
import { OperationsIncomingCallsList } from "../src/modules/operations/map/components/OperationsIncomingCallsList";
import type {
  OperationsIncomingCall,
  OperationsMapWorkOrderPin,
  OperationsMapWorkOrderWithoutLocation,
} from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 — painel "Chamados recebidos" com os cards .os VERBATIM do protótipo (r1 código+badge;
// r2 cliente+relógio; r2 pino+endereço; borda por prioridade; sel; drag). SPLIT rec/atd novo:
// buildIncomingCalls agora só projeta OS `open`. HONESTIDADE M-7 preservada (countdown SÓ com
// slaDueAt real; guard anti-fabricação intacto). LGPD: lista nunca trafega coordenada.

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
    serviceAddress: "Centro, Curitiba - PR",
    scheduledFor: null,
    createdAt: iso(11),
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
    serviceAddress: "Rua 1",
    latitude: -23.5,
    longitude: -46.6,
    scheduledFor: null,
    createdAt: iso(10),
    slaDueAt: null,
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
    status: "open",
    customerName: "Cliente Sem",
    serviceAddress: "Av. X",
    scheduledFor: null,
    createdAt: iso(9),
    slaDueAt: null,
    ...overrides,
  };
}

function renderList(
  calls: OperationsIncomingCall[],
  props: Partial<Parameters<typeof OperationsIncomingCallsList>[0]> = {},
): string {
  return renderToString(
    createElement(OperationsIncomingCallsList, { calls, onSelect: () => undefined, now: NOW, ...props }),
  );
}

// 1 — buildIncomingCalls funde as duas listas, marca hasLocation e NÃO trafega coordenada (LGPD).
test("buildIncomingCalls funde withLocation+withoutLocation, marca hasLocation e não trafega lat/lng", () => {
  const calls = buildIncomingCalls([makePin({ id: "com" })], [makeWithout({ id: "sem" })]);
  assert.equal(calls.length, 2);
  assert.equal(calls.find((c) => c.id === "com")!.hasLocation, true);
  assert.equal(calls.find((c) => c.id === "sem")!.hasLocation, false);
  for (const call of calls) {
    assert.ok(!("latitude" in call), "item não pode carregar latitude");
    assert.ok(!("longitude" in call), "item não pode carregar longitude");
  }
});

// 2 — SPLIT rec/atd (J-MAPAS-10): SÓ OS `open` entram em Recebidas; as em curso ficam de fora.
test("split: buildIncomingCalls só projeta OS 'open' (assigned/on_route etc. vão para Em Atendimento)", () => {
  const calls = buildIncomingCalls(
    [
      makePin({ id: "aberta", status: "open" }),
      makePin({ id: "atribuida", status: "assigned" }),
      makePin({ id: "rota", status: "on_route" }),
    ],
    [makeWithout({ id: "sem-aberta", status: "open" }), makeWithout({ id: "sem-pausada", status: "paused" })],
  );
  assert.deepEqual(calls.map((c) => c.id).sort(), ["aberta", "sem-aberta"]);
});

// 3 — o card carrega o ENDEREÇO textual (linha "📍" do protótipo) — endereço não é coordenada.
test("buildIncomingCalls propaga serviceAddress para o card (linha do pino)", () => {
  const calls = buildIncomingCalls([makePin({ id: "a", serviceAddress: "CIC, Curitiba - PR" })], []);
  assert.equal(calls[0]!.serviceAddress, "CIC, Curitiba - PR");
});

// 4 — ORDENAÇÃO intacta: prioridade → SLA-proxy → abertura → id (determinística).
test("sortIncomingCalls: prioridade → SLA-proxy → abertura → id (determinístico)", () => {
  const calls: OperationsIncomingCall[] = [
    makeCall({ id: "low-old", priority: "low", createdAt: iso(1) }),
    makeCall({ id: "urgent-sched-late", priority: "urgent", scheduledFor: iso(15), createdAt: iso(2) }),
    makeCall({ id: "urgent-open", priority: "urgent", scheduledFor: null, createdAt: iso(12) }),
    makeCall({ id: "urgent-sched-early", priority: "urgent", scheduledFor: iso(9), createdAt: iso(3) }),
    makeCall({ id: "high-mid", priority: "high", createdAt: iso(8) }),
  ];
  assert.deepEqual(sortIncomingCalls(calls).map((c) => c.id), [
    "urgent-sched-early",
    "urgent-open",
    "urgent-sched-late",
    "high-mid",
    "low-old",
  ]);
});

// 5 — CARD VERBATIM: r1 código + badge uppercase por prioridade; r2 cliente + relógio ⏱; r2 pino 📍.
test("card verbatim: código + badge de prioridade + cliente + relógio ⏱ + endereço 📍", () => {
  const html = renderList([
    makeCall({ id: "a", code: "OS-77", priority: "urgent", customerName: "Indústria Alfa Ltda", createdAt: iso(10) }),
  ]);
  assert.match(html, /opmap-os p-urgente/);
  assert.match(html, /OS-77/);
  assert.match(html, /opmap-os__badge b-urgente/);
  assert.match(html, /Urgente/);
  assert.match(html, /Indústria Alfa Ltda/);
  assert.match(html, /⏱/);
  assert.match(html, /há 2 h/); // relógio do protótipo (abertura real)
  assert.match(html, /📍/);
  assert.match(html, /Centro, Curitiba - PR/);
});

// 6 — seleção: card selecionado ganha .sel + aria-current; clique alterna via onSelect.
test("card selecionado marca .sel/aria-current; empty verbatim com 🎉 só com lista vazia", () => {
  const html = renderList([makeCall({ id: "sel-1" })], { selectedId: "sel-1" });
  assert.match(html, /opmap-os p-media sel/);
  assert.match(html, /aria-current="true"/);
  const empty = renderList([]);
  assert.match(empty, /Nenhum chamado aguardando alocação 🎉/);
  assert.doesNotMatch(empty, /OS-\d/);
  // Com itens na lista, o empty não aparece (🎉 não vaza).
  assert.doesNotMatch(html, /🎉/);
});

// 7 — GUARD anti-fabricação (M-7 intacto): TODOS slaDueAt null → NUNCA countdown; tom neutro.
test("guard anti-fabricação: slaDueAt null → sem 'vence em'/'vencido'; relógio honesto e tom neutro", () => {
  const html = renderList([
    makeCall({ id: "a", slaDueAt: null, scheduledFor: iso(15) }),
    makeCall({ id: "b", slaDueAt: null, scheduledFor: null, createdAt: iso(11, 30) }),
  ]);
  assert.doesNotMatch(html, /vence em|prazo restante|prazo esgotado|vencido/i);
  assert.match(html, /Agendado para /);
  assert.match(html, /há 30 min/);
  assert.match(html, /data-tone="neutral"/);
  assert.doesNotMatch(html, /data-tone="danger"|data-tone="warning"|data-tone="info"/);
});

// 8 — M-7: countdown REAL no relógio do card SÓ com slaDueAt (futuro=warning/info; vencido=danger).
test("M-7 preservado: com slaDueAt real o relógio mostra countdown + data-tone certo", () => {
  const future = renderList([makeCall({ id: "f", slaDueAt: iso(12, 20) })]);
  assert.match(future, /vence em 20 min/);
  assert.match(future, /data-tone="warning"/);
  const past = renderList([makeCall({ id: "p", slaDueAt: iso(11) })]);
  assert.match(past, /vencido há 1 h/);
  assert.match(past, /data-tone="danger"/);
});

// 9 — funções puras M-7 intactas (fonte do relógio): due_future/due_past/proxy/inválido + limiar.
test("formatIncomingCallSlaProxy/incomingCallSlaTone intactos (countdown real × proxy honesto)", () => {
  assert.equal(formatIncomingCallSlaProxy(makeCall({ slaDueAt: iso(13) }), NOW).kind, "due_future");
  assert.equal(formatIncomingCallSlaProxy(makeCall({ slaDueAt: iso(10) }), NOW).kind, "due_past");
  assert.equal(formatIncomingCallSlaProxy(makeCall({ slaDueAt: "not-a-date", createdAt: iso(11, 30) }), NOW).kind, "opened");
  assert.equal(incomingCallSlaTone(makeCall({ slaDueAt: null }), NOW), "neutral");
  assert.equal(SLA_DUE_SOON_THRESHOLD_MS, 30 * 60 * 1000);
});

// 10 — chamado SEM GPS: rótulo honesto + CTA "Localizar no mapa" SÓ com onGeocode (gating
//      work_orders:update) — o painel Ω1b-2 migrou para o card.
test("sem GPS: 'Sem GPS no mapa' + CTA 'Localizar no mapa' gated por onGeocode", () => {
  const semPermissao = renderList([makeCall({ id: "s", hasLocation: false })]);
  assert.match(semPermissao, /Sem GPS no mapa/);
  assert.doesNotMatch(semPermissao, /Localizar no mapa/);
  const comPermissao = renderList([makeCall({ id: "s", hasLocation: false })], {
    onGeocode: async () => ({ geocoded: true }),
  });
  assert.match(comPermissao, /Localizar no mapa/);
  // Com GPS não há rótulo de ausência nem CTA.
  const comGps = renderList([makeCall({ id: "c", hasLocation: true })], {
    onGeocode: async () => ({ geocoded: true }),
  });
  assert.doesNotMatch(comGps, /Sem GPS no mapa|Localizar no mapa/);
});

// 11 — DRAG gated: draggable só aparece com draggableEnabled (field_dispatch:create).
test("drag: atributo draggable só com permissão de alocar", () => {
  const semPermissao = renderList([makeCall()]);
  assert.doesNotMatch(semPermissao, /draggable="true"/);
  const comPermissao = renderList([makeCall()], { draggableEnabled: true });
  assert.match(comPermissao, /draggable="true"/);
});

// 12 — LGPD: nem latitude nem longitude aparecem no HTML da lista (só endereço textual).
test("LGPD: nenhuma coordenada no HTML da lista", () => {
  const html = renderList([makeCall({ id: "a" }), makeCall({ id: "b", hasLocation: false })]);
  assert.doesNotMatch(html, /-23\.5|-46\.6|latitude|longitude/i);
});

// 13 — página: split ligado (rec → lista/stack; atd → painel próprio; contadores reais) e o clique
//      liga a seleção (os-selected) via handleSelectCall.
test("página liga o split: buildIncomingCalls + buildInServiceCalls + contadores + seleção", () => {
  assert.match(PAGE, /buildIncomingCalls\(visibleWorkOrderPins, visibleWorkOrdersWithoutLocation\)/);
  assert.match(PAGE, /buildInServiceCalls\(visibleWorkOrderPins, visibleWorkOrdersWithoutLocation, workOrderContextLocations\)/);
  assert.match(PAGE, /recCount=\{incomingCalls\.length\}/);
  assert.match(PAGE, /atdCount=\{inServiceCalls\.length\}/);
  assert.match(PAGE, /onSelect=\{handleSelectCall\}/);
  assert.match(PAGE, /setSelectedWorkOrderId\(\(current\) => \(current === call\.id \? undefined : call\.id\)\)/);
});

// 14 — realce M-5 no card: id em newIds ganha selo "Novo" + is-new; sem newIds nada aparece.
test("M-5: card novo ganha selo 'Novo' + is-new; aria 'Novo chamado'", () => {
  const html = renderList([makeCall({ id: "n", code: "OS-9" })], { newIds: new Set(["n"]) });
  assert.match(html, /is-new/);
  assert.match(html, />Novo</);
  assert.match(html, /aria-label="Novo chamado OS-9/);
  const plain = renderList([makeCall({ id: "n", code: "OS-9" })]);
  assert.doesNotMatch(plain, /is-new/);
});
