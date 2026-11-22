// B-GRUPO-GESTOR (1a, F1) — AUD: a trilha do Painel do grupo, uma linha em CADA organização lida (Emenda 1, E1), com o
// usuário LOCAL da pessoa ali como ator, e sem dinheiro, nome nem identificador de outra organização nos metadados.
// Composição em memória real (núcleo em memória, vínculos de grupo do B-ASS-09, resumo financeiro em memória); só a
// marca de gestor é o falso da borda da FM.
import assert from "node:assert/strict";
import test from "node:test";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import { InMemoryEconomicGroupsRepository } from "../src/modules/subscription-billing/economic-groups/economic-groups.repository.js";
import {
  createMemoryGroupPanelReaders,
  getMemoryGroupPanelViewsForTests,
  GROUP_PANEL_VIEW_ACTION,
  InMemoryGroupManagerMarks,
  resetGroupPanelMemoryForTests,
} from "../src/modules/group-panel/group-panel.readers.js";
import { GroupPanelService } from "../src/modules/group-panel/group-panel.service.js";
import type { GroupPanelReaders } from "../src/modules/group-panel/group-panel.types.js";

const NOW = new Date("2026-11-22T15:00:00Z");

async function arrange() {
  resetGroupPanelMemoryForTests();
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const core = new MemoryCoreSaasAdapter(registry);
  const groups = new InMemoryEconomicGroupsRepository();
  const marks = new InMemoryGroupManagerMarks((pair) => core.resolveIdentityForUser(pair));
  const groupA = (await groups.createGroup({ name: "Grupo A", notes: null, createdBy: null })).id;
  const groupB = (await groups.createGroup({ name: "Grupo B", notes: null, createdBy: null })).id;

  const org = async (name: string, groupId: string | null) => {
    const tenant = registry.createTenant({ name, modules: ["finance"] });
    if (groupId) await groups.applyMembershipChanges({ closes: [], opens: [{ tenantId: tenant.id, groupId, validFrom: "2026-01-01", createdBy: null }] });
    return tenant.id;
  };
  const a1 = await org("Pátio A1", groupA);
  const a2 = await org("Pátio A2", groupA);
  const a3 = await org("Pátio A3", groupA);
  const b1 = await org("Pátio B1", groupB);

  // A pessoa tem conta em A1, A2, A3 e B1, juntadas numa identidade só (no núcleo em memória não há método público de
  // vínculo: o arranjo faz a religação direto no mapa, como o `POST /auth/identity-links` faz no banco).
  const users = new Map<string, string>();
  for (const tenantId of [a1, a2, a3, b1]) {
    users.set(tenantId, registry.createUser({ tenantId, name: "Gestora", email: `gestora-${tenantId}@example.com`, roles: ["manager"] }).id);
  }
  const identity = await core.resolveIdentityForUser({ tenantId: a1, userId: users.get(a1)! });
  const links = (registry as unknown as { identityLinksByPair: Map<string, { identityId: string }> }).identityLinksByPair;
  for (const tenantId of [a2, a3, b1]) links.get(`${tenantId}::${users.get(tenantId)!}`)!.identityId = identity!;
  marks.grant(identity!, groupA);

  const actor = { userId: users.get(a1)!, tenantId: a1, email: "gestora@example.com", roles: ["manager"], authType: "jwt" as const };
  const service = (overrides: Partial<GroupPanelReaders> = {}) =>
    new GroupPanelService({ ...createMemoryGroupPanelReaders(core, { marks, groups: () => groups }), ...overrides }, () => NOW);
  return { a1, a2, a3, b1, users, actor, service };
}

test("AUD-1: uma linha group_panel.viewed em CADA organização lida, com o usuário LOCAL dela como ator", async () => {
  const { a1, a2, a3, users, actor, service } = await arrange();
  await service().getSummary(actor);
  const views = getMemoryGroupPanelViewsForTests();
  assert.deepEqual(
    views.map((view) => [view.tenantId, view.actorUserId, view.action]).sort(),
    [a1, a2, a3].map((tenantId) => [tenantId, users.get(tenantId)!, GROUP_PANEL_VIEW_ACTION]).sort(),
  );
});

test("AUD-2: os metadados levam só origin e complete — nada de dinheiro, nome ou identificador", async () => {
  const { actor, service } = await arrange();
  await service().getSummary(actor);
  for (const view of getMemoryGroupPanelViewsForTests()) {
    assert.deepEqual(Object.keys(view.metadata).sort(), ["complete", "origin"]);
    assert.equal(view.metadata.origin, "group_panel");
    assert.equal(view.metadata.complete, true);
  }
});

test("AUD-3: a trilha de um pátio não grava — ele sai como erro, sem número, e o total vem nulo; os outros seguem", async () => {
  const { a1, a2, a3, actor, service } = await arrange();
  const base = createMemoryGroupPanelReaders(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const recorded: string[] = [];
  const result = await service({
    recordView: async (input) => {
      if (input.tenantId === a2) throw new Error("trilha caiu");
      recorded.push(input.tenantId);
      await base.recordView(input);
    },
  }).getSummary(actor);
  assert.equal(result.consolidated, null);
  assert.equal(result.coverage.complete, false);
  assert.equal(result.coverage.reason, "erro_de_leitura");
  assert.deepEqual(result.coverage.failed, [a2]);
  const a2View = result.organizations.find((org) => org.id === a2)!;
  assert.equal(a2View.finance.status, "erro");
  assert.equal(a2View.finance.summary, null);
  assert.equal(a2View.operations.status, "erro");
  assert.equal(a2View.operations.summary, null);
  assert.equal(a2View.staff.status, "erro");
  assert.equal(a2View.staff.summary, null);
  assert.deepEqual(recorded.sort(), [a1, a3].sort());
});

test("AUD-4: o GET /group-panel/scope não grava trilha", async () => {
  const { actor, service } = await arrange();
  const scope = await service().getScope(actor);
  assert.equal(scope.organizations.length, 3);
  assert.equal(getMemoryGroupPanelViewsForTests().length, 0);
});

test("AUD-5: leitura de A1, A2 e A3 — uma linha em cada, nenhuma em B1 (outro grupo)", async () => {
  const { a1, a2, a3, b1, actor, service } = await arrange();
  await service().getSummary(actor);
  const tenants = getMemoryGroupPanelViewsForTests().map((view) => view.tenantId);
  assert.deepEqual([...tenants].sort(), [a1, a2, a3].sort());
  assert.ok(!tenants.includes(b1));
});

test("AUD-6: sem marca, nenhuma linha (o 403 sai antes de qualquer leitura de outra organização)", async () => {
  const { actor, service } = await arrange();
  const reads: string[] = [];
  const noMark = service({
    managerMarks: async () => [],
    identityMemberships: async () => {
      reads.push("identityMemberships");
      return [];
    },
  });
  await assert.rejects(() => noMark.getSummary(actor), (error: unknown) => (error as { reason?: string }).reason === "not_group_manager");
  assert.deepEqual(reads, [], "nenhuma organização da identidade foi lida antes da marca");
  assert.equal(getMemoryGroupPanelViewsForTests().length, 0);
});
