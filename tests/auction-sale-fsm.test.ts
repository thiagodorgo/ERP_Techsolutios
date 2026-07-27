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

// Ω5P PR-13b — máquina de VENDA (InMemory). Prova a FSM da arrematação: AUCTION_ELIGIBLE→AUCTION_PREP→LOTTED→
// AUCTIONED→AUCTION_CLOSED + inadimplência (AUCTIONED→LOTTED, frozen permanece) + reclamado (LOTTED→ACTIVE_CUSTODY).
// Foco: não PREP sem CONSERVED/avaliação; não LOTTED sem edital completo/min_bid; não AUCTIONED sem winner/nota;
// sold<min_bid → 409 sale_below_min_bid; arremate grava SOLD + sold_amount + AUCTION_SOLD (soldAmount STRING na
// cadeia); reclamar APÓS arremate = ilegal pela FSM (invalid_transition); auction:appraise gateia o sigilo (art. 28).

const MS_PER_DAY = 86_400_000;
type Ctx = { tenantId: string; processId: string; profileId: string };

function actor(tenantId: string): AuctionActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["impound:read", "impound:transition", "auction:appraise"] };
}

async function reset(): Promise<string> {
  resetImpoundRuntimeForTests();
  resetNotificationRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetAuctionRuntimeForTests();
  return randomUUID();
}

// Processo direto em AUCTION_ELIGIBLE (bypassa o gate de elegibilidade — a máquina de VENDA é o objeto do teste).
async function makeEligibleProcess(tenantId: string): Promise<Ctx> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: new Date(Date.now() - 120 * MS_PER_DAY),
    actorId: undefined,
  });
  await impound.applyTransition({
    tenantId, processId: process.id, expectedFrom: "RECEPTION", to: "ACTIVE_CUSTODY",
    setEnteredAt: false, setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "ACTIVE_CUSTODY", reason: null }, occurredAt: new Date(), actorId: undefined },
  });
  await impound.applyTransition({
    tenantId, processId: process.id, expectedFrom: "ACTIVE_CUSTODY", to: "AUCTION_ELIGIBLE",
    setEnteredAt: false, setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "ACTIVE_CUSTODY", to: "AUCTION_ELIGIBLE", reason: "auction_eligible" }, occurredAt: new Date(), actorId: undefined },
  });
  getMemoryAuctionRepositoryForTests().setAuctionProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30, auctionEligibleDay: 60 });
  return { tenantId, processId: process.id, profileId };
}

const is409 = (reason: string) => (error: unknown) =>
  (error as { statusCode?: number }).statusCode === 409 && (error as { reason?: string }).reason === reason;

// Leva o processo a LOTTED com edital CONSERVED completo + avaliação/min_bid registrados (round 1).
async function makeLotted(ctx: Ctx, auction = createMemoryAuctionService(), who = actor(ctx.tenantId)): Promise<void> {
  await auction.registerEdict(who, ctx.processId, { round_number: 1, classification: "CONSERVED", edict_reference: "EDITAL-2026/010", edict_platform: "Leiloeiro Oficial", published_at: new Date().toISOString(), business_days: 15 });
  await auction.setAppraisal(who, ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "8000.00" });
  await auction.prepareForAuction(who, ctx.processId, { round_number: 1 });
  await auction.lotForAuction(who, ctx.processId, { round_number: 1 });
}

// ── não PREP sem CONSERVED / sem avaliação ──────────────────────────────────────────────────────────────────────
test("prep exige CONSERVED (registrado no edital) E avaliação>0 (sigilosa art. 28)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // Edital SEM classification CONSERVED (omitida) → prep bloqueia por classificação.
  await auction.registerEdict(who, ctx.processId, { round_number: 1, edict_reference: "EDITAL-2026/010", published_at: new Date().toISOString(), business_days: 15 });
  await assert.rejects(() => auction.prepareForAuction(who, ctx.processId, { round_number: 1 }), is409("prep_classification_not_conserved"));

  // Registra a rodada 2 CONSERVED mas SEM avaliação → prep bloqueia por avaliação.
  await auction.registerEdict(who, ctx.processId, { round_number: 2, classification: "CONSERVED", edict_reference: "EDITAL-2026/011", published_at: new Date().toISOString(), business_days: 15 });
  await assert.rejects(() => auction.prepareForAuction(who, ctx.processId, { round_number: 2 }), is409("prep_appraisal_missing"));

  // Com CONSERVED + avaliação → prep sucede (AUCTION_PREP; NÃO congela).
  await auction.setAppraisal(who, ctx.processId, { round_number: 2, appraisal_amount: "5000.00", min_bid_amount: "4000.00" });
  const view = await auction.prepareForAuction(who, ctx.processId, { round_number: 2 });
  assert.equal(view.status, "AUCTION_PREP");
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.frozenAt, undefined, "o preparo NÃO congela");
});

