import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω-VID PR-09 (condição da junta — agente-dba-guardiao) — a query PRISMA autoritativa de custody-history (agrupamento
// por identity_id, orderBy entered_at DESC NULLS LAST + desempate created_at DESC, join da relação yard, isolamento
// tenant-first sob RLS) só tinha cobertura EM MEMÓRIA. Este teste DB-gated fixa a query real como regressão, no mesmo
// padrão de tests/impound-trigger-durability.test.ts (skip sem DATABASE_URL). O repo em memória NÃO reproduz o
// desempate secundário {created_at desc}; aqui ele é exercitado contra o Postgres vivo.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("custody-history DB-gated requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("listCustodyHistory: agrupa por identidade, ordena entered_at DESC NULLS LAST + created_at DESC, resolve yardName", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedTenant(client, uniq());
    try {
      const identityX = await seedIdentity(client, ctx.tenantId, "ABC1D23");
      const identityY = await seedIdentity(client, ctx.tenantId, "XYZ9K88");
      const yardNorte = await seedYard(client, ctx.tenantId, "Pátio Norte");
      const yardCentral = await seedYard(client, ctx.tenantId, "Pátio Central");

      const t = (iso: string) => new Date(iso);
      // Mesma identidade X (4 processos), com um par de entered_at IGUAL (desempate por created_at DESC) e um entered_at NULL.
      const pTie = await seedProcess(client, ctx, { identityId: identityX, yardId: null, plate: "ABC1D23", status: "JUDICIAL_HOLD", enteredAt: t("2026-07-01T10:00:00Z"), createdAt: t("2026-07-01T11:00:00Z") });
      const pCurrent = await seedProcess(client, ctx, { identityId: identityX, yardId: yardNorte, plate: "ABC1D23", status: "ACTIVE_CUSTODY", enteredAt: t("2026-07-01T10:00:00Z"), createdAt: t("2026-07-01T10:00:00Z") });
      const pOld = await seedProcess(client, ctx, { identityId: identityX, yardId: yardCentral, plate: "ABC1D23", status: "RELEASED", enteredAt: t("2026-05-01T10:00:00Z"), createdAt: t("2026-05-01T10:00:00Z") });
      const pNull = await seedProcess(client, ctx, { identityId: identityX, yardId: null, plate: "ABC1D23", status: "RECEPTION", enteredAt: null, createdAt: t("2026-04-01T10:00:00Z") });
      // OUTRA identidade (mesmo tenant) — NÃO deve aparecer.
      await seedProcess(client, ctx, { identityId: identityY, yardId: null, plate: "XYZ9K88", status: "ACTIVE_CUSTODY", enteredAt: t("2026-06-01T10:00:00Z"), createdAt: t("2026-06-01T10:00:00Z") });

      const history = await repo.listCustodyHistory(ctx.tenantId, pCurrent);
      assert.equal(history.length, 4, "só os 4 processos da identidade X");
      assert.deepEqual(
        history.map((h) => h.id),
        [pTie, pCurrent, pOld, pNull],
        "ordem: entered_at DESC (empate → created_at DESC) e NULL por último",
      );
      assert.equal(history[0].isCurrent, false);
      assert.equal(history[1].isCurrent, true, "só o alvo é isCurrent");
      assert.equal(history[1].yardName, "Pátio Norte", "yardName resolvido pela relação yard");
      assert.equal(history[2].yardName, "Pátio Central");
      assert.equal(history[0].yardName, undefined, "sem vaga → yardName ausente");
      assert.equal(history[3].id, pNull, "entered_at NULL por último (NULLS LAST)");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("listCustodyHistory: processo SEM identidade → só o próprio (custódia única), isCurrent=true", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedTenant(client, uniq());
    try {
      const solo = await seedProcess(client, ctx, { identityId: null, yardId: null, plate: "ABC1D23", status: "ACTIVE_CUSTODY", enteredAt: new Date(), createdAt: new Date() });
      const history = await repo.listCustodyHistory(ctx.tenantId, solo);
      assert.equal(history.length, 1);
      assert.equal(history[0].id, solo);
      assert.equal(history[0].isCurrent, true);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("listCustodyHistory: ISOLAMENTO — processo de OUTRO tenant nunca aparece (where tenant-first + RLS)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const a = await seedTenant(client, uniq());
    const b = await seedTenant(client, uniq());
    try {
      const idA = await seedIdentity(client, a.tenantId, "ABC1D23");
      const mine = await seedProcess(client, a, { identityId: idA, yardId: null, plate: "ABC1D23", status: "ACTIVE_CUSTODY", enteredAt: new Date(), createdAt: new Date() });
      // Outro tenant, sua PRÓPRIA identidade e processo.
      const idB = await seedIdentity(client, b.tenantId, "ABC1D23");
      const foreign = await seedProcess(client, b, { identityId: idB, yardId: null, plate: "ABC1D23", status: "ACTIVE_CUSTODY", enteredAt: new Date(), createdAt: new Date() });

      const mineHistory = await repo.listCustodyHistory(a.tenantId, mine);
      assert.equal(mineHistory.length, 1, "só o processo do tenant A");
      assert.equal(mineHistory[0].id, mine);
      assert.ok(!mineHistory.some((h) => h.id === foreign), "o processo do tenant B nunca vaza");

      // O processo de A é INVISÍVEL sob o tenant B (lista vazia → o service traduziria para 404).
      const foreignView = await repo.listCustodyHistory(b.tenantId, mine);
      assert.equal(foreignView.length, 0, "processo de A é inexistente sob o tenant B");
    } finally {
      await teardown(client, a.tenantId);
      await teardown(client, b.tenantId);
      await client.$disconnect();
    }
  });
}

// ── infra (mesmo padrão de tests/impound-trigger-durability.test.ts) ─────────────────────────────────────────────
function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaImpoundCustodyHistoryRepository } = await import("../src/modules/impound/impound.custody-history-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaImpoundCustodyHistoryRepository(client);
  return { client, repo };
}

type TenantCtx = { tenantId: string; profileId: string };
type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Custody Hist ${suffix}`, slug: `custody-hist-${suffix}` } });
  const profileId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${`Perfil ${suffix}`}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
  return { tenantId: tenant.id, profileId };
}

async function seedIdentity(client: BootstrapClient, tenantId: string, plateKey: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO third_party_vehicle_identities (tenant_id, plate_key, unidentified, confidence)
      VALUES (${tenantId}::uuid, ${plateKey}, false, 'PROVISIONAL') RETURNING id
    `;
    return rows[0].id;
  });
}

