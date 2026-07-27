import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import {
  IMPOUND_TRANSITIONS,
  isEnabledEdge,
  resolveTransition,
} from "../src/modules/impound/impound.transitions.js";
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

// Ω5P PR-13a — RECICLAGEM (sucata IRREVERSÍVEL, I8) = ATO EXPLÍCITO permissionado/auditado (nunca efeito colateral do
// recordAttempt). Prova (InMemory): 2 strikes edict-backed → reclassify-scrap OK (DIRECT_RECYCLING + frozen_at); 1
// strike → bloqueia; 2 strikes com 1 rodada sem edital → bloqueia; inservível só com classification+reason; sucata
// SEM aresta de circulação (só →CLOSED deferido); cadeia valid após os appends.

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

async function makeActiveCustodyProcess(tenantId: string): Promise<Ctx> {
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
  getMemoryAuctionRepositoryForTests().setAuctionProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30, auctionEligibleDay: 60 });
  return { tenantId, processId: process.id, profileId };
}

async function makeEligibleProcess(tenantId: string): Promise<Ctx> {
  const ctx = await makeActiveCustodyProcess(tenantId);
  await getMemoryImpoundRepositoryForTests().applyTransition({
    tenantId,
    processId: ctx.processId,
    expectedFrom: "ACTIVE_CUSTODY",
    to: "AUCTION_ELIGIBLE",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "ACTIVE_CUSTODY", to: "AUCTION_ELIGIBLE", reason: "auction_eligible" }, occurredAt: new Date(), actorId: undefined },
  });
  return ctx;
}

// Registra um edital COMPLETO (ref + published_at + business_days>=15 — prova de certame REAL) e fecha a rodada deserta.
async function edictBackedStrike(auction: ReturnType<typeof createMemoryAuctionService>, who: AuctionActorContext, processId: string, round: number): Promise<void> {
  await auction.registerEdict(who, processId, { round_number: round, edict_reference: `EDITAL-2026/00${round}`, published_at: new Date().toISOString(), business_days: 15 });
  await auction.recordAttempt(who, processId, { round_number: round });
}

// Registra um edital INCOMPLETO (só referência — sem published_at nem business_days>=15) e fecha a rodada deserta. O
// strike CONTA (o gate do strike exige só a EXISTÊNCIA de um certame designado), mas o edital NÃO embasa a SUCATA.
async function incompleteEdictStrike(auction: ReturnType<typeof createMemoryAuctionService>, who: AuctionActorContext, processId: string, round: number): Promise<void> {
  await auction.registerEdict(who, processId, { round_number: round, edict_reference: `EDITAL-INC/00${round}` });
  await auction.recordAttempt(who, processId, { round_number: round });
}

// ── 2 strikes edict-backed → reclassify-scrap OK → DIRECT_RECYCLING + frozen_at setado ──────────────────────────────
test("2 strikes edict-backed ⇒ reclassify-scrap OK ⇒ DIRECT_RECYCLING + frozen_at setado (T_stop); cadeia valid", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  await edictBackedStrike(auction, who, ctx.processId, 1);
  await edictBackedStrike(auction, who, ctx.processId, 2);

  const before = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(before?.status, "AUCTION_ELIGIBLE");
  assert.equal(before?.frozenAt, undefined, "elegibilidade NÃO congela");

  const view = await auction.reclassifyScrap(who, ctx.processId);
  assert.equal(view.status, "DIRECT_RECYCLING");
  assert.equal(view.strikeCount, 2);

  const after = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(after?.status, "DIRECT_RECYCLING");
  assert.ok(after?.frozenAt instanceof Date, "a reciclagem CONGELA (T_stop §5)");

  // Cadeia valid após AUCTION_LOTTED×2 + AUCTION_CLOSED×2 + STATUS_CHANGE(two_strikes_scrap).
  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, ctx.processId);
  const result = verifyChain({ tenantId, processId: ctx.processId, events: snapshot!.events, head: snapshot!.head, crossAnchors: snapshot!.crossAnchors });
  assert.equal(result.valid, true, `cadeia deve permanecer valid (brokenAt=${result.brokenAt?.reason})`);
  assert.equal(snapshot!.events.filter((e) => e.type === "STATUS_CHANGE" && (e.payload as { reason?: string }).reason === "two_strikes_scrap").length, 1);
});

