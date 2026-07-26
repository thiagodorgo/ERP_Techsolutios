import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// I1 (1-para-1 vaga×processo) PROVADO SOB CONCORRÊNCIA REAL no Postgres: FOR UPDATE + partial-unique. DB-gated
// (skip sem DATABASE_URL, como rls-tenant-isolation) — Node é single-thread, então a corrida real exige o banco.
if (!connectionString) {
  test("Yard occupancy concurrency (I1) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  const CONCURRENCY = 5;

  test("I1a — N allocate concorrentes na MESMA vaga → exatamente 1 sucesso (SELECT ... FOR UPDATE)", async () => {
    const { client, repo, occupancy } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantId = await createTenant(client, suffix);
    try {
      const actor = makeActor(tenantId);
      const yard = await repo.createYard({ tenantId, name: `Pátio ${suffix}`, address: "Rua X, 1", timezone: "America/Sao_Paulo" });
      const area = await repo.createArea({ tenantId, yardId: yard.id, kind: "BLOCK", name: `Quadra ${suffix}` });
      const spot = await repo.createSpot({ tenantId, areaId: area.id, code: `A-${suffix}` });

      // PR-06 — a FK dura yard_spots.current_process_id → impound_processes exige processos REAIS (não mais UUIDs
      // sintéticos): N processos distintos disputam a MESMA vaga.
      const profileId = await createProfile(client, tenantId, suffix);
      const processIds = await Promise.all(Array.from({ length: CONCURRENCY }, () => createProcess(client, tenantId, profileId)));
      const results = await Promise.allSettled(
        processIds.map((processId) => occupancy.allocate(actor, { spotId: spot.id, processId })),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      assert.equal(fulfilled.length, 1, "exatamente 1 allocate deve vencer a corrida pela mesma vaga");
      assert.equal(rejected.length, CONCURRENCY - 1);
      for (const rejection of rejected) {
        const error = (rejection as PromiseRejectedResult).reason as { code?: string; statusCode?: number };
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "SPOT_NOT_FREE");
      }

      const finalSpot = await repo.findSpotById(tenantId, spot.id);
      assert.equal(finalSpot?.status, "OCCUPIED");
    } finally {
      await teardown(client, tenantId);
    }
  });

  test("I1b — N allocate do MESMO processId em vagas distintas → exatamente 1 sucesso (partial-unique)", async () => {
    const { client, repo, occupancy } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantId = await createTenant(client, suffix);
    try {
      const actor = makeActor(tenantId);
      const yard = await repo.createYard({ tenantId, name: `Pátio ${suffix}`, address: "Rua X, 1", timezone: "America/Sao_Paulo" });
      const area = await repo.createArea({ tenantId, yardId: yard.id, kind: "BLOCK", name: `Quadra ${suffix}` });
      const spots = await Promise.all(
        Array.from({ length: CONCURRENCY }, (_, index) => repo.createSpot({ tenantId, areaId: area.id, code: `A-${index}-${suffix}` })),
      );

      const profileId = await createProfile(client, tenantId, suffix);
      const processId = await createProcess(client, tenantId, profileId); // processo REAL (FK dura PR-06)
      const results = await Promise.allSettled(
        spots.map((spot) => occupancy.allocate(actor, { spotId: spot.id, processId })),
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      assert.equal(fulfilled.length, 1, "o MESMO processo só pode ocupar 1 vaga");
      assert.equal(rejected.length, CONCURRENCY - 1);
      for (const rejection of rejected) {
        const error = (rejection as PromiseRejectedResult).reason as { code?: string; statusCode?: number };
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "PROCESS_ALREADY_PARKED");
      }

      // o processo aparece em EXATAMENTE 1 vaga do pátio.
      const occupancyMap = await repo.listSpotsByYard({ tenantId, yardId: yard.id });
      assert.equal(occupancyMap.filter((s) => s.currentProcessId === processId).length, 1);
    } finally {
      await teardown(client, tenantId);
    }
  });

  test("I1 — move preserva o processId e nunca deixa 2 vagas com o mesmo processo", async () => {
    const { client, repo, occupancy } = await bootstrap(connectionString);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantId = await createTenant(client, suffix);
    try {
      const actor = makeActor(tenantId);
      const yard = await repo.createYard({ tenantId, name: `Pátio ${suffix}`, address: "Rua X, 1", timezone: "America/Sao_Paulo" });
      const area = await repo.createArea({ tenantId, yardId: yard.id, kind: "BLOCK", name: `Quadra ${suffix}` });
      const from = await repo.createSpot({ tenantId, areaId: area.id, code: `FROM-${suffix}` });
      const to = await repo.createSpot({ tenantId, areaId: area.id, code: `TO-${suffix}` });

      const profileId = await createProfile(client, tenantId, suffix);
      const processId = await createProcess(client, tenantId, profileId); // processo REAL (FK dura PR-06)
      await occupancy.allocate(actor, { spotId: from.id, processId });
      const moved = await occupancy.move(actor, { fromSpotId: from.id, toSpotId: to.id });
      assert.equal(moved.id, to.id);
      assert.equal(moved.status, "OCCUPIED");
      assert.equal(moved.currentProcessId, processId);

      const fromAfter = await repo.findSpotById(tenantId, from.id);
      assert.equal(fromAfter?.status, "FREE");
      assert.equal(fromAfter?.currentProcessId, undefined);

      const occupancyMap = await repo.listSpotsByYard({ tenantId, yardId: yard.id });
      assert.equal(occupancyMap.filter((s) => s.currentProcessId === processId).length, 1);
    } finally {
      await teardown(client, tenantId);
    }
  });
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
  ]);
  const { RlsPrismaYardRepository } = await import("../src/modules/yard/yard-prisma.repository.js");
  const { OccupancyService } = await import("../src/modules/yard/yard.service.js");

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaYardRepository(client);
  const occupancy = new OccupancyService(repo);
  return { client, repo, occupancy };
}

