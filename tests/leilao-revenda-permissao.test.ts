import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { resetAuctionSettlementRuntimeForTests } from "../src/modules/auction/auction.settlement.service.js";
import { getMemoryAuctionRepositoryForTests, resetAuctionRuntimeForTests } from "../src/modules/auction/auction.service.js";
import { getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { resetNotificationRuntimeForTests } from "../src/modules/impound/impound.notifications.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";
import { getMemoryReleaseRepositoryForTests, resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { getMemoryYardRepositoryForTests, resetYardRuntimeForTests } from "../src/modules/yard/yard.service.js";

type HttpResult = { status: number; reason?: string; body: Record<string, unknown> };
type Resale = { tenantId: string; processId: string; custodySeq: number };

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
}

function headers(tenantId: string, role: string): Record<string, string> {
  return { "content-type": "application/json", "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": role };
}

async function call(baseUrl: string, path: string, init: { method?: string; headers: Record<string, string>; body?: unknown }): Promise<HttpResult> {
  const response = await fetch(`${baseUrl}${path}`, { method: init.method ?? "POST", headers: init.headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text) as Record<string, unknown>; } catch { body = { raw: text.slice(0, 200) }; }
  return { status: response.status, reason: (body.error as { reason?: string } | undefined)?.reason, body };
}

async function withApp(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const { app } = await import("../src/app.js");
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try { await callback(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))); }
}

