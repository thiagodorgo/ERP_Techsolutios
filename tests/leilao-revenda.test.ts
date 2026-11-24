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

async function seedEligibleRepository() {
  resetImpoundRuntimeForTests();
  resetAuctionRuntimeForTests();
  const tenantId = randomUUID();
  const impound = getMemoryImpoundRepositoryForTests();
  const auction = getMemoryAuctionRepositoryForTests();
  const opened = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId: randomUUID(),
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Identificação em apuração",
    completedAt: new Date("2026-01-01T12:00:00.000Z"),
    actorId: undefined,
  });
  for (const [from, to] of [
    ["RECEPTION", "ACTIVE_CUSTODY"],
    ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"],
  ] as const) {
    await impound.applyTransition({
      tenantId,
      processId: opened.id,
      expectedFrom: from,
      to,
      setEnteredAt: false,
      setFrozenAt: false,
      event: {
        type: "STATUS_CHANGE",
        payload: { from, to, reason: null },
        occurredAt: new Date(),
        actorId: undefined,
      },
    });
  }
  return {
    tenantId,
    processId: opened.id,
    impound,
    auction,
    base: { tenantId, processId: opened.id, actorId: undefined },
  };
}

const completeEdict = (roundNumber: number) => ({
  roundNumber,
  classification: "CONSERVED" as const,
  edictReference: `EDITAL-${roundNumber}`,
  publishedAt: new Date("2026-01-02T12:00:00.000Z"),
  businessDays: 15,
  occurredAt: new Date(),
});

async function outcomeOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "aceita";
  } catch (error) {
    return (error as { reason?: string }).reason ?? "erro_sem_razao";
  }
}

async function appraisalValues(auction: ReturnType<typeof getMemoryAuctionRepositoryForTests>, tenantId: string, processId: string, roundNumber: number): Promise<string> {
  const edict = (await auction.getState(tenantId, processId))?.edicts.find((item) => item.roundNumber === roundNumber);
  return `${edict?.appraisalAmount}/${edict?.minBidAmount} ${edict?.status}`;
}

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

test("RV4m · avaliação da rodada em lote continua travada em memória", async () => {
  const ctx = await seedResaleRepository();
  const avaliacao1 = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 1,
      appraisalAmount: "12000.00",
      minBidAmount: "4000.00",
    }),
  );
  assert.deepEqual(
    {
      avaliacao1,
      edital1: await appraisalValues(ctx.auction, ctx.tenantId, ctx.processId, 1),
    },
    {
      avaliacao1: "appraisal_locked_after_lot",
      edital1: "10000.00/5000.00 LOTTED",
    },
  );
});

test("RV24 · rodada deserta não pode ser reavaliada durante a revenda; a rodada nova continua válida em memória", async () => {
  const ctx = await seedEligibleRepository();
  await ctx.auction.registerEdictAtomic({ ...ctx.base, ...completeEdict(1) });
  await ctx.auction.setAppraisalAtomic({
    ...ctx.base,
    roundNumber: 1,
    appraisalAmount: "12000.00",
    minBidAmount: "6000.00",
  });
  await ctx.auction.recordAttemptAtomic({
    ...ctx.base,
    expectedFrom: "AUCTION_ELIGIBLE",
    roundNumber: 1,
    occurredAt: new Date(),
  });
  await ctx.auction.registerEdictAtomic({ ...ctx.base, ...completeEdict(2) });
  await ctx.auction.setAppraisalAtomic({
    ...ctx.base,
    roundNumber: 2,
    appraisalAmount: "10000.00",
    minBidAmount: "5000.00",
  });
  await ctx.auction.prepareAuctionAtomic({
    ...ctx.base,
    expectedFrom: "AUCTION_ELIGIBLE",
    roundNumber: 2,
    occurredAt: new Date(),
  });
  await ctx.auction.lotAuctionAtomic({
    ...ctx.base,
    expectedFrom: "AUCTION_PREP",
    roundNumber: 2,
    occurredAt: new Date(),
  });
  await ctx.auction.recordSaleAtomic({
    ...ctx.base,
    expectedFrom: "LOTTED",
    roundNumber: 2,
    winnerRef: "Arrematante",
    soldAmount: "8000.00",
    saleNoteReference: "NOTA-2",
    occurredAt: new Date(),
  });
  await ctx.auction.defaultAuctionAtomic({
    ...ctx.base,
    expectedFrom: "AUCTIONED",
    roundNumber: 3,
    occurredAt: new Date(),
  });
  const avaliacao1 = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 1,
      appraisalAmount: "9000.00",
      minBidAmount: "4500.00",
    }),
  );
  const avaliacao3 = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 3,
      appraisalAmount: "9000.00",
      minBidAmount: "4500.00",
    }),
  );
  const edital1 = await outcomeOf(() => ctx.auction.registerEdictAtomic({ ...ctx.base, ...completeEdict(1) }));
  await ctx.auction.registerEdictAtomic({ ...ctx.base, ...completeEdict(4) });
  const avaliacao4 = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 4,
      appraisalAmount: "9000.00",
      minBidAmount: "4500.00",
    }),
  );
  assert.deepEqual(
    {
      avaliacao1,
      edital1: await appraisalValues(ctx.auction, ctx.tenantId, ctx.processId, 1),
      avaliacao3,
      edital1Registro: edital1,
      avaliacao4,
      edital4: await appraisalValues(ctx.auction, ctx.tenantId, ctx.processId, 4),
    },
    {
      avaliacao1: "appraisal_round_has_result",
      edital1: "12000.00/6000.00 DESIGNATED",
      avaliacao3: "appraisal_round_has_result",
      edital1Registro: "resale_round_not_new",
      avaliacao4: "aceita",
      edital4: "9000.00/4500.00 DESIGNATED",
    },
  );
});

