import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

// B-SAN3-03 · R8-b (emenda 1, §2.4, S6) — o resumo lê `reason` e `platformCost` do Postgres de verdade, e a
// run antiga com alocação da plataforma continua aparecendo em `tenants[]`, com nome, sob papel sem bypass.
// Janela própria (2029-05), fora da reservada `2028-02`.

const connectionString = process.env.DATABASE_URL;
const periodStart = new Date("2029-05-01T00:00:00.000Z");
const periodEnd = new Date("2029-05-31T23:59:59.999Z");

if (!connectionString) {
  test("B-SAN3-03 system org requires DATABASE_URL", { skip: "PostgreSQL descartável obrigatório." });
} else {
  test("T-SYS-db-1 · run real: o resumo lê motivo e custo da plataforma do Postgres", async () => {
    const ctx = await bootstrap();
    const importId = crypto.randomUUID();
    const runIds: string[] = [];
    try {
      await seedImport(ctx, importId, [
        { service: "AmazonKMS", usage: "Keys", tag: "platform", cost: "10.000000" },
        { service: "AmazonCognito", usage: "Metrics", tag: null, cost: "5.000000" },
      ]);
      const run = await ctx.service.allocateCostsForPeriod({ periodStart, periodEnd, importId });
      runIds.push(run.id);
      assert.equal(run.status, "completed", run.errorMessage);
      const summary = await ctx.service.getAllocationSummary({ periodStart, periodEnd });
      assert.equal(summary.runId, run.id);
      assert.equal(summary.coverage, "imported");
      assert.equal(summary.importId, importId);
      assert.equal(summary.totalPlatformCost, 10);
      assert.equal(summary.totalUnallocatedCost, 5);
      assert.deepEqual(summary.unallocatedByReason, [{ reason: "no_allocation_rule", unallocatedCost: 5 }]);
      assert.deepEqual(summary.platformCostByService, [{ serviceCode: "AmazonKMS", platformCost: 10 }]);
      assert.equal(summary.totalAllocatedCost, 0);
    } finally {
      await cleanup(ctx, [importId], runIds);
    }
  });

  test("T-SYS-db-2 · run antiga com alocação da plataforma aparece em tenants[] com nome, sob papel sem bypass", async () => {
    const ctx = await bootstrap();
    const runIds: string[] = [];
    const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
    const role = await createEphemeralRole(ctx.client, connectionString);
    try {
      const legacy = await ctx.repository.createRun({ periodStart, periodEnd, metadata: {} });
      runIds.push(legacy.id);
      await ctx.repository.replaceTenantAllocations(legacy.id, [
        {
          allocationRunId: legacy.id,
          tenantId: ctx.platform.id,
          provider: "aws",
          periodStart,
          periodEnd,
          serviceCode: "AmazonEC2",
          usageType: "BoxUsage",
          costCategory: "legacy",
          allocationMethod: "direct_tenant_tag",
          allocationBasisQuantity: 1,
          allocationRatio: 1,
          allocatedCost: 8,
          currency: "USD",
          sourceCostLineItemIds: [],
          metadata: { source: "legacy" },
        },
      ]);
      await ctx.repository.updateRun(legacy.id, {
        status: "completed",
        totalImportedCost: 8,
        totalAllocatedCost: 8,
        totalUnallocatedCost: 0,
        currency: "USD",
        completedAt: periodEnd,
        metadata: {},
      });
      const attributes = await ctx.client.$queryRawUnsafe<Array<{ rolbypassrls: boolean; rolsuper: boolean }>>(
        "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = $1",
        role.roleName,
      );
      assert.equal(attributes[0]?.rolbypassrls, false);
      assert.equal(attributes[0]?.rolsuper, false);
      const { PrismaCloudCostAllocationRepository } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
      );
      const { CloudCostAllocationService } = await import("../src/modules/cloud-cost-allocation/index.js");
      const service = new CloudCostAllocationService(new PrismaCloudCostAllocationRepository(role.client));
      const summary = await service.getAllocationSummary({ periodStart, periodEnd });
      assert.equal(summary.runId, legacy.id);
      assert.equal(summary.coverage, "legacy_unscoped");
      assert.deepEqual(
        summary.tenants.map((tenant) => [tenant.tenantId, tenant.tenantName, tenant.allocatedCost]),
        [[ctx.platform.id, ctx.platform.name, 8]],
      );
    } finally {
      await role.drop();
      await cleanup(ctx, [], runIds);
    }
  });

  test("T-TAG-db · nomes duplicados não geram alocação e persistem motivo ambíguo", async () => {
    const ctx = await bootstrap();
    const importId = crypto.randomUUID();
    const runIds: string[] = [];
    const duplicateName = `Duplicada ${crypto.randomUUID()}`;
    const duplicateIds: string[] = [];
    try {
      const created = await ctx.client.$transaction([
        ctx.client.tenant.create({ data: { name: duplicateName, slug: `dup-a-${crypto.randomUUID()}` } }),
        ctx.client.tenant.create({ data: { name: duplicateName, slug: `dup-b-${crypto.randomUUID()}` } }),
      ]);
      duplicateIds.push(...created.map((tenant) => tenant.id));
      await seedImport(ctx, importId, [
        { service: "AmazonEC2", usage: "BoxUsage", tag: duplicateName, cost: "10.000000" },
      ]);
      const run = await ctx.service.allocateCostsForPeriod({ periodStart, periodEnd, importId });
      runIds.push(run.id);
      assert.equal(run.status, "completed", run.errorMessage);
      const allocations = await ctx.service.listTenantAllocations(run.id);
      assert.equal(allocations.some((item) => duplicateIds.includes(item.tenantId)), false);
      assert.equal(run.totalAllocatedCost, 0);
      assert.equal(run.totalUnallocatedCost, 10);
      assert.deepEqual(
        (run.metadata.unallocated as Array<{ reason: string; unallocatedCost: number }>).map((item) => [
          item.reason,
          item.unallocatedCost,
        ]),
        [["ambiguous_tenant_tag", 10]],
      );
    } finally {
      await cleanup(ctx, [importId], runIds, duplicateIds);
    }
  });

  test("T-TAG-db-2 · invisíveis no nome não geram alocação no Postgres", async (context) => {
    for (const [label, character] of [
      ["U+00AD", "\u00ad"],
      ["U+200B", "\u200b"],
      ["U+2060", "\u2060"],
      ["U+FEFF", "\ufeff"],
    ] as const) {
      await context.test(label, async () => {
        const ctx = await bootstrap();
        const importId = crypto.randomUUID();
        const runIds: string[] = [];
        const suffix = crypto.randomUUID();
        const duplicateIds: string[] = [];
        try {
          const created = await ctx.client.$transaction([
            ctx.client.tenant.create({
              data: { name: `Dupli${character}cada ${suffix}`, slug: `invisible-a-${suffix}` },
            }),
            ctx.client.tenant.create({
              data: { name: `Duplicada ${suffix}`, slug: `invisible-b-${suffix}` },
            }),
          ]);
          duplicateIds.push(...created.map((tenant) => tenant.id));
          await seedImport(ctx, importId, [
            { service: "AmazonEC2", usage: "BoxUsage", tag: `Duplicada ${suffix}`, cost: "10.000000" },
          ]);
          const run = await ctx.service.allocateCostsForPeriod({ periodStart, periodEnd, importId });
          runIds.push(run.id);
          assert.equal(run.status, "completed", run.errorMessage);
          const allocations = await ctx.service.listTenantAllocations(run.id);
          assert.equal(allocations.some((item) => duplicateIds.includes(item.tenantId)), false);
          assert.equal(run.totalAllocatedCost, 0);
          assert.equal(run.totalUnallocatedCost, 10);
          assert.deepEqual(
            (run.metadata.unallocated as Array<{ reason: string; unallocatedCost: number }>).map((item) => [
              item.reason,
              item.unallocatedCost,
            ]),
            [["ambiguous_tenant_tag", 10]],
          );
        } finally {
          await cleanup(ctx, [importId], runIds, duplicateIds);
        }
      });
    }
  });
}

