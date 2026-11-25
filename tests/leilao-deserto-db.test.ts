import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("leilao-deserto-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para executar a suíte -db." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL ??= "silent";

  const { app } = await import("../src/app.js");
  const { createPrismaClient } = await import("../src/database/pg-connection.js");
  const { withTenantRls } = await import("../src/database/rls.js");
  const { computeEventHash, genesisHash } = await import("../src/modules/impound/impound.hashchain.js");
  const { RlsPrismaAuctionRepository } = await import("../src/modules/auction/auction-prisma.repository.js");
  const client = createPrismaClient(connectionString);

  async function withApp(callback: (baseUrl: string) => Promise<void>): Promise<void> {
    const server: Server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      await callback(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  }

  test("LD1-db · a rota de leilão sem lance alcança o serviço Prisma e preserva 404 tenant-scoped", async () => {
    const tenantId = randomUUID();
    const processId = randomUUID();
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/impound-processes/${processId}/auction/deserted`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": "manager" },
        body: JSON.stringify({ round_number: 1, custody_seq: 0 }),
      });
      const body = (await response.json()) as { error?: { reason?: string } };
      assert.deepEqual({ http: response.status, reason: body.error?.reason }, { http: 404, reason: "process_not_found" });
    });
  });

  test("LD1/LD5/LD6-db · atômico Prisma fecha período, encadeia eventos e aplica guardas sob a trava", async () => {
    const suffix = randomUUID().slice(0, 8);
    const tenant = await client.tenant.create({ data: { name: `Organização teste ${suffix}`, slug: `org-teste-${suffix}` } });
    try {
      const seeded = await withTenantRls(client, tenant.id, async (tx) => {
        const profile = await tx.jurisdictionProfile.create({ data: { tenant_id: tenant.id, name: "Perfil teste", scope: "PUBLIC_AGREEMENT", daily_model: "ROLLING_24H", daily_cap: "SIX_MONTHS" } });
        const process = await tx.impoundProcess.create({ data: { tenant_id: tenant.id, profile_id: profile.id, origin_authority: "Autoridade", vehicle_unidentified: true, unidentified_reason: "Em identificação", status: "LOTTED", entered_at: new Date("2026-01-01T00:00:00.000Z"), custody_seq_head: 0, regime_scope: "PUBLIC_AGREEMENT", regime_owner_notif_days: 10, regime_notice_edict_day: 30, regime_auction_eligible_day: 60, regime_auction_edict_business_days: 15, regime_daily_model: "ROLLING_24H", regime_daily_cap: "SIX_MONTHS", regime_release_requirements: [] } });
        const occurredAt = new Date("2026-01-01T00:00:00.000Z");
        const payload = { from: null, to: "IN_REMOVAL" };
        const prevHash = genesisHash(tenant.id, process.id);
        const hash = computeEventHash({ prevHash, seq: 1, type: "STATUS_CHANGE", payload, occurredAt, actorId: null });
        await tx.custodyEvent.create({ data: { tenant_id: tenant.id, process_id: process.id, seq: 1, type: "STATUS_CHANGE", payload, occurred_at: occurredAt, prev_hash: prevHash, hash } });
        await tx.impoundProcess.update({ where: { id: process.id }, data: { custody_seq_head: 1, custody_hash_head: hash } });
        await tx.auctionEdict.create({ data: { tenant_id: tenant.id, process_id: process.id, round_number: 1, classification: "CONSERVED", appraisal_amount: "10000.00", min_bid_amount: "5000.00", edict_reference: "EDITAL-1", published_at: occurredAt, business_days: 15, status: "LOTTED" } });
        await tx.impoundDailySuspension.create({ data: { tenant_id: tenant.id, process_id: process.id, started_at: occurredAt, reason: "AUCTION" } });
        return { processId: process.id };
      });
      const repo = new RlsPrismaAuctionRepository(client);
      await assert.rejects(
        () => repo.desertAfterLotAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "LOTTED", roundNumber: 1, expectedCustodySeq: 0, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "auction_reading_stale",
      );
      await assert.rejects(
        () => repo.desertAfterLotAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "LOTTED", roundNumber: 2, expectedCustodySeq: 1, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "deserted_round_not_lotted",
      );
      await withTenantRls(client, tenant.id, (tx) => tx.auctionAttempt.create({ data: { tenant_id: tenant.id, process_id: seeded.processId, round_number: 1, outcome: "SOLD", winner_ref: "REF-CONTROLE", sold_amount: "8000.00", sale_note_reference: "NOTA-CONTROLE" } }));
      await assert.rejects(
        () => repo.desertAfterLotAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "LOTTED", roundNumber: 1, expectedCustodySeq: 1, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "deserted_round_has_result",
      );
      await withTenantRls(client, tenant.id, (tx) => tx.auctionAttempt.deleteMany({ where: { tenant_id: tenant.id, process_id: seeded.processId, round_number: 1 } }));
      const snapshot = await repo.desertAfterLotAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "LOTTED", roundNumber: 1, expectedCustodySeq: 1, notes: "Sem lance", occurredAt: new Date("2026-01-10T00:00:00.000Z") });
      const measured = await withTenantRls(client, tenant.id, async (tx) => ({
        process: await tx.impoundProcess.findUnique({ where: { id: seeded.processId } }),
        openPeriods: await tx.impoundDailySuspension.count({ where: { tenant_id: tenant.id, process_id: seeded.processId, ended_at: null } }),
        events: await tx.custodyEvent.findMany({ where: { tenant_id: tenant.id, process_id: seeded.processId }, orderBy: { seq: "asc" } }),
      }));
      assert.deepEqual(
        { status: snapshot.status, outcome: snapshot.attempts.at(-1)?.outcome, openPeriods: measured.openPeriods, seq: measured.process?.custody_seq_head, reasons: measured.events.slice(-2).map((event) => (event.payload as { reason?: string }).reason ?? event.type) },
        { status: "ACTIVE_CUSTODY", outcome: "DESERTED", openPeriods: 0, seq: 3, reasons: ["AUCTION_CLOSED", "deserted_after_lot"] },
      );
      await assert.rejects(
        () => repo.desertAfterLotAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "LOTTED", roundNumber: 1, expectedCustodySeq: 1, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "concurrent_custody_append",
      );
      await withTenantRls(client, tenant.id, async (tx) => {
        await tx.impoundProcess.update({ where: { id: seeded.processId }, data: { status: "AUCTION_ELIGIBLE" } });
        for (const round of [2, 3, 4]) await tx.auctionEdict.create({ data: { tenant_id: tenant.id, process_id: seeded.processId, round_number: round, classification: "CONSERVED", appraisal_amount: "10000.00", min_bid_amount: "5000.00", edict_reference: `EDITAL-${round}`, published_at: new Date("2026-01-01T00:00:00.000Z"), business_days: 15, status: "DESIGNATED" } });
        await tx.auctionAttempt.create({ data: { tenant_id: tenant.id, process_id: seeded.processId, round_number: 3, outcome: "DESERTED" } });
      });
      await assert.rejects(
        () => repo.prepareAuctionAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 2, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "prep_round_has_result",
      );
      await repo.prepareAuctionAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 4, occurredAt: new Date() });
      await assert.rejects(
        () => repo.lotAuctionAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "AUCTION_PREP", roundNumber: 2, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "lot_round_has_result",
      );
      await withTenantRls(client, tenant.id, (tx) => tx.impoundProcess.update({ where: { id: seeded.processId }, data: { status: "AUCTION_ELIGIBLE" } }));
      await assert.rejects(
        () => repo.recordAttemptAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 2, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "attempt_round_not_new",
      );
      await withTenantRls(client, tenant.id, async (tx) => {
        await tx.impoundProcess.update({ where: { id: seeded.processId }, data: { status: "AUCTIONED" } });
        await tx.auctionAttempt.create({ data: { tenant_id: tenant.id, process_id: seeded.processId, round_number: 4, outcome: "SOLD", winner_ref: "REF-NEUTRA", sold_amount: "8000.00", sale_note_reference: "NOTA-4" } });
      });
      await assert.rejects(
        () => repo.defaultAuctionAtomic({ tenantId: tenant.id, processId: seeded.processId, expectedFrom: "AUCTIONED", roundNumber: 2, occurredAt: new Date() }),
        (error: unknown) => (error as { reason?: string }).reason === "default_round_not_new",
      );
    } finally {
      const tables = await client.$queryRaw<Array<{ table_name: string }>>`SELECT DISTINCT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id' AND data_type = 'uuid' AND table_name <> 'tenants'`;
      await client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
        for (const { table_name: table } of tables) await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE tenant_id = $1::uuid`, tenant.id);
      });
      await client.tenant.deleteMany({ where: { id: tenant.id } });
    }
  });
}
