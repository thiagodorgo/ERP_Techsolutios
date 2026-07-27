import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { createMemoryChargeService, getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import {
  createMemoryReleaseService,
  getMemoryReleaseRepositoryForTests,
  resetReleaseRuntimeForTests,
} from "../src/modules/release/release.service.js";
import type { ReleaseActorContext } from "../src/modules/release/release.types.js";
import { getMemoryYardRepositoryForTests } from "../src/modules/yard/yard.service.js";
import type { DailyCap, DailyModel, ProfileScope } from "../src/modules/jurisdiction/jurisdiction.types.js";

const MS_PER_DAY = 86_400_000;

type Ctx = { tenantId: string; processId: string; profileId: string; spotId?: string };

function actor(tenantId: string): ReleaseActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["impound:read", "impound:transition", "release:process", "release:approve", "charging:settle"],
  };
}

async function reset(): Promise<string> {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetReleaseRuntimeForTests();
  return randomUUID();
}

// Cria um processo em ACTIVE_CUSTODY (via openFromRemovalAtomic→RECEPTION + transição direta), injeta o perfil no
// charging (scope/model/cap) e os requisitos de liberação no release. Opcionalmente ocupa uma vaga.
async function makeActiveProcess(
  tenantId: string,
  options: {
    t0: Date;
    scope?: ProfileScope;
    model?: DailyModel;
    cap?: DailyCap;
    requirements?: ReadonlyArray<{ code: string; label: string; required: boolean }>;
    withSpot?: boolean;
  },
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
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, profileId, {
    scope: options.scope ?? "PUBLIC_AGREEMENT",
    model: options.model ?? "ROLLING_24H",
    cap: options.cap ?? "SIX_MONTHS",
    dailyServiceCatalogId: randomUUID(),
  });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, options.requirements ?? []);

  let spotId: string | undefined;
  if (options.withSpot) {
    const yard = getMemoryYardRepositoryForTests();
    const y = await yard.createYard({ tenantId, name: "Pátio Central", address: "Rua X, 1", timezone: "America/Sao_Paulo" });
    const area = await yard.createArea({ tenantId, yardId: y.id, kind: "BLOCK", name: "Q1" });
    const spot = await yard.createSpot({ tenantId, areaId: area.id, code: "S-1" });
    await impound.assignSpotAtomic({ tenantId, processId: process.id, spotId: spot.id, occurredAt: new Date() });
    spotId = spot.id;
  }
  return { tenantId, processId: process.id, profileId, spotId };
}

async function addRemoval(tenantId: string, processId: string, amount = "150.00"): Promise<void> {
  await getMemoryChargeRepositoryForTests().createManualCharge({
    tenantId,
    processId,
    kind: "REMOVAL",
    quantity: "1.00",
    unitAmount: amount,
    totalAmount: amount,
    currency: "BRL",
    occurredAt: new Date(),
  });
}

async function accrueDailies(tenantId: string, processId: string, count: number, unit = "10.00"): Promise<void> {
  const repo = getMemoryChargeRepositoryForTests();
  for (let seq = 1; seq <= count; seq += 1) {
    await repo.accrueDailyCharge({
      tenantId,
      processId,
      periodSeq: seq,
      refDate: `2024-01-${String((seq % 28) + 1).padStart(2, "0")}`,
      unitAmount: unit,
      currency: "BRL",
      occurredAt: new Date(),
    });
  }
}

async function expectReason(promise: Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => (error as { reason?: string }).reason === reason, `expected reason ${reason}`);
}