async function seedResale(): Promise<Resale> {
  resetAll();
  const tenantId = randomUUID();
  const profileId = randomUUID();
  const impound = getMemoryImpoundRepositoryForTests();
  const auction = getMemoryAuctionRepositoryForTests();
  const opened = await impound.openFromRemovalAtomic({ tenantId, serviceOrderId: randomUUID(), profileId, originAuthority: "Autoridade solicitante", unidentifiedReason: "Identificação em apuração", completedAt: new Date(Date.now() - 2 * 3_600_000), actorId: undefined });
  for (const [from, to] of [["RECEPTION", "ACTIVE_CUSTODY"], ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"]] as const) {
    await impound.applyTransition({ tenantId, processId: opened.id, expectedFrom: from, to, setEnteredAt: false, setFrozenAt: false, event: { type: "STATUS_CHANGE", payload: { from, to, reason: null }, occurredAt: new Date(), actorId: undefined } });
  }
  const dailyServiceCatalogId = randomUUID();
  const table = await getMemoryPriceTableRepositoryForTests().create({ tenantId, name: "Tabela revenda", currency: "BRL", version: 1, status: "published" });
  await getMemoryTariffRepositoryForTests().create({ tenantId, priceTableId: table.id, serviceCatalogId: dailyServiceCatalogId, name: "Diária", unitPrice: 40, currency: "BRL", origin: "test", status: "active" });
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", cap: "SIX_MONTHS", dailyServiceCatalogId });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, []);
  auction.setAuctionProfileForTests(tenantId, profileId, { scope: "PUBLIC_AGREEMENT", ownerNotifDays: 10, noticeEdictDay: 30, auctionEligibleDay: 60 });
  const yard = await getMemoryYardRepositoryForTests().createYard({ tenantId, name: "Pátio Central", address: "Rua X, 1", timezone: "America/Sao_Paulo" });
  const area = await getMemoryYardRepositoryForTests().createArea({ tenantId, yardId: yard.id, kind: "BLOCK", name: "Q1" });
  const spot = await getMemoryYardRepositoryForTests().createSpot({ tenantId, areaId: area.id, code: `S-${randomUUID().slice(0, 4)}` });
  await impound.assignSpotAtomic({ tenantId, processId: opened.id, spotId: spot.id, occurredAt: new Date() });
  impound.setProfileRequiredSetsForTests(tenantId, profileId, ["FRONT"]);
  const inspection = await impound.upsertInspection({ tenantId, processId: opened.id, inspectedAt: new Date(), bodyworkState: "Sem avarias", paintState: "Original", tiresState: "Bom", internalObjects: "nenhum", missingEquipment: "nenhum", signatureStatus: "ABSENT" } as never);
  await impound.addInspectionPhoto({ tenantId, processId: opened.id, inspectionId: inspection.id, set: "FRONT", fileUrl: "https://arquivos.invalid/frente.jpg", occurredAt: new Date() });
  await impound.completeInspection({ tenantId, processId: opened.id, occurredAt: new Date() });
  await getMemoryChargeRepositoryForTests().createManualCharge({ tenantId, processId: opened.id, kind: "REMOVAL", quantity: "1.00", unitAmount: "150.00", totalAmount: "150.00", currency: "BRL", occurredAt: new Date() });
  const base = { tenantId, processId: opened.id, actorId: undefined };
  await auction.registerEdictAtomic({ ...base, roundNumber: 1, classification: "CONSERVED", edictReference: "EDITAL-1", publishedAt: new Date(), businessDays: 15, occurredAt: new Date() });
  await auction.setAppraisalAtomic({ ...base, roundNumber: 1, appraisalAmount: "10000.00", minBidAmount: "5000.00" });
  await auction.prepareAuctionAtomic({ ...base, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, occurredAt: new Date() });
  await auction.lotAuctionAtomic({ ...base, expectedFrom: "AUCTION_PREP", roundNumber: 1, occurredAt: new Date() });
  await auction.recordSaleAtomic({ ...base, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "Arrematante", soldAmount: "8000.00", saleNoteReference: "NOTA-1", occurredAt: new Date() });
  await auction.defaultAuctionAtomic({ ...base, expectedFrom: "AUCTIONED", roundNumber: 2, occurredAt: new Date() });
  await auction.registerEdictAtomic({ ...base, roundNumber: 3, classification: "CONSERVED", edictReference: "EDITAL-3", publishedAt: new Date(), businessDays: 15, occurredAt: new Date() });
  await auction.setAppraisalAtomic({ ...base, roundNumber: 3, appraisalAmount: "9000.00", minBidAmount: "4500.00" });
  const state = await auction.getState(tenantId, opened.id);
  assert.notEqual(state?.custodySeqHead, undefined);
  return { tenantId, processId: opened.id, custodySeq: state?.custodySeqHead ?? -1 };
}

const relotPath = (id: string) => `/api/v1/impound-processes/${id}/auction/relot`;
const reclaimPath = (id: string) => `/api/v1/impound-processes/${id}/auction/reclaim`;
const getPath = (id: string) => `/api/v1/impound-processes/${id}/auction`;

test("RV13 · a rota do relote aplica 403, 200 e 404 sem vazar outra organização", async () => {
  const forbidden = await seedResale();
  await withApp(async (baseUrl) => {
    const denied = await call(baseUrl, relotPath(forbidden.processId), { headers: headers(forbidden.tenantId, "operator"), body: { round_number: 3, custody_seq: forbidden.custodySeq } });
    assert.equal(denied.status, 403, JSON.stringify(denied.body));
  });
  const allowed = await seedResale();
  await withApp(async (baseUrl) => {
    const accepted = await call(baseUrl, relotPath(allowed.processId), { headers: headers(allowed.tenantId, "manager"), body: { round_number: 3, custody_seq: allowed.custodySeq } });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  });
  const hidden = await seedResale();
  await withApp(async (baseUrl) => {
    const response = await call(baseUrl, relotPath(hidden.processId), { headers: headers(randomUUID(), "tenant_admin"), body: { round_number: 3, custody_seq: hidden.custodySeq } });
    assert.deepEqual({ http: response.status, estado: (await getMemoryImpoundRepositoryForTests().findProcessById(hidden.tenantId, hidden.processId))?.status }, { http: 404, estado: "LOTTED" }, JSON.stringify(response.body));
  });
});

test("RV21 · resgate e relote exigem custody_seq inteiro e não gravam quando inválido", async () => {
  const ctx = await seedResale();
  const before = (await getMemoryImpoundRepositoryForTests().listEvents(ctx.tenantId, ctx.processId)).length;
  await withApp(async (baseUrl) => {
    const reclaimMissing = await call(baseUrl, reclaimPath(ctx.processId), { headers: headers(ctx.tenantId, "manager"), body: { reason: "Dono apresentou documentos" } });
    const reclaimInvalid = await call(baseUrl, reclaimPath(ctx.processId), { headers: headers(ctx.tenantId, "manager"), body: { reason: "Dono apresentou documentos", custody_seq: "abc" } });
    const relotMissing = await call(baseUrl, relotPath(ctx.processId), { headers: headers(ctx.tenantId, "manager"), body: { round_number: 3 } });
    assert.deepEqual({ reclaimMissing: [reclaimMissing.status, reclaimMissing.reason], reclaimInvalid: [reclaimInvalid.status, reclaimInvalid.reason], relotMissing: [relotMissing.status, relotMissing.reason], eventosNovos: (await getMemoryImpoundRepositoryForTests().listEvents(ctx.tenantId, ctx.processId)).length - before }, { reclaimMissing: [422, "custody_seq_required"], reclaimInvalid: [422, "custody_seq_invalid"], relotMissing: [422, "custody_seq_required"], eventosNovos: 0 });
  });
});

test("RV14/RV15 · GET entrega o marcador; relote invalida o resgate formado sobre a leitura anterior", async () => {
  const ctx = await seedResale();
  await withApp(async (baseUrl) => {
    const reading = await call(baseUrl, getPath(ctx.processId), { method: "GET", headers: headers(ctx.tenantId, "manager") });
    const readingData = reading.body.data as Record<string, unknown>;
    assert.deepEqual({ http: reading.status, pendente: readingData.resalePending, seq: readingData.custodySeq }, { http: 200, pendente: true, seq: ctx.custodySeq });
    const relot = await call(baseUrl, relotPath(ctx.processId), { headers: headers(ctx.tenantId, "manager"), body: { round_number: 3, custody_seq: ctx.custodySeq } });
    const stale = await call(baseUrl, reclaimPath(ctx.processId), { headers: headers(ctx.tenantId, "manager"), body: { reason: "Dono apresentou documentos", custody_seq: ctx.custodySeq } });
    const after = await call(baseUrl, getPath(ctx.processId), { method: "GET", headers: headers(ctx.tenantId, "manager") });
    const afterData = after.body.data as Record<string, unknown>;
    assert.deepEqual({ relot: relot.status, stale: [stale.status, stale.reason], pendenteDepois: afterData.resalePending, seqAvancou: Number(afterData.custodySeq) > ctx.custodySeq }, { relot: 200, stale: [409, "auction_reading_stale"], pendenteDepois: false, seqAvancou: true });
  });
});
