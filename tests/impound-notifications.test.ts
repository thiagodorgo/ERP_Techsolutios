import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import {
  computeNotificationSchedule,
  isNotificationTrailComplete,
  requiredNotificationKinds,
  type NotificationProfile,
} from "../src/modules/impound/impound.notifications.js";
import {
  createMemoryNotificationService,
  getMemoryNotificationRepositoryForTests,
  resetNotificationRuntimeForTests,
} from "../src/modules/impound/impound.notifications.service.js";
import type { NotificationActorContext, NotificationStatus, ProcessNotification } from "../src/modules/impound/impound.notifications.types.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import type { ProfileScope } from "../src/modules/jurisdiction/jurisdiction.types.js";

const MS_PER_DAY = 86_400_000;

type ProfileShape = { scope: ProfileScope; ownerNotifDays: number; noticeEdictDay: number };

async function setup(): Promise<{ tenantId: string }> {
  resetImpoundRuntimeForTests();
  resetNotificationRuntimeForTests();
  return { tenantId: randomUUID() };
}

// Cria um processo em RECEPÇÃO com entered_at=t0 (via openFromRemovalAtomic — cadeia válida seq 1..2) + injeta o
// perfil (scope + prazos) no repo de notificações de memória.
async function makeProcess(tenantId: string, t0: Date, profile: ProfileShape): Promise<string> {
  const profileId = randomUUID();
  const impound = getMemoryImpoundRepositoryForTests();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: t0,
    actorId: undefined,
  });
  getMemoryNotificationRepositoryForTests().setProfileForTests(tenantId, profileId, profile);
  return process.id;
}

function actor(tenantId: string): NotificationActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["impound:read", "impound:notify"] };
}

function stubNotification(kind: ProcessNotification["kind"], status: NotificationStatus, reason?: string): ProcessNotification {
  const now = new Date();
  return {
    id: randomUUID(),
    tenantId: "t",
    processId: "p",
    kind,
    status,
    dueAt: now,
    reason,
    createdAt: now,
    updatedAt: now,
  };
}

const FEDERAL: NotificationProfile = { ownerNotifDays: 10, noticeEdictDay: 30 };

// ── (i) computeNotificationSchedule — marcos t0-relativos, ordenados; AUCTION_EDICT NÃO agendado ─────────────
test("(i) computeNotificationSchedule: OWNER_INITIAL@t0+ownerNotifDays, COMPLEMENTARY_EDICT@t0+noticeEdictDay, ordenados; AUCTION_EDICT ausente", () => {
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const schedule = computeNotificationSchedule(t0, FEDERAL);
  assert.equal(schedule.length, 2);
  assert.deepEqual(schedule.map((mark) => mark.kind), ["OWNER_INITIAL", "COMPLEMENTARY_EDICT"]);
  assert.equal(schedule[0].dueAt.getTime(), t0.getTime() + 10 * MS_PER_DAY);
  assert.equal(schedule[1].dueAt.getTime(), t0.getTime() + 30 * MS_PER_DAY);
  assert.equal(schedule.some((mark) => mark.kind === "AUCTION_EDICT"), false, "AUCTION_EDICT é relativo à data do leilão (PR-13), não ao t0");
  // Ordenação por due_at: se o edital vence ANTES da inicial, a ordem inverte.
  const flipped = computeNotificationSchedule(t0, { ownerNotifDays: 30, noticeEdictDay: 10 });
  assert.deepEqual(flipped.map((mark) => mark.kind), ["COMPLEMENTARY_EDICT", "OWNER_INITIAL"]);
  assert.deepEqual(requiredNotificationKinds(FEDERAL), ["OWNER_INITIAL", "COMPLEMENTARY_EDICT"]);
});

