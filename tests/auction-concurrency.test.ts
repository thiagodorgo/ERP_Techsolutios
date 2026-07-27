import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// I8 sob CONCORRÊNCIA REAL + isolamento cross-tenant. DB-gated (skip sem DATABASE_URL, como rls-tenant-isolation/
// release-gate-concurrency) — Node é single-thread; a corrida real exige o banco (FOR UPDATE do processo + partial-
// unique da rodada + RLS). Testa: (5) cross-tenant RLS; (6a) eligibility×release/start → expectedFrom deixa 1 vencer;
// (6b) strike concorrente na mesma rodada → exatamente 1.
if (!connectionString) {
  test("Auction concurrency (I8) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 6;

  // (5) cross-tenant RLS: eligibility/strike em processo de OUTRO tenant ⇒ não encontrado (o FOR UPDATE escopado por
  // tenant + RLS não enxerga a linha).
  test("(5) cross-tenant: markEligible/recordAttempt em processo de outro tenant ⇒ 404 process_not_found", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `xt-${stamp()}`, "ACTIVE_CUSTODY");
    const otherTenant = await client.tenant.create({ data: { name: `Auc XT ${stamp()}`, slug: `auc-xt-${stamp()}` } });
    try {
      await assert.rejects(
        () => auction.markEligibleAtomic({ tenantId: otherTenant.id, processId: ctx.processId, expectedFrom: "ACTIVE_CUSTODY", actorId: undefined, occurredAt: new Date() }),
        (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 404 && (error as { reason?: string }).reason === "process_not_found",
      );
      await assert.rejects(
        () => auction.recordAttemptAtomic({ tenantId: otherTenant.id, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, maxAttempts: 2, notes: undefined, actorId: undefined, occurredAt: new Date() }),
        (error: unknown) => (error as { statusCode?: number; reason?: string }).statusCode === 404 && (error as { reason?: string }).reason === "process_not_found",
      );
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await teardownTenant(client, otherTenant.id);
      await client.$disconnect();
    }
  });

  // (6a) eligibility × release/start concorrentes no MESMO processo (ambas partem de ACTIVE_CUSTODY) → exatamente 1
  // vence (expectedFrom sob FOR UPDATE); a outra 409.
  test("(6a) eligibility × release/start concorrentes → exatamente 1 vence, a outra 409", async () => {
    const { client, auction, release } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `race-${stamp()}`, "ACTIVE_CUSTODY");
    try {
      const results = await Promise.allSettled([
        auction.markEligibleAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "ACTIVE_CUSTODY", actorId: undefined, occurredAt: new Date() }),
        release.startReleaseAtomic({
          tenantId: ctx.tenantId,
          processId: ctx.processId,
          expectedFrom: "ACTIVE_CUSTODY",
          kind: "STANDARD",
          requirements: [],
          actorId: undefined,
          occurredAt: new Date(),
        }),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      assert.equal(fulfilled.length, 1, "exatamente 1 transição deve vencer a corrida");
      assert.equal(rejected.length, 1);
      const error = (rejected[0] as PromiseRejectedResult).reason as { statusCode?: number; reason?: string };
      assert.equal(error.statusCode, 409);
      assert.ok(
        ["concurrent_custody_append", "release_already_in_progress", "release_not_active"].includes(error.reason ?? ""),
        `reason inesperado: ${error.reason}`,
      );
      const status = (await selectProcess(client, ctx.tenantId, ctx.processId)).status;
      assert.ok(["AUCTION_ELIGIBLE", "RELEASE_IN_PROGRESS"].includes(status), `status final inesperado: ${status}`);
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (6c) BAIXO-C — startForRepairDossier (release) × markEligibleAtomic concorrentes no MESMO processo ACTIVE_CUSTODY:
  // ambas partem de ACTIVE_CUSTODY (o for-repair-montar NÃO transiciona, mas cria dossiê IN_PROGRESS). O FOR UPDATE
  // deixa exatamente 1 vencer: se o montar ganha, markEligible re-checa a liberação em curso sob o lock → 409
  // auction_release_in_progress; se markEligible ganha, o montar vê status != ACTIVE_CUSTODY → invalid_transition.
  test("(6c) for-repair-montar × markEligible concorrentes → exatamente 1 vence; o outro 409 (release-em-curso ou invalid_transition)", async () => {
    const { client, auction, release } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `repair-race-${stamp()}`, "ACTIVE_CUSTODY");
    try {
      const results = await Promise.allSettled([
        auction.markEligibleAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "ACTIVE_CUSTODY", actorId: undefined, occurredAt: new Date() }),
        release.startForRepairDossier({
          tenantId: ctx.tenantId,
          processId: ctx.processId,
          expectedStatus: "ACTIVE_CUSTODY",
          repairDeadline: new Date(Date.now() + 30 * 86_400_000),
          actorId: undefined,
        }),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      assert.equal(fulfilled.length, 1, "exatamente 1 deve vencer a corrida");
      assert.equal(rejected.length, 1);
      const error = (rejected[0] as PromiseRejectedResult).reason as { statusCode?: number; reason?: string };
      assert.equal(error.statusCode, 409);
      assert.ok(
        ["auction_release_in_progress", "invalid_transition", "concurrent_custody_append"].includes(error.reason ?? ""),
        `reason inesperado: ${error.reason}`,
      );
      const status = (await selectProcess(client, ctx.tenantId, ctx.processId)).status;
      assert.ok(["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"].includes(status), `status final inesperado: ${status}`);
    } finally {
      await teardownTenant(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // (6b) N strikes concorrentes na MESMA rodada no MESMO processo → exatamente 1 registra (partial-unique
  // auction_attempts_round_idem_key; 23505 engolido sob o lock) → 1 strike, sem dupla-transição.
  test("(6b) N strikes concorrentes na mesma round_number → exatamente 1 registrado, strikeCount=1, sem reciclagem", async () => {
    const { client, auction } = await bootstrap(connectionString);
    const ctx = await seedProcess(client, `strike-${stamp()}`, "AUCTION_ELIGIBLE");
    // Ω5P PR-13a — o recordAttempt é EDICT-GATED: registra o edital da rodada 1 (senão 409 auction_edict_missing).
    await seedEdict(client, ctx.tenantId, ctx.processId, 1);
    try {
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, () =>
          auction.recordAttemptAtomic({ tenantId: ctx.tenantId, processId: ctx.processId, expectedFrom: "AUCTION_ELIGIBLE", roundNumber: 1, maxAttempts: 2, notes: undefined, actorId: undefined, occurredAt: new Date() }),
        ),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ created: boolean; strikeCount: number; reclassified: boolean }>[];
      assert.equal(fulfilled.length, CONCURRENCY, "todas devem resolver (idempotência engole o 23505)");
      const created = fulfilled.filter((r) => r.value.created);
      assert.equal(created.length, 1, "exatamente 1 registro criado na mesma rodada");
      for (const r of fulfilled) {
        assert.equal(r.value.strikeCount, 1, "strikeCount = 1 (não dupla-conta)");
        assert.equal(r.value.reclassified, false, "1 strike não recicla");
      }
      const rows = await countAttempts(client, ctx.tenantId, ctx.processId);
      assert.equal(rows, 1, "exatamente 1 auction_attempts na rodada 1");
      assert.equal((await selectProcess(client, ctx.tenantId, ctx.processId)).status, "AUCTION_ELIGIBLE", "processo segue elegível (sem reciclagem)");
    } finally {
      await teardownTenant(client, ctx.tenantId);
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
  const { RlsPrismaReleaseRepository } = await import("../src/modules/release/release-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client, auction: new RlsPrismaAuctionRepository(client), release: new RlsPrismaReleaseRepository(client) };
}

// Semeia um processo no status pedido (ACTIVE_CUSTODY não-congelado ou AUCTION_ELIGIBLE) + 1 custody_event de abertura.
async function seedProcess(client: BootstrapClient, suffix: string, status: "ACTIVE_CUSTODY" | "AUCTION_ELIGIBLE") {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Auc Conc ${suffix}`, slug: `auc-conc-${suffix}` } });
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

async function selectProcess(client: BootstrapClient, tenantId: string, processId: string): Promise<{ status: string }> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid`,
  );
  return rows[0];
}

// Ω5P PR-13a — semeia o edital de uma rodada (auction_edicts) sob RLS, para habilitar o strike edict-gated.
async function seedEdict(client: BootstrapClient, tenantId: string, processId: string, round: number): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO auction_edicts (tenant_id, process_id, round_number, edict_reference, business_days, status)
      VALUES (${tenantId}::uuid, ${processId}::uuid, ${round}, ${`EDITAL-CONC-${round}`}, 15, 'DESIGNATED')
    `,
  );
}

async function countAttempts(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM auction_attempts WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid`,
  );
  return rows[0].n;
}

// Teardown FK-safe de UM tenant (sem disconnect): auction_edicts/auction_attempts ANTES de custody_events/
// impound_processes (FK composta RESTRICT filha→mãe — I9) e impound_releases (do teste 6a). custody_events tem
// TRIGGER append-only → replica. Escopado por tenant (NUNCA wildcard).
async function teardownTenant(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM auction_edicts WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM auction_attempts WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM release_requirement_checks WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_releases WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
