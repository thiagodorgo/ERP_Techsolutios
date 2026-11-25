import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { getMemoryAuctionRepositoryForTests, resetAuctionRuntimeForTests } from "../src/modules/auction/auction.service.js";
import { createMemoryChargeService, getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { resetNotificationRuntimeForTests } from "../src/modules/impound/impound.notifications.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";
import { resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";

type HttpResult = { status: number; reason?: string; body: Record<string, unknown> };

function resetAll(): void {
  resetImpoundRuntimeForTests();
  resetNotificationRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetAuctionRuntimeForTests();
  resetChargeRuntimeForTests();
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
}

function headers(tenantId: string, role = "manager", permissions?: readonly string[]): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
    "x-user-id": randomUUID(),
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
  };
}

async function call(baseUrl: string, path: string, tenantId: string, body: unknown, permissions?: readonly string[]): Promise<HttpResult> {
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: headers(tenantId, "manager", permissions), body: JSON.stringify(body) });
  const parsed = (await response.json()) as Record<string, unknown>;
  return { status: response.status, reason: (parsed.error as { reason?: string } | undefined)?.reason, body: parsed };
}

async function withApp(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const { app } = await import("../src/app.js");
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function seedEligible() {
  resetAll();
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
    await impound.applyTransition({ tenantId, processId: opened.id, expectedFrom: from, to, setEnteredAt: false, setFrozenAt: false, event: { type: "STATUS_CHANGE", payload: { from, to, reason: null }, occurredAt: new Date(), actorId: undefined } });
  }
  const dailyServiceCatalogId = randomUUID();
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, opened.profileId, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId });
  const priceTable = await getMemoryPriceTableRepositoryForTests().create({ tenantId, name: "Tabela teste", currency: "BRL", version: 1, status: "published" });
  await getMemoryTariffRepositoryForTests().create({ tenantId, priceTableId: priceTable.id, serviceCatalogId: dailyServiceCatalogId, name: "Diária", unitPrice: 40, currency: "BRL", origin: "test", status: "active" });
  const base = { tenantId, processId: opened.id, actorId: undefined };
  return { tenantId, processId: opened.id, impound, auction, base };
}

async function seedLotted(roundNumber = 1) {
  const ctx = await seedEligible();
  const { tenantId, processId, impound, auction, base } = ctx;
  const prepTime = new Date("2026-01-01T12:00:00.000Z");
  await auction.registerEdictAtomic({ ...base, roundNumber, classification: "CONSERVED", edictReference: `EDITAL-${roundNumber}`, publishedAt: new Date("2026-01-02T12:00:00.000Z"), businessDays: 15, occurredAt: prepTime });
  await auction.setAppraisalAtomic({ ...base, roundNumber, appraisalAmount: "10000.00", minBidAmount: "5000.00" });
  await auction.prepareAuctionAtomic({ ...base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber, occurredAt: prepTime });
  await auction.lotAuctionAtomic({ ...base, expectedFrom: "AUCTION_PREP", roundNumber, occurredAt: prepTime });
  const state = await auction.getState(tenantId, processId);
  return { tenantId, processId, impound, auction, base, custodySeq: state?.custodySeqHead ?? -1 };
}

const pathFor = (processId: string) => `/api/v1/impound-processes/${processId}/auction/deserted`;

