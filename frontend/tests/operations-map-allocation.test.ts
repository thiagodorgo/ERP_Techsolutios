import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Shim NÃO-destrutivo de window/localStorage: hooks importam api/client (auth.storage) — em
// node --test precisamos de um window mínimo. Não sobrescreve.
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
import type { DispatchesApiContext } from "../src/modules/operations/dispatches/dispatches.types";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (D5) — ALOCAÇÃO via os GESTOS do protótipo (seleção→Alocar por linha, popup do marker,
// DnD), SEMPRE no MESMO endpoint real (POST /operations/dispatches via useAllocateDispatch, #241).
// Os popups D/E do J-MAPAS-7 foram SUBSTITUÍDOS (guard de ausência abaixo); os formatters honestos e
// os helpers de candidatos (reusados pelo popup do marker) seguem intactos.

const NOW = new Date("2026-07-20T12:00:00.000Z");
const CTX: DispatchesApiContext = { token: "t", tenantId: "tenant-1", permissions: ["field_dispatch:create"] };
const CALL_COORD: Coordinate = { lat: -23.5, lng: -46.6 };

const SRC_DIR = new URL("../src/modules/operations/map/", import.meta.url);
const readSrc = (rel: string) => readFileSync(fileURLToPath(new URL(rel, SRC_DIR)), "utf8");
const ALLOCATE_HOOK_SRC = readSrc("hooks/useAllocateDispatch.ts");
const PAGE_SRC = readSrc("pages/OperationsMapPage.tsx");
const OPERATOR_LIST_SRC = readSrc("components/OperationsOperatorList.tsx");
const MARKER_POPUP_SRC = readSrc("components/OperationsOsMarkerPopup.tsx");

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    userId: "user-1",
    displayName: "Ana Souza",
    status: "available",
    latitude: -23.5,
    longitude: -46.6,
    capturedAt: NOW.toISOString(),
    isStale: false,
    teamName: "Equipe Sul",
    ...overrides,
  };
}

const stale = new Date(NOW.getTime() - 20 * 60_000).toISOString();
const techA = makeLocation({ id: "a", userId: "user-a", displayName: "Ana", latitude: -23.51, longitude: -46.6, currentDispatch: { id: "d1", workOrderId: "x", operatorUserId: "user-a", status: "assigned", createdAt: NOW.toISOString() } });
const techB = makeLocation({ id: "b", userId: "user-b", displayName: "Bruno", latitude: -23.9, longitude: -46.6 });
const techC = makeLocation({ id: "c", userId: "user-c", displayName: "Caio", latitude: -23.6, longitude: -46.6, status: "offline", capturedAt: stale, isStale: true });
const TECHS = [techA, techB, techC];
const COMPLETION = new Map<string, number | null>([["user-a", 0.9], ["user-b", 0.5]]);

// 1 — adapter do índice intacto: parseia, preserva null (nunca 0) e sanitiza contagens.
test("adaptTechnicianPerformanceItems: parseia, preserva completionRate null e zera contagem inválida", () => {
  const items = adaptTechnicianPerformanceItems([
    { operatorUserId: "op-1", assignedCount: 4, completedCount: 3, cancelledCount: 1, completionRate: 0.75 },
    { operatorUserId: "op-2", assignedCount: 0, completedCount: 0, cancelledCount: 0, completionRate: null },
    { operatorUserId: "op-3", assignedCount: -5, completedCount: "x", cancelledCount: 2, completionRate: 9 },
    { assignedCount: 1 },
  ]);
  assert.equal(items.length, 3);
  assert.equal(items[0]!.completionRate, 0.75);
  assert.equal(items[1]!.completionRate, null);
  assert.equal(items[2]!.completionRate, null);
  assert.equal(items[2]!.assignedCount, 0);
  assert.equal(items[2]!.completedCount, 0);
});

// 2 — service intacto: envelope { data: { items } } + query.
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
    assert.match(seen[0]!, /\/operations\/technician-performance\?/);
    assert.match(seen[0]!, /operatorUserId=op-1/);
  } finally {
    globalThis.fetch = original;
  }
});

