import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { AuctionService, createMemoryAuctionService, getMemoryAuctionRepositoryForTests, resetAuctionRuntimeForTests } from "../src/modules/auction/auction.service.js";
import {
  AuctionSettlementService,
  createMemoryAuctionSettlementService,
  getMemoryAuctionSettlementRepositoryForTests,
  resetAuctionSettlementRuntimeForTests,
} from "../src/modules/auction/auction.settlement.service.js";
import type { DistributeSettlementResult } from "../src/modules/auction/auction.settlement.types.js";
import { createMemoryChargeService, getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { verifyChain } from "../src/modules/impound/impound.hashchain.js";
import { getMemoryNotificationRepositoryForTests, resetNotificationRuntimeForTests } from "../src/modules/impound/impound.notifications.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import { createMemoryImpoundPaymentService, resetImpoundPaymentRuntimeForTests } from "../src/modules/impound-payments/impound-payment.service.js";
import { PAYMENT_METHODS, type PaymentConnectionPort } from "../src/modules/impound-payments/impound-payment.types.js";
import type { DailyCap } from "../src/modules/jurisdiction/jurisdiction.types.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";
import { createMemoryReleaseService, getMemoryReleaseRepositoryForTests, resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { getMemoryYardRepositoryForTests, resetYardRuntimeForTests } from "../src/modules/yard/yard.service.js";

// B-PATIO-LEILAO-DIARIAS, fatias F1 e F1b (suíte em memória, plano §5.3 e Emendas 1 a 10). Cada caso chama o SERVIÇO de leilão,
// da liquidação, da cobrança ou o repositório em memória de verdade e afirma o comportamento que o plano pede. Escrita
// ANTES do conserto: na `main` os casos marcados VERMELHO no plano falham pela asserção (o valor que veio) ou porque a
// API que o plano cria ainda não existe (método, módulo ou porta). Nenhum caso é um `assert.fail` fixo.
//
// Portas novas (plano §2.2, §2.4 e E6.1): AuctionService ganha `closeDailies` (7ª), `chargeState` (8ª),
// `inspectionComplete` (9ª) e `removalPosted` (10ª); AuctionSettlementService ganha `closeDailies` (5ª) e `chargeState` (6ª).
// Cenário comum (§5.1 + E6.1): entrada há 90 dias e 2 h, 24 h corridas, teto de 6 meses, diária de 40,00, remoção de
// 150,00 não paga, lance de 8.000,00, vistoria de recepção completa com fotos, pátio atribuído. D = 90; devido = 3.750,00.

const MS_PER_DAY = 86_400_000;
const HOUR = 3_600_000;
const TARIFF = 40;

type Ctx = { tenantId: string; processId: string; profileId: string; dailyServiceCatalogId: string; userId: string; enteredAt: Date };
type Who = { tenantId: string; userId: string; roles: string[]; permissions: string[] };
type ScenarioOptions = {
  days?: number;
  extraMs?: number;
  tariff?: boolean;
  cap?: DailyCap;
  status?: "ACTIVE_CUSTODY" | "AUCTION_ELIGIBLE";
  yard?: boolean;
  inspection?: boolean;
  removal?: boolean;
  trail?: boolean;
};

function who(ctx: Ctx): Who {
  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    roles: ["manager"],
    permissions: ["impound:read", "impound:transition", "auction:appraise", "charging:settle", "release:process", "release:approve"],
  };
}

function resetAll(): void {
  resetImpoundRuntimeForTests();
  resetNotificationRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetAuctionRuntimeForTests();
  resetAuctionSettlementRuntimeForTests();
  resetChargeRuntimeForTests();
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetYardRuntimeForTests();
  resetImpoundPaymentRuntimeForTests();
}

async function seedTariff(tenantId: string, serviceCatalogId: string): Promise<void> {
  const priceTable = await getMemoryPriceTableRepositoryForTests().create({ tenantId, name: `Tabela ${randomUUID().slice(0, 6)}`, currency: "BRL", version: 1, status: "published" });
  await getMemoryTariffRepositoryForTests().create({ tenantId, priceTableId: priceTable.id, serviceCatalogId, name: "Diária", unitPrice: TARIFF, currency: "BRL", origin: "test", status: "active" });
}

async function assignYard(ctx: Ctx): Promise<void> {
  const yard = getMemoryYardRepositoryForTests();
  const created = await yard.createYard({ tenantId: ctx.tenantId, name: "Pátio Central", address: "Rua X, 1", timezone: "America/Sao_Paulo" });
  const area = await yard.createArea({ tenantId: ctx.tenantId, yardId: created.id, kind: "BLOCK", name: "Q1" });
  const spot = await yard.createSpot({ tenantId: ctx.tenantId, areaId: area.id, code: `S-${randomUUID().slice(0, 4)}` });
  await getMemoryImpoundRepositoryForTests().assignSpotAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, spotId: spot.id, occurredAt: new Date() });
}

async function completeInspection(ctx: Ctx): Promise<void> {
  const impound = getMemoryImpoundRepositoryForTests();
  const inspection = await impound.upsertInspection({
    tenantId: ctx.tenantId,
    processId: ctx.processId,
    inspectedAt: new Date(ctx.enteredAt.getTime() + HOUR),
    bodyworkState: "Sem avarias",
    paintState: "Original",
    tiresState: "Bom",
    internalObjects: "nenhum",
    missingEquipment: "nenhum",
    signatureStatus: "ABSENT",
  } as never);
  await impound.addInspectionPhoto({ tenantId: ctx.tenantId, processId: ctx.processId, inspectionId: inspection.id, set: "FRONT", fileUrl: "https://arquivos.invalid/frente.jpg", occurredAt: new Date() });
  await impound.completeInspection({ tenantId: ctx.tenantId, processId: ctx.processId, occurredAt: new Date() });
}

async function addRemoval(ctx: Ctx): Promise<void> {
  await getMemoryChargeRepositoryForTests().createManualCharge({
    tenantId: ctx.tenantId,
    processId: ctx.processId,
    kind: "REMOVAL",
    quantity: "1.00",
    unitAmount: "150.00",
    totalAmount: "150.00",
    currency: "BRL",
    occurredAt: new Date(),
  });
}

async function completeTrail(ctx: Ctx): Promise<void> {
  const repo = getMemoryNotificationRepositoryForTests();
  for (const kind of ["OWNER_INITIAL", "COMPLEMENTARY_EDICT"] as const) {
    const result = await repo.markDue({ tenantId: ctx.tenantId, processId: ctx.processId, kind, dueAt: new Date(), occurredAt: new Date() });
    if (result.notification) {
      await repo.issue({ tenantId: ctx.tenantId, processId: ctx.processId, notificationId: result.notification.id, channel: "POSTAL", issuedAt: new Date(), occurredAt: new Date() });
    }
  }
}

function setDailyService(ctx: Ctx, enabled: boolean, cap: DailyCap = "SIX_MONTHS"): void {
  getMemoryChargeRepositoryForTests().setProfileForTests(ctx.tenantId, ctx.profileId, {
    scope: "PUBLIC_AGREEMENT",
    model: "ROLLING_24H",
    cap,
    dailyServiceCatalogId: enabled ? ctx.dailyServiceCatalogId : undefined,
  });
}

