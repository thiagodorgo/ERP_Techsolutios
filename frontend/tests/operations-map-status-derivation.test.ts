import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  applyDerivedFieldLocationStatuses,
  deriveFieldLocationStatus,
  getFieldLocationStatusLabel,
} from "../src/modules/operations/map/operations-map.adapter";
import { OperationsOperatorList } from "../src/modules/operations/map/components/OperationsOperatorList";
import { getFieldLocationGroup, getStatusColor } from "../src/modules/operations/map/map/mapMarkers";
import { LEGEND_FILTER_ALL_ON, isTechnicianVisibleInLegend } from "../src/modules/operations/map/hooks/useLegendFilter";
import { canDropOnTechnician } from "../src/modules/operations/map/map/dnd";
import type { DispatchStatus } from "../src/modules/operations/dispatches/dispatches.types";
import type {
  FieldLocationItem,
  FieldLocationStatus,
  OperationsMapDispatch,
} from "../src/modules/operations/map/operations-map.types";

// AC-18 (DEMO-B) — status do técnico no Mapa Operacional. O `/field-locations/latest` não manda status,
// então todo técnico chegava "Fora de serviço" (grupo off): Alocar apagado, arrastar recusado. O Mapa
// passa a DERIVAR o status: o do servidor vence; despacho ativo → status pelo despacho; posição recente
// sem despacho ativo → "Disponível"; posição antiga sem despacho ativo → continua como hoje.

const NOW = new Date("2026-10-26T12:00:00.000Z");

function makeDispatch(status: DispatchStatus): OperationsMapDispatch {
  return {
    id: `dsp-${status}`,
    workOrderId: "wo-1",
    operatorUserId: "usr-1",
    status,
    observation: null,
    reason: null,
    createdAt: NOW.toISOString(),
  };
}

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "usr-1",
    userId: "usr-1",
    displayName: "Guincheiro Um",
    status: "unknown",
    latitude: -23.56,
    longitude: -46.65,
    capturedAt: NOW.toISOString(),
    isStale: false,
    currentDispatch: null,
    ...overrides,
  };
}

type Case = {
  readonly name: string;
  readonly status: FieldLocationStatus;
  readonly isStale: boolean;
  readonly dispatch: DispatchStatus | null;
  readonly expected: FieldLocationStatus;
};

