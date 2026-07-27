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

// F2 (I3 REAL) — completa a vistoria de recepção do processo (dados mínimos + 1 foto do único conjunto exigido)
// para que a guarda RECEPTION→ACTIVE_CUSTODY passe. Conjuntos parametrizados por perfil (aqui = ["FRONT"]).
async function completeInspectionFor(
  service: ReturnType<typeof setup>,
  a: ImpoundActorContext,
  process: { id: string; profileId: string },
): Promise<void> {
  getMemoryImpoundRepositoryForTests().setProfileRequiredSetsForTests(a.tenantId, process.profileId, ["FRONT"]);
  await service.saveInspection(a, process.id, {
    inspected_at: new Date().toISOString(),
    bodywork_state: "Bom",
    paint_state: "Regular",
    tires_state: "Bom",
    internal_objects: "nenhum",
    missing_equipment: "nenhum",
    signature_status: "SIGNED",
  });
  await service.addInspectionPhoto(a, process.id, { set: "FRONT", file_url: "https://patio.example/front.jpg" });
  await service.completeInspection(a, process.id);
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

test("RECEPTION→ACTIVE_CUSTODY: guarda I3 REAL — sem vistoria → 409; flag forjado NÃO burla; vistoria completa → sucede", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  await service.transition(a, process.id, { to: "RECEPTION" });

  // Sem vistoria → bloqueia.
  await assert.rejects(
    () => service.transition(a, process.id, { to: "ACTIVE_CUSTODY" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "reception_inspection_incomplete",
  );
  // F2 — body.inspection_complete FORJADO com vistoria ainda incompleta → AINDA bloqueia (o flag do cliente
  // não vale; a guarda lê o estado REAL da vistoria).
  await assert.rejects(
    () => service.transition(a, process.id, { to: "ACTIVE_CUSTODY", inspection_complete: true }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "reception_inspection_incomplete",
  );

  await completeInspectionFor(service, a, process);
  const active = await service.transition(a, process.id, { to: "ACTIVE_CUSTODY" });
  assert.equal(active.status, "ACTIVE_CUSTODY");
});

test("ACTIVE_CUSTODY⇄JUDICIAL_HOLD: exige reason; ida-e-volta OK", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  // A guarda I3 é de RECEPTION→ACTIVE_CUSTODY; aqui interessa só o par ⇄JUDICIAL_HOLD → posiciona via forceStatus.
  forceStatus(process.id, "ACTIVE_CUSTODY");

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

test("arestas de leilão: PR-12 HABILITOU só a elegibilidade (gate); reciclagem/preparação DEFERIDAS (PR-13); liberação/reparo exigem o release.service (gate)", async () => {
  const service = setup();
  const a = actor();
  const process = await openProcess(service, a);
  forceStatus(process.id, "ACTIVE_CUSTODY");
  // Ω5P PR-12 HABILITOU ACTIVE_CUSTODY→AUCTION_ELIGIBLE (guardAuctionEligible): dirigi-la pelo endpoint genérico (sem
  // o gate resolvido pelo auction.service) → 409 auction_gate_unresolved.
  await assert.rejects(
    () => service.transition(a, process.id, { to: "AUCTION_ELIGIBLE" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "auction_gate_unresolved",
    "AUCTION_ELIGIBLE exige o auction.service (gate)",
  );
  // ACTIVE_CUSTODY→DIRECT_RECYCLING (§§16-18 inservível) segue DEFERIDA (dono = PR-13) → transition_not_enabled_yet.
  await assert.rejects(
    () => service.transition(a, process.id, { to: "DIRECT_RECYCLING" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "transition_not_enabled_yet",
    "ACTIVE_CUSTODY->DIRECT_RECYCLING deve seguir deferida (PR-13)",
  );
  // A partir de AUCTION_ELIGIBLE: →DIRECT_RECYCLING (reciclagem a sucata) e →AUCTION_PREP seguem DEFERIDAS (donas de
  // PR-13; D-Ω5P-AUC / R-omega5p-pr12-ciclo1: a sucata destrói patrimônio de 3º ⇒ só PR-13, gated no edital por rodada).
  forceStatus(process.id, "AUCTION_ELIGIBLE");
  for (const to of ["DIRECT_RECYCLING", "AUCTION_PREP"] as const) {
    await assert.rejects(
      () => service.transition(a, process.id, { to }),
      (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "transition_not_enabled_yet",
      `AUCTION_ELIGIBLE->${to} deve seguir deferida (PR-13)`,
    );
  }
  forceStatus(process.id, "ACTIVE_CUSTODY");
  // Ω5P PR-10a HABILITOU RELEASE_IN_PROGRESS (guarda I5) e Ω5P PR-10b HABILITOU RELEASED_FOR_REPAIR (saída p/ reparo):
  // dirigi-las pelo endpoint genérico (sem o gate resolvido pelo release.service) → 409 release_gate_unresolved.
  for (const to of ["RELEASE_IN_PROGRESS", "RELEASED_FOR_REPAIR"] as const) {
    await assert.rejects(
      () => service.transition(a, process.id, { to }),
      (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "release_gate_unresolved",
      `${to} exige o release.service (gate)`,
    );
  }
  // Salto B (RELEASE_IN_PROGRESS→RELEASED) e RETORNO do reparo (RELEASED_FOR_REPAIR→ACTIVE_CUSTODY) idem: gate.
  forceStatus(process.id, "RELEASE_IN_PROGRESS");
  await assert.rejects(
    () => service.transition(a, process.id, { to: "RELEASED" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "release_gate_unresolved",
    "RELEASED (consumação) exige o release.service (gate)",
  );
  forceStatus(process.id, "RELEASED_FOR_REPAIR");
  await assert.rejects(
    () => service.transition(a, process.id, { to: "ACTIVE_CUSTODY" }),
    (e: unknown) => e instanceof ImpoundError && e.statusCode === 409 && e.reason === "release_gate_unresolved",
    "retorno do reparo exige o release.service (gate)",
  );
});

test("varredura: TODA aresta deferida da tabela → 409 transition_not_enabled_yet (nunca invalid_transition)", async () => {
  const service = setup();
  const a = actor();
  // Ω5P PR-10a SOMOU as 2 arestas do caminho padrão de liberação; Ω5P PR-10b SOMOU as 2 do reparo (saída/retorno).
  // Estas arestas são ENABLED (guarda real): dirigi-las sem o gate do release.service dá release_gate_unresolved
  // (não transition_not_enabled_yet) — por isso saem da varredura de deferidas.
  // Ω5P PR-12 SOMOU SÓ a aresta de ELEGIBILIDADE ao leilão: ENABLED (guarda real) → dirigi-la sem o gate do
  // auction.service dá auction_gate_unresolved (não transition_not_enabled_yet) — por isso sai da varredura. A
  // reciclagem a sucata AUCTION_ELIGIBLE→DIRECT_RECYCLING segue DEFERIDA (PR-13) e permanece na varredura de deferidas.
  const enabled = new Set([
    "IN_REMOVAL->RECEPTION",
    "RECEPTION->ACTIVE_CUSTODY",
    "ACTIVE_CUSTODY->JUDICIAL_HOLD",
    "JUDICIAL_HOLD->ACTIVE_CUSTODY",
    "ACTIVE_CUSTODY->RELEASE_IN_PROGRESS",
    "RELEASE_IN_PROGRESS->RELEASED",
    "ACTIVE_CUSTODY->RELEASED_FOR_REPAIR",
    "RELEASED_FOR_REPAIR->ACTIVE_CUSTODY",
    "ACTIVE_CUSTODY->AUCTION_ELIGIBLE",
  ]);
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
  await completeInspectionFor(service, a, process); // acrescenta PHOTO_SET + INSPECTION na cadeia
  await service.transition(a, process.id, { to: "ACTIVE_CUSTODY" });
  const events = await service.listEvents(a, process.id);
  // seq contíguo por construção (append-only), independentemente dos tipos.
  assert.deepEqual(
    events.map((e) => e.seq),
    events.map((_, index) => index + 1),
  );
  // Exatamente 3 STATUS_CHANGE (abertura + RECEPÇÃO + CUSTÓDIA_ATIVA); a vistoria acrescenta PHOTO_SET+INSPECTION.
  assert.equal(events.filter((e) => e.type === "STATUS_CHANGE").length, 3);
  const verify = await service.verify(a, process.id);
  assert.equal(verify.valid, true);
});
