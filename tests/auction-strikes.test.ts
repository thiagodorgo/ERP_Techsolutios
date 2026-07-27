import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
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

// Cria um processo direto em AUCTION_ELIGIBLE (o gate é provado em auction-eligibility; aqui o foco é o recordAttempt).
// A transição direta via applyTransition (setFrozenAt=false — a elegibilidade não congela) bypassa o gate de propósito.
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
  // Ω5P PR-13a — o recordAttempt agora é EDICT-GATED: um strike só conta com o edital da rodada registrado. O setup
  // ADICIONA os editais das rodadas 1 e 2 (AUCTION_LOTTED na cadeia; PURO — não transiciona) — NÃO enfraquece a prova.
  const auctionRepo = getMemoryAuctionRepositoryForTests();
  await auctionRepo.registerEdictAtomic({ tenantId, processId: process.id, roundNumber: 1, edictReference: "EDITAL-2026/001", businessDays: 15, occurredAt: new Date() });
  await auctionRepo.registerEdictAtomic({ tenantId, processId: process.id, roundNumber: 2, edictReference: "EDITAL-2026/002", businessDays: 15, occurredAt: new Date() });
  return { tenantId, processId: process.id, profileId };
}

// ── (3) ledger de strikes: 1 e 2 rodadas desertas contam, MAS o processo SEGUE AUCTION_ELIGIBLE (sucata = PR-13) ────
test("(3) 2 rodadas desertas ⇒ strikeCount=2 mas processo SEGUE AUCTION_ELIGIBLE + frozen_at NULL (a reciclagem a sucata é PR-13)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  const first = await auction.recordAttempt(who, ctx.processId, { round_number: 1 });
  assert.equal(first.created, true);
  assert.equal(first.strikeCount, 1);
  assert.equal(first.reclassified, false);
  assert.equal(first.status, "AUCTION_ELIGIBLE");
  let process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE", "1º strike NÃO recicla");
  assert.equal(process?.frozenAt, undefined, "1º strike NÃO congela");

  const second = await auction.recordAttempt(who, ctx.processId, { round_number: 2 });
  assert.equal(second.created, true);
  assert.equal(second.strikeCount, 2);
  // D-Ω5P-AUC / R-omega5p-pr12-ciclo1: PR-12 SÓ mantém o ledger — NÃO auto-sucateia (a reciclagem destrói patrimônio
  // de 3º ⇒ tolerância-zero; PR-13 a habilita gated no AUCTION_EDICT por rodada).
  assert.equal(second.reclassified, false, "2º strike NÃO auto-reclassifica em PR-12");
  assert.equal(second.status, "AUCTION_ELIGIBLE");
  process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE", "2º strike NÃO sucateia em PR-12");
  assert.equal(process?.frozenAt, undefined, "NÃO congela (a sucata/T_stop é PR-13)");

  const view = await auction.get(who, ctx.processId);
  assert.equal(view.strikeCount, 2);
  assert.equal(view.attempts.length, 2);
  assert.equal(view.maxAttempts, 2, "o ledger mostra 2/2 (o PR-13 age sobre isto), sem transicionar");
  assert.equal(view.status, "AUCTION_ELIGIBLE");
});

// ── (4) idempotência por round_number: mesma rodada 2× ⇒ 1 strike, sem dupla-transição ────────────────────────────
test("(4) idempotência: recordAttempt round_number=1 duas vezes ⇒ 1 strike, sem dupla-conta nem dupla-transição", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  const first = await auction.recordAttempt(who, ctx.processId, { round_number: 1 });
  assert.equal(first.created, true);
  assert.equal(first.strikeCount, 1);

  const dup = await auction.recordAttempt(who, ctx.processId, { round_number: 1 });
  assert.equal(dup.created, false, "2ª gravação da MESMA rodada = no-op (23505 engolido)");
  assert.equal(dup.strikeCount, 1, "não dupla-conta o strike");
  assert.equal(dup.reclassified, false);
  assert.equal(dup.status, "AUCTION_ELIGIBLE", "não dupla-transiciona à reciclagem");

  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE");
  const view = await auction.get(who, ctx.processId);
  assert.equal(view.attempts.length, 1, "exatamente 1 tentativa registrada");
  // Exatamente 1 AUCTION_CLOSED na cadeia (a 2ª chamada NÃO encadeia evento).
  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId);
  assert.equal(events.filter((e) => e.type === "AUCTION_CLOSED").length, 1);
});