// Tabela de casos da regra (critérios C1–C4 do relatório do dev).
const CASES: readonly Case[] = [
  // C2 — disponível: posição recente e nenhum despacho ativo (sem despacho, ou só despacho terminal).
  { name: "recente, sem despacho", status: "unknown", isStale: false, dispatch: null, expected: "available" },
  { name: "recente, despacho concluído", status: "unknown", isStale: false, dispatch: "completed", expected: "available" },
  { name: "recente, despacho cancelado", status: "unknown", isStale: false, dispatch: "cancelled", expected: "available" },
  { name: "recente, despacho falhou", status: "unknown", isStale: false, dispatch: "failed", expected: "available" },
  { name: "recente, despacho reatribuído", status: "unknown", isStale: false, dispatch: "reassigned", expected: "available" },
  // C3 — despachado / em rota / em atendimento: pelo status do despacho ativo (com posição recente OU antiga).
  // Revisão do PR #465 (A1): `draft`/`assigned`/`accepted` ainda não saíram → "Despachado", não "Em deslocamento".
  { name: "recente, despacho em rota", status: "unknown", isStale: false, dispatch: "on_route", expected: "on_route" },
  { name: "recente, despacho atribuído", status: "unknown", isStale: false, dispatch: "assigned", expected: "dispatched" },
  { name: "recente, despacho aceito", status: "unknown", isStale: false, dispatch: "accepted", expected: "dispatched" },
  { name: "recente, despacho rascunho", status: "unknown", isStale: false, dispatch: "draft", expected: "dispatched" },
  { name: "antiga, despacho atribuído", status: "unknown", isStale: true, dispatch: "assigned", expected: "dispatched" },
  { name: "recente, despacho chegou", status: "unknown", isStale: false, dispatch: "arrived", expected: "on_site" },
  { name: "recente, despacho em atendimento", status: "unknown", isStale: false, dispatch: "in_service", expected: "in_service" },
  { name: "antiga, despacho em rota", status: "unknown", isStale: true, dispatch: "on_route", expected: "on_route" },
  { name: "antiga, despacho em atendimento", status: "unknown", isStale: true, dispatch: "in_service", expected: "in_service" },
  // C4 — sem posição recente e sem despacho ativo: continua como hoje.
  { name: "antiga, sem despacho", status: "unknown", isStale: true, dispatch: null, expected: "unknown" },
  { name: "antiga, despacho concluído", status: "unknown", isStale: true, dispatch: "completed", expected: "unknown" },
  // C1 — o status do servidor vence, em qualquer combinação.
  { name: "servidor pausado, despacho em rota", status: "paused", isStale: false, dispatch: "on_route", expected: "paused" },
  { name: "servidor offline, recente, sem despacho", status: "offline", isStale: false, dispatch: null, expected: "offline" },
  { name: "servidor bloqueado, antiga", status: "blocked", isStale: true, dispatch: null, expected: "blocked" },
  { name: "servidor disponível, despacho em atendimento", status: "available", isStale: false, dispatch: "in_service", expected: "available" },
  { name: "servidor em atendimento, recente, sem despacho", status: "in_service", isStale: false, dispatch: null, expected: "in_service" },
];

test("AC-18: deriveFieldLocationStatus segue a tabela de casos", () => {
  for (const item of CASES) {
    const location = makeLocation({
      status: item.status,
      isStale: item.isStale,
      currentDispatch: item.dispatch ? makeDispatch(item.dispatch) : null,
    });
    assert.equal(deriveFieldLocationStatus(location), item.expected, item.name);
  }
});

test("Revisão #465 (A1): despacho atribuído dá \"Despachado\" e NÃO \"Em deslocamento\"", () => {
  for (const dispatch of ["draft", "assigned", "accepted"] as const) {
    const status = deriveFieldLocationStatus(makeLocation({ currentDispatch: makeDispatch(dispatch) }));
    assert.equal(status, "dispatched", dispatch);
    assert.notEqual(status, "on_route", dispatch);
    assert.equal(getFieldLocationStatusLabel(status), "Despachado", dispatch);
    assert.notEqual(getFieldLocationStatusLabel(status), "Em deslocamento", dispatch);
  }
  // A partir da saída: on_route → "Em deslocamento", arrived → "No local", in_service → "Em atendimento".
  const label = (dispatch: DispatchStatus) =>
    getFieldLocationStatusLabel(deriveFieldLocationStatus(makeLocation({ currentDispatch: makeDispatch(dispatch) })));
  assert.equal(label("on_route"), "Em deslocamento");
  assert.equal(label("arrived"), "No local");
  assert.equal(label("in_service"), "Em atendimento");
});

