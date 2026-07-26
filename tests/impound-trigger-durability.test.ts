import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// PR-06 (D-Ω5P-REC-03 / RN-CUS-05) — gatilho OS→custódia DURÁVEL via SWEEP `impound.reconcile-removals`. DB-gated
// (skip sem DATABASE_URL) — a durabilidade se prova contra o Postgres vivo (partial-unique + FK + RLS).
if (!connectionString) {
  test("Impound trigger durability requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("sweep abre custódia em RECEPÇÃO (entered_at = OS.completed_at) para OS de remoção concluída", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const completedAt = new Date("2026-07-20T09:30:00.000Z");
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-1`, profileId: ctx.profileId, status: "completed", completedAt });
      const opened = await reconcile(ctx.tenantId);
      assert.equal(opened, 1, "o sweep deve abrir exatamente 1 custódia");

      const rows = await selectProcesses(client, ctx.tenantId);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].status, "RECEPTION");
      assert.equal(new Date(rows[0].entered_at).toISOString(), completedAt.toISOString(), "entered_at = t0 = completed_at");
      assert.equal(rows[0].vehicle_unidentified, true, "processo auto-aberto = identidade a confirmar pela vistoria");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("idempotente: sweep 2× → 1 único processo (índice PARCIAL único tenant+service_order)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-1`, profileId: ctx.profileId, status: "completed", completedAt: new Date() });
      const first = await reconcile(ctx.tenantId);
      const second = await reconcile(ctx.tenantId);
      assert.equal(first, 1);
      assert.equal(second, 0, "o 2º tick não reabre (LEFT JOIN exclui a OS já com processo)");
      const rows = await selectProcesses(client, ctx.tenantId);
      assert.equal(rows.length, 1, "exatamente 1 processo para a OS");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("durável: OS concluída SEM processo (evento perdido) → o sweep reconcilia (catch-up)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const completedAt = new Date("2026-07-18T14:00:00.000Z");
    try {
      // Simula o "evento perdido": a OS ficou concluída sem NENHUM processo (worker caído no momento da conclusão).
      await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-lost`, profileId: ctx.profileId, status: "completed", completedAt });
      const before = await selectProcesses(client, ctx.tenantId);
      assert.equal(before.length, 0, "sem processo antes do sweep (buraco probatório)");
      const opened = await reconcile(ctx.tenantId);
      assert.equal(opened, 1, "o sweep é o backstop de durabilidade");
      const after = await selectProcesses(client, ctx.tenantId);
      assert.equal(after.length, 1);
      assert.equal(after[0].status, "RECEPTION");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("F-1(b) cura de half-open: processo preso em IN_REMOVAL (entered_at NULL) → sweep cura p/ RECEPÇÃO (entered_at=completed_at)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const completedAt = new Date("2026-07-19T08:00:00.000Z");
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-half`, profileId: ctx.profileId, status: "completed", completedAt });
      // Simula o half-open HERDADO do gatilho NÃO-atômico anterior: create (IN_REMOVAL + abertura) SEM a transição
      // a RECEPÇÃO → entered_at fica NULL (t0 nunca setado). O openFromRemoval NOVO é atômico e nunca produz isto.
      const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
      const repo = new RlsPrismaImpoundRepository(client);
      const halfOpen = await repo.createProcess({
        tenantId: ctx.tenantId,
        vehicleUnidentified: true,
        unidentifiedReason: "Aguardando vistoria de recepção",
        profileId: ctx.profileId,
        originAuthority: "Solicitação de remoção (legado)",
        serviceOrderId: wo,
        openingEvent: { type: "STATUS_CHANGE", payload: { from: null, to: "IN_REMOVAL", reason: "process_opened" }, occurredAt: completedAt, actorId: undefined },
      });
      assert.equal(halfOpen.status, "IN_REMOVAL");
      assert.equal(halfOpen.enteredAt, undefined, "half-open: entered_at NULL (t0 da diária nunca setado)");

      const cured = await reconcile(ctx.tenantId);
      assert.equal(cured, 1, "o sweep amplia o candidato e CURA o half-open (não fica preso para sempre)");
      const rows = await selectProcesses(client, ctx.tenantId);
      assert.equal(rows.length, 1, "cura o existente — não cria um 2º processo");
      assert.equal(rows[0].id, halfOpen.id);
      assert.equal(rows[0].status, "RECEPTION");
      assert.equal(new Date(rows[0].entered_at).toISOString(), completedAt.toISOString(), "entered_at = t0 = completed_at após a cura");

      // Idempotente: um 2º tick não re-cura (já saiu de IN_REMOVAL / já tem entered_at).
      assert.equal(await reconcile(ctx.tenantId), 0);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("OS de serviço SEM custody_profile_id → o sweep PULA (não abre custódia)", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      // Catálogo sem custody_profile_id (serviço que NÃO abre custódia).
      const plainCatalog = await insertServiceCatalog(client, ctx.tenantId, `Cat Plain ${suffix}`, null);
      await insertWorkOrder(client, ctx.tenantId, { code: `WO-${suffix}-plain`, catalogId: plainCatalog, status: "completed", completedAt: new Date() });
      const opened = await reconcile(ctx.tenantId);
      assert.equal(opened, 0, "sem custody_profile_id ⇒ não é OS de remoção que abre custódia");
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 0);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("corrida criação-manual × sweep → exatamente 1 processo (409 duplicate_service_order engolido)", async () => {
    const { client, service, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-race`, profileId: ctx.profileId, status: "completed", completedAt: new Date() });
      // Criação manual "concorrente": openFromRemoval 2× para a MESMA OS → 1 abre, o 2º engole o 409.
      const a = await service.openFromRemoval({ tenantId: ctx.tenantId, serviceOrderId: wo, profileId: ctx.profileId, originAuthority: "OS", completedAt: new Date() });
      const b = await service.openFromRemoval({ tenantId: ctx.tenantId, serviceOrderId: wo, profileId: ctx.profileId, originAuthority: "OS", completedAt: new Date() });
      assert.equal(a.opened, true);
      assert.equal(b.opened, false, "o 2º openFromRemoval engole o duplicate_service_order (idempotente)");
      // O sweep depois também não duplica.
      const swept = await reconcile(ctx.tenantId);
      assert.equal(swept, 0);
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 1, "exatamente 1 processo para a OS");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("sweep ESCOPADO por tenant: reconciliar A não abre custódia da OS concluída de B", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffixA = uniq();
    const suffixB = uniq();
    const ctxA = await seedTenant(client, suffixA);
    const ctxB = await seedTenant(client, suffixB);
    try {
      await seedRemovalWorkOrder(client, ctxB, { code: `WO-${suffixB}-1`, profileId: ctxB.profileId, status: "completed", completedAt: new Date() });
      const openedA = await reconcile(ctxA.tenantId); // reconcilia SÓ A
      assert.equal(openedA, 0, "A não tem OS de remoção");
      assert.equal((await selectProcesses(client, ctxB.tenantId)).length, 0, "a custódia de B NÃO foi aberta ao reconciliar A (sweep escopado)");
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await client.$disconnect();
    }
  });
}

// ── infra ─────────────────────────────────────────────────────────────────────────────────────────────────
function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
  const { reconcileTenantRemovals } = await import("../src/modules/impound/impound.reconcile.service.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  // Serviço prisma DIRETO (bypassa o env-gate) — o sweep opera sobre o MESMO client escopado do teste.
  const service = new ImpoundService(new RlsPrismaImpoundRepository(client));
  const reconcile = (tenantId: string) => reconcileTenantRemovals(client, tenantId, service, new Date());
  return { client, service, reconcile };
}

type TenantCtx = { tenantId: string; profileId: string; catalogId: string };
type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Impound Sweep ${suffix}`, slug: `impound-sweep-${suffix}` } });
  const profileName = `Perfil ${suffix}`;
  const profileId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${profileName}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
  const catalogId = await insertServiceCatalog(client, tenant.id, `Remoção ${suffix}`, profileId);
  return { tenantId: tenant.id, profileId, catalogId };
}