// 3 — erro real de API → fallback vazio (nunca índice fabricado).
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

// 4 — distância honesta: haversine (~111 km por 1° lat) e null sem coordenada.
test("computeDistanceKm: haversine correto e null sem coordenada", () => {
  const km = computeDistanceKm(makeLocation({ latitude: -23.5, longitude: -46.6 }), { lat: -24.5, lng: -46.6 });
  assert.ok(km !== null && km > 110 && km < 112);
  assert.equal(computeDistanceKm(makeLocation(), null), null);
  assert.equal(computeDistanceKm(makeLocation({ latitude: 0, longitude: 0 }), CALL_COORD), null);
});

// 5 — tempo = ESTIMATIVA rotulada; nunca "chega às"/"ETA de chegada".
test("formatEstimatedMinutes: '~Y min (estimado, sem trânsito)' e nunca 'chega às'", () => {
  assert.equal(Math.round(estimateTravelMinutes(14)), 30);
  const label = formatEstimatedMinutes(14);
  assert.equal(label, "~30 min (estimado, sem trânsito)");
  assert.doesNotMatch(label, /chega às|ETA de chegada|às \d{1,2}:\d{2}/i);
  assert.equal(formatEstimatedMinutes(null), "Tempo indisponível");
});

// 6 — distância rotulada "linha reta" intacta.
test("formatStraightLineKm: '~X km (linha reta)' e 'Distância indisponível' quando null", () => {
  assert.equal(formatStraightLineKm(2.345), "~2.3 km (linha reta)");
  assert.equal(formatStraightLineKm(14), "~14 km (linha reta)");
  assert.equal(formatStraightLineKm(null), "Distância indisponível");
});

// 7 — índice: null → "—" (nunca 0% fabricado); 0 real → "0%".
test("formatCompletionRate: null → '—', 0 → '0%', 0.75 → '75%'", () => {
  assert.equal(formatCompletionRate(null), "—");
  assert.equal(formatCompletionRate(0), "0%");
  assert.equal(formatCompletionRate(0.75), "75%");
});

// 8 — candidatos: distância/índice/disponível/despacho-ativo (REUSADOS pelo popup do marker).
test("buildAllocationCandidates: distância, índice, disponível ao vivo e 'já em despacho'", () => {
  const [a, b, c] = buildAllocationCandidates(TECHS, CALL_COORD, COMPLETION, NOW.getTime());
  assert.equal(a!.operatorUserId, "user-a");
  assert.equal(operatorUserIdOf(techA), "user-a");
  assert.ok(a!.distanceKm !== null && a!.distanceKm < b!.distanceKm!);
  assert.equal(a!.completionRate, 0.9);
  assert.equal(c!.completionRate, null);
  assert.equal(a!.isAvailable, true);
  assert.equal(c!.isAvailable, false);
  assert.equal(a!.hasActiveDispatch, true);
  assert.equal(b!.hasActiveDispatch, false);
});

// 9 — ranking intacto: nearest asc com null afundando; completion desc com null afundando.
test("rankAllocationCandidates: nearest asc e completion desc, null afunda", () => {
  const candidates = buildAllocationCandidates(TECHS, CALL_COORD, COMPLETION, NOW.getTime());
  assert.deepEqual(rankAllocationCandidates(candidates, "nearest", false).map((c) => c.location.id), ["a", "c", "b"]);
  assert.deepEqual(rankAllocationCandidates(candidates, "completion", false).map((c) => c.location.id), ["a", "b", "c"]);
  assert.deepEqual(rankAllocationCandidates(candidates, "nearest", true).map((c) => c.location.id), ["a", "b"]);
});

