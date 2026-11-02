import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;
let fixtureNumber = 0;

if (!connectionString) {
  test("B-SAN3-03 derived basis requires DATABASE_URL", { skip: "PostgreSQL descartável obrigatório." });
} else {
  test("T-STO-db-1 · soma real das quatro tabelas por organização", async () => withFixture(async (ctx) => {
    await seedAllStorageModels(ctx, [1_000, 2_000, 3_000, 4_000]);
    await ctx.client.attachment.create({ data: genericAttachment(ctx.tenantB, 500, ctx.periodStart) });
    const rows = await ctx.repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA, ctx.tenantB]);
    assert.deepEqual(storage(rows), { [ctx.tenantA]: 10_000, [ctx.tenantB]: 500 });
  }));

  test("T-STO-db-2 · size_bytes nulo não fabrica base zero", async () => withFixture(async (ctx) => {
    await ctx.client.attachment.create({ data: genericAttachment(ctx.tenantA, null, ctx.periodStart) });
    const rows = await ctx.repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA]);
    assert.deepEqual(storage(rows), {});
  }));

  test("T-STO-db-3 · anexos soft-deleted não entram no estoque", async () => withFixture(async (ctx) => {
    await ctx.client.checklistAttachment.create({ data: checklistAttachment(ctx, 100) });
    await ctx.client.workOrderAttachment.create({
      data: { ...workOrderAttachment(ctx, 2_000), deleted_at: ctx.periodStart },
    });
    await ctx.client.attachment.create({
      data: { ...genericAttachment(ctx.tenantA, 3_000, ctx.periodStart), deleted_at: ctx.periodStart },
    });
    const rows = await ctx.repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA]);
    assert.deepEqual(storage(rows), { [ctx.tenantA]: 100 });
  }));

  test("T-STO-db-4 · soma acima de 2^31 bytes permanece exata", async () => withFixture(async (ctx) => {
    await ctx.client.attachment.createMany({ data: [
      genericAttachment(ctx.tenantA, 2_000_000_000, ctx.periodStart),
      genericAttachment(ctx.tenantA, 2_000_000_000, ctx.periodStart),
    ] });
    const rows = await ctx.repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA]);
    assert.deepEqual(storage(rows), { [ctx.tenantA]: 4_000_000_000 });
  }));

  test("T-STO-db-5 · canário recusa groupBy de arquivo que devolve organização alheia", async () => withFixture(async (ctx) => {
    await ctx.client.attachment.create({ data: genericAttachment(ctx.tenantA, 700, ctx.periodStart) });
    const { PrismaCloudCostAllocationRepository } = await import(
      "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
    );
    const leaking = new PrismaCloudCostAllocationRepository(withLeakingGroupBy(ctx.client, "attachment", ctx.tenantB));
    await assert.rejects(
      () => leaking.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA]),
      /tenant_context_leak/,
    );
  }));

  test("T-API-db-1 · conta por organização, janela e ator sob RLS", async () => withFixture(async (ctx) => {
    await ctx.client.auditLog.createMany({ data: [
      audit(ctx.tenantA, ctx.userA, "work_order.created", ctx.periodStart),
      audit(ctx.tenantA, ctx.userA, "customer.updated", ctx.periodStart),
      audit(ctx.tenantB, ctx.userB, "work_order.created", ctx.periodStart),
      audit(ctx.tenantA, ctx.userA, "work_order.outside", new Date(ctx.periodEnd.getTime() + 86_400_000)),
      audit(ctx.tenantA, ctx.userA, "auth.login.success", ctx.periodStart),
      audit(ctx.tenantA, null, "system.sweep", ctx.periodStart),
    ] });
    const rows = await ctx.repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA, ctx.tenantB]);
    assert.deepEqual(actions(rows), { [ctx.tenantA]: 2, [ctx.tenantB]: 1 });
  }));

  test("T-API-db-2 · canário recusa groupBy que devolve organização alheia", async () => withFixture(async (ctx) => {
    await ctx.client.auditLog.create({ data: audit(ctx.tenantA, ctx.userA, "work_order.created", ctx.periodStart) });
    const { PrismaCloudCostAllocationRepository } = await import(
      "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
    );
    const leaking = new PrismaCloudCostAllocationRepository(withLeakingGroupBy(ctx.client, "auditLog", ctx.tenantB));
    await assert.rejects(
      () => leaking.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA]),
      /tenant_context_leak/,
    );
  }));

  test("T-API-db-3 · ato da plataforma no cliente pesa na plataforma sob papel sem bypass", async () =>
    withFixture(async (ctx) => {
      await ctx.client.auditLog.createMany({ data: [
        audit(ctx.tenantA, ctx.userA, "work_order.updated", ctx.periodStart),
        audit(ctx.tenantA, ctx.platformUser, "work_order.created", ctx.periodStart),
      ] });
      const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
      const role = await createEphemeralRole(ctx.client, connectionString);
      try {
        const attributes = await ctx.client.$queryRawUnsafe<Array<{ rolbypassrls: boolean; rolsuper: boolean }>>(
          "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = $1",
          role.roleName,
        );
        assert.equal(attributes[0]?.rolbypassrls, false);
        assert.equal(attributes[0]?.rolsuper, false);
        const { PrismaCloudCostAllocationRepository } = await import(
          "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
        );
        const repository = new PrismaCloudCostAllocationRepository(role.client);
        const rows = await repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA, ctx.platformTenant]);
        assert.deepEqual(actions(rows), { [ctx.tenantA]: 1, [ctx.platformTenant]: 1 });
      } finally {
        await role.drop();
      }
    }));

  test("T-API-db-3b · ato próprio da plataforma soma ao ato dela no cliente, em qualquer ordem", async () =>
    withFixture(async (ctx) => {
      await ctx.client.auditLog.createMany({ data: [
        audit(ctx.tenantA, ctx.platformUser, "work_order.created", ctx.periodStart),
        audit(ctx.platformTenant, ctx.platformUser, "tenant.updated", ctx.periodStart),
        audit(ctx.platformTenant, ctx.platformUser, "tenant.created", ctx.periodStart),
      ] });
      const after = await ctx.repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.tenantA, ctx.platformTenant]);
      const before = await ctx.repository.sumUsageBasis(ctx.periodStart, ctx.periodEnd, [ctx.platformTenant, ctx.tenantA]);
      assert.deepEqual(actions(after), { [ctx.platformTenant]: 3 });
      assert.deepEqual(actions(before), { [ctx.platformTenant]: 3 });
    }));
}