async function insertServiceCatalog(client: BootstrapClient, tenantId: string, name: string, custodyProfileId: string | null): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO service_catalog (tenant_id, name, service_type, custody_profile_id)
      VALUES (${tenantId}::uuid, ${name}, 'reboque', ${custodyProfileId}::uuid)
      RETURNING id
    `;
    return rows[0].id;
  });
}

async function insertWorkOrder(
  client: BootstrapClient,
  tenantId: string,
  input: { code: string; catalogId: string; status: string; completedAt: Date },
): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO work_orders (tenant_id, code, title, status, completed_at, service_catalog_id)
      VALUES (${tenantId}::uuid, ${input.code}, 'Remoção', ${input.status}, ${input.completedAt}, ${input.catalogId}::uuid)
      RETURNING id
    `;
    return rows[0].id;
  });
}

async function seedRemovalWorkOrder(
  client: BootstrapClient,
  ctx: TenantCtx,
  input: { code: string; profileId: string; status: string; completedAt: Date },
): Promise<string> {
  return insertWorkOrder(client, ctx.tenantId, { code: input.code, catalogId: ctx.catalogId, status: input.status, completedAt: input.completedAt });
}

async function selectProcesses(client: BootstrapClient, tenantId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ id: string; status: string; entered_at: Date; vehicle_unidentified: boolean }>>`
      SELECT id, status, entered_at, vehicle_unidentified FROM impound_processes WHERE tenant_id = ${tenantId}::uuid
    `,
  );
}

// Teardown FK-safe: custody_events → impound_processes ANTES de work_orders/service_catalog/jurisdiction_profiles
// → tenant. custody_events tem TRIGGER append-only → replica (superuser). audit_logs (cross-anchor) antes do tenant.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_intake_inspections WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
