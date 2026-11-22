import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-GRUPO-GESTOR · marca -db exige DATABASE_URL", { skip: "Defina o PostgreSQL descartável." });
} else {
  let ctx: Awaited<ReturnType<typeof bootstrap>>;
  before(async () => { ctx = await bootstrap(connectionString); });
  after(async () => { await ctx.close(); });

  test("RLS-0 · as duas tabelas têm RLS ENABLE+FORCE; a marca tem 3 políticas e nenhuma DELETE", async () => {
    const rows = (await ctx.admin.$queryRawUnsafe(`SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
      count(p.policyname)::int AS policies,
      count(p.policyname) FILTER (WHERE p.cmd = 'DELETE')::int AS deletes
      FROM pg_class c LEFT JOIN pg_policies p ON p.tablename = c.relname
      WHERE c.relname IN ('economic_group_managers','user_deactivation_requests')
      GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity ORDER BY c.relname`)) as any[];
    assert.deepEqual(rows, [
      { relname: "economic_group_managers", relrowsecurity: true, relforcerowsecurity: true, policies: 3, deletes: 0 },
      { relname: "user_deactivation_requests", relrowsecurity: true, relforcerowsecurity: true, policies: 1, deletes: 0 },
    ]);
  });

  test("RLS-1/T-ORG-SIS · ator de pátio marca, lista e revoga somente pela organização platform", async () => {
    const input = { groupId: ctx.group, organizationId: ctx.tenantA, userId: ctx.userA, actorTenantId: ctx.tenantA, actorUserId: ctx.userA, today: "2026-11-22" };
    const manager = await ctx.repository.grant(input);
    assert.equal(manager.tenantId, ctx.platform);
    const physical = (await ctx.admin.$queryRawUnsafe(`SELECT tenant_id::text AS tenant_id FROM economic_group_managers WHERE id = $1::uuid`, manager.id)) as any[];
    assert.deepEqual(physical, [{ tenant_id: ctx.platform }]);
    assert.deepEqual(await ctx.auditTrail(manager.id), {
      organization: ["economic_group.manager_granted"],
      platform: ["economic_group.manager_granted"],
    });
    assert.equal((await ctx.repository.list(ctx.group, input.today))?.length, 1);
    await assert.rejects(ctx.repository.grant(input), (error: any) => error?.reason === "already_group_manager");
    assert.equal(await ctx.repository.revoke(ctx.group, manager.id, ctx.userA), true);
    assert.deepEqual(await ctx.auditTrail(manager.id), {
      organization: ["economic_group.manager_granted", "economic_group.manager_revoked"],
      platform: ["economic_group.manager_granted", "economic_group.manager_revoked"],
    });
  });

  test("RLS-2/RLS-3 · identidade X lê só a própria marca; pátios e ausência de contexto leem zero", async () => {
    await ctx.ensureActiveMark();
    const { setIdentityRlsContext, withTenantRls } = await import("../src/database/rls.js");
    const own = await ctx.role.client.$transaction(async (tx: any) => {
      await setIdentityRlsContext(tx, { tenantId: ctx.tenantA, userId: ctx.userA, email: "x@example.invalid", roles: ["tenant_admin"], authType: "jwt" });
      return tx.economicGroupManager.findMany({ where: { identity_id: ctx.identityX, revoked_at: null } });
    });
    assert.equal(own.length, 1);
    for (const tenantId of [ctx.tenantA, ctx.tenantB]) {
      const rows = await withTenantRls(ctx.role.client, tenantId, (tx: any) => tx.economicGroupManager.findMany());
      assert.equal(rows.length, 0);
    }
    assert.equal((await ctx.role.client.economicGroupManager.findMany()).length, 0);
  });

  test("RLS-4/RLS-5/RLS-6 · identidade e pátio não criam, movem nem apagam marca", async () => {
    const manager = await ctx.ensureActiveMark();
    const { setIdentityRlsContext, withTenantRls } = await import("../src/database/rls.js");
    await assert.rejects(ctx.role.client.$transaction(async (tx: any) => {
      await setIdentityRlsContext(tx, { tenantId: ctx.tenantA, userId: ctx.userA, email: "x@example.invalid", roles: ["tenant_admin"], authType: "jwt" });
      await tx.economicGroupManager.create({ data: { tenant_id: ctx.platform, group_id: ctx.group, identity_id: ctx.identityY } });
    }));
    for (const targetTenant of [ctx.tenantA, ctx.platform]) {
      await assert.rejects(withTenantRls(ctx.role.client, ctx.tenantA, (tx: any) => tx.economicGroupManager.create({ data: { tenant_id: targetTenant, group_id: ctx.group, identity_id: ctx.identityY } })));
    }
    const deleted = await withTenantRls(ctx.role.client, ctx.platform, (tx: any) => tx.economicGroupManager.deleteMany({ where: { id: manager.id } }));
    assert.equal(deleted.count, 0);
  });

  test("RLS-7 · o papel real é NOSUPERUSER NOBYPASSRLS e o guard encontra zero escapes", async () => {
    const attrs = (await ctx.admin.$queryRawUnsafe("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1", ctx.role.roleName)) as any[];
    assert.deepEqual(attrs, [{ rolsuper: false, rolbypassrls: false }]);
    const { RUNTIME_ROLE_GUARD_SQL } = await import("../src/database/runtime-role.js");
    assert.deepEqual(await ctx.role.client.$queryRawUnsafe(RUNTIME_ROLE_GUARD_SQL), []);
  });
}

