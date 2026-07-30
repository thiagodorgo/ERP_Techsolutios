import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-19 — a autoridade APROVA/REJEITA a liberação in-system contra o Postgres VIVO. DB-gated (skip sem
// DATABASE_URL): o que só o banco real prova — (a) proveniência D-08 ponta-a-ponta (AuthorityRemovalRequest →
// WorkOrder → ImpoundProcess → ImpoundRelease); (b) APPROVE numa SÓ tx (INSERT decisão + carimbo em
// impound_releases); (c) REJECT não muda ImpoundRelease; (d) release_authority_decisions é APPEND-ONLY (trigger);
// (e) FK RESTRICT/CHECK da migração 20260851; (f) isolamento cross-tenant sob RLS FORCE. O CI é a autoridade.
if (!connectionString) {
  test("authority-release-approval RLS/integration requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("D-08 ponta-a-ponta + APPROVE numa tx: carimba authority_approved_at/authority_credential_id + grava decisão", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const credId = await insertCredential(client, ctx.tenantId, `orgao-${suffix}`);
    const workOrderId = await insertWorkOrder(client, ctx.tenantId, ctx.catalogId, `WO-${suffix}`);
    await insertRemovalRequest(client, ctx.tenantId, credId, workOrderId, "ABC1D23");
    const processId = await insertProcess(client, ctx.tenantId, ctx.profileId, workOrderId);
    const releaseId = await insertRelease(client, ctx.tenantId, processId);
    try {
      const { service, sessionFor } = buildService(ctx.tenantId);
      const token = await sessionFor(credId);

      const list = await service.listApprovals({ authorization: `Bearer ${token}`, ip: "203.0.113.10" });
      assert.equal(list.kind, "ok");
      const items = (list as { items: readonly { processId: string }[] }).items;
      assert.equal(items.length, 1);
      assert.equal(items[0].processId, processId);

      const decide = await service.decide({
        authorization: `Bearer ${token}`,
        processId,
        body: { decision: "APPROVE", reference: "OF-42", note: "conferido" },
        ip: "203.0.113.10",
      });
      assert.equal(decide.kind, "approved");

      const release = await selectRelease(client, ctx.tenantId, releaseId);
      assert.equal(release.status, "AUTHORIZED");
      assert.ok(release.authority_approved_at);
      assert.equal(release.authority_approved_by, null, "via portal: authority_approved_by fica NULL de propósito (D-09)");
      assert.equal(release.authority_credential_id, credId, "proveniência = a credencial da sessão");

      const decisions = await selectDecisions(client, ctx.tenantId, releaseId);
      assert.equal(decisions.length, 1);
      assert.equal(decisions[0].decision, "APPROVED");
      assert.equal(decisions[0].credential_id, credId);

      // Após aprovada, a fila PENDENTE não a lista mais.
      const listAfter = await service.listApprovals({ authorization: `Bearer ${token}`, ip: "203.0.113.10" });
      assert.equal((listAfter as { items: readonly unknown[] }).items.length, 0, "aprovada não aparece mais na fila pendente");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("REJECT não altera ImpoundRelease (continua IN_PROGRESS); note obrigatória; decisão gravada", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const credId = await insertCredential(client, ctx.tenantId, `orgao-${suffix}`);
    const workOrderId = await insertWorkOrder(client, ctx.tenantId, ctx.catalogId, `WO-${suffix}`);
    await insertRemovalRequest(client, ctx.tenantId, credId, workOrderId, "XYZ9K88");
    const processId = await insertProcess(client, ctx.tenantId, ctx.profileId, workOrderId);
    const releaseId = await insertRelease(client, ctx.tenantId, processId);
    try {
      const { service, sessionFor } = buildService(ctx.tenantId);
      const token = await sessionFor(credId);

      const decide = await service.decide({
        authorization: `Bearer ${token}`,
        processId,
        body: { decision: "REJECT", note: "Documentação insuficiente" },
        ip: "203.0.113.11",
      });
      assert.equal(decide.kind, "rejected");

      const release = await selectRelease(client, ctx.tenantId, releaseId);
      assert.equal(release.status, "IN_PROGRESS", "D-10: ImpoundRelease NÃO muda");
      assert.equal(release.authority_approved_at, null);
      assert.equal(release.authority_credential_id, null);

      const decisions = await selectDecisions(client, ctx.tenantId, releaseId);
      assert.equal(decisions.length, 1);
      assert.equal(decisions[0].decision, "REJECTED");
      assert.equal(decisions[0].note, "Documentação insuficiente");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("cross-tenant RLS: credencial de A NUNCA decide/lê o processo de B (404 uniforme; nada muda em B)", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    const sa = uniq();
    const sb = uniq();
    const ctxA = await seedTenant(client, sa);
    const ctxB = await seedTenant(client, sb);
    const credA = await insertCredential(client, ctxA.tenantId, `orgao-${sa}`);
    const credB = await insertCredential(client, ctxB.tenantId, `orgao-${sb}`);
    const workOrderB = await insertWorkOrder(client, ctxB.tenantId, ctxB.catalogId, `WO-${sb}`);
    await insertRemovalRequest(client, ctxB.tenantId, credB, workOrderB, "CCC3C33");
    const processB = await insertProcess(client, ctxB.tenantId, ctxB.profileId, workOrderB);
    const releaseB = await insertRelease(client, ctxB.tenantId, processB);
    try {
      // O BFF está vinculado ao tenant A (binding de deploy), mas a sessão traz a credencial de A — o processo é de
      // B. A vinculação D-08 roda sob withTenantRls(A): a query nem ENXERGA as tabelas de B (RLS FORCE) → 404.
      const { service, sessionFor } = buildService(ctxA.tenantId);
      const tokenA = await sessionFor(credA);
      const decide = await service.decide({ authorization: `Bearer ${tokenA}`, processId: processB, body: { decision: "APPROVE" }, ip: "203.0.113.12" });
      assert.equal(decide.kind, "not_found");

      const releaseAfter = await selectRelease(client, ctxB.tenantId, releaseB);
      assert.equal(releaseAfter.status, "IN_PROGRESS", "nada mudou em B");
      assert.equal(releaseAfter.authority_approved_at, null);
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
      await client.$disconnect();
    }
  });

  test("release_authority_decisions é APPEND-ONLY: UPDATE e DELETE são bloqueados pelo trigger", async () => {
    const { client, buildService } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const credId = await insertCredential(client, ctx.tenantId, `orgao-${suffix}`);
    const workOrderId = await insertWorkOrder(client, ctx.tenantId, ctx.catalogId, `WO-${suffix}`);
    await insertRemovalRequest(client, ctx.tenantId, credId, workOrderId, "DDD4D44");
    const processId = await insertProcess(client, ctx.tenantId, ctx.profileId, workOrderId);
    const releaseId = await insertRelease(client, ctx.tenantId, processId);
    try {
      const { service, sessionFor } = buildService(ctx.tenantId);
      const token = await sessionFor(credId);
      await service.decide({ authorization: `Bearer ${token}`, processId, body: { decision: "APPROVE" }, ip: "203.0.113.13" });
      const decisions = await selectDecisions(client, ctx.tenantId, releaseId);
      assert.equal(decisions.length, 1);
      const decisionId = decisions[0].id;

      const { withTenantRls } = await import("../src/database/rls.js");
      await assert.rejects(
        () => withTenantRls(client, ctx.tenantId, (tx) => tx.$executeRawUnsafe(`UPDATE release_authority_decisions SET note = 'edited' WHERE id = '${decisionId}'::uuid`)),
        (error: unknown) => /append-only|restrict_violation/i.test(String(error)),
        "UPDATE deveria ser bloqueado pelo trigger append-only",
      );
      await assert.rejects(
        () => withTenantRls(client, ctx.tenantId, (tx) => tx.$executeRawUnsafe(`DELETE FROM release_authority_decisions WHERE id = '${decisionId}'::uuid`)),
        (error: unknown) => /append-only|restrict_violation/i.test(String(error)),
        "DELETE deveria ser bloqueado pelo trigger append-only",
      );
      // a linha sobrevive intacta.
      const stillThere = await selectDecisions(client, ctx.tenantId, releaseId);
      assert.equal(stillThere.length, 1);
      assert.equal(stillThere[0].note, null);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("migração 20260851: CHECK de decision + FK RESTRICT (release/credential inexistente) rejeitam", async () => {
    const { client } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    const credId = await insertCredential(client, ctx.tenantId, `orgao-${suffix}`);
    const workOrderId = await insertWorkOrder(client, ctx.tenantId, ctx.catalogId, `WO-${suffix}`);
    const processId = await insertProcess(client, ctx.tenantId, ctx.profileId, workOrderId);
    const releaseId = await insertRelease(client, ctx.tenantId, processId);
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      // CHECK: decision fora do domínio.
      await assert.rejects(
        () =>
          withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$executeRawUnsafe(
              `INSERT INTO release_authority_decisions (tenant_id, release_id, credential_id, decision, decided_at) VALUES ('${ctx.tenantId}'::uuid, '${releaseId}'::uuid, '${credId}'::uuid, 'MAYBE', now())`,
            ),
          ),
        /violates check constraint/i,
      );
      // FK RESTRICT: release_id inexistente.
      await assert.rejects(
        () =>
          withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$executeRawUnsafe(
              `INSERT INTO release_authority_decisions (tenant_id, release_id, credential_id, decision, decided_at) VALUES ('${ctx.tenantId}'::uuid, gen_random_uuid(), '${credId}'::uuid, 'REJECTED', now())`,
            ),
          ),
        /violates foreign key constraint/i,
      );
      // FK RESTRICT: authority_credential_id inexistente em impound_releases.
      await assert.rejects(
        () =>
          withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$executeRawUnsafe(`UPDATE impound_releases SET authority_credential_id = gen_random_uuid() WHERE tenant_id = '${ctx.tenantId}'::uuid AND id = '${releaseId}'::uuid`),
          ),
        /violates foreign key constraint/i,
      );
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });
}

// ── infra ─────────────────────────────────────────────────────────────────────────────────────────────────────
function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { PrismaAuthorityReleaseApprovalRepository } = await import("../src/modules/authority/authority-release-approval.repository.js");
  const { PrismaAuthorityCredentialRepository } = await import("../src/modules/authority/authority-credential.repository.js");
  const { AuthorityReleaseApprovalService } = await import("../src/modules/authority/authority-release-approval.service.js");
  const { PrismaPortalAccessLogRepository, AntiAbuse, signAuthoritySession } = await import("../src/modules/portal-shared/index.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  const SESSION_SECRET = "rls-authority-release-approval-session-secret";
  const buildService = (tenantId: string) => {
    const service = new AuthorityReleaseApprovalService({
      tenantId,
      credentials: new PrismaAuthorityCredentialRepository(client),
      approvals: new PrismaAuthorityReleaseApprovalRepository(client),
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
      logSecret: "rls-authority-release-approval-log-secret",
      sessionSecret: SESSION_SECRET,
      minLatencyMs: 0,
    });
    const sessionFor = (credentialId: string) => signAuthoritySession({ credentialId }, { secret: SESSION_SECRET });
    return { service, sessionFor };
  };

  return { client, buildService };
}

type TenantCtx = { tenantId: string; profileId: string; catalogId: string };

async function seedTenant(client: BootstrapClient, suffix: string): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Release Approval ${suffix}`, slug: `release-approval-${suffix}` } });
  return withTenantRls(client, tenant.id, async (tx) => {
    const [profile] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${`Perfil ${suffix}`}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    const [catalog] = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO service_catalog (tenant_id, name, service_type, custody_profile_id)
      VALUES (${tenant.id}::uuid, ${`Remoção ${suffix}`}, 'reboque', ${profile.id}::uuid)
      RETURNING id
    `;
    return { tenantId: tenant.id, profileId: profile.id, catalogId: catalog.id };
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

async function insertWorkOrder(client: BootstrapClient, tenantId: string, catalogId: string, code: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO work_orders (tenant_id, code, title, status, completed_at, service_catalog_id)
      VALUES (${tenantId}::uuid, ${code}, 'Remoção', 'completed', now(), ${catalogId}::uuid)
      RETURNING id
    `;
    return rows[0].id;
  });
}

// D-08: a AuthorityRemovalRequest é a PROVENIÊNCIA (credential_id → work_order_id). status DISPATCHED (já atendida).
async function insertRemovalRequest(client: BootstrapClient, tenantId: string, credentialId: string, workOrderId: string, plate: string): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(client, tenantId, (tx) =>
    tx.$executeRaw`
      INSERT INTO authority_removal_requests (tenant_id, credential_id, work_order_id, plate, status)
      VALUES (${tenantId}::uuid, ${credentialId}::uuid, ${workOrderId}::uuid, ${plate}, 'DISPATCHED')
    `,
  );
}

async function insertProcess(client: BootstrapClient, tenantId: string, profileId: string, serviceOrderId: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes (tenant_id, profile_id, service_order_id, origin_authority, vehicle_unidentified, unidentified_reason, status, entered_at, vehicle_plate)
      VALUES (${tenantId}::uuid, ${profileId}::uuid, ${serviceOrderId}::uuid, 'Autoridade solicitante', false, NULL, 'ACTIVE_CUSTODY', now(), 'ABC1D23')
      RETURNING id
    `;
    return rows[0].id;
  });
}

async function insertRelease(client: BootstrapClient, tenantId: string, processId: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_releases (tenant_id, process_id, kind, status, recipient_name)
      VALUES (${tenantId}::uuid, ${processId}::uuid, 'STANDARD', 'IN_PROGRESS', 'Fulano de Tal')
      RETURNING id
    `;
    return rows[0].id;
  });
}

type ReleaseRow = { status: string; authority_approved_at: Date | null; authority_approved_by: string | null; authority_credential_id: string | null };

async function selectRelease(client: BootstrapClient, tenantId: string, releaseId: string): Promise<ReleaseRow> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const rows = await withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<ReleaseRow[]>`
      SELECT status, authority_approved_at, authority_approved_by, authority_credential_id
      FROM impound_releases WHERE tenant_id = ${tenantId}::uuid AND id = ${releaseId}::uuid
    `,
  );
  return rows[0];
}

type DecisionRow = { id: string; decision: string; credential_id: string; note: string | null; reference: string | null };

async function selectDecisions(client: BootstrapClient, tenantId: string, releaseId: string): Promise<DecisionRow[]> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<DecisionRow[]>`
      SELECT id, decision, credential_id, note, reference FROM release_authority_decisions
      WHERE tenant_id = ${tenantId}::uuid AND release_id = ${releaseId}::uuid
    `,
  );
}

// Teardown FK-safe: release_authority_decisions (trigger append-only → replica) → impound_releases →
// authority_removal_requests → impound_processes → work_orders → service_catalog → jurisdiction_profiles →
// authority_credentials → portal_access_logs → audit_logs → tenant.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM release_authority_decisions WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM release_requirement_checks WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_releases WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM authority_removal_requests WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM authority_credentials WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM portal_access_logs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
