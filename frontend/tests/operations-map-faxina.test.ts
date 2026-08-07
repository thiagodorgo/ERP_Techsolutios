import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  STALE_AMBER_MS,
  STALE_GRAY_MS,
  buildFieldLocationsFeatureCollection,
  getStaleLevel,
  haversineKm,
} from "../src/modules/operations/map/map/mapMarkers";
import * as mapMarkers from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";

/**
 * J-MAPAS-10 PR-2 — FAXINA declarada no PR-1. Guards de REMOÇÃO: código morto que ninguém mais
 * consome não pode voltar por inércia, e nada que ainda tem consumidor pode ser removido junto.
 *
 * O focus-city (J-MAPAS-4, "enquadrar a cidade com mais técnicos") foi SUPERSEDIDO pela memória
 * da visão do operador (D-MAPA-PIXEL, divergência 1 — artefato mais novo do dono). O último
 * consumidor dos helpers era o canvas Google; com o espelho fechado no PR-2, eles saem.
 */

const MAP_MODULE = new URL("../src/modules/operations/map/", import.meta.url);
const TESTS = new URL("./", import.meta.url);
const REPO = new URL("../../", import.meta.url);

const MARKERS_SRC = readFileSync(fileURLToPath(new URL("map/mapMarkers.ts", MAP_MODULE)), "utf8");
const CSS = readFileSync(fileURLToPath(new URL("../src/styles/app.css", import.meta.url)), "utf8");
const PACKAGE_JSON = readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8");

/** Fontes .ts/.tsx do frontend (src + tests) — base dos guards de "sem consumidor". */
function allSources(): string[] {
  const files: string[] = [];
  const walk = (dir: URL) => {
    for (const entry of readdirSync(fileURLToPath(dir), { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir);
      if (entry.isDirectory()) walk(child);
      else if (/\.tsx?$/.test(entry.name)) files.push(readFileSync(fileURLToPath(child), "utf8"));
    }
  };
  walk(new URL("../src/", import.meta.url));
  walk(TESTS);
  return files;
}

const SOURCES = allSources();

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    displayName: "Ana Souza",
    status: "available",
    latitude: -23.55052,
    longitude: -46.633308,
    capturedAt: "2026-08-06T12:00:00.000Z",
    isStale: false,
    ...overrides,
  };
}

// 1 — helpers do focus-city REMOVIDOS do módulo (não exportados, não declarados).
test("focus-city: clusterByProximity/pickFocusCluster/westFirstTieBreak/centroidOf saíram do mapMarkers", () => {
  for (const dead of [
    "clusterByProximity",
    "pickFocusCluster",
    "westFirstTieBreak",
    "centroidOf",
    "FOCUS_CITY_CLUSTER_THRESHOLD_KM",
    "ClusterTieBreak",
    "GeoPoint",
  ]) {
    assert.ok(!(dead in mapMarkers), `export ressuscitado: ${dead}`);
    assert.ok(
      !new RegExp(`export (function|const|type) ${dead}\\b`).test(MARKERS_SRC),
      `declaração ressuscitada: ${dead}`,
    );
  }
});

// 2 — o arquivo de teste do focus-city saiu junto (e some do test:smoke).
test("focus-city: o arquivo de teste foi removido e não é mais chamado no test:smoke", () => {
  assert.equal(existsSync(fileURLToPath(new URL("operations-map-focus-city.test.ts", TESTS))), false);
  assert.ok(!PACKAGE_JSON.includes("operations-map-focus-city"), "test:smoke ainda chama o focus-city");
});

