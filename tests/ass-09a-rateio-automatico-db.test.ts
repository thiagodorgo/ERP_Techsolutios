import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

// -----------------------------------------------------------------------------------------------
// B-ASS-09a — rateio automático a partir da importação, contra o Postgres REAL.
//
// O código sob teste roda num papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`, o arnês único da casa,
// dentro do lock de catálogo). A URL admin (superusuário) só semeia e limpa. A janela é PRÓPRIA (ano 2033, livre em
// `tests/**`), fora da reservada de `o6r06-cost-summary-sum-db`.
//
// A fábrica de produção (`createPrismaCloudCostService`) usa o cliente global de `src/database/prisma.ts`. Ele honra
// `globalThis.prisma` fora de produção; esta suíte põe ali o cliente do papel ANTES do primeiro import da aplicação, e
// assim o caminho real da importação até a run roda sob o papel sem bypass.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

type Ctx = Awaited<ReturnType<typeof bootstrap>>;

if (!connectionString) {
  test("B-ASS-09a · rateio automático -db exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL para o PostgreSQL descartável do bloco.",
  });
} else {
  let ctx: Ctx | undefined;

  before(async () => {
    ctx = await bootstrap(connectionString);
  });

  after(async () => {
    await ctx?.close();
  });

  test("T-M09a-db · a coluna import_id existe com FK SET NULL, createRun a grava, e apagar a importação a anula", async () => {
    // MUTAÇÃO QUE MATA: M6 (`import_id: input.importId ?? null,` → apagada).
    const c = ctx!;
    const columns = (await c.admin.$queryRawUnsafe(
      `SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'cloud_cost_allocation_runs' AND column_name = 'import_id'`,
    )) as Array<{ data_type: string }>;
    assert.deepEqual(columns, [{ data_type: "uuid" }]);
    const fk = (await c.admin.$queryRawUnsafe(
      `SELECT confdeltype::text AS confdeltype, (SELECT relname::text FROM pg_class WHERE oid = confrelid) AS target
         FROM pg_constraint WHERE conname = 'cloud_cost_allocation_runs_import_id_fkey'`,
    )) as Array<{ confdeltype: string; target: string }>;
    assert.deepEqual(fk, [{ confdeltype: "n", target: "cloud_cost_imports" }], "FK para cloud_cost_imports com ON DELETE SET NULL");

    const importId = await seedImport(c, { status: "completed", marker: false });
    try {
      const run = await c.allocationRepository.createRun({
        periodStart: new Date("2033-01-01T00:00:00.000Z"),
        periodEnd: new Date("2033-01-31T23:59:59.999Z"),
        importId,
        metadata: { importId, importResolution: "explicit" },
      });
      assert.equal(await runImportColumn(c, run.id), importId, "createRun grava a coluna import_id");

      await c.admin.cloudCostImport.delete({ where: { id: importId } });
      assert.equal(await runImportColumn(c, run.id), null, "apagar a importação deixa import_id NULL (a run fica)");
    } finally {
      await cleanup(c, [importId]);
    }
  });
}

// -----------------------------------------------------------------------------------------------
// Arnês
// -----------------------------------------------------------------------------------------------

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
  const role = await createEphemeralRole(admin, connection);
  const attributes = (await admin.$queryRawUnsafe(
    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
    role.roleName,
  )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
  assert.deepEqual(attributes, [{ rolsuper: false, rolbypassrls: false }], "o código sob teste roda SEM superusuário e SEM bypass de RLS");

  // O cliente global da aplicação (`src/database/prisma.ts`) passa a ser o do papel, antes de qualquer import dela.
  (globalThis as { prisma?: unknown }).prisma = role.client;

  const [{ PrismaCloudCostAllocationRepository }, { CloudCostAllocationService }] = await Promise.all([
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"),
  ]);
  const allocationRepository = new PrismaCloudCostAllocationRepository(role.client);
  const allocation = new CloudCostAllocationService(allocationRepository);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    admin,
    role,
    allocationRepository,
    allocation,
    suffix,
    async close(): Promise<void> {
      try {
        await role.drop();
      } finally {
        await admin.$disconnect();
      }
    },
  };
}

async function seedImport(c: Ctx, input: { status: string; marker: boolean }): Promise<string> {
  const id = randomUUID();
  await c.admin.cloudCostImport.create({
    data: {
      id,
      provider: "aws",
      source_type: "manual_csv",
      status: input.status,
      row_count: 0,
      total_unblended_cost: "0",
      currency: "USD",
      metadata: input.marker ? { block: "B-ASS-09a", autoAllocation: "v1" } : { block: "B-ASS-09a" },
    },
  });
  return id;
}

async function runImportColumn(c: Ctx, runId: string): Promise<string | null> {
  const rows = (await c.admin.$queryRawUnsafe(
    `SELECT import_id::text AS "importId" FROM cloud_cost_allocation_runs WHERE id = $1::uuid`,
    runId,
  )) as Array<{ importId: string | null }>;
  assert.equal(rows.length, 1);
  return rows[0]!.importId;
}

/** Limpeza escopada: as runs (e alocações) das importações do teste, depois as importações (as linhas caem em cascata). */
async function cleanup(c: Ctx, importIds: readonly string[], extraRunIds: readonly string[] = []): Promise<void> {
  const runs = await c.admin.cloudCostAllocationRun.findMany({
    where: {
      OR: [
        { import_id: { in: [...importIds] } },
        { id: { in: [...extraRunIds] } },
        ...importIds.map((importId) => ({ metadata: { path: ["importId"], equals: importId } })),
      ],
    },
    select: { id: true },
  });
  const runIds = runs.map((run) => run.id);
  await c.admin.tenantCloudCostAllocation.deleteMany({ where: { allocation_run_id: { in: runIds } } });
  await c.admin.cloudCostAllocationRun.deleteMany({ where: { id: { in: runIds } } });
  await c.admin.cloudCostImport.deleteMany({ where: { id: { in: [...importIds] } } });
}