// ── (i) libera só com TUDO cumprido → RELEASED + RELEASE na cadeia + vaga liberada ────────────────────────────
test("(i) happy path: start→settle→approve→consume ⇒ RELEASED + RELEASE na cadeia + vaga liberada", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, {
    t0: new Date(Date.now() - 2 * MS_PER_DAY),
    requirements: [{ code: "AUTHORITY_RELEASE", label: "Autorização do órgão", required: true }],
    withSpot: true,
  });
  await addRemoval(tenantId, ctx.processId, "150.00");
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  const started = await release.start(who, ctx.processId, { recipient_name: "Fulano de Tal" });
  assert.equal(started.release.status, "IN_PROGRESS");
  assert.equal(started.checks.length, 1);
  // freeze T_stop aplicado:
  const frozen = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.ok(frozen?.frozenAt, "frozen_at set no salto A");

  await release.setRequirement(who, ctx.processId, { code: "AUTHORITY_RELEASE", satisfied: true });
  const settle = await charge.settle(who, ctx.processId, {});
  assert.equal(settle.settledCount, 1);
  assert.equal(settle.settledTotal, "150.00");
  await release.approve(who, ctx.processId, { authority_reference: "OFICIO-2026-0042" });

  const consumed = await release.consume(who, ctx.processId);
  assert.equal(consumed.release.status, "COMPLETED");
  assert.ok(consumed.release.releasedAt, "released_at (comprovante de saída) carimbado");
  assert.equal(consumed.release.settledTotal, "150.00");

  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.status, "RELEASED");
  const events = await getMemoryImpoundRepositoryForTests().listEvents(tenantId, ctx.processId);
  assert.equal(events.filter((event) => event.type === "RELEASE").length, 1, "1 RELEASE na cadeia");
  // §2.8: o payload do RELEASE não carrega o nome do recipiente.
  const releaseEvent = events.find((event) => event.type === "RELEASE");
  assert.equal(JSON.stringify(releaseEvent?.payload).includes("Fulano"), false, "RELEASE payload sem PII do recipiente");
  // vaga liberada:
  const spots = await getMemoryYardRepositoryForTests().listSpotsByYard({ tenantId, yardId: process!.yardId! });
  assert.equal(spots.find((spot) => spot.id === ctx.spotId)?.status, "FREE", "vaga liberada na consumação");
});

// ── (ii) bloqueia por cada precondição faltante (5×409 distinto) + already + freeze retroactive ───────────────
test("(ii) already_in_progress + freeze_retroactive (salto A)", async () => {
  const tenantId = await reset();
  const release = createMemoryReleaseService();
  const who = actor(tenantId);

  // already_in_progress
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  await release.start(who, ctx.processId, {});
  await expectReason(release.start(who, ctx.processId, {}), "release_already_in_progress");

  // freeze_retroactive: DAILYs cujo período termina depois de now (t0 recente + diárias injetadas).
  const ctx2 = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 3600_000) });
  await accrueDailies(tenantId, ctx2.processId, 3);
  await expectReason(release.start(who, ctx2.processId, {}), "release_freeze_retroactive");
});

test("(ii) salto B: 5 reasons DISTINTOS (reconciliation, debts, requirement, authority, recipient)", async () => {
  const tenantId = await reset();
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  // release_reconciliation_pending: over-accrued sem estorno (checado antes de debts).
  const recon = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 40 * MS_PER_DAY), cap: "THIRTY_DAYS_LEGACY" });
  await accrueDailies(tenantId, recon.processId, 35);
  await release.start(who, recon.processId, { recipient_name: "R" });
  await expectReason(release.consume(who, recon.processId), "release_reconciliation_pending");

  // release_debts_unsettled: REMOVAL não quitada, sem diárias (reconciliação vazia = consistente).
  const debts = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  await addRemoval(tenantId, debts.processId);
  await release.start(who, debts.processId, { recipient_name: "R" });
  await expectReason(release.consume(who, debts.processId), "release_debts_unsettled");

  // release_requirement_unmet: quitado, mas requisito required não satisfeito.
  const req = await makeActiveProcess(tenantId, {
    t0: new Date(Date.now() - 2 * MS_PER_DAY),
    requirements: [{ code: "OWNERSHIP_PROOF", label: "Prova de propriedade", required: true }],
  });
  await addRemoval(tenantId, req.processId);
  await release.start(who, req.processId, { recipient_name: "R" });
  await charge.settle(who, req.processId, {});
  await release.approve(who, req.processId, {});
  await expectReason(release.consume(who, req.processId), "release_requirement_unmet");

  // release_authority_missing: quitado + requisito ok + recipiente ok, mas sem aprovação.
  const auth = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  await addRemoval(tenantId, auth.processId);
  await release.start(who, auth.processId, { recipient_name: "R" });
  await charge.settle(who, auth.processId, {});
  await expectReason(release.consume(who, auth.processId), "release_authority_missing");

  // release_recipient_missing: quitado + aprovado, mas sem quem-retira.
  const recip = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  await addRemoval(tenantId, recip.processId);
  await release.start(who, recip.processId, {});
  await charge.settle(who, recip.processId, {});
  await release.approve(who, recip.processId, {});
  await expectReason(release.consume(who, recip.processId), "release_recipient_missing");
});

