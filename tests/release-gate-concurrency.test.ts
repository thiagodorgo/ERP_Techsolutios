import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// I5 sob CONCORRÊNCIA REAL: N consumações paralelas no MESMO processo → exatamente 1 RELEASED (anti-dupla-liberação
// sob corrida). DB-gated (skip sem DATABASE_URL, como rls-tenant-isolation/impound-concurrency) — Node é
// single-thread; a corrida real exige o banco (FOR UPDATE do processo + RELEASED sink + @@unique(seq)).
if (!connectionString) {
  test("Release gate concurrency (I5) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 6;

  test("N consumações concorrentes no MESMO processo → exatamente 1 RELEASED, resto 409", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ctx = await seedReadyRelease(client, suffix);
    try {
      const payload = {
        event: "RELEASE",
        releaseId: ctx.releaseId,
        authorityApprovalRef: null,
        settledTotal: "0.00",
        requirementCodes: [] as string[],
        enteredAt: null,
        releasedAt: new Date().toISOString(),
      };
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, () =>
          repo.consumeReleaseAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId,
            expectedFrom: "RELEASE_IN_PROGRESS",
            settledTotal: "0.00",
            overAccruedDailyIds: [],
            eventPayload: payload,
            actorId: undefined,
            occurredAt: new Date(),
          }),
        ),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      assert.equal(fulfilled.length, 1, "exatamente 1 consumação deve vencer a corrida");
      assert.equal(rejected.length, CONCURRENCY - 1);
      for (const rejection of rejected) {
        const error = (rejection as PromiseRejectedResult).reason as { statusCode?: number; reason?: string };
        assert.equal(error.statusCode, 409);
        assert.ok(
          ["concurrent_custody_append", "release_not_active"].includes(error.reason ?? ""),
          `reason inesperado: ${error.reason}`,
        );
      }
      // Estado final: processo RELEASED (sink) + release COMPLETED + exatamente 1 RELEASE na cadeia.
      const process = await selectProcess(client, ctx.tenantId, ctx.processId);
      assert.equal(process.status, "RELEASED");
      const release = await selectRelease(client, ctx.tenantId, ctx.releaseId);
      assert.equal(release.status, "COMPLETED");
      const events = await countReleaseEvents(client, ctx.tenantId, ctx.processId);
      assert.equal(events, 1, "exatamente 1 RELEASE na cadeia (sem dupla-liberação)");
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  // BAIXO-3 — a defesa anti-TOCTOU (re-check do gate I5 sob FOR UPDATE) DEVE bloquear a consumação. Semeia 3
  // processos, cada um com UMA pré-condição violada, e prova que consumeReleaseAtomic (o ramo sob lock) retorna
  // 409 com o reason certo e NÃO libera (processo permanece RELEASE_IN_PROGRESS, release ativa, 0 RELEASE).
  test("consumeReleaseAtomic sob lock BLOQUEIA: débito não-quitado / reconciliação por-valor / requisito não-cumprido → 409, não libera", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const cases: Array<{ opts: Parameters<typeof seedReadyRelease>[2]; reason: string }> = [
      { opts: { unsettledRemoval: true }, reason: "release_debts_unsettled" },
      { opts: { overAccruedDaily: true }, reason: "release_reconciliation_pending" },
      { opts: { unmetRequirement: true }, reason: "release_requirement_unmet" },
    ];
    const seeded: Array<{ tenantId: string }> = [];
    try {
      for (let i = 0; i < cases.length; i += 1) {
        const { opts, reason } = cases[i];
        const ctx = await seedReadyRelease(client, `${stamp}-b3-${i}`, opts);
        seeded.push({ tenantId: ctx.tenantId });
        await assert.rejects(
          () =>
            repo.consumeReleaseAtomic({
              tenantId: ctx.tenantId,
              processId: ctx.processId,
              releaseId: ctx.releaseId,
              expectedFrom: "RELEASE_IN_PROGRESS",
              settledTotal: "0.00",
              overAccruedDailyIds: ctx.dailyId ? [ctx.dailyId] : [],
              eventPayload: { event: "RELEASE", releaseId: ctx.releaseId, settledTotal: "0.00" },
              actorId: undefined,
              occurredAt: new Date(),
            }),
          (error: unknown) => {
            const e = error as { statusCode?: number; reason?: string };
            return e.statusCode === 409 && e.reason === reason;
          },
          `esperado ${reason} sob lock`,
        );
        // NÃO liberou: processo segue RELEASE_IN_PROGRESS, release ativa, 0 RELEASE na cadeia.
        assert.equal((await selectProcess(client, ctx.tenantId, ctx.processId)).status, "RELEASE_IN_PROGRESS");
        assert.equal((await selectRelease(client, ctx.tenantId, ctx.releaseId)).status, "AUTHORIZED");
        assert.equal(await countReleaseEvents(client, ctx.tenantId, ctx.processId), 0);
      }
    } finally {
      for (const { tenantId } of seeded) await teardownTenant(client, tenantId);
      await client.$disconnect();
    }
  });

  // Ω5P PR-10b (x) — N saídas p/ reparo concorrentes no MESMO processo → exatamente 1 RELEASED_FOR_REPAIR, resto 409.
  // Anti-dupla-saída sob corrida real (FOR UPDATE do processo + expectedFrom ACTIVE_CUSTODY). Prova ainda que a saída
  // NÃO congela (frozen_at permanece NULL — D-Ω5P-REL-07) e que o dossiê FOR_REPAIR segue AUTHORIZED (ativo).
  test("N saídas p/ reparo concorrentes no MESMO processo → exatamente 1 RELEASED_FOR_REPAIR, resto 409; frozen_at NULL", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedReadyForRepair(client, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    try {
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, () =>
          repo.exitForRepairAtomic({
            tenantId: ctx.tenantId,
            processId: ctx.processId,
            releaseId: ctx.releaseId,
            expectedFrom: "ACTIVE_CUSTODY",
            actorId: undefined,
            occurredAt: new Date(),
          }),
        ),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      assert.equal(fulfilled.length, 1, "exatamente 1 saída deve vencer a corrida");
      assert.equal(rejected.length, CONCURRENCY - 1);
      for (const rejection of rejected) {
        const error = (rejection as PromiseRejectedResult).reason as { statusCode?: number; reason?: string };
        assert.equal(error.statusCode, 409);
        assert.ok(
          ["concurrent_custody_append", "release_not_active"].includes(error.reason ?? ""),
          `reason inesperado: ${error.reason}`,
        );
      }
      // Estado final: processo RELEASED_FOR_REPAIR + frozen_at NULL + dossiê AUTHORIZED + exatamente 1 STATUS_CHANGE.
      const process = await selectProcessRow(client, ctx.tenantId, ctx.processId);
      assert.equal(process.status, "RELEASED_FOR_REPAIR");
      assert.equal(process.frozen_at, null, "saída p/ reparo NÃO congela (D-Ω5P-REL-07)");
      const release = await selectRelease(client, ctx.tenantId, ctx.releaseId);
      assert.equal(release.status, "AUTHORIZED", "dossiê FOR_REPAIR permanece AUTHORIZED (ativo até o retorno)");
      const exits = await countStatusChange(client, ctx.tenantId, ctx.processId, "released_for_repair");
      assert.equal(exits, 1, "exatamente 1 STATUS_CHANGE released_for_repair (sem dupla saída)");
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaReleaseRepository } = await import("../src/modules/release/release-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaReleaseRepository(client);
  return { client, repo };
}

type SeedOpts = { unsettledRemoval?: boolean; unmetRequirement?: boolean; overAccruedDaily?: boolean };

// Semeia um processo pronto p/ consumar: RELEASE_IN_PROGRESS (frozen) + release AUTHORIZED (recipiente + aprovação).
// Sem opts o gate I5 PASSA (a corrida testa o anti-dupla-liberação). Com opts, injeta UMA violação p/ o teste da
// defesa sob lock (BAIXO-3): unsettledRemoval (débito não-quitado) / unmetRequirement (requisito required aberto) /
// overAccruedDaily (DAILY QUITADA com líquido≠0 sem estorno → reconciliação por-valor pendente).
async function seedReadyRelease(client: BootstrapClient, suffix: string, opts: SeedOpts = {}) {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Release Conc ${suffix}`, slug: `release-conc-${suffix}` } });
  const custodyHash = "a".repeat(64);
  const custodyPrev = "b".repeat(64);
  const seeded = await withTenantRls(client, tenant.id, async (tx) => {
    const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    const [proc] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
      VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', 'RELEASE_IN_PROGRESS', now(), now(), 1, ${custodyHash})
      RETURNING id
    `;
    await tx.$queryRaw`
      INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
      VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 1, 'STATUS_CHANGE', ${'{"from":null,"to":"IN_REMOVAL"}'}::jsonb, now(), ${custodyPrev}, ${custodyHash})
    `;
    const [release] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_releases (tenant_id, process_id, kind, status, recipient_name, authority_approved_by, authority_approved_at)
      VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 'STANDARD', 'AUTHORIZED', 'Quem Retira', gen_random_uuid(), now())
      RETURNING id
    `;
    if (opts.unsettledRemoval) {
      await tx.$queryRaw`
        INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount)
        VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 'REMOVAL', 1, 150.00, 150.00)
      `;
    }
    if (opts.unmetRequirement) {
      await tx.$queryRaw`
        INSERT INTO release_requirement_checks (tenant_id, release_id, code, label, required, satisfied)
        VALUES (${tenant.id}::uuid, ${release.id}::uuid, 'AUTHORITY_RELEASE', 'Autorizacao', true, false)
      `;
    }
    let dailyId: string | undefined;
    if (opts.overAccruedDaily) {
      const [daily] = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO process_charges (tenant_id, process_id, kind, period_seq, ref_date, quantity, unit_amount, total_amount, settled_at)
        VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 'DAILY', 1, CURRENT_DATE, 1, 30.00, 30.00, now())
        RETURNING id
      `;
      dailyId = daily.id; // QUITADA (settled_at set) mas líquido = 30 ≠ 0 (sem estorno) → reconciliação por-valor pendente
    }
    return { profileId: profile.id, processId: proc.id, releaseId: release.id, dailyId };
  });
  return { tenantId: tenant.id, ...seeded };
}

