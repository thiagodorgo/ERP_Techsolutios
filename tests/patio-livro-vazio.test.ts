import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { createMemoryChargeService, getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import { resolveTransition } from "../src/modules/impound/impound.transitions.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";
import { createMemoryReleaseService, getMemoryReleaseRepositoryForTests, resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";
import type { ReleaseActorContext } from "../src/modules/release/release.types.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import type { DailyCap } from "../src/modules/jurisdiction/jurisdiction.types.js";

const MS_PER_DAY = 86_400_000;

type Ctx = { tenantId: string; processId: string; profileId: string; dailyServiceCatalogId: string };

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
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  return randomUUID();
}

async function makeActiveProcess(tenantId: string, t0: Date, cap: DailyCap = "SIX_MONTHS"): Promise<Ctx> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const dailyServiceCatalogId = randomUUID();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: t0,
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
    scope: "PUBLIC_AGREEMENT",
    model: "ROLLING_24H",
    cap,
    dailyServiceCatalogId,
  });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, []);
  return { tenantId, processId: process.id, profileId, dailyServiceCatalogId };
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

async function expectReason(promise: Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => (error as { reason?: string }).reason === reason, `expected reason ${reason}`);
}

async function seedMemoryTariff(tenantId: string, serviceCatalogId: string, unitPrice: number): Promise<void> {
  const priceTable = await getMemoryPriceTableRepositoryForTests().create({
    tenantId,
    name: `Tabela ${randomUUID().slice(0, 6)}`,
    currency: "BRL",
    version: 1,
    status: "published",
  });
  await getMemoryTariffRepositoryForTests().create({
    tenantId,
    priceTableId: priceTable.id,
    serviceCatalogId,
    name: "Diária",
    unitPrice,
    currency: "BRL",
    origin: "test",
    status: "active",
  });
}

test("A: livro vazio sem serviço diário -> start recusa release_daily_charges_unpostable", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000));
  const ctx = await makeActiveProcess(tenantId, t0);
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, ctx.profileId, {
    scope: "PUBLIC_AGREEMENT",
    model: "ROLLING_24H",
    cap: "SIX_MONTHS",
    dailyServiceCatalogId: undefined,
  });
  const release = createMemoryReleaseService();
  await expectReason(release.start(actor(tenantId), ctx.processId, { recipient_name: "R" }), "release_daily_charges_unpostable");
});

test("A2: livro vazio com tarifa T -> start lança 3 DAILY e consume bloqueia dívida", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const release = createMemoryReleaseService();
  await seedMemoryTariff(tenantId, ctx.dailyServiceCatalogId, 40);
  await release.start(actor(tenantId), ctx.processId, { recipient_name: "R" });
  const dailies = (await getMemoryChargeRepositoryForTests().listCharges({ tenantId, processId: ctx.processId })).filter((line) => line.kind === "DAILY");
  assert.equal(dailies.length, 3, "start deve lançar 3 diárias");
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_debts_unsettled");
});

test("A3: legado congelado e livro vazio com tarifa -> consume bloqueia release_debts_unsettled", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (5 * MS_PER_DAY + 2 * 3_600_000));
  const frozenAt = new Date(Date.now() - (2 * MS_PER_DAY + 30 * 60 * 1000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const release = createMemoryReleaseService();
  const releaseRepo = getMemoryReleaseRepositoryForTests();
  await seedMemoryTariff(tenantId, ctx.dailyServiceCatalogId, 40);
  await releaseRepo.startReleaseAtomic({
    tenantId,
    processId: ctx.processId,
    expectedFrom: "ACTIVE_CUSTODY",
    kind: "STANDARD",
    requirements: [],
    recipientName: "R",
    occurredAt: frozenAt,
    chargeBasis: { expectedDailyCount: 0, enteredAt: t0, frozenAt },
  });
  await release.approve(actor(tenantId), ctx.processId, { authority_reference: "AUT" });
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_debts_unsettled");
});

test("A3b: legado congelado sem tarifa -> consume bloqueia release_daily_charges_unpostable", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (5 * MS_PER_DAY + 2 * 3_600_000));
  const frozenAt = new Date(Date.now() - (2 * MS_PER_DAY + 30 * 60 * 1000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const release = createMemoryReleaseService();
  const releaseRepo = getMemoryReleaseRepositoryForTests();
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, ctx.profileId, {
    scope: "PUBLIC_AGREEMENT",
    model: "ROLLING_24H",
    cap: "SIX_MONTHS",
    dailyServiceCatalogId: undefined,
  });
  await releaseRepo.startReleaseAtomic({
    tenantId,
    processId: ctx.processId,
    expectedFrom: "ACTIVE_CUSTODY",
    kind: "STANDARD",
    requirements: [],
    recipientName: "R",
    occurredAt: frozenAt,
    chargeBasis: { expectedDailyCount: 0, enteredAt: t0, frozenAt },
  });
  await release.approve(actor(tenantId), ctx.processId, { authority_reference: "AUT" });
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_daily_charges_unpostable");
});