// O cenário comum do §5.1 com o registro mínimo de custódia da E6.1. Cada parte pode ser retirada pelo caso.
async function scenario(options: ScenarioOptions = {}): Promise<Ctx> {
  resetAll();
  const tenantId = randomUUID();
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const enteredAt = new Date(Date.now() - (options.days ?? 90) * MS_PER_DAY - (options.extraMs ?? 2 * HOUR));
  const opened = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Placa adulterada",
    completedAt: enteredAt,
    actorId: undefined,
  });
  await impound.applyTransition({
    tenantId,
    processId: opened.id,
    expectedFrom: "RECEPTION",
    to: "ACTIVE_CUSTODY",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "ACTIVE_CUSTODY", reason: null }, occurredAt: new Date(), actorId: undefined },
  });
  const ctx: Ctx = { tenantId, processId: opened.id, profileId, dailyServiceCatalogId: randomUUID(), userId: randomUUID(), enteredAt };
  setDailyService(ctx, options.tariff !== false, options.cap ?? "SIX_MONTHS");
  if (options.tariff !== false) await seedTariff(tenantId, ctx.dailyServiceCatalogId);
  getMemoryAuctionRepositoryForTests().setAuctionProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30, auctionEligibleDay: 60 });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, []);
  impound.setProfileRequiredSetsForTests(tenantId, profileId, ["FRONT"]);
  if (options.yard !== false) await assignYard(ctx);
  if (options.inspection !== false) await completeInspection(ctx);
  if (options.removal !== false) await addRemoval(ctx);
  if (options.trail !== false) await completeTrail(ctx);
  if (options.status === "AUCTION_ELIGIBLE") {
    await impound.applyTransition({
      tenantId,
      processId: ctx.processId,
      expectedFrom: "ACTIVE_CUSTODY",
      to: "AUCTION_ELIGIBLE",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "STATUS_CHANGE", payload: { from: "ACTIVE_CUSTODY", to: "AUCTION_ELIGIBLE", reason: "auction_eligible" }, occurredAt: new Date(), actorId: undefined },
    });
  }
  return ctx;
}

async function processOf(ctx: Ctx) {
  const process = await getMemoryImpoundRepositoryForTests().findProcessById(ctx.tenantId, ctx.processId);
  assert.ok(process, "o processo existe");
  return process;
}

async function lines(ctx: Ctx) {
  return getMemoryChargeRepositoryForTests().listCharges({ tenantId: ctx.tenantId, processId: ctx.processId });
}

async function dailyCount(ctx: Ctx): Promise<number> {
  return (await lines(ctx)).filter((line) => line.kind === "DAILY").length;
}

async function eventTypes(ctx: Ctx): Promise<string[]> {
  return (await getMemoryImpoundRepositoryForTests().listEvents(ctx.tenantId, ctx.processId)).map((event) => event.type);
}

async function assertChainValid(ctx: Ctx): Promise<void> {
  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(ctx.tenantId, ctx.processId);
  assert.ok(snapshot, "a cadeia existe");
  const result = verifyChain({ tenantId: ctx.tenantId, processId: ctx.processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
  assert.equal(result.valid, true, `cadeia de custódia válida (${JSON.stringify(result)})`);
}

async function bookTotal(ctx: Ctx): Promise<string> {
  return (await createMemoryChargeService().getStatement(who(ctx), ctx.processId)).total;
}

function reasonOf(error: unknown): string {
  const typed = error as { statusCode?: number; reason?: string; message?: string };
  return typed.reason ? `${typed.statusCode ?? "?"} ${typed.reason}` : `sem razão: ${typed.message ?? String(error)}`;
}

async function outcome(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "aceito";
  } catch (error) {
    return reasonOf(error);
  }
}

// Leilão pelo SERVIÇO: edital CONSERVED completo, avaliação, preparação e lote (rodada 1).
async function lotViaService(ctx: Ctx, auction: AuctionService, minBid = "5000.00"): Promise<void> {
  const actor = who(ctx);
  await auction.registerEdict(actor, ctx.processId, { round_number: 1, classification: "CONSERVED", edict_reference: "EDITAL-1/2026", published_at: new Date(Date.now() - 30 * MS_PER_DAY).toISOString(), business_days: 15 });
  await auction.setAppraisal(actor, ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: minBid });
  await auction.prepareForAuction(actor, ctx.processId, { round_number: 1 });
  await auction.lotForAuction(actor, ctx.processId, { round_number: 1 });
}

function saleBody(amount = "8000.00", round = 1) {
  return { round_number: round, winner_ref: `Arrematante ${round}`, sold_amount: amount, sale_note_reference: `NOTA-${round}` };
}

// Leilão pelo REPOSITÓRIO (sem os portões do serviço), para semear o estado de partida que o caso precisa.
async function driveViaRepository(ctx: Ctx, to: "AUCTION_PREP" | "LOTTED" | "AUCTIONED" | "AUCTION_CLOSED", amount = "8000.00"): Promise<void> {
  const repo = getMemoryAuctionRepositoryForTests();
  const base = { tenantId: ctx.tenantId, processId: ctx.processId, actorId: ctx.userId };
  const basis = { expectedDailyCount: 0, enteredAt: ctx.enteredAt, frozenAt: new Date() };
  await repo.registerEdictAtomic({ ...base, roundNumber: 1, classification: "CONSERVED", edictReference: "EDITAL-1/2026", publishedAt: new Date(Date.now() - 30 * MS_PER_DAY), businessDays: 15, occurredAt: new Date() } as never);
  await repo.setAppraisalAtomic({ ...base, roundNumber: 1, appraisalAmount: "10000.00", minBidAmount: "5000.00" } as never);
  await repo.prepareAuctionAtomic({ ...base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, occurredAt: new Date() });
  if (to === "AUCTION_PREP") return;
  await repo.lotAuctionAtomic({ ...base, expectedFrom: "AUCTION_PREP", roundNumber: 1, occurredAt: new Date() });
  if (to === "LOTTED") return;
  await repo.recordSaleAtomic({ ...base, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "Arrematante 1", soldAmount: amount, saleNoteReference: "NOTA-1", occurredAt: new Date(), chargeBasis: basis } as never);
  if (to === "AUCTIONED") return;
  await repo.closeAuctionAtomic({ ...base, expectedFrom: "AUCTIONED", roundNumber: 1, occurredAt: new Date(), chargeBasis: basis } as never);
}

function cascadeOf(result: DistributeSettlementResult) {
  const byKind = new Map(result.allocations.map((allocation) => [allocation.beneficiaryKind as string, allocation]));
  const cents = result.allocations.reduce((acc, allocation) => acc + Math.round(Number(allocation.amount) * 100), 0);
  return {
    creditoDoPatio: byKind.get("REMOVAL_STORAGE")?.amount,
    saldoDoExDono: byKind.get("OWNER_BALANCE")?.amount,
    somaDoRateioIgualAoLance: cents === Math.round(Number(result.settlement.hammerAmount) * 100),
  };
}

