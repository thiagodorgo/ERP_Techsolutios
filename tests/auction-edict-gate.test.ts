import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import {
  getMemoryImpoundRepositoryForTests,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import { resetNotificationRuntimeForTests } from "../src/modules/impound/impound.notifications.service.js";
import { resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";
import {
  createMemoryAuctionService,
  getMemoryAuctionRepositoryForTests,
  resetAuctionRuntimeForTests,
} from "../src/modules/auction/auction.service.js";
import type { AuctionActorContext } from "../src/modules/auction/auction.types.js";

// Ω5P PR-13a — EDICT-GATE (fecha R-omega5p-pr12-ciclo1): um strike DESERTED só conta se houve um certame REAL
// designado (edital registrado) para aquela rodada. Prova (InMemory): sem edital → 409 auction_edict_missing;
// registrar o edital habilita o strike; o edictRef mascarado AMARRA o strike ao seu edital na cadeia (§2.8: o
// edict_reference bruto NUNCA vaza); registro do edital é PURO (não transiciona) e idempotente por round_number.

const MS_PER_DAY = 86_400_000;
type Ctx = { tenantId: string; processId: string; profileId: string };

function actor(tenantId: string): AuctionActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["impound:read", "impound:transition"] };
}

async function reset(): Promise<string> {
  resetImpoundRuntimeForTests();
  resetNotificationRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetAuctionRuntimeForTests();
  return randomUUID();
}

// Processo direto em AUCTION_ELIGIBLE SEM editais (o gate é o objeto do teste). applyTransition bypassa o gate de
// elegibilidade de propósito (setFrozenAt=false — a elegibilidade não congela).
async function makeEligibleProcess(tenantId: string): Promise<Ctx> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: new Date(Date.now() - 90 * MS_PER_DAY),
    actorId: undefined,
  });
  await impound.applyTransition({
    tenantId,
    processId: process.id,
    expectedFrom: "RECEPTION",
    to: "ACTIVE_CUSTODY",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "ACTIVE_CUSTODY", reason: null }, occurredAt: new Date(), actorId: undefined },
  });
  await impound.applyTransition({
    tenantId,
    processId: process.id,
    expectedFrom: "ACTIVE_CUSTODY",
    to: "AUCTION_ELIGIBLE",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "ACTIVE_CUSTODY", to: "AUCTION_ELIGIBLE", reason: "auction_eligible" }, occurredAt: new Date(), actorId: undefined },
  });
  getMemoryAuctionRepositoryForTests().setAuctionProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30, auctionEligibleDay: 60 });
  return { tenantId, processId: process.id, profileId };
}

// ── strike SÓ com edital da rodada; sem edital → 409 auction_edict_missing ─────────────────────────────────────────
test("recordAttempt sem edital da rodada ⇒ 409 auction_edict_missing; com edital ⇒ o strike conta", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // SEM edital da rodada 1 → bloqueado.
  await assert.rejects(
    () => auction.recordAttempt(who, ctx.processId, { round_number: 1 }),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 409 && (error as { reason?: string }).reason === "auction_edict_missing",
  );
  // Nenhum strike/AUCTION_CLOSED foi registrado.
  let view = await auction.get(who, ctx.processId);
  assert.equal(view.strikeCount, 0);
  assert.equal(view.attempts.length, 0);

  // Registra o edital da rodada 1 (ato explícito, impound:transition) → habilita o strike.
  const reg = await auction.registerEdict(who, ctx.processId, { round_number: 1, edict_reference: "EDITAL-2026/001", edict_platform: "Leiloeiro Oficial", business_days: 15 });
  assert.equal(reg.created, true);
  assert.equal(reg.edict.roundNumber, 1);

  const first = await auction.recordAttempt(who, ctx.processId, { round_number: 1 });
  assert.equal(first.created, true);
  assert.equal(first.strikeCount, 1);

  // A rodada 2 SEM edital continua bloqueada (o gate é POR RODADA).
  await assert.rejects(
    () => auction.recordAttempt(who, ctx.processId, { round_number: 2 }),
    (error: unknown) => (error as { reason?: string }).reason === "auction_edict_missing",
  );

  view = await auction.get(who, ctx.processId);
  assert.equal(view.edicts.length, 1, "1 edital designado (rodada 1)");
  assert.equal(view.strikeCount, 1);
});

// ── o edital é PURO (não transiciona) e idempotente por round_number ────────────────────────────────────────────
test("registerEdict é PURO (status inalterado) + idempotente por round_number (2º registro = no-op, sem 2º AUCTION_LOTTED)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  const first = await auction.registerEdict(who, ctx.processId, { round_number: 1, edict_reference: "EDITAL-2026/001" });
  assert.equal(first.created, true);
  let process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE", "registrar o edital NÃO transiciona (appendEvent é PURO)");
  assert.equal(process?.frozenAt, undefined, "registrar o edital NÃO congela");

  const dup = await auction.registerEdict(who, ctx.processId, { round_number: 1, edict_reference: "EDITAL-2026/999" });
  assert.equal(dup.created, false, "2º registro da MESMA rodada = no-op (idempotência)");
  assert.equal(dup.edict.edictReference, "EDITAL-2026/001", "mantém o primeiro edital (não sobrescreve)");

  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId);
  assert.equal(events.filter((e) => e.type === "AUCTION_LOTTED").length, 1, "exatamente 1 AUCTION_LOTTED (a 2ª chamada não encadeia)");
  process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE");
});

// ── o edital AMARRA o strike: edictRef mascarado no payload da cadeia; §2.8 o bruto nunca vaza ─────────────────────
test("edictRef MASCARADO amarra o strike ao edital (AUCTION_LOTTED + AUCTION_CLOSED); §2.8 o edict_reference bruto nunca entra na cadeia", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  await auction.registerEdict(who, ctx.processId, { round_number: 1, edict_reference: "EDITAL-2026/0777", business_days: 15, auctioneer_ref: "Leiloeiro João da Silva CPF 123" });
  await auction.recordAttempt(who, ctx.processId, { round_number: 1, notes: "nota interna sigilosa" });

  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId);
  const lotted = events.find((e) => e.type === "AUCTION_LOTTED");
  const closed = events.find((e) => e.type === "AUCTION_CLOSED");
  assert.ok(lotted && closed);

  const lottedPayload = lotted!.payload as Record<string, unknown>;
  const closedPayload = closed!.payload as Record<string, unknown>;
  // edictRef mascarado = sufixo curto ("…0777").
  assert.equal(lottedPayload.edictRef, "…0777");
  assert.equal(closedPayload.edictRef, "…0777", "o AUCTION_CLOSED amarra o strike ao seu edital");
  assert.equal(lottedPayload.businessDays, 15);
  assert.equal(closedPayload.outcome, "DESERTED");

  // §2.8 — o edict_reference BRUTO, o auctioneer_ref e as notes NUNCA entram na cadeia.
  const serialized = JSON.stringify(events.map((e) => e.payload));
  assert.equal(serialized.includes("EDITAL-2026/0777"), false, "edict_reference bruto fora da cadeia");
  assert.equal(serialized.includes("João da Silva"), false, "auctioneer_ref fora da cadeia");
  assert.equal(serialized.includes("CPF"), false, "sem PII na cadeia");
  assert.equal(serialized.includes("nota interna"), false, "notes fora da cadeia");
});