function makeActor(tenantId: string) {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"] as const,
    permissions: ["yard:read", "yard:create", "yard:update"] as const,
  };
}

async function createTenant(client: BootstrapClient, suffix: string): Promise<string> {
  const tenant = await client.tenant.create({
    data: { name: `Yard Concurrency ${suffix}`, slug: `yard-concurrency-${suffix}` },
  });
  return tenant.id;
}

// PR-06 — a FK dura da ocupação exige processos REAIS. Perfil (1x) + processo (identidade a confirmar → satisfaz
// o CHECK identity com vehicle_unidentified + reason). Inserção crua (o custody_events não é necessário para a FK).
async function createProfile(client: BootstrapClient, tenantId: string, suffix: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const name = `Perfil ${suffix}`;
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenantId}::uuid, ${name}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
}

async function createProcess(client: BootstrapClient, tenantId: string, profileId: string): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason)
      VALUES (${tenantId}::uuid, ${profileId}::uuid, 'Autoridade', true, 'Aguardando vistoria de recepção')
      RETURNING id
    `;
    return rows[0].id;
  });
}

// Teardown FK-safe: yard_spots (FK dura → impound_processes RESTRICT) → yard_areas → yards ANTES do processo;
// impound_processes → jurisdiction_profiles ANTES do tenant. Sem custody_events (inserção crua) = sem trigger.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  try {
    await withTenantRls(client, tenantId, async (tx) => {
      await tx.yardSpot.deleteMany({ where: { tenant_id: tenantId } });
      await tx.yardArea.deleteMany({ where: { tenant_id: tenantId } });
      await tx.yard.deleteMany({ where: { tenant_id: tenantId } });
      await tx.impoundProcess.deleteMany({ where: { tenant_id: tenantId } });
      await tx.jurisdictionProfile.deleteMany({ where: { tenant_id: tenantId } });
    });
    await client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    await client.$disconnect();
  }
}
