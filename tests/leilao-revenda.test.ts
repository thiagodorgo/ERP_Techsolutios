import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";

import type { AuctionAttempt, AuctionEdict } from "../src/modules/auction/auction.types.js";
import { isResalePending } from "../src/modules/auction/auction.repository.js";
import { getMemoryAuctionRepositoryForTests, resetAuctionRuntimeForTests } from "../src/modules/auction/auction.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";

const attempt = (roundNumber: number, outcome: AuctionAttempt["outcome"], defaultedSaleRound?: number): AuctionAttempt => ({
  id: `attempt-${roundNumber}-${outcome}`,
  tenantId: "tenant-a",
  processId: "process-a",
  roundNumber,
  outcome,
  defaultedSaleRound,
  createdAt: new Date("2026-11-24T12:00:00.000Z"),
  updatedAt: new Date("2026-11-24T12:00:00.000Z"),
});

// O predicado só lê a rodada e o estado de cada edital (E2.1.5).
const edictIn = (roundNumber: number, status: AuctionEdict["status"]): AuctionEdict => ({ roundNumber, status }) as AuctionEdict;

async function seedResaleRepository() {
  resetImpoundRuntimeForTests();
  resetAuctionRuntimeForTests();
  const tenantId = randomUUID();
  const impound = getMemoryImpoundRepositoryForTests();
  const auction = getMemoryAuctionRepositoryForTests();
  const opened = await impound.openFromRemovalAtomic({ tenantId, serviceOrderId: randomUUID(), profileId: randomUUID(), originAuthority: "Autoridade solicitante", unidentifiedReason: "Identificação em apuração", completedAt: new Date("2026-01-01T12:00:00.000Z"), actorId: undefined });
  for (const [from, to] of [["RECEPTION", "ACTIVE_CUSTODY"], ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"]] as const) {
    await impound.applyTransition({ tenantId, processId: opened.id, expectedFrom: from, to, setEnteredAt: false, setFrozenAt: false, event: { type: "STATUS_CHANGE", payload: { from, to, reason: null }, occurredAt: new Date(), actorId: undefined } });
  }
  const base = { tenantId, processId: opened.id, actorId: undefined };
  await auction.registerEdictAtomic({ ...base, roundNumber: 1, classification: "CONSERVED", edictReference: "EDITAL-1", publishedAt: new Date("2026-01-02T12:00:00.000Z"), businessDays: 15, occurredAt: new Date() });
  await auction.setAppraisalAtomic({ ...base, roundNumber: 1, appraisalAmount: "10000.00", minBidAmount: "5000.00" });
  await auction.prepareAuctionAtomic({ ...base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, occurredAt: new Date() });
  await auction.lotAuctionAtomic({ ...base, expectedFrom: "AUCTION_PREP", roundNumber: 1, occurredAt: new Date() });
  await auction.recordSaleAtomic({ ...base, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "Arrematante", soldAmount: "8000.00", saleNoteReference: "NOTA-1", occurredAt: new Date() });
  await auction.defaultAuctionAtomic({ ...base, expectedFrom: "AUCTIONED", roundNumber: 2, occurredAt: new Date() });
  await auction.registerEdictAtomic({ ...base, roundNumber: 3, classification: "CONSERVED", edictReference: "EDITAL-3", publishedAt: new Date("2026-02-02T12:00:00.000Z"), businessDays: 15, occurredAt: new Date() });
  await auction.setAppraisalAtomic({ ...base, roundNumber: 3, appraisalAmount: "9000.00", minBidAmount: "4500.00" });
  const state = await auction.getState(tenantId, opened.id);
  assert.notEqual(state?.custodySeqHead, undefined);
  return { tenantId, processId: opened.id, impound, auction, base, custodySeq: state?.custodySeqHead ?? -1 };
}

function reasonOf(result: PromiseSettledResult<unknown>): string | undefined {
  return result.status === "rejected" ? (result.reason as { reason?: string }).reason : undefined;
}

test("RV3/RV18 · revenda pendente exige lote cuja rodada vendida foi inadimplida", async () => {
  const attempts = [attempt(1, "SOLD"), attempt(2, "NO_PAYMENT", 1)];
  assert.equal(isResalePending("LOTTED", attempts, [edictIn(1, "LOTTED")]), true);
  assert.equal(isResalePending("LOTTED", attempts, [edictIn(1, "CLOSED"), edictIn(3, "LOTTED")]), false);
  assert.equal(isResalePending("ACTIVE_CUSTODY", attempts, [edictIn(1, "LOTTED")]), false);
});

test("RV7/RV15 · relote grava uma vez e rejeita a leitura antiga", async () => {
  const ctx = await seedResaleRepository();
  const relotted = await ctx.auction.relotAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: ctx.custodySeq, occurredAt: new Date() });
  assert.deepEqual(
    { pendente: isResalePending(relotted.status, relotted.attempts, relotted.edicts), rodada: relotted.edicts.find((edict) => edict.status === "LOTTED")?.roundNumber },
    { pendente: false, rodada: 3 },
  );
  await assert.rejects(
    () => ctx.auction.relotAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: ctx.custodySeq, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "auction_reading_stale",
  );
});


