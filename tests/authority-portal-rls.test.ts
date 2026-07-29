import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-18a — isolamento cross-tenant do authority-portal (binding tenant A NUNCA autentica/lê a credencial de B) +
// prova de que a authority_credentials é MUTÁVEL sob RLS FORCE (lockout persistido, sem trigger append-only). DB-gated
// (skip sem DATABASE_URL): a isolação se PROVA contra o Postgres vivo (RLS FORCE + o filtro tenant-first do repo).
if (!connectionString) {
  test("authority-portal RLS isolation requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("binding tenant A autentica a PRÓPRIA credencial e NUNCA a de B; o log fica sob A; lockout persiste", async () => {
    const { client, buildService, hashFast } = await bootstrap(connectionString);
    const suffix = uniq();
    const tenantA = await seedTenant(client, `A-${suffix}`);
    const tenantB = await seedTenant(client, `B-${suffix}`);
    try {
      // MESMO username em A e B, senhas DISTINTAS — o portal de A só deve casar a senha de A.
      await insertCredential(client, tenantA, { username: "orgao.comum", password: "senha-do-A-111", hashFast });
      await insertCredential(client, tenantB, { username: "orgao.comum", password: "senha-do-B-222", hashFast });
      // credencial que só existe em B — invisível ao portal de A.
      await insertCredential(client, tenantB, { username: "so.no.b", password: "senha-so-b-333", hashFast });

      const { service: serviceA, accessLog } = buildService(tenantA);

      // (1) A autentica com a senha de A → OK (authorityName de A).
      const okA = await runLogin(serviceA, { username: "orgao.comum", password: "senha-do-A-111" });
      assert.equal(okA.kind, "authenticated");

      // (2) A com a senha de B (mesmo username) → invalid: A jamais casa a credencial de B.
      const crossPw = await runLogin(serviceA, { username: "orgao.comum", password: "senha-do-B-222" });
      assert.equal(crossPw.kind, "invalid");

      // (3) username que só existe em B → invalid para o portal de A (RLS/filtro escondem B por completo).
      const crossUser = await runLogin(serviceA, { username: "so.no.b", password: "senha-so-b-333" });
      assert.equal(crossUser.kind, "invalid");

      // (4) PortalAccessLog: as tentativas viraram linhas sob o tenant A, sem PII crua (só HMAC).
      const rows = await accessLog(tenantA);
      assert.ok(rows.length >= 3, "cada tentativa registra ≥1 linha de LOGIN");
      assert.ok(rows.every((r) => r.tenant_id === tenantA), "toda linha é do tenant A");
      const blob = JSON.stringify(rows);
      assert.equal(blob.includes("orgao.comum"), false, "username cru não persiste");
      assert.equal(blob.includes("senha-do-A-111"), false, "senha crua não persiste");

      // (5) MUTÁVEL sob RLS: uma falha em A grava lockout na linha (UPDATE permitido — sem trigger append-only).
      const { withTenantRls } = await import("../src/database/rls.js");
      await withTenantRls(client, tenantA, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE authority_credentials SET failed_login_count = 3, locked_until = now() + interval '1 hour' WHERE tenant_id = '${tenantA}'::uuid AND username = 'orgao.comum'`,
        ),
      );
      const lockedRows = await client.$queryRawUnsafe<Array<{ failed_login_count: number }>>(
        `SELECT failed_login_count FROM authority_credentials WHERE tenant_id = '${tenantA}'::uuid AND username = 'orgao.comum'`,
      );
      assert.equal(Number(lockedRows[0].failed_login_count), 3, "a authority_credentials é MUTÁVEL (lockout persistido)");
    } finally {
      await teardown(client, tenantA);
      await teardown(client, tenantB);
      await client.$disconnect();
    }
  });
}

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { PrismaAuthorityCredentialRepository } = await import("../src/modules/authority/authority-credential.repository.js");
  const { AuthorityPortalService } = await import("../src/modules/authority/authority-portal.service.js");
  const { hashPassword } = await import("../src/modules/authority/authority-password.js");
  const { PrismaPortalAccessLogRepository, AntiAbuse, InMemoryChallengeStore } = await import("../src/modules/portal-shared/index.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  const fastParams = { N: 2 ** 10, r: 8, p: 1, keylen: 32 } as const;
  const hashFast = (password: string) => hashPassword(password, fastParams);

  const buildService = (tenantId: string) => {
    const service = new AuthorityPortalService({
      tenantId,
      credentials: new PrismaAuthorityCredentialRepository(client),
      accessLog: new PrismaPortalAccessLogRepository(client),
      antiAbuse: new AntiAbuse({
        ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        plateBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        loginBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        challengeBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
        baseDifficulty: 2,
        maxDifficulty: 4,
        failuresPerStep: 1,
        failureWindowMs: 60_000,
      }),
      challengeStore: new InMemoryChallengeStore(),
      logSecret: "rls-authority-log-secret",
      sessionSecret: "rls-authority-session-secret",
      minLatencyMs: 0,
      challengeTtlMs: 120_000,
      lockThreshold: 5,
      lockDurationMs: 3_600_000,
      scryptParams: fastParams,
    });
    const accessLog = (tid: string) =>
      client.$queryRawUnsafe<Array<{ tenant_id: string; outcome: string; action: string }>>(
        `SELECT tenant_id, outcome, action FROM portal_access_logs WHERE tenant_id = '${tid}'::uuid`,
      );
    return { service, accessLog };
  };

  return { client, buildService, hashFast };
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string): Promise<string> {
  const tenant = await client.tenant.create({ data: { name: `Authority Portal ${suffix}`, slug: `authority-portal-${suffix}` } });
  return tenant.id;
}

async function insertCredential(
  client: BootstrapClient,
  tenantId: string,
  input: { username: string; password: string; hashFast: (p: string) => Promise<string> },
): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const passwordHash = await input.hashFast(input.password);
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO authority_credentials (tenant_id, authority_name, username, password_hash)
      VALUES (${tenantId}::uuid, ${"Órgão de Teste"}, ${input.username}, ${passwordHash})
    `,
  );
}

async function runLogin(
  service: import("../src/modules/authority/authority-portal.service.js").AuthorityPortalService,
  input: { username: string; password: string },
) {
  const { solveChallenge } = await import("../src/modules/portal-shared/index.js");
  const issued = await service.challenge({ ip: "203.0.113.7" });
  if (issued.kind !== "issued") throw new Error("challenge inesperadamente barrado no teste RLS");
  const challenge = issued.challenge;
  const solution = solveChallenge(challenge.salt, challenge.difficulty);
  return service.login({ ...input, challengeId: challenge.challengeId, solution, ip: "203.0.113.7" });
}

// Teardown FK-safe: portal_access_logs (trigger append-only → replica) → authority_credentials (mutável) → tenant.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM portal_access_logs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM authority_credentials WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