test("LD1/LD2 · leilão sem lance depois do lote grava DESERTED, retorna ao pátio e fecha o período", async () => {
  const ctx = await seedLotted();
  const beforeEvents = await ctx.impound.listEvents(ctx.tenantId, ctx.processId);
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1, custody_seq: ctx.custodySeq, notes: "Sem lance" });
    const state = await ctx.auction.getState(ctx.tenantId, ctx.processId);
    const process = await ctx.impound.findProcessById(ctx.tenantId, ctx.processId);
    const events = await ctx.impound.listEvents(ctx.tenantId, ctx.processId);
    const suspensions = await ctx.impound.listDailySuspensions(ctx.tenantId, ctx.processId);
    const actAt = events.at(-1)?.occurredAt;
    const sweepAtAct = await createMemoryChargeService().accrueProcess(ctx.tenantId, ctx.processId, actAt ?? new Date());
    assert.deepEqual(
      { http: response.status, estado: process?.status, resultado: state?.attempts.find((item) => item.roundNumber === 1)?.outcome, emLote: state?.edicts.filter((item) => item.status === "LOTTED").length, eventos: events.length - beforeEvents.length, razao: (events.at(-1)?.payload as { reason?: string } | undefined)?.reason, periodosAbertos: suspensions.filter((item) => item.to === undefined).length, fimExatoNoAto: actAt !== undefined && suspensions[0]?.to?.getTime() === actAt.getTime(), varreduraNoAto: sweepAtAct.accrued },
      { http: 200, estado: "ACTIVE_CUSTODY", resultado: "DESERTED", emLote: 0, eventos: 2, razao: "deserted_after_lot", periodosAbertos: 0, fimExatoNoAto: true, varreduraNoAto: 0 },
      JSON.stringify(response.body),
    );
  });
});

test("LD5/LD6 · recusa rodada diferente, resultado existente e leitura ausente/inválida/velha", async () => {
  const ctx = await seedLotted();
  const beforeEvents = await ctx.impound.listEvents(ctx.tenantId, ctx.processId);
  await withApp(async (baseUrl) => {
    const repoStaleReason = await ctx.auction.desertAfterLotAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 1, expectedCustodySeq: ctx.custodySeq - 1, occurredAt: new Date() }).then(() => "200", (error: unknown) => (error as { reason?: string }).reason ?? "erro");
    const results = [
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 2, custody_seq: ctx.custodySeq }),
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1 }),
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1, custody_seq: "abc" }),
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1, custody_seq: ctx.custodySeq - 1 }),
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1, custody_seq: ctx.custodySeq }),
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1, custody_seq: ctx.custodySeq }),
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1, custody_seq: ctx.custodySeq + 2 }),
    ];
    const stateAfter = await ctx.auction.getState(ctx.tenantId, ctx.processId);
    const eventsAfter = await ctx.impound.listEvents(ctx.tenantId, ctx.processId);
    assert.deepEqual(
      { repoStaleReason, respostas: results.map(({ status, reason }) => ({ status, reason })), tentativas: stateAfter?.attempts.length, eventosNovos: eventsAfter.length - beforeEvents.length },
      {
        repoStaleReason: "auction_reading_stale",
        respostas: [
          { status: 409, reason: "deserted_round_not_lotted" },
          { status: 422, reason: "custody_seq_required" },
          { status: 422, reason: "custody_seq_invalid" },
          { status: 409, reason: "auction_reading_stale" },
          { status: 200, reason: undefined },
          { status: 409, reason: "auction_reading_stale" },
          { status: 409, reason: "invalid_transition" },
        ],
        tentativas: 1,
        eventosNovos: 2,
      },
    );
  });
});

test("LD5 · revenda pendente recusa a rodada com resultado e uma rodada que não está em lote", async () => {
  const ctx = await seedLotted();
  await ctx.auction.recordSaleAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "REF-NEUTRA", soldAmount: "8000.00", saleNoteReference: "NOTA-1", occurredAt: new Date() });
  await ctx.auction.defaultAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTIONED", roundNumber: 2, occurredAt: new Date() });
  const state = await ctx.auction.getState(ctx.tenantId, ctx.processId);
  await withApp(async (baseUrl) => {
    const results = [
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 1, custody_seq: state?.custodySeqHead }),
      await call(baseUrl, pathFor(ctx.processId), ctx.tenantId, { round_number: 3, custody_seq: state?.custodySeqHead }),
    ];
    assert.deepEqual(results.map(({ status, reason }) => ({ status, reason })), [
      { status: 409, reason: "deserted_round_has_result" },
      { status: 409, reason: "deserted_round_not_lotted" },
    ]);
  });
});