async function memoryVerifyChain(tenantId: string, processId: string) {
  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, processId);
  if (!snapshot) return undefined;
  return verifyChain({ tenantId, processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
}

type ClosingPort = (tenantId: string, processId: string, now: Date, actorId?: string) => Promise<{ examined: boolean; accrued: number; errors: number }>;
type AuctionPorts = {
  closeDailies?: ClosingPort;
  chargeState?: (tenantId: string, processId: string, now: Date) => Promise<unknown>;
  currentDailyService?: (tenantId: string, processId: string) => Promise<boolean | undefined>;
  inspectionComplete?: (tenantId: string, processId: string) => Promise<boolean>;
  removalPosted?: (tenantId: string, processId: string) => Promise<boolean>;
  repository?: unknown;
};

// O AuctionService pela API pública que o plano cria (portas 7 a 10). Na `main` o construtor ainda tem 6 parâmetros: as
// portas extras são ignoradas, e o vermelho vem do comportamento (nenhuma recusa).
function auctionServiceWith(ports: AuctionPorts): AuctionService {
  const charge = createMemoryChargeService();
  const repo = getMemoryAuctionRepositoryForTests();
  const Ctor = AuctionService as unknown as new (...args: unknown[]) => AuctionService;
  return new Ctor(
    ports.repository ?? repo,
    getMemoryImpoundRepositoryForTests(),
    (tenantId: string, processId: string) => repo.getAuctionProfile(tenantId, processId),
    (tenantId: string, processId: string) => getMemoryNotificationRepositoryForTests().listNotifications({ tenantId, processId }),
    (tenantId: string, processId: string) => memoryVerifyChain(tenantId, processId),
    (tenantId: string, processId: string) => getMemoryReleaseRepositoryForTests().hasActiveRelease(tenantId, processId),
    ports.closeDailies ?? ((tenantId: string, processId: string, now: Date, actorId?: string) => charge.accrueProcess(tenantId, processId, now, actorId)),
    ports.chargeState ?? ((tenantId: string, processId: string, now: Date) => charge.getReleaseChargeState(tenantId, processId, now)),
    ports.currentDailyService ?? ((tenantId: string, processId: string) => charge.hasCurrentDailyServiceCatalog(tenantId, processId)),
    ports.inspectionComplete ?? (async () => true),
    ports.removalPosted ?? (async () => true),
  );
}

function settlementServiceWith(ports: Pick<AuctionPorts, "closeDailies" | "chargeState">): AuctionSettlementService {
  const charge = createMemoryChargeService();
  const Ctor = AuctionSettlementService as unknown as new (...args: unknown[]) => AuctionSettlementService;
  return new Ctor(
    getMemoryAuctionSettlementRepositoryForTests(),
    getMemoryImpoundRepositoryForTests(),
    getMemoryAuctionRepositoryForTests(),
    (tenantId: string, processId: string) => createMemoryChargeService().getCascadeExpenseClaim(tenantId, processId),
    ports.closeDailies ?? ((tenantId: string, processId: string, now: Date, actorId?: string) => charge.accrueProcess(tenantId, processId, now, actorId)),
    ports.chargeState ?? ((tenantId: string, processId: string, now: Date) => charge.getReleaseChargeState(tenantId, processId, now)),
    ports.currentDailyService ?? ((tenantId: string, processId: string) => charge.hasCurrentDailyServiceCatalog(tenantId, processId)),
  );
}

const NO_OP_CLOSING: ClosingPort = async () => ({ examined: true, accrued: 0, errors: 0 });

async function quitAll(ctx: Ctx): Promise<void> {
  const charge = createMemoryChargeService();
  await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
  await charge.settle(who(ctx), ctx.processId, { note: "quitado no balcão" });
}

async function twoDesertedRounds(ctx: Ctx): Promise<void> {
  const helper = createMemoryAuctionService();
  for (const round of [1, 2]) {
    await helper.registerEdict(who(ctx), ctx.processId, { round_number: round, classification: "CONSERVED", edict_reference: `EDITAL-${round}/2026`, published_at: new Date(Date.now() - 30 * MS_PER_DAY).toISOString(), business_days: 15 });
    await helper.recordAttempt(who(ctx), ctx.processId, { round_number: round });
  }
}

type WithdrawCapable = { withdrawSettled: (actor: Who, processId: string, body: Record<string, unknown>) => Promise<{ status: string }> };

// ─────────────────────────────────────────────── L: arremate, reciclagem, liquidação ───────────────────────────────────────────────

test("L1 · arremate sem diária lançada: o recordSale lança as 90 sem congelar, o encerramento congela e a liquidação credita 3750.00 / 4250.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  const auction = createMemoryAuctionService();
  await lotViaService(ctx, auction);
  await auction.recordSale(who(ctx), ctx.processId, saleBody());
  const afterSale = { linhas: (await lines(ctx)).length, diarias: await dailyCount(ctx), congelado: (await processOf(ctx)).frozenAt !== undefined };
  assert.deepEqual(afterSale, { linhas: 91, diarias: 90, congelado: false }, "L1: logo depois do recordSale e antes do closeAuction");
  await auction.closeAuction(who(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
  assert.notEqual((await processOf(ctx)).frozenAt, undefined, "L1: o encerramento congela");
  const dist = await createMemoryAuctionSettlementService().distribute(who(ctx), ctx.processId, {});
  assert.deepEqual(cascadeOf(dist), { creditoDoPatio: "3750.00", saldoDoExDono: "4250.00", somaDoRateioIgualAoLance: true });
  await assertChainValid(ctx);
});

test("L2 · reciclagem por 2 leilões desertos: 90 diárias e total do livro 3750.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await twoDesertedRounds(ctx);
  const view = await createMemoryAuctionService().reclassifyScrap(who(ctx), ctx.processId);
  assert.deepEqual({ estado: view.status, diarias: await dailyCount(ctx), total: await bookTotal(ctx) }, { estado: "DIRECT_RECYCLING", diarias: 90, total: "3750.00" });
  await assertChainValid(ctx);
});

test("L3 · reciclagem por inservibilidade: 90 diárias e total do livro 3750.00", async () => {
  const ctx = await scenario();
  const view = await createMemoryAuctionService().reclassifyUnrecoverable(who(ctx), ctx.processId, { classification: "UNRECOVERABLE", reason: "Carcaça queimada, sem condição de circular" });
  assert.deepEqual({ estado: view.status, diarias: await dailyCount(ctx), total: await bookTotal(ctx) }, { estado: "DIRECT_RECYCLING", diarias: 90, total: "3750.00" });
  await assertChainValid(ctx);
});

test("L4 · arremate sem serviço de diária: 409 auction_daily_charges_unpostable; segue LOTTED, sem congelar, sem SOLD, sem AUCTION_SOLD", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  const auction = createMemoryAuctionService();
  await lotViaService(ctx, auction);
  setDailyService(ctx, false);
  const result = await outcome(auction.recordSale(who(ctx), ctx.processId, saleBody()));
  const state = await getMemoryAuctionRepositoryForTests().getState(ctx.tenantId, ctx.processId);
  assert.deepEqual(
    {
      resultado: result,
      estado: (await processOf(ctx)).status,
      congelado: (await processOf(ctx)).frozenAt !== undefined,
      vendas: (state?.attempts ?? []).filter((attempt) => attempt.outcome === "SOLD").length,
      eventosAuctionSold: (await eventTypes(ctx)).filter((type) => type === "AUCTION_SOLD").length,
    },
    { resultado: "409 auction_daily_charges_unpostable", estado: "LOTTED", congelado: false, vendas: 0, eventosAuctionSold: 0 },
  );
});

test("L4r · reciclagem por desertos sem serviço de diária: 409 auction_daily_charges_unpostable; estado e congelamento intocados", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", tariff: false });
  await twoDesertedRounds(ctx);
  const result = await outcome(createMemoryAuctionService().reclassifyScrap(who(ctx), ctx.processId));
  assert.deepEqual(
    { resultado: result, estado: (await processOf(ctx)).status, congelado: (await processOf(ctx)).frozenAt !== undefined },
    { resultado: "409 auction_daily_charges_unpostable", estado: "AUCTION_ELIGIBLE", congelado: false },
  );
});

