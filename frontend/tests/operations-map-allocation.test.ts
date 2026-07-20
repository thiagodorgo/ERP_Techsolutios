import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

// Shim NÃO-destrutivo de window/localStorage: os popups importam o api/client (via useAllocateDispatch),
// que puxa auth.storage/auth.service — em node --test precisamos de um window mínimo. Não sobrescreve.
const g = globalThis as unknown as { window?: { localStorage?: unknown; dispatchEvent?: unknown } };
g.window ??= {};
g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
g.window.dispatchEvent ??= () => true;

import {
  buildAllocationCandidates,
  computeDistanceKm,
  estimateTravelMinutes,
  formatCompletionRate,
  formatEstimatedMinutes,
  formatStraightLineKm,
  operatorUserIdOf,
  rankAllocationCandidates,
  type Coordinate,
} from "../src/modules/operations/map/allocation";
import { adaptTechnicianPerformanceItems } from "../src/modules/operations/map/technician-performance.service";
import { OperationsCallAllocationPopup } from "../src/modules/operations/map/components/OperationsCallAllocationPopup";
import { OperationsTechnicianAllocationPopup } from "../src/modules/operations/map/components/OperationsTechnicianAllocationPopup";
import type { DispatchesApiContext } from "../src/modules/operations/dispatches/dispatches.types";
import type { FieldLocationItem, OperationsIncomingCall } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-7 (SPRINT ALOCAÇÃO D+E) — prova: HONESTIDADE (distância = haversine "linha reta"; tempo =
// estimativa rotulada, NUNCA "chega às"/"ETA de chegada"; índice null → "—", nunca 0%), ALOCAÇÃO REAL
// via createDispatch com a payload {workOrderId, operatorUserId}, FILTROS (disponível/distância/índice) e
// LGPD zero-coordenada (nenhum lat/lng cru no HTML). SSR + funções puras + regex de fiação (padrão do módulo).

const NOW = new Date("2026-07-20T12:00:00.000Z");
const CTX: DispatchesApiContext = { token: "t", tenantId: "tenant-1", permissions: ["field_dispatch:create"] };
const CALL_COORD: Coordinate = { lat: -23.5, lng: -46.6 };

const SRC_DIR = new URL("../src/modules/operations/map/", import.meta.url);
const readSrc = (rel: string) => readFileSync(fileURLToPath(new URL(rel, SRC_DIR)), "utf8");
const CALL_POPUP_SRC = readSrc("components/OperationsCallAllocationPopup.tsx");
const TECH_POPUP_SRC = readSrc("components/OperationsTechnicianAllocationPopup.tsx");
const ALLOCATE_HOOK_SRC = readSrc("hooks/useAllocateDispatch.ts");
const PAGE_SRC = readSrc("pages/OperationsMapPage.tsx");

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    userId: "user-1",
    displayName: "Ana Souza",
    status: "available",
    latitude: -23.5,
    longitude: -46.6,
    capturedAt: NOW.toISOString(), // fresco (ao vivo) por padrão
    isStale: false,
    teamName: "Equipe Sul",
    ...overrides,
  };
}

function makeCall(overrides: Partial<OperationsIncomingCall> = {}): OperationsIncomingCall {
  return {
    id: "wo-1",
    code: "OS-1",
    title: "Guincho",
    priority: "medium",
    customerName: "Cliente A",
    scheduledFor: null,
    createdAt: NOW.toISOString(),
    hasLocation: true,
    ...overrides,
  };
}

// Três técnicos: A perto (disponível, já em despacho), B longe (disponível), C médio (offline/antigo, índice null).
const stale = new Date(NOW.getTime() - 20 * 60_000).toISOString();
const techA = makeLocation({ id: "a", userId: "user-a", displayName: "Ana", latitude: -23.51, longitude: -46.6, currentDispatch: { id: "d1", workOrderId: "x", operatorUserId: "user-a", status: "assigned", createdAt: NOW.toISOString() } });
const techB = makeLocation({ id: "b", userId: "user-b", displayName: "Bruno", latitude: -23.9, longitude: -46.6 });
const techC = makeLocation({ id: "c", userId: "user-c", displayName: "Caio", latitude: -23.6, longitude: -46.6, status: "offline", capturedAt: stale, isStale: true });
const TECHS = [techA, techB, techC];
const COMPLETION = new Map<string, number | null>([["user-a", 0.9], ["user-b", 0.5]]);