async function bootstrap() {
  const [{ PrismaPg }, { PrismaClient }, { PrismaCloudCostAllocationRepository }, { CloudCostAllocationService }] =
    await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"),
      import("../src/modules/cloud-cost-allocation/index.js"),
    ]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
  const platform = await client.tenant.upsert({
    where: { slug: "platform" },
    create: { name: "Plataforma", slug: "platform" },
    update: {},
    select: { id: true, name: true },
  });
  const repository = new PrismaCloudCostAllocationRepository(client);
  return { client, platform, repository, service: new CloudCostAllocationService(repository) };
}

type Context = Awaited<ReturnType<typeof bootstrap>>;

async function seedImport(
  ctx: Context,
  importId: string,
  lines: readonly { service: string; usage: string; tag: string | null; cost: string }[],
) {
  await ctx.client.cloudCostImport.create({
    data: {
      id: importId,
      provider: "aws",
      source_type: "manual_csv",
      status: "completed",
      period_start: periodStart,
      period_end: periodEnd,
      imported_at: periodEnd,
      row_count: lines.length,
      total_unblended_cost: "15.000000",
      currency: "USD",
      metadata: { block: "B-SAN3-03" },
    },
  });
  for (const [index, line] of lines.entries()) {
    await ctx.client.cloudCostLineItem.create({
      data: {
        import_id: importId,
        provider: "aws",
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        service_code: line.service,
        usage_type: line.usage,
        tenant_tag: line.tag,
        unblended_cost: line.cost,
        currency: "USD",
        raw_line_hash: `${importId}-${index}`,
        metadata: {},
      },
    });
  }
}

async function cleanup(
  ctx: Context,
  importIds: readonly string[],
  runIds: readonly string[],
  tenantIds: readonly string[] = [],
) {
  try {
    if (runIds.length > 0) {
      for (const runId of runIds) await ctx.repository.replaceTenantAllocations(runId, []);
      await ctx.client.cloudCostAllocationRun.deleteMany({ where: { id: { in: [...runIds] } } });
    }
    if (importIds.length > 0) {
      await ctx.client.cloudCostLineItem.deleteMany({ where: { import_id: { in: [...importIds] } } });
      await ctx.client.cloudCostImport.deleteMany({ where: { id: { in: [...importIds] } } });
    }
    if (tenantIds.length > 0) await ctx.client.tenant.deleteMany({ where: { id: { in: [...tenantIds] } } });
  } finally {
    await ctx.client.$disconnect();
  }
}