async function seedYard(client: BootstrapClient, tenantId: string, name: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO yards (tenant_id, name, address) VALUES (${tenantId}::uuid, ${name}, 'Rua de Teste, 100') RETURNING id
    `;
    return rows[0].id;
  });
}

async function seedProcess(
  client: BootstrapClient,
  ctx: TenantCtx,
  input: { identityId: string | null; yardId: string | null; plate: string; status: string; enteredAt: Date | null; createdAt: Date },
): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, ctx.tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes
        (tenant_id, profile_id, origin_authority, identity_id, yard_id, vehicle_plate, vehicle_unidentified, status, entered_at, created_at)
      VALUES
        (${ctx.tenantId}::uuid, ${ctx.profileId}::uuid, 'DETRAN-SP', ${input.identityId}::uuid, ${input.yardId}::uuid,
         ${input.plate}, false, ${input.status}, ${input.enteredAt}, ${input.createdAt})
      RETURNING id
    `;
    return rows[0].id;
  });
}

// Teardown escopado por tenant que ESTE teste criou (FK-safe, triggers desligados via session_replication_role). NUNCA
// mass-delete por wildcard — só as linhas do tenant semeado (lição feedback-no-adhoc-mass-delete-live-db).
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM yards WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = '${tenantId}'::uuid`);
  });
}