test("RV25 · avaliação da rodada nova exige edital antes de gravar em memória", async () => {
  const ctx = await seedResaleRepository();
  const avaliacao4SemEdital = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 4,
      appraisalAmount: "9000.00",
      minBidAmount: "4500.00",
    }),
  );
  await ctx.auction.registerEdictAtomic({ ...ctx.base, ...completeEdict(4) });
  const avaliacao4 = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 4,
      appraisalAmount: "9000.00",
      minBidAmount: "4500.00",
    }),
  );
  assert.deepEqual(
    {
      avaliacao4SemEdital,
      avaliacao4,
      editais: (await ctx.auction.getState(ctx.tenantId, ctx.processId))?.edicts.map((edict) => edict.roundNumber),
    },
    {
      avaliacao4SemEdital: "auction_edict_not_found",
      avaliacao4: "aceita",
      editais: [1, 3, 4],
    },
  );
});

test("RV26 · avaliação de rodada com resultado é recusada no elegível, na preparação e na custódia ativa", async () => {
  const ctx = await seedEligibleRepository();
  await ctx.auction.registerEdictAtomic({ ...ctx.base, ...completeEdict(1) });
  await ctx.auction.setAppraisalAtomic({
    ...ctx.base,
    roundNumber: 1,
    appraisalAmount: "12000.00",
    minBidAmount: "6000.00",
  });
  await ctx.auction.recordAttemptAtomic({
    ...ctx.base,
    expectedFrom: "AUCTION_ELIGIBLE",
    roundNumber: 1,
    occurredAt: new Date(),
  });
  const elegivel = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 1,
      appraisalAmount: "11000.00",
      minBidAmount: "5500.00",
    }),
  );
  const valores1Elegivel = await appraisalValues(ctx.auction, ctx.tenantId, ctx.processId, 1);
  await ctx.auction.registerEdictAtomic({ ...ctx.base, ...completeEdict(2) });
  const nova2 = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 2,
      appraisalAmount: "10000.00",
      minBidAmount: "5000.00",
    }),
  );
  await ctx.auction.prepareAuctionAtomic({
    ...ctx.base,
    expectedFrom: "AUCTION_ELIGIBLE",
    roundNumber: 2,
    occurredAt: new Date(),
  });
  const preparacao = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 1,
      appraisalAmount: "1.00",
      minBidAmount: "1.00",
    }),
  );
  const valores1Prep = await appraisalValues(ctx.auction, ctx.tenantId, ctx.processId, 1);
  await ctx.auction.lotAuctionAtomic({
    ...ctx.base,
    expectedFrom: "AUCTION_PREP",
    roundNumber: 2,
    occurredAt: new Date(),
  });
  await ctx.auction.recordSaleAtomic({
    ...ctx.base,
    expectedFrom: "LOTTED",
    roundNumber: 2,
    winnerRef: "Arrematante",
    soldAmount: "8000.00",
    saleNoteReference: "NOTA-2",
    occurredAt: new Date(),
  });
  await ctx.auction.defaultAuctionAtomic({
    ...ctx.base,
    expectedFrom: "AUCTIONED",
    roundNumber: 3,
    occurredAt: new Date(),
  });
  const seq = (await ctx.auction.getState(ctx.tenantId, ctx.processId))?.custodySeqHead ?? -1;
  await ctx.auction.reclaimAtomic({
    ...ctx.base,
    expectedFrom: "LOTTED",
    expectedCustodySeq: seq,
    occurredAt: new Date(),
  });
  const custodia = await outcomeOf(() =>
    ctx.auction.setAppraisalAtomic({
      ...ctx.base,
      roundNumber: 2,
      appraisalAmount: "2.00",
      minBidAmount: "2.00",
    }),
  );
  assert.deepEqual(
    {
      elegivel,
      valores1Elegivel,
      nova2,
      preparacao,
      valores1Prep,
      estado: (await ctx.auction.getState(ctx.tenantId, ctx.processId))?.status,
      custodia,
      valores2Custodia: await appraisalValues(ctx.auction, ctx.tenantId, ctx.processId, 2),
    },
    {
      elegivel: "appraisal_round_has_result",
      valores1Elegivel: "12000.00/6000.00 DESIGNATED",
      nova2: "aceita",
      preparacao: "appraisal_round_has_result",
      valores1Prep: "12000.00/6000.00 DESIGNATED",
      estado: "ACTIVE_CUSTODY",
      custodia: "appraisal_round_has_result",
      valores2Custodia: "10000.00/5000.00 CLOSED",
    },
  );
});