// ── não LOTTED sem edital completo / min_bid ────────────────────────────────────────────────────────────────────
test("lot exige edital COMPLETO da rodada (>=15 d.u.) E min_bid>0", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // Edital CONSERVED com business_days=10 (< 15) → incompleto. Avaliação presente p/ passar do prep.
  await auction.registerEdict(who, ctx.processId, { round_number: 1, classification: "CONSERVED", edict_reference: "EDITAL-2026/010", published_at: new Date().toISOString(), business_days: 10 });
  await auction.setAppraisal(who, ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "8000.00" });
  await auction.prepareForAuction(who, ctx.processId, { round_number: 1 });
  await assert.rejects(() => auction.lotForAuction(who, ctx.processId, { round_number: 1 }), is409("lot_edict_incomplete"));
});

test("lot exige min_bid>0 (sigiloso art. 28)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  await auction.registerEdict(who, ctx.processId, { round_number: 1, classification: "CONSERVED", edict_reference: "EDITAL-2026/010", published_at: new Date().toISOString(), business_days: 15 });
  // Só avaliação, SEM min_bid → prep passa (avaliação>0) mas lot bloqueia (min_bid ausente).
  await auction.setAppraisal(who, ctx.processId, { round_number: 1, appraisal_amount: "10000.00" });
  await auction.prepareForAuction(who, ctx.processId, { round_number: 1 });
  await assert.rejects(() => auction.lotForAuction(who, ctx.processId, { round_number: 1 }), is409("lot_min_bid_missing"));

  await auction.setAppraisal(who, ctx.processId, { round_number: 1, min_bid_amount: "8000.00" });
  const view = await auction.lotForAuction(who, ctx.processId, { round_number: 1 });
  assert.equal(view.status, "LOTTED");
});

// ── não AUCTIONED sem winner / nota; sold<min → sale_below_min_bid ──────────────────────────────────────────────
test("sale: winner obrigatório, sold>=min_bid, nota obrigatória (3 reasons DISTINTOS)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who);

  // Sem winner → sale_winner_missing.
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 1, sold_amount: "9000.00", sale_note_reference: "NOTA-1" }), is409("sale_winner_missing"));
  // sold_amount abaixo do mínimo (8000) → sale_below_min_bid.
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Arrematante 001", sold_amount: "7999.99", sale_note_reference: "NOTA-1" }), is409("sale_below_min_bid"));
  // Sem nota → sale_note_missing.
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Arrematante 001", sold_amount: "9000.00" }), is409("sale_note_missing"));

  // Nada foi arrematado (ainda LOTTED, sem SOLD).
  const view = await auction.get(who, ctx.processId);
  assert.equal(view.status, "LOTTED");
  assert.equal(view.attempts.filter((a) => a.outcome === "SOLD").length, 0);
});