test("Revisão #465 (A1): \"Despachado\" é ativo — grupo e filtro de \"Em deslocamento\", nunca \"Disponível\"", () => {
  const [dispatched] = applyDerivedFieldLocationStatuses([makeLocation({ currentDispatch: makeDispatch("assigned") })]);
  assert.ok(dispatched);
  assert.equal(dispatched.status, "dispatched");
  // Grupo: o mesmo de "Em deslocamento" (rota), não "disp" nem "off".
  assert.equal(getFieldLocationGroup(dispatched.status), getFieldLocationGroup("on_route"));
  assert.equal(getFieldLocationGroup(dispatched.status), "rota");
  assert.notEqual(getFieldLocationGroup(dispatched.status), "disp");
  // Cor: reusa a de "Em deslocamento" (sem cor nova) e nunca acende o verde de disponível.
  assert.equal(getStatusColor(dispatched.status), getStatusColor("on_route"));
  assert.notEqual(getStatusColor(dispatched.status), getStatusColor("available"));
  // Filtro da legenda: some com "Em rota" desligado; com só "Disponível" ligado, não aparece.
  assert.equal(isTechnicianVisibleInLegend(dispatched, LEGEND_FILTER_ALL_ON), true);
  assert.equal(isTechnicianVisibleInLegend(dispatched, { ...LEGEND_FILTER_ALL_ON, rota: false }), false);
  const onlyAvailable = Object.fromEntries(Object.keys(LEGEND_FILTER_ALL_ON).map((key) => [key, key === "disp"])) as typeof LEGEND_FILTER_ALL_ON;
  assert.equal(isTechnicianVisibleInLegend(dispatched, onlyAvailable), false);
  // Alocar/arrastar: o mesmo comportamento de quem está "Em deslocamento" (nada além do que já vale para ele).
  assert.equal(
    canDropOnTechnician(getFieldLocationGroup(dispatched.status), true),
    canDropOnTechnician(getFieldLocationGroup("on_route"), true),
  );
});

test("AC-18: applyDerivedFieldLocationStatuses deriva por técnico e preserva quem não muda", () => {
  const unchanged = makeLocation({ id: "loc-server", status: "paused" });
  const derived = makeLocation({ id: "loc-free" });
  const result = applyDerivedFieldLocationStatuses([unchanged, derived]);

  assert.equal(result[0], unchanged); // mesmo objeto: nada a derivar
  assert.equal(result[1]?.status, "available");
  assert.equal(derived.status, "unknown"); // função pura: não muta a entrada
});

test("AC-18: o técnico derivado como disponível sai do grupo 'Fora de serviço' e aceita alocar e arrastar", () => {
  const [derived] = applyDerivedFieldLocationStatuses([makeLocation()]);
  assert.ok(derived);
  assert.equal(getFieldLocationGroup(derived.status), "disp");
  assert.equal(canDropOnTechnician(getFieldLocationGroup(derived.status), true), true);
  // Controle: sem a derivação o mesmo técnico continua "off" e recusa o arrastar.
  assert.equal(getFieldLocationGroup(makeLocation().status), "off");
  assert.equal(canDropOnTechnician(getFieldLocationGroup(makeLocation().status), true), false);
});

// Smoke da tela, no molde de tests/operations-map-technicians.test.ts: a linha do técnico com OS
// selecionada mostra "Alocar" habilitado depois da derivação (e apagado sem ela).
function renderAllocateButton(location: FieldLocationItem): string {
  const html = renderToString(
    createElement(OperationsOperatorList, {
      locations: [location],
      selectedCallId: "wo-1",
      canAllocate: true,
      onAllocate: () => undefined,
      onOpenDetail: () => undefined,
      now: NOW,
    }),
  );
  const button = html.match(/<button[^>]*class="opmap-trow__go"[^>]*>/)?.[0];
  assert.ok(button, "botão Alocar renderizado");
  return button;
}

test("AC-18 (smoke): Alocar habilitado para o técnico derivado; apagado para o sem derivação", () => {
  const [derived] = applyDerivedFieldLocationStatuses([makeLocation()]);
  assert.ok(derived);
  assert.doesNotMatch(renderAllocateButton(derived), /disabled/);
  assert.match(renderAllocateButton(makeLocation()), /disabled/);
});

type FetchCall = { readonly url: string };