// ── 1 strike ⇒ 409 scrap_strikes_insufficient (não recicla) ─────────────────────────────────────────────────────────
test("1 strike edict-backed ⇒ reclassify-scrap 409 scrap_strikes_insufficient (processo segue AUCTION_ELIGIBLE)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  await edictBackedStrike(auction, who, ctx.processId, 1);

  await assert.rejects(
    () => auction.reclassifyScrap(who, ctx.processId),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 409 && (error as { reason?: string }).reason === "scrap_strikes_insufficient",
  );
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE", "1 strike NÃO recicla");
  assert.equal(process?.frozenAt, undefined);
});

// ── 2 strikes mas 1 rodada sem edital (projeção mutável) ⇒ 409 scrap_edict_missing_for_round ────────────────────────
test("2 strikes mas o edital da rodada 2 removido (projeção mutável) ⇒ reclassify-scrap 409 scrap_edict_missing_for_round", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  await edictBackedStrike(auction, who, ctx.processId, 1);
  await edictBackedStrike(auction, who, ctx.processId, 2);
  // auction_edicts é MUTÁVEL (a prova vive na cadeia). Remove o edital da rodada 2 ⇒ a reciclagem RE-VERIFICA e barra.
  getMemoryAuctionRepositoryForTests().removeEdictForTests(tenantId, ctx.processId, 2);

  await assert.rejects(
    () => auction.reclassifyScrap(who, ctx.processId),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 409 && (error as { reason?: string }).reason === "scrap_edict_missing_for_round",
  );
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE", "sem os 2 certames REAIS provados, NÃO sucateia");
});

// ── MÉDIO-A: 2 strikes com editais INCOMPLETOS (só referência, sem published_at/business_days>=15) ⇒ NÃO sucateia ─────
test("2 strikes com editais INCOMPLETOS (sem published_at/business_days>=15) ⇒ reclassify-scrap 409 scrap_edict_incomplete_for_round", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // Editais NUS (só referência) — o strike conta, mas a SUCATA exige prova de certame COMPLETO (Lei 14.133).
  await incompleteEdictStrike(auction, who, ctx.processId, 1);
  await incompleteEdictStrike(auction, who, ctx.processId, 2);

  await assert.rejects(
    () => auction.reclassifyScrap(who, ctx.processId),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 409 && (error as { reason?: string }).reason === "scrap_edict_incomplete_for_round",
  );
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE", "edital incompleto NÃO prova certame real ⇒ NÃO sucateia");
});

// ── MÉDIO-A (sequencialidade): strikes em rodadas NÃO sequenciais (1 e 3, pulando 2) ⇒ NÃO sucateia ─────────────────
test("strikes edict-backed nas rodadas 1 e 3 (não sequenciais a partir de 1) ⇒ reclassify-scrap 409 scrap_strikes_insufficient", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  await edictBackedStrike(auction, who, ctx.processId, 1);
  await edictBackedStrike(auction, who, ctx.processId, 3); // pula a rodada 2

  await assert.rejects(
    () => auction.reclassifyScrap(who, ctx.processId),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 409 && (error as { reason?: string }).reason === "scrap_strikes_insufficient",
  );
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE", "sem as rodadas 1 E 2 (sequenciais), NÃO sucateia");
});

