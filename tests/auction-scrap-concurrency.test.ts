import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-13a — RECICLAGEM (sucata IRREVERSÍVEL, I8) sob CONCORRÊNCIA REAL + isolamento cross-tenant. DB-gated (skip
// sem DATABASE_URL, como auction-concurrency/rls-tenant-isolation) — a corrida real exige o banco (FOR UPDATE do
// processo + partial-unique do edital + RLS). Testa: (A) reclassify-scrap × recordAttempt sob o lock; (B)
// idempotência do edital por round_number; (C) cross-tenant 404 (RLS).
if (!connectionString) {
  test("Auction scrap concurrency (I8) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 6;

  // (A) reclassify-scrap × recordAttempt(nova rodada) concorrentes no MESMO processo AUCTION_ELIGIBLE (2 strikes
  // edict-backed). O FOR UPDATE serializa: se a reciclagem commita 1º → o recordAttempt vê status != AUCTION_ELIGIBLE
  // (409); se o recordAttempt commita 1º → a reciclagem ainda enxerga >=2 strikes edict-backed e recicla. Em AMBOS o
  // estado final é DIRECT_RECYCLING, com EXATAMENTE 1 STATUS_CHANGE two_strikes_scrap (nunca dupla-reciclagem).
  test("(A) reclassify-scrap × recordAttempt sob lock → final DIRECT_RECYCLING, exatamente 1 reciclagem", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `scrap-${stamp()}`, "AUCTION_ELIGIBLE");
    try {
      await seedEdict(client, ctx.tenantId, ctx.processId, 1);
      await seedEdict(client, ctx.tenantId, ctx.processId, 2);
      await seedStrike(client, ctx.tenantId, ctx.processId, 1);
      await seedStrike(client, ctx.tenantId, ctx.processId, 2);
      await seedEdict(client, ctx.tenantId, ctx.processId, 3); // habilita o recordAttempt(round 3) edict-gated

      const results = await Promise.allSettled([
        auction.reclassifyScrapAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", maxAttempts: 2, actorId: undefined, occurredAt: new Date() }),
        auction.recordAttemptAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 3, notes: undefined, actorId: undefined, occurredAt: new Date() }),
      ]);
      const rejected = results.filter((r) => r.status === "rejected");
      // A reciclagem SEMPRE vence a lógica (2 strikes edict-backed presentes de saída); o recordAttempt pode ter
      // vencido o lock (criou o strike da rodada 3) OU chegado depois da reciclagem (409 auction_not_eligible/concurrent).
      for (const r of rejected) {
        const error = (r as PromiseRejectedResult).reason as { statusCode?: number; reason?: string };
        assert.equal(error.statusCode, 409);
        assert.ok(["auction_not_eligible", "concurrent_custody_append"].includes(error.reason ?? ""), `reason inesperado: ${error.reason}`);
      }
      assert.equal((await selectProcess(client, ctx.tenantId, ctx.processId)).status, "DIRECT_RECYCLING", "estado final = sucata");
      assert.equal(await countScrapEvents(client, ctx.tenantId, ctx.processId), 1, "EXATAMENTE 1 STATUS_CHANGE two_strikes_scrap (nunca dupla-reciclagem)");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (B) N registros concorrentes do edital da MESMA rodada → exatamente 1 criado (partial-unique
  // auction_edicts_round_idem_key; pré-check sob o lock) → 1 linha, 1 AUCTION_LOTTED.
  test("(B) N registros concorrentes do edital da mesma round_number → exatamente 1 criado", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `edict-idem-${stamp()}`, "AUCTION_ELIGIBLE");
    try {
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, () =>
          auction.registerEdictAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, roundNumber: 1, edictReference: "EDITAL-IDEM-1", businessDays: 15, actorId: undefined, occurredAt: new Date() }),
        ),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ created: boolean }>[];
      assert.equal(fulfilled.length, CONCURRENCY, "todas devem resolver (idempotência sob o lock)");
      assert.equal(fulfilled.filter((r) => r.value.created).length, 1, "exatamente 1 edital criado na rodada 1");
      assert.equal(await countEdicts(client, ctx.tenantId, ctx.processId, 1), 1, "exatamente 1 auction_edicts na rodada 1");
      assert.equal(await countLottedEvents(client, ctx.tenantId, ctx.processId), 1, "exatamente 1 AUCTION_LOTTED na cadeia");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (C) cross-tenant: registrar edital / reciclar processo de OUTRO tenant ⇒ não encontrado (FOR UPDATE escopado por
  // tenant + RLS não enxerga a linha).
  test("(C) cross-tenant: registerEdict/reclassifyScrap/reclassifyUnrecoverable em processo de outro tenant ⇒ 404 process_not_found", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `xt-scrap-${stamp()}`, "AUCTION_ELIGIBLE");
    const other = await client.tenant.create({ data: { name: `Scrap XT ${stamp()}`, slug: `scrap-xt-${stamp()}` } });
    try {
      const is404 = (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 404 && (error as { reason?: string }).reason === "process_not_found";
      await assert.rejects(() => auction.registerEdictAtomic({ tenantId: other.id, processId: ctx.processId, roundNumber: 1, actorId: undefined, occurredAt: new Date() }), is404);
      await assert.rejects(() => auction.reclassifyScrapAtomic({ tenantId: other.id, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", maxAttempts: 2, actorId: undefined, occurredAt: new Date() }), is404);
      await assert.rejects(() => auction.reclassifyUnrecoverableAtomic({ tenantId: other.id, processId: ctx.processId, expectedFrom: "ACTIVE_CUSTODY", actorId: undefined, occurredAt: new Date() }), is404);
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await teardownTenant(client, other.id);
      await client.$disconnect();
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

function stamp(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaAuctionRepository } = await import("../src/modules/auction/auction-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client, auction: new RlsPrismaAuctionRepository(client) };
}

async function seedProcess(client: BootstrapClient, suffix: string, status: "ACTIVE_CUSTODY" | "AUCTION_ELIGIBLE") {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Scrap Conc ${suffix}`, slug: `scrap-conc-${suffix}` } });
  const custodyHash = "a".repeat(64);
  const custodyPrev = "b".repeat(64);
  const seeded = await withTenantRls(client, tenant.id, async (tx) => {
    const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    const [proc] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
      VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', ${status}, now() - interval '90 days', NULL, 1, ${custodyHash})
      RETURNING id
    `;
    await tx.$queryRaw`
      INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
      VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 1, 'STATUS_CHANGE', ${'{"from":null,"to":"IN_REMOVAL"}'}::jsonb, now(), ${custodyPrev}, ${custodyHash})
    `;
    return { profileId: profile.id, processId: proc.id };
  });
  return { tenantId: tenant.id, ...seeded };
}

// Edital COMPLETO (ref + published_at + business_days>=15) — o gate de SUCATA exige completude (MÉDIO-A).
async function seedEdict(client: BootstrapClient, tenantId: string, processId: string, round: number): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO auction_edicts (tenant_id, process_id, round_number, edict_reference, published_at, business_days, status)
      VALUES (${tenantId}::uuid, ${processId}::uuid, ${round}, ${`EDITAL-SCRAP-${round}`}, now(), 15, 'DESIGNATED')
    `,
  );
}

async function seedStrike(client: BootstrapClient, tenantId: string, processId: string, round: number): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO auction_attempts (tenant_id, process_id, round_number, outcome)
      VALUES (${tenantId}::uuid, ${processId}::uuid, ${round}, 'DESERTED')
    `,
  );
}

async function selectProcess(client: BootstrapClient, tenantId: string, processId: string): Promise<{ status: string }> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid`,
  );
  return rows[0];
}

async function countEdicts(client: BootstrapClient, tenantId: string, processId: string, round: number): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM auction_edicts WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND round_number = ${round}`,
  );
  return rows[0].n;
}

async function countLottedEvents(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'AUCTION_LOTTED'`,
  );
  return rows[0].n;
}

async function countScrapEvents(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'STATUS_CHANGE' AND payload->>'reason' = 'two_strikes_scrap'`,
  );
  return rows[0].n;
}

// Teardown FK-safe de UM tenant: auction_edicts/auction_attempts ANTES de custody_events/impound_processes (FK
// composta RESTRICT filha→mãe — I9). custody_events tem TRIGGER append-only → replica. Escopado por tenant (NUNCA wildcard).
async function teardownTenant(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM auction_edicts WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM auction_attempts WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