// ── (7) verifyChain.valid após strikes (SEM reciclagem no PR-12 — reclassificação a sucata = PR-13); §2.8 do payload AUCTION_CLOSED ─────────────────────────
test("(7) cadeia permanece valid após 2 AUCTION_CLOSED + STATUS_CHANGE de reciclagem; payload §2.8 sem PII", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  await auction.recordAttempt(who, ctx.processId, { round_number: 1, notes: "Rodada 1 deserta (nota interna)" });
  await auction.recordAttempt(who, ctx.processId, { round_number: 2, notes: "Rodada 2 deserta (nota interna)" });

  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, ctx.processId);
  const result = verifyChain({ tenantId, processId: ctx.processId, events: snapshot!.events, head: snapshot!.head, crossAnchors: snapshot!.crossAnchors });
  assert.equal(result.valid, true, `cadeia deve permanecer valid (brokenAt=${result.brokenAt?.reason})`);

  const closed = snapshot!.events.filter((e) => e.type === "AUCTION_CLOSED");
  assert.equal(closed.length, 2, "2 AUCTION_CLOSED na cadeia");
  // PR-12 NÃO encadeia a reciclagem (a sucata é PR-13): nenhum STATUS_CHANGE auction_two_strikes_recycling.
  assert.equal(snapshot!.events.filter((e) => e.type === "STATUS_CHANGE" && (e.payload as { reason?: string }).reason === "auction_two_strikes_recycling").length, 0, "PR-12 NÃO encadeia reciclagem");
  // §2.8: o payload AUCTION_CLOSED carrega SÓ { event, round, outcome, attemptId } — nunca a nota de domínio.
  for (const event of closed) {
    const serialized = JSON.stringify(event.payload);
    assert.equal(serialized.includes("nota interna"), false, "AUCTION_CLOSED payload sem notes/PII");
    assert.equal(serialized.includes("outcome"), true);
  }
});

// ── (gated) Ω5P PR-13a RECICLAGEM + PR-13b máquina de VENDA: todas ENABLED (gated pelo auction.service) ─────────────
test("(gated) reciclagem + máquina de VENDA ENABLED sem gate ⇒ auction_gate_unresolved (13a+13b)", async () => {
  const { resolveTransition } = await import("../src/modules/impound/impound.transitions.js");
  // Ω5P PR-13a — a reciclagem a sucata é ENABLED mas GATED (guardAuctionReclassify): dirigi-la sem o gate resolvido
  // ⇒ auction_gate_unresolved (não mais transition_not_enabled_yet).
  assert.throws(
    () => resolveTransition({ status: "AUCTION_ELIGIBLE" } as never, "DIRECT_RECYCLING"),
    (error: unknown) => (error as { reason?: string }).reason === "auction_gate_unresolved",
  );
  // A reciclagem por inservibilidade (ACTIVE_CUSTODY→DIRECT_RECYCLING) idem: ENABLED gated ⇒ auction_gate_unresolved.
  assert.throws(
    () => resolveTransition({ status: "ACTIVE_CUSTODY" } as never, "DIRECT_RECYCLING"),
    (error: unknown) => (error as { reason?: string }).reason === "auction_gate_unresolved",
  );
  // A ELEGIBILIDADE segue ENABLED (guardAuctionEligible): dirigi-la sem o gate resolvido ⇒ auction_gate_unresolved.
  assert.throws(
    () => resolveTransition({ status: "ACTIVE_CUSTODY" } as never, "AUCTION_ELIGIBLE"),
    (error: unknown) => (error as { reason?: string }).reason === "auction_gate_unresolved",
  );
  // Ω5P PR-13b — a máquina de VENDA (todas as arestas) é ENABLED gated (guardAuction*): sem o gate resolvido ⇒
  // auction_gate_unresolved (não mais transition_not_enabled_yet).
  for (const [from, to] of [
    ["AUCTION_ELIGIBLE", "AUCTION_PREP"],
    ["AUCTION_PREP", "LOTTED"],
    ["LOTTED", "AUCTIONED"],
    ["AUCTIONED", "AUCTION_CLOSED"],
    ["AUCTIONED", "LOTTED"],
    ["LOTTED", "ACTIVE_CUSTODY"],
  ] as const) {
    assert.throws(
      () => resolveTransition({ status: from } as never, to),
      (error: unknown) => (error as { reason?: string }).reason === "auction_gate_unresolved",
      `${from}->${to} ENABLED gated ⇒ auction_gate_unresolved`,
    );
  }
});
