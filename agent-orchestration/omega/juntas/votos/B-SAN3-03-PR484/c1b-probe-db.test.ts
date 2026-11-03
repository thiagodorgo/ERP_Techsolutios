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
  test("c1b probe requires DATABASE_URL", { skip: "sem banco" });
} else {
  for (const [label, ch] of [["U+00AD", "\u00ad"], ["U+200B", "\u200b"], ["U+2060", "\u2060"], ["U+FEFF-meio", "\ufeff"]] as const) {
    test(`C1B-DB ${label} · nome com invisível no meio × nome limpo, tag limpa`, async () => {
      const ctx = await bootstrap();
      const importId = crypto.randomUUID();
      const runIds: string[] = [];
      const u = crypto.randomUUID().slice(0, 8);
      const { parseCreatePlatformTenantDto } = await import("../src/modules/platform/platform-tenants.validator.js");
      const nameA = parseCreatePlatformTenantDto({ name: `Dupli${ch}cada ${u}`, slug: `c1b-a-${u}`, plan: "starter" } as any).name;
      const ids: string[] = [];
      try {
        const a = await ctx.client.tenant.create({ data: { name: nameA, slug: `c1b-a-${u}` } });
        const b = await ctx.client.tenant.create({ data: { name: `Duplicada ${u}`, slug: `c1b-b-${u}` } });
        ids.push(a.id, b.id);
        await seedImport(ctx, importId, [
          { service: "AmazonEC2", usage: "BoxUsage", tag: `Duplicada ${u}`, cost: "10.000000" },
          { service: "AmazonEC2", usage: "BoxUsage", tag: `nao-existe-${u}`, cost: "7.000000" },
          { service: "AmazonKMS", usage: "Keys", tag: "PLATFORM", cost: "5.000000" },
        ]);
        const run = await ctx.service.allocateCostsForPeriod({ periodStart, periodEnd, importId });
        runIds.push(run.id);
        const allocations = await ctx.service.listTenantAllocations(run.id);
        const persisted = await ctx.client.tenantCloudCostAllocation.findMany({ where: { allocation_run_id: run.id } });
        console.log("C1B-DB " + JSON.stringify({ label, nameAstored: JSON.stringify(nameA), status: run.status,
          totalAllocated: run.totalAllocatedCost, totalUnallocated: run.totalUnallocatedCost, platformCost: run.totalPlatformCost,
          allocations: allocations.map((x) => [x.tenantId === a.id ? "A(invisivel)" : x.tenantId === b.id ? "B(limpo)" : x.tenantId === ctx.platform.id ? "PLATAFORMA" : x.tenantId, x.allocatedCost]),
          persistedRows: persisted.map((x: any) => [x.tenant_id === b.id ? "B(limpo)" : x.tenant_id === a.id ? "A(invisivel)" : x.tenant_id, String(x.allocated_cost)]),
          unallocated: (run.metadata.unallocated as any[]).map((x) => [x.reason, x.unallocatedCost]) }));
      } finally {
        await cleanup(ctx, [importId], runIds, ids);
      }
    });
  }
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
