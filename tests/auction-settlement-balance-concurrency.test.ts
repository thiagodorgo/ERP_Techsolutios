import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import { distributeCascade } from "../src/modules/auction/auction.settlement.repository.js";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-14b — CICLO do saldo (§12) sob CONCORRÊNCIA REAL + atomicidade cross-tenant. DB-gated (skip sem DATABASE_URL,
// como auction-settlement-concurrency). O ciclo é state-change no Settlement (DISTRIBUTED → BALANCE_CLAIMED OU
// BALANCE_REVERTED_FUNSET), serializado pelo FOR UPDATE do processo + do settlement. Testa: (1) claim×revert concorrentes
// → EXATAMENTE 1 vence (mutuamente exclusivo, 1 evento); (2) N claims concorrentes → exatamente 1 comuta (idempotência);
// (3) Σ allocations INTACTO após o ciclo (NÃO redistribui); (4) cross-tenant 404 (RLS).
if (!connectionString) {
  test("Auction settlement balance-cycle concurrency requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  // (1) claim (now < expires) × revert (now >= expires) concorrentes: cada operação é INDIVIDUALMENTE válida (estado
  // DISTRIBUTED, saldo>0, prazo ok p/ o seu now), mas o FOR UPDATE serializa e o gate de estado é TERMINAL → exatamente
  // 1 comuta o status; a outra re-lê o estado já comutado e falha wrong_state. Nunca AMBOS; exatamente 1 evento do ciclo.
  test("(1) claim×revert concorrentes → exatamente 1 vence (mutuamente exclusivo); 1 evento; Σ allocations intacto", async () => {
    const { client, settlement } = await bootstrap(connectionString);
    const ctx = await seedDistributed(client, settlement, `bal-me-${stamp()}`);
    try {
      const claimNow = new Date(ctx.expiresAt.getTime() - 86_400_000); // dentro da janela
      const revertNow = new Date(ctx.expiresAt.getTime() + 86_400_000); // vencida
      const results = await Promise.allSettled([
        settlement.transitionBalanceAtomic("CLAIM", { tenantId: ctx.tenantId, processId: ctx.processId, recipientRef: "…RACE", actorId: undefined, now: claimNow, occurredAt: claimNow }),
        settlement.transitionBalanceAtomic("FUNSET_REVERSION", { tenantId: ctx.tenantId, processId: ctx.processId, actorId: undefined, now: revertNow, occurredAt: revertNow }),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ phase: string }>[];
      const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      assert.equal(fulfilled.length, 1, "exatamente 1 transição comuta o status");
      assert.equal(rejected.length, 1, "a outra falha o gate de estado");
      const loserReason = (rejected[0].reason as { reason?: string }).reason;
      assert.ok(loserReason === "balance_claim_wrong_state" || loserReason === "funset_wrong_state", `perdedor = wrong_state (foi ${loserReason})`);

      const status = await readStatus(client, ctx.tenantId, ctx.processId);
      assert.ok(status === "BALANCE_CLAIMED" || status === "BALANCE_REVERTED_FUNSET", "status terminal único");
      // Exatamente 1 evento do CICLO (payload com `phase`) — nunca os dois.
      assert.equal(await countCycleEvents(client, ctx.tenantId, ctx.processId), 1, "exatamente 1 AUCTION_SETTLEMENT do ciclo");
      // Σ allocations INTACTO (o ciclo não redistribui).
      assert.equal(await sumAllocationCentsDb(client, ctx.tenantId, ctx.processId), ctx.hammerCents, "Σ allocations == hammer (intacto)");
      assert.equal(await countAllocations(client, ctx.tenantId, ctx.processId), 8, "8 allocations intocadas (7 tiers + OWNER_BALANCE)");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (2) N claims concorrentes do MESMO settlement (todos now<expires) → o FOR UPDATE serializa: 1 comuta p/ BALANCE_CLAIMED
  // + 1 evento; os demais re-lêem BALANCE_CLAIMED e falham balance_claim_wrong_state. Idempotência sob concorrência.
  test("(2) N claims concorrentes → exatamente 1 comuta; 1 evento{CLAIM}; N-1 falham wrong_state", async () => {
    const { client, settlement } = await bootstrap(connectionString);
    const ctx = await seedDistributed(client, settlement, `bal-nclaim-${stamp()}`);
    try {
      const claimNow = new Date(ctx.expiresAt.getTime() - 86_400_000);
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () => settlement.transitionBalanceAtomic("CLAIM", { tenantId: ctx.tenantId, processId: ctx.processId, recipientRef: "…N", actorId: undefined, now: claimNow, occurredAt: new Date() })),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      assert.equal(fulfilled.length, 1, "exatamente 1 claim comuta");
      assert.equal(rejected.length, 5, "os outros 5 falham");
      assert.ok(rejected.every((r) => (r.reason as { reason?: string }).reason === "balance_claim_wrong_state"), "todos wrong_state");
      assert.equal(await readStatus(client, ctx.tenantId, ctx.processId), "BALANCE_CLAIMED");
      assert.equal(await countCycleEvents(client, ctx.tenantId, ctx.processId), 1, "exatamente 1 evento do ciclo (sem duplicar)");
      assert.equal(await sumAllocationCentsDb(client, ctx.tenantId, ctx.processId), ctx.hammerCents, "Σ allocations intacto");
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (3) cross-tenant: transicionar o saldo de um settlement de OUTRO tenant ⇒ 404 process_not_found (FOR UPDATE escopado
  // + RLS não enxerga a linha). O tenant dono permanece DISTRIBUTED (nada comutado).
  test("(3) cross-tenant: transitionBalanceAtomic em processo de outro tenant ⇒ 404; dono permanece DISTRIBUTED", async () => {
    const { client, settlement } = await bootstrap(connectionString);
    const ctx = await seedDistributed(client, settlement, `bal-xt-${stamp()}`);
    const other = await client.tenant.create({ data: { name: `Bal XT ${stamp()}`, slug: `bal-xt-${stamp()}` } });
    try {
      const now = new Date(ctx.expiresAt.getTime() - 86_400_000);
      await assert.rejects(
        () => settlement.transitionBalanceAtomic("CLAIM", { tenantId: other.id, processId: ctx.processId, actorId: undefined, now, occurredAt: now }),
        (error: unknown) => (error as { statusCode?: number }).statusCode === 404 && (error as { reason?: string }).reason === "process_not_found",
      );
      assert.equal(await readStatus(client, ctx.tenantId, ctx.processId), "DISTRIBUTED", "dono intocado pela tentativa cross-tenant");
      assert.equal(await countCycleEvents(client, ctx.tenantId, ctx.processId), 0, "nenhum evento do ciclo no tenant dono");
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

// Semeia um processo AUCTION_CLOSED (frozen) com uma rodada SOLD e DISTRIBUI a liquidação (14a) com saldo residual =
// hammer (sem claims) → ownerBalance>0, prazo +5a. Devolve tenant/process + o expires + o hammer (p/ o Σ).
async function seedDistributed(client: BootstrapClient, settlement: Awaited<ReturnType<typeof bootstrap>>["settlement"], suffix: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  const soldAmount = "9500.00";
  const hammerCents = 950000;
  const tenant = await client.tenant.create({ data: { name: `Settle Bal ${suffix}`, slug: `settle-bal-${suffix}` } });
  const custodyHash = "a".repeat(64);
  const custodyPrev = "b".repeat(64);
  const { processId } = await withTenantRls(client, tenant.id, async (tx) => {
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
  const expiresAt = new Date(Date.now() + 5 * 365 * 86_400_000);
  const { allocations, ownerBalanceCents, shortfallCents } = distributeCascade(hammerCents, [
    { kind: "AUCTION_COST", claimCents: 0 },
    { kind: "REMOVAL_STORAGE", claimCents: 0 },
    { kind: "VEHICLE_TAXES", claimCents: 0 },
    { kind: "PRIORITY_CREDITORS", claimCents: 0 },
    { kind: "REALIZING_AGENCY_FINES", claimCents: 0 },
    { kind: "OTHER_SNT_FINES", claimCents: 0 },
    { kind: "OTHER_DEBITS", claimCents: 0 },
  ]);
  await settlement.distributeSettlementAtomic({
    tenantId: tenant.id, processId, expectedFrom: "AUCTION_CLOSED", soldRound: 1, hammerCents,
    allocations, ownerBalanceCents, shortfallCents, auctionCostCents: 0, removalStorageCents: 0, currency: "BRL",
    ownerNotifyDueAt: new Date(Date.now() + 30 * 86_400_000), ownerClaimExpiresAt: expiresAt, actorId: undefined, occurredAt: new Date(),
  });
  return { tenantId: tenant.id, processId, expiresAt, hammerCents };
}

async function readStatus(client: BootstrapClient, tenantId: string, processId: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM settlements WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid`,
  );
  return rows[0].status;
}

async function countCycleEvents(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'AUCTION_SETTLEMENT' AND payload ? 'phase'`,
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

async function sumAllocationCentsDb(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ s: string | null }>>`SELECT sum(amount)::text AS s FROM settlement_allocations WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid`,
  );
  return Math.round(Number(rows[0].s ?? 0) * 100);
}

// Teardown FK-safe de UM tenant (escopado por tenant, NUNCA wildcard). custody_events tem TRIGGER append-only →
// session_replication_role=replica (superuser).
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