// 3 — haversineKm SOBREVIVEU (é a base do ~km/~min honesto da alocação) e continua correto.
test("haversineKm sobrevive à faxina e mantém a distância geodésica (base do ~km honesto)", () => {
  assert.equal(typeof haversineKm, "function");
  // Curitiba ↔ São Paulo ≈ 339 km (ordem de grandeza real, não fabricada).
  const km = haversineKm({ lat: -25.4284, lng: -49.2733 }, { lat: -23.5505, lng: -46.6333 });
  assert.ok(km > 320 && km < 360, `distância fora da faixa esperada: ${km}`);
  assert.equal(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
  const allocation = readFileSync(fileURLToPath(new URL("allocation.ts", MAP_MODULE)), "utf8");
  assert.match(allocation, /haversineKm/); // o consumidor vivo que justifica a preservação
});

// 4 — componentes órfãos removidos do disco E sem nenhum import remanescente.
test("órfãos removidos: OperationsDispatchActionsPanel e OperationsMapStatusBadge (zero consumidor)", () => {
  for (const orphan of ["OperationsDispatchActionsPanel", "OperationsMapStatusBadge"]) {
    assert.equal(
      existsSync(fileURLToPath(new URL(`components/${orphan}.tsx`, MAP_MODULE))),
      false,
      `componente órfão ainda no disco: ${orphan}`,
    );
    assert.ok(
      SOURCES.every((source) => !source.includes(`components/${orphan}`)),
      `import remanescente de ${orphan}`,
    );
  }
});

// 5 — CSS órfão saiu junto (regra sem componente é regra morta) e o espelho Google usa .opmap-g*.
test("CSS: regras órfãs do painel de despacho e dos pins .gmp-* saíram; espelho usa .opmap-g*", () => {
  for (const dead of [
    ".operations-map-dispatch-actions",
    ".gmp-operator-pin",
    ".gmp-workorder-pin",
    ".operations-map-canvas__gmaps",
  ]) {
    assert.ok(!CSS.includes(dead), `regra morta ainda no CSS: ${dead}`);
  }
  for (const alive of [".opmap-gmap", ".opmap-gtech", ".opmap-gos", ".opmap-gcode", ".opmap-gpopup"]) {
    assert.ok(CSS.includes(alive), `regra do espelho Google ausente: ${alive}`);
  }
});

// 6 — props MORTAS do GeoJSON de técnico saíram: nenhuma faixa 3/10 min entra no mapa (o limiar do
//     mapa é único — `isStale`, 15 min — por D-MAPA-PIXEL, divergência 4).
test("GeoJSON do técnico: ringColor/staleLevel/available saíram; ficam avatar/borda/grupo/off", () => {
  const fc = buildFieldLocationsFeatureCollection([makeLocation({ id: "a" })], "a");
  const properties = fc.features[0]!.properties as Record<string, unknown>;
  for (const dead of ["ringColor", "staleLevel", "available"]) {
    assert.ok(!(dead in properties), `propriedade morta ainda no GeoJSON: ${dead}`);
  }
  assert.deepEqual(Object.keys(properties).sort(), [
    "avatarColor",
    "borderColor",
    "displayName",
    "group",
    "id",
    "initials",
    "off",
    "selected",
  ]);
});

// 7 — GUARD ANTI-REMOÇÃO CEGA: getStaleLevel e as faixas 3/10 min continuam VIVAS fora do mapa
//     (a aba "Mapa da OS" as usa para o selo de frescor) — faxina não é motosserra.
test("getStaleLevel e as faixas 3/10 min seguem vivas para a aba Mapa da OS (consumidor real)", () => {
  assert.equal(getStaleLevel("2026-08-06T12:00:00.000Z", new Date("2026-08-06T12:00:00.000Z").getTime()), "live");
  assert.equal(getStaleLevel("2026-08-06T12:00:00.000Z", new Date("2026-08-06T12:00:00.000Z").getTime() + STALE_AMBER_MS), "amber");
  assert.equal(getStaleLevel("2026-08-06T12:00:00.000Z", new Date("2026-08-06T12:00:00.000Z").getTime() + STALE_GRAY_MS), "gray");
  const mapTab = readFileSync(
    fileURLToPath(new URL("../src/modules/work-orders/components/tabs/MapTab.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(mapTab, /getStaleLevel/);
});

// 8 — e2e do mapa: a spec estava DEFASADA desde antes do PR-1 (esperava "Mapa placeholder", da era
//     pré-Ω1) e não roda no CI. Foi reescrita para a tela real; este guard impede a volta do texto
//     morto e exige as âncoras da tela nova (o único jeito de a spec não apodrecer sem execução).
test("e2e: a spec do Mapa cobre a tela real (sem 'Mapa placeholder'/'Despachos Operacionais')", () => {
  const spec = readFileSync(fileURLToPath(new URL("tests/e2e/critical-flows.spec.ts", REPO)), "utf8");
  const mapBlock = /test\("Mapa Operacional[\s\S]*?\n\}\);/.exec(spec);
  assert.ok(mapBlock, "bloco do Mapa Operacional não encontrado na spec e2e");
  const block = mapBlock![0]!;
  for (const dead of ["Mapa placeholder", "Despachos Operacionais", "Visualização operacional", "Acompanhar despacho"]) {
    assert.ok(!block.includes(dead), `texto pré-Ω1 ainda esperado na e2e: ${dead}`);
  }
  for (const alive of ["opmap-stage", "Chamados recebidos", "Técnicos de campo", "Esc limpa a seleção"]) {
    assert.ok(block.includes(alive), `âncora da tela real ausente na e2e: ${alive}`);
  }
});