test("L4r · reciclagem por inservibilidade sem serviço de diária: 409 auction_daily_charges_unpostable; estado e congelamento intocados", async () => {
  const ctx = await scenario({ tariff: false });
  const result = await outcome(createMemoryAuctionService().reclassifyUnrecoverable(who(ctx), ctx.processId, { classification: "UNRECOVERABLE", reason: "Carcaça queimada" }));
  assert.deepEqual(
    { resultado: result, estado: (await processOf(ctx)).status, congelado: (await processOf(ctx)).frozenAt !== undefined },
    { resultado: "409 auction_daily_charges_unpostable", estado: "ACTIVE_CUSTODY", congelado: false },
  );
});

test("L6 · legado já AUCTION_CLOSED e congelado com 0 diárias: a liquidação lança as 90 e credita 3750.00 / 4250.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await driveViaRepository(ctx, "AUCTION_CLOSED");
  assert.notEqual((await processOf(ctx)).frozenAt, undefined, "pré-condição: o legado está congelado");
  assert.equal(await dailyCount(ctx), 0, "pré-condição: 0 diárias no livro");
  const dist = await createMemoryAuctionSettlementService().distribute(who(ctx), ctx.processId, {});
  assert.deepEqual({ diarias: await dailyCount(ctx), ...cascadeOf(dist) }, { diarias: 90, creditoDoPatio: "3750.00", saldoDoExDono: "4250.00", somaDoRateioIgualAoLance: true });
  await assertChainValid(ctx);
});

test("L6b · legado congelado sem serviço de diária: 409 settlement_daily_charges_unpostable e nenhuma liquidação", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", tariff: false });
  await driveViaRepository(ctx, "AUCTION_CLOSED");
  const result = await outcome(createMemoryAuctionSettlementService().distribute(who(ctx), ctx.processId, {}));
  const stored = await getMemoryAuctionSettlementRepositoryForTests().getByProcess(ctx.tenantId, ctx.processId);
  assert.deepEqual(
    { resultado: result, liquidacaoGravada: stored !== undefined, eventosAuctionSettlement: (await eventTypes(ctx)).filter((type) => type === "AUCTION_SETTLEMENT").length },
    { resultado: "409 settlement_daily_charges_unpostable", liquidacaoGravada: false, eventosAuctionSettlement: 0 },
  );
});

test("L7 · teto de 30 diárias com 90 dias de pátio: lança exatamente 30; crédito 1350.00, saldo 6650.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", cap: "THIRTY_DAYS_LEGACY" });
  const auction = createMemoryAuctionService();
  await lotViaService(ctx, auction);
  await auction.recordSale(who(ctx), ctx.processId, saleBody());
  await auction.closeAuction(who(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
  const dist = await createMemoryAuctionSettlementService().distribute(who(ctx), ctx.processId, {});
  assert.deepEqual({ diarias: await dailyCount(ctx), ...cascadeOf(dist) }, { diarias: 30, creditoDoPatio: "1350.00", saldoDoExDono: "6650.00", somaDoRateioIgualAoLance: true });
});

test("L9 · recordSale repetido na mesma rodada: a 2ª devolve created=false e a contagem de diárias fica igual (90)", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  const auction = createMemoryAuctionService();
  await lotViaService(ctx, auction);
  const first = await auction.recordSale(who(ctx), ctx.processId, saleBody());
  const afterFirst = await dailyCount(ctx);
  const second = await auction.recordSale(who(ctx), ctx.processId, saleBody());
  assert.deepEqual(
    { primeira: first.created, segunda: second.created, diariasDepoisDa1a: afterFirst, diariasDepoisDa2a: await dailyCount(ctx) },
    { primeira: true, segunda: false, diariasDepoisDa1a: 90, diariasDepoisDa2a: 90 },
  );
});

// ─────────────────────────────────────────────── U: as portas do serviço ───────────────────────────────────────────────

test("U-1 · porta chargeState devolvendo undefined: 409 auction_gate_unresolved no encerramento e nas duas reciclagens; nada congela", async () => {
  const results: Record<string, unknown> = {};
  {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    await driveViaRepository(ctx, "AUCTIONED");
    const frozenBefore = (await processOf(ctx)).frozenAt;
    results.encerramento = await outcome(auctionServiceWith({ chargeState: async () => undefined }).closeAuction(who(ctx), ctx.processId, { round_number: 1, payment_confirmed: true }));
    results.encerramentoEstado = (await processOf(ctx)).status;
    results.encerramentoCongelamentoIgual = (await processOf(ctx)).frozenAt?.getTime() === frozenBefore?.getTime();
  }
  {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    await twoDesertedRounds(ctx);
    results.sucata = await outcome(auctionServiceWith({ chargeState: async () => undefined }).reclassifyScrap(who(ctx), ctx.processId));
    results.sucataCongelada = (await processOf(ctx)).frozenAt !== undefined;
  }
  {
    const ctx = await scenario();
    results.inservivel = await outcome(auctionServiceWith({ chargeState: async () => undefined }).reclassifyUnrecoverable(who(ctx), ctx.processId, { classification: "UNRECOVERABLE", reason: "Carcaça queimada" }));
    results.inservivelCongelado = (await processOf(ctx)).frozenAt !== undefined;
  }
  assert.deepEqual(results, {
    encerramento: "409 auction_gate_unresolved",
    encerramentoEstado: "AUCTIONED",
    encerramentoCongelamentoIgual: true,
    sucata: "409 auction_gate_unresolved",
    sucataCongelada: false,
    inservivel: "409 auction_gate_unresolved",
    inservivelCongelado: false,
  });
});

test("U-2 · porta closeDailies que não lança, com 90 diárias devidas: 409 auction_daily_charges_missing no arremate, no encerramento e nas duas reciclagens; nada congela", async () => {
  const results: Record<string, unknown> = {};
  {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    await driveViaRepository(ctx, "LOTTED");
    results.arremate = await outcome(auctionServiceWith({ closeDailies: NO_OP_CLOSING }).recordSale(who(ctx), ctx.processId, saleBody()));
    results.arremateEstado = (await processOf(ctx)).status;
  }
  {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    await driveViaRepository(ctx, "AUCTIONED");
    const frozenBefore = (await processOf(ctx)).frozenAt;
    results.encerramento = await outcome(auctionServiceWith({ closeDailies: NO_OP_CLOSING }).closeAuction(who(ctx), ctx.processId, { round_number: 1, payment_confirmed: true }));
    results.encerramentoEstado = (await processOf(ctx)).status;
    results.encerramentoCongelamentoIgual = (await processOf(ctx)).frozenAt?.getTime() === frozenBefore?.getTime();
  }
  {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    await twoDesertedRounds(ctx);
    results.sucata = await outcome(auctionServiceWith({ closeDailies: NO_OP_CLOSING }).reclassifyScrap(who(ctx), ctx.processId));
    results.sucataCongelada = (await processOf(ctx)).frozenAt !== undefined;
  }
  {
    const ctx = await scenario();
    results.inservivel = await outcome(auctionServiceWith({ closeDailies: NO_OP_CLOSING }).reclassifyUnrecoverable(who(ctx), ctx.processId, { classification: "UNRECOVERABLE", reason: "Carcaça queimada" }));
    results.inservivelCongelado = (await processOf(ctx)).frozenAt !== undefined;
  }
  assert.deepEqual(results, {
    arremate: "409 auction_daily_charges_missing",
    arremateEstado: "LOTTED",
    encerramento: "409 auction_daily_charges_missing",
    encerramentoEstado: "AUCTIONED",
    encerramentoCongelamentoIgual: true,
    sucata: "409 auction_daily_charges_missing",
    sucataCongelada: false,
    inservivel: "409 auction_daily_charges_missing",
    inservivelCongelado: false,
  });
});