// ── arremate OK grava SOLD + sold_amount + AUCTION_SOLD na cadeia (soldAmount STRING) + congela ─────────────────
test("arremate OK: LOTTED→AUCTIONED grava SOLD (winner/sold/nota) + AUCTION_SOLD; sold_amount é STRING na cadeia; congela (T_stop)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who);

  const result = await auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Arrematante 001", sold_amount: "9500.00", sale_note_reference: "NOTA-2026/77", notes: "sigiloso" });
  assert.equal(result.created, true);
  assert.equal(result.status, "AUCTIONED");
  assert.equal(result.attempt.outcome, "SOLD");
  assert.equal(result.attempt.soldAmount, "9500.00");
  assert.equal(result.attempt.winnerRef, "Arrematante 001");
  assert.equal(result.attempt.saleNoteReference, "NOTA-2026/77");

  // Congelou (T_stop §5 — arrematação encerra a diária).
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTIONED");
  assert.ok(process?.frozenAt, "o arremate CONGELA (frozen_at setado)");

  // AUCTION_SOLD na cadeia: soldAmount como STRING (canonicalJson exige money string); §2.8: sem winner/nota bruta.
  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId);
  const sold = events.find((e) => e.type === "AUCTION_SOLD");
  assert.ok(sold, "AUCTION_SOLD encadeado");
  const payload = sold!.payload as Record<string, unknown>;
  assert.equal(payload.event, "auction_sold");
  assert.equal(payload.round, 1);
  assert.equal(payload.soldAmount, "9500.00");
  assert.equal(typeof payload.soldAmount, "string", "soldAmount é STRING (canonicalJson)");
  assert.equal(payload.noteRef, "…6/77", "noteRef MASCARADO (§2.8)");
  const serialized = JSON.stringify(events.map((e) => e.payload));
  assert.equal(serialized.includes("Arrematante 001"), false, "winner_ref bruto fora da cadeia (§2.8)");
  assert.equal(serialized.includes("NOTA-2026/77"), false, "sale_note_reference bruto fora da cadeia (§2.8)");
  assert.equal(serialized.includes("sigiloso"), false, "notes fora da cadeia");

  // A cadeia continua íntegra pós-append.
  const snap = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, ctx.processId);
  assert.ok(snap);

  // Idempotência: 2º sale da MESMA rodada = no-op (não re-transiciona, não duplica AUCTION_SOLD).
  const dup = await auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Outro", sold_amount: "20000.00", sale_note_reference: "NOTA-X" });
  assert.equal(dup.created, false);
  assert.equal(dup.attempt.soldAmount, "9500.00", "mantém o primeiro arremate");
  const soldEvents = (await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId)).filter((e) => e.type === "AUCTION_SOLD");
  assert.equal(soldEvents.length, 1, "exatamente 1 AUCTION_SOLD (idempotente)");
});

// ── consumação AUCTIONED→AUCTION_CLOSED ─────────────────────────────────────────────────────────────────────────
test("consumação: AUCTIONED→AUCTION_CLOSED exige pagamento confirmado; sem confirmação → 409 close_payment_unconfirmed", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who);
  await auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Arrematante 001", sold_amount: "9500.00", sale_note_reference: "NOTA-2026/77" });

  await assert.rejects(() => auction.closeAuction(who, ctx.processId, { round_number: 1 }), is409("close_payment_unconfirmed"));
  const view = await auction.closeAuction(who, ctx.processId, { round_number: 1, payment_confirmed: true });
  assert.equal(view.status, "AUCTION_CLOSED");
  const closed = (await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId)).find((e) => e.type === "AUCTION_CLOSED");
  assert.equal((closed!.payload as Record<string, unknown>).outcome, "SOLD");
});

// ── inadimplência AUCTIONED→LOTTED (frozen permanece — PD-Ω5P-AUC-FROZEN) ───────────────────────────────────────
test("inadimplência (art. 42): AUCTIONED→LOTTED registra NO_PAYMENT e MANTÉM o congelamento (não descongela)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who);
  await auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Arrematante 001", sold_amount: "9500.00", sale_note_reference: "NOTA-2026/77" });
  const frozenAfterSale = (await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId))?.frozenAt;
  assert.ok(frozenAfterSale);

  const result = await auction.defaultAuction(who, ctx.processId, { round_number: 2 });
  assert.equal(result.status, "LOTTED");
  assert.equal(result.attempt.outcome, "NO_PAYMENT");
  // MÉDIO-3: a NO_PAYMENT amarra-se à SOLD superada (round 1) → I7 base determinístico p/ o PR-14.
  assert.equal(result.attempt.defaultedSaleRound, 1, "NO_PAYMENT.defaultedSaleRound aponta a rodada SOLD superada");

  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "LOTTED", "reintegra o lote");
  assert.equal(process?.frozenAt?.getTime(), frozenAfterSale?.getTime(), "o congelamento PERMANECE (PD-Ω5P-AUC-FROZEN)");
  // A linha SOLD original permanece imutável (append-only I2): coexiste com a NO_PAYMENT.
  const view = await auction.get(who, ctx.processId);
  assert.equal(view.attempts.filter((a) => a.outcome === "SOLD").length, 1);
  assert.equal(view.attempts.filter((a) => a.outcome === "NO_PAYMENT").length, 1);
});

