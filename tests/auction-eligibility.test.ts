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
import {
  getMemoryNotificationRepositoryForTests,
  resetNotificationRuntimeForTests,
} from "../src/modules/impound/impound.notifications.service.js";
import type { NotificationKind } from "../src/modules/impound/impound.notifications.types.js";
import {
  createMemoryReleaseService,
  getMemoryReleaseRepositoryForTests,
  resetReleaseRuntimeForTests,
} from "../src/modules/release/release.service.js";
import {
  AuctionService,
  createMemoryAuctionService,
  getMemoryAuctionRepositoryForTests,
  resetAuctionRuntimeForTests,
} from "../src/modules/auction/auction.service.js";
import type { AuctionActorContext, AuctionProfile } from "../src/modules/auction/auction.types.js";
import type { ProfileScope } from "../src/modules/jurisdiction/jurisdiction.types.js";

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

// Cria um processo em ACTIVE_CUSTODY (openFromRemovalAtomic→RECEPTION [entered_at=t0] + transição direta) e injeta o
// perfil do gate de leilão (scope + prazos). enteredAt controla o PISO de prazo.
async function makeActiveProcess(
  tenantId: string,
  options: { t0: Date; scope?: ProfileScope; ownerNotifDays?: number; noticeEdictDay?: number; auctionEligibleDay?: number },
): Promise<Ctx> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: options.t0,
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
  const profile: AuctionProfile = {
    scope: options.scope ?? "PUBLIC_AGREEMENT",
    ownerNotifDays: options.ownerNotifDays ?? 10,
    noticeEdictDay: options.noticeEdictDay ?? 30,
    auctionEligibleDay: options.auctionEligibleDay ?? 60,
  };
  getMemoryAuctionRepositoryForTests().setAuctionProfileForTests(tenantId, profileId, profile);
  return { tenantId, processId: process.id, profileId };
}

// Marca um marco DEVIDO (DUE) e, se issue=true, o carimba ISSUED — encadeando NOTIFICATION na cadeia (I2). Ambos os
// caminhos são o que a trilha real produz (o sweep marca DUE; o operador emite ISSUED).
async function addNotification(tenantId: string, processId: string, kind: NotificationKind, issue: boolean): Promise<void> {
  const repo = getMemoryNotificationRepositoryForTests();
  const result = await repo.markDue({ tenantId, processId, kind, dueAt: new Date(), occurredAt: new Date() });
  if (issue && result.notification) {
    await repo.issue({ tenantId, processId, notificationId: result.notification.id, channel: "POSTAL", issuedAt: new Date(), occurredAt: new Date() });
  }
}

// Trilha COMPLETA (OWNER_INITIAL + COMPLEMENTARY_EDICT ISSUED) — satisfaz I6 + o PISO OWNER_INITIAL.
async function completeTrail(tenantId: string, processId: string): Promise<void> {
  await addNotification(tenantId, processId, "OWNER_INITIAL", true);
  await addNotification(tenantId, processId, "COMPLEMENTARY_EDICT", true);
}

async function expectReason(promise: Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => (error as { reason?: string }).reason === reason, `expected reason ${reason}`);
}

// ── (1) elegível só com scope-público + D>=max(prazo,60) + trilha + OWNER_INITIAL ISSUED + cadeia + sem-release ────
test("(1) happy path: as 6 pré-condições satisfeitas ⇒ AUCTION_ELIGIBLE, NÃO congela (diárias correm), cadeia valid", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY) });
  await completeTrail(tenantId, ctx.processId);
  const auction = createMemoryAuctionService();
  const who = actor(tenantId);

  const view = await auction.markEligible(who, ctx.processId);
  assert.equal(view.status, "AUCTION_ELIGIBLE");
  assert.equal(view.strikeCount, 0);
  assert.equal(view.maxAttempts, 2);

  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "AUCTION_ELIGIBLE");
  assert.equal(process?.frozenAt, undefined, "elegibilidade NÃO é T_stop — frozen_at permanece nulo (diárias correm)");
  assert.ok(process?.enteredAt, "entered_at (t0) preservado — o motor de diárias segue");

  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, ctx.processId);
  const result = verifyChain({ tenantId, processId: ctx.processId, events: snapshot!.events, head: snapshot!.head, crossAnchors: snapshot!.crossAnchors });
  assert.equal(result.valid, true, `cadeia deve permanecer valid (brokenAt=${result.brokenAt?.reason})`);
  assert.equal(snapshot!.events.filter((e) => e.type === "STATUS_CHANGE" && (e.payload as { reason?: string }).reason === "auction_eligible").length, 1);
});

// ── (2) BLOQUEIA por cada pré-condição faltante — 8 casos, cada 409 distinto (2 casos por PISO) ────────────────────
test("(2a) sem trilha ⇒ auction_notification_trail_incomplete", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY) });
  // scope público + D+60 ok + cadeia ok + sem release; falta SÓ a trilha (nenhuma notificação).
  await expectReason(createMemoryAuctionService().markEligible(actor(tenantId), ctx.processId), "auction_notification_trail_incomplete");
});

