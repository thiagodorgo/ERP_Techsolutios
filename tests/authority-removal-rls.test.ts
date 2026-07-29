import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-18b — solicitar remoção contra o Postgres VIVO. DB-gated (skip sem DATABASE_URL): o que só o banco real
// prova — (a) origem ATÔMICA (INSERT solicitação + OS(open) na MESMA tx); (b) SoD end-to-end: completar a OS → o
// sweep abre 1 ImpoundProcess em RECEPÇÃO (a custódia só na CONCLUSÃO); (c) anti-spam partial-unique 23505; (d)
// fail-closed do catálogo por SQL real (0 e ≥2 → QUEUED); (e) isolamento cross-tenant sob RLS FORCE. O CI é a
// autoridade destes testes.
if (!connectionString) {
  test("authority-removal RLS/integration requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("origem ATÔMICA + SoD: solicitar remoção → OS OPEN; completar a OS → sweep → 1 ImpoundProcess em RECEPÇÃO", async () => {
    const { client, buildService, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix, { withCustodyCatalog: true });
    const credId = await insertCredential(client, ctx.tenantId, `orgao-${suffix}`);
    try {
      const { service, sessionFor } = buildService(ctx.tenantId);
      const result = await service.requestRemoval({
        authorization: `Bearer ${await sessionFor(credId)}`,
        body: { plate: "ABC1D23" },
        ip: "203.0.113.5",
      });
      assert.equal(result.kind, "ok");

      // 1 solicitação OPEN com work_order_id setado (originada).
      const requests = await selectRequests(client, ctx.tenantId);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].status, "OPEN");
      assert.ok(requests[0].work_order_id, "catálogo resolvido → OS originada (work_order_id setado)");

      // A OS nasce OPEN (SoD) — NUNCA completed; vinculada ao catálogo de remoção; ator SISTEMA (created_by NULL).
      const os = await selectWorkOrder(client, ctx.tenantId, requests[0].work_order_id as string);
      assert.equal(os.status, "open", "SoD: a OS nasce OPEN");
      assert.equal(os.completed_at, null, "nunca auto-completed");
      assert.equal(os.service_catalog_id, ctx.catalogId, "vinculada ao catálogo de remoção");
      assert.equal(os.created_by, null, "ator SISTEMA");

      // Antes de concluir a OS, a custódia NÃO existe.
      assert.equal((await selectProcesses(client, ctx.tenantId)).length, 0, "custódia NÃO abre na solicitação (só na conclusão)");

      // Operador CONCLUI a OS → o sweep (origem-agnóstico) abre a custódia.
      await completeWorkOrder(client, ctx.tenantId, requests[0].work_order_id as string, new Date("2026-07-30T10:00:00.000Z"));
      const opened = await reconcile(ctx.tenantId);
      assert.equal(opened, 1, "completar a OS de remoção → 1 custódia aberta pelo sweep");
      const processes = await selectProcesses(client, ctx.tenantId);
      assert.equal(processes.length, 1);
      assert.equal(processes[0].status, "RECEPTION", "a custódia entra em RECEPÇÃO (entered_at=completed_at=t0)");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("anti-spam partial-unique (23505): 2ª solicitação OPEN da MESMA placa → 1 solicitação/1 OS; ambas genéricas", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix, { withCustodyCatalog: true });
    const credId = await insertCredential(client, ctx.tenantId, `orgao-${suffix}`);
    try {
      const { service, sessionFor } = buildService(ctx.tenantId);
      const token = await sessionFor(credId);
      const first = await service.requestRemoval({ authorization: `Bearer ${token}`, body: { plate: "XYZ9K88" }, ip: "203.0.113.6" });
      const second = await service.requestRemoval({ authorization: `Bearer ${token}`, body: { plate: "XYZ9K88" }, ip: "203.0.113.6" });
      assert.equal(first.kind, "ok");
      assert.equal(second.kind, "ok", "resposta genérica também na duplicata (anti-oráculo)");
      assert.equal((await selectRequests(client, ctx.tenantId)).length, 1, "partial-unique WHERE OPEN: 1 solicitação por placa");
      assert.equal((await countWorkOrders(client, ctx.tenantId)), 1, "a 2ª tx aborta (23505) → nenhuma OS extra");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("fail-closed SQL real: 0 catálogo → QUEUED (work_order_id NULL); ≥2 catálogos → QUEUED (NUNCA chuta)", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    // (a) 0 catálogo de custódia
    const sa = uniq();
    const ctxNone = await seedTenant(client, sa, { withCustodyCatalog: false });
    const credNone = await insertCredential(client, ctxNone.tenantId, `orgao-${sa}`);
    // (b) ≥2 catálogos de custódia
    const sb = uniq();
    const ctxTwo = await seedTenant(client, sb, { withCustodyCatalog: true });
    await insertCustodyCatalog(client, ctxTwo.tenantId, `Remoção 2 ${sb}`, ctxTwo.profileId);
    const credTwo = await insertCredential(client, ctxTwo.tenantId, `orgao-${sb}`);
    try {
      const none = buildService(ctxNone.tenantId);
      const rNone = await none.service.requestRemoval({ authorization: `Bearer ${await none.sessionFor(credNone)}`, body: { plate: "AAA1A11" }, ip: "203.0.113.7" });
      assert.equal(rNone.kind, "ok");
      const reqNone = await selectRequests(client, ctxNone.tenantId);
      assert.equal(reqNone.length, 1);
      assert.equal(reqNone[0].work_order_id, null, "0 catálogo → ENFILEIRADA (sem OS)");
      assert.equal(await countWorkOrders(client, ctxNone.tenantId), 0);

      const two = buildService(ctxTwo.tenantId);
      const rTwo = await two.service.requestRemoval({ authorization: `Bearer ${await two.sessionFor(credTwo)}`, body: { plate: "BBB2B22" }, ip: "203.0.113.8" });
      assert.equal(rTwo.kind, "ok");
      const reqTwo = await selectRequests(client, ctxTwo.tenantId);
      assert.equal(reqTwo.length, 1);
      assert.equal(reqTwo[0].work_order_id, null, "≥2 catálogos → ENFILEIRADA (NUNCA chuta um catálogo)");
      assert.equal(await countWorkOrders(client, ctxTwo.tenantId), 0);
    } finally {
      await teardown(client, ctxNone.tenantId);
      await teardown(client, ctxTwo.tenantId);
      await client.$disconnect();
    }
  });

  test("cross-tenant RLS: o BFF vinculado a A NUNCA consome a credencial de B (sessão de B → 401, nada criado em A)", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    const sa = uniq();
    const sb = uniq();
    const ctxA = await seedTenant(client, sa, { withCustodyCatalog: true });
    const ctxB = await seedTenant(client, sb, { withCustodyCatalog: true });
    const credB = await insertCredential(client, ctxB.tenantId, `orgao-${sb}`);
    try {
      // Serviço vinculado a A, mas com a sessão de uma credencial de B → findConsumptionContext(A, credB) filtra por
      // RLS/tenant → não encontra → 401 uniforme; nada é criado em A.
      const { service, sessionFor } = buildService(ctxA.tenantId);
      const result = await service.requestRemoval({ authorization: `Bearer ${await sessionFor(credB)}`, body: { plate: "CCC3C33" }, ip: "203.0.113.9" });
      assert.equal(result.kind, "session_invalid", "credencial de B é invisível ao BFF de A (RLS)");
      assert.equal((await selectRequests(client, ctxA.tenantId)).length, 0, "nada criado em A");
      assert.equal(await countWorkOrders(client, ctxA.tenantId), 0);
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await client.$disconnect();
    }
  });
}