test("inadimplência sem arremate registrado → 409 default_sale_missing", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who);
  // Força AUCTIONED SEM SOLD (posiciona o status; a guarda re-verifica a ausência de SOLD).
  await getMemoryImpoundRepositoryForTests().applyTransition({
    tenantId, processId: ctx.processId, expectedFrom: "LOTTED", to: "AUCTIONED",
    setEnteredAt: false, setFrozenAt: true,
    event: { type: "AUCTION_SOLD", payload: { event: "auction_sold", round: 1, soldAmount: "0.00", noteRef: null, attemptId: randomUUID() }, occurredAt: new Date(), actorId: undefined },
  });
  await assert.rejects(() => auction.defaultAuction(who, ctx.processId, { round_number: 2 }), is409("default_sale_missing"));
});

// ── reclamado LOTTED→ACTIVE_CUSTODY (reabre a liberação; nunca congelou) ────────────────────────────────────────
test("reclamado (art. 26 §1º): LOTTED→ACTIVE_CUSTODY exige reason e reabre a custódia; nunca congelou", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who);

  // Sem reason → reason_required.
  await assert.rejects(() => auction.reclaim(who, ctx.processId, {}), is409("reason_required"));
  const view = await auction.reclaim(who, ctx.processId, { reason: "Proprietário reclamou o veículo antes do certame" });
  assert.equal(view.status, "ACTIVE_CUSTODY");
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.frozenAt, undefined, "reclamar antes da venda NÃO congela (nunca congelou)");
  // §2.8: o fundamento livre NÃO entra na cadeia (só o reason CODIFICADO reclaimed_before_sale).
  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId);
  const reclaim = events.find((e) => (e.payload as Record<string, unknown>).reason === "reclaimed_before_sale");
  assert.ok(reclaim, "STATUS_CHANGE reclaimed_before_sale na cadeia");
  assert.equal(JSON.stringify(events.map((e) => e.payload)).includes("reclamou o veículo"), false, "fundamento livre fora da cadeia");
});

// ── reclamar APÓS o arremate = ILEGAL pela FSM (invalid_transition) ─────────────────────────────────────────────
test("reclamar APÓS o arremate (AUCTIONED) é ILEGAL pela FSM → 409 invalid_transition (não há aresta AUCTIONED→ACTIVE_CUSTODY)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who);
  await auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Arrematante 001", sold_amount: "9500.00", sale_note_reference: "NOTA-2026/77" });

  // Já AUCTIONED: reclaim → AUCTIONED→ACTIVE_CUSTODY não existe em IMPOUND_TRANSITIONS → invalid_transition (mesmo com reason).
  await assert.rejects(
    () => auction.reclaim(who, ctx.processId, { reason: "tentativa de reclamar tarde demais" }),
    (error: unknown) => (error as { statusCode?: number }).statusCode === 409 && (error as { reason?: string }).reason === "invalid_transition",
  );
});

// ── setAppraisal exige o edital registrado (404) ────────────────────────────────────────────────────────────────
test("setAppraisal exige o edital da rodada registrado (404 auction_edict_not_found)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await assert.rejects(
    () => auction.setAppraisal(who, ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "8000.00" }),
    (error: unknown) => (error as { statusCode?: number }).statusCode === 404 && (error as { reason?: string }).reason === "auction_edict_not_found",
  );
});