// ── (ii) DEVIDO no vencimento — now<due_at não cria; now>=due_at cria DUE ─────────────────────────────────────
test("(ii) markDueProcess: now<due_at ⇒ nada; now>=due_at ⇒ cria DUE (na ordem de vencimento)", async () => {
  const { tenantId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, t0, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30 });
  const service = createMemoryNotificationService();

  const r0 = await service.markDueProcess(tenantId, processId, new Date(t0.getTime() + 5 * MS_PER_DAY));
  assert.equal(r0.marked, 0, "antes do 1º vencimento (t0+10d) nada é devido");
  assert.equal((await service.list(actor(tenantId), processId)).length, 0);

  const r1 = await service.markDueProcess(tenantId, processId, new Date(t0.getTime() + 10 * MS_PER_DAY));
  assert.equal(r1.marked, 1);
  const list1 = await service.list(actor(tenantId), processId);
  assert.equal(list1.length, 1);
  assert.equal(list1[0].kind, "OWNER_INITIAL");
  assert.equal(list1[0].status, "DUE");

  const r2 = await service.markDueProcess(tenantId, processId, new Date(t0.getTime() + 35 * MS_PER_DAY));
  assert.equal(r2.marked, 1, "o edital complementar (t0+30d) vira devido");
  assert.equal((await service.list(actor(tenantId), processId)).length, 2);
});

// ── (iii) idempotência — re-run com o mesmo now não dupla ─────────────────────────────────────────────────────
test("(iii) idempotência: re-run mesmo now não dupla (contagem por kind estável)", async () => {
  const { tenantId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const processId = await makeProcess(tenantId, t0, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30 });
  const service = createMemoryNotificationService();
  const now = new Date(t0.getTime() + 40 * MS_PER_DAY);
  const r1 = await service.markDueProcess(tenantId, processId, now);
  const r2 = await service.markDueProcess(tenantId, processId, now);
  const r3 = await service.markDueProcess(tenantId, processId, now);
  assert.equal(r1.marked, 2);
  assert.equal(r2.marked, 0);
  assert.equal(r3.marked, 0);
  const list = await service.list(actor(tenantId), processId);
  assert.equal(list.length, 2);
  assert.equal(list.filter((notification) => notification.kind === "OWNER_INITIAL").length, 1);
  assert.equal(list.filter((notification) => notification.kind === "COMPLEMENTARY_EDICT").length, 1);
});

// ── (iv) fail-closed — scope privado zero; prazo ausente/<=0 pula sem fabricar ───────────────────────────────
test("(iv) fail-closed: PRIVATE_CONTRACT ⇒ 0 marcos (examined=false); prazo <=0 ⇒ pula sem fabricar (errors>0)", async () => {
  const { tenantId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const service = createMemoryNotificationService();

  const priv = await makeProcess(tenantId, t0, { scope: "PRIVATE_CONTRACT", ownerNotifDays: 10, noticeEdictDay: 30 });
  const rp = await service.markDueProcess(tenantId, priv, new Date(t0.getTime() + 100 * MS_PER_DAY));
  assert.equal(rp.examined, false, "privado NÃO roda o rito administrativo do art. 328");
  assert.equal(rp.marked, 0);
  assert.equal((await service.list(actor(tenantId), priv)).length, 0);

  const bad = await makeProcess(tenantId, t0, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 0, noticeEdictDay: 0 });
  const rb = await service.markDueProcess(tenantId, bad, new Date(t0.getTime() + 100 * MS_PER_DAY));
  assert.equal(rb.marked, 0, "prazo <=0 ⇒ marco NÃO agendado (jamais fabrica data)");
  assert.ok(rb.errors >= 2, "fail-closed sinaliza os 2 marcos ausentes");
  assert.equal((await service.list(actor(tenantId), bad)).length, 0);
});

