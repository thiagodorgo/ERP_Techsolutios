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
import {
  createMemoryImpoundService,
  getMemoryImpoundRepositoryForTests,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import { ImpoundError, type ImpoundActorContext } from "../src/modules/impound/impound.types.js";

function actor(tenantId = randomUUID()): ImpoundActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:create", "impound:update", "impound:transition"],
  };
}

function setup() {
  resetImpoundRuntimeForTests();
  resetYardRuntimeForTests();
  return createMemoryImpoundService(createMemoryOccupancyService());
}

// Cria uma VAGA real (pátio→área→vaga) via o serviço de PR-01, para o assignSpot alocar de verdade.
async function seedSpot(a: ImpoundActorContext, code = "A-01"): Promise<string> {
  const yardService = createMemoryYardService();
  const yard = await yardService.create(a, { name: "Pátio Central", address: "Rua X, 1" });
  const area = await yardService.createArea(a, yard.id, { kind: "block", name: `Quadra ${code}` });
  const spot = await yardService.createSpot(a, area.id, { code });
  return spot.id;
}

// ── CRUD + abertura da cadeia ────────────────────────────────────────────────────────────────────────────────

test("create: processo nasce IN_REMOVAL com evento de abertura (seq=1, head coerente)", async () => {
  const service = setup();
  const a = actor();
  const process = await service.create(a, { profile_id: randomUUID(), origin_authority: "Autoridade Municipal", vehicle_plate: "abc1d23" });
  assert.equal(process.status, "IN_REMOVAL");
  assert.equal(process.vehiclePlate, "ABC1D23"); // normalizado uppercase
  assert.equal(process.custodySeqHead, 1);
  assert.ok(process.custodyHashHead);
  assert.equal(process.enteredAt, undefined);
  const verify = await service.verify(a, process.id);
  assert.equal(verify.valid, true);
});

test("create sem origin_authority → 400 required_field", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { profile_id: randomUUID(), vehicle_plate: "ABC1D23" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 400 && e.reason === "required_field",
  );
});

test("create sem profile_id → 400 (profile NOT NULL)", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { origin_authority: "X", vehicle_plate: "ABC1D23" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 400,
  );
});

test("get/list/update: metadado do bem editável; status NUNCA muda via update", async () => {
  const service = setup();
  const a = actor();
  const process = await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "ABC1D23" });
  const fetched = await service.get(a, process.id);
  assert.equal(fetched.id, process.id);

  const updated = await service.update(a, process.id, { vehicle_brand: "Fiat", vehicle_model: "Uno", legal_basis: "CTB art. 269" });
  assert.equal(updated.vehicleBrand, "Fiat");
  assert.equal(updated.legalBasis, "CTB art. 269");
  assert.equal(updated.status, "IN_REMOVAL"); // update NÃO mexe em status

  const list = await service.list(a, {});
  assert.equal(list.total, 1);
  assert.equal(list.items[0].id, process.id);
});

test("list: filtro por status e por placa; escopo por tenant", async () => {
  const service = setup();
  const a = actor();
  const b = actor();
  const p1 = await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "AAA1A11" });
  await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "BBB2B22" });
  await service.transition(a, p1.id, { to: "RECEPTION" });

  const byStatus = await service.list(a, { status: "RECEPTION" });
  assert.equal(byStatus.total, 1);
  assert.equal(byStatus.items[0].id, p1.id);

  const byPlate = await service.list(a, { plate: "bbb2b22" });
  assert.equal(byPlate.total, 1);

  // Tenant B não enxerga os processos de A.
  const other = await service.list(b, {});
  assert.equal(other.total, 0);
});

// ── D-Ω5P-09 — veículo não identificado (caso de negócio, não erro) ──────────────────────────────────────────

test("unidentified=true + reason (sem placa) → OK", async () => {
  const service = setup();
  const a = actor();
  const process = await service.create(a, {
    profile_id: randomUUID(),
    origin_authority: "X",
    vehicle_unidentified: true,
    unidentified_reason: "Placa e chassi adulterados",
  });
  assert.equal(process.vehicleUnidentified, true);
  assert.equal(process.vehiclePlate, undefined);
});

test("unidentified=true SEM reason → 400 unidentified_reason_required (CHECK identity no app)", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { profile_id: randomUUID(), origin_authority: "X", vehicle_unidentified: true }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 400 && e.reason === "unidentified_reason_required",
  );
});

test("identificado SEM nenhum identificador → 400 vehicle_identifier_required", async () => {
  const service = setup();
  await assert.rejects(
    () => service.create(actor(), { profile_id: randomUUID(), origin_authority: "X" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 400 && e.reason === "vehicle_identifier_required",
  );
});

// ── idempotência OS→custódia (D-Ω5P-RECON-B) ─────────────────────────────────────────────────────────────────

test("2º processo para a MESMA service_order → 409 duplicate_service_order", async () => {
  const service = setup();
  const a = actor();
  const orderId = randomUUID();
  await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "ABC1D23", service_order_id: orderId });
  await assert.rejects(
    () => service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "XYZ9Z99", service_order_id: orderId }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "duplicate_service_order",
  );
});

// ── append-only ──────────────────────────────────────────────────────────────────────────────────────────────

test("append-only: o repositório NÃO expõe update/delete de evento; eventos só crescem", async () => {
  const service = setup();
  const a = actor();
  const process = await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "ABC1D23" });
  await service.transition(a, process.id, { to: "RECEPTION" });
  const repo = getMemoryImpoundRepositoryForTests() as unknown as Record<string, unknown>;
  assert.equal(typeof repo.updateEvent, "undefined");
  assert.equal(typeof repo.deleteEvent, "undefined");
  const events = await service.listEvents(a, process.id);
  assert.equal(events.length, 2);
});

// ── assignSpot: prova a alocação via OccupancyService (PR-01) + SPOT_ASSIGNED ────────────────────────────────

test("assignSpot: aloca a vaga via OccupancyService e emite SPOT_ASSIGNED", async () => {
  const service = setup();
  const a = actor();
  const process = await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "ABC1D23" });

  const spotId = await seedSpot(a);
  const withSpot = await service.assignSpot(a, process.id, { spot_id: spotId });
  assert.equal(withSpot.custodySeqHead, 2); // abertura + SPOT_ASSIGNED

  const events = await service.listEvents(a, process.id);
  assert.equal(events[1].type, "SPOT_ASSIGNED");
  assert.deepEqual(events[1].payload, { spotId });

  const verify = await service.verify(a, process.id);
  assert.equal(verify.valid, true);
});

test("assignSpot: NÃO-amplificador — falha de alocação NÃO deixa evento órfão", async () => {
  const service = setup();
  const a = actor();
  const p1 = await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "AAA1A11" });
  const p2 = await service.create(a, { profile_id: randomUUID(), origin_authority: "X", vehicle_plate: "BBB2B22" });
  const spotId = await seedSpot(a);
  await service.assignSpot(a, p1.id, { spot_id: spotId });
  // A vaga já está ocupada por p1 → allocate para p2 falha ANTES de qualquer append.
  await assert.rejects(() => service.assignSpot(a, p2.id, { spot_id: spotId }), (e: unknown) => e instanceof Error);
  const events = await service.listEvents(a, p2.id);
  assert.equal(events.length, 1); // só a abertura; nenhum SPOT_ASSIGNED órfão
});