type Context = Awaited<ReturnType<typeof bootstrap>>;

async function withFixture(work: (ctx: Context) => Promise<void>): Promise<void> {
  const ctx = await bootstrap();
  try {
    await work(ctx);
  } finally {
    await cleanup(ctx);
  }
}

async function bootstrap() {
  const [{ PrismaPg }, { PrismaClient }, { PrismaCloudCostAllocationRepository }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"),
  ]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
  const suffix = `${Date.now()}-${fixtureNumber++}-${Math.random().toString(16).slice(2)}`;
  const month = (fixtureNumber % 10) + 1;
  const periodStart = new Date(Date.UTC(2031, month - 1, 1));
  const periodEnd = new Date(Date.UTC(2031, month, 0, 23, 59, 59, 999));
  const [tenantA, tenantB] = await Promise.all([
    client.tenant.create({ data: { name: `SAN303 A ${suffix}`, slug: `san303-a-${suffix}` } }),
    client.tenant.create({ data: { name: `SAN303 B ${suffix}`, slug: `san303-b-${suffix}` } }),
  ]);
  const platform = await client.tenant.upsert({
    where: { slug: "platform" },
    create: { name: "Plataforma", slug: "platform" },
    update: {},
  });
  const [userA, userB, platformUser] = await Promise.all([
    client.user.create({ data: { tenant_id: tenantA.id, name: "SAN303 A", email: `a-${suffix}@example.test` } }),
    client.user.create({ data: { tenant_id: tenantB.id, name: "SAN303 B", email: `b-${suffix}@example.test` } }),
    client.user.create({ data: { tenant_id: platform.id, name: "SAN303 Platform", email: `p-${suffix}@example.test` } }),
  ]);
  const template = await client.checklistTemplate.create({
    data: { tenant_id: tenantA.id, name: `SAN303 ${suffix}`, type: "towing_collection", schema: {} },
  });
  const component = await client.checklistTemplateComponent.create({
    data: { tenant_id: tenantA.id, template_id: template.id, component_key: "obs", type: "observation", label: "Observação", order_index: 0, config: {}, validation_rules: {}, visibility_rules: {} },
  });
  const run = await client.checklistRun.create({
    data: { tenant_id: tenantA.id, template_id: template.id, template_version: 1, started_at: periodStart },
  });
  const workOrder = await client.workOrder.create({
    data: { tenant_id: tenantA.id, code: `SAN303-${suffix}`, title: "SAN303" },
  });
  const vehicle = await client.vehicle.create({
    data: { tenant_id: tenantA.id, plate: `S${suffix.replace(/\D/g, "").slice(-6).padStart(6, "0")}`, model: "SAN303" },
  });
  const damage = await client.damage.create({
    data: { tenant_id: tenantA.id, vehicle_id: vehicle.id, data: periodStart, gravidade: "baixa", descricao: "SAN303" },
  });
  return {
    client,
    repository: new PrismaCloudCostAllocationRepository(client),
    tenantA: tenantA.id,
    tenantB: tenantB.id,
    platformTenant: platform.id,
    userA: userA.id,
    userB: userB.id,
    platformUser: platformUser.id,
    template: template.id,
    component: component.id,
    run: run.id,
    workOrder: workOrder.id,
    vehicle: vehicle.id,
    damage: damage.id,
    periodStart,
    periodEnd,
  };
}