// 1 — adapter do índice: parseia linha válida, PRESERVA completionRate null (nunca 0), zera contagem
//     inválida e descarta linha sem operatorUserId. Base do "null → —".
test("adaptTechnicianPerformanceItems: parseia, preserva completionRate null e zera contagem inválida", () => {
  const items = adaptTechnicianPerformanceItems([
    { operatorUserId: "op-1", assignedCount: 4, completedCount: 3, cancelledCount: 1, completionRate: 0.75 },
    { operatorUserId: "op-2", assignedCount: 0, completedCount: 0, cancelledCount: 0, completionRate: null },
    { operatorUserId: "op-3", assignedCount: -5, completedCount: "x", cancelledCount: 2, completionRate: 9 },
    { assignedCount: 1 }, // sem operatorUserId → descartada
  ]);
  assert.equal(items.length, 3);
  assert.equal(items[0]!.completionRate, 0.75);
  assert.equal(items[1]!.completionRate, null); // null preservado (não vira 0)
  assert.equal(items[2]!.completionRate, null); // 9 fora de 0..1 → null (nunca inventa)
  assert.equal(items[2]!.assignedCount, 0); // negativo → 0
  assert.equal(items[2]!.completedCount, 0); // string → 0
});

// 2 — service lê o envelope { data: { items } } e MONTA a query (operatorUserId/from/to). Mock de fetch.
test("fetchTechnicianPerformance lê { data: { items } } e monta a query", async () => {
  const { fetchTechnicianPerformance } = await import("../src/modules/operations/map/technician-performance.service");
  const seen: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    seen.push(String(url));
    return new Response(
      JSON.stringify({ data: { items: [{ operatorUserId: "op-1", assignedCount: 4, completedCount: 3, cancelledCount: 1, completionRate: 0.75 }] } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const result = await fetchTechnicianPerformance(CTX, { operatorUserId: "op-1", from: "2026-01-01", to: "2026-02-01" });
    assert.equal(result.source, "api");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.completionRate, 0.75);
    assert.match(seen[0]!, /\/operations\/technician-performance\?/);
    assert.match(seen[0]!, /operatorUserId=op-1/);
    assert.match(seen[0]!, /from=2026-01-01/);
    assert.match(seen[0]!, /to=2026-02-01/);
  } finally {
    globalThis.fetch = original;
  }
});

// 3 — erro real de API → lista vazia + source "fallback" (a UI mostra "—", nunca fabrica índice).
test("fetchTechnicianPerformance em erro → { items: [], source: 'fallback' }", async () => {
  const { fetchTechnicianPerformance } = await import("../src/modules/operations/map/technician-performance.service");
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
  try {
    const result = await fetchTechnicianPerformance(CTX);
    assert.equal(result.source, "fallback");
    assert.equal(result.items.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});

// 4 — DISTÂNCIA = haversine (linha reta), honesta: 1° de latitude ≈ 111 km; sem coordenada (alvo null ou
//     técnico em 0,0) → null (nunca distância inventada).
test("computeDistanceKm: haversine correto (~111 km por 1° lat) e null sem coordenada", () => {
  const km = computeDistanceKm(makeLocation({ latitude: -23.5, longitude: -46.6 }), { lat: -24.5, lng: -46.6 });
  assert.ok(km !== null && km > 110 && km < 112, `esperado ~111 km, obtido ${km}`);
  assert.equal(computeDistanceKm(makeLocation(), null), null); // chamado sem GPS
  assert.equal(computeDistanceKm(makeLocation({ latitude: 0, longitude: 0 }), CALL_COORD), null); // técnico sem coord válida
});

// 5 — TEMPO = ESTIMATIVA rotulada (dist ÷ 28 km/h), NUNCA "ETA de chegada"/"chega às". 14 km → 30 min.
test("formatEstimatedMinutes: '~Y min (estimado, sem trânsito)' e JAMAIS 'chega às'/'ETA de chegada'", () => {
  assert.equal(Math.round(estimateTravelMinutes(14)), 30);
  const label = formatEstimatedMinutes(14);
  assert.equal(label, "~30 min (estimado, sem trânsito)");
  assert.doesNotMatch(label, /chega às|ETA de chegada|às \d{1,2}:\d{2}/i);
  assert.equal(formatEstimatedMinutes(null), "Tempo indisponível"); // sem distância → honesto
});

// 6 — DISTÂNCIA rotulada "linha reta" (não é rota): <10 km com 1 casa, ≥10 arredondada; null → honesto.
test("formatStraightLineKm: '~X km (linha reta)' e 'Distância indisponível' quando null", () => {
  assert.equal(formatStraightLineKm(2.345), "~2.3 km (linha reta)");
  assert.equal(formatStraightLineKm(14), "~14 km (linha reta)");
  assert.equal(formatStraightLineKm(null), "Distância indisponível");
});

// 7 — ÍNDICE: null → "—" (sem OS atribuída), 0 → "0%" (valor real), fração → % arredondado. NUNCA 0% p/ null.
test("formatCompletionRate: null → '—', 0 → '0%', 0.75 → '75%'", () => {
  assert.equal(formatCompletionRate(null), "—");
  assert.equal(formatCompletionRate(0), "0%");
  assert.equal(formatCompletionRate(0.75), "75%");
});

// 8 — buildAllocationCandidates casa técnico↔índice por operatorUserId, computa distância/disponibilidade e
//     sinaliza despacho ATIVO (não terminal). operatorUserId = userId ?? operatorId (chave da alocação).
test("buildAllocationCandidates: distância, índice, disponível ao vivo e 'já em despacho' (ativo)", () => {
  const [a, b, c] = buildAllocationCandidates(TECHS, CALL_COORD, COMPLETION, NOW.getTime());
  assert.equal(a!.operatorUserId, "user-a");
  assert.equal(operatorUserIdOf(techA), "user-a");
  assert.ok(a!.distanceKm !== null && a!.distanceKm < b!.distanceKm!); // A mais perto que B
  assert.equal(a!.completionRate, 0.9);
  assert.equal(c!.completionRate, null); // fora do índice → null
  assert.equal(a!.isAvailable, true); // available + fresco
  assert.equal(c!.isAvailable, false); // offline/antigo
  assert.equal(a!.hasActiveDispatch, true); // dispatch "assigned" é ativo
  assert.equal(b!.hasActiveDispatch, false);
});

// 9 — ordenar por DISTÂNCIA asc (Mais próximo): perto→longe; distância null AFUNDA.
test("rankAllocationCandidates 'nearest': distância asc, null afunda", () => {
  const candidates = buildAllocationCandidates(TECHS, CALL_COORD, COMPLETION, NOW.getTime());
  const order = rankAllocationCandidates(candidates, "nearest", false).map((candidate) => candidate.location.id);
  assert.deepEqual(order, ["a", "c", "b"]); // A(~1km) < C(~11km) < B(~44km)
  // Sem coordenada do chamado, todas as distâncias são null → ordena por nome (estável), não quebra.
  const noCoord = rankAllocationCandidates(buildAllocationCandidates(TECHS, null, COMPLETION, NOW.getTime()), "nearest", false);
  assert.equal(noCoord.length, 3);
});

// 10 — ordenar por ÍNDICE desc (Maior índice de conclusão): maior→menor; índice null AFUNDA (nunca no topo).
test("rankAllocationCandidates 'completion': índice desc, null afunda", () => {
  const candidates = buildAllocationCandidates(TECHS, CALL_COORD, COMPLETION, NOW.getTime());
  const order = rankAllocationCandidates(candidates, "completion", false).map((candidate) => candidate.location.id);
  assert.deepEqual(order, ["a", "b", "c"]); // 0.9 > 0.5 > null
});

// 11 — FILTRO "Disponível": remove indisponível/frescor antigo (C offline/antigo cai fora).
test("rankAllocationCandidates availableOnly: filtra fora indisponível/antigo", () => {
  const candidates = buildAllocationCandidates(TECHS, CALL_COORD, COMPLETION, NOW.getTime());
  const ids = rankAllocationCandidates(candidates, "nearest", true).map((candidate) => candidate.location.id);
  assert.deepEqual(ids, ["a", "b"]); // C (offline/antigo) sumiu
  assert.ok(!ids.includes("c"));
});

// 12 — POPUP D (detalhe): cliente/endereço/SLA-proxy HONESTO (sem "vence em") + "Alocar técnico" GATED por
//      canCreateDispatch (sem permissão → nada de alocar, mensagem clara).
test("popup D detalhe: cliente/endereço/SLA honesto + 'Alocar técnico' gated por canCreateDispatch", () => {
  const call = makeCall({ code: "OS-77", customerName: "Cliente Z", createdAt: new Date(NOW.getTime() - 30 * 60_000).toISOString() });
  const base = {
    call,
    serviceAddress: "Rua das Flores, 100",
    callCoordinate: CALL_COORD,
    technicians: TECHS,
    completionByOperator: COMPLETION,
    context: CTX,
    onClose: () => undefined,
    onAllocated: () => undefined,
    now: NOW,
  } as const;
  const withPerm = renderToString(createElement(OperationsCallAllocationPopup, { ...base, canCreateDispatch: true }));
  assert.match(withPerm, /OS-77/);
  assert.match(withPerm, /Cliente Z/);
  assert.match(withPerm, /Rua das Flores, 100/);
  assert.match(withPerm, /Aberto há 30 min/); // SLA-proxy honesto
  assert.doesNotMatch(withPerm, /vence em|prazo restante/i);
  assert.match(withPerm, /Alocar técnico/);

  const noPerm = renderToString(createElement(OperationsCallAllocationPopup, { ...base, canCreateDispatch: false }));
  assert.doesNotMatch(noPerm, /Alocar técnico/);
  assert.match(noPerm, /Sem permissão para alocar/);
});

// 13 — POPUP D (ranking): lista ranqueada com distância "linha reta", índice "%/—", "Já em despacho",
//      filtros e botões "Alocar" — e LGPD: NENHUMA coordenada crua no HTML.
test("popup D ranking: distância(linha reta) + índice(%/—) + 'Já em despacho' + filtros + LGPD sem coordenada", () => {
  const html = renderToString(
    createElement(OperationsCallAllocationPopup, {
      call: makeCall(),
      serviceAddress: "Rua 1",
      callCoordinate: CALL_COORD,
      technicians: TECHS,
      completionByOperator: COMPLETION,
      canCreateDispatch: true,
      context: CTX,
      onClose: () => undefined,
      onAllocated: () => undefined,
      now: NOW,
      initialView: "ranking",
    }),
  );
  assert.match(html, /Ana/);
  assert.match(html, /Bruno/);
  assert.match(html, /Caio/);
  assert.match(html, /km \(linha reta\)/); // distância honesta rotulada
  assert.match(html, /Índice de conclusão/); // rótulo do índice por linha
  assert.match(html, /90%/); // A (0.9)
  assert.match(html, /Índice de conclusão: <!-- -->—/); // C (null → —, nunca 0% fabricado)
  assert.match(html, /Já em despacho/); // A tem dispatch ativo
  assert.match(html, /Disponível/); // filtro
  assert.match(html, /Mais próximo/);
  assert.match(html, /Maior índice de conclusão/);
  assert.match(html, /Alocar</); // botões de alocar
  // LGPD §12: nenhuma latitude/longitude crua vaza para o DOM (só a distância derivada).
  assert.doesNotMatch(html, /-23\.\d|-46\.\d|latitude|longitude/i);
});

// 14 — POPUP E (padrão): dados do técnico (status/frescor/equipe/OS/índice) + SELETOR com os chamados +
//      "Alocar"; SEM disclaimer/distância antes de escolher; LGPD sem coordenada.
test("popup E: dados + seletor de chamados + 'Alocar', sem par antes de escolher, LGPD sem coordenada", () => {
  const calls = [makeCall({ id: "wo-1", code: "OS-1" }), makeCall({ id: "wo-2", code: "OS-2", customerName: "Cliente B" })];
  const html = renderToString(
    createElement(OperationsTechnicianAllocationPopup, {
      technician: makeLocation({ displayName: "Ana Souza", capturedAt: new Date(NOW.getTime() - 5 * 60_000).toISOString() }),
      calls,
      resolveCallCoordinate: () => CALL_COORD,
      completionRate: 0.6,
      canCreateDispatch: true,
      context: CTX,
      onClose: () => undefined,
      onAllocated: () => undefined,
      now: NOW,
    }),
  );
  assert.match(html, /Ana Souza/);
  assert.match(html, /Visto/);
  assert.match(html, /há 5 min/); // frescor relativo (nunca coordenada)
  assert.match(html, /Equipe Sul/);
  assert.match(html, /Índice de conclusão/);
  assert.match(html, /OS-1/); // opção do seletor
  assert.match(html, /OS-2/);
  assert.match(html, /Alocar</);
  assert.doesNotMatch(html, /estimado, sem trânsito/); // par só aparece após escolher um chamado
  assert.doesNotMatch(html, /-23\.\d|-46\.\d|latitude|longitude/i);
});

// 15 — POPUP E (chamado escolhido): mostra DISTÂNCIA "linha reta" + TEMPO "estimado, sem trânsito" com
//      disclaimer VISÍVEL; JAMAIS "chega às"/"ETA de chegada"; LGPD sem coordenada.
test("popup E com chamado escolhido: distância + tempo ESTIMADO + disclaimer, sem 'chega às', LGPD", () => {
  const call = makeCall({ id: "wo-1", code: "OS-1" });
  const html = renderToString(
    createElement(OperationsTechnicianAllocationPopup, {
      technician: makeLocation({ latitude: -23.5, longitude: -46.6 }),
      calls: [call],
      resolveCallCoordinate: (id: string) => (id === "wo-1" ? { lat: -23.5, lng: -46.74 } : null),
      completionRate: null,
      canCreateDispatch: true,
      context: CTX,
      onClose: () => undefined,
      onAllocated: () => undefined,
      now: NOW,
      initialCallId: "wo-1",
    }),
  );
  assert.match(html, /km \(linha reta\)/);
  assert.match(html, /min \(estimado, sem trânsito\)/);
  assert.match(html, /não considera\s+trânsito|Não é uma previsão de chegada/i); // disclaimer visível
  assert.doesNotMatch(html, /chega às|ETA de chegada|às \d{1,2}:\d{2}/i);
  assert.match(html, /Índice de conclusão/);
  assert.doesNotMatch(html, /-23\.\d|-46\.\d|latitude|longitude/i);
});

// 16 — FIAÇÃO (alocação REAL): os dois popups chamam `allocate` com a payload {workOrderId, operatorUserId};
//      o hook chama createDispatch(context, payload); a página liga clique→popup e renderiza os dois popups.
test("fiação: allocate({workOrderId, operatorUserId}) nos dois popups; hook → createDispatch; página liga tudo", () => {
  // D: workOrderId = chamado clicado; operatorUserId = técnico da linha.
  assert.match(CALL_POPUP_SRC, /allocate\(\s*\{\s*workOrderId:\s*call\.id,\s*operatorUserId:\s*candidate\.operatorUserId\s*\}/);
  // E: workOrderId = chamado escolhido no seletor; operatorUserId = técnico do popup (fluxo reverso).
  assert.match(TECH_POPUP_SRC, /allocate\(\{\s*workOrderId:\s*selectedCall\.id,\s*operatorUserId\s*\}/);
  // Hook faz a alocação REAL via createDispatch (nunca fabrica sucesso).
  assert.match(ALLOCATE_HOOK_SRC, /createDispatch\(context,\s*payload\)/);
  // 404/409/422 do backend viram mensagem clara (feedback honesto).
  assert.match(ALLOCATE_HOOK_SRC, /error\.status === 404/);
  assert.match(ALLOCATE_HOOK_SRC, /error\.status === 422/);
  // Página: clique no chamado/técnico abre o popup; hover realça; ambos os popups são renderizados.
  assert.match(PAGE_SRC, /onSelect=\{openCallAllocation\}/);
  assert.match(PAGE_SRC, /onSelect=\{openTechAllocation\}/);
  assert.match(PAGE_SRC, /onHighlight=\{\(location\) => setSelectedId\(location\.id\)\}/);
  assert.match(PAGE_SRC, /<OperationsCallAllocationPopup/);
  assert.match(PAGE_SRC, /<OperationsTechnicianAllocationPopup/);
});
