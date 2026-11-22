// B-GRUPO-GESTOR (1a, F1) — SCO: a regra do alcance do Painel do grupo, em funções puras (sem banco, sem relógio).
// O dia é fixo (`TODAY`), em data de negócio de São Paulo, como o serviço passa.
import assert from "node:assert/strict";
import test from "node:test";

import { MembershipOverlapError } from "../src/modules/subscription-billing/economic-groups/membership.rules.js";
import {
  GroupPanelAccessError,
  canReadOperations,
  currentMembershipOf,
  decideFinanceAccess,
  resolveActiveGroup,
  resolveGroupScope,
} from "../src/modules/group-panel/group-scope.js";
import {
  GROUP_PANEL_MAX_ORGANIZATIONS,
  type GroupMembershipRow,
  type IdentityMembershipRow,
} from "../src/modules/group-panel/group-panel.types.js";
import { resolvePermissionsForRoles, type Role } from "../src/modules/core-saas/permissions/catalog.js";

const TODAY = "2026-11-22";
const YESTERDAY = "2026-11-21";
const TOMORROW = "2026-11-23";
const GROUP_A = "grupo-a";
const GROUP_B = "grupo-b";

function member(tenantId: string, name = tenantId): IdentityMembershipRow {
  return { tenantId, tenantName: name, userId: `u-${tenantId}` };
}

function row(tenantId: string, groupId: string, validFrom = "2026-01-01", validTo: string | null = null): GroupMembershipRow {
  return { tenantId, groupId, validFrom, validTo };
}

function scopeOf(memberships: readonly IdentityMembershipRow[], groupRows: readonly GroupMembershipRow[], activeGroupId = GROUP_A) {
  return resolveGroupScope({ activeGroupId, memberships, groupRows, today: TODAY });
}

function ids(organizations: readonly { readonly tenantId: string }[]): string[] {
  return organizations.map((organization) => organization.tenantId);
}

function pair(roles: readonly Role[]) {
  return { roles, permissions: resolvePermissionsForRoles(roles) };
}

test("SCO-1: organização de outro grupo não entra no alcance (P-A)", () => {
  const scope = scopeOf([member("a1"), member("a2"), member("b1")], [row("a1", GROUP_A), row("a2", GROUP_A), row("b1", GROUP_B)]);
  assert.deepEqual(ids(scope.organizations), ["a1", "a2"]);
  assert.ok(!ids(scope.processed).includes("b1"));
});

test("SCO-2: organização da identidade sem grupo hoje não entra", () => {
  const scope = scopeOf([member("a1"), member("solta")], [row("a1", GROUP_A)]);
  assert.deepEqual(ids(scope.organizations), ["a1"]);
});

test("SCO-3: saiu do grupo hoje (validTo = hoje) não entra; o intervalo é [validFrom, validTo)", () => {
  const scope = scopeOf([member("a1"), member("a2")], [row("a1", GROUP_A), row("a2", GROUP_A, "2026-01-01", TODAY)]);
  assert.deepEqual(ids(scope.organizations), ["a1"]);
});

test("SCO-4: entra no grupo amanhã (validFrom = amanhã) não entra hoje", () => {
  const scope = scopeOf([member("a1"), member("a2")], [row("a1", GROUP_A), row("a2", GROUP_A, TOMORROW)]);
  assert.deepEqual(ids(scope.organizations), ["a1"]);
});

test("SCO-5: as bordas valem — entrou hoje entra; sai amanhã ainda entra hoje", () => {
  const scope = scopeOf(
    [member("a1"), member("a2"), member("a3")],
    [row("a1", GROUP_A), row("a2", GROUP_A, TODAY), row("a3", GROUP_A, "2026-01-01", TOMORROW)],
  );
  assert.deepEqual(ids(scope.organizations), ["a1", "a2", "a3"]);
  assert.equal(currentMembershipOf([row("a2", GROUP_A, YESTERDAY, TODAY), row("a2", GROUP_B, TODAY)], "a2", TODAY)?.groupId, GROUP_B);
});

test("SCO-6: dois vínculos da mesma organização no mesmo dia falham fechado (sem escolher um)", () => {
  assert.throws(
    () => scopeOf([member("a1"), member("a2")], [row("a1", GROUP_A), row("a2", GROUP_A), row("a2", GROUP_B)]),
    (error: unknown) => error instanceof MembershipOverlapError,
  );
});

test("SCO-7: só entram organizações da identidade — pátio do grupo sem conta da pessoa não aparece (P-B)", () => {
  const scope = scopeOf([member("a1")], [row("a1", GROUP_A), row("a2", GROUP_A), row("a3", GROUP_A)]);
  assert.deepEqual(ids(scope.organizations), ["a1"]);
  assert.equal(scope.organizations[0]?.userId, "u-a1", "o usuário de cada pátio é o local, vindo do vínculo");
});

