import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;
const periodStart = new Date("2028-03-01T00:00:00.000Z");
const periodEnd = new Date("2028-03-31T23:59:59.999Z");

if (!connectionString) {
  test("B-SAN3-03 import scope requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL to the disposable B-SAN3-03 PostgreSQL cluster.",
  });
} else {
  test("T26-db-1 · linhas de outro import na mesma janela não entram", async () => {
    const ctx = await bootstrap(connectionString);
    const ids = await seedImports(ctx.client);
    try {
      const lines = await ctx.repository.listCostLineItems(periodStart, periodEnd, ids.newer);
      assert.deepEqual(lines.map((line) => line.importId), [ids.newer]);
      assert.deepEqual(lines.map((line) => line.unblendedCost), [7]);
    } finally {
      await cleanup(ctx.client, ids.all);
    }
  });

  test("T26-db-2 · teto é contado dentro do import escolhido", async () => {
    const ctx = await bootstrap(connectionString, 1);
    const ids = await seedImports(ctx.client);
    try {
      const lines = await ctx.repository.listCostLineItems(periodStart, periodEnd, ids.newer);
      assert.equal(lines.length, 1);
      assert.equal(lines[0]?.importId, ids.newer);
    } finally {
      await cleanup(ctx.client, ids.all);
    }
  });

  test("T26-db-3 · resolução automática escolhe o completed mais recente com linha na janela", async () => {
    const ctx = await bootstrap(connectionString);
    const ids = await seedImports(ctx.client, true);
    try {
      const resolved = await ctx.repository.findBillableImport(periodStart, periodEnd);
      assert.equal(resolved?.id, ids.newer);
      assert.equal(resolved?.status, "completed");
    } finally {
      await cleanup(ctx.client, ids.all);
    }
  });
}

async function bootstrap(connection: string, cap?: number) {
  const [{ PrismaPg }, { PrismaClient }, { PrismaCloudCostAllocationRepository }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"),
  ]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return {
    client,
    repository: new PrismaCloudCostAllocationRepository(client, cap),
  };
}

async function seedImports(
  client: Awaited<ReturnType<typeof bootstrap>>["client"],
  includeProcessing = false,
): Promise<{ older: string; newer: string; all: readonly string[] }> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const older = crypto.randomUUID();
  const newer = crypto.randomUUID();
  const processing = crypto.randomUUID();
  const records = [
    { id: older, status: "completed", importedAt: new Date("2028-03-10T00:00:00.000Z"), cost: "5.000000" },
    { id: newer, status: "completed", importedAt: new Date("2028-03-20T00:00:00.000Z"), cost: "7.000000" },
    ...(includeProcessing
      ? [{ id: processing, status: "processing", importedAt: new Date("2028-03-25T00:00:00.000Z"), cost: "11.000000" }]
      : []),
  ];

  for (const record of records) {
    await client.cloudCostImport.create({
      data: {
        id: record.id,
        provider: "aws",
        source_type: "manual_csv",
        status: record.status,
        period_start: periodStart,
        period_end: periodEnd,
        imported_at: record.importedAt,
        row_count: 1,
        total_unblended_cost: record.cost,
        currency: "USD",
        metadata: { block: "B-SAN3-03" },
      },
    });
    await client.cloudCostLineItem.create({
      data: {
        import_id: record.id,
        provider: "aws",
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        service_code: "AmazonEC2",
        usage_type: "BoxUsage",
        tenant_tag: "tenant-a",
        unblended_cost: record.cost,
        currency: "USD",
        raw_line_hash: `${suffix}-${record.id}`,
        metadata: {},
      },
    });
  }

  return { older, newer, all: records.map((record) => record.id) };
}

async function cleanup(client: Awaited<ReturnType<typeof bootstrap>>["client"], importIds: readonly string[]) {
  try {
    await client.cloudCostLineItem.deleteMany({ where: { import_id: { in: [...importIds] } } });
    await client.cloudCostImport.deleteMany({ where: { id: { in: [...importIds] } } });
  } finally {
    await client.$disconnect();
  }
}
