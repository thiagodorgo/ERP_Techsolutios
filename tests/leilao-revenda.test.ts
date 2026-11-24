import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";

import type { AuctionAttempt } from "../src/modules/auction/auction.types.js";
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

test("RV3/RV18 · revenda pendente exige lote cuja rodada vendida foi inadimplida", async () => {
  const attempts = [attempt(1, "SOLD"), attempt(2, "NO_PAYMENT", 1)];
  assert.equal(isResalePending("LOTTED", attempts, 1), true);
  assert.equal(isResalePending("LOTTED", attempts, 3), false);
  assert.equal(isResalePending("ACTIVE_CUSTODY", attempts, 1), false);
});

test("RV7/RV15 · relote grava uma vez e rejeita a leitura antiga", async () => {
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
  for (const [from, to] of [["RECEPTION", "ACTIVE_CUSTODY"], ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"]] as const) {
    await impound.applyTransition({
      tenantId,
      processId: opened.id,
      expectedFrom: from,
      to,
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "STATUS_CHANGE", payload: { from, to, reason: null }, occurredAt: new Date(), actorId: undefined },
    });
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
  const before = await auction.getState(tenantId, opened.id);
  assert.equal(before?.custodySeqHead === undefined, false);
  const relotted = await auction.relotAtomic({ ...base, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: before?.custodySeqHead ?? -1, occurredAt: new Date() });
  assert.deepEqual(
    { pendente: isResalePending(relotted.status, relotted.attempts, relotted.edicts.find((edict) => edict.status === "LOTTED")?.roundNumber), rodada: relotted.edicts.find((edict) => edict.status === "LOTTED")?.roundNumber },
    { pendente: false, rodada: 3 },
  );
  await assert.rejects(
    () => auction.relotAtomic({ ...base, expectedFrom: "LOTTED", roundNumber: 3, expectedCustodySeq: before?.custodySeqHead ?? -1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "auction_reading_stale",
  );
});