// ── (v) congelamento/suspensão — frozen_at sem novo DUE; JUDICIAL_HOLD suspende; materializados persistem ────
test("(v) congelamento: frozen_at ⇒ sem novo DUE (os já materializados PERSISTEM); JUDICIAL_HOLD suspende", async () => {
  const { tenantId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const service = createMemoryNotificationService();
  const impound = getMemoryImpoundRepositoryForTests();

  // congelamento
  const frozen = await makeProcess(tenantId, t0, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30 });
  await service.markDueProcess(tenantId, frozen, new Date(t0.getTime() + 12 * MS_PER_DAY)); // OWNER_INITIAL devido
  assert.equal((await service.list(actor(tenantId), frozen)).length, 1);
  await impound.applyTransition({
    tenantId,
    processId: frozen,
    expectedFrom: "RECEPTION",
    to: "RELEASED",
    setEnteredAt: false,
    setFrozenAt: true,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "RELEASED", reason: null }, occurredAt: new Date(t0.getTime() + 15 * MS_PER_DAY), actorId: undefined },
  });
  const rf = await service.markDueProcess(tenantId, frozen, new Date(t0.getTime() + 40 * MS_PER_DAY));
  assert.equal(rf.marked, 0, "congelado ⇒ nenhum novo DUE após frozen_at");
  assert.equal((await service.list(actor(tenantId), frozen)).length, 1, "o marco já materializado PERSISTE (append-only)");

  // suspensão judicial
  const hold = await makeProcess(tenantId, t0, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30 });
  await impound.applyTransition({
    tenantId,
    processId: hold,
    expectedFrom: "RECEPTION",
    to: "JUDICIAL_HOLD",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "JUDICIAL_HOLD", reason: "medida judicial" }, occurredAt: new Date(t0.getTime() + 5 * MS_PER_DAY), actorId: undefined },
  });
  const rh = await service.markDueProcess(tenantId, hold, new Date(t0.getTime() + 40 * MS_PER_DAY));
  assert.equal(rh.marked, 0, "JUDICIAL_HOLD suspende o rito (§§14-15)");
  assert.equal((await service.list(actor(tenantId), hold)).length, 0);
});

// ── (vi) ordenação da trilha (list ascende por due_at) ────────────────────────────────────────────────────────
test("(vi) list: trilha ordenada por due_at ascendente", async () => {
  const { tenantId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const service = createMemoryNotificationService();
  const processId = await makeProcess(tenantId, t0, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30 });
  await service.markDueProcess(tenantId, processId, new Date(t0.getTime() + 40 * MS_PER_DAY));
  const list = await service.list(actor(tenantId), processId);
  for (let i = 1; i < list.length; i += 1) {
    assert.ok(list[i - 1].dueAt.getTime() <= list[i].dueAt.getTime(), "due_at não-decrescente");
  }
});