test("B: controle (REMOVAL não quitada) -> permanece release_debts_unsettled", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const release = createMemoryReleaseService();
  await seedMemoryTariff(tenantId, ctx.dailyServiceCatalogId, 40);
  await addRemoval(tenantId, ctx.processId, "150.00");
  await release.start(actor(tenantId), ctx.processId, { recipient_name: "R" });
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_debts_unsettled");
});

test("C: REMOVAL quitada antes do start -> consume bloqueia até quitar diárias", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  await seedMemoryTariff(tenantId, ctx.dailyServiceCatalogId, 40);
  await addRemoval(tenantId, ctx.processId, "150.00");
  await charge.settle(actor(tenantId), ctx.processId, {});
  await release.start(actor(tenantId), ctx.processId, { recipient_name: "R" });
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_debts_unsettled");
});

test("D: entrada há 1h e livro vazio -> consume recusa release_no_charges_posted", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - 3_600_000);
  const ctx = await makeActiveProcess(tenantId, t0);
  const release = createMemoryReleaseService();
  await release.start(actor(tenantId), ctx.processId, { recipient_name: "R" });
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_no_charges_posted");
});

test("E: teto de 30 diárias -> start lança exatamente 30", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - 40 * MS_PER_DAY);
  const ctx = await makeActiveProcess(tenantId, t0, "THIRTY_DAYS_LEGACY");
  const release = createMemoryReleaseService();
  await seedMemoryTariff(tenantId, ctx.dailyServiceCatalogId, 40);
  await release.start(actor(tenantId), ctx.processId, { recipient_name: "R" });
  const dailies = (await getMemoryChargeRepositoryForTests().listCharges({ tenantId, processId: ctx.processId })).filter((line) => line.kind === "DAILY");
  assert.equal(dailies.length, 30);
});

test("E2: no teto de 30 diárias, consume libera sem shortfall residual", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - 40 * MS_PER_DAY);
  const ctx = await makeActiveProcess(tenantId, t0, "THIRTY_DAYS_LEGACY");
  const release = createMemoryReleaseService();
  const charge = createMemoryChargeService();
  const who = actor(tenantId);

  await seedMemoryTariff(tenantId, ctx.dailyServiceCatalogId, 40);
  await addRemoval(tenantId, ctx.processId, "150.00");
  await release.start(who, ctx.processId, { recipient_name: "R" });
  await charge.settle(who, ctx.processId, {});
  await release.approve(who, ctx.processId, { authority_reference: "AUT-E2" });

  const consumed = await release.consume(who, ctx.processId);
  assert.equal(consumed.release.status, "COMPLETED");
  assert.equal(consumed.release.settledTotal, "1350.00");
});

test("G: congelado há 2 dias com livro completo e quitado -> consume libera", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (5 * MS_PER_DAY + 2 * 3_600_000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const who = actor(tenantId);
  const release = createMemoryReleaseService();
  const releaseRepo = getMemoryReleaseRepositoryForTests();
  const charge = createMemoryChargeService();
  await seedMemoryTariff(tenantId, ctx.dailyServiceCatalogId, 40);
  await addRemoval(tenantId, ctx.processId, "150.00");

  const frozenAt = new Date(Date.now() - (2 * MS_PER_DAY + 30 * 60 * 1000));
  await releaseRepo.startReleaseAtomic({
    tenantId,
    processId: ctx.processId,
    expectedFrom: "ACTIVE_CUSTODY",
    kind: "STANDARD",
    requirements: [],
    recipientName: "R",
    actorId: who.userId,
    occurredAt: frozenAt,
  } as never);
  await charge.accrueProcess(tenantId, ctx.processId, new Date(), who.userId);
  await charge.settle(who, ctx.processId, {});
  await release.approve(who, ctx.processId, { authority_reference: "AUT-1" });

  const consumed = await release.consume(who, ctx.processId);
  assert.equal(consumed.release.status, "COMPLETED");
  assert.equal(consumed.release.settledTotal, "270.00");
});

test("U-1: gate sem estado resolve release_gate_unresolved em start e consume", async () => {
  const process = {
    id: randomUUID(),
    tenantId: randomUUID(),
    status: "ACTIVE_CUSTODY",
  } as const;

  assert.throws(
    () => resolveTransition(process as never, "RELEASE_IN_PROGRESS", {}),
    (error: unknown) => (error as { reason?: string }).reason === "release_gate_unresolved",
  );
  assert.throws(
    () => resolveTransition({ ...process, status: "RELEASE_IN_PROGRESS" } as never, "RELEASED", {}),
    (error: unknown) => (error as { reason?: string }).reason === "release_gate_unresolved",
  );
});