function captureRepository(captured: Record<string, unknown>[]): unknown {
  const repo = getMemoryAuctionRepositoryForTests();
  return new Proxy(repo, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property === "closeAuctionAtomic" && typeof value === "function") {
        return (input: Record<string, unknown>) => {
          captured.push(input);
          return (value as (arg: unknown) => unknown).call(target, input);
        };
      }
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
}

test("U-3 · a base passada a closeAuctionAtomic tem expectedDailyCount = 90, o enteredAt do processo e frozenAt = occurredAt da mesma chamada", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await driveViaRepository(ctx, "AUCTIONED");
  const frozenBeforeClose = (await processOf(ctx)).frozenAt;
  const captured: Record<string, unknown>[] = [];
  await auctionServiceWith({ repository: captureRepository(captured) }).closeAuction(who(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
  const input = captured[0] as { chargeBasis?: { expectedDailyCount: number; enteredAt?: Date | null; frozenAt?: Date }; occurredAt: Date } | undefined;
  assert.deepEqual(
    {
      chamado: captured.length,
      arremateDeixouSemCongelar: frozenBeforeClose === undefined,
      temBase: input?.chargeBasis !== undefined,
      esperado: input?.chargeBasis?.expectedDailyCount,
      entrada: input?.chargeBasis?.enteredAt?.getTime(),
      congelamentoIgualAoInstante: input !== undefined && input.chargeBasis?.frozenAt?.getTime() === input.occurredAt.getTime(),
    },
    { chamado: 1, arremateDeixouSemCongelar: true, temBase: true, esperado: 90, entrada: ctx.enteredAt.getTime(), congelamentoIgualAoInstante: true },
  );
});

// U-3b saiu (E9.1): o legado congelado não guarda mais o `frozen_at` antigo; o caso que o substitui é o W1.

test("U-4 · liquidação com a porta chargeState devolvendo undefined: 409 settlement_gate_unresolved; nada gravado", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await driveViaRepository(ctx, "AUCTION_CLOSED");
  const result = await outcome(settlementServiceWith({ chargeState: async () => undefined }).distribute(who(ctx), ctx.processId, {}));
  const stored = await getMemoryAuctionSettlementRepositoryForTests().getByProcess(ctx.tenantId, ctx.processId);
  assert.deepEqual({ resultado: result, liquidacaoGravada: stored !== undefined }, { resultado: "409 settlement_gate_unresolved", liquidacaoGravada: false });
});

test("U-5 · liquidação com closeDailies que não lança e 90 diárias devidas: 409 settlement_daily_charges_missing; nada gravado", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await driveViaRepository(ctx, "AUCTION_CLOSED");
  const result = await outcome(settlementServiceWith({ closeDailies: NO_OP_CLOSING }).distribute(who(ctx), ctx.processId, {}));
  const stored = await getMemoryAuctionSettlementRepositoryForTests().getByProcess(ctx.tenantId, ctx.processId);
  assert.deepEqual({ resultado: result, liquidacaoGravada: stored !== undefined }, { resultado: "409 settlement_daily_charges_missing", liquidacaoGravada: false });
});

// ─────────────────────────────────────────────── E: a elegibilidade exige as diárias (E3.3) ───────────────────────────────────────────────

test("E1 · elegibilidade sem serviço de diária: 409 auction_daily_charges_unpostable; segue ACTIVE_CUSTODY; nenhum evento novo", async () => {
  const ctx = await scenario({ tariff: false });
  const eventsBefore = (await eventTypes(ctx)).length;
  const result = await outcome(createMemoryAuctionService().markEligible(who(ctx), ctx.processId));
  assert.deepEqual(
    { resultado: result, estado: (await processOf(ctx)).status, eventosNovos: (await eventTypes(ctx)).length - eventsBefore },
    { resultado: "409 auction_daily_charges_unpostable", estado: "ACTIVE_CUSTODY", eventosNovos: 0 },
  );
});

test("E2 · elegibilidade com tarifa e 0 diárias: lança as 90, fica elegível e NÃO congela", async () => {
  const ctx = await scenario();
  const view = await createMemoryAuctionService().markEligible(who(ctx), ctx.processId);
  assert.deepEqual(
    { estado: view.status, diarias: await dailyCount(ctx), congelado: (await processOf(ctx)).frozenAt !== undefined },
    { estado: "AUCTION_ELIGIBLE", diarias: 90, congelado: false },
  );
});

test("E3 · elegibilidade com closeDailies que não lança e 90 diárias devidas: 409 auction_daily_charges_missing (90, não 3: o prazo de 60 dias vem antes)", async () => {
  const ctx = await scenario();
  const result = await outcome(auctionServiceWith({ closeDailies: NO_OP_CLOSING }).markEligible(who(ctx), ctx.processId));
  assert.deepEqual({ resultado: result, estado: (await processOf(ctx)).status }, { resultado: "409 auction_daily_charges_missing", estado: "ACTIVE_CUSTODY" });
});

test("E4 · ordem: sem tarifa E com menos de 60 dias, a razão é auction_deadline_not_reached (os portões de hoje vêm antes)", async () => {
  const ctx = await scenario({ tariff: false, days: 30 });
  assert.equal(await outcome(createMemoryAuctionService().markEligible(who(ctx), ctx.processId)), "409 auction_deadline_not_reached");
});

// ─────────────────────────────────────────────── C: custódia documentada (E6.1) ───────────────────────────────────────────────

