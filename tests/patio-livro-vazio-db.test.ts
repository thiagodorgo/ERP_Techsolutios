import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("patio-livro-vazio-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para executar a suíte -db." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { withTenantRls } = await import("../src/database/rls.js");
  const { RlsPrismaReleaseRepository } = await import("../src/modules/release/release-prisma.repository.js");

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const releaseRepo = new RlsPrismaReleaseRepository(client);

  type SeedCtx = {
    tenantId: string;
    processId: string;
    releaseId: string;
    enteredAt: Date;
    frozenAt: Date;
  };

  async function seedReleaseInProgress(suffix: string): Promise<SeedCtx> {
    const tenant = await client.tenant.create({ data: { name: `Patio Livro ${suffix}`, slug: `patio-livro-${suffix}` } });
    const custodyHash = "a".repeat(64);
    const custodyPrev = "b".repeat(64);
    const enteredAt = new Date(Date.now() - (3 * 86_400_000 + 2 * 3_600_000));
    const frozenAt = new Date();
    const seeded = await withTenantRls(client, tenant.id, async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO jurisdiction_profiles (tenant_id, name, scope)
        VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT')
        RETURNING id
      `;
      const [process] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
        VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', 'RELEASE_IN_PROGRESS', ${enteredAt}, ${frozenAt}, 1, ${custodyHash})
        RETURNING id
      `;
      await tx.$queryRaw`
        INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
        VALUES (${tenant.id}::uuid, ${process.id}::uuid, 1, 'STATUS_CHANGE', ${'{"from":null,"to":"IN_REMOVAL"}'}::jsonb, now(), ${custodyPrev}, ${custodyHash})
      `;
      const [release] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_releases (tenant_id, process_id, kind, status, recipient_name, authority_approved_by, authority_approved_at)
        VALUES (${tenant.id}::uuid, ${process.id}::uuid, 'STANDARD', 'AUTHORIZED', 'Quem Retira', gen_random_uuid(), now())
        RETURNING id
      `;
      return { processId: process.id, releaseId: release.id };
    });
    return { tenantId: tenant.id, processId: seeded.processId, releaseId: seeded.releaseId, enteredAt, frozenAt };
  }

  async function seedActiveCustody(suffix: string): Promise<{ tenantId: string; processId: string; enteredAt: Date }> {
    const tenant = await client.tenant.create({ data: { name: `Patio Start ${suffix}`, slug: `patio-start-${suffix}` } });
    const custodyHash = "c".repeat(64);
    const custodyPrev = "d".repeat(64);
    const enteredAt = new Date(Date.now() - (3 * 86_400_000 + 2 * 3_600_000));
    const seeded = await withTenantRls(client, tenant.id, async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO jurisdiction_profiles (tenant_id, name, scope)
        VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT')
        RETURNING id
      `;
      const [process] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
        VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', 'ACTIVE_CUSTODY', ${enteredAt}, NULL, 1, ${custodyHash})
        RETURNING id
      `;
      await tx.$queryRaw`
        INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
        VALUES (${tenant.id}::uuid, ${process.id}::uuid, 1, 'STATUS_CHANGE', ${'{"from":null,"to":"IN_REMOVAL"}'}::jsonb, now(), ${custodyPrev}, ${custodyHash})
      `;
      return { processId: process.id };
    });
    return { tenantId: tenant.id, processId: seeded.processId, enteredAt };
  }

  async function teardownTenant(tenantId: string): Promise<void> {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM release_requirement_checks WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_releases WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM process_charges WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_outbox_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  }

  const payload = {
    event: "RELEASE",
    releaseId: "",
    authorityApprovalRef: null,
    settledTotal: "0.00",
    requirementCodes: [] as string[],
    enteredAt: null,
    releasedAt: new Date().toISOString(),
  };

  test("DB-1: consumeReleaseAtomic expectedDailyCount=3 e livro vazio -> release_daily_charges_missing", async () => {
    const ctx = await seedReleaseInProgress(`db1-${Date.now()}`);
    try {
      await assert.rejects(
        () =>
          releaseRepo.consumeReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "0.00",
            overAccruedDailyIds: [],
            eventPayload: { ...payload, releaseId: ctx.releaseId },
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: { expectedDailyCount: 3, enteredAt: ctx.enteredAt, frozenAt: ctx.frozenAt },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "release_daily_charges_missing",
      );
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-2: consumeReleaseAtomic expectedDailyCount=0 e livro vazio -> release_no_charges_posted", async () => {
    const ctx = await seedReleaseInProgress(`db2-${Date.now()}`);
    try {
      await assert.rejects(
        () =>
          releaseRepo.consumeReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "0.00",
            overAccruedDailyIds: [],
            eventPayload: { ...payload, releaseId: ctx.releaseId },
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: { expectedDailyCount: 0, enteredAt: ctx.enteredAt, frozenAt: ctx.frozenAt },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "release_no_charges_posted",
      );
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-3: startReleaseAtomic expectedDailyCount=3 e livro vazio -> release_daily_charges_missing", async () => {
    const ctx = await seedActiveCustody(`db3-${Date.now()}`);
    try {
      await assert.rejects(
        () =>
          releaseRepo.startReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            expectedFrom: "ACTIVE_CUSTODY",
            kind: "STANDARD",
            requirements: [],
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: { expectedDailyCount: 3, enteredAt: ctx.enteredAt, frozenAt: new Date() },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "release_daily_charges_missing",
      );
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-4: base divergente no start e no consume -> concurrent_custody_append", async () => {
    const startCtx = await seedActiveCustody(`db4-start-${Date.now()}`);
    const consumeCtx = await seedReleaseInProgress(`db4-consume-${Date.now()}`);
    try {
      await assert.rejects(
        () =>
          releaseRepo.startReleaseAtomic({
            tenantId: startCtx.tenantId,
            processId: startCtx.processId,
            expectedFrom: "ACTIVE_CUSTODY",
            kind: "STANDARD",
            requirements: [],
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: {
              expectedDailyCount: 3,
              enteredAt: new Date(startCtx.enteredAt.getTime() - 86_400_000),
              frozenAt: new Date(),
            },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "concurrent_custody_append",
      );

      await assert.rejects(
        () =>
          releaseRepo.consumeReleaseAtomic({
            tenantId: consumeCtx.tenantId,
            processId: consumeCtx.processId,
            releaseId: consumeCtx.releaseId,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "0.00",
            overAccruedDailyIds: [],
            eventPayload: { ...payload, releaseId: consumeCtx.releaseId },
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: {
              expectedDailyCount: 3,
              enteredAt: new Date(consumeCtx.enteredAt.getTime() - 86_400_000),
              frozenAt: new Date(consumeCtx.frozenAt.getTime() - 86_400_000),
            },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "concurrent_custody_append",
      );
    } finally {
      await teardownTenant(startCtx.tenantId);
      await teardownTenant(consumeCtx.tenantId);
    }
  });
}
