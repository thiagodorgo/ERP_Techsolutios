import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-20 — painel gerencial dos Pátios sob o Postgres vivo. DB-gated (skip sem DATABASE_URL) — a RECONCILIAÇÃO
// contra as fontes de verdade (yard_spots para I1, impound_processes para as fases, settlement_allocations para
// I7) exige o banco real. Testes-alvo do plano:
//   4) ocupação do resumo bate com a fonte viva (yard_spots.status, a MESMA tabela que o OccupancyService escreve);
//   5) soma dos buckets de fase bate com o total de processos do tenant;
//   6) arrecadação do resumo bate com a soma de SettlementAllocation.amount do período;
//   7) isolamento cross-tenant (3 tenants).
if (!connectionString) {
  test("Patios dashboard (PR-20) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("ocupação do painel == COUNT ao vivo em yard_spots (I1); buckets de fase somam o total do tenant (I5)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedScenario(client, suffix);
    try {
      const summary = await repo.getSummary({ tenantId: ctx.tenantId, now: new Date() });

      // (4) reconciliação de ocupação: raw COUNT direto em yard_spots (a MESMA tabela que o OccupancyService
      // escreve) tem de bater exatamente com o resumo do painel.
      const liveOccupancy = await liveOccupancyCounts(client, ctx.tenantId, ctx.yardId);
      const panelYard = summary.occupancy.find((yard) => yard.yardId === ctx.yardId);
      assert.ok(panelYard, "o pátio semeado aparece no resumo");
      assert.equal(panelYard!.totalSpots, liveOccupancy.total);
      assert.equal(panelYard!.occupiedSpots, liveOccupancy.occupied);
      assert.equal(panelYard!.freeSpots, liveOccupancy.free);
      assert.equal(panelYard!.occupiedSpots, 2, "2 vagas ocupadas pelos processos semeados");
      assert.equal(panelYard!.freeSpots, 1, "1 vaga livre");

      // (5) Σ dos buckets de fase == total de processos do tenant (nenhum processo "sem fase").
      const bucketSum = Object.values(summary.processesByPhase).reduce((sum, n) => sum + n, 0);
      assert.equal(bucketSum, summary.totalProcesses);
      const liveTotal = await countProcesses(client, ctx.tenantId);
      assert.equal(summary.totalProcesses, liveTotal, "totalProcesses reconcilia com COUNT ao vivo em impound_processes");
      assert.equal(summary.processesByPhase.CUSTODY, 1, "1 processo ACTIVE_CUSTODY");
      assert.equal(summary.processesByPhase.RECEPTION, 1, "1 processo RECEPTION");
      assert.equal(summary.processesByPhase.AUCTION, 1, "1 processo LOTTED");
      assert.equal(summary.processesByPhase.CLOSED, 1, "1 processo AUCTION_CLOSED");
      assert.equal(summary.openLots, 1, "1 processo LOTTED conta como lote aberto");
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("arrecadação do painel == Σ SettlementAllocation.amount ao vivo (I7)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedScenario(client, suffix);
    try {
      const summary = await repo.getSummary({ tenantId: ctx.tenantId, now: new Date() });
      const liveSum = await liveAllocationSum(client, ctx.tenantId);
      assert.equal(summary.auctionRevenue.grandTotal, liveSum.toFixed(2), "grandTotal reconcilia com Σ SettlementAllocation.amount");
      assert.ok(
        summary.auctionRevenue.byBeneficiary.some((row) => row.beneficiaryKind === "AUCTION_COST"),
        "byBeneficiary inclui o tier semeado",
      );
      const byBeneficiarySum = summary.auctionRevenue.byBeneficiary.reduce((sum, row) => sum + Number(row.totalAmount), 0);
      assert.equal(byBeneficiarySum.toFixed(2), liveSum.toFixed(2), "Σ byBeneficiary == grandTotal (sem drift entre agregações)");
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("isolamento cross-tenant: painel de A não mistura ocupação/fase/arrecadação de B nem de C", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffixA = uniq();
    const suffixB = uniq();
    const suffixC = uniq();
    const ctxA = await seedScenario(client, suffixA);
    const ctxB = await seedScenario(client, suffixB);
    const ctxC = await seedScenario(client, suffixC);
    try {
      const [summaryA, summaryB, summaryC] = await Promise.all([
        repo.getSummary({ tenantId: ctxA.tenantId, now: new Date() }),
        repo.getSummary({ tenantId: ctxB.tenantId, now: new Date() }),
        repo.getSummary({ tenantId: ctxC.tenantId, now: new Date() }),
      ]);
      for (const summary of [summaryA, summaryB, summaryC]) {
        assert.equal(summary.totalProcesses, 4, "cada tenant só vê os SEUS 4 processos semeados");
        assert.equal(summary.occupancy.length, 1, "cada tenant só vê o SEU pátio");
      }
      assert.notEqual(summaryA.occupancy[0]?.yardId, summaryB.occupancy[0]?.yardId);
      assert.notEqual(summaryA.occupancy[0]?.yardId, summaryC.occupancy[0]?.yardId);
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await teardown(client, ctxC.tenantId);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPatiosDashboardRepository } = await import("../src/modules/patios-dashboard/patios-dashboard-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client, repo: new RlsPatiosDashboardRepository(client) };
}

// Semeia: 1 pátio (1 área, 3 vagas: 2 OCCUPIED + 1 FREE) + 4 processos (1 por bucket de fase: RECEPTION,
// ACTIVE_CUSTODY, LOTTED[AUCTION], AUCTION_CLOSED[CLOSED]) + 1 settlement com 2 allocations no processo CLOSED.
async function seedScenario(client: BootstrapClient, suffix: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Painel ${suffix}`, slug: `painel-${suffix}` } });
  const tenantId = tenant.id;
  const custodyHash = "a".repeat(64);
  const custodyPrev = "b".repeat(64);

  const ids = await withTenantRls(client, tenantId, async (tx) => {
    const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenantId}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    const [yard] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO yards (tenant_id, name, address) VALUES (${tenantId}::uuid, ${`Pátio ${suffix}`}, 'Rua X, 1') RETURNING id
    `;
    const [area] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO yard_areas (tenant_id, yard_id, kind, name) VALUES (${tenantId}::uuid, ${yard.id}::uuid, 'BLOCK', 'Q-1') RETURNING id
    `;

    async function seedProcess(status: string, extra: Record<string, string> = {}): Promise<string> {
      const frozenAtSql = status === "AUCTION_CLOSED" || status === "LOTTED" ? "now()" : "NULL";
      const [proc] = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
         VALUES ('${tenantId}'::uuid, '${profile.id}'::uuid, 'Autoridade', true, 'Placa adulterada', '${status}', now() - interval '90 days', ${frozenAtSql}, 1, '${custodyHash}')
         RETURNING id`,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
         VALUES ('${tenantId}'::uuid, '${proc.id}'::uuid, 1, 'STATUS_CHANGE', '{"from":null,"to":"IN_REMOVAL"}'::jsonb, now(), '${custodyPrev}', '${custodyHash}')`,
      );
      return proc.id;
    }

    const receptionProcessId = await seedProcess("RECEPTION");
    const activeCustodyProcessId = await seedProcess("ACTIVE_CUSTODY");
    const lottedProcessId = await seedProcess("LOTTED");
    const closedProcessId = await seedProcess("AUCTION_CLOSED");

    // 3 vagas: 2 OCCUPIED (linkadas aos 2 primeiros processos) + 1 FREE.
    const [spot1] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO yard_spots (tenant_id, area_id, code, status, current_process_id)
      VALUES (${tenantId}::uuid, ${area.id}::uuid, 'S-1', 'OCCUPIED', ${receptionProcessId}::uuid) RETURNING id
    `;
    const [spot2] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO yard_spots (tenant_id, area_id, code, status, current_process_id)
      VALUES (${tenantId}::uuid, ${area.id}::uuid, 'S-2', 'OCCUPIED', ${activeCustodyProcessId}::uuid) RETURNING id
    `;
    const [spot3] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO yard_spots (tenant_id, area_id, code, status) VALUES (${tenantId}::uuid, ${area.id}::uuid, 'S-3', 'FREE') RETURNING id
    `;

    // Settlement + 2 allocations no processo CLOSED (base de I7 — arrecadação do painel).
    const [settlement] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO settlements (tenant_id, process_id, sold_round, hammer_amount, status)
      VALUES (${tenantId}::uuid, ${closedProcessId}::uuid, 1, '1000.00'::numeric, 'DISTRIBUTED') RETURNING id
    `;
    await tx.$executeRaw`
      INSERT INTO settlement_allocations (tenant_id, settlement_id, process_id, order_seq, beneficiary_kind, amount)
      VALUES (${tenantId}::uuid, ${settlement.id}::uuid, ${closedProcessId}::uuid, 1, 'AUCTION_COST', '400.00'::numeric)
    `;
    await tx.$executeRaw`
      INSERT INTO settlement_allocations (tenant_id, settlement_id, process_id, order_seq, beneficiary_kind, amount)
      VALUES (${tenantId}::uuid, ${settlement.id}::uuid, ${closedProcessId}::uuid, 2, 'OWNER_BALANCE', '600.00'::numeric)
    `;

    return {
      yardId: yard.id as string,
      spotIds: [spot1.id, spot2.id, spot3.id] as string[],
      processIds: [receptionProcessId, activeCustodyProcessId, lottedProcessId, closedProcessId],
    };
  });

  return { tenantId, ...ids };
}

async function liveOccupancyCounts(client: BootstrapClient, tenantId: string, yardId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ total: bigint; occupied: bigint; free: bigint }>>`
      SELECT COUNT(s.id) AS total,
             COUNT(s.id) FILTER (WHERE s.status = 'OCCUPIED') AS occupied,
             COUNT(s.id) FILTER (WHERE s.status = 'FREE') AS free
      FROM yard_spots s
      JOIN yard_areas a ON a.tenant_id = s.tenant_id AND a.id = s.area_id
      WHERE s.tenant_id = ${tenantId}::uuid AND a.yard_id = ${yardId}::uuid
    `,
  );
  return { total: Number(rows[0].total), occupied: Number(rows[0].occupied), free: Number(rows[0].free) };
}

async function countProcesses(client: BootstrapClient, tenantId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM impound_processes WHERE tenant_id = ${tenantId}::uuid`,
  );
  return rows[0].n;
}

async function liveAllocationSum(client: BootstrapClient, tenantId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ s: string | null }>>`
      SELECT sum(amount)::text AS s FROM settlement_allocations WHERE tenant_id = ${tenantId}::uuid
    `,
  );
  return Number(rows[0].s ?? 0);
}

// Teardown FK-safe: settlement_allocations → settlements → yard_spots → custody_events → impound_processes →
// yard_areas → yards → jurisdiction_profiles → audit_logs → tenant. custody_events tem TRIGGER append-only →
// session_replication_role=replica (superuser). Escopado por tenant (NUNCA wildcard).
// SEMPRE desconecta (finally) — cada teste abre um PrismaClient PRÓPRIO (bootstrap); sem $disconnect() a conexão
// vaza e esgota o pool, travando os testes seguintes da suíte (lição do PR-20: idêntico ao padrão consagrado em
// impound-concurrency.test.ts:353-372).
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM settlement_allocations WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM settlements WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM yard_spots WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_outbox_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM yard_areas WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM yards WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await client.$disconnect();
  }
}
