import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// I2/FSM sob CONCORRÊNCIA REAL + append-only ESTRUTURAL no Postgres. DB-gated (skip sem DATABASE_URL, como
// rls-tenant-isolation) — Node é single-thread, a corrida real exige o banco.
if (!connectionString) {
  test("Impound concurrency (I2/FSM) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 6;

  test("N transições concorrentes no MESMO processo → exatamente 1 vence (FOR UPDATE + @@unique seq)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ctx = await seedProcess(client, repo, suffix);
    try {
      const actor = makeActor(ctx.tenantId);
      // Todas correm IN_REMOVAL→RECEPTION ao mesmo tempo. Só 1 pode transicionar; as demais perdem a corrida.
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, () => repoTransition(repo, actor, ctx.processId, "IN_REMOVAL", "RECEPTION")),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      assert.equal(fulfilled.length, 1, "exatamente 1 transição deve vencer a corrida");
      assert.equal(rejected.length, CONCURRENCY - 1);
      for (const rejection of rejected) {
        const error = (rejection as PromiseRejectedResult).reason as { code?: string; statusCode?: number; reason?: string };
        assert.equal(error.statusCode, 409);
        assert.equal(error.reason, "concurrent_custody_append");
      }
      // A cadeia persistida ficou íntegra: 2 eventos (abertura + a transição vencedora).
      const events = await repo.listEvents(ctx.tenantId, ctx.processId);
      assert.equal(events.length, 2);
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("append-only ESTRUTURAL: UPDATE/DELETE cru em custody_events → erro do TRIGGER", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ctx = await seedProcess(client, repo, suffix);
    try {
      const { withTenantRls } = await import("../src/database/rls.js");
      // A app roda como o OWNER da conexão de teste, mas o TRIGGER dispara para TODOS (não-replica). UPDATE barra.
      await assert.rejects(
        () => withTenantRls(client, ctx.tenantId, (tx) => tx.$executeRawUnsafe(`UPDATE custody_events SET type = 'ADJUSTMENT' WHERE tenant_id = '${ctx.tenantId}'::uuid`)),
        /append-only/i,
        "UPDATE em custody_events deve ser bloqueado pelo trigger",
      );
      await assert.rejects(
        () => withTenantRls(client, ctx.tenantId, (tx) => tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${ctx.tenantId}'::uuid`)),
        /append-only/i,
        "DELETE em custody_events deve ser bloqueado pelo trigger",
      );
      // Os eventos seguem intactos.
      const events = await repo.listEvents(ctx.tenantId, ctx.processId);
      assert.equal(events.length, 1);
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("verify sobre cadeia PERSISTIDA real (create + transições) = valid (com reconciliação do cross-anchor)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ctx = await seedProcess(client, repo, suffix);
    try {
      const actor = makeActor(ctx.tenantId);
      await repoTransition(repo, actor, ctx.processId, "IN_REMOVAL", "RECEPTION");
      const process = await repo.findProcessById(ctx.tenantId, ctx.processId);
      const events = await repo.listEvents(ctx.tenantId, ctx.processId);
      const crossAnchors = await repo.listAuditAnchors(ctx.tenantId, ctx.processId);
      assert.equal(crossAnchors.length, 2, "audit_logs deve ter 2 cross-anchors (abertura + transição)");
      const { verifyChain } = await import("../src/modules/impound/impound.hashchain.js");
      const result = verifyChain({
        tenantId: ctx.tenantId,
        processId: ctx.processId,
        events,
        head: { seq: process!.custodySeqHead, hash: process!.custodyHashHead ?? null },
        crossAnchors,
      });
      assert.equal(result.valid, true);
      assert.equal(result.eventCount, 2);
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  // F1 da junta — o ataque que a âncora do agregado sozinha NÃO pega: apagar a ponta (via replica, superuser) E
  // ajustar custody_hash_head/seq para o penúltimo. Sem cross-anchor, verify PASSA; com a reconciliação do
  // audit_logs (store independente, que ainda tem o anchor do seq apagado), acusa cross_anchor_mismatch.
  test("tip-truncation + custody_hash_head ajustado (via replica) → verify acusa cross_anchor_mismatch", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ctx = await seedProcess(client, repo, suffix);
    try {
      const actor = makeActor(ctx.tenantId);
      await repoTransition(repo, actor, ctx.processId, "IN_REMOVAL", "RECEPTION"); // 2 eventos + 2 anchors
      const seq1 = await client.$queryRawUnsafe<Array<{ hash: string }>>(
        `SELECT hash FROM custody_events WHERE tenant_id = '${ctx.tenantId}'::uuid AND process_id = '${ctx.processId}'::uuid AND seq = 1`,
      );
      // ATAQUE: apaga o evento da ponta (seq=2) via replica (o trigger não dispara) E ajusta a âncora do agregado
      // para o penúltimo — deixando cadeia+âncora coerentes entre si. O audit_logs NÃO é tocado (ainda tem o seq=2).
      await client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
        await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${ctx.tenantId}'::uuid AND process_id = '${ctx.processId}'::uuid AND seq = 2`);
        await tx.$executeRawUnsafe(`UPDATE impound_processes SET custody_seq_head = 1, custody_hash_head = '${seq1[0].hash}' WHERE tenant_id = '${ctx.tenantId}'::uuid AND id = '${ctx.processId}'::uuid`);
      });

      const process = await repo.findProcessById(ctx.tenantId, ctx.processId);
      const events = await repo.listEvents(ctx.tenantId, ctx.processId);
      const crossAnchors = await repo.listAuditAnchors(ctx.tenantId, ctx.processId);
      const head = { seq: process!.custodySeqHead, hash: process!.custodyHashHead ?? null };
      const { verifyChain } = await import("../src/modules/impound/impound.hashchain.js");

      // SEM cross-anchor: o ataque passa (âncora do agregado coerente com a cadeia truncada) — limitação declarada.
      const without = verifyChain({ tenantId: ctx.tenantId, processId: ctx.processId, events, head });
      assert.equal(without.valid, true, "sem reconciliação o tip-truncation passa (âncora do agregado sozinha não pega)");

      // COM cross-anchor: DETECTADO (audit_logs ainda conhece o seq=2 apagado).
      const withAnchor = verifyChain({ tenantId: ctx.tenantId, processId: ctx.processId, events, head, crossAnchors });
      assert.equal(withAnchor.valid, false);
      assert.equal(withAnchor.brokenAt?.reason, "cross_anchor_mismatch");
      assert.equal(withAnchor.brokenAt?.seq, 2);
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];
type ImpoundRepo = Awaited<ReturnType<typeof bootstrap>>["repo"];

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaImpoundRepository(client);
  return { client, repo };
}

function makeActor(tenantId: string) {
  return {
    tenantId,
    userId: undefined as unknown as string,
    roles: ["manager"] as const,
    permissions: ["impound:transition"] as const,
  };
}

// applyTransition direto no repositório (o serviço decide legalidade; aqui exercitamos a atomicidade sob corrida).
async function repoTransition(repo: ImpoundRepo, actor: { tenantId: string }, processId: string, from: string, to: string) {
  return repo.applyTransition({
    tenantId: actor.tenantId,
    processId,
    expectedFrom: from as never,
    to: to as never,
    setEnteredAt: from === "IN_REMOVAL" && to === "RECEPTION",
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from, to, reason: null }, occurredAt: new Date() },
  });
}

// Cria tenant + jurisdiction_profile (profile_id NOT NULL) + processo com evento de abertura.
async function seedProcess(client: BootstrapClient, repo: ImpoundRepo, suffix: string) {
  const tenant = await client.tenant.create({ data: { name: `Impound Conc ${suffix}`, slug: `impound-conc-${suffix}` } });
  const { withTenantRls } = await import("../src/database/rls.js");
  const profile = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0];
  });
  const process = await repo.createProcess({
    tenantId: tenant.id,
    vehiclePlate: "ABC1D23",
    vehicleUnidentified: false,
    profileId: profile.id,
    originAuthority: "Autoridade X",
    openingEvent: { type: "STATUS_CHANGE", payload: { from: null, to: "IN_REMOVAL", reason: "process_opened" }, occurredAt: new Date() },
  });
  return { tenantId: tenant.id, profileId: profile.id, processId: process.id };
}

// Teardown FK-safe: custody_events → impound_processes ANTES de jurisdiction_profile/tenant. custody_events tem
// TRIGGER append-only (BEFORE UPDATE OR DELETE) — a DELEÇÃO usa session_replication_role=replica (só superuser),
// o caminho de manutenção padrão do Postgres em que o trigger não dispara. Prova, de quebra, que o append-only
// bloqueia a app real (que NÃO é replica).
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
      // Cross-anchor do append (I2) vive em audit_logs → limpar antes do tenant (FK RESTRICT).
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await client.$disconnect();
  }
}
