import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MAP_VIEW_DEFAULT,
  MAP_VIEW_MEMORY_KEY_PREFIX,
  MAP_VIEW_SAVENOTE_MS,
  mapViewMemoryKey,
  readSavedMapView,
  writeSavedMapView,
} from "../src/modules/operations/map/hooks/useMapViewMemory";
import {
  OPERATIONAL_MAP_DEFAULT_CENTER,
  OPERATIONAL_MAP_DEFAULT_ZOOM,
} from "../src/modules/operations/map/map/mapStyle";

// J-MAPAS-10 (D4) — MEMÓRIA DA VISÃO do operador: visão salva > default Brasil z4; chave por
// tenant (divergência 11); moveend salva SÓ a câmera; savenote "✓ Visão do mapa salva".
// O focus-city (J-MAPAS-4) foi SUPERSEDED no caminho da câmera (helpers saem no PR-2).

const SRC = new URL("../src/modules/operations/map/", import.meta.url);
const CANVAS_SRC = readFileSync(fileURLToPath(new URL("components/OperationsMapLibreCanvas.tsx", SRC)), "utf8");
const PAGE_SRC = readFileSync(fileURLToPath(new URL("pages/OperationsMapPage.tsx", SRC)), "utf8");

type Store = Map<string, string>;
function makeStorage(store: Store = new Map()) {
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

// 1 — chave verbatim do protótipo + sufixo de tenant (isolamento multi-org, divergência 11).
test("mapViewMemoryKey: prefixo verbatim techsol.mapaOp.view + sufixo por tenant", () => {
  assert.equal(MAP_VIEW_MEMORY_KEY_PREFIX, "techsol.mapaOp.view");
  assert.equal(mapViewMemoryKey("ten-1"), "techsol.mapaOp.view.ten-1");
  assert.equal(mapViewMemoryKey(undefined), "techsol.mapaOp.view");
});

// 2 — default BRASIL z4 (verbatim: setView([-15.5,-52.5],4)), derivado das constantes únicas do estilo.
test("MAP_VIEW_DEFAULT = Brasil lat -15.5 / lng -52.5 / z4 (uma fonte só com o estilo)", () => {
  assert.deepEqual(MAP_VIEW_DEFAULT, { lat: -15.5, lng: -52.5, z: 4 });
  assert.equal(MAP_VIEW_DEFAULT.lng, OPERATIONAL_MAP_DEFAULT_CENTER[0]);
  assert.equal(MAP_VIEW_DEFAULT.lat, OPERATIONAL_MAP_DEFAULT_CENTER[1]);
  assert.equal(MAP_VIEW_DEFAULT.z, OPERATIONAL_MAP_DEFAULT_ZOOM);
});

// 3 — leitura: visão salva válida volta; corrompida/ausente/não-numérica → null (cai no default).
test("readSavedMapView: válida volta; corrompida, ausente ou não-numérica → null", () => {
  const storage = makeStorage();
  const key = mapViewMemoryKey("t");
  writeSavedMapView(storage, key, { lat: -25.43, lng: -49.27, z: 12 });
  assert.deepEqual(readSavedMapView(storage, key), { lat: -25.43, lng: -49.27, z: 12 });

  storage.store.set(key, "{corrompido");
  assert.equal(readSavedMapView(storage, key), null);
  storage.store.set(key, JSON.stringify({ lat: "x", lng: -49, z: 4 }));
  assert.equal(readSavedMapView(storage, key), null);
  assert.equal(readSavedMapView(storage, "outra-chave"), null);
  assert.equal(readSavedMapView(null, key), null); // sem storage (SSR/privado) nunca quebra
});

// 4 — LGPD/plano §6(e): o storage guarda SOMENTE a câmera {lat,lng,z} — nada além (nunca posição
//     de técnico, nome, id ou coordenada de OS).
test("writeSavedMapView persiste exatamente {lat,lng,z} da câmera e nada mais", () => {
  const storage = makeStorage();
  const key = mapViewMemoryKey("t");
  writeSavedMapView(storage, key, { lat: -10.1, lng: -50.2, z: 7 });
  const raw = JSON.parse(storage.store.get(key)!);
  assert.deepEqual(Object.keys(raw).sort(), ["lat", "lng", "z"]);
  assert.deepEqual(raw, { lat: -10.1, lng: -50.2, z: 7 });
});

// 5 — isolamento multi-org: tenants diferentes usam chaves diferentes (visões não vazam).
test("tenants diferentes gravam em chaves diferentes (enquadramento não vaza entre organizações)", () => {
  const storage = makeStorage();
  writeSavedMapView(storage, mapViewMemoryKey("org-a"), { lat: -25, lng: -49, z: 12 });
  writeSavedMapView(storage, mapViewMemoryKey("org-b"), { lat: -23, lng: -46, z: 11 });
  assert.deepEqual(readSavedMapView(storage, mapViewMemoryKey("org-a")), { lat: -25, lng: -49, z: 12 });
  assert.deepEqual(readSavedMapView(storage, mapViewMemoryKey("org-b")), { lat: -23, lng: -46, z: 11 });
});

// 6 — canvas: câmera inicial = initialView (salva > Brasil), moveend → onMoveEnd; SEM auto-fit.
test("canvas usa initialView na criação do mapa e reporta a câmera no moveend (sem fitBounds)", () => {
  assert.match(CANVAS_SRC, /center:\s*view \? \[view\.lng, view\.lat\] : \[-52\.5, -15\.5\]/);
  assert.match(CANVAS_SRC, /zoom:\s*view \? view\.z : 4/);
  assert.match(CANVAS_SRC, /map\.on\("moveend"/);
  assert.match(CANVAS_SRC, /onMoveEndRef\.current\?\.\(\{ lat: center\.lat, lng: center\.lng, z: map\.getZoom\(\) \}\)/);
  assert.doesNotMatch(CANVAS_SRC, /fitBounds/);
});

// 7 — página liga o hook por tenant e renderiza o savenote verbatim (fade ~1.2s do hook).
test("página: useMapViewMemory(tenantId) + savenote '✓ Visão do mapa salva' (1.2s)", () => {
  assert.match(PAGE_SRC, /useMapViewMemory\(activeContext\?\.tenantId\)/);
  assert.match(PAGE_SRC, /initialView=\{viewMemory\.initialView\}/);
  assert.match(PAGE_SRC, /onMoveEnd=\{viewMemory\.handleMoveEnd\}/);
  assert.match(PAGE_SRC, /✓ Visão do mapa salva/);
  assert.equal(MAP_VIEW_SAVENOTE_MS, 1200);
});
