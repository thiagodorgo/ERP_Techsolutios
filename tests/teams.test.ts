import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("teams service cria, lista, busca com membros, atualiza, desativa e isola tenants", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryTeamService, resetTeamRuntimeForTests } = await import("../src/modules/teams/index.js");
  const service = createMemoryTeamService();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const managerA = actor(tenantA, randomUUID(), ["manager"], ["teams:read", "teams:create", "teams:update"]);
  const managerB = actor(tenantB, randomUUID(), ["manager"], ["teams:read", "teams:create"]);

  try {
    const first = await service.create(managerA, { name: "Equipe Alfa", leader_user_id: "usr_leader_a" });
    const second = await service.create(managerA, { name: "Equipe Bravo" });

    assert.equal(first.isActive, true);
    assert.equal(first.status, "active");
    assert.equal(first.tenantId, tenantA);
    assert.equal(first.leaderUserId, "usr_leader_a");
    assert.equal(first.memberCount, 0);
    assert.equal(first.createdBy, managerA.userId);

    const listA = await service.list(managerA, { limit: "20", offset: "0" });
    const listB = await service.list(managerB, { limit: "20", offset: "0" });
    assert.equal(listA.total, 2);
    assert.equal(listB.total, 0);

    await service.addMember(managerA, first.id, { userId: "usr_member_1", roleInTeam: "driver" });

    const fetched = await service.get(managerA, first.id);
    assert.equal(fetched.id, first.id);
    assert.equal(fetched.memberCount, 1);
    assert.equal(fetched.members?.length, 1);
    assert.equal(fetched.members?.[0]?.userId, "usr_member_1");

    const updated = await service.update(managerA, first.id, { status: "archived" });
    assert.equal(updated.status, "archived");
    assert.equal(updated.updatedBy, managerA.userId);

    const deactivated = await service.update(managerA, second.id, { isActive: false });
    assert.equal(deactivated.isActive, false);
    const inactive = await service.list(managerA, { isActive: false });
    assert.equal(inactive.total, 1);
    assert.equal(inactive.items[0].id, second.id);

    await assert.rejects(() => service.create(managerA, { name: "Equipe Alfa" }), /already exists/);

    const sameNameOtherTenant = await service.create(managerB, { name: "Equipe Alfa" });
    assert.equal(sameNameOtherTenant.tenantId, tenantB);

    await assert.rejects(() => service.get(managerB, first.id), /Team was not found/);
  } finally {
    resetTeamRuntimeForTests();
  }
});

test("teams service valida payloads e filtros", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryTeamService, resetTeamRuntimeForTests } = await import("../src/modules/teams/index.js");
  const service = createMemoryTeamService();
  const manager = actor(randomUUID(), randomUUID(), ["manager"], ["teams:create", "teams:read"]);

  try {
    await assert.rejects(() => service.create(manager, { name: "" }), /name is required/);
    await assert.rejects(() => service.create(manager, {}), /name is required/);
    await assert.rejects(() => service.list(manager, { limit: "0" }), /limit must be between 1 and 100/);
    await assert.rejects(() => service.get(manager, "not-a-uuid"), /teamId must be a valid UUID/);
  } finally {
    resetTeamRuntimeForTests();
  }
});

test("teams service gerencia membros: adiciona, bloqueia duplicado e remove", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryTeamService, resetTeamRuntimeForTests } = await import("../src/modules/teams/index.js");
  const service = createMemoryTeamService();
  const manager = actor(randomUUID(), randomUUID(), ["manager"], ["teams:create", "teams:read", "teams:update"]);

  try {
    const team = await service.create(manager, { name: "Equipe Guincho" });
    const member = await service.addMember(manager, team.id, { userId: "usr_membro_1", roleInTeam: "operador" });
    assert.equal(member.userId, "usr_membro_1");
    assert.equal(member.roleInTeam, "operador");

    await assert.rejects(
      () => service.addMember(manager, team.id, { userId: "usr_membro_1" }),
      /already a member/,
    );

    const withMember = await service.get(manager, team.id);
    assert.equal(withMember.memberCount, 1);

    await service.removeMember(manager, team.id, "usr_membro_1");
    const afterRemoval = await service.get(manager, team.id);
    assert.equal(afterRemoval.memberCount, 0);

    await assert.rejects(
      () => service.removeMember(manager, team.id, "usr_membro_1"),
      /Team member was not found/,
    );

    await assert.rejects(
      () => service.addMember(manager, randomUUID(), { userId: "usr_x" }),
      /Team was not found/,
    );
  } finally {
    resetTeamRuntimeForTests();
  }
});

function actor(
  tenantId: string,
  userId: string,
  roles: readonly string[],
  permissions: readonly string[],
) {
  return {
    tenantId,
    userId,
    roles,
    permissions,
  } as never;
}
