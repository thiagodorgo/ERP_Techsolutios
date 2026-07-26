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
import { IMPOUND_TRANSITIONS } from "../src/modules/impound/impound.transitions.js";
import { IMPOUND_STATUSES, ImpoundError, type ImpoundActorContext, type ImpoundStatus } from "../src/modules/impound/impound.types.js";

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
  return createMemoryImpoundService();
}

async function openProcess(service: ReturnType<typeof setup>, a: ImpoundActorContext) {
  return service.create(a, { profile_id: randomUUID(), origin_authority: "Órgão X", vehicle_plate: "ABC1D23" });
}

// Move o processo (no store InMemory) para um `status` alvo SEM passar pela FSM (para exercitar arestas cuja
// origem é interna). Só ajusta o campo status do agregado; a cadeia continua íntegra (não removemos eventos).
function forceStatus(processId: string, status: ImpoundStatus): void {
  const repo = getMemoryImpoundRepositoryForTests() as unknown as { processes: Map<string, { status: string }> };
  const process = repo.processes.get(processId);
  if (process) process.status = status;
}

// ── arestas HABILITADAS (custódia-nativas) sucedem e emitem 1 STATUS_CHANGE ──────────────────────────────────

test("IN_REMOVAL→RECEPTION: sucede, seta entered_at (t0) e emite 1 STATUS_CHANGE (seq avança)", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  assert.equal(process.custodySeqHead, 1);

  const reception = await service.transition(a, process.id, { to: "RECEPTION" });
  assert.equal(reception.status, "RECEPTION");
  assert.ok(reception.enteredAt, "IN_REMOVAL→RECEPTION deve setar entered_at (t0 do motor de diárias)");
  assert.equal(reception.custodySeqHead, 2);

  const events = await service.listEvents(a, process.id);
  assert.equal(events.length, 2);
  assert.equal(events[1].type, "STATUS_CHANGE");
  assert.deepEqual(events[1].payload, { from: "IN_REMOVAL", to: "RECEPTION", reason: null });
});

test("RECEPTION→ACTIVE_CUSTODY: guarda I3 — sem inspection_complete → 409; com marcador → sucede", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  await service.transition(a, process.id, { to: "RECEPTION" });

  await assert.rejects(
    () => service.transition(a, process.id, { to: "ACTIVE_CUSTODY" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "reception_inspection_incomplete",
  );

  const active = await service.transition(a, process.id, { to: "ACTIVE_CUSTODY", inspection_complete: true });
  assert.equal(active.status, "ACTIVE_CUSTODY");
});

test("ACTIVE_CUSTODY⇄JUDICIAL_HOLD: exige reason; ida-e-volta OK", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  await service.transition(a, process.id, { to: "RECEPTION" });
  await service.transition(a, process.id, { to: "ACTIVE_CUSTODY", inspection_complete: true });

  await assert.rejects(
    () => service.transition(a, process.id, { to: "JUDICIAL_HOLD" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "reason_required",
  );
  const held = await service.transition(a, process.id, { to: "JUDICIAL_HOLD", reason: "Ordem judicial 123" });
  assert.equal(held.status, "JUDICIAL_HOLD");
  const back = await service.transition(a, process.id, { to: "ACTIVE_CUSTODY", reason: "Levantado o bloqueio" });
  assert.equal(back.status, "ACTIVE_CUSTODY");
});

// ── arestas DEFERIDAS: legais em §4.2, guarda deferida → 409 transition_not_enabled_yet ──────────────────────

test("arestas de release/leilão são DEFERIDAS → 409 transition_not_enabled_yet (reason distinto de invalid)", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  forceStatus(process.id, "ACTIVE_CUSTODY");
  for (const to of ["RELEASE_IN_PROGRESS", "RELEASED_FOR_REPAIR", "AUCTION_ELIGIBLE", "DIRECT_RECYCLING"] as const) {
    await assert.rejects(
      () => service.transition(a, process.id, { to }),
      (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "transition_not_enabled_yet",
      `${to} deve ser deferida`,
    );
  }
});

test("varredura: TODA aresta deferida da tabela → 409 transition_not_enabled_yet (nunca invalid_transition)", async () => {
  const service = setup();
  const a = actor();
  const enabled = new Set(["IN_REMOVAL->RECEPTION", "RECEPTION->ACTIVE_CUSTODY", "ACTIVE_CUSTODY->JUDICIAL_HOLD", "JUDICIAL_HOLD->ACTIVE_CUSTODY"]);
  for (const from of IMPOUND_STATUSES) {
    for (const to of IMPOUND_TRANSITIONS[from]) {
      if (enabled.has(`${from}->${to}`)) continue;
      const process = await openProcess(service, a);
      forceStatus(process.id, from);
      await assert.rejects(
        () => service.transition(a, process.id, { to, reason: "r", inspection_complete: true }),
        (e: unknown) => e instanceof ImpoundError && e.reason === "transition_not_enabled_yet",
        `aresta legal ${from}->${to} deve ser deferida (não invalid)`,
      );
    }
  }
});

// ── arestas ILEGAIS (fora de §4.2) → 409 invalid_transition ──────────────────────────────────────────────────

test("varredura 14×14: TODA aresta FORA de IMPOUND_TRANSITIONS → 409 invalid_transition", async () => {
  const service = setup();
  const a = actor();
  for (const from of IMPOUND_STATUSES) {
    const legal = new Set(IMPOUND_TRANSITIONS[from]);
    for (const to of IMPOUND_STATUSES) {
      if (legal.has(to)) continue; // arestas legais são cobertas nos outros testes
      const process = await openProcess(service, a);
      forceStatus(process.id, from);
      await assert.rejects(
        () => service.transition(a, process.id, { to, reason: "r", inspection_complete: true }),
        (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "invalid_transition",
        `aresta ilegal ${from}->${to} deve ser 409 invalid_transition`,
      );
    }
  }
});

test("from===to → 409 invalid_transition (não há self-loop em §4.2)", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  await assert.rejects(
    () => service.transition(a, process.id, { to: "IN_REMOVAL" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "invalid_transition",
  );
});

test("cada transição emite EXATAMENTE 1 STATUS_CHANGE e avança seq contíguo", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  await service.transition(a, process.id, { to: "RECEPTION" });
  await service.transition(a, process.id, { to: "ACTIVE_CUSTODY", inspection_complete: true });
  const events = await service.listEvents(a, process.id);
  assert.deepEqual(events.map((e) => e.seq), [1, 2, 3]);
  assert.deepEqual(events.map((e) => e.type), ["STATUS_CHANGE", "STATUS_CHANGE", "STATUS_CHANGE"]);
  const verify = await service.verify(a, process.id);
  assert.equal(verify.valid, true);
});
