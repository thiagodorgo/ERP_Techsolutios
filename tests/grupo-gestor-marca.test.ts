import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryEconomicGroupManagersRepository } from "../src/modules/subscription-billing/economic-groups/economic-group-managers.repository.js";
import { EconomicGroupManagersService } from "../src/modules/subscription-billing/economic-groups/economic-group-managers.service.js";

const GROUP = "00000000-0000-4000-8000-000000000001";
const ORG = "00000000-0000-4000-8000-000000000002";
const USER = "00000000-0000-4000-8000-000000000003";
const IDENTITY = "00000000-0000-4000-8000-000000000004";

function fixture(options: { active?: boolean; inGroup?: boolean } = {}) {
  const repository = new InMemoryEconomicGroupManagersRepository();
  repository.addCandidate({ groupId: GROUP, organizationId: ORG, organizationName: "Pátio A", userId: USER, userName: "Gestor", identityId: IDENTITY, active: options.active ?? true, inGroup: options.inGroup ?? true });
  return { repository, service: new EconomicGroupManagersService(repository, () => new Date("2026-11-22T12:00:00.000Z")) };
}

test("GM-1 · marca, lista e revoga pela identidade, sem criar papel", async () => {
  const { service } = fixture();
  const manager = await service.grant({ groupId: GROUP, organizationId: ORG, userId: USER, actorTenantId: ORG, actorUserId: USER });
  assert.equal(manager.identityId, IDENTITY);
  assert.deepEqual(manager.accounts, [{ organizationId: ORG, organizationName: "Pátio A", userId: USER, userName: "Gestor" }]);
  assert.equal((await service.list(GROUP)).length, 1);
  await service.revoke(GROUP, manager.id, USER);
  assert.deepEqual(await service.list(GROUP), []);
});

test("GM-2 · a mesma identidade não recebe duas marcas ativas no grupo", async () => {
  const { service } = fixture();
  const input = { groupId: GROUP, organizationId: ORG, userId: USER, actorTenantId: ORG, actorUserId: USER };
  await service.grant(input);
  await assert.rejects(service.grant(input), (error: any) => error?.statusCode === 409 && error?.reason === "already_group_manager");
});

test("GM-3 · pátio fora do grupo e usuário inativo falham fechados com 422", async () => {
  for (const [options, reason] of [[{ inGroup: false }, "organization_not_in_group"], [{ active: false }, "user_inactive"]] as const) {
    const { service } = fixture(options);
    await assert.rejects(service.grant({ groupId: GROUP, organizationId: ORG, userId: USER, actorTenantId: ORG, actorUserId: USER }), (error: any) => error?.statusCode === 422 && error?.reason === reason);
  }
});

test("GM-4 · grupo ou marca inexistente devolvem 404 sem revelar outro recurso", async () => {
  const { service } = fixture();
  await assert.rejects(service.list("00000000-0000-4000-8000-000000000099"), (error: any) => error?.statusCode === 404);
  await assert.rejects(service.revoke(GROUP, "00000000-0000-4000-8000-000000000098", USER), (error: any) => error?.statusCode === 404);
});
