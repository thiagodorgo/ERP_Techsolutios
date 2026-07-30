import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-13b — ARREMATE (I7 BASE) sob CONCORRÊNCIA REAL + isolamento cross-tenant. DB-gated (skip sem DATABASE_URL,
// como auction-scrap-concurrency/rls-tenant-isolation) — a corrida real exige o banco (FOR UPDATE do processo +
// partial-unique da rodada + RLS). Testa: (A) N vendas concorrentes da MESMA rodada → exatamente 1 SOLD + 1
// AUCTION_SOLD (idempotência por round_number sob o lock); (B) sold<min_bid re-verificado sob o lock → 409; (C)
// cross-tenant 404 (RLS).
if (!connectionString) {
  test("Auction sale concurrency (I7) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 6;

  // (A) N recordSaleAtomic concorrentes da MESMA rodada (LOTTED) → o FOR UPDATE serializa: 1 cria o SOLD + transiciona
  // AUCTIONED; os demais enxergam a linha SOLD commitada e devolvem idempotente (created:false). Estado final
  // AUCTIONED, EXATAMENTE 1 SOLD e 1 AUCTION_SOLD (nunca dupla-venda).
  test("(A) N vendas concorrentes da mesma rodada → exatamente 1 SOLD + 1 AUCTION_SOLD; estado AUCTIONED", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `sale-${stamp()}`, "LOTTED");
    try {
      await seedEdict(client, ctx.tenantId, ctx.processId, 1, "10000.00", "8000.00");
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, (_, i) =>
          auction.recordSaleAtomic({
            tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 1,
            winnerRef: `Arrematante ${i}`, soldAmount: "9500.00", saleNoteReference: "NOTA-1",
            actorId: undefined, occurredAt: new Date(),
          }),
        ),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ created: boolean }>[];
      assert.equal(fulfilled.length, CONCURRENCY, "todas resolvem (idempotência sob o lock)");
      assert.equal(fulfilled.filter((r) => r.value.created).length, 1, "exatamente 1 venda criada");
      assert.equal((await selectProcess(client, ctx.tenantId, ctx.processId)).status, "AUCTIONED", "estado final = arrematado");
      assert.equal(await countByOutcome(client, ctx.tenantId, ctx.processId, "SOLD"), 1, "exatamente 1 linha SOLD");
      assert.equal(await countSoldEvents(client, ctx.tenantId, ctx.processId), 1, "exatamente 1 AUCTION_SOLD na cadeia");
      // sold_amount persistido (base de I7) e frozen_at setado (T_stop §5).
      const sold = await selectSold(client, ctx.tenantId, ctx.processId);
      assert.equal(Number(sold.sold_amount), 9500, "sold_amount persistido (base de I7)");
      assert.ok(sold.frozen_at, "o arremate CONGELA (frozen_at)");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (B) sold_amount ABAIXO do mínimo re-verificado sob o FOR UPDATE → 409 sale_below_min_bid (o valor sigiloso do
  // edital manda; nem o cliente burla).
  test("(B) sold<min_bid re-verificado sob o lock → 409 sale_below_min_bid; nada é gravado", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `salemin-${stamp()}`, "LOTTED");
    try {
      await seedEdict(client, ctx.tenantId, ctx.processId, 1, "10000.00", "8000.00");
      await assert.rejects(
        () => auction.recordSaleAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "X", soldAmount: "7000.00", saleNoteReference: "NOTA", actorId: undefined, occurredAt: new Date() }),
        (error: unknown) => (error as { statusCode?: number }).statusCode === 409 && (error as { reason?: string }).reason === "sale_below_min_bid",
      );
      assert.equal((await selectProcess(client, ctx.tenantId, ctx.processId)).status, "LOTTED", "permanece LOTTED");
      assert.equal(await countByOutcome(client, ctx.tenantId, ctx.processId, "SOLD"), 0, "nenhuma venda gravada");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (D) CRÍTICO-1 sob o lock REAL: o processo está LOTTED (rodada 1, reserva 8000); tentar vender a rodada 2 (edital
  // DESIGNATED, incompleto, reserva 100) ⇒ 409 sale_round_not_lotted (a venda amarra-se à rodada LOTADA, re-verificada
  // sob FOR UPDATE — sold_amount da base do I7 não pode sair forjado).
  test("(D) vender uma rodada NÃO-LOTADA sob o lock → 409 sale_round_not_lotted; a rodada LOTADA vende OK", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `saleround-${stamp()}`, "LOTTED");
    try {
      await seedEdict(client, ctx.tenantId, ctx.processId, 1, "10000.00", "8000.00"); // rodada 1 LOTADA (reserva 8000)
      await seedEdictDesignated(client, ctx.tenantId, ctx.processId, 2); // rodada 2 isca (DESIGNATED, incompleta, reserva 100)
      await assert.rejects(
        () => auction.recordSaleAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 2, winnerRef: "X", soldAmount: "100.00", saleNoteReference: "N", actorId: undefined, occurredAt: new Date() }),
        (error: unknown) => (error as { statusCode?: number }).statusCode === 409 && (error as { reason?: string }).reason === "sale_round_not_lotted",
      );
      assert.equal(await countByOutcome(client, ctx.tenantId, ctx.processId, "SOLD"), 0, "nada vendido pela rodada isca");
      const ok = await auction.recordSaleAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "Arrematante", soldAmount: "9500.00", saleNoteReference: "NOTA", actorId: undefined, occurredAt: new Date() });
      assert.equal(ok.attempt.outcome, "SOLD");
      assert.equal((await selectProcess(client, ctx.tenantId, ctx.processId)).status, "AUCTIONED");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (C) cross-tenant: vender/reintegrar/reclamar um processo de OUTRO tenant ⇒ não encontrado (FOR UPDATE escopado +
  // RLS não enxerga a linha).
  test("(C) cross-tenant: recordSale/default/reclaim em processo de outro tenant ⇒ 404 process_not_found", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `xt-sale-${stamp()}`, "LOTTED");
    const other = await client.tenant.create({ data: { name: `Sale XT ${stamp()}`, slug: `sale-xt-${stamp()}` } });
    try {
      const is404 = (error: unknown) => (error as { statusCode?: number }).statusCode === 404 && (error as { reason?: string }).reason === "process_not_found";
      await assert.rejects(() => auction.recordSaleAtomic({ tenantId: other.id, processId: ctx.processId, expectedFrom: "LOTTED", roundNumber: 1, winnerRef: "X", soldAmount: "9000.00", saleNoteReference: "N", actorId: undefined, occurredAt: new Date() }), is404);
      await assert.rejects(() => auction.defaultAuctionAtomic({ tenantId: other.id, processId: ctx.processId, expectedFrom: "AUCTIONED", roundNumber: 2, actorId: undefined, occurredAt: new Date() }), is404);
      await assert.rejects(() => auction.reclaimAtomic({ tenantId: other.id, processId: ctx.processId, expectedFrom: "LOTTED", actorId: undefined, occurredAt: new Date() }), is404);
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

async function seedProcess(client: BootstrapClient, suffix: string, status: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Sale Conc ${suffix}`, slug: `sale-conc-${suffix}` } });
  const custodyHash = "a".repeat(64);
  const custodyPrev = "b".repeat(64);
  const seeded = await withTenantRls(client, tenant.id, async (tx) => {
    const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    const [proc] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
      VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', ${status}, now() - interval '120 days', NULL, 1, ${custodyHash})
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

// Edital CONSERVED COMPLETO (ref + published_at + business_days>=15) + avaliação/min_bid SIGILOSOS (art. 28), já
// LOTADO (status='LOTTED') — o processo está em LOTTED e recordSale (CRÍTICO-1) só arremata a rodada LOTADA.
async function seedEdict(client: BootstrapClient, tenantId: string, processId: string, round: number, appraisal: string, minBid: string): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO auction_edicts (tenant_id, process_id, round_number, classification, appraisal_amount, min_bid_amount, edict_reference, published_at, business_days, status)
      VALUES (${tenantId}::uuid, ${processId}::uuid, ${round}, 'CONSERVED', ${appraisal}::numeric, ${minBid}::numeric, ${`EDITAL-SALE-${round}`}, now(), 15, 'LOTTED')
    `,
  );
}

// Edital "isca" DESIGNATED (não-lotado, incompleto business_days=1, reserva baixa) — CRÍTICO-1: vender esta rodada
// tem de bloquear (não é a LOTADA).
async function seedEdictDesignated(client: BootstrapClient, tenantId: string, processId: string, round: number): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO auction_edicts (tenant_id, process_id, round_number, classification, appraisal_amount, min_bid_amount, edict_reference, published_at, business_days, status)
      VALUES (${tenantId}::uuid, ${processId}::uuid, ${round}, 'CONSERVED', '200.00'::numeric, '100.00'::numeric, ${`EDITAL-ISCA-${round}`}, now(), 1, 'DESIGNATED')
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

async function selectSold(client: BootstrapClient, tenantId: string, processId: string): Promise<{ sold_amount: unknown; frozen_at: Date | null }> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, async (tx) => {
    const attempt = await tx.$queryRaw<Array<{ sold_amount: unknown }>>`SELECT sold_amount FROM auction_attempts WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND outcome = 'SOLD' LIMIT 1`;
    const proc = await tx.$queryRaw<Array<{ frozen_at: Date | null }>>`SELECT frozen_at FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid`;
    return { sold_amount: attempt[0]?.sold_amount, frozen_at: proc[0]?.frozen_at };
  });
  return rows;
}

async function countByOutcome(client: BootstrapClient, tenantId: string, processId: string, outcome: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM auction_attempts WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND outcome = ${outcome}`,
  );
  return rows[0].n;
}

async function countSoldEvents(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'AUCTION_SOLD'`,
  );
  return rows[0].n;
}

// Teardown FK-safe de UM tenant (auction_* ANTES de custody_events/impound_processes — FK composta RESTRICT filha→mãe,
// I9). custody_events tem TRIGGER append-only → replica. Escopado por tenant (NUNCA wildcard).
async function teardownTenant(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM auction_edicts WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM auction_attempts WHERE tenant_id = '${tenantId}'::uuid`);
    // Ω5P PR-20 — recordSaleAtomic captura 1 impound_outbox_events (STATUS_CHANGE_AUCTIONED) na MESMA tx da venda;
    // purgar ANTES de impound_processes (FK RESTRICT).
    await tx.$executeRawUnsafe(`DELETE FROM impound_outbox_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