test("SCO-8: sem financial_entries:read no par daquela organização, o financeiro dela é sem_permissao (P-C)", () => {
  assert.equal(decideFinanceAccess(pair(["field_technician"]), true), "sem_permissao");
  assert.equal(decideFinanceAccess({ roles: ["manager"], permissions: ["dashboard:read"] }, true), "sem_permissao");
});

test("SCO-9: com a permissão e o módulo ligado, ok; com o módulo desligado, modulo_desligado (R15)", () => {
  assert.equal(decideFinanceAccess(pair(["finance"]), true), "ok");
  assert.equal(decideFinanceAccess(pair(["manager"]), true), "ok");
  assert.equal(decideFinanceAccess(pair(["finance"]), false), "modulo_desligado");
});

test("SCO-10: sem marca de gestor, 403 not_group_manager (P-F)", () => {
  assert.throws(
    () => resolveActiveGroup({ activeTenantId: "a1", activeGroupRows: [row("a1", GROUP_A)], managerMarks: [], today: TODAY }),
    (error: unknown) => error instanceof GroupPanelAccessError && error.statusCode === 403 && error.reason === "not_group_manager",
  );
});

test("SCO-11: marca de outro grupo não abre o Painel do grupo da organização ativa", () => {
  assert.throws(
    () =>
      resolveActiveGroup({
        activeTenantId: "b1",
        activeGroupRows: [row("b1", GROUP_B)],
        managerMarks: [{ groupId: GROUP_A, revokedAt: null }],
        today: TODAY,
      }),
    (error: unknown) => error instanceof GroupPanelAccessError,
  );
});

test("SCO-12: marca retirada não abre o Painel", () => {
  assert.throws(
    () =>
      resolveActiveGroup({
        activeTenantId: "a1",
        activeGroupRows: [row("a1", GROUP_A)],
        managerMarks: [{ groupId: GROUP_A, revokedAt: new Date("2026-11-20T12:00:00Z") }],
        today: TODAY,
      }),
    (error: unknown) => error instanceof GroupPanelAccessError,
  );
});

test("SCO-13: organização ativa sem grupo hoje é 403, mesmo com marca viva (GM-5)", () => {
  assert.throws(
    () =>
      resolveActiveGroup({
        activeTenantId: "a1",
        activeGroupRows: [row("a1", GROUP_A, "2026-01-01", TODAY)],
        managerMarks: [{ groupId: GROUP_A, revokedAt: null }],
        today: TODAY,
      }),
    (error: unknown) => error instanceof GroupPanelAccessError,
  );
  assert.equal(
    resolveActiveGroup({ activeTenantId: "a1", activeGroupRows: [row("a1", GROUP_A)], managerMarks: [{ groupId: GROUP_A, revokedAt: null }], today: TODAY }),
    GROUP_A,
  );
});

test("SCO-14: o teto corta acima de 30 e marca overLimit; até 30, nada é cortado", () => {
  const many = Array.from({ length: GROUP_PANEL_MAX_ORGANIZATIONS + 1 }, (_, index) => `t${String(index).padStart(2, "0")}`);
  const over = scopeOf(many.map((id) => member(id)), many.map((id) => row(id, GROUP_A)));
  assert.equal(over.overLimit, true);
  assert.equal(over.processed.length, GROUP_PANEL_MAX_ORGANIZATIONS);
  assert.deepEqual(ids(over.omitted), ["t30"]);
  const exact = scopeOf(many.slice(0, 30).map((id) => member(id)), many.map((id) => row(id, GROUP_A)));
  assert.equal(exact.overLimit, false);
  assert.equal(exact.omitted.length, 0);
});

test("SCO-15: bloco de chamados — dashboard:read e sem recorte de papel de campo", () => {
  assert.equal(canReadOperations(pair(["manager"])), true);
  assert.equal(canReadOperations(pair(["field_technician"])), false, "papel de campo tem recorte: fora do bloco");
  assert.equal(canReadOperations({ roles: ["manager"], permissions: [] }), false);
});

test("SCO-16: a lista sai em ordem de nome e sem repetir organização", () => {
  const scope = scopeOf([member("a2", "Pátio Zeta"), member("a1", "Pátio Alfa"), member("a1", "Pátio Alfa")], [row("a1", GROUP_A), row("a2", GROUP_A)]);
  assert.deepEqual(
    scope.organizations.map((organization) => organization.name),
    ["Pátio Alfa", "Pátio Zeta"],
  );
});