// ── (vii) EMISSÃO — DUE→ISSUED carimba issued_at/channel/recipient_ref; WAIVE com reason; 409 ao reemitir ────
test("(vii) issue/waive: carimba ISSUED (channel/recipient_ref/issued_at); WAIVE com reason; reemitir ⇒ 409; cadeia valid", async () => {
  const { tenantId } = await setup();
  const t0 = new Date("2024-05-01T12:00:00.000Z");
  const service = createMemoryNotificationService();
  const processId = await makeProcess(tenantId, t0, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30 });
  await service.markDueProcess(tenantId, processId, new Date(t0.getTime() + 40 * MS_PER_DAY));
  const [ownerN, edictN] = await service.list(actor(tenantId), processId);

  const issued = await service.issue(actor(tenantId), processId, ownerN.id, {
    channel: "POSTAL",
    recipient_ref: "J. S. (masc.)",
    issued_at: new Date(t0.getTime() + 11 * MS_PER_DAY).toISOString(),
  });
  assert.equal(issued.status, "ISSUED");
  assert.equal(issued.channel, "POSTAL");
  assert.equal(issued.recipientRef, "J. S. (masc.)");
  assert.ok(issued.issuedAt, "issued_at carimbado");

  // reemitir a MESMA ⇒ 409 not_due
  await assert.rejects(
    () => service.issue(actor(tenantId), processId, ownerN.id, { channel: "SNE" }),
    (error: unknown) => (error as { reason?: string }).reason === "not_due",
  );

  // WAIVE com fundamento
  const waived = await service.waive(actor(tenantId), processId, edictN.id, { reason: "Proprietário compareceu e regularizou" });
  assert.equal(waived.status, "WAIVED");
  assert.equal(waived.reason, "Proprietário compareceu e regularizou");
  // WAIVE de novo ⇒ 409
  await assert.rejects(
    () => service.waive(actor(tenantId), processId, edictN.id, { reason: "outra" }),
    (error: unknown) => (error as { reason?: string }).reason === "not_due",
  );
  // WAIVE sem reason ⇒ 422 reason_required
  await assert.rejects(
    () => service.waive(actor(tenantId), processId, edictN.id, {}),
    (error: unknown) => (error as { reason?: string }).reason === "reason_required",
  );
  // notificação inexistente ⇒ 404
  await assert.rejects(
    () => service.issue(actor(tenantId), processId, randomUUID(), { channel: "POSTAL" }),
    (error: unknown) => (error as { reason?: string }).reason === "notification_not_found",
  );

  // cadeia I2: 2 DUE + 1 issued + 1 waived = 4 NOTIFICATION; verifyChain permanece valid.
  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, processId);
  assert.ok(snapshot);
  const result = verifyChain({ tenantId, processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
  assert.equal(result.valid, true);
  assert.equal(snapshot.events.filter((event) => event.type === "NOTIFICATION").length, 4);
});

// ── (viii) isNotificationTrailComplete — true só com kinds exigíveis ISSUED/WAIVED; false com DUE/ausente ────
test("(viii) isNotificationTrailComplete: true só com exigíveis ISSUED/WAIVED(com reason); false com DUE/ausente/WAIVED-sem-reason", () => {
  assert.equal(isNotificationTrailComplete(FEDERAL, []), false, "trilha vazia ⇒ incompleta");
  assert.equal(
    isNotificationTrailComplete(FEDERAL, [stubNotification("OWNER_INITIAL", "DUE"), stubNotification("COMPLEMENTARY_EDICT", "ISSUED")]),
    false,
    "um DUE ⇒ incompleta",
  );
  assert.equal(
    isNotificationTrailComplete(FEDERAL, [stubNotification("OWNER_INITIAL", "ISSUED"), stubNotification("COMPLEMENTARY_EDICT", "ISSUED")]),
    true,
    "ambos ISSUED ⇒ completa",
  );
  assert.equal(
    isNotificationTrailComplete(FEDERAL, [stubNotification("OWNER_INITIAL", "ISSUED"), stubNotification("COMPLEMENTARY_EDICT", "WAIVED", "dispensa fundamentada")]),
    true,
    "ISSUED + WAIVED(com reason) ⇒ completa",
  );
  assert.equal(
    isNotificationTrailComplete(FEDERAL, [stubNotification("OWNER_INITIAL", "ISSUED"), stubNotification("COMPLEMENTARY_EDICT", "WAIVED")]),
    false,
    "WAIVED sem reason ⇒ incompleta",
  );
  assert.equal(
    isNotificationTrailComplete(FEDERAL, [stubNotification("OWNER_INITIAL", "ISSUED")]),
    false,
    "kind exigível ausente ⇒ incompleta",
  );
  // AUCTION_EDICT NÃO é exigível pelo predicado t0-relativo (gate de leilão = PR-13): presença/ausência não afeta.
  assert.equal(
    isNotificationTrailComplete(FEDERAL, [
      stubNotification("OWNER_INITIAL", "ISSUED"),
      stubNotification("COMPLEMENTARY_EDICT", "ISSUED"),
      stubNotification("AUCTION_EDICT", "DUE"),
    ]),
    true,
    "AUCTION_EDICT DUE não bloqueia o predicado t0-relativo de PR-09",
  );
});