// ── MÉDIO-A: edital em ESTADO ERRADO não pode ser registrado (não polui a cadeia) ─────────────────────────────────
test("registerEdict num processo fora de {ACTIVE_CUSTODY, AUCTION_ELIGIBLE} ⇒ 409 auction_edict_wrong_state", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // Recicla (DIRECT_RECYCLING) com 2 strikes edict-backed completos.
  await edictBackedStrike(auction, who, ctx.processId, 1);
  await edictBackedStrike(auction, who, ctx.processId, 2);
  await auction.reclassifyScrap(who, ctx.processId);
  // Agora em DIRECT_RECYCLING: registrar um novo edital é 409 auction_edict_wrong_state (não encadeia AUCTION_LOTTED).
  await assert.rejects(
    () => auction.registerEdict(who, ctx.processId, { round_number: 3, edict_reference: "EDITAL-2026/003" }),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 409 && (error as { reason?: string }).reason === "auction_edict_wrong_state",
  );
});

// ── MÉDIO-A: edict_reference OBRIGATÓRIA no registro (barra o edital vazio/round nu) ───────────────────────────────
test("registerEdict sem edict_reference ⇒ 400 edict_reference_required (barra o edital vazio)", async () => {
  const tenantId = await reset();
  const ctx = await makeEligibleProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  for (const body of [{ round_number: 1 }, { round_number: 1, edict_reference: "   " }]) {
    await assert.rejects(
      () => auction.registerEdict(who, ctx.processId, body),
      (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 400 && (error as { reason?: string }).reason === "edict_reference_required",
    );
  }
});

// ── MÉDIO-B: o INSERVÍVEL também re-verifica a cadeia I2 (cadeia quebrada ⇒ bloqueia a destruição) ─────────────────
test("ACTIVE_CUSTODY→DIRECT_RECYCLING (inservível) com CADEIA QUEBRADA ⇒ 409 auction_chain_broken", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveCustodyProcess(tenantId);
  const repo = getMemoryAuctionRepositoryForTests();
  const impound = getMemoryImpoundRepositoryForTests();
  const { AuctionService } = await import("../src/modules/auction/auction.service.js");
  const { getMemoryNotificationRepositoryForTests } = await import("../src/modules/impound/impound.notifications.service.js");
  const { getMemoryReleaseRepositoryForTests } = await import("../src/modules/release/release.service.js");
  // Serviço com verifyChain port injetado = cadeia INVÁLIDA (o mapeamento flag→reason; a corrupção de bytes é provada
  // em impound-hashchain). A destruição do inservível precisa da prova íntegra tanto quanto a sucata.
  const broken = new AuctionService(
    repo,
    impound,
    (t, p) => repo.getAuctionProfile(t, p),
    (t, p) => getMemoryNotificationRepositoryForTests().listNotifications({ tenantId: t, processId: p }),
    async () => ({ processId: ctx.processId, valid: false, eventCount: 0, headHash: null, brokenAt: { seq: 1, reason: "hash_mismatch" as const }, checkedAt: new Date().toISOString() }),
    (t, p) => getMemoryReleaseRepositoryForTests().hasActiveRelease(t, p),
  );
  await assert.rejects(
    () => broken.reclassifyUnrecoverable(actor(tenantId), ctx.processId, { classification: "UNRECOVERABLE", reason: "Estrutura comprometida" }),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 409 && (error as { reason?: string }).reason === "auction_chain_broken",
  );
  const process = await impound.findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "ACTIVE_CUSTODY", "cadeia quebrada NÃO destrói o bem");
});