async function seedAllStorageModels(ctx: Context, sizes: readonly [number, number, number, number]) {
  await Promise.all([
    ctx.client.checklistAttachment.create({ data: checklistAttachment(ctx, sizes[0]) }),
    ctx.client.workOrderAttachment.create({ data: workOrderAttachment(ctx, sizes[1]) }),
    ctx.client.attachment.create({ data: genericAttachment(ctx.tenantA, sizes[2], ctx.periodStart) }),
    ctx.client.damageAttachment.create({ data: damageAttachment(ctx, sizes[3]) }),
  ]);
}

function checklistAttachment(ctx: Context, sizeBytes: number | null) {
  return { tenant_id: ctx.tenantA, run_id: ctx.run, component_id: ctx.component, file_url: "memory://checklist", size_bytes: sizeBytes, metadata: {}, created_at: ctx.periodStart };
}

function workOrderAttachment(ctx: Context, sizeBytes: number | null) {
  return { tenant_id: ctx.tenantA, work_order_id: ctx.workOrder, file_url: "memory://work-order", size_bytes: sizeBytes, metadata: {}, created_at: ctx.periodStart };
}

function genericAttachment(tenantId: string, sizeBytes: number | null, createdAt: Date) {
  return { tenant_id: tenantId, entity_type: "work_order", entity_id: crypto.randomUUID(), file_url: "memory://generic", size_bytes: sizeBytes, metadata: {}, created_at: createdAt, uploaded_at: createdAt };
}

function damageAttachment(ctx: Context, sizeBytes: number | null) {
  return { tenant_id: ctx.tenantA, damage_id: ctx.damage, file_url: "memory://damage", size_bytes: sizeBytes, metadata: {}, created_at: ctx.periodStart };
}

function audit(tenantId: string, actorUserId: string | null, action: string, createdAt: Date) {
  return { tenant_id: tenantId, actor_user_id: actorUserId, action, entity: "san303", metadata: {}, created_at: createdAt };
}

function storage(rows: readonly { tenantId: string; metricKey: string; quantity: number }[]) {
  return quantities(rows, "storage_bytes_current");
}

function actions(rows: readonly { tenantId: string; metricKey: string; quantity: number }[]) {
  return quantities(rows, "audited_actions_count");
}

function quantities(rows: readonly { tenantId: string; metricKey: string; quantity: number }[], key: string) {
  return Object.fromEntries(rows.filter((row) => row.metricKey === key).map((row) => [row.tenantId, row.quantity]));
}

function withLeakingGroupBy<T extends object>(client: T, model: string, alienTenantId: string): T {
  const wrap = (target: object): object => new Proxy(target, {
    get(inner, property, receiver) {
      if (property === "$transaction") {
        const original = Reflect.get(inner, property, receiver) as (fn: (tx: unknown) => Promise<unknown>, options?: unknown) => Promise<unknown>;
        return (fn: (tx: unknown) => Promise<unknown>, options?: unknown) =>
          original.call(inner, (tx: unknown) => fn(wrap(tx as object)), options);
      }
      const value = Reflect.get(inner, property, receiver);
      if (property !== model) return typeof value === "function" ? value.bind(inner) : value;
      return new Proxy(value as object, {
        get(delegate, method, delegateReceiver) {
          if (method !== "groupBy") {
            const original = Reflect.get(delegate, method, delegateReceiver);
            return typeof original === "function" ? original.bind(delegate) : original;
          }
          const original = Reflect.get(delegate, method, delegateReceiver) as (args: unknown) => Promise<Array<Record<string, unknown>>>;
          return async (args: unknown) => (await original.call(delegate, args)).map((row) => ({ ...row, tenant_id: alienTenantId }));
        },
      });
    },
  });
  return wrap(client) as T;
}

async function cleanup(ctx: Context): Promise<void> {
  try {
    await ctx.client.auditLog.deleteMany({ where: { tenant_id: { in: [ctx.tenantA, ctx.tenantB] } } });
    await ctx.client.auditLog.deleteMany({ where: { actor_user_id: ctx.platformUser } });
    await ctx.client.checklistAttachment.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.workOrderAttachment.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.attachment.deleteMany({ where: { tenant_id: { in: [ctx.tenantA, ctx.tenantB] } } });
    await ctx.client.damageAttachment.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.damage.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.vehicle.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.workOrder.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.checklistRun.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.checklistTemplateComponent.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.checklistTemplate.deleteMany({ where: { tenant_id: ctx.tenantA } });
    await ctx.client.user.deleteMany({ where: { id: { in: [ctx.userA, ctx.userB, ctx.platformUser] } } });
    await ctx.client.tenant.deleteMany({ where: { id: { in: [ctx.tenantA, ctx.tenantB] } } });
  } finally {
    await ctx.client.$disconnect();
  }
}