test("C1 · controle: seis portões, vistoria completa, pátio, remoção e tarifa: fica elegível", async () => {
  const ctx = await scenario();
  assert.equal((await createMemoryAuctionService().markEligible(who(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
});

test("C2 · sem vistoria completa: 409 auction_custody_inspection_incomplete; completa e tenta de novo: passa", async () => {
  const ctx = await scenario({ inspection: false });
  const auction = createMemoryAuctionService();
  const first = await outcome(auction.markEligible(who(ctx), ctx.processId));
  assert.deepEqual({ resultado: first, estado: (await processOf(ctx)).status }, { resultado: "409 auction_custody_inspection_incomplete", estado: "ACTIVE_CUSTODY" });
  await completeInspection(ctx);
  assert.equal((await auction.markEligible(who(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
});

test("C3 · sem pátio: 409 auction_custody_yard_missing; atribui o pátio e tenta de novo: passa", async () => {
  const ctx = await scenario({ yard: false });
  const auction = createMemoryAuctionService();
  const first = await outcome(auction.markEligible(who(ctx), ctx.processId));
  assert.deepEqual({ resultado: first, estado: (await processOf(ctx)).status }, { resultado: "409 auction_custody_yard_missing", estado: "ACTIVE_CUSTODY" });
  await assignYard(ctx);
  assert.equal((await auction.markEligible(who(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
});

test("C4 · sem remoção lançada: 409 auction_custody_removal_charge_missing; lança a remoção e tenta de novo: passa", async () => {
  const ctx = await scenario({ removal: false });
  const auction = createMemoryAuctionService();
  const first = await outcome(auction.markEligible(who(ctx), ctx.processId));
  assert.deepEqual({ resultado: first, estado: (await processOf(ctx)).status }, { resultado: "409 auction_custody_removal_charge_missing", estado: "ACTIVE_CUSTODY" });
  await addRemoval(ctx);
  assert.equal((await auction.markEligible(who(ctx), ctx.processId)).status, "AUCTION_ELIGIBLE");
});

test("C5 · ordem: faltam vistoria, pátio, remoção E tarifa: a razão é a da vistoria", async () => {
  const ctx = await scenario({ inspection: false, yard: false, removal: false, tariff: false });
  assert.equal(await outcome(createMemoryAuctionService().markEligible(who(ctx), ctx.processId)), "409 auction_custody_inspection_incomplete");
});

test("C6 · lote de processo em AUCTION_PREP sem pátio: 409 auction_custody_yard_missing; segue AUCTION_PREP", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", yard: false });
  await driveViaRepository(ctx, "AUCTION_PREP");
  const result = await outcome(createMemoryAuctionService().lotForAuction(who(ctx), ctx.processId, { round_number: 1 }));
  assert.deepEqual({ resultado: result, estado: (await processOf(ctx)).status }, { resultado: "409 auction_custody_yard_missing", estado: "AUCTION_PREP" });
});

test("C7 · função pura custodyDocumentationGap: a razão certa nas 8 combinações", async () => {
  const module = (await import("../src/modules/auction/auction.custody-documentation.js")) as {
    custodyDocumentationGap: (input: { inspectionComplete: boolean; yardAssigned: boolean; removalPosted: boolean }) => string | undefined;
  };
  const table: Array<[boolean, boolean, boolean, string | undefined]> = [
    [true, true, true, undefined],
    [false, true, true, "auction_custody_inspection_incomplete"],
    [true, false, true, "auction_custody_yard_missing"],
    [true, true, false, "auction_custody_removal_charge_missing"],
    [false, false, true, "auction_custody_inspection_incomplete"],
    [false, true, false, "auction_custody_inspection_incomplete"],
    [true, false, false, "auction_custody_yard_missing"],
    [false, false, false, "auction_custody_inspection_incomplete"],
  ];
  for (const [inspectionComplete, yardAssigned, removalPosted, expected] of table) {
    assert.equal(module.custodyDocumentationGap({ inspectionComplete, yardAssigned, removalPosted }), expected, JSON.stringify({ inspectionComplete, yardAssigned, removalPosted }));
  }
});

// ─────────────────────────────────────────────── Q: quitação e lista do leilão (E5.2, E5.3) ───────────────────────────────────────────────

test("Q1 · em preparação e quitado: o lote recusa 409 auction_debts_settled; withdraw-settled devolve à custódia com o motivo na cadeia; a liberação segue até o fim", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await driveViaRepository(ctx, "AUCTION_PREP");
  await quitAll(ctx);
  const auction = createMemoryAuctionService();
  const lot = await outcome(auction.lotForAuction(who(ctx), ctx.processId, { round_number: 1 }));
  assert.deepEqual({ lote: lot, estado: (await processOf(ctx)).status }, { lote: "409 auction_debts_settled", estado: "AUCTION_PREP" });
  const withdrawn = await (auction as unknown as WithdrawCapable).withdrawSettled(who(ctx), ctx.processId, {});
  assert.equal(withdrawn.status, "ACTIVE_CUSTODY");
  const events = await getMemoryImpoundRepositoryForTests().listEvents(ctx.tenantId, ctx.processId);
  assert.equal(events.some((event) => (event.payload as { reason?: unknown }).reason === "settled_before_auction"), true, "motivo settled_before_auction na cadeia");
  const release = createMemoryReleaseService();
  await release.start(who(ctx) as never, ctx.processId, { recipient_name: "Dono" });
  await release.approve(who(ctx) as never, ctx.processId, { authority_reference: "AUT-1" });
  await release.consume(who(ctx) as never, ctx.processId);
  assert.equal((await processOf(ctx)).status, "RELEASED");
});

test("Q2 · em lote: a quitação recusa 409 settle_after_auction_list; nenhuma linha quitada; nenhum SETTLEMENT na cadeia", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await driveViaRepository(ctx, "LOTTED");
  const result = await outcome(createMemoryChargeService().settle(who(ctx), ctx.processId, { note: "tentativa depois da lista" }));
  assert.deepEqual(
    { resultado: result, quitadas: (await lines(ctx)).filter((line) => line.settledAt).length, eventosSettlement: (await eventTypes(ctx)).filter((type) => type === "SETTLEMENT").length },
    { resultado: "409 settle_after_auction_list", quitadas: 0, eventosSettlement: 0 },
  );
});

test("Q2b · em AUCTIONED e em AUCTION_CLOSED: a quitação recusa 409 settle_after_auction_list", async () => {
  const results: Record<string, string> = {};
  for (const to of ["AUCTIONED", "AUCTION_CLOSED"] as const) {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    await driveViaRepository(ctx, to);
    results[to] = await outcome(createMemoryChargeService().settle(who(ctx), ctx.processId, {}));
  }
  assert.deepEqual(results, { AUCTIONED: "409 settle_after_auction_list", AUCTION_CLOSED: "409 settle_after_auction_list" });
});

// E10.1: Q2c é CONTROLE (verde antes e depois). A cobrança on-line só nasce em liberação; nos três estados o portão de
// hoje já recusa com 422 release_not_started. Os estados são gravados pela transição da custódia (o serviço de cobrança
// on-line só lê o estado do processo e a liberação ativa).
test("Q2c · controle: em LOTTED, AUCTIONED e AUCTION_CLOSED a criação de cobrança on-line recusa 422 release_not_started", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  const port: PaymentConnectionPort = { resolve: async (tenantId) => ({ ok: true, account: { scope: "organization", connectionId: randomUUID(), ownerTenantId: tenantId }, provider: "asaas", methods: PAYMENT_METHODS }) };
  const payments = createMemoryImpoundPaymentService({ connections: port, gate: { isEnabled: async () => true } });
  const observed: Record<string, string> = {};
  let from = "AUCTION_ELIGIBLE";
  for (const to of ["LOTTED", "AUCTIONED", "AUCTION_CLOSED"] as const) {
    await getMemoryImpoundRepositoryForTests().applyTransition({
      tenantId: ctx.tenantId,
      processId: ctx.processId,
      expectedFrom: from,
      to,
      setEnteredAt: false,
      setFrozenAt: to === "AUCTION_CLOSED",
      event: { type: "STATUS_CHANGE", payload: { from, to, reason: "controle" }, occurredAt: new Date(), actorId: undefined },
    } as never);
    from = to;
    observed[to] = await outcome(payments.create({ tenantId: ctx.tenantId, userId: ctx.userId, roles: ["manager"], permissions: [] }, ctx.processId, { payerName: "Maria da Silva", payerDocument: "529.982.247-25" }));
  }
  assert.deepEqual(observed, { LOTTED: "422 release_not_started", AUCTIONED: "422 release_not_started", AUCTION_CLOSED: "422 release_not_started" });
});

test("Q3 · controle: elegível e em preparação, a quitação é aceita", async () => {
  const results: Record<string, string> = {};
  {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    results.elegivel = await outcome(createMemoryChargeService().settle(who(ctx), ctx.processId, {}));
  }
  {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
    await driveViaRepository(ctx, "AUCTION_PREP");
    results.preparacao = await outcome(createMemoryChargeService().settle(who(ctx), ctx.processId, {}));
  }
  assert.deepEqual(results, { elegivel: "aceito", preparacao: "aceito" });
});

test("Q4 · elegível e quitado: a preparação recusa 409 auction_debts_settled; withdraw-settled devolve à custódia", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await quitAll(ctx);
  const auction = createMemoryAuctionService();
  await auction.registerEdict(who(ctx), ctx.processId, { round_number: 1, classification: "CONSERVED", edict_reference: "EDITAL-1/2026", published_at: new Date().toISOString(), business_days: 15 });
  await auction.setAppraisal(who(ctx), ctx.processId, { round_number: 1, appraisal_amount: "10000.00", min_bid_amount: "5000.00" });
  const prep = await outcome(auction.prepareForAuction(who(ctx), ctx.processId, { round_number: 1 }));
  assert.deepEqual({ preparacao: prep, estado: (await processOf(ctx)).status }, { preparacao: "409 auction_debts_settled", estado: "AUCTION_ELIGIBLE" });
  const withdrawn = await (auction as unknown as WithdrawCapable).withdrawSettled(who(ctx), ctx.processId, {});
  assert.equal(withdrawn.status, "ACTIVE_CUSTODY");
});

test("Q5 · withdraw-settled com débito em aberto: 409 auction_withdraw_not_settled; estado intocado", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  const result = await outcome((createMemoryAuctionService() as unknown as WithdrawCapable).withdrawSettled(who(ctx), ctx.processId, {}));
  assert.deepEqual({ resultado: result, estado: (await processOf(ctx)).status }, { resultado: "409 auction_withdraw_not_settled", estado: "AUCTION_ELIGIBLE" });
});

test("Q6 · pagou parte antes da lista e não quitou: vai a leilão; o crédito do pátio é só o em aberto (1600.00) e o saldo 6400.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  const charge = createMemoryChargeService();
  await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(Date.now() - 40 * MS_PER_DAY), ctx.userId);
  await charge.settle(who(ctx), ctx.processId, { note: "pagou a remoção e 50 diárias" });
  const auction = createMemoryAuctionService();
  await lotViaService(ctx, auction);
  await auction.recordSale(who(ctx), ctx.processId, saleBody());
  await auction.closeAuction(who(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
  const dist = await createMemoryAuctionSettlementService().distribute(who(ctx), ctx.processId, {});
  assert.deepEqual(cascadeOf(dist), { creditoDoPatio: "1600.00", saldoDoExDono: "6400.00", somaDoRateioIgualAoLance: true });
});

test("Q7 · withdraw-settled a partir de LOTTED: 409 invalid_transition; segue LOTTED", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE" });
  await driveViaRepository(ctx, "LOTTED");
  const result = await outcome((createMemoryAuctionService() as unknown as WithdrawCapable).withdrawSettled(who(ctx), ctx.processId, {}));
  assert.deepEqual({ resultado: result, estado: (await processOf(ctx)).status }, { resultado: "409 invalid_transition", estado: "LOTTED" });
});

// ─────────────────────────────────────────────── F1b: o congelamento legado (Emendas 8 e 9) ───────────────────────────────────────────────

// O legado que o código antigo deixava, SEMEADO sem os atômicos do leilão (como o SQL do `-db`): as linhas de leilão vão
// direto às listas do repositório em memória e o congelamento é gravado pela transição do repositório de custódia com o
// instante antigo (`setFrozenAt`, o mesmo campo que o código antigo usava). Entrada há 10 dias e 2 h, `frozen_at` de
// 5 dias atrás e as 5 diárias que o motor de hoje lança até o congelamento.
const LEGACY_FROZEN_DAYS = 5;

type MemoryAuctionLists = { attempts: Array<Record<string, unknown>>; edicts: Array<Record<string, unknown>> };

function memoryLists(): MemoryAuctionLists {
  return getMemoryAuctionRepositoryForTests() as unknown as MemoryAuctionLists;
}

function pushAttempt(ctx: Ctx, round: number, outcome: "SOLD" | "NO_PAYMENT", defaultedSaleRound?: number): void {
  const now = new Date();
  memoryLists().attempts.push({
    id: randomUUID(),
    tenantId: ctx.tenantId,
    processId: ctx.processId,
    roundNumber: round,
    outcome,
    ...(outcome === "SOLD" ? { winnerRef: `Arrematante ${round}`, soldAmount: "8000.00", saleNoteReference: `NOTA-${round}` } : { defaultedSaleRound }),
    createdAt: now,
    updatedAt: now,
  });
}

function pushLottedEdict(ctx: Ctx, round: number): void {
  const now = new Date();
  memoryLists().edicts.push({
    id: randomUUID(),
    tenantId: ctx.tenantId,
    processId: ctx.processId,
    roundNumber: round,
    classification: "CONSERVED",
    appraisalAmount: "10000.00",
    minBidAmount: "5000.00",
    edictReference: `EDITAL-${round}/2026`,
    publishedAt: new Date(Date.now() - 30 * MS_PER_DAY),
    businessDays: 15,
    status: "LOTTED",
    createdAt: now,
    updatedAt: now,
  });
}

// Grava o congelamento antigo com uma transição do repositório de custódia (de `from` para `to`; pode ser o mesmo estado).
async function freezeLegacy(ctx: Ctx, from: string, to: string): Promise<Date> {
  const legacy = new Date(Date.now() - LEGACY_FROZEN_DAYS * MS_PER_DAY);
  await getMemoryImpoundRepositoryForTests().applyTransition({
    tenantId: ctx.tenantId,
    processId: ctx.processId,
    expectedFrom: from,
    to,
    setEnteredAt: false,
    setFrozenAt: true,
    event: { type: "STATUS_CHANGE", payload: { from, to, reason: "legado" }, occurredAt: legacy, actorId: undefined },
  } as never);
  await createMemoryChargeService().accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
  return legacy;
}

async function lastEventAt(ctx: Ctx, type: string): Promise<number | undefined> {
  const events = await getMemoryImpoundRepositoryForTests().listEvents(ctx.tenantId, ctx.processId);
  return events.filter((event) => event.type === type).at(-1)?.occurredAt.getTime();
}

async function dailySeqs(ctx: Ctx): Promise<number[]> {
  return (await lines(ctx))
    .filter((line) => line.kind === "DAILY")
    .map((line) => line.periodSeq ?? -1)
    .sort((a, b) => a - b);
}

async function dailyTotal(ctx: Ctx): Promise<string> {
  const cents = (await lines(ctx)).filter((line) => line.kind === "DAILY").reduce((acc, line) => acc + Math.round(Number(line.totalAmount) * 100), 0);
  return (cents / 100).toFixed(2);
}

test("V1 · (C2-07) resgate de processo em lote congelado há 5 dias (5 diárias): frozen_at nulo logo depois do resgate; a liberação lança até 10 diárias, total 400.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", days: 10 });
  await driveViaRepository(ctx, "LOTTED");
  await freezeLegacy(ctx, "LOTTED", "LOTTED");
  assert.equal(await dailyCount(ctx), 5, "pré-condição: 5 diárias até o congelamento");
  await createMemoryAuctionService().reclaim(who(ctx), ctx.processId, { reason: "Dono apresentou a documentação" });
  const afterReclaim = { estado: (await processOf(ctx)).status, congelado: (await processOf(ctx)).frozenAt !== undefined };
  const start = await outcome(createMemoryReleaseService().start(who(ctx) as never, ctx.processId, { recipient_name: "Dono" }));
  assert.deepEqual(
    { afterReclaim, liberacao: start, diarias: await dailyCount(ctx), totalDiarias: await dailyTotal(ctx) },
    { afterReclaim: { estado: "ACTIVE_CUSTODY", congelado: false }, liberacao: "aceito", diarias: 10, totalDiarias: "400.00" },
  );
});

test("V3 · inadimplência de processo arrematado e congelado há 5 dias: volta ao lote com frozen_at nulo", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", days: 10 });
  await driveViaRepository(ctx, "LOTTED");
  pushAttempt(ctx, 1, "SOLD");
  await freezeLegacy(ctx, "LOTTED", "AUCTIONED");
  const result = await createMemoryAuctionService().defaultAuction(who(ctx), ctx.processId, { round_number: 2 });
  assert.deepEqual(
    { resposta: result.status, criado: result.created, estado: (await processOf(ctx)).status, congelado: (await processOf(ctx)).frozenAt !== undefined },
    { resposta: "LOTTED", criado: true, estado: "LOTTED", congelado: false },
  );
});

test("W1 · legado AUCTIONED congelado há 5 dias (venda de 8000.00, 5 diárias), pagamento confirmado agora: frozen_at = instante do encerramento; 10 diárias, period_seq 1 a 10; crédito 550.00, saldo 7450.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", days: 10 });
  await driveViaRepository(ctx, "LOTTED");
  pushAttempt(ctx, 1, "SOLD");
  await freezeLegacy(ctx, "LOTTED", "AUCTIONED");
  assert.equal(await dailyCount(ctx), 5, "pré-condição: 5 diárias no livro");
  await createMemoryAuctionService().closeAuction(who(ctx), ctx.processId, { round_number: 1, payment_confirmed: true });
  const frozenAtClose = (await processOf(ctx)).frozenAt?.getTime() === (await lastEventAt(ctx, "AUCTION_CLOSED"));
  const seqs = await dailySeqs(ctx);
  const dist = await createMemoryAuctionSettlementService().distribute(who(ctx), ctx.processId, {});
  assert.deepEqual(
    { congelamentoNoEncerramento: frozenAtClose, seqs, ...cascadeOf(dist) },
    { congelamentoNoEncerramento: true, seqs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], creditoDoPatio: "550.00", saldoDoExDono: "7450.00", somaDoRateioIgualAoLance: true },
  );
});

