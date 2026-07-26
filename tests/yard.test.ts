import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  createMemoryOccupancyService,
  createMemoryYardService,
  resetYardRuntimeForTests,
} from "../src/modules/yard/yard.service.js";
import { YardError, type YardActorContext } from "../src/modules/yard/yard.types.js";

function actor(tenantId = randomUUID()): YardActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["yard:read", "yard:create", "yard:update"],
  };
}

function setup() {
  resetYardRuntimeForTests();
  return { yard: createMemoryYardService(), occupancy: createMemoryOccupancyService() };
}

async function seedSpot(services: ReturnType<typeof setup>, a: YardActorContext, code = "A-01") {
  const yard = await services.yard.create(a, { name: "Pátio Central", address: "Rua X, 100" });
  const area = await services.yard.createArea(a, yard.id, { kind: "block", name: `Quadra ${code}` });
  const spot = await services.yard.createSpot(a, area.id, { code });
  return { yard, area, spot };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

test("cria Pátio com defaults (timezone, active, sem capacityHint)", async () => {
  const services = setup();
  const yard = await services.yard.create(actor(), { name: "Pátio Norte", address: "Av. Central, 42" });
  assert.equal(yard.name, "Pátio Norte");
  assert.equal(yard.address, "Av. Central, 42");
  assert.equal(yard.timezone, "America/Sao_Paulo");
  assert.equal(yard.active, true);
  assert.equal(yard.capacityHint, undefined);
  assert.equal(yard.branchId, undefined);
});

test("Pátio sem name/address → 400", async () => {
  const services = setup();
  const a = actor();
  await assert.rejects(() => services.yard.create(a, { address: "Rua Y" }), (e: unknown) => e instanceof YardError && e.statusCode === 400);
  await assert.rejects(() => services.yard.create(a, { name: "Pátio" }), (e: unknown) => e instanceof YardError && e.statusCode === 400);
});

test("cria e atualiza Pátio (name/active/capacityHint)", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio Sul", address: "Rua Z, 9", capacity_hint: 50 });
  assert.equal(yard.capacityHint, 50);
  const updated = await services.yard.update(a, yard.id, { name: "Pátio Sul II", active: false });
  assert.equal(updated.name, "Pátio Sul II");
  assert.equal(updated.active, false);
});

test("cria Área normalizando kind/vehicleClass e Vaga com status FREE", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  const area = await services.yard.createArea(a, yard.id, { kind: "block", name: "Quadra A", vehicle_class: "heavy", covered: true });
  assert.equal(area.kind, "BLOCK");
  assert.equal(area.vehicleClass, "HEAVY");
  assert.equal(area.covered, true);
  const spot = await services.yard.createSpot(a, area.id, { code: "A-01" });
  assert.equal(spot.status, "FREE");
  assert.equal(spot.currentProcessId, undefined);
  assert.equal(spot.vehicleClass, "ANY");
});

test("Área com kind inválido → 400; Vaga com vehicleClass inválido → 400", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  await assert.rejects(
    () => services.yard.createArea(a, yard.id, { kind: "cell", name: "X" }),
    (e: unknown) => e instanceof YardError && e.statusCode === 400 && e.reason === "invalid_kind",
  );
  const area = await services.yard.createArea(a, yard.id, { kind: "row", name: "Fileira 1" });
  await assert.rejects(
    () => services.yard.createSpot(a, area.id, { code: "R-1", vehicle_class: "truck" }),
    (e: unknown) => e instanceof YardError && e.statusCode === 400 && e.reason === "invalid_vehicle_class",
  );
});

test("Área filha (parent) só pode referenciar área do MESMO pátio", async () => {
  const services = setup();
  const a = actor();
  const yardA = await services.yard.create(a, { name: "A", address: "Rua A" });
  const yardB = await services.yard.create(a, { name: "B", address: "Rua B" });
  const block = await services.yard.createArea(a, yardA.id, { kind: "block", name: "Quadra 1" });
  // filho válido no mesmo pátio
  const corridor = await services.yard.createArea(a, yardA.id, { kind: "corridor", name: "Corredor 1", parent_id: block.id });
  assert.equal(corridor.parentId, block.id);
  // parent de outro pátio → 400
  await assert.rejects(
    () => services.yard.createArea(a, yardB.id, { kind: "corridor", name: "Corredor X", parent_id: block.id }),
    (e: unknown) => e instanceof YardError && e.statusCode === 400 && e.reason === "invalid_parent",
  );
});

