import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-SAN3-03 attachment capture requires DATABASE_URL", { skip: "Use the disposable cluster." });
} else {
  test("T-UP-db-1 · anexo e três unidades persistem juntos", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const attachment = await createAttachment(ctx.repo, seed);
      assert.ok(attachment);
      assert.equal(await countAttachments(ctx, seed.tenantId), 1);
      assert.equal(await countUsage(ctx, seed.tenantId, attachment!.id), 3);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("T-UP-db-2 · falha na medição reverte o anexo", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    const { RlsPrismaChecklistRepository } = await import(
      "../src/modules/checklists/checklist-prisma.repository.js"
    );
    try {
      const broken = new RlsPrismaChecklistRepository(withFailingUsageInsert(ctx.client));
      await assert.rejects(() => createAttachment(broken, seed), /falha injetada na medicao/);
      assert.equal(await countAttachments(ctx, seed.tenantId), 0);
      assert.equal(await countUsage(ctx, seed.tenantId), 2, "ficam apenas as duas unidades da criação da run");
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("T-UP-db-3 · unidades de um tenant não aparecem no outro", async () => {
    const ctx = await bootstrap(connectionString);
    const a = await seedScenario(ctx);
    const b = await seedScenario(ctx);
    try {
      const attachment = await createAttachment(ctx.repo, a);
      assert.ok(attachment);
      assert.equal(await countUsage(ctx, a.tenantId, attachment!.id), 3);
      assert.equal(await countUsage(ctx, b.tenantId, attachment!.id), 0);
    } finally {
      await teardownTenant(ctx, a.tenantId);
      await teardown(ctx, b.tenantId);
    }
  });
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { RlsPrismaChecklistRepository }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/checklists/checklist-prisma.repository.js"),
  ]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  return { client, repo: new RlsPrismaChecklistRepository(client) };
}

type Context = Awaited<ReturnType<typeof bootstrap>>;
type Seed = { tenantId: string; userId: string; runId: string; componentId: string };

async function seedScenario(ctx: Context): Promise<Seed> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await ctx.client.tenant.create({ data: { name: `SAN303 ${suffix}`, slug: `san303-${suffix}` } });
  const user = await withTenantRls(ctx.client, tenant.id, (tx) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "SAN303", email: `${suffix}@example.com` } }),
  );
  const template = await ctx.repo.createTemplate({
    tenantId: tenant.id,
    actorUserId: user.id,
    name: `SAN303 ${suffix}`,
    type: "towing_collection",
    schema: {},
    components: [{ componentKey: "photo", type: "observation", label: "Foto", required: false, config: {}, validationRules: {}, visibilityRules: {} }],
  });
  const published = await ctx.repo.publishTemplate(tenant.id, template.id, user.id);
  assert.ok(published?.components[0]);
  const { run } = await ctx.repo.createRun(
    { tenantId: tenant.id, actorUserId: user.id, checklistId: template.id, answers: [] },
    published!,
  );
  return { tenantId: tenant.id, userId: user.id, runId: run.id, componentId: published!.components[0]!.id };
}

function createAttachment(repo: Context["repo"], seed: Seed) {
  return repo.createAttachment(seed.tenantId, seed.runId, seed.userId, {
    componentId: seed.componentId,
    fileUrl: "opaque://san303",
    fileName: "evidence.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    metadata: {},
  });
}

async function countAttachments(ctx: Context, tenantId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(ctx.client, tenantId, (tx) => tx.checklistAttachment.count({ where: { tenant_id: tenantId } }));
}

async function countUsage(ctx: Context, tenantId: string, sourceId?: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(ctx.client, tenantId, (tx) =>
    tx.cloudUsageEvent.count({ where: { tenant_id: tenantId, ...(sourceId ? { source_id: sourceId } : {}) } }),
  );
}

function withFailingUsageInsert<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "$transaction") {
        const original = Reflect.get(target, property, receiver) as (work: (tx: T) => Promise<unknown>, options?: unknown) => Promise<unknown>;
        return (work: (tx: T) => Promise<unknown>, options?: unknown) => original.call(target, (tx: T) => work(withFailingUsageInsert(tx)), options);
      }
      if (property === "$executeRaw") {
        return (strings: TemplateStringsArray, ...values: unknown[]) => {
          if (strings.join(" ").includes("cloud_usage_events")) return Promise.reject(new Error("falha injetada na medicao"));
          const original = Reflect.get(target, property, receiver) as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
          return original.call(target, strings, ...values);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;
}

async function teardownTenant(ctx: Context, tenantId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  await withTenantRls(ctx.client, tenantId, async (tx) => {
    await tx.checklistAttachment.deleteMany({ where: { tenant_id: tenantId } });
    await tx.checklistRunAnswer.deleteMany({ where: { tenant_id: tenantId } });
    await tx.checklistRun.deleteMany({ where: { tenant_id: tenantId } });
    await tx.cloudUsageEvent.deleteMany({ where: { tenant_id: tenantId } });
    await tx.checklistTemplateComponent.deleteMany({ where: { tenant_id: tenantId } });
    await tx.checklistTemplate.deleteMany({ where: { tenant_id: tenantId } });
    await tx.auditLog.deleteMany({ where: { tenant_id: tenantId } });
    await tx.user.deleteMany({ where: { tenant_id: tenantId } });
  });
  await ctx.client.tenant.deleteMany({ where: { id: tenantId } });
}

async function teardown(ctx: Context, tenantId: string) {
  try { await teardownTenant(ctx, tenantId); } finally { await ctx.client.$disconnect(); }
}