function installFetchSequence(payloads: readonly unknown[]): FetchCall[] {
  const calls: FetchCall[] = [];
  let index = 0;
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (url: string) => {
      calls.push({ url });
      const payload = payloads[Math.min(index, payloads.length - 1)];
      index += 1;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  return calls;
}

test("AC-18: a leitura do Mapa deriva o status a partir da API real; a leitura comum fica como está", async () => {
  process.env.VITE_USE_MOCKS = "false";
  process.env.VITE_API_BASE_URL = "/api/v1";
  const recent = new Date(Date.now() - 60_000).toISOString();
  const old = new Date(Date.now() - 30 * 60_000).toISOString();
  const locationsPayload = {
    data: [
      { id: "loc-a", operatorUserId: "usr-a", displayName: "A", latitude: -23.5, longitude: -46.6, capturedAt: recent },
      { id: "loc-b", operatorUserId: "usr-b", displayName: "B", latitude: -23.5, longitude: -46.6, capturedAt: recent },
      { id: "loc-c", operatorUserId: "usr-c", displayName: "C", latitude: -23.5, longitude: -46.6, capturedAt: old },
      { id: "loc-d", operatorUserId: "usr-d", displayName: "D", latitude: -23.5, longitude: -46.6, capturedAt: old },
      { id: "loc-e", operatorUserId: "usr-e", displayName: "E", latitude: -23.5, longitude: -46.6, capturedAt: recent, status: "paused" },
      { id: "loc-f", operatorUserId: "usr-f", displayName: "F", latitude: -23.5, longitude: -46.6, capturedAt: recent },
      { id: "loc-g", operatorUserId: "usr-g", displayName: "G", latitude: -23.5, longitude: -46.6, capturedAt: recent },
    ],
  };
  const dispatch = (id: string, operatorUserId: string, status: DispatchStatus) => ({
    id,
    workOrderId: `wo-${id}`,
    operatorUserId,
    status,
    createdAt: recent,
  });
  const dispatchesPayload = {
    data: {
      items: [
        dispatch("d-b", "usr-b", "on_route"),
        dispatch("d-c", "usr-c", "in_service"),
        dispatch("d-e", "usr-e", "on_route"),
        dispatch("d-f", "usr-f", "completed"),
        dispatch("d-g", "usr-g", "assigned"),
      ],
      pagination: { limit: 20, offset: 0, total: 5 },
    },
  };
  const permissions = ["field_location:read", "field_dispatch:read"];
  const { getOperationsMapData, getLatestFieldLocations } = await import(
    "../src/modules/operations/map/operations-map.service"
  );

  const calls = installFetchSequence([locationsPayload, dispatchesPayload]);
  const data = await getOperationsMapData({ token: "jwt", permissions });
  assert.deepEqual(
    calls.map((call) => call.url),
    ["/api/v1/field-locations/latest", "/api/v1/operations/dispatches"],
  );
  const statusById = Object.fromEntries(data.locations.map((location) => [location.id, location.status]));
  assert.deepEqual(statusById, {
    "loc-a": "available", // recente, sem despacho
    "loc-b": "on_route", // despacho em rota
    "loc-c": "in_service", // posição antiga, mas despacho em atendimento
    "loc-d": "unknown", // antiga, sem despacho → como hoje
    "loc-e": "paused", // o status do servidor vence
    "loc-f": "available", // despacho concluído não ocupa
    "loc-g": "dispatched", // despacho atribuído: ainda não saiu (revisão #465, A1)
  });

  // Escopo: a leitura comum (Painel, Operadores de Campo) segue sem derivação.
  installFetchSequence([locationsPayload, dispatchesPayload]);
  const plain = await getLatestFieldLocations({ token: "jwt", permissions });
  assert.equal(plain.locations.find((location) => location.id === "loc-a")?.status, "unknown");
});

test("AC-18: o Mapa (useOperationsMap) lê pela leitura com status derivado", () => {
  const hookSrc = readFileSync(
    fileURLToPath(new URL("../src/modules/operations/map/useOperationsMap.ts", import.meta.url)),
    "utf8",
  );
  assert.match(hookSrc, /const data = await getOperationsMapData\(context\);/);
  assert.doesNotMatch(hookSrc, /getLatestFieldLocations\(/);
});
