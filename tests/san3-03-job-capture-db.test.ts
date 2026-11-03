import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-03 job capture requires DATABASE_URL", { skip: "Use the disposable cluster." });
} else {
  test("T-JOB-db-1 · job e replay persistem exatamente duas unidades", async () => {
    const ctx = await bootstrap(connectionString);
    const tenantId = await seedTenant(ctx.client);
    const job = source(tenantId);
    try {
      await ctx.capture(ctx.client, job);
      await ctx.capture(ctx.client, job);
      assert.equal(await countUsage(ctx.client, tenantId, job.id), 2);
    } finally {
      await teardown(ctx.client, tenantId);
    }
  });

  test("T-JOB-db-2 · falha na captura mantém o job fora de completed", async () => {
    const { JobQueue } = await import("../src/infra/jobs/job.queue.js");
    const { JobRegistry } = await import("../src/infra/jobs/job.registry.js");
    const { JobWorker } = await import("../src/infra/jobs/job.worker.js");
    const { getRedisClient } = await import("../src/infra/redis/redis.client.js");
    const job = source(randomUUID());
    const statuses: string[] = [];
    class Queue extends JobQueue {
      private next = true;
      constructor() { super({ redis: getRedisClient() }); }
      override async dequeue() { if (!this.next) return null; this.next = false; return job; }
      override async complete(current: typeof job) { statuses.push("completed"); return { ...current, status: "completed" as const }; }
      override async fail(current: typeof job) { statuses.push("retrying"); return { ...current, status: "retrying" as const, attempts: 1 }; }
    }
    const registry = new JobRegistry();
    registry.register(job.name, async () => {});
    const worker = new JobWorker({
      queue: new Queue(),
      registry,
      captureJobExecution: async () => { throw new Error("falha injetada na medicao"); },
      logger: { info() {}, warn() {}, error() {} },
    });

    await worker.processNextJob();
    assert.deepEqual(statuses, ["retrying"]);
  });
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { captureJobExecutionWithClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/cloud-usage/cloud-usage.capture.js"),
  ]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client, capture: captureJobExecutionWithClient };
}

async function seedTenant(client: Awaited<ReturnType<typeof bootstrap>>["client"]) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await client.tenant.create({ data: { name: `SAN303 JOB ${suffix}`, slug: `san303-job-${suffix}` } });
  return tenant.id;
}

async function countUsage(client: Awaited<ReturnType<typeof bootstrap>>["client"], tenantId: string, sourceId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) => tx.cloudUsageEvent.count({ where: { tenant_id: tenantId, source_id: sourceId } }));
}

async function teardown(client: Awaited<ReturnType<typeof bootstrap>>["client"], tenantId: string) {
  try {
    const { withTenantRls } = await import("../src/database/rls.js");
    await withTenantRls(client, tenantId, (tx) => tx.cloudUsageEvent.deleteMany({ where: { tenant_id: tenantId } }));
    await client.tenant.delete({ where: { id: tenantId } });
  } finally {
    await client.$disconnect();
  }
}

function source(tenantId: string) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: "notification-dispatch" as const,
    payload: {},
    status: "processing" as const,
    attempts: 0,
    maxAttempts: 3,
    backoffMs: 1000,
    tenantId,
    correlationId: randomUUID(),
    runAfter: now,
    createdAt: now,
    updatedAt: now,
  };
}
