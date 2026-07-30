import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import { distributeCascade } from "../src/modules/auction/auction.settlement.repository.js";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-14a — LIQUIDAÇÃO em cascata §6º (I7) sob CONCORRÊNCIA REAL + atomicidade + isolamento cross-tenant. DB-gated
// (skip sem DATABASE_URL, como auction-sale-concurrency/rls-tenant-isolation) — a corrida real exige o banco (FOR
// UPDATE do processo + partial-unique 1-settlement/processo + RLS). Testa: (6b) N distribuições concorrentes do MESMO
// processo → exatamente 1; (7) atomicidade (Σ≠hammer forjado → rollback, nada persiste); (9) cross-tenant 404 (RLS).
if (!connectionString) {
  test("Auction settlement concurrency (I7) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 6;

  // (6b) N distributeSettlementAtomic concorrentes do MESMO processo → o FOR UPDATE + partial-unique serializam: 1 cria
  // a liquidação + N allocations + 1 AUCTION_SETTLEMENT; os demais enxergam a existente e devolvem idempotente. EXATO
  // 1 settlement, 8 allocations (7 tiers + OWNER_BALANCE), 1 AUCTION_SETTLEMENT. Σ allocations == hammer.
  test("(6b) N distribuições concorrentes do mesmo processo → exatamente 1 settlement; Σ==hammer; 1 AUCTION_SETTLEMENT", async () => {
    const { client, settlement } = await bootstrap(connectionString);
    const ctx = await seedClosedWithSale(client, `settle-${stamp()}`, "9500.00");
    try {
      const input = buildInput(ctx.tenantId, ctx.processId, 950000, { auctionCostCents: 50000, removalStorageCents: 120000 });
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, () => settlement.distributeSettlementAtomic({ ...input, occurredAt: new Date() })),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ created: boolean }>[];
      assert.equal(fulfilled.length, CONCURRENCY, "todas resolvem (idempotência sob o lock)");
      assert.equal(fulfilled.filter((r) => r.value.created).length, 1, "exatamente 1 distribuição criada");
      assert.equal(await countSettlements(client, ctx.tenantId, ctx.processId), 1, "exatamente 1 settlement");
      assert.equal(await countAllocations(client, ctx.tenantId, ctx.processId), 8, "7 tiers + OWNER_BALANCE");
      assert.equal(await countSettlementEvents(client, ctx.tenantId, ctx.processId), 1, "exatamente 1 AUCTION_SETTLEMENT na cadeia");
      // I7 no banco: Σ amount == hammer (950000 cents).
      const sumCents = await sumAllocationCentsDb(client, ctx.tenantId, ctx.processId);
      assert.equal(sumCents, 950000, "Σ settlement_allocations.amount == hammer (centavo exato)");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (7) ATOMICIDADE: um input FORJADO (Σ allocations ≠ hammer) é barrado pelo ASSERT (settlement_allocation_mismatch) e
  // a tx faz ROLLBACK — NADA persiste (0 settlement, 0 allocation, 0 AUCTION_SETTLEMENT). Belt-and-suspenders de I7.
  test("(7) atomicidade: Σ≠hammer forjado → 500 settlement_allocation_mismatch + ROLLBACK (nada persiste)", async () => {
    const { client, settlement } = await bootstrap(connectionString);
    const ctx = await seedClosedWithSale(client, `atom-${stamp()}`, "9500.00");
    try {
      const good = buildInput(ctx.tenantId, ctx.processId, 950000, { auctionCostCents: 0, removalStorageCents: 0 });
      // Forja: infla a 1ª allocation em 1 centavo → Σ passa a 950001 ≠ hammer 950000.
      const forged = {
        ...good,
        allocations: good.allocations.map((a, i) => (i === 0 ? { ...a, amountCents: a.amountCents + 1 } : a)),
      };
      await assert.rejects(
        () => settlement.distributeSettlementAtomic(forged),
        (error: unknown) => (error as { reason?: string }).reason === "settlement_allocation_mismatch",
      );
      assert.equal(await countSettlements(client, ctx.tenantId, ctx.processId), 0, "nenhum settlement persistido (rollback)");
      assert.equal(await countAllocations(client, ctx.tenantId, ctx.processId), 0, "nenhuma allocation persistida");
      assert.equal(await countSettlementEvents(client, ctx.tenantId, ctx.processId), 0, "nenhum AUCTION_SETTLEMENT na cadeia");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (9) cross-tenant: distribuir/ler a liquidação de um processo de OUTRO tenant ⇒ não encontrado (FOR UPDATE escopado
  // + RLS não enxerga a linha).
  test("(9) cross-tenant: distributeSettlementAtomic/getByProcess em processo de outro tenant ⇒ 404 / undefined", async () => {
    const { client, settlement } = await bootstrap(connectionString);
    const ctx = await seedClosedWithSale(client, `xt-settle-${stamp()}`, "9500.00");
    const other = await client.tenant.create({ data: { name: `Settle XT ${stamp()}`, slug: `settle-xt-${stamp()}` } });
    try {
      const input = buildInput(other.id, ctx.processId, 950000, { auctionCostCents: 0, removalStorageCents: 0 });
      await assert.rejects(
        () => settlement.distributeSettlementAtomic(input),
        (error: unknown) => (error as { statusCode?: number }).statusCode === 404 && (error as { reason?: string }).reason === "process_not_found",
      );
      assert.equal(await settlement.getByProcess(other.id, ctx.processId), undefined, "outro tenant não enxerga a liquidação (RLS)");
      // O tenant dono não teve nada distribuído pela tentativa cross-tenant.
      assert.equal(await countSettlements(client, ctx.tenantId, ctx.processId), 0, "nada distribuído no tenant dono");
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
  const { RlsPrismaAuctionSettlementRepository } = await import("../src/modules/auction/auction-settlement-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client, settlement: new RlsPrismaAuctionSettlementRepository(client) };
}

// Constrói o input de distribuição via distributeCascade PURO (mesma aritmética de centavos do serviço). soldRound=1.
function buildInput(tenantId: string, processId: string, hammerCents: number, tiers: { auctionCostCents: number; removalStorageCents: number }) {
  const { allocations, ownerBalanceCents, shortfallCents } = distributeCascade(hammerCents, [
    { kind: "AUCTION_COST", claimCents: tiers.auctionCostCents },
    { kind: "REMOVAL_STORAGE", claimCents: tiers.removalStorageCents },
    { kind: "VEHICLE_TAXES", claimCents: 0 },
    { kind: "PRIORITY_CREDITORS", claimCents: 0 },
    { kind: "REALIZING_AGENCY_FINES", claimCents: 0 },
    { kind: "OTHER_SNT_FINES", claimCents: 0 },
    { kind: "OTHER_DEBITS", claimCents: 0 },
  ]);
  return {
    tenantId,
    processId,
    expectedFrom: "AUCTION_CLOSED" as const,
    soldRound: 1,
    hammerCents,
    allocations,
    ownerBalanceCents,
    shortfallCents,
    auctionCostCents: tiers.auctionCostCents,
    removalStorageCents: tiers.removalStorageCents,
    currency: "BRL",
    ownerNotifyDueAt: new Date(Date.now() + 30 * 86_400_000),
    ownerClaimExpiresAt: new Date(Date.now() + 5 * 365 * 86_400_000),
    actorId: undefined,
    occurredAt: new Date(),
  };
}

// Processo AUCTION_CLOSED (frozen) com uma rodada SOLD (a base de I7). custody chain seed (seq 1) satisfaz o CHECK.
async function seedClosedWithSale(client: BootstrapClient, suffix: string, soldAmount: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Settle Conc ${suffix}`, slug: `settle-conc-${suffix}` } });
  const custodyHash = "a".repeat(64);
  const custodyPrev = "b".repeat(64);
  const seeded = await withTenantRls(client, tenant.id, async (tx) => {
    const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    const [proc] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
      VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', 'AUCTION_CLOSED', now() - interval '120 days', now(), 1, ${custodyHash})
      RETURNING id
    `;
    await tx.$queryRaw`
      INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
      VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 1, 'STATUS_CHANGE', ${'{"from":null,"to":"IN_REMOVAL"}'}::jsonb, now(), ${custodyPrev}, ${custodyHash})
    `;
    await tx.$executeRaw`
      INSERT INTO auction_attempts (tenant_id, process_id, round_number, outcome, sold_amount, sale_note_reference)
      VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 1, 'SOLD', ${soldAmount}::numeric, 'NOTA-1')
    `;
    return { processId: proc.id };
  });
  return { tenantId: tenant.id, ...seeded };
}

async function countSettlements(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM settlements WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid`,
  );
  return rows[0].n;
}

async function countAllocations(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM settlement_allocations WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid`,
  );
  return rows[0].n;
}

async function countSettlementEvents(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'AUCTION_SETTLEMENT'`,
  );
  return rows[0].n;
}

async function sumAllocationCentsDb(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ s: string | null }>>`SELECT sum(amount)::text AS s FROM settlement_allocations WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid`,
  );
  return Math.round(Number(rows[0].s ?? 0) * 100);
}

// Teardown FK-safe de UM tenant (settlement_allocations → settlements → auction_attempts/custody_events →
// impound_processes → jurisdiction_profiles/audit_logs, todas RESTRICT filha→mãe, I9). custody_events tem TRIGGER
// append-only → session_replication_role=replica (superuser). Escopado por tenant (NUNCA wildcard).
async function teardownTenant(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM settlement_allocations WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM settlements WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM auction_attempts WHERE tenant_id = '${tenantId}'::uuid`);
    // Ω5P PR-20 — distributeSettlementAtomic captura 1 impound_outbox_events (AUCTION_SETTLEMENT_DISTRIBUTED) na
    // MESMA tx do fechamento; purgar ANTES de impound_processes (FK RESTRICT).
    await tx.$executeRawUnsafe(`DELETE FROM impound_outbox_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
