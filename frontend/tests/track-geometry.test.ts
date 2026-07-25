import assert from "node:assert/strict";
import test from "node:test";

import {
  TRACK_LINE_SOURCE_ID,
  TRACK_MARKERS_SOURCE_ID,
  buildTrackLineFeatureCollection,
  buildTrackMarkerFeatureCollection,
  computeTrackBounds,
  orderTrackPoints,
  summarizeTrack,
} from "../src/modules/telemetry/map/trackGeometry";
import type { TrackView } from "../src/modules/telemetry/telemetry.types";

// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — geometria PURA do trajeto de Rastreamento (sem WebGL — molde de
// operations-map-libre.test.ts). Prova: N pontos ordenados → LineString correto [lng,lat]; 0/1 ponto → vazio
// HONESTO (nunca traço fabricado, D-007); ordenação por capturedAt ASC defensiva; bbox; sumário sem coordenada.

function makePoint(overrides: Partial<TrackView> = {}): TrackView {
  return { capturedAt: "2026-07-24T12:00:00.000Z", lat: -23.55, lng: -46.63, accuracyM: 10, ...overrides };
}

test("buildTrackLineFeatureCollection: N pontos → LineString [lng,lat] na ordem capturedAt ASC", () => {
  const fc = buildTrackLineFeatureCollection([
    makePoint({ capturedAt: "2026-07-24T12:00:00Z", lng: -46.63, lat: -23.55 }),
    makePoint({ capturedAt: "2026-07-24T12:05:00Z", lng: -46.62, lat: -23.54 }),
    makePoint({ capturedAt: "2026-07-24T12:10:00Z", lng: -46.61, lat: -23.53 }),
  ]);
  assert.equal(fc.features.length, 1);
  const line = fc.features[0]!;
  assert.equal(line.geometry.type, "LineString");
  assert.deepEqual(line.geometry.coordinates, [
    [-46.63, -23.55],
    [-46.62, -23.54],
    [-46.61, -23.53],
  ]);
});

test("buildTrackLineFeatureCollection: 0 pontos → FeatureCollection VAZIA (empty honesto, sem linha fabricada)", () => {
  const fc = buildTrackLineFeatureCollection([]);
  assert.equal(fc.features.length, 0);
});

test("buildTrackLineFeatureCollection: 1 ponto NÃO vira linha (>=2 exigido) → features vazias", () => {
  const fc = buildTrackLineFeatureCollection([makePoint()]);
  assert.equal(fc.features.length, 0);
});

test("orderTrackPoints: reordena por capturedAt ASC (entrada fora de ordem) e a LineString acompanha", () => {
  const points = [
    makePoint({ capturedAt: "2026-07-24T12:10:00Z", lng: -46.61, lat: -23.53 }),
    makePoint({ capturedAt: "2026-07-24T12:00:00Z", lng: -46.63, lat: -23.55 }),
    makePoint({ capturedAt: "2026-07-24T12:05:00Z", lng: -46.62, lat: -23.54 }),
  ];
  const ordered = orderTrackPoints(points);
  assert.deepEqual(
    ordered.map((p) => p.capturedAt),
    ["2026-07-24T12:00:00Z", "2026-07-24T12:05:00Z", "2026-07-24T12:10:00Z"],
  );
  const line = buildTrackLineFeatureCollection(points).features[0]!;
  assert.deepEqual(line.geometry.coordinates, [
    [-46.63, -23.55],
    [-46.62, -23.54],
    [-46.61, -23.53],
  ]);
});

test("orderTrackPoints: descarta coordenadas fora do globo (nunca desenha ponto impossível)", () => {
  const ordered = orderTrackPoints([
    makePoint({ lat: -23.5, lng: -46.6 }),
    makePoint({ lat: 999, lng: -46.6 }),
    makePoint({ lat: -23.5, lng: 400 }),
  ]);
  assert.equal(ordered.length, 1);
});

test("buildTrackMarkerFeatureCollection: 0→nenhum, 1→só início, >=2→início+fim (coords corretas)", () => {
  assert.equal(buildTrackMarkerFeatureCollection([]).features.length, 0);

  const one = buildTrackMarkerFeatureCollection([makePoint({ lng: -46.63, lat: -23.55 })]);
  assert.equal(one.features.length, 1);
  assert.equal(one.features[0]!.properties.role, "start");
  assert.deepEqual(one.features[0]!.geometry.coordinates, [-46.63, -23.55]);

  const many = buildTrackMarkerFeatureCollection([
    makePoint({ capturedAt: "2026-07-24T12:00:00Z", lng: -46.63, lat: -23.55 }),
    makePoint({ capturedAt: "2026-07-24T12:05:00Z", lng: -46.62, lat: -23.54 }),
    makePoint({ capturedAt: "2026-07-24T12:10:00Z", lng: -46.61, lat: -23.53 }),
  ]);
  assert.deepEqual(
    many.features.map((f) => f.properties.role),
    ["start", "end"],
  );
  assert.deepEqual(many.features[0]!.geometry.coordinates, [-46.63, -23.55]);
  assert.deepEqual(many.features[1]!.geometry.coordinates, [-46.61, -23.53]);
});

test("computeTrackBounds: null com 0 pontos; min/max corretos com N", () => {
  assert.equal(computeTrackBounds([]), null);
  const bounds = computeTrackBounds([
    makePoint({ lng: -46.63, lat: -23.55 }),
    makePoint({ lng: -46.61, lat: -23.53 }),
    makePoint({ lng: -46.62, lat: -23.57 }),
  ]);
  assert.ok(bounds);
  assert.deepEqual(bounds!.min, [-46.63, -23.57]);
  assert.deepEqual(bounds!.max, [-46.61, -23.53]);
});

test("summarizeTrack: conta pontos e média de precisão; null quando nenhum ponto tem accuracy", () => {
  const summary = summarizeTrack([
    makePoint({ accuracyM: 10 }),
    makePoint({ accuracyM: 20 }),
    makePoint({ accuracyM: null }),
  ]);
  assert.equal(summary.count, 3);
  assert.equal(summary.averageAccuracyM, 15);

  const noAccuracy = summarizeTrack([makePoint({ accuracyM: null }), makePoint({ accuracyM: null })]);
  assert.equal(noAccuracy.count, 2);
  assert.equal(noAccuracy.averageAccuracyM, null);

  assert.deepEqual(summarizeTrack([]), { count: 0, averageAccuracyM: null });
});

test("source ids do trajeto são estáveis e distintos", () => {
  assert.equal(TRACK_LINE_SOURCE_ID, "telemetry-track-line");
  assert.equal(TRACK_MARKERS_SOURCE_ID, "telemetry-track-markers");
  assert.notEqual(TRACK_LINE_SOURCE_ID, TRACK_MARKERS_SOURCE_ID);
});