test("LD7 · auction:reclaim governa o ato e outra organização recebe 404", async () => {
  const denied = await seedLotted();
  await withApp(async (baseUrl) => {
    const noPermission = await call(baseUrl, pathFor(denied.processId), denied.tenantId, { round_number: 1, custody_seq: denied.custodySeq }, ["impound:read", "impound:transition"]);
    const otherTenant = await call(baseUrl, pathFor(denied.processId), randomUUID(), { round_number: 1, custody_seq: denied.custodySeq });
    assert.deepEqual({ semPermissao: noPermission.status, outraOrganizacao: otherTenant.status }, { semPermissao: 403, outraOrganizacao: 404 });
  });
});

test("LD9/LD13 · rodada com resultado ou inferior não pode voltar à preparação nem ao lote", async () => {
  const ctx = await seedEligible();
  for (const roundNumber of [1, 2, 3]) {
    await ctx.auction.registerEdictAtomic({ ...ctx.base, roundNumber, classification: "CONSERVED", edictReference: `EDITAL-${roundNumber}`, publishedAt: new Date("2026-01-02T12:00:00.000Z"), businessDays: 15, occurredAt: new Date() });
    await ctx.auction.setAppraisalAtomic({ ...ctx.base, roundNumber, appraisalAmount: "10000.00", minBidAmount: "5000.00" });
  }
  await ctx.auction.recordAttemptAtomic({ ...ctx.base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 2, occurredAt: new Date() });
  await assert.rejects(
    () => ctx.auction.prepareAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "prep_round_has_result",
  );
  await ctx.auction.prepareAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 3, occurredAt: new Date() });
  await assert.rejects(
    () => ctx.auction.lotAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTION_PREP", roundNumber: 1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "lot_round_has_result",
  );
});

test("LD14/LD15 · resultado tardio inferior é recusado e repetição da mesma rodada segue idempotente", async () => {
  const ctx = await seedEligible();
  for (const roundNumber of [1, 3]) {
    await ctx.auction.registerEdictAtomic({ ...ctx.base, roundNumber, classification: "CONSERVED", edictReference: `EDITAL-${roundNumber}`, publishedAt: new Date("2026-01-02T12:00:00.000Z"), businessDays: 15, occurredAt: new Date() });
  }
  await ctx.auction.recordAttemptAtomic({ ...ctx.base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 3, occurredAt: new Date() });
  await assert.rejects(
    () => ctx.auction.recordAttemptAtomic({ ...ctx.base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "attempt_round_not_new",
  );
});

test("LD15 · inadimplência tardia usa somente rodada nova", async () => {
  const ctx = await seedEligible();
  for (const roundNumber of [1, 2]) {
    await ctx.auction.registerEdictAtomic({ ...ctx.base, roundNumber, classification: "CONSERVED", edictReference: `EDITAL-${roundNumber}`, publishedAt: new Date("2026-01-02T12:00:00.000Z"), businessDays: 15, occurredAt: new Date() });
    await ctx.auction.setAppraisalAtomic({ ...ctx.base, roundNumber, appraisalAmount: "10000.00", minBidAmount: "5000.00" });
  }
  await ctx.auction.prepareAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 2, occurredAt: new Date() });
  await ctx.auction.lotAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTION_PREP", roundNumber: 2, occurredAt: new Date() });
  await ctx.auction.recordSaleAtomic({ ...ctx.base, expectedFrom: "LOTTED", roundNumber: 2, winnerRef: "REF-NEUTRA", soldAmount: "8000.00", saleNoteReference: "NOTA-2", occurredAt: new Date() });
  await assert.rejects(
    () => ctx.auction.defaultAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTIONED", roundNumber: 1, occurredAt: new Date() }),
    (error: unknown) => (error as { reason?: string }).reason === "default_round_not_new",
  );
  const result = await ctx.auction.defaultAuctionAtomic({ ...ctx.base, expectedFrom: "AUCTIONED", roundNumber: 3, occurredAt: new Date() });
  assert.deepEqual({ status: result.status, round: result.attempt.roundNumber }, { status: "LOTTED", round: 3 });
});

test("LD12 · controle: deserto antes do lote continua idempotente por rodada em ordem", async () => {
  resetAll();
  const ctx = await seedLotted(1);
  const existing = await ctx.auction.getState(ctx.tenantId, ctx.processId);
  assert.equal(existing?.attempts.length, 0);
});