test("(2b) OWNER_INITIAL presente mas NÃO emitido (DUE) + trilha completa ⇒ auction_owner_initial_missing (PISO)", async () => {
  const tenantId = await reset();
  // ownerNotifDays=0 ⇒ OWNER_INITIAL NÃO é required (fail-closed do motor); só COMPLEMENTARY_EDICT. Emito o EDICT →
  // trilha "completa" pelo perfil; OWNER_INITIAL existe como DUE (não emitido) → o PISO independente o barra.
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY), ownerNotifDays: 0, noticeEdictDay: 30 });
  await addNotification(tenantId, ctx.processId, "COMPLEMENTARY_EDICT", true);
  await addNotification(tenantId, ctx.processId, "OWNER_INITIAL", false); // DUE, não ISSUED
  await expectReason(createMemoryAuctionService().markEligible(actor(tenantId), ctx.processId), "auction_owner_initial_missing");
});

test("(2c) antes de D+60 (auctionEligibleDay=60) ⇒ auction_deadline_not_reached", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 30 * MS_PER_DAY), auctionEligibleDay: 60 });
  await completeTrail(tenantId, ctx.processId);
  await expectReason(createMemoryAuctionService().markEligible(actor(tenantId), ctx.processId), "auction_deadline_not_reached");
});

test("(2d) auctionEligibleDay=0 zerado ⇒ PISO 60 barra (auction_deadline_not_reached) — fecha o furo do prazo", async () => {
  const tenantId = await reset();
  // t0 = -30d. Sem PISO, auctionEligibleDay=0 ⇒ prazo=0 ⇒ elegível. COM o PISO 60d ⇒ deadline=t0+60d>now ⇒ barrado.
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 30 * MS_PER_DAY), auctionEligibleDay: 0 });
  await completeTrail(tenantId, ctx.processId);
  await expectReason(createMemoryAuctionService().markEligible(actor(tenantId), ctx.processId), "auction_deadline_not_reached");
});

test("(2e) ownerNotifDays=0 zerado + OWNER_INITIAL ausente ⇒ PISO OWNER_INITIAL barra (auction_owner_initial_missing) — fecha o furo do PR-09", async () => {
  const tenantId = await reset();
  // ownerNotifDays=0 remove OWNER_INITIAL de requiredNotificationKinds; emito só o EDICT ⇒ trilha "completa" pelo
  // perfil, MAS o PISO exige OWNER_INITIAL emitido INDEPENDENTE do perfil ⇒ leilão sem notificar o dono é BARRADO.
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY), ownerNotifDays: 0, noticeEdictDay: 30 });
  await addNotification(tenantId, ctx.processId, "COMPLEMENTARY_EDICT", true);
  await expectReason(createMemoryAuctionService().markEligible(actor(tenantId), ctx.processId), "auction_owner_initial_missing");
});

test("(2f) cadeia quebrada ⇒ auction_chain_broken", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY) });
  await completeTrail(tenantId, ctx.processId);
  // Serviço com verifyChain port injetado = cadeia INVÁLIDA (a corrupção real de bytes é provada em impound-hashchain;
  // aqui provamos o MAPEAMENTO flag→reason do gate).
  const repo = getMemoryAuctionRepositoryForTests();
  const impound = getMemoryImpoundRepositoryForTests();
  const broken = new AuctionService(
    repo,
    impound,
    (t, p) => repo.getAuctionProfile(t, p),
    (t, p) => getMemoryNotificationRepositoryForTests().listNotifications({ tenantId: t, processId: p }),
    async () => ({ processId: ctx.processId, valid: false, eventCount: 0, headHash: null, brokenAt: { seq: 1, reason: "hash_mismatch" }, checkedAt: new Date().toISOString() }),
    (t, p) => getMemoryReleaseRepositoryForTests().hasActiveRelease(t, p),
  );
  await expectReason(broken.markEligible(actor(tenantId), ctx.processId), "auction_chain_broken");
});

test("(2g) liberação em curso (dossiê FOR_REPAIR montado, processo ainda ACTIVE_CUSTODY) ⇒ auction_release_in_progress", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY) });
  await completeTrail(tenantId, ctx.processId);
  // O for-repair-montar cria um dossiê IN_PROGRESS SEM transicionar o processo → hasActiveRelease=true com o processo
  // ainda ACTIVE_CUSTODY. O gate re-verifica e barra (invariante: não elegível com liberação em curso).
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, ctx.profileId, []);
  const release = createMemoryReleaseService();
  await release.startForRepair(actor(tenantId), ctx.processId, { repair_deadline: new Date(Date.now() + 30 * MS_PER_DAY).toISOString() });
  await expectReason(createMemoryAuctionService().markEligible(actor(tenantId), ctx.processId), "auction_release_in_progress");
});

test("(2h) scope PRIVATE ⇒ auction_scope_not_public (pátio privado não roda o leilão do art. 328)", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY), scope: "PRIVATE_CONTRACT" });
  await completeTrail(tenantId, ctx.processId);
  await expectReason(createMemoryAuctionService().markEligible(actor(tenantId), ctx.processId), "auction_scope_not_public");
});

// ── cross-tenant / not found ──────────────────────────────────────────────────────────────────────────────────
test("cross-tenant: eligibility em processo de outro tenant ⇒ 404 process_not_found", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 90 * MS_PER_DAY) });
  await completeTrail(tenantId, ctx.processId);
  await expectReason(createMemoryAuctionService().markEligible(actor(randomUUID()), ctx.processId), "process_not_found");
});
