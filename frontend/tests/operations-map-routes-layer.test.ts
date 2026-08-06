import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkOrderRouteFeatureCollection,
  findAssignedLocation,
  WORK_ORDER_ROUTE_COLOR,
  WORK_ORDER_ROUTE_DASHARRAY,
  WORK_ORDER_ROUTE_OPACITY,
  WORK_ORDER_ROUTE_WIDTH,
  WORK_ORDER_ROUTES_SOURCE_ID,
} from "../src/modules/operations/map/map/routeLines";
import { WORK_ORDER_PRIORITY_HEX } from "../src/modules/operations/map/map/mapMarkers";
import type { FieldLocationItem, OperationsMapWorkOrderPin } from "../src/modules/operations/map/operations-map.types";

// J-MAPAS-10 (D2) — builder PURO das rotas tracejadas técnico→OS. HONESTIDADE (D-007): linha SÓ
// com o par completo (posição real do técnico atribuído + coordenada real da OS); qualquer lado
// ausente → SEM feature (nunca inventa segmento). Estilo verbatim do protótipo.

function makeLocation(overrides: Partial<FieldLocationItem> = {}): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    userId: "user-1",
    displayName: "Camila Nunes",
    status: "in_service",
    latitude: -25.493,
    longitude: -49.245,
    capturedAt: "2026-07-19T12:00:00.000Z",
    isStale: false,
    ...overrides,
  };
}

function makePin(overrides: Partial<OperationsMapWorkOrderPin> = {}): OperationsMapWorkOrderPin {
  return {
    id: "wo-96",
    code: "OS-96",
    title: "Reboque",
    priority: "high",
    status: "in_progress",
    latitude: -25.496,
    longitude: -49.24,
    assignedUserId: "user-1",
    ...overrides,
  };
}

// 1 — par completo → LineString [posição do técnico, coordenada da OS] (ordem [lng,lat]).
test("par completo vira LineString técnico→OS na ordem [lng,lat]", () => {
  const fc = buildWorkOrderRouteFeatureCollection([makePin()], [makeLocation()]);
  assert.equal(fc.type, "FeatureCollection");
  assert.equal(fc.features.length, 1);
  const feature = fc.features[0]!;
  assert.equal(feature.geometry.type, "LineString");
  assert.deepEqual(feature.geometry.coordinates, [
    [-49.245, -25.493], // técnico primeiro
    [-49.24, -25.496], // OS depois
  ]);
  assert.equal(feature.properties.workOrderId, "wo-96");
});

// 2 — lado faltando → SEM feature: sem técnico atribuído; técnico sem posição válida; OS sem coord.
test("lado faltando não gera linha (sem técnico, técnico 0/0 ou OS sem coordenada)", () => {
  // OS sem nenhum técnico atribuído nem despacho apontando para ela.
  const semTecnico = buildWorkOrderRouteFeatureCollection(
    [makePin({ assignedUserId: null, assignedOperatorId: null })],
    [makeLocation()],
  );
  assert.equal(semTecnico.features.length, 0);
  // Técnico atribuído mas com coordenada inválida (0,0).
  const tecnicoInvalido = buildWorkOrderRouteFeatureCollection(
    [makePin()],
    [makeLocation({ latitude: 0, longitude: 0 })],
  );
  assert.equal(tecnicoInvalido.features.length, 0);
  // OS com coordenada inválida.
  const osInvalida = buildWorkOrderRouteFeatureCollection(
    [makePin({ latitude: 200, longitude: -49 })],
    [makeLocation()],
  );
  assert.equal(osInvalida.features.length, 0);
});

// 3 — propriedade de GRUPO para o filtro da legenda (a rota segue o grupo da OS) + cor da prioridade.
test("propriedades: group urg/alta/mb + priorityColor da fonte única (rota segue o grupo da OS)", () => {
  const fc = buildWorkOrderRouteFeatureCollection(
    [
      makePin({ id: "u", priority: "urgent" }),
      makePin({ id: "h", priority: "high" }),
      makePin({ id: "m", priority: "medium" }),
      makePin({ id: "l", priority: "low" }),
    ],
    [makeLocation()],
  );
  const byId = new Map(fc.features.map((f) => [f.properties.workOrderId, f.properties]));
  assert.equal(byId.get("u")!.group, "urg");
  assert.equal(byId.get("h")!.group, "alta");
  assert.equal(byId.get("m")!.group, "mb");
  assert.equal(byId.get("l")!.group, "mb");
  assert.equal(byId.get("u")!.priorityColor, WORK_ORDER_PRIORITY_HEX.urgent);
});

// 4 — estilo VERBATIM do protótipo: #3b82f6, 2.5px, opacidade .8, dash em múltiplos da largura.
test("estilo da rota: cor #3b82f6, largura 2.5, opacidade 0.8, dasharray [2.4, 2.8]", () => {
  assert.equal(WORK_ORDER_ROUTE_COLOR, "#3b82f6");
  assert.equal(WORK_ORDER_ROUTE_WIDTH, 2.5);
  assert.equal(WORK_ORDER_ROUTE_OPACITY, 0.8);
  assert.deepEqual([...WORK_ORDER_ROUTE_DASHARRAY], [2.4, 2.8]);
  assert.equal(WORK_ORDER_ROUTES_SOURCE_ID, "wo-routes");
});

// 5 — findAssignedLocation: assigned ids têm PRIORIDADE sobre o fallback por despacho.
test("findAssignedLocation prioriza assignedOperatorId/assignedUserId sobre o despacho", () => {
  const porAssign = makeLocation({ id: "a", operatorId: "op-X", userId: "user-X", displayName: "Por Assign" });
  const porDespacho = makeLocation({
    id: "b",
    operatorId: "op-Y",
    userId: "user-Y",
    displayName: "Por Despacho",
    currentDispatch: { id: "d", workOrderId: "wo-96", operatorUserId: "user-Y", status: "on_route", createdAt: "2026-07-19T12:00:00.000Z" },
  });
  const match = findAssignedLocation(makePin({ assignedUserId: "user-X" }), [porDespacho, porAssign]);
  assert.equal(match?.id, "a");
  // Sem assigned ids, o fallback por despacho resolve.
  const fallback = findAssignedLocation(makePin({ assignedUserId: null, assignedOperatorId: null }), [porDespacho]);
  assert.equal(fallback?.id, "b");
  // Sem nenhum vínculo → null (nunca inventa).
  assert.equal(findAssignedLocation(makePin({ id: "wo-outra", assignedUserId: null, assignedOperatorId: null }), [porAssign]), null);
});

// 6 — determinismo: mesma entrada → mesma saída (builder puro, sem Date.now).
test("builder é puro/determinístico (duas chamadas idênticas → mesmo GeoJSON)", () => {
  const pins = [makePin({ id: "a" }), makePin({ id: "b", priority: "urgent" })];
  const locations = [makeLocation()];
  assert.deepEqual(
    buildWorkOrderRouteFeatureCollection(pins, locations),
    buildWorkOrderRouteFeatureCollection(pins, locations),
  );
});

// 7 — várias OS atendidas pelo MESMO técnico → uma linha por OS (como o protótipo desenha).
test("uma linha por OS em atendimento (mesmo técnico pode ter várias)", () => {
  const fc = buildWorkOrderRouteFeatureCollection(
    [makePin({ id: "a" }), makePin({ id: "b", latitude: -25.51, longitude: -49.2 })],
    [makeLocation()],
  );
  assert.equal(fc.features.length, 2);
});
