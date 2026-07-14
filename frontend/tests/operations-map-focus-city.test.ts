import assert from "node:assert/strict";
import test from "node:test";

import {
  FOCUS_CITY_CLUSTER_THRESHOLD_KM,
  centroidOf,
  clusterByProximity,
  haversineKm,
  pickFocusCluster,
  westFirstTieBreak,
  type GeoPoint,
} from "../src/modules/operations/map/map/mapMarkers";

// J-MAPAS-4 — foco da câmera na "cidade com mais técnicos" por CLUSTERING geográfico (custo zero).
// Estes testes são PUROS (sem DOM, sem Google Maps): validam o núcleo determinístico da regra.

// Cidades do demo (seed).
const CURITIBA = { lat: -25.43, lng: -49.27 };
const SAO_PAULO = { lat: -23.55, lng: -46.63 };

// 4 técnicos em Curitiba (jitter intra-cidade << 50 km) + 2 em São Paulo.
const DEMO_POINTS: GeoPoint[] = [
  { id: "cwb-1", lat: -25.43, lng: -49.27 },
  { id: "cwb-2", lat: -25.44, lng: -49.28 },
  { id: "cwb-3", lat: -25.42, lng: -49.26 },
  { id: "cwb-4", lat: -25.435, lng: -49.275 },
  { id: "sp-1", lat: -23.55, lng: -46.63 },
  { id: "sp-2", lat: -23.56, lng: -46.64 },
];

function shuffleDeterministic<T>(items: readonly T[]): T[] {
  // Reversão simples — embaralhamento fixo (sem Math.random) só para provar independência de ordem.
  return [...items].reverse();
}

// 1 — haversine Curitiba↔SP ≈ 339 km (separação folgada acima do limiar de 50 km).
test("haversineKm mede Curitiba↔São Paulo ≈ 339 km", () => {
  const km = haversineKm(CURITIBA, SAO_PAULO);
  assert.ok(Math.abs(km - 339) < 12, `esperado ~339 km, obtido ${km}`);
  assert.equal(haversineKm(CURITIBA, CURITIBA), 0);
});

// 2 — cluster do demo: 4 CWB + 2 SP → 2 clusters, counts [4,2].
test("clusterByProximity separa o demo em 2 clusters de counts 4 e 2", () => {
  const clusters = clusterByProximity(DEMO_POINTS);
  assert.equal(clusters.length, 2);
  const counts = clusters.map((c) => c.count).sort((a, b) => b - a);
  assert.deepEqual(counts, [4, 2]);
});

// 3 — vencedor = cluster de 4 (Curitiba), NÃO o corredor SP-Curitiba inteiro.
test("pickFocusCluster escolhe o cluster de 4 técnicos (Curitiba)", () => {
  const winner = pickFocusCluster(clusterByProximity(DEMO_POINTS));
  assert.ok(winner);
  assert.equal(winner.count, 4);
  // Centroide cai em Curitiba (oeste/sul de SP): lng ≈ -49.27, lat ≈ -25.43.
  assert.ok(Math.abs(winner.centroid.lng - CURITIBA.lng) < 0.05);
  assert.ok(Math.abs(winner.centroid.lat - CURITIBA.lat) < 0.05);
  // Todos os pontos do vencedor são os de Curitiba (ids cwb-*).
  assert.deepEqual([...winner.pointIds].sort(), ["cwb-1", "cwb-2", "cwb-3", "cwb-4"]);
});

// 4 — determinismo: mesma entrada embaralhada → mesmos clusters e mesmo vencedor.
test("clusterByProximity/pickFocusCluster são determinísticos (independem da ordem de entrada)", () => {
  const a = clusterByProximity(DEMO_POINTS);
  const b = clusterByProximity(shuffleDeterministic(DEMO_POINTS));
  const countsA = a.map((c) => c.count).sort((x, y) => x - y);
  const countsB = b.map((c) => c.count).sort((x, y) => x - y);
  assert.deepEqual(countsA, countsB);

  const winnerA = pickFocusCluster(a);
  const winnerB = pickFocusCluster(b);
  assert.deepEqual([...winnerA!.pointIds].sort(), [...winnerB!.pointIds].sort());
  assert.deepEqual(winnerA!.centroid, winnerB!.centroid);
});

