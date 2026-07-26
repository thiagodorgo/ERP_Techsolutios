import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  createMemoryImpoundService,
  getMemoryImpoundRepositoryForTests,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import { ImpoundError, type ImpoundActorContext } from "../src/modules/impound/impound.types.js";

// PR-06 — I3 REAL (F2): a guarda RECEPTION→ACTIVE_CUSTODY lê a VISTORIA de recepção REAL (dados mínimos +
// completed_at + todos os conjuntos obrigatórios do PERFIL com ≥1 foto), NÃO um flag do cliente.

function actor(tenantId = randomUUID()): ImpoundActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:create", "impound:transition", "impound:inspect"],
  };
}

function setup() {
  resetImpoundRuntimeForTests();
  return createMemoryImpoundService();
}

const MINIMUM_DATA = {
  inspected_at: new Date().toISOString(),
  bodywork_state: "Bom",
  paint_state: "Regular",
  tires_state: "Bom",
  internal_objects: "nenhum",
  missing_equipment: "nenhum",
  signature_status: "SIGNED",
};

// Cria o processo, configura os conjuntos obrigatórios do perfil e o leva a RECEPÇÃO.
async function openReception(service: ReturnType<typeof setup>, a: ImpoundActorContext, requiredSets: readonly string[]) {
  const process = await service.create(a, { profile_id: randomUUID(), origin_authority: "Órgão X", vehicle_plate: "ABC1D23" });
  getMemoryImpoundRepositoryForTests().setProfileRequiredSetsForTests(a.tenantId, process.profileId, [...requiredSets]);
  await service.transition(a, process.id, { to: "RECEPTION" });
  return process;
}

async function uploadSets(service: ReturnType<typeof setup>, a: ImpoundActorContext, processId: string, sets: readonly string[]) {
  for (const set of sets) {
    await service.addInspectionPhoto(a, processId, { set, file_url: `https://patio.example/${set}.jpg` });
  }
}

const isIncomplete = (e: unknown): boolean =>
  e instanceof ImpoundError && e.statusCode === 409 && e.reason === "reception_inspection_incomplete";

test("sem vistoria registrada → guarda I3 bloqueia RECEPTION→ACTIVE_CUSTODY (409)", async () => {
  const service = setup();
  const a = actor();
  const process = await openReception(service, a, ["FRONT"]);
  await assert.rejects(() => service.transition(a, process.id, { to: "ACTIVE_CUSTODY" }), isIncomplete);
});

test("vistoria com dados + fotos mas NÃO marcada completa → guarda bloqueia (completed_at ausente)", async () => {
  const service = setup();
  const a = actor();
  const process = await openReception(service, a, ["FRONT"]);
  await service.saveInspection(a, process.id, MINIMUM_DATA);
  await uploadSets(service, a, process.id, ["FRONT"]);
  // NÃO chama completeInspection.
  await assert.rejects(() => service.transition(a, process.id, { to: "ACTIVE_CUSTODY" }), isIncomplete);
});

test("faltando 1 conjunto obrigatório → completeInspection 409 E guarda bloqueia", async () => {
  const service = setup();
  const a = actor();
  const process = await openReception(service, a, ["FRONT", "REAR"]);
  await service.saveInspection(a, process.id, MINIMUM_DATA);
  await uploadSets(service, a, process.id, ["FRONT"]); // falta REAR
  await assert.rejects(() => service.completeInspection(a, process.id), isIncomplete);
  await assert.rejects(() => service.transition(a, process.id, { to: "ACTIVE_CUSTODY" }), isIncomplete);
});

test("faltando 1 dado mínimo (tires_state) → completeInspection 409", async () => {
  const service = setup();
  const a = actor();
  const process = await openReception(service, a, ["FRONT"]);
  const { tires_state: _omit, ...withoutTires } = MINIMUM_DATA;
  void _omit;
  await service.saveInspection(a, process.id, withoutTires);
  await uploadSets(service, a, process.id, ["FRONT"]);
  await assert.rejects(() => service.completeInspection(a, process.id), isIncomplete);
});

test("body.inspection_complete=true FORJADO com vistoria REAL incompleta → AINDA bloqueia (F2)", async () => {
  const service = setup();
  const a = actor();
  const process = await openReception(service, a, ["FRONT", "REAR"]);
  await service.saveInspection(a, process.id, MINIMUM_DATA);
  await uploadSets(service, a, process.id, ["FRONT"]); // incompleta (falta REAR)
  await assert.rejects(
    () => service.transition(a, process.id, { to: "ACTIVE_CUSTODY", inspection_complete: true }),
    isIncomplete,
  );
});

test("vistoria completa → transição OK + INSPECTION CustodyEvent na cadeia", async () => {
  const service = setup();
  const a = actor();
  const process = await openReception(service, a, ["FRONT"]);
  await service.saveInspection(a, process.id, MINIMUM_DATA);
  await uploadSets(service, a, process.id, ["FRONT"]);
  const inspection = await service.completeInspection(a, process.id);
  assert.ok(inspection.completedAt, "completed_at deve ficar marcado");

  const active = await service.transition(a, process.id, { to: "ACTIVE_CUSTODY" });
  assert.equal(active.status, "ACTIVE_CUSTODY");

  const events = await service.listEvents(a, process.id);
  const types = events.map((e) => e.type);
  assert.ok(types.includes("PHOTO_SET"), "deve haver PHOTO_SET encadeado");
  assert.ok(types.includes("INSPECTION"), "deve haver INSPECTION encadeado (marcação de vistoria completa)");
  assert.equal(events.filter((e) => e.type === "STATUS_CHANGE").length, 3); // abertura + RECEPÇÃO + ACTIVE_CUSTODY
  const verify = await service.verify(a, process.id);
  assert.equal(verify.valid, true);
});

test("conjuntos obrigatórios PARAMETRIZADOS por perfil: perfil exigente pede 3 conjuntos, perfil simples pede 1", async () => {
  const service = setup();
  const a = actor();

  // Perfil simples (1 conjunto) — 1 foto basta.
  const simple = await openReception(service, a, ["FRONT"]);
  await service.saveInspection(a, simple.id, MINIMUM_DATA);
  await uploadSets(service, a, simple.id, ["FRONT"]);
  await service.completeInspection(a, simple.id);
  const activeSimple = await service.transition(a, simple.id, { to: "ACTIVE_CUSTODY" });
  assert.equal(activeSimple.status, "ACTIVE_CUSTODY");

  // Perfil exigente (3 conjuntos) — as mesmas 1-2 fotos NÃO bastam; só as 3 completam.
  const strict = await openReception(service, a, ["FRONT", "REAR", "LEFT"]);
  await service.saveInspection(a, strict.id, MINIMUM_DATA);
  await uploadSets(service, a, strict.id, ["FRONT", "REAR"]);
  await assert.rejects(() => service.completeInspection(a, strict.id), isIncomplete);
  await uploadSets(service, a, strict.id, ["LEFT"]);
  await service.completeInspection(a, strict.id);
  const activeStrict = await service.transition(a, strict.id, { to: "ACTIVE_CUSTODY" });
  assert.equal(activeStrict.status, "ACTIVE_CUSTODY");
});