// 10 — GUARD DE AUSÊNCIA: os popups D/E e o diálogo de alocação foram REMOVIDOS (substituídos
//      pelos gestos do protótipo — D-MAPA-PIXEL div. 5); nada os referencia.
test("popups D/E removidos: arquivos ausentes e sem referências vivas", () => {
  for (const dead of [
    "components/OperationsCallAllocationPopup.tsx",
    "components/OperationsTechnicianAllocationPopup.tsx",
    "components/MapAllocationDialog.tsx",
  ]) {
    assert.equal(existsSync(fileURLToPath(new URL(dead, SRC_DIR))), false, `arquivo deveria ter sido removido: ${dead}`);
  }
  assert.doesNotMatch(PAGE_SRC, /CallAllocationPopup|TechnicianAllocationPopup|MapAllocationDialog/);
});

// 11 — FIAÇÃO REAL: todos os gestos convergem em performAllocation → useAllocateDispatch.allocate
//      com a payload {workOrderId, operatorUserId} (a MESMA verdade do #241).
test("fiação: página → allocate({workOrderId, operatorUserId}) e hook → createDispatch", () => {
  assert.match(PAGE_SRC, /allocation\.allocate\(\s*\{ workOrderId: workOrder\.id, operatorUserId: operatorUserIdOf\(location\) \}/);
  assert.match(ALLOCATE_HOOK_SRC, /createDispatch\(context,\s*payload\)/);
  // Os três gestos usam o MESMO performAllocation: linha (go), drop (DnD) e popup do marker.
  assert.match(PAGE_SRC, /onAllocate=\{\(location\) =>\s*\n?\s*selectedCall \? void performAllocation/);
  assert.match(PAGE_SRC, /handleDropAllocate/);
  assert.match(PAGE_SRC, /onAllocate=\{\(candidate\) => void performAllocation\(\{ id: pin\.id, code: pin\.code \}, candidate\.location\)\}/);
});

// 12 — contrato de erro do backend intacto (404/409/422/401-403 traduzidos, nunca fabricado).
test("useAllocateDispatch traduz 404/409/422/401-403 do backend (feedback real)", () => {
  assert.match(ALLOCATE_HOOK_SRC, /error\.status === 404/);
  assert.match(ALLOCATE_HOOK_SRC, /error\.status === 409/);
  assert.match(ALLOCATE_HOOK_SRC, /error\.status === 422/);
  assert.match(ALLOCATE_HOOK_SRC, /error\.status === 401 \|\| error\.status === 403/);
});

// 13 — TOAST honesto (D-MAPA-PIXEL div. 7): copy com estimativa ROTULADA; jamais "chegada estimada em".
test("toast de alocação usa copy honesta (estimado, sem trânsito · linha reta); nunca 'chegada estimada'", () => {
  assert.match(PAGE_SRC, /formatEstimatedMinutes\(km\)/);
  assert.match(PAGE_SRC, /formatStraightLineKm\(km\)/);
  assert.match(PAGE_SRC, /✓ \$\{workOrder\.code\} alocada para \$\{location\.displayName\}/);
  assert.doesNotMatch(PAGE_SRC, /chegada estimada/i);
});

// 14 — GATING dos gestos: sem field_dispatch:create não há Alocar (linha/popup), drag nem drop.
test("gating: canAllocate/canCreateDispatches condiciona Alocar, draggable e drop em todos os gestos", () => {
  assert.match(PAGE_SRC, /draggableEnabled=\{canCreateDispatches\}/);
  assert.match(PAGE_SRC, /canAllocate=\{canCreateDispatches\}/);
  assert.match(PAGE_SRC, /if \(!canCreateDispatches\) return/);
  assert.match(OPERATOR_LIST_SRC, /canAllocate && selectedCallId \?/);
  assert.match(MARKER_POPUP_SRC, /canAllocate \?/);
});

// 15 — protótipo: técnico do grupo "off" nunca recebe alocação (guarda na página, como t.st==='off').
test("técnico 'off' não recebe alocação (guarda do protótipo na página)", () => {
  assert.match(PAGE_SRC, /getFieldLocationGroup\(location\.status\) === "off"\) return/);
});