// ── (iii) estorno: DAILY sobre-acumulada → ADJUSTMENT negativo → reconciliação ok → consumação passa ──────────
test("(iii) estorno: over-accrual → ADJUSTMENT negativo → Σledger=teto → consumação passa; nunca estorna 2×", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 40 * MS_PER_DAY), cap: "THIRTY_DAYS_LEGACY" });
  await accrueDailies(tenantId, ctx.processId, 35, "10.00"); // 35 diárias × 10 = 350; teto 30 = 300
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  await release.start(who, ctx.processId, { recipient_name: "R" });
  const settle1 = await charge.settle(who, ctx.processId, {});
  assert.equal(settle1.estornoCount, 5, "5 diárias sobre-acumuladas estornadas");
  assert.equal(settle1.settledTotal, "300.00", "Σ ledger bate no teto (30 diárias)");

  // reconciliação agora consistente:
  const state = await charge.getReleaseChargeState(tenantId, ctx.processId);
  assert.equal(state?.reconciliationConsistent, true);
  assert.equal(state?.debtsSettled, true);

  // nunca estorna 2×:
  const settle2 = await charge.settle(who, ctx.processId, {});
  assert.equal(settle2.estornoCount, 0, "re-run não estorna de novo");

  const lines = await getMemoryChargeRepositoryForTests().listCharges({ tenantId, processId: ctx.processId });
  assert.equal(lines.filter((line) => line.kind === "ADJUSTMENT" && Number(line.totalAmount) < 0).length, 5, "exatamente 5 estornos");

  await release.approve(who, ctx.processId, {});
  const consumed = await release.consume(who, ctx.processId);
  assert.equal(consumed.release.status, "COMPLETED");
  assert.equal(consumed.release.settledTotal, "300.00");
});

// ── (iii-M1) reconciliação por VALOR: ADJUSTMENT PARCIAL pré-existente NÃO consistente até o líquido zerar ─────
test("(iii-M1) insider posta ADJUSTMENT parcial (−0,01) na DAILY sobre-acumulada ⇒ reconciliação por VALOR bloqueia; settle posta o RESÍDUO → líquido=0 → Σledger=teto; nunca estorna 2×", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 40 * MS_PER_DAY), cap: "THIRTY_DAYS_LEGACY" });
  await accrueDailies(tenantId, ctx.processId, 31, "30.00"); // 31 diárias × 30 = 930; teto 30 = 900; 1 sobre-acumulada
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  // a DAILY sobre-acumulada = a de maior period_seq (31ª).
  const dailies = (await getMemoryChargeRepositoryForTests().listCharges({ tenantId, processId: ctx.processId }))
    .filter((line) => line.kind === "DAILY")
    .sort((a, b) => (a.periodSeq ?? 0) - (b.periodSeq ?? 0));
  const overAccrued = dailies[dailies.length - 1];

  // ATAQUE: insider com charging:create posta um ADJUSTMENT PARCIAL (−0,01) apontando a DAILY sobre-acumulada
  // (alvo LEGAL). O gate por-EXISTÊNCIA marcaria reconciliação=consistente e liberaria acima do teto CTB §10.
  await charge.createManual(who, ctx.processId, {
    kind: "ADJUSTMENT",
    adjustment_of_charge_id: overAccrued.id,
    unit_amount: "0.01",
    total_amount: "-0.01",
  });

  // M1: por VALOR (líquido = 30 − 0,01 = 29,99 ≠ 0) → NÃO consistente.
  await release.start(who, ctx.processId, { recipient_name: "R" });
  const stateBefore = await charge.getReleaseChargeState(tenantId, ctx.processId);
  assert.equal(stateBefore?.reconciliationConsistent, false, "ADJUSTMENT parcial NÃO reconcilia (líquido≠0)");
  await expectReason(release.consume(who, ctx.processId), "release_reconciliation_pending");

  // settle posta o RESÍDUO que zera o líquido (−29,99), não a magnitude cheia da DAILY.
  const settle = await charge.settle(who, ctx.processId, {});
  assert.equal(settle.estornoCount, 1, "1 resíduo postado (a DAILY sobre-acumulada)");
  assert.equal(settle.settledTotal, "900.00", "Σ ledger = teto (30 diárias × 30) — líquido-zero, não existência");

  const stateAfter = await charge.getReleaseChargeState(tenantId, ctx.processId);
  assert.equal(stateAfter?.reconciliationConsistent, true);
  // 2 ADJUSTMENTs apontam a DAILY (o −0,01 do insider + o resíduo −29,99); líquido = 0.
  const adjustments = (await getMemoryChargeRepositoryForTests().listCharges({ tenantId, processId: ctx.processId }))
    .filter((line) => line.kind === "ADJUSTMENT" && line.adjustmentOfChargeId === overAccrued.id);
  assert.equal(adjustments.length, 2);
  assert.equal(adjustments.reduce((acc, adj) => acc + Math.round(Number(adj.totalAmount) * 100), Math.round(Number(overAccrued.totalAmount) * 100)), 0, "líquido da DAILY = 0 (centavo exato)");

  // nunca estorna 2× (idempotente POR VALOR): re-run não posta nada.
  const settle2 = await charge.settle(who, ctx.processId, {});
  assert.equal(settle2.estornoCount, 0);

  await release.approve(who, ctx.processId, {});
  const consumed = await release.consume(who, ctx.processId);
  assert.equal(consumed.release.status, "COMPLETED");
  assert.equal(consumed.release.settledTotal, "900.00");
});