// ── infra ─────────────────────────────────────────────────────────────────────────────────────────────────────
function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { PrismaAuthorityRemovalRepository, AuthorityRemovalConsumptionAdapter, createPrismaRemovalCatalogResolver } = await import(
    "../src/modules/authority/authority-removal.repository.js"
  );
  const { PrismaAuthorityCredentialRepository } = await import("../src/modules/authority/authority-credential.repository.js");
  const { AuthorityRemovalService } = await import("../src/modules/authority/authority-removal.service.js");
  const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
  const { reconcileTenantRemovals } = await import("../src/modules/impound/impound.reconcile.service.js");
  const { PrismaPortalAccessLogRepository, AntiAbuse, signAuthoritySession } = await import("../src/modules/portal-shared/index.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  const SESSION_SECRET = "rls-authority-removal-session-secret";
  const buildService = (tenantId: string) => {
    const service = new AuthorityRemovalService({
      tenantId,
      consumption: new AuthorityRemovalConsumptionAdapter(
        new PrismaAuthorityCredentialRepository(client),
        createPrismaRemovalCatalogResolver(client),
      ),
      removals: new PrismaAuthorityRemovalRepository(client),
      accessLog: new PrismaPortalAccessLogRepository(client),
      antiAbuse: new AntiAbuse({
        ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        plateBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        readBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        baseDifficulty: 2,
        maxDifficulty: 4,
        failuresPerStep: 1,
        failureWindowMs: 60_000,
      }),
      logSecret: "rls-authority-removal-log-secret",
      sessionSecret: SESSION_SECRET,
      minLatencyMs: 0,
    });
    const sessionFor = (credentialId: string) => signAuthoritySession({ credentialId }, { secret: SESSION_SECRET });
    return { service, sessionFor };
  };

  const impound = new ImpoundService(new RlsPrismaImpoundRepository(client));
  const reconcile = (tenantId: string) => reconcileTenantRemovals(client, tenantId, impound, new Date());
  return { client, buildService, reconcile };
}