// ── reciclagem por INSERVIBILIDADE: só com classification ∈ {SCRAP,UNRECOVERABLE} + reason ──────────────────────────
test("ACTIVE_CUSTODY→DIRECT_RECYCLING (inservível) SÓ com classification recyclável + reason; senão 409 na ordem certa", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveCustodyProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // sem classification → 409 scrap_classification_required (é a 1ª pré-condição).
  await assert.rejects(
    () => auction.reclassifyUnrecoverable(who, ctx.processId, { reason: "Estrutura comprometida" }),
    (error: unknown) => (error as { reason?: string }).reason === "scrap_classification_required",
  );
  // classification=CONSERVED (válida mas NÃO recyclável) → 409 scrap_classification_required.
  await assert.rejects(
    () => auction.reclassifyUnrecoverable(who, ctx.processId, { classification: "CONSERVED", reason: "x" }),
    (error: unknown) => (error as { reason?: string }).reason === "scrap_classification_required",
  );
  // classification=UNRECOVERABLE mas SEM reason → 409 reason_required (2ª pré-condição, ordem preservada).
  await assert.rejects(
    () => auction.reclassifyUnrecoverable(who, ctx.processId, { classification: "UNRECOVERABLE" }),
    (error: unknown) => (error as { reason?: string }).reason === "reason_required",
  );
  // ainda ACTIVE_CUSTODY (nenhuma tentativa reciclou).
  let process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "ACTIVE_CUSTODY");

  // classification=SCRAP + reason → OK → DIRECT_RECYCLING + frozen_at.
  const view = await auction.reclassifyUnrecoverable(who, ctx.processId, { classification: "SCRAP", reason: "Veículo inservível — laudo técnico" });
  assert.equal(view.status, "DIRECT_RECYCLING");
  process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "DIRECT_RECYCLING");
  assert.ok(process?.frozenAt instanceof Date, "inservível CONGELA");

  // §2.8 — o reason (fundamento) NÃO entra na cadeia (só o reason CODIFICADO unrecoverable_direct).
  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId);
  const statusChange = events.find((e) => e.type === "STATUS_CHANGE" && (e.payload as { to?: string }).to === "DIRECT_RECYCLING");
  assert.equal((statusChange!.payload as { reason?: string }).reason, "unrecoverable_direct");
  assert.equal(JSON.stringify(events.map((e) => e.payload)).includes("laudo técnico"), false, "fundamento fora da cadeia");
});

// ── inservível via classificação REGISTRADA no edital (não no body) ─────────────────────────────────────────────────
test("ACTIVE_CUSTODY→DIRECT_RECYCLING aceita classification vinda de um edital REGISTRADO (não só do body)", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveCustodyProcess(tenantId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  // Edital com classification=UNRECOVERABLE registrado (round 1). O corpo do reclassify não traz classification.
  await auction.registerEdict(who, ctx.processId, { round_number: 1, classification: "UNRECOVERABLE", edict_reference: "EDITAL-2026/001" });
  const view = await auction.reclassifyUnrecoverable(who, ctx.processId, { reason: "Inservível conforme classificação do edital" });
  assert.equal(view.status, "DIRECT_RECYCLING");
});

// ── I8 estrutural: DIRECT_RECYCLING não tem aresta habilitada para NENHUM estado circulável (só →CLOSED, deferido) ──
test("I8: DIRECT_RECYCLING sem aresta de circulação (só →CLOSED, DEFERIDA p/ PR-14) — sucata jamais volta a circular", async () => {
  assert.deepEqual([...IMPOUND_TRANSITIONS.DIRECT_RECYCLING], ["CLOSED"], "a ÚNICA aresta legal de DIRECT_RECYCLING é →CLOSED");

  // Nenhuma aresta habilitada saindo de DIRECT_RECYCLING (nem →CLOSED — é DEFERIDA, dona PR-14).
  assert.equal(isEnabledEdge("DIRECT_RECYCLING", "CLOSED"), false);

  // Voltar a qualquer estado CIRCULÁVEL é estruturalmente ilegal (invalid_transition — nem existe na FSM).
  for (const to of ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE", "AUCTION_PREP", "LOTTED", "AUCTIONED", "RELEASE_IN_PROGRESS", "RELEASED", "RELEASED_FOR_REPAIR"] as const) {
    assert.throws(
      () => resolveTransition({ status: "DIRECT_RECYCLING" } as never, to),
      (error: unknown) => (error as { reason?: string }).reason === "invalid_transition",
      `DIRECT_RECYCLING→${to} deve ser invalid_transition`,
    );
  }
  // →CLOSED é legal mas DEFERIDA (encerramento = PR-14): transition_not_enabled_yet (não habilita retorno à circulação).
  assert.throws(
    () => resolveTransition({ status: "DIRECT_RECYCLING" } as never, "CLOSED"),
    (error: unknown) => (error as { reason?: string }).reason === "transition_not_enabled_yet",
  );
});