test("RV7c · relotAtomic direto rejeita leitura velha e mantém o edital fora do lote", async () => {
  const ctx = await seedResaleRepository();
  const before = (await ctx.impound.listEvents(ctx.tenantId, ctx.processId)).length;
  await assert.rejects(
    () => ctx.auction.relotAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: ctx.custodySeq - 1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "auction_reading_stale",
  );
  assert.equal((await ctx.auction.getState(ctx.tenantId, ctx.processId))?.edicts.find((edict) => edict.roundNumber === 3)?.status, "DESIGNATED");
  assert.equal((await ctx.impound.listEvents(ctx.tenantId, ctx.processId)).length, before);
});
test("RV8 · seis relotes com a mesma leitura produzem um sucesso, um edital em lote e um evento", async () => {
  const ctx = await seedResaleRepository();
  const settled = await Promise.allSettled(Array.from({ length: 6 }, () => ctx.auction.relotAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: ctx.custodySeq, occurredAt: new Date() })));
  const state = await ctx.auction.getState(ctx.tenantId, ctx.processId);
  const events = await ctx.impound.listEvents(ctx.tenantId, ctx.processId);
  assert.deepEqual(
    { sucessos: settled.filter((item) => item.status === "fulfilled").length, recusas: settled.filter((item) => item.status === "rejected").length, todasRecusas409: settled.filter((item) => item.status === "rejected").every((item) => ["auction_reading_stale", "resale_not_pending"].includes(reasonOf(item) ?? "")), editaisEmLote: state?.edicts.filter((edict) => edict.status === "LOTTED").length, eventosRelote: events.filter((event) => event.seq > ctx.custodySeq && event.type === "AUCTION_LOTTED" && (event.payload as { round?: number }).round === 3).length },
    { sucessos: 1, recusas: 5, todasRecusas409: true, editaisEmLote: 1, eventosRelote: 1 },
  );
});

test("RV15c · reclaimAtomic rejeita leitura velha e não grava", async () => {
  const ctx = await seedResaleRepository();
  const before = (await ctx.impound.listEvents(ctx.tenantId, ctx.processId)).length;
  await assert.rejects(
    () => ctx.auction.reclaimAtomic({ ...ctx.base, expectedFrom: "LOTTED", expectedCustodySeq: ctx.custodySeq - 1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "auction_reading_stale",
  );
  assert.equal((await ctx.impound.listEvents(ctx.tenantId, ctx.processId)).length, before);
});

test("RV18 · depois do relote a pendência acaba e outra rodada não substitui a rodada em lote", async () => {
  const ctx = await seedResaleRepository();
  await ctx.auction.relotAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: ctx.custodySeq, occurredAt: new Date() });
  const current = await ctx.auction.getState(ctx.tenantId, ctx.processId);
  await assert.rejects(
    () => ctx.auction.relotAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 4, expectedCustodySeq: current?.custodySeqHead ?? -1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "resale_not_pending",
  );
  assert.equal((await ctx.auction.getState(ctx.tenantId, ctx.processId))?.edicts.find((edict) => edict.status === "LOTTED")?.roundNumber, 3);
});