// Ω5P PR-10b — semeia um processo pronto p/ a SAÍDA p/ reparo: ACTIVE_CUSTODY (NÃO congelado — frozen_at NULL) +
// dossiê FOR_REPAIR AUTHORIZED (recipiente + aprovação da autoridade + repair_deadline <=60d). Sem débitos/checklist
// (art. 271 §2º não exige). A corrida testa o anti-dupla-saída.
async function seedReadyForRepair(client: BootstrapClient, suffix: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Repair Conc ${suffix}`, slug: `repair-conc-${suffix}` } });
  const custodyHash = "c".repeat(64);
  const custodyPrev = "d".repeat(64);
  const seeded = await withTenantRls(client, tenant.id, async (tx) => {
    const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    const [proc] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, frozen_at, custody_seq_head, custody_hash_head)
      VALUES (${tenant.id}::uuid, ${profile.id}::uuid, 'Autoridade', true, 'Placa adulterada', 'ACTIVE_CUSTODY', now(), NULL, 1, ${custodyHash})
      RETURNING id
    `;
    await tx.$queryRaw`
      INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
      VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 1, 'STATUS_CHANGE', ${'{"from":null,"to":"IN_REMOVAL"}'}::jsonb, now(), ${custodyPrev}, ${custodyHash})
    `;
    const [release] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_releases (tenant_id, process_id, kind, status, recipient_name, authority_approved_by, authority_approved_at, repair_deadline)
      VALUES (${tenant.id}::uuid, ${proc.id}::uuid, 'FOR_REPAIR', 'AUTHORIZED', 'Quem Transporta', gen_random_uuid(), now(), now() + interval '30 days')
      RETURNING id
    `;
    return { profileId: profile.id, processId: proc.id, releaseId: release.id };
  });
  return { tenantId: tenant.id, ...seeded };
}

async function selectProcessRow(client: BootstrapClient, tenantId: string, processId: string): Promise<{ status: string; frozen_at: Date | null }> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ status: string; frozen_at: Date | null }>>`SELECT status, frozen_at FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid`,
  );
  return rows[0];
}

async function countStatusChange(client: BootstrapClient, tenantId: string, processId: string, reason: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'STATUS_CHANGE' AND payload->>'reason' = ${reason}`,
  );
  return rows[0].n;
}