test("W2 · ESTADO SEMEADO (P-LEILAO-REVENDA-SEM-CAMINHO): legado LOTTED congelado há 5 dias, venda antiga e inadimplência gravadas, rodada 3 em lote: o recordSale descongela e lança 10; o encerramento congela no instante dele; crédito 550.00", async () => {
  const ctx = await scenario({ status: "AUCTION_ELIGIBLE", days: 10 });
  await driveViaRepository(ctx, "LOTTED");
  pushAttempt(ctx, 1, "SOLD");
  pushAttempt(ctx, 2, "NO_PAYMENT", 1);
  getMemoryAuctionRepositoryForTests().mutateEdictForTests(ctx.tenantId, ctx.processId, 1, { status: "CLOSED" } as never);
  pushLottedEdict(ctx, 3);
  await freezeLegacy(ctx, "LOTTED", "LOTTED");
  assert.equal(await dailyCount(ctx), 5, "pré-condição: 5 diárias no livro");
  const auction = createMemoryAuctionService();
  const sale = await outcome(auction.recordSale(who(ctx), ctx.processId, saleBody("8000.00", 3)));
  const afterSale = { arremate: sale, congelado: (await processOf(ctx)).frozenAt !== undefined, diarias: await dailyCount(ctx) };
  await auction.closeAuction(who(ctx), ctx.processId, { round_number: 3, payment_confirmed: true });
  const frozenAtClose = (await processOf(ctx)).frozenAt?.getTime() === (await lastEventAt(ctx, "AUCTION_CLOSED"));
  const seqs = await dailySeqs(ctx);
  const dist = await createMemoryAuctionSettlementService().distribute(who(ctx), ctx.processId, {});
  assert.deepEqual(
    { afterSale, congelamentoNoEncerramento: frozenAtClose, seqs, ...cascadeOf(dist) },
    { afterSale: { arremate: "aceito", congelado: false, diarias: 10 }, congelamentoNoEncerramento: true, seqs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], creditoDoPatio: "550.00", saldoDoExDono: "7450.00", somaDoRateioIgualAoLance: true },
  );
});

