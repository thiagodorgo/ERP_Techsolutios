import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// Ω5P PR-20 — interop Sivec-ready (fila de entrega, outbox versionado) sob o Postgres vivo. DB-gated (skip sem
// DATABASE_URL) — a PROVA da mesma-tx e do trigger de DELETE exige o banco real. Cobre os testes-alvo do plano:
//   1) outbox inserido na MESMA tx que o CustodyEvent do marco (rollback conjunto);
//   2) outbox sem DELETE possível (trigger), transição de status (fila) permitida;
//   3) payload do outbox reconciliado 1:1 com o CustodyEvent de origem (sem drift de fonte de verdade);
//   7) isolamento cross-tenant.
if (!connectionString) {
  test("Impound outbox (PR-20) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("STATUS_CHANGE→ACTIVE_CUSTODY: 1 CustodyEvent + 1 impound_outbox_events, payload reconciliado 1:1 (mesma tx)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedProcess(client, repo, suffix);
    try {
      await repoTransition(repo, ctx.tenantId, ctx.processId, "IN_REMOVAL", "RECEPTION");
      await repoTransition(repo, ctx.tenantId, ctx.processId, "RECEPTION", "ACTIVE_CUSTODY");

      const events = await repo.listEvents(ctx.tenantId, ctx.processId);
      const milestoneEvent = events.find(
        (event) => event.type === "STATUS_CHANGE" && (event.payload as { to?: string }).to === "ACTIVE_CUSTODY",
      );
      assert.ok(milestoneEvent, "o CustodyEvent do marco ACTIVE_CUSTODY existe");

      const outbox = await selectOutbox(client, ctx.tenantId, ctx.processId);
      assert.equal(outbox.length, 1, "exatamente 1 registro de outbox para o marco ACTIVE_CUSTODY");
      assert.equal(outbox[0].event_type, "STATUS_CHANGE_ACTIVE_CUSTODY");
      assert.equal(outbox[0].status, "PENDING");
      assert.equal(outbox[0].target, "SIVEC");
      assert.equal(outbox[0].schema_version, 1);

      // (3) reconciliação 1:1 — o payload do outbox CARREGA a referência exata do CustodyEvent de origem, nunca
      // uma 2ª fonte de verdade independente.
      const payload = outbox[0].payload as Record<string, unknown>;
      assert.equal(payload.custodyEventId, milestoneEvent!.id);
      assert.equal(payload.custodySeq, milestoneEvent!.seq);
      assert.equal(payload.custodyHash, milestoneEvent!.hash);
      assert.equal(payload.to, "ACTIVE_CUSTODY");
      assert.equal(payload.from, "RECEPTION");

      // Só 2 marcos rodaram (RECEPTION não é marco do outbox) — nenhum registro extra.
      const allOutbox = await client.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM impound_outbox_events WHERE tenant_id = ${ctx.tenantId}::uuid
      `;
      assert.equal(allOutbox.length, 1, "RECEPTION não é marco de interop — só ACTIVE_CUSTODY captura");
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("N transições concorrentes para o MESMO marco → exatamente 1 vence; outbox e CustodyEvent pareados 1:1 (mesma tx)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedProcess(client, repo, suffix);
    const CONCURRENCY = 6;
    try {
      await repoTransition(repo, ctx.tenantId, ctx.processId, "IN_REMOVAL", "RECEPTION");
      const results = await Promise.allSettled(
        Array.from({ length: CONCURRENCY }, () => repoTransition(repo, ctx.tenantId, ctx.processId, "RECEPTION", "ACTIVE_CUSTODY")),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      assert.equal(fulfilled.length, 1, "exatamente 1 transição vence a corrida");

      const events = await repo.listEvents(ctx.tenantId, ctx.processId);
      const milestoneEvents = events.filter(
        (event) => event.type === "STATUS_CHANGE" && (event.payload as { to?: string }).to === "ACTIVE_CUSTODY",
      );
      assert.equal(milestoneEvents.length, 1, "exatamente 1 CustodyEvent do marco (as perdedoras não chegaram a inserir)");

      const outbox = await selectOutbox(client, ctx.tenantId, ctx.processId);
      assert.equal(outbox.length, 1, "exatamente 1 outbox — nenhuma perdedora deixou rastro parcial (prova prática de mesma-tx)");
      const payload = outbox[0].payload as Record<string, unknown>;
      assert.equal(payload.custodyEventId, milestoneEvents[0].id, "o único outbox aponta para o único CustodyEvent vencedor");
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("impound_outbox_events: DELETE bloqueado pelo TRIGGER; UPDATE de status/attempts é permitido (fila, não append-only estrito)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedProcess(client, repo, suffix);
    try {
      await repoTransition(repo, ctx.tenantId, ctx.processId, "IN_REMOVAL", "RECEPTION");
      await repoTransition(repo, ctx.tenantId, ctx.processId, "RECEPTION", "ACTIVE_CUSTODY");
      const outbox = await selectOutbox(client, ctx.tenantId, ctx.processId);
      assert.equal(outbox.length, 1);

      const { withTenantRls } = await import("../src/database/rls.js");
      // DELETE — bloqueado pelo trigger (I9: a fila nunca perde registro fisicamente).
      await assert.rejects(
        () => withTenantRls(client, ctx.tenantId, (tx) => tx.$executeRawUnsafe(`DELETE FROM impound_outbox_events WHERE tenant_id = '${ctx.tenantId}'::uuid`)),
        /forbids DELETE/i,
        "DELETE em impound_outbox_events deve ser bloqueado pelo trigger",
      );

      // UPDATE de status/attempts — PERMITIDO (a fila muda por desenho conforme o drenador tenta a entrega).
      await withTenantRls(client, ctx.tenantId, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE impound_outbox_events SET status = 'SENT', attempts = 1 WHERE tenant_id = '${ctx.tenantId}'::uuid AND id = '${outbox[0].id}'::uuid`,
        ),
      );
      const updated = await selectOutbox(client, ctx.tenantId, ctx.processId);
      assert.equal(updated[0].status, "SENT");
      assert.equal(updated[0].attempts, 1);

      // CHECK estrutural: status fora da allowlist é rejeitado pelo banco.
      await assert.rejects(
        () =>
          withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE impound_outbox_events SET status = 'BOGUS' WHERE tenant_id = '${ctx.tenantId}'::uuid AND id = '${outbox[0].id}'::uuid`,
            ),
          ),
        /impound_outbox_events_status_chk/,
      );
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("impound_outbox_events: UPDATE de payload/tenant_id/process_id/event_type/occurred_at/schema_version/target/created_at é BLOQUEADO pelo trigger (captura imutável — só status/attempts/last_error mudam)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedProcess(client, repo, suffix);
    try {
      await repoTransition(repo, ctx.tenantId, ctx.processId, "IN_REMOVAL", "RECEPTION");
      await repoTransition(repo, ctx.tenantId, ctx.processId, "RECEPTION", "ACTIVE_CUSTODY");
      const outbox = await selectOutbox(client, ctx.tenantId, ctx.processId);
      assert.equal(outbox.length, 1);

      const { withTenantRls } = await import("../src/database/rls.js");

      // UPDATE de status/attempts/last_error — PERMANECE PERMITIDO (mecânica de entrega da fila).
      await withTenantRls(client, ctx.tenantId, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE impound_outbox_events SET status = 'FAILED', attempts = 1, last_error = 'timeout' WHERE tenant_id = '${ctx.tenantId}'::uuid AND id = '${outbox[0].id}'::uuid`,
        ),
      );
      const afterStatus = await selectOutbox(client, ctx.tenantId, ctx.processId);
      assert.equal(afterStatus[0].status, "FAILED");
      assert.equal(afterStatus[0].attempts, 1);

      // UPDATE de payload — BLOQUEADO (PoC do crítico-adversarial: forjar o payload já capturado).
      await assert.rejects(
        () =>
          withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE impound_outbox_events SET payload = '{"forged":true}'::jsonb WHERE tenant_id = '${ctx.tenantId}'::uuid AND id = '${outbox[0].id}'::uuid`,
            ),
          ),
        /only status\/attempts\/last_error may change/i,
        "UPDATE de payload deve ser bloqueado pelo trigger (imutabilidade da captura)",
      );

      // UPDATE de process_id — BLOQUEADO (reatribuir o registro capturado a outro processo).
      await assert.rejects(
        () =>
          withTenantRls(client, ctx.tenantId, (tx) =>
            tx.$executeRawUnsafe(
              `UPDATE impound_outbox_events SET process_id = gen_random_uuid() WHERE tenant_id = '${ctx.tenantId}'::uuid AND id = '${outbox[0].id}'::uuid`,
            ),
          ),
        /only status\/attempts\/last_error may change/i,
        "UPDATE de process_id deve ser bloqueado pelo trigger",
      );

      // Confirma que o payload/status permanecem íntegros após as tentativas rejeitadas.
      const final = await selectOutbox(client, ctx.tenantId, ctx.processId);
      assert.equal(final[0].status, "FAILED", "status da última mudança PERMITIDA permanece");
      assert.deepEqual(final[0].payload, afterStatus[0].payload, "payload NÃO foi alterado pelas tentativas bloqueadas");
    } finally {
      await teardown(client, ctx.tenantId);
    }
  });

  test("cross-tenant: outbox de A não aparece na varredura de B (RLS)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const suffixA = uniq();
    const suffixB = uniq();
    const ctxA = await seedProcess(client, repo, suffixA);
    const ctxB = await seedProcess(client, repo, suffixB);
    try {
      await repoTransition(repo, ctxA.tenantId, ctxA.processId, "IN_REMOVAL", "RECEPTION");
      await repoTransition(repo, ctxA.tenantId, ctxA.processId, "RECEPTION", "ACTIVE_CUSTODY");

      const { listOutboxEventsForTenant } = await import("../src/modules/impound/impound.outbox.repository.js");
      const outboxA = await listOutboxEventsForTenant(client, ctxA.tenantId);
      const outboxB = await listOutboxEventsForTenant(client, ctxB.tenantId);
      assert.equal(outboxA.length, 1, "A vê seu próprio outbox");
      assert.equal(outboxB.length, 0, "B não vê NADA (nem RLS nem por escopo de processo) do outbox de A");
    } finally {
      await teardown(client, ctxA.tenantId);
      await teardown(client, ctxB.tenantId);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];
type ImpoundRepo = Awaited<ReturnType<typeof bootstrap>>["repo"];

function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaImpoundRepository(client);
  return { client, repo };
}

// applyTransition direto no repositório (mesmo padrão de impound-concurrency.test.ts).
async function repoTransition(repo: ImpoundRepo, tenantId: string, processId: string, from: string, to: string) {
  return repo.applyTransition({
    tenantId,
    processId,
    expectedFrom: from as never,
    to: to as never,
    setEnteredAt: from === "IN_REMOVAL" && to === "RECEPTION",
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from, to, reason: null }, occurredAt: new Date() },
  });
}

async function seedProcess(client: BootstrapClient, repo: ImpoundRepo, suffix: string) {
  const tenant = await client.tenant.create({ data: { name: `Outbox ${suffix}`, slug: `outbox-${suffix}` } });
  const { withTenantRls } = await import("../src/database/rls.js");
  const profile = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, 'Perfil', 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0];
  });
  const process = await repo.createProcess({
    tenantId: tenant.id,
    vehiclePlate: "OUT1B0X",
    vehicleUnidentified: false,
    profileId: profile.id,
    originAuthority: "Autoridade X",
    openingEvent: { type: "STATUS_CHANGE", payload: { from: null, to: "IN_REMOVAL", reason: "process_opened" }, occurredAt: new Date() },
  });
  return { tenantId: tenant.id, profileId: profile.id, processId: process.id };
}

type OutboxRow = {
  readonly id: string;
  readonly event_type: string;
  readonly schema_version: number;
  readonly payload: unknown;
  readonly target: string;
  readonly status: string;
  readonly attempts: number;
};

async function selectOutbox(client: BootstrapClient, tenantId: string, processId: string): Promise<OutboxRow[]> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<OutboxRow[]>`
      SELECT id, event_type, schema_version, payload, target, status, attempts
      FROM impound_outbox_events
      WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid
      ORDER BY created_at ASC
    `,
  );
}

// Teardown FK-safe (superuser + replica p/ o trigger append-only de custody_events): impound_outbox_events ANTES
// de impound_processes (FK RESTRICT). SEMPRE desconecta (finally) — cada teste abre um PrismaClient PRÓPRIO
// (bootstrap); sem $disconnect() a conexão vaza e esgota o pool, travando os testes seguintes da suíte.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  try {
    await client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      await tx.$executeRawUnsafe(`DELETE FROM impound_outbox_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await client.$disconnect();
  }
}