test("Área homônima sob o MESMO parent → 409 (natural key soft, cobre o topo parent=NULL)", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  await services.yard.createArea(a, yard.id, { kind: "block", name: "Quadra 1" });
  await assert.rejects(
    () => services.yard.createArea(a, yard.id, { kind: "block", name: "Quadra 1" }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.reason === "duplicate_area",
  );
});

test("Vaga com code duplicado na MESMA área → 409 (unique tenant,area,code)", async () => {
  const services = setup();
  const a = actor();
  const { area } = await seedSpot(services, a, "DUP");
  await assert.rejects(
    () => services.yard.createSpot(a, area.id, { code: "DUP" }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.reason === "duplicate_spot_code",
  );
});

// ── Escopo por tenant ───────────────────────────────────────────────────────

test("Pátio de um tenant é invisível a outro (get → 404)", async () => {
  const services = setup();
  const a = actor();
  const b = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  await assert.rejects(
    () => services.yard.get(b, yard.id),
    (e: unknown) => e instanceof YardError && e.statusCode === 404,
  );
  // criar área sob o pátio de A a partir de B → 404 (pátio não encontrado)
  await assert.rejects(
    () => services.yard.createArea(b, yard.id, { kind: "block", name: "X" }),
    (e: unknown) => e instanceof YardError && e.statusCode === 404,
  );
});

test("yardId malformado → 400 invalid_uuid", async () => {
  const services = setup();
  await assert.rejects(
    () => services.yard.get(actor(), "not-a-uuid"),
    (e: unknown) => e instanceof YardError && e.statusCode === 400 && e.reason === "invalid_uuid",
  );
});

// ── Bloqueio operacional (FREE⇄BLOCKED) ─────────────────────────────────────

test("bloqueio operacional FREE→BLOCKED; OCCUPIED via status é recusado (422)", async () => {
  const services = setup();
  const a = actor();
  const { spot } = await seedSpot(services, a);
  const blocked = await services.yard.updateSpot(a, spot.id, { status: "blocked" });
  assert.equal(blocked.status, "BLOCKED");
  const freed = await services.yard.updateSpot(a, spot.id, { status: "free" });
  assert.equal(freed.status, "FREE");
  await assert.rejects(
    () => services.yard.updateSpot(a, spot.id, { status: "occupied" }),
    (e: unknown) => e instanceof YardError && e.statusCode === 422 && e.reason === "status_not_operational",
  );
});

test("não muda status de vaga OCUPADA via PATCH → 409 spot_occupied", async () => {
  const services = setup();
  const a = actor();
  const { spot } = await seedSpot(services, a);
  await services.occupancy.allocate(a, { spotId: spot.id, processId: randomUUID() });
  await assert.rejects(
    () => services.yard.updateSpot(a, spot.id, { status: "blocked" }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.reason === "spot_occupied",
  );
});

// ── Ocupação I1 (guards) ────────────────────────────────────────────────────

test("I1: allocate FREE→OCCUPIED; re-allocate na mesma vaga → 409 SPOT_NOT_FREE", async () => {
  const services = setup();
  const a = actor();
  const { spot } = await seedSpot(services, a);
  const processId = randomUUID();
  const occupied = await services.occupancy.allocate(a, { spotId: spot.id, processId });
  assert.equal(occupied.status, "OCCUPIED");
  assert.equal(occupied.currentProcessId, processId);
  await assert.rejects(
    () => services.occupancy.allocate(a, { spotId: spot.id, processId: randomUUID() }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.code === "SPOT_NOT_FREE",
  );
});

test("I1b: MESMO processId em outra vaga → 409 PROCESS_ALREADY_PARKED", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  const area = await services.yard.createArea(a, yard.id, { kind: "block", name: "Quadra 1" });
  const s1 = await services.yard.createSpot(a, area.id, { code: "A-01" });
  const s2 = await services.yard.createSpot(a, area.id, { code: "A-02" });
  const processId = randomUUID();
  await services.occupancy.allocate(a, { spotId: s1.id, processId });
  await assert.rejects(
    () => services.occupancy.allocate(a, { spotId: s2.id, processId }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.code === "PROCESS_ALREADY_PARKED",
  );
});

test("I1: vacate → FREE e permite re-alocar; vacate de vaga livre → 409", async () => {
  const services = setup();
  const a = actor();
  const { spot } = await seedSpot(services, a);
  await services.occupancy.allocate(a, { spotId: spot.id, processId: randomUUID() });
  const vacated = await services.occupancy.vacate(a, { spotId: spot.id });
  assert.equal(vacated.status, "FREE");
  assert.equal(vacated.currentProcessId, undefined);
  const reoccupied = await services.occupancy.allocate(a, { spotId: spot.id, processId: randomUUID() });
  assert.equal(reoccupied.status, "OCCUPIED");
  // já foi ocupada de novo → vacate a livre falha (a vaga está OCCUPIED); testa vacate de vaga livre com outra
  const free = await services.yard.createSpot(a, spot.areaId, { code: "FREE-1" });
  await assert.rejects(
    () => services.occupancy.vacate(a, { spotId: free.id }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.code === "SPOT_NOT_OCCUPIED",
  );
});

test("I1: move preserva o processId e nunca deixa 2 vagas com o mesmo processo", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  const area = await services.yard.createArea(a, yard.id, { kind: "block", name: "Quadra 1" });
  const s1 = await services.yard.createSpot(a, area.id, { code: "A-01" });
  const s2 = await services.yard.createSpot(a, area.id, { code: "A-02" });
  const processId = randomUUID();
  await services.occupancy.allocate(a, { spotId: s1.id, processId });
  const moved = await services.occupancy.move(a, { fromSpotId: s1.id, toSpotId: s2.id });
  assert.equal(moved.id, s2.id);
  assert.equal(moved.status, "OCCUPIED");
  assert.equal(moved.currentProcessId, processId);
  const s1After = await services.yard.getSpot(a, s1.id);
  assert.equal(s1After.status, "FREE");
  assert.equal(s1After.currentProcessId, undefined);
  // o processo aparece em EXATAMENTE 1 vaga do pátio
  const spots = await services.yard.getOccupancy(a, yard.id);
  assert.equal(spots.filter((s) => s.currentProcessId === processId).length, 1);
});

test("I1: move para vaga ocupada → 409 SPOT_NOT_FREE; de vaga livre → 409 SPOT_NOT_OCCUPIED; mesma vaga → 400", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  const area = await services.yard.createArea(a, yard.id, { kind: "block", name: "Quadra 1" });
  const s1 = await services.yard.createSpot(a, area.id, { code: "A-01" });
  const s2 = await services.yard.createSpot(a, area.id, { code: "A-02" });
  const s3 = await services.yard.createSpot(a, area.id, { code: "A-03" });
  await services.occupancy.allocate(a, { spotId: s1.id, processId: randomUUID() });
  await services.occupancy.allocate(a, { spotId: s2.id, processId: randomUUID() });
  // destino ocupado
  await assert.rejects(
    () => services.occupancy.move(a, { fromSpotId: s1.id, toSpotId: s2.id }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.code === "SPOT_NOT_FREE",
  );
  // origem livre
  await assert.rejects(
    () => services.occupancy.move(a, { fromSpotId: s3.id, toSpotId: s1.id }),
    (e: unknown) => e instanceof YardError && e.statusCode === 409 && e.code === "SPOT_NOT_OCCUPIED",
  );
  // mesma vaga
  await assert.rejects(
    () => services.occupancy.move(a, { fromSpotId: s1.id, toSpotId: s1.id }),
    (e: unknown) => e instanceof YardError && e.statusCode === 400 && e.reason === "invalid_move",
  );
});

test("mapa de ocupação resume free/occupied/blocked por pátio", async () => {
  const services = setup();
  const a = actor();
  const yard = await services.yard.create(a, { name: "Pátio", address: "Rua X" });
  const area = await services.yard.createArea(a, yard.id, { kind: "block", name: "Quadra 1" });
  const s1 = await services.yard.createSpot(a, area.id, { code: "A-01" });
  await services.yard.createSpot(a, area.id, { code: "A-02" });
  const s3 = await services.yard.createSpot(a, area.id, { code: "A-03" });
  await services.occupancy.allocate(a, { spotId: s1.id, processId: randomUUID() });
  await services.yard.updateSpot(a, s3.id, { status: "blocked" });
  const spots = await services.yard.getOccupancy(a, yard.id);
  assert.equal(spots.length, 3);
  assert.equal(spots.filter((s) => s.status === "FREE").length, 1);
  assert.equal(spots.filter((s) => s.status === "OCCUPIED").length, 1);
  assert.equal(spots.filter((s) => s.status === "BLOCKED").length, 1);
});
