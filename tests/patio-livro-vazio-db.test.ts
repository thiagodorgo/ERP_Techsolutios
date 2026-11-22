import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;
const MS_PER_DAY = 86_400_000;

if (!connectionString) {
  test("patio-livro-vazio-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para executar a suíte -db." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  const [{ createPrismaClient }] = await Promise.all([import("../src/database/pg-connection.js")]);
  const { withTenantRls } = await import("../src/database/rls.js");
  const { RlsPrismaReleaseRepository } = await import("../src/modules/release/release-prisma.repository.js");
  const { createDefaultReleaseService } = await import("../src/modules/release/release.service.js");
  const { createDefaultChargeService } = await import("../src/modules/charging/charge.service.js");

  const client = createPrismaClient(connectionString);
  const releaseRepo = new RlsPrismaReleaseRepository(client);

  type ProcCtx = {
    tenantId: string;
    profileId: string;
    processId: string;
    userId: string;
    enteredAt: Date;
    frozenAt: Date | null;
    releaseId?: string;
  };

  type Actor = { tenantId: string; userId?: string; roles: readonly string[]; permissions: readonly string[] };

  function actor(tenantId: string, userId?: string): Actor {
    return {
      tenantId,
      userId,
      roles: ["manager"],
      permissions: ["impound:read", "impound:transition", "release:process", "release:approve", "charging:settle"],
    };
  }

  async function seedActiveCustody(suffix: string, enteredAt: Date, cap: "SIX_MONTHS" | "THIRTY_DAYS_LEGACY" = "SIX_MONTHS"): Promise<ProcCtx> {
    const tenant = await client.tenant.create({ data: { name: `Patio Livro ${suffix}`, slug: `patio-livro-${suffix}` } });
    const custodyHash = "a".repeat(64);
    const custodyPrev = "b".repeat(64);
    const seeded = await withTenantRls(client, tenant.id, async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO jurisdiction_profiles (tenant_id, name, scope, daily_model, daily_cap)
        VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT', 'ROLLING_24H', ${cap})
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
      const [user] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO users (tenant_id, name, email, status)
        VALUES (${tenant.id}::uuid, 'Operador Pátio', ${`patio-${suffix.toLowerCase()}@example.com`}, 'active')
        RETURNING id
      `;
      return { profileId: profile.id, processId: process.id, userId: user.id };
    });
    return { tenantId: tenant.id, profileId: seeded.profileId, processId: seeded.processId, userId: seeded.userId, enteredAt, frozenAt: null };
  }

  async function seedReleaseInProgress(suffix: string, enteredAt: Date, frozenAt: Date): Promise<ProcCtx> {
    const tenant = await client.tenant.create({ data: { name: `Patio Legado ${suffix}`, slug: `patio-legado-${suffix}` } });
    const custodyHash = "c".repeat(64);
    const custodyPrev = "d".repeat(64);
    const seeded = await withTenantRls(client, tenant.id, async (tx) => {
      const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO jurisdiction_profiles (tenant_id, name, scope, daily_model, daily_cap)
        VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT', 'ROLLING_24H', 'SIX_MONTHS')
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
      const [user] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO users (tenant_id, name, email, status)
        VALUES (${tenant.id}::uuid, 'Operador Legado', ${`legacy-${suffix.toLowerCase()}@example.com`}, 'active')
        RETURNING id
      `;
      const [release] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO impound_releases (tenant_id, process_id, kind, status, recipient_name, authority_approved_by, authority_approved_at)
        VALUES (${tenant.id}::uuid, ${process.id}::uuid, 'STANDARD', 'AUTHORIZED', 'Quem Retira', ${user.id}::uuid, now())
        RETURNING id
      `;
      return { profileId: profile.id, processId: process.id, releaseId: release.id, userId: user.id };
    });
    return {
      tenantId: tenant.id,
      profileId: seeded.profileId,
      processId: seeded.processId,
      userId: seeded.userId,
      releaseId: seeded.releaseId,
      enteredAt,
      frozenAt,
    };
  }

  async function seedDailyPricing(tenantId: string, profileId: string, unitPrice = "40.00"): Promise<string> {
    const service = await client.serviceCatalog.create({ data: { tenant_id: tenantId, name: `Diária ${randomUUID().slice(0, 6)}` } });
    await client.$executeRawUnsafe(
      `UPDATE jurisdiction_profiles SET daily_service_catalog_id = $1::uuid WHERE tenant_id = $2::uuid AND id = $3::uuid`,
      service.id,
      tenantId,
      profileId,
    );
    const table = await client.priceTable.create({
      data: {
        tenant_id: tenantId,
        name: `Tabela ${randomUUID().slice(0, 6)}`,
        currency: "BRL",
        status: "published",
        is_active: true,
      },
    });
    await client.tariff.create({
      data: {
        tenant_id: tenantId,
        price_table_id: table.id,
        service_catalog_id: service.id,
        name: "Diária",
        unit_price: unitPrice,
        currency: "BRL",
        origin: "test",
        status: "active",
        is_active: true,
      },
    });
    return service.id;
  }

  async function addRemoval(tenantId: string, processId: string, settled = false): Promise<void> {
    await withTenantRls(client, tenantId, async (tx) => {
      await tx.$queryRaw`
        INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount, settled_at)
        VALUES (${tenantId}::uuid, ${processId}::uuid, 'REMOVAL', 1, 150.00, 150.00, ${settled ? new Date() : null})
      `;
    });
  }

  async function countCharges(tenantId: string, processId: string, kind?: string): Promise<number> {
    if (kind) {
      const filtered = await withTenantRls(client, tenantId, (tx) =>
        tx.$queryRaw<Array<{ n: number }>>`
          SELECT count(*)::int AS n
          FROM process_charges
          WHERE tenant_id = ${tenantId}::uuid
            AND process_id = ${processId}::uuid
            AND kind = ${kind}
        `,
      );
      return filtered[0]?.n ?? 0;
    }
    const rows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n
        FROM process_charges
        WHERE tenant_id = ${tenantId}::uuid
          AND process_id = ${processId}::uuid
      `,
    );
    return rows[0]?.n ?? 0;
  }

  async function latestFrozenAt(tenantId: string, processId: string): Promise<Date | null> {
    const rows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ frozen_at: Date | null }>>`
        SELECT frozen_at FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      `,
    );
    return rows[0]?.frozen_at ?? null;
  }

  async function processStatus(tenantId: string, processId: string): Promise<string | undefined> {
    const rows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      `,
    );
    return rows[0]?.status;
  }

  async function completedReleaseCount(tenantId: string, processId: string): Promise<number> {
    const rows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n
        FROM impound_releases
        WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND status = 'COMPLETED'
      `,
    );
    return rows[0]?.n ?? 0;
  }

  async function assertChainValid(tenantId: string, processId: string): Promise<void> {
    const headRows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ custody_seq_head: number; custody_hash_head: string | null }>>`
        SELECT custody_seq_head, custody_hash_head
        FROM impound_processes
        WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      `,
    );
    const eventRows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ seq: number; type: string; payload: unknown; occurred_at: Date; actor_id: string | null; prev_hash: string; hash: string }>>`
        SELECT seq, type, payload, occurred_at, actor_id, prev_hash, hash
        FROM custody_events
        WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid
        ORDER BY seq ASC
      `,
    );
    const head = headRows[0];
    assert.ok(head, "head da cadeia deve existir");
    assert.ok(eventRows.length > 0, "cadeia deve ter eventos");
    for (let index = 0; index < eventRows.length; index += 1) {
      const event = eventRows[index];
      assert.equal(event.seq, index + 1, "cadeia com seq contínuo");
      if (index > 0) {
        const prev = eventRows[index - 1];
        assert.equal(event.prev_hash, prev.hash, "cadeia com elo íntegro");
      }
    }
    const tip = eventRows[eventRows.length - 1];
    assert.equal(head.custody_seq_head, tip.seq, "head.seq igual ao último evento");
    assert.equal(head.custody_hash_head, tip.hash, "head.hash igual ao último evento");
  }

  async function releaseCount(tenantId: string, processId: string): Promise<number> {
    const rows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: number }>>`
        SELECT count(*)::int AS n
        FROM impound_releases
        WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid
      `,
    );
    return rows[0]?.n ?? 0;
  }

  async function assertReleaseSettledTotalMatchesEvent(tenantId: string, processId: string): Promise<void> {
    const releaseRows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ settled_total: string | null }>>`
        SELECT settled_total::text
        FROM impound_releases
        WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND status = 'COMPLETED'
        ORDER BY released_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `,
    );
    const eventRows = await withTenantRls(client, tenantId, (tx) =>
      tx.$queryRaw<Array<{ settled_total: string | null }>>`
        SELECT payload->>'settledTotal' AS settled_total
        FROM custody_events
        WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'RELEASE'
        ORDER BY seq DESC
        LIMIT 1
      `,
    );
    const releaseTotal = releaseRows[0]?.settled_total ?? null;
    const eventTotal = eventRows[0]?.settled_total ?? null;
    assert.ok(releaseTotal, "release COMPLETED deve ter settled_total");
    assert.equal(eventTotal, releaseTotal, "evento RELEASE settledTotal deve igualar impound_releases.settled_total");
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
      await tx.$executeRawUnsafe(`DELETE FROM tariffs WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM price_tables WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = '${tenantId}'::uuid`);
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

  test("A: cadeia real sem serviço diário -> start recusa release_daily_charges_unpostable", async () => {
    const ctx = await seedActiveCustody(`A-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
    const release = await createDefaultReleaseService();
    try {
      await assert.rejects(
        () => release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" }),
        (error: unknown) => (error as { reason?: string }).reason === "release_daily_charges_unpostable",
      );
      assert.equal(await processStatus(ctx.tenantId, ctx.processId), "ACTIVE_CUSTODY");
      assert.equal(await latestFrozenAt(ctx.tenantId, ctx.processId), null);
      assert.equal(await releaseCount(ctx.tenantId, ctx.processId), 0);
      assert.equal(await countCharges(ctx.tenantId, ctx.processId), 0);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("A2: cadeia real com tarifa T -> start lança 3 DAILY e consume recusa debts_unsettled", async () => {
    const ctx = await seedActiveCustody(`A2-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
    const release = await createDefaultReleaseService();
    const charge = await createDefaultChargeService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" });
      assert.equal(await countCharges(ctx.tenantId, ctx.processId, "DAILY"), 3);
      await release.approve(actor(ctx.tenantId, ctx.userId), ctx.processId, { authority_reference: "AUT" });
      await assert.rejects(
        () => release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
        (error: unknown) => (error as { reason?: string }).reason === "release_debts_unsettled",
      );
      await charge.settle(actor(ctx.tenantId, ctx.userId), ctx.processId, {});
      const view = await release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId);
      assert.equal(view.release.status, "COMPLETED");
      assert.equal(view.release.settledTotal, "120.00");
      await assertChainValid(ctx.tenantId, ctx.processId);
      await assertReleaseSettledTotalMatchesEvent(ctx.tenantId, ctx.processId);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("A3: legado congelado e livro vazio com tarifa -> consume recusa debts_unsettled", async () => {
    const frozenAt = new Date(Date.now() - 2 * MS_PER_DAY);
    const enteredAt = new Date(Date.now() - (5 * MS_PER_DAY + 2 * 3_600_000));
    const ctx = await seedReleaseInProgress(`A3-${Date.now()}`, enteredAt, frozenAt);
    const release = await createDefaultReleaseService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await assert.rejects(
        () => release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
        (error: unknown) => (error as { reason?: string }).reason === "release_debts_unsettled",
      );
      assert.equal(await countCharges(ctx.tenantId, ctx.processId, "DAILY"), 3);
      const unsettledDailies = await withTenantRls(client, ctx.tenantId, (tx) =>
        tx.$queryRaw<Array<{ n: number }>>`
          SELECT count(*)::int AS n
          FROM process_charges
          WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid
            AND kind = 'DAILY' AND settled_at IS NULL
        `,
      );
      assert.equal(unsettledDailies[0]?.n ?? 0, 3);
      assert.equal(await processStatus(ctx.tenantId, ctx.processId), "RELEASE_IN_PROGRESS");
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("A3b: legado congelado sem serviço diário -> consume recusa release_daily_charges_unpostable", async () => {
    const frozenAt = new Date(Date.now() - 2 * MS_PER_DAY);
    const enteredAt = new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000));
    const ctx = await seedReleaseInProgress(`A3b-${Date.now()}`, enteredAt, frozenAt);
    const release = await createDefaultReleaseService();
    try {
      await assert.rejects(
        () => release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
        (error: unknown) => (error as { reason?: string }).reason === "release_daily_charges_unpostable",
      );
      assert.equal(await processStatus(ctx.tenantId, ctx.processId), "RELEASE_IN_PROGRESS");
      assert.equal(await countCharges(ctx.tenantId, ctx.processId), 0);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("B: controle com REMOVAL não quitada -> release_debts_unsettled", async () => {
    const ctx = await seedActiveCustody(`B-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
    const release = await createDefaultReleaseService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await addRemoval(ctx.tenantId, ctx.processId, false);
      await release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" });
      await release.approve(actor(ctx.tenantId, ctx.userId), ctx.processId, { authority_reference: "AUT" });
      await assert.rejects(
        () => release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
        (error: unknown) => (error as { reason?: string }).reason === "release_debts_unsettled",
      );
      assert.equal(await processStatus(ctx.tenantId, ctx.processId), "RELEASE_IN_PROGRESS");
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("C: REMOVAL quitada antes do start -> start lança diárias e consume recusa até quitar", async () => {
    const ctx = await seedActiveCustody(`C-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
    const release = await createDefaultReleaseService();
    const charge = await createDefaultChargeService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await addRemoval(ctx.tenantId, ctx.processId, true);
      await release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" });
      assert.equal(await countCharges(ctx.tenantId, ctx.processId), 4);
      await release.approve(actor(ctx.tenantId, ctx.userId), ctx.processId, { authority_reference: "AUT" });
      await assert.rejects(
        () => release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
        (error: unknown) => (error as { reason?: string }).reason === "release_debts_unsettled",
      );
      await charge.settle(actor(ctx.tenantId, ctx.userId), ctx.processId, {});
      const view = await release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId);
      assert.equal(view.release.status, "COMPLETED");
      assert.equal(view.release.settledTotal, "270.00");
      await assertChainValid(ctx.tenantId, ctx.processId);
      await assertReleaseSettledTotalMatchesEvent(ctx.tenantId, ctx.processId);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("D: entrada há 1h e livro vazio -> consume recusa release_no_charges_posted", async () => {
    const ctx = await seedActiveCustody(`D-${Date.now()}`, new Date(Date.now() - 3_600_000));
    const release = await createDefaultReleaseService();
    try {
      await release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" });
      await release.approve(actor(ctx.tenantId, ctx.userId), ctx.processId, { authority_reference: "AUT" });
      await assert.rejects(
        () => release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
        (error: unknown) => (error as { reason?: string }).reason === "release_no_charges_posted",
      );
      await addRemoval(ctx.tenantId, ctx.processId, true);
      const view = await release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId);
      assert.equal(view.release.status, "COMPLETED");
      assert.equal(view.release.settledTotal, "150.00");
      await assertChainValid(ctx.tenantId, ctx.processId);
      await assertReleaseSettledTotalMatchesEvent(ctx.tenantId, ctx.processId);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("E: teto de 30 diárias com 40 dias -> start lança exatamente 30 e quitadas libera", async () => {
    const ctx = await seedActiveCustody(`E-${Date.now()}`, new Date(Date.now() - 40 * MS_PER_DAY), "THIRTY_DAYS_LEGACY");
    const release = await createDefaultReleaseService();
    const charge = await createDefaultChargeService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" });
      assert.equal(await countCharges(ctx.tenantId, ctx.processId, "DAILY"), 30);
      await addRemoval(ctx.tenantId, ctx.processId, true);
      await release.approve(actor(ctx.tenantId, ctx.userId), ctx.processId, { authority_reference: "AUT" });
      await charge.settle(actor(ctx.tenantId, ctx.userId), ctx.processId, {});
      const view = await release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId);
      assert.equal(view.release.status, "COMPLETED");
      assert.equal(view.release.settledTotal, "1350.00");
      await assertChainValid(ctx.tenantId, ctx.processId);
      await assertReleaseSettledTotalMatchesEvent(ctx.tenantId, ctx.processId);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("G: congelado há 2 dias com livro completo e quitado -> consume libera", async () => {
    const frozenAt = new Date(Date.now() - 2 * MS_PER_DAY);
    const enteredAt = new Date(Date.now() - (5 * MS_PER_DAY + 2 * 3_600_000));
    const ctx = await seedReleaseInProgress(`G-${Date.now()}`, enteredAt, frozenAt);
    const release = await createDefaultReleaseService();
    const charge = await createDefaultChargeService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await addRemoval(ctx.tenantId, ctx.processId, true);
      await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), undefined);
      await charge.settle(actor(ctx.tenantId, ctx.userId), ctx.processId, {});
      const view = await release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId);
      assert.equal(view.release.status, "COMPLETED");
      assert.equal(await countCharges(ctx.tenantId, ctx.processId, "DAILY"), 3);
      assert.equal(view.release.settledTotal, "270.00");
      await assertChainValid(ctx.tenantId, ctx.processId);
      await assertReleaseSettledTotalMatchesEvent(ctx.tenantId, ctx.processId);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("H: processo já congelado mantém frozen_at no start", async () => {
    const ctx = await seedActiveCustody(`H-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
    const release = await createDefaultReleaseService();
    const charge = await createDefaultChargeService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      const frozenAt = new Date(Date.now() - 2 * MS_PER_DAY);
      await withTenantRls(client, ctx.tenantId, (tx) =>
        tx.$queryRaw`UPDATE impound_processes SET frozen_at = ${frozenAt}, status = 'ACTIVE_CUSTODY' WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${ctx.processId}::uuid`,
      );
      await charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), undefined);
      await addRemoval(ctx.tenantId, ctx.processId, true);
      await charge.settle(actor(ctx.tenantId, ctx.userId), ctx.processId, {});
      await release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" });
      assert.equal((await latestFrozenAt(ctx.tenantId, ctx.processId))?.getTime(), frozenAt.getTime());
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-1: consumeReleaseAtomic expectedDailyCount=3 e livro vazio -> release_daily_charges_missing", async () => {
    const ctx = await seedReleaseInProgress(`db1-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)), new Date());
    try {
      await assert.rejects(
        () =>
          releaseRepo.consumeReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId!,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "0.00",
            overAccruedDailyIds: [],
            eventPayload: { ...payload, releaseId: ctx.releaseId! },
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: { expectedDailyCount: 3, enteredAt: ctx.enteredAt, frozenAt: ctx.frozenAt! },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "release_daily_charges_missing",
      );
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-2: consumeReleaseAtomic expectedDailyCount=0 e livro vazio -> release_no_charges_posted", async () => {
    const ctx = await seedReleaseInProgress(`db2-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)), new Date());
    try {
      await assert.rejects(
        () =>
          releaseRepo.consumeReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId!,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "0.00",
            overAccruedDailyIds: [],
            eventPayload: { ...payload, releaseId: ctx.releaseId! },
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: { expectedDailyCount: 0, enteredAt: ctx.enteredAt, frozenAt: ctx.frozenAt! },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "release_no_charges_posted",
      );
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-3: startReleaseAtomic expectedDailyCount=3 e livro vazio -> release_daily_charges_missing", async () => {
    const ctx = await seedActiveCustody(`db3-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
    try {
      const occurredAt = new Date();
      await assert.rejects(
        () =>
          releaseRepo.startReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            expectedFrom: "ACTIVE_CUSTODY",
            kind: "STANDARD",
            requirements: [],
            actorId: undefined,
            occurredAt,
            chargeBasis: { expectedDailyCount: 3, enteredAt: ctx.enteredAt, frozenAt: occurredAt },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "release_daily_charges_missing",
      );
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-4a: start com base divergente -> concurrent_custody_append", async () => {
    const ctx = await seedActiveCustody(`db4a-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
    try {
      const frozenAtBefore = await latestFrozenAt(ctx.tenantId, ctx.processId);
      const releasesBefore = await releaseCount(ctx.tenantId, ctx.processId);
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await addRemoval(ctx.tenantId, ctx.processId, true);
      await withTenantRls(client, ctx.tenantId, async (tx) => {
        for (let seq = 1; seq <= 3; seq += 1) {
          await tx.$queryRaw`
            INSERT INTO process_charges (tenant_id, process_id, kind, period_seq, ref_date, quantity, unit_amount, total_amount, settled_at)
            VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'DAILY', ${seq}, CURRENT_DATE, 1, 40.00, 40.00, now())
          `;
        }
      });
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
            chargeBasis: {
              expectedDailyCount: 3,
              enteredAt: ctx.enteredAt,
              frozenAt: new Date(ctx.enteredAt.getTime()),
            },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "concurrent_custody_append",
      );
      assert.equal((await latestFrozenAt(ctx.tenantId, ctx.processId))?.getTime() ?? null, frozenAtBefore?.getTime() ?? null);
      assert.equal(await releaseCount(ctx.tenantId, ctx.processId), releasesBefore, "DB-4a não cria liberação nova");
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-4b: consume com só o frozenAt divergente -> concurrent_custody_append", async () => {
    const ctx = await seedReleaseInProgress(`db4b-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)), new Date());
    try {
      await withTenantRls(client, ctx.tenantId, async (tx) => {
        await tx.$queryRaw`
          INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount, settled_at)
          VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'REMOVAL', 1, 150.00, 150.00, now())
        `;
        for (let seq = 1; seq <= 3; seq += 1) {
          await tx.$queryRaw`
            INSERT INTO process_charges (tenant_id, process_id, kind, period_seq, ref_date, quantity, unit_amount, total_amount, settled_at)
            VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'DAILY', ${seq}, CURRENT_DATE, 1, 40.00, 40.00, now())
          `;
        }
      });
      await assert.rejects(
        () =>
          releaseRepo.consumeReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId!,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "270.00",
            overAccruedDailyIds: [],
            eventPayload: { ...payload, releaseId: ctx.releaseId! },
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: {
              expectedDailyCount: 3,
              enteredAt: ctx.enteredAt,
              frozenAt: new Date(ctx.frozenAt!.getTime() - MS_PER_DAY),
            },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "concurrent_custody_append",
      );
      assert.equal(await processStatus(ctx.tenantId, ctx.processId), "RELEASE_IN_PROGRESS");
      assert.equal(await completedReleaseCount(ctx.tenantId, ctx.processId), 0);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("DB-4c: consume com só o enteredAt divergente -> concurrent_custody_append", async () => {
    const ctx = await seedReleaseInProgress(`db4c-${Date.now()}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)), new Date());
    try {
      await withTenantRls(client, ctx.tenantId, async (tx) => {
        await tx.$queryRaw`
          INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount, settled_at)
          VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'REMOVAL', 1, 150.00, 150.00, now())
        `;
        for (let seq = 1; seq <= 3; seq += 1) {
          await tx.$queryRaw`
            INSERT INTO process_charges (tenant_id, process_id, kind, period_seq, ref_date, quantity, unit_amount, total_amount, settled_at)
            VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'DAILY', ${seq}, CURRENT_DATE, 1, 40.00, 40.00, now())
          `;
        }
      });
      await assert.rejects(
        () =>
          releaseRepo.consumeReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId!,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "270.00",
            overAccruedDailyIds: [],
            eventPayload: { ...payload, releaseId: ctx.releaseId! },
            actorId: undefined,
            occurredAt: new Date(),
            chargeBasis: {
              expectedDailyCount: 3,
              enteredAt: new Date(ctx.enteredAt.getTime() - MS_PER_DAY),
              frozenAt: ctx.frozenAt,
            },
          } as never),
        (error: unknown) => (error as { reason?: string }).reason === "concurrent_custody_append",
      );
      assert.equal(await processStatus(ctx.tenantId, ctx.processId), "RELEASE_IN_PROGRESS");
      assert.equal(await completedReleaseCount(ctx.tenantId, ctx.processId), 0);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("F1: corrida accrueProcess x start (6 rodadas) sem period_seq duplicado", async () => {
    const release = await createDefaultReleaseService();
    const charge = await createDefaultChargeService();
    for (let round = 0; round < 6; round += 1) {
      const ctx = await seedActiveCustody(`f1-${Date.now()}-${round}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)));
      try {
        await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
        const [startOutcome] = await Promise.allSettled([
          release.start(actor(ctx.tenantId, ctx.userId), ctx.processId, { recipient_name: "R" }),
          charge.accrueProcess(ctx.tenantId, ctx.processId, new Date(), undefined),
        ]);
        assert.equal(startOutcome.status, "fulfilled", "F1: o start passa na corrida");
        assert.notEqual(await latestFrozenAt(ctx.tenantId, ctx.processId), null, "F1: o start congela");
        assert.equal(await processStatus(ctx.tenantId, ctx.processId), "RELEASE_IN_PROGRESS");
        const rows = await withTenantRls(client, ctx.tenantId, (tx) =>
          tx.$queryRaw<Array<{ period_seq: number }>>`
            SELECT period_seq FROM process_charges
            WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid AND kind = 'DAILY'
          `,
        );
        const uniq = new Set(rows.map((row) => row.period_seq));
        assert.equal(rows.length, 3, "F1: D=3 diárias no livro");
        assert.equal(rows.length, uniq.size);
        await assertChainValid(ctx.tenantId, ctx.processId);
      } finally {
        await teardownTenant(ctx.tenantId);
      }
    }
  });

  test("F2: diária acumulada a mais -> release_reconciliation_pending até o settle; depois libera pelo devido", async () => {
    const ctx = await seedReleaseInProgress(`f2-${Date.now()}`, new Date(Date.now() - (MS_PER_DAY + 2 * 3_600_000)), new Date());
    const release = await createDefaultReleaseService();
    const charge = await createDefaultChargeService();
    try {
      await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
      await withTenantRls(client, ctx.tenantId, async (tx) => {
        const dailies = await tx.$queryRaw<Array<{ id: string; period_seq: number }>>`
          INSERT INTO process_charges (tenant_id, process_id, kind, period_seq, ref_date, quantity, unit_amount, total_amount, settled_at)
          VALUES
            (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'DAILY', 1, CURRENT_DATE, 1, 40.00, 40.00, now()),
            (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'DAILY', 2, CURRENT_DATE, 1, 40.00, 40.00, NULL)
          RETURNING id, period_seq
        `;
        const overAccruedDaily = dailies.find((daily) => daily.period_seq === 2);
        assert.ok(overAccruedDaily, "F2: a diária acumulada a mais é a seq 2");
        await tx.$queryRaw`
          INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount, adjustment_of_charge_id)
          VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'ADJUSTMENT', 1, 20.00, -20.00, ${overAccruedDaily.id}::uuid)
        `;
      });
      await assert.rejects(
        () => release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
        (error: unknown) => (error as { reason?: string }).reason === "release_reconciliation_pending",
      );
      await charge.settle(actor(ctx.tenantId, ctx.userId), ctx.processId, {});
      const view = await release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId);
      assert.equal(view.release.status, "COMPLETED");
      assert.equal(view.release.settledTotal, "40.00");
      await assertChainValid(ctx.tenantId, ctx.processId);
      await assertReleaseSettledTotalMatchesEvent(ctx.tenantId, ctx.processId);
    } finally {
      await teardownTenant(ctx.tenantId);
    }
  });

  test("F3: ADDITIONAL concorrente com consume (6 rodadas) nunca libera com linha aberta", async () => {
    const release = await createDefaultReleaseService();
    for (let round = 0; round < 6; round += 1) {
      const ctx = await seedReleaseInProgress(`f3-${Date.now()}-${round}`, new Date(Date.now() - (3 * MS_PER_DAY + 2 * 3_600_000)), new Date());
      try {
        await seedDailyPricing(ctx.tenantId, ctx.profileId, "40.00");
        await withTenantRls(client, ctx.tenantId, async (tx) => {
          await tx.$queryRaw`
            INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount, settled_at)
            VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'REMOVAL', 1, 150.00, 150.00, now())
          `;
        });
        const results = await Promise.allSettled([
          release.consume(actor(ctx.tenantId, ctx.userId), ctx.processId),
          withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$queryRaw`
              INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount)
              VALUES (${ctx.tenantId}::uuid, ${ctx.processId}::uuid, 'ADDITIONAL', 1, 50.00, 50.00)
            `,
          ),
        ]);
        const processRows = await withTenantRls(client, ctx.tenantId, (tx) =>
          tx.$queryRaw<Array<{ status: string }>>`
            SELECT status FROM impound_processes WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${ctx.processId}::uuid
          `,
        );
        if (processRows[0]?.status === "RELEASED") {
          const unsettled = await withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$queryRaw<Array<{ n: number }>>`
              SELECT count(*)::int AS n
              FROM process_charges
              WHERE tenant_id = ${ctx.tenantId}::uuid AND process_id = ${ctx.processId}::uuid
                AND kind <> 'ADJUSTMENT' AND settled_at IS NULL
            `,
          );
          assert.equal(unsettled[0]?.n ?? 0, 0);
        }
        assert.ok(results.length === 2);
      } finally {
        await teardownTenant(ctx.tenantId);
      }
    }
  });
}