// ── CRÍTICO-1 (junta): a venda amarra-se à rodada LOTADA — não à rodada do body ─────────────────────────────────
// PROBE-1/PROBE-5 do crítico: lotar a rodada 1 (reserva 8000, CONSERVED, completa) e tentar VENDER como OUTRA rodada
// (não-lotada / SCRAP / com reserva rebaixada) tem de BLOQUEAR — senão sold_amount (base do I7) sairia forjado.
test("CRÍTICO-1: vender uma rodada NÃO-LOTADA (rebaixar reserva / SCRAP) → 409 sale_round_not_lotted (PROBE-1/5)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // Prepara uma rodada 2 "isca" (edital incompleto business_days=1, reserva 100) + uma rodada 9 SCRAP, ANTES do lote
  // (a reserva congela no lote — MÉDIO-2). Só a rodada 1 será LOTADA.
  await auction.registerEdict(who, ctx.processId, { round_number: 2, classification: "CONSERVED", edict_reference: "EDITAL-ISCA", published_at: new Date().toISOString(), business_days: 1 });
  await auction.setAppraisal(who, ctx.processId, { round_number: 2, appraisal_amount: "200.00", min_bid_amount: "100.00" });
  await auction.registerEdict(who, ctx.processId, { round_number: 9, classification: "SCRAP", edict_reference: "EDITAL-SUCATA", published_at: new Date().toISOString(), business_days: 15 });
  await makeLotted(ctx, auction, who); // lota a rodada 1 (reserva 8000)

  // PROBE-1: vender como rodada 2 (reserva 100) a 100 → BLOQUEADO (rodada 2 não é a LOTADA).
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 2, winner_ref: "X", sold_amount: "100.00", sale_note_reference: "N" }), is409("sale_round_not_lotted"));
  // PROBE-5: vender como rodada 9 SCRAP a 50 → BLOQUEADO (um bem-SUCATA jamais é vendido; a rodada não é a LOTADA).
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 9, winner_ref: "X", sold_amount: "50.00", sale_note_reference: "N" }), is409("sale_round_not_lotted"));

  // A rodada LOTADA (1) a >= a reserva REAL (8000) vende OK.
  const ok = await auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "Arrematante 001", sold_amount: "9000.00", sale_note_reference: "NOTA" });
  assert.equal(ok.attempt.outcome, "SOLD");
  assert.equal(ok.attempt.soldAmount, "9000.00");
});

// A re-verificação sob o lock pega adulteração da projeção PÓS-lote (CONSERVED / completude do edital da rodada vendida).
test("CRÍTICO-1: adulterar o edital LOTADO pós-lote → recordSale re-verifica (sale_round_not_conserved / sale_round_edict_incomplete)", async () => {
  const tenantId = await reset();
  const repo = getMemoryAuctionRepositoryForTests();
  const auction = createMemoryAuctionService();

  // (a) rebaixar a classificação da rodada lotada p/ SCRAP após o lote → a venda re-verifica e bloqueia.
  let ctx = await makeEligibleProcess(tenantId);
  let who = actor(tenantId);
  await makeLotted(ctx, auction, who);
  repo.mutateEdictForTests(tenantId, ctx.processId, 1, { classification: "SCRAP" });
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "X", sold_amount: "9000.00", sale_note_reference: "N" }), is409("sale_round_not_conserved"));

  // (b) tornar o edital da rodada lotada incompleto (business_days < 15) após o lote → a venda re-verifica e bloqueia.
  const tenant2 = await reset();
  ctx = await makeEligibleProcess(tenant2);
  who = actor(tenant2);
  await makeLotted(ctx, auction, who);
  getMemoryAuctionRepositoryForTests().mutateEdictForTests(tenant2, ctx.processId, 1, { businessDays: 1 });
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "X", sold_amount: "9000.00", sale_note_reference: "N" }), is409("sale_round_edict_incomplete"));
});

// ── MÉDIO-2 (junta): a reserva CONGELA no lote — setAppraisal em LOTTED é bloqueado ──────────────────────────────
test("MÉDIO-2: setAppraisal em LOTTED → 409 appraisal_locked_after_lot (não rebaixa a reserva pós-lote)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);
  await makeLotted(ctx, auction, who); // process = LOTTED (reserva 8000 congelada)

  await assert.rejects(
    () => auction.setAppraisal(who, ctx.processId, { round_number: 1, min_bid_amount: "1.00" }),
    is409("appraisal_locked_after_lot"),
  );
  // A reserva permanece 8000: vender a 1.00 continua bloqueado (sold < min_bid).
  await assert.rejects(() => auction.recordSale(who, ctx.processId, { round_number: 1, winner_ref: "X", sold_amount: "1.00", sale_note_reference: "N" }), is409("sale_below_min_bid"));
});