// 5 — limiar de 50 km: dois pontos a ~45 km unem; a ~55 km separam.
test("limiar de 50 km: ~45 km une, ~55 km separa", () => {
  assert.equal(FOCUS_CITY_CLUSTER_THRESHOLD_KM, 50);
  const base: GeoPoint = { id: "a", lat: -25.0, lng: -49.0 };
  // 1° de latitude ≈ 111.19 km → 45 km ≈ 0.4047°, 55 km ≈ 0.4946°.
  const near: GeoPoint = { id: "b", lat: -25.0 + 45 / 111.19, lng: -49.0 };
  const far: GeoPoint = { id: "b", lat: -25.0 + 55 / 111.19, lng: -49.0 };
  assert.ok(Math.abs(haversineKm(base, near) - 45) < 1);
  assert.ok(Math.abs(haversineKm(base, far) - 55) < 1);
  assert.equal(clusterByProximity([base, near]).length, 1);
  assert.equal(clusterByProximity([base, far]).length, 2);
});

// 6 — empate 2×2 → desempate proxy (oeste-primeiro) escolhe Curitiba (menor longitude), estável.
test("empate no máximo → desempate proxy oeste-primeiro (menor longitude) é estável", () => {
  const tied: GeoPoint[] = [
    { id: "cwb-1", lat: -25.43, lng: -49.27 },
    { id: "cwb-2", lat: -25.44, lng: -49.28 },
    { id: "sp-1", lat: -23.55, lng: -46.63 },
    { id: "sp-2", lat: -23.56, lng: -46.64 },
  ];
  const clusters = clusterByProximity(tied);
  assert.deepEqual(clusters.map((c) => c.count).sort(), [2, 2]);
  const winner = pickFocusCluster(clusters);
  // Curitiba é mais a oeste (lng ≈ -49.27 < -46.63) → vence o desempate proxy.
  assert.ok(winner!.centroid.lng < -48);
  // Estabilidade: idem com entrada embaralhada.
  const winner2 = pickFocusCluster(clusterByProximity(shuffleDeterministic(tied)));
  assert.deepEqual([...winner!.pointIds].sort(), [...winner2!.pointIds].sort());
  // westFirstTieBreak é o comparador direto: a (oeste) vence b.
  assert.ok(westFirstTieBreak({ lat: -25.4, lng: -49.2 }, { lat: -23.5, lng: -46.6 }) < 0);
});

// 7 — 1 ponto → 1 cluster de count 1 (câmera usa center+zoom, não fitBounds).
test("ponto único → 1 cluster de count 1", () => {
  const clusters = clusterByProximity([{ id: "solo", lat: -25.43, lng: -49.27 }]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.count, 1);
  const winner = pickFocusCluster(clusters);
  assert.equal(winner!.count, 1);
  assert.deepEqual(winner!.centroid, { lat: -25.43, lng: -49.27 });
});

// 8 — 0 pontos → sem cluster; pickFocusCluster retorna null (fallback DEFAULT_CENTER no canvas).
test("nenhum ponto → clusters vazio e pickFocusCluster null", () => {
  assert.deepEqual(clusterByProximity([]), []);
  assert.equal(pickFocusCluster([]), null);
  assert.equal(pickFocusCluster(clusterByProximity([])), null);
});

// 9 — coordenada inválida/0,0/NaN é descartada ANTES de clusterizar (nunca "técnico fantasma").
test("coordenadas inválidas (0,0 / NaN / fora de faixa) são descartadas antes do cluster", () => {
  const points: GeoPoint[] = [
    { id: "ok", lat: -25.43, lng: -49.27 },
    { id: "zero", lat: 0, lng: 0 },
    { id: "nan", lat: Number.NaN, lng: -49.0 },
    { id: "range", lat: -200, lng: -49.0 },
  ];
  const clusters = clusterByProximity(points);
  assert.equal(clusters.length, 1);
  assert.deepEqual([...clusters[0]!.pointIds], ["ok"]);
});

// 10 — centroide = média aritmética das coordenadas do grupo.
test("centroidOf calcula a média correta das coordenadas", () => {
  const points: GeoPoint[] = [
    { id: "a", lat: -25.0, lng: -49.0 },
    { id: "b", lat: -25.2, lng: -49.4 },
  ];
  const centroid = centroidOf(points);
  assert.ok(Math.abs(centroid.lat - -25.1) < 1e-9);
  assert.ok(Math.abs(centroid.lng - -49.2) < 1e-9);
  // Via cluster (mesmos 2 pontos, ~30 km apart → 1 cluster) o centroide é idêntico.
  const clusters = clusterByProximity(points);
  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0]!.centroid, centroid);
});