async function selectProcess(client: BootstrapClient, tenantId: string, processId: string): Promise<{ status: string }> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid`,
  );
  return rows[0];
}

async function selectRelease(client: BootstrapClient, tenantId: string, releaseId: string): Promise<{ status: string }> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM impound_releases WHERE tenant_id = ${tenantId}::uuid AND id = ${releaseId}::uuid`,
  );
  return rows[0];
}

async function countReleaseEvents(client: BootstrapClient, tenantId: string, processId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM custody_events WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND type = 'RELEASE'`,
  );
  return rows[0].n;
}

// Teardown FK-safe de UM tenant (sem disconnect): release_requirement_checks → impound_releases → process_charges
// → custody_events → impound_processes → jurisdiction_profiles → tenant (+ audit_logs cross-anchor). custody_events
// tem TRIGGER append-only → replica. Escopado por tenant (nunca wildcard).
async function teardownTenant(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM release_requirement_checks WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_releases WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM process_charges WHERE tenant_id = '${tenantId}'::uuid`);
    // Ω5P PR-20 — consumeReleaseAtomic captura 1 impound_outbox_events (STATUS_CHANGE_RELEASED) só quando o gate
    // efetivamente libera; defensivo aqui mesmo quando o cenário BLOQUEIA (0 linhas — delete vira no-op).
    await tx.$executeRawUnsafe(`DELETE FROM impound_outbox_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}

async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  try {
    await teardownTenant(client, tenantId);
  } finally {
    await client.$disconnect();
  }
}