test("U-2: ordem da guarda pura prioriza reconciliação -> diárias faltando -> sem cobrança -> débito", () => {
  const process = { id: randomUUID(), tenantId: randomUUID(), status: "RELEASE_IN_PROGRESS" } as const;
  assert.throws(
    () =>
      resolveTransition(process as never, "RELEASED", {
        releaseGate: {
          reconciliationPending: false,
          debtsUnsettled: true,
          requirementUnmet: false,
          authorityMissing: false,
          recipientMissing: false,
          chargesMissing: true,
          noChargesPosted: false,
        } as never,
      }),
    (error: unknown) => (error as { reason?: string }).reason === "release_daily_charges_missing",
  );
});

test("U-3: getReleaseChargeState expõe dailyShortfall e exigibleCount", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const charge = createMemoryChargeService();
  const state = await charge.getReleaseChargeState(tenantId, ctx.processId);
  assert.equal((state as unknown as { dailyShortfall?: number }).dailyShortfall, 3);
  assert.equal((state as unknown as { exigibleCount?: number }).exigibleCount, 0);
});

test("U-4: consume prioriza release_daily_charges_missing quando shortfall>0 e há cobrança lançada", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (5 * MS_PER_DAY + 2 * 3_600_000));
  const frozenAt = new Date(Date.now() - (2 * MS_PER_DAY + 30 * 60 * 1000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const releaseRepo = getMemoryReleaseRepositoryForTests();
  const release = createMemoryReleaseService() as unknown as {
    chargeState: (tenantId: string, processId: string, now: Date) => Promise<{
      nDueNow: number;
      nAccrueAtFreeze: number;
      persistedDailyCount: number;
      dailyShortfall: number;
      exigibleCount: number;
      debtsSettled: boolean;
      reconciliationConsistent: boolean;
    }>;
    closeDailies: (tenantId: string, processId: string, now: Date, actorId?: string) => Promise<{ examined: boolean; accrued: number; errors: number }>;
    consume: (actor: ReleaseActorContext, processId: string) => Promise<unknown>;
    approve: (actor: ReleaseActorContext, processId: string, body: Record<string, unknown>) => Promise<unknown>;
  };

  await releaseRepo.startReleaseAtomic({
    tenantId,
    processId: ctx.processId,
    expectedFrom: "ACTIVE_CUSTODY",
    kind: "STANDARD",
    requirements: [],
    recipientName: "R",
    occurredAt: frozenAt,
    chargeBasis: { expectedDailyCount: 0, enteredAt: t0, frozenAt },
  });

  release.closeDailies = async () => ({ examined: true, accrued: 0, errors: 0 });
  release.chargeState = async () => ({
    nDueNow: 3,
    nAccrueAtFreeze: 3,
    persistedDailyCount: 0,
    dailyShortfall: 3,
    exigibleCount: 1,
    debtsSettled: true,
    reconciliationConsistent: true,
  });

  await release.approve(actor(tenantId), ctx.processId, { authority_reference: "AUT" });
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_daily_charges_missing");
});

test("U-5: consume falha com release_gate_unresolved quando chargeState retorna undefined", async () => {
  const tenantId = await reset();
  const t0 = new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000));
  const ctx = await makeActiveProcess(tenantId, t0);
  const releaseRepo = getMemoryReleaseRepositoryForTests();
  const release = createMemoryReleaseService() as unknown as {
    chargeState: (tenantId: string, processId: string, now: Date) => Promise<undefined>;
    closeDailies: (tenantId: string, processId: string, now: Date, actorId?: string) => Promise<{ examined: boolean; accrued: number; errors: number }>;
    consume: (actor: ReleaseActorContext, processId: string) => Promise<unknown>;
    approve: (actor: ReleaseActorContext, processId: string, body: Record<string, unknown>) => Promise<unknown>;
  };

  await releaseRepo.startReleaseAtomic({
    tenantId,
    processId: ctx.processId,
    expectedFrom: "ACTIVE_CUSTODY",
    kind: "STANDARD",
    requirements: [],
    recipientName: "R",
    occurredAt: new Date(),
    chargeBasis: { expectedDailyCount: 0, enteredAt: t0, frozenAt: null },
  });

  release.closeDailies = async () => ({ examined: true, accrued: 0, errors: 0 });
  release.chargeState = async () => undefined;

  await release.approve(actor(tenantId), ctx.processId, { authority_reference: "AUT" });
  await expectReason(release.consume(actor(tenantId), ctx.processId), "release_gate_unresolved");
});