for (const [id, missing, reason] of [
  ["W3-D", "inspection", "auction_custody_inspection_incomplete"],
  ["W3-E", "yard", "auction_custody_yard_missing"],
  ["W3-G", "removal", "auction_custody_removal_charge_missing"],
] as const) {
  test(`${id} · legado LOTTED com tarifa e diárias em dia, sem ${missing}: o arremate recusa 409 ${reason}; segue LOTTED; nenhum SOLD; cadeia igual; completa e tenta de novo: vende`, async () => {
    const ctx = await scenario({ status: "AUCTION_ELIGIBLE", [missing]: false });
    // O lote SEMEADO (sem os portões do lote): edital e avaliação pelo repositório, a rodada marcada em lote e a
    // transição gravada na custódia.
    const repo = getMemoryAuctionRepositoryForTests();
    const base = { tenantId: ctx.tenantId, processId: ctx.processId, actorId: ctx.userId };
    await repo.registerEdictAtomic({ ...base, roundNumber: 1, classification: "CONSERVED", edictReference: "EDITAL-1/2026", publishedAt: new Date(Date.now() - 30 * MS_PER_DAY), businessDays: 15, occurredAt: new Date() } as never);
    await repo.setAppraisalAtomic({ ...base, roundNumber: 1, appraisalAmount: "10000.00", minBidAmount: "5000.00" } as never);
    repo.mutateEdictForTests(ctx.tenantId, ctx.processId, 1, { status: "LOTTED" } as never);
    await getMemoryImpoundRepositoryForTests().applyTransition({
      tenantId: ctx.tenantId,
      processId: ctx.processId,
      expectedFrom: "AUCTION_ELIGIBLE",
      to: "LOTTED",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "STATUS_CHANGE", payload: { from: "AUCTION_ELIGIBLE", to: "LOTTED", reason: "legado" }, occurredAt: new Date(), actorId: undefined },
    });
    await createMemoryChargeService().accrueProcess(ctx.tenantId, ctx.processId, new Date(), ctx.userId);
    const eventsBefore = (await eventTypes(ctx)).length;
    const auction = createMemoryAuctionService();
    const first = await outcome(auction.recordSale(who(ctx), ctx.processId, saleBody()));
    const sold = ((await repo.getState(ctx.tenantId, ctx.processId))?.attempts ?? []).filter((attempt) => attempt.outcome === "SOLD").length;
    const afterFirst = { resultado: first, estado: (await processOf(ctx)).status, vendas: sold, eventosNovos: (await eventTypes(ctx)).length - eventsBefore };
    if (missing === "inspection") await completeInspection(ctx);
    if (missing === "yard") await assignYard(ctx);
    if (missing === "removal") await addRemoval(ctx);
    const retry = await outcome(auction.recordSale(who(ctx), ctx.processId, saleBody()));
    assert.deepEqual(
      { afterFirst, depoisDeCompletar: retry, estadoFinal: (await processOf(ctx)).status },
      { afterFirst: { resultado: `409 ${reason}`, estado: "LOTTED", vendas: 0, eventosNovos: 0 }, depoisDeCompletar: "aceito", estadoFinal: "AUCTIONED" },
    );
  });
}