type TenantCtx = { tenantId: string; profileId: string; catalogId: string | null };
type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string, opts: { withCustodyCatalog: boolean }): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Authority Removal ${suffix}`, slug: `authority-removal-${suffix}` } });
  const profileId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${`Perfil ${suffix}`}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
  const catalogId = opts.withCustodyCatalog ? await insertCustodyCatalog(client, tenant.id, `Remoção ${suffix}`, profileId) : null;
  return { tenantId: tenant.id, profileId, catalogId };
}

async function insertCustodyCatalog(client: BootstrapClient, tenantId: string, name: string, custodyProfileId: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO service_catalog (tenant_id, name, service_type, is_active, custody_profile_id)
      VALUES (${tenantId}::uuid, ${name}, 'reboque', true, ${custodyProfileId}::uuid)
      RETURNING id
    `;
    return rows[0].id;
  });
}

async function insertCredential(client: BootstrapClient, tenantId: string, username: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO authority_credentials (tenant_id, authority_name, username, password_hash)
      VALUES (${tenantId}::uuid, ${"Órgão de Teste"}, ${username}, ${"scrypt$1024$8$1$c2FsdA$aGFzaA"})
      RETURNING id
    `;
    return rows[0].id;
  });
}

async function selectRequests(client: BootstrapClient, tenantId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ id: string; status: string; work_order_id: string | null; credential_id: string }>>`
      SELECT id, status, work_order_id, credential_id FROM authority_removal_requests WHERE tenant_id = ${tenantId}::uuid
    `,
  );
}

async function selectWorkOrder(client: BootstrapClient, tenantId: string, workOrderId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ status: string; completed_at: Date | null; service_catalog_id: string | null; created_by: string | null }>>`
      SELECT status, completed_at, service_catalog_id, created_by FROM work_orders WHERE tenant_id = ${tenantId}::uuid AND id = ${workOrderId}::uuid
    `;
    return rows[0];
  });
}

async function countWorkOrders(client: BootstrapClient, tenantId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint AS count FROM work_orders WHERE tenant_id = ${tenantId}::uuid`;
    return Number(rows[0].count);
  });
}

async function completeWorkOrder(client: BootstrapClient, tenantId: string, workOrderId: string, completedAt: Date): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      UPDATE work_orders SET status = 'completed', completed_at = ${completedAt}, updated_at = now()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${workOrderId}::uuid
    `,
  );
}

async function selectProcesses(client: BootstrapClient, tenantId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid
    `,
  );
}

// Teardown FK-safe: authority_removal_requests (referencia work_orders+authority_credentials) ANTES deles; custody_
// events → impound_processes → work_orders → service_catalog → jurisdiction_profiles → authority_credentials →
// portal_access_logs (trigger append-only → replica) → audit_logs → tenant.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM authority_removal_requests WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_intake_inspections WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_order_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM authority_credentials WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM portal_access_logs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