// ── (iv) quem-retira/comprovante persistidos (entered_at + released_at) ───────────────────────────────────────
test("(iv) recipiente + comprovante entrada/saída persistidos", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - 2 * MS_PER_DAY);
  const ctx = await makeActiveProcess(tenantId, { t0 });
  await addRemoval(tenantId, ctx.processId);
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  await release.start(who, ctx.processId, {});
  await release.setRecipient(who, ctx.processId, { recipient_name: "Maria Silva", recipient_document: "***", recipient_relationship: "OWNER" });
  await charge.settle(who, ctx.processId, {});
  await release.approve(who, ctx.processId, {});
  const consumed = await release.consume(who, ctx.processId);

  assert.equal(consumed.release.recipientName, "Maria Silva");
  assert.equal(consumed.release.recipientRelationship, "OWNER");
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(tenantId, ctx.processId);
  assert.equal(process?.enteredAt?.getTime(), t0.getTime(), "entered_at = comprovante de entrada (t0)");
  assert.ok(consumed.release.releasedAt, "released_at = comprovante de saída");
});

// ── (vi) cadeia hash `valid` após RELEASE+SETTLEMENT+estorno (verify) ─────────────────────────────────────────
test("(vi) verify: cadeia permanece valid após SETTLEMENT + estorno + RELEASE", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 40 * MS_PER_DAY), cap: "THIRTY_DAYS_LEGACY" });
  await accrueDailies(tenantId, ctx.processId, 33, "10.00");
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  await release.start(who, ctx.processId, { recipient_name: "R" });
  await charge.settle(who, ctx.processId, {});
  await release.approve(who, ctx.processId, {});
  await release.consume(who, ctx.processId);

  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, ctx.processId);
  assert.ok(snapshot);
  const result = verifyChain({ tenantId, processId: ctx.processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
  assert.equal(result.valid, true, `cadeia deve permanecer valid (brokenAt=${result.brokenAt?.reason})`);
  assert.equal(snapshot.events.filter((event) => event.type === "SETTLEMENT").length, 1);
  assert.equal(snapshot.events.filter((event) => event.type === "RELEASE").length, 1);
  assert.equal(snapshot.events.filter((event) => event.type === "ADJUSTMENT").length, 3, "3 estornos na cadeia (33−30)");
});

// ── (viii) idempotência da aprovação (2ª = no-op, não duplica) ────────────────────────────────────────────────
test("(viii) approve idempotente: 2ª aprovação = no-op (mantém authorityApprovedAt original)", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  const release = createMemoryReleaseService();
  const who = actor(tenantId);

  await release.start(who, ctx.processId, { recipient_name: "R" });
  const first = await release.approve(who, ctx.processId, { authority_reference: "A-1" });
  assert.equal(first.status, "AUTHORIZED");
  assert.ok(first.authorityApprovedAt);
  const second = await release.approve(who, ctx.processId, { authority_reference: "A-2" });
  assert.equal(second.authorityApprovedAt?.getTime(), first.authorityApprovedAt?.getTime(), "2ª aprovação não sobrescreve");
  assert.equal(second.authorityReference, "A-1", "referência original preservada (no-op)");
});

// ── cross-tenant / not found ──────────────────────────────────────────────────────────────────────────────────
test("cross-tenant: start em processo de outro tenant ⇒ 404 process_not_found", async () => {
  const tenantId = await reset();
  const ctx = await makeActiveProcess(tenantId, { t0: new Date(Date.now() - 2 * MS_PER_DAY) });
  const release = createMemoryReleaseService();
  const other = actor(randomUUID());
  await expectReason(release.start(other, ctx.processId, {}), "process_not_found");
});
