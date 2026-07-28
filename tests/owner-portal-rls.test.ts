import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-16 — isolamento cross-tenant do owner-portal (binding tenant A NUNCA lê processo de B) + append-only do
// PortalAccessLog (I10). DB-gated (skip sem DATABASE_URL): a isolação se PROVA contra o Postgres vivo (RLS FORCE +
// trigger), não contra a memória.
if (!connectionString) {
  test("owner-portal RLS isolation requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("binding tenant A NUNCA lê o processo de B; lê o próprio; toda tentativa vira 1 linha no PortalAccessLog", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctxA = await seedTenant(client, `A-${suffix}`);
    const ctxB = await seedTenant(client, `B-${suffix}`);
    const plate = "XYZ1A11";
    const renavam = "98765432100";
    try {
      // MESMA placa+Renavam em A e B, com entered_at distinto (para distinguir qual linha foi lida).
      await insertProcess(client, ctxA, { plate, renavam, enteredAt: new Date("2026-05-01T10:00:00.000Z") });
      await insertProcess(client, ctxB, { plate, renavam, enteredAt: new Date("2026-09-09T09:00:00.000Z") });
      // Processo só em B, placa distinta — o portal de A não pode enxergá-lo.
      await insertProcess(client, ctxB, { plate: "BON1B11", renavam: "11111111111", enteredAt: new Date() });

      const { service, accessLog } = buildService(ctxA.tenantId);

      // (1) A-bound lê o PRÓPRIO processo (entered_at de A), nunca o de B.
      const found = await runLookup(service, { plate, renavam });
      assert.equal(found.kind, "found");
      if (found.kind === "found") {
        assert.equal(found.process.enteredAt, "2026-05-01T10:00:00.000Z", "leu o processo de A (não o de B)");
      }

      // (2) Placa que só existe em B → NOT_FOUND para o portal de A (RLS esconde B por completo).
      const miss = await runLookup(service, { plate: "BON1B11", renavam: "11111111111" });
      assert.equal(miss.kind, "not_found");

      // (3) PortalAccessLog: as tentativas viraram linhas sob o tenant A (RLS), sem PII crua.
      const rows = await accessLog(ctxA.tenantId);
      assert.ok(rows.length >= 2, "cada tentativa registra ≥1 linha");
      assert.ok(rows.every((r) => r.tenant_id === ctxA.tenantId), "toda linha é do tenant A");
      const blob = JSON.stringify(rows);
      assert.equal(blob.includes(plate), false, "placa crua não persiste");
      assert.equal(blob.includes(renavam), false, "Renavam cru não persiste");
      assert.ok(
        rows.filter((r) => r.process_id).every((r) => r.outcome === "FOUND"),
        "process_id só em FOUND (CHECK)",
      );

      // (4) Append-only: UPDATE numa linha do log é BLOQUEADO pelo trigger (I10 estrutural).
      const { withTenantRls } = await import("../src/database/rls.js");
      await assert.rejects(
        () =>
          withTenantRls(client, ctxA.tenantId, (tx) =>
            tx.$executeRawUnsafe(`UPDATE portal_access_logs SET outcome = 'FOUND' WHERE tenant_id = '${ctxA.tenantId}'::uuid`),
          ),
        /append-only|restrict/i,
        "o trigger deve bloquear UPDATE no PortalAccessLog",
      );
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
  const { OwnerPortalService } = await import("../src/modules/owner-portal/owner-portal.service.js");
  const { AntiAbuse, InMemoryChallengeStore } = await import("../src/modules/portal-shared/index.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  const buildService = (tenantId: string) => {
    const impound = new ImpoundService(new RlsPrismaImpoundRepository(client));
    const service = new OwnerPortalService({
      tenantId,
      impound,
      // stubs — o teste foca no isolamento do read de custódia + no log (a fronteira cross-tenant é o impound).
      charge: { getPublicSummary: async () => ({ totalDueCents: 0, currency: "BRL" }) },
      yard: { getPublicYard: async () => undefined },
      accessLog: new PrismaPortalAccessLogRepository(client),
      antiAbuse: new AntiAbuse({
        ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        plateBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        baseDifficulty: 2,
        maxDifficulty: 4,
        failuresPerStep: 1,
        failureWindowMs: 60_000,
      }),
      challengeStore: new InMemoryChallengeStore(),
      logSecret: "rls-test-log-secret",
      sessionSecret: "rls-test-session-secret",
      minLatencyMs: 0,
      challengeTtlMs: 120_000,
    });
    const accessLog = (tid: string) =>
      client.$queryRawUnsafe<Array<{ tenant_id: string; outcome: string; process_id: string | null }>>(
        `SELECT tenant_id, outcome, process_id FROM portal_access_logs WHERE tenant_id = '${tid}'::uuid`,
      );
    return { service, accessLog };
  };

  return { client, buildService };
}

type TenantCtx = { tenantId: string; profileId: string };
type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Owner Portal ${suffix}`, slug: `owner-portal-${suffix}` } });
  const profileId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${`Perfil ${suffix}`}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
  return { tenantId: tenant.id, profileId };
}

// Insere um processo DIRETO (sem cadeia hash — o teste só exercita o read por identidade). CHECK de identidade
// satisfeito (placa+Renavam, unidentified=false).
async function insertProcess(
  client: BootstrapClient,
  ctx: TenantCtx,
  input: { plate: string; renavam: string; enteredAt: Date },
): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, ctx.tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO impound_processes
        (tenant_id, vehicle_plate, vehicle_renavam, vehicle_unidentified, profile_id, status, origin_authority, entered_at)
      VALUES
        (${ctx.tenantId}::uuid, ${input.plate}, ${input.renavam}, false, ${ctx.profileId}::uuid, 'ACTIVE_CUSTODY', 'Órgão de Teste', ${input.enteredAt})
    `,
  );
}

// Executa 1 lookup completo (emite desafio no store do serviço, resolve, chama lookup).
async function runLookup(
  service: import("../src/modules/owner-portal/owner-portal.service.js").OwnerPortalService,
  input: { plate: string; renavam: string },
) {
  const { solveChallenge } = await import("../src/modules/portal-shared/index.js");
  const issued = await service.challenge({ ip: "203.0.113.7" });
  // Ω5P PR-16 (HIGH-1) — challenge agora retorna união discriminada (issued × rate_limited). No fluxo do teste o
  // balde de challenge está folgado → sempre "issued"; desembrulha para manter o resto do fluxo inalterado.
  if (issued.kind !== "issued") throw new Error("challenge inesperadamente barrado por rate-limit no teste RLS");
  const challenge = issued.challenge;
  const solution = solveChallenge(challenge.salt, challenge.difficulty);
  return service.lookup({ ...input, challengeId: challenge.challengeId, solution, ip: "203.0.113.7" });
}

// Teardown FK-safe: portal_access_logs (trigger append-only → replica) → impound_processes → jurisdiction_profiles → tenant.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM portal_access_logs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