async function bootstrap(connection: string) {
  const [{ PrismaClient }, pg, helper, managerModule] = await Promise.all([
    import("@prisma/client"), import("../src/database/pg-connection.js"), import("./helpers/auth-identity-fixture.js"), import("../src/modules/subscription-billing/economic-groups/economic-group-managers.prisma.js"),
  ]);
  const admin = new PrismaClient({ adapter: pg.createPgAdapter(connection) });
  const role = await helper.createEphemeralRole(admin, connection);
  const suffix = randomUUID().slice(0, 8);
  const existingPlatform = await admin.tenant.findUnique({ where: { slug: "platform" }, select: { id: true } });
  const platform = (await admin.tenant.upsert({
    where: { slug: "platform" },
    update: {},
    create: { name: `Platform ${suffix}`, slug: "platform" },
    select: { id: true },
  })).id;
  const tenantA = (await admin.tenant.create({ data: { name: `Pátio A ${suffix}`, slug: `fm-a-${suffix}` } })).id;
  const tenantB = (await admin.tenant.create({ data: { name: `Pátio B ${suffix}`, slug: `fm-b-${suffix}` } })).id;
  const group = (await admin.economicGroup.create({ data: { name: `Grupo FM ${suffix}` } })).id;
  const userA = (await admin.user.create({ data: { tenant_id: tenantA, name: "Gestor X A", email: `x-a-${suffix}@example.invalid` } })).id;
  const userB = (await admin.user.create({ data: { tenant_id: tenantB, name: "Gestor X B", email: `x-b-${suffix}@example.invalid` } })).id;
  const identityX = randomUUID();
  const identityY = randomUUID();
  await admin.authIdentity.createMany({ data: [{ id: identityX }, { id: identityY }] });
  await admin.authIdentityLink.createMany({ data: [
    { identity_id: identityX, tenant_id: tenantA, user_id: userA, attached_via: "backfill" },
    { identity_id: identityX, tenant_id: tenantB, user_id: userB, attached_via: "backfill" },
  ] });
  await admin.economicGroupMember.createMany({ data: [
    { tenant_id: tenantA, group_id: group, valid_from: new Date("2026-01-01T00:00:00.000Z") },
    { tenant_id: tenantB, group_id: group, valid_from: new Date("2026-01-01T00:00:00.000Z") },
  ] });
  const repository = new managerModule.PrismaEconomicGroupManagersRepository(role.client);
  const created: string[] = [];
  async function ensureActiveMark() {
    const rows = await admin.economicGroupManager.findMany({ where: { group_id: group, identity_id: identityX, revoked_at: null } });
    if (rows[0]) return rows[0];
    const row = await repository.grant({ groupId: group, organizationId: tenantA, userId: userA, actorTenantId: tenantA, actorUserId: userA, today: "2026-11-22" });
    created.push(row.id);
    return row;
  }
  async function auditTrail(managerId: string) {
    const organization = await admin.auditLog.findMany({ where: { tenant_id: tenantA, entity_id: group }, orderBy: { created_at: "asc" }, select: { action: true } });
    const platformRows = await admin.platformAuditLog.findMany({ where: { entity_id: managerId }, orderBy: { created_at: "asc" }, select: { action: true } });
    return { organization: organization.map((row: any) => row.action), platform: platformRows.map((row: any) => row.action) };
  }
  return { admin, role, repository, platform, tenantA, tenantB, group, userA, identityX, identityY, ensureActiveMark, auditTrail, async close() {
    await admin.auditLog.deleteMany({ where: { tenant_id: tenantA, entity_id: group } });
    await admin.platformAuditLog.deleteMany({ where: { entity: "economic_group_manager", metadata: { path: ["group_id"], equals: group } } });
    await admin.$executeRawUnsafe(`DELETE FROM economic_group_managers WHERE group_id = $1::uuid`, group);
    await admin.economicGroupMember.deleteMany({ where: { group_id: group } });
    await admin.authIdentityLink.deleteMany({ where: { identity_id: { in: [identityX, identityY] } } });
    await admin.user.deleteMany({ where: { tenant_id: { in: [tenantA, tenantB] } } });
    await admin.authIdentity.deleteMany({ where: { id: { in: [identityX, identityY] } } });
    await admin.economicGroup.delete({ where: { id: group } });
    await admin.tenant.deleteMany({ where: { id: { in: existingPlatform ? [tenantA, tenantB] : [platform, tenantA, tenantB] } } });
    await role.drop(); await admin.$disconnect();
  } };
}
