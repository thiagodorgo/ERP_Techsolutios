import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-17 — isolamento cross-tenant do DOSSIÊ + solicitar liberação, PROVADO contra o Postgres vivo (RLS FORCE +
// partial-unique + widening dos CHECKs do PortalAccessLog). Invariante central: a SESSÃO É A AUTORIZAÇÃO, mas o
// processId da sessão SÓ resolve sob o TENANT VINCULADO — uma sessão de A jamais lê o processo de B (mesmo com o
// MESMO PORTAL_SESSION_SECRET, o pior caso de replay). DB-gated (skip sem DATABASE_URL).
if (!connectionString) {
  test("owner-portal dossier RLS requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("sessão de A nunca lê B; DOSSIER_VIEWED/RELEASE_REQUESTED logados sob RLS; release-request idempotente (partial-unique)", async () => {
    const { client, buildService, signSession } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctxA = await seedTenant(client, `A-${suffix}`);
    const ctxB = await seedTenant(client, `B-${suffix}`);
    try {
      const procA = await insertProcess(client, ctxA, { plate: "AAA1A11", renavam: "11111111111" });
      const procB = await insertProcess(client, ctxB, { plate: "BBB2B22", renavam: "22222222222" });

      const { service, listReleaseRequests, listAccessLogs } = buildService(ctxA.tenantId);

      // (1) A-bound + sessão de A → lê o dossiê do PRÓPRIO processo.
      const own = await service.dossier({ authorization: `Bearer ${await signSession(procA)}`, ip: "203.0.113.10" });
      assert.equal(own.kind, "ok");

      // (2) A-bound + sessão de B (MESMO secret) → NOT_FOUND (RLS esconde B por completo; nunca devolve o dossiê de B).
      const cross = await service.dossier({ authorization: `Bearer ${await signSession(procB)}`, ip: "203.0.113.10" });
      assert.equal(cross.kind, "not_found", "a sessão de A jamais resolve o processo de B (RLS cross-tenant)");

      // (3) release-request sob A: 2 chamadas → partial-unique garante 1 pedido ABERTO (idempotente); resposta genérica.
      const rr1 = await service.releaseRequest({ authorization: `Bearer ${await signSession(procA)}`, note: "Quero retirar", ip: "203.0.113.10" });
      const rr2 = await service.releaseRequest({ authorization: `Bearer ${await signSession(procA)}`, note: "De novo", ip: "203.0.113.10" });
      assert.equal(rr1.kind, "ok");
      assert.equal(rr2.kind, "ok");
      const requests = await listReleaseRequests(ctxA.tenantId);
      assert.equal(requests.length, 1, "no máx. 1 pedido ABERTO por processo (partial-unique live)");
      assert.equal(requests[0].process_id, procA, "o pedido é do processo de A");

      // (4) O widening dos CHECKs aceitou as NOVAS ações/desfechos live (a migração 20260848000000 funciona).
      const logs = await listAccessLogs(ctxA.tenantId);
      const dossierLog = logs.find((l) => l.action === "DOSSIER_VIEWED" && l.outcome === "AUTHORIZED");
      const releaseLog = logs.find((l) => l.action === "RELEASE_REQUESTED" && l.outcome === "AUTHORIZED");
      assert.ok(dossierLog, "DOSSIER_VIEWED/AUTHORIZED persistiu (CHECK action alargado)");
      assert.ok(releaseLog, "RELEASE_REQUESTED/AUTHORIZED persistiu");
      assert.equal(dossierLog?.process_id, procA, "AUTHORIZED amarra process_id (CHECK process_found alargado p/ FOUND+AUTHORIZED)");
      assert.ok(logs.every((l) => l.tenant_id === ctxA.tenantId), "toda linha do log é do tenant A (RLS)");
      // A tentativa cross-tenant virou uma linha DOSSIER_VIEWED/NOT_FOUND sob A (sem process_id).
      assert.ok(logs.some((l) => l.action === "DOSSIER_VIEWED" && l.outcome === "NOT_FOUND" && !l.process_id));
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await client.$disconnect();
    }
  });
}

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
  const { PrismaPortalAccessLogRepository } = await import("../src/modules/portal-shared/index.js");
  const { OwnerPortalService, PrismaPortalReleaseRequestRepository } = await import("../src/modules/owner-portal/index.js");
  const { AntiAbuse, InMemoryChallengeStore, signOwnerSession } = await import("../src/modules/portal-shared/index.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const SESSION_SECRET = "dossier-rls-session-secret";

  const buildService = (tenantId: string) => {
    const impound = new ImpoundService(new RlsPrismaImpoundRepository(client));
    const service = new OwnerPortalService({
      tenantId,
      impound,
      // stubs — a fronteira cross-tenant é o impound (findByIdForPortal sob RLS); charge/yard/jurisdiction só
      // completam o agregado quando o processo É visível.
      charge: {
        getPublicSummary: async () => ({ totalDueCents: 0, currency: "BRL" }),
        getPublicItemizedSummary: async () => ({ currency: "BRL", items: [], capReached: false, totalDueCents: 0 }),
      },
      yard: { getPublicYard: async () => undefined },
      jurisdiction: { getPortalProfile: async () => undefined },
      releaseRequests: new PrismaPortalReleaseRequestRepository(client),
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
      challengeStore: new InMemoryChallengeStore(),
      logSecret: "dossier-rls-log-secret",
      sessionSecret: SESSION_SECRET,
      minLatencyMs: 0,
      challengeTtlMs: 120_000,
    });
    const listReleaseRequests = (tid: string) =>
      client.$queryRawUnsafe<Array<{ tenant_id: string; process_id: string; status: string }>>(
        `SELECT tenant_id, process_id, status FROM portal_release_requests WHERE tenant_id = '${tid}'::uuid`,
      );
    const listAccessLogs = (tid: string) =>
      client.$queryRawUnsafe<Array<{ tenant_id: string; action: string; outcome: string; process_id: string | null }>>(
        `SELECT tenant_id, action, outcome, process_id FROM portal_access_logs WHERE tenant_id = '${tid}'::uuid`,
      );
    return { service, listReleaseRequests, listAccessLogs };
  };

  const signSession = (processId: string) => signOwnerSession({ processId }, { secret: SESSION_SECRET });

  return { client, buildService, signSession };
}

type TenantCtx = { tenantId: string; profileId: string };
type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Owner Dossier ${suffix}`, slug: `owner-dossier-${suffix}` } });
  const profileId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${`Perfil ${suffix}`}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
  return { tenantId: tenant.id, profileId };
}

async function insertProcess(client: BootstrapClient, ctx: TenantCtx, input: { plate: string; renavam: string }): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, ctx.tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes
        (tenant_id, vehicle_plate, vehicle_renavam, vehicle_unidentified, profile_id, status, origin_authority, entered_at)
      VALUES
        (${ctx.tenantId}::uuid, ${input.plate}, ${input.renavam}, false, ${ctx.profileId}::uuid, 'ACTIVE_CUSTODY', 'Órgão de Teste', ${new Date("2026-05-01T10:00:00.000Z")})
      RETURNING id
    `;
    return rows[0].id;
  });
}

// Teardown FK-safe: portal_release_requests + portal_access_logs (trigger append-only → replica) → impound_processes
// → jurisdiction_profiles → tenant.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM portal_release_requests WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM portal_access_logs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
