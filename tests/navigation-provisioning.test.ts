import assert from "node:assert/strict";
import test from "node:test";

import { getGovernedNavigationPaths, getMenuForCurrentUser } from "../src/modules/navigation/navigation.service.js";
import { ROLE_PERMISSIONS, type Role } from "../src/modules/core-saas/permissions/catalog.js";

// Ω-ACESSO — o Mapa Operacional só entra no menu com o módulo field_operations provisionado E a permissão
// field_location:read. Estes testes travam a MATRIZ por papel e o gating dinâmico (remover módulo → some),
// codificando o que foi validado por login real (ver T-ACESSO / demo-credentials.md).

const DEMO_MODULES = [
  "dashboard", "work_orders", "field_operations", "logistics", "finance",
  "checklists", "tenant_checklist", "notifications", "users", "audit",
];

const TENANT = "11111111-1111-1111-1111-111111111111";

function menuPathsForRole(role: Role, modules: string[] = DEMO_MODULES): string[] {
  const menu = getMenuForCurrentUser({
    userId: "22222222-2222-2222-2222-222222222222",
    tenantId: TENANT,
    roles: [role],
    permissions: [...ROLE_PERMISSIONS[role]],
    enabledModules: modules,
  });
  return menu.map((item) => item.path);
}

// Matriz do Mapa por papel (navigation-matrix.md): quem VÊ o item /operations/map no menu web.
const MAP_VISIBLE_BY_ROLE: Record<Role, boolean> = {
  super_admin: true,
  tenant_admin: true,
  manager: true,
  operator: true,
  auditor: true,
  finance: false,
  inventory: false,
  support: false,
  field_technician: false,
};

for (const role of Object.keys(MAP_VISIBLE_BY_ROLE) as Role[]) {
  test(`Ω-ACESSO matriz: papel ${role} ${MAP_VISIBLE_BY_ROLE[role] ? "VÊ" : "NÃO vê"} o Mapa Operacional`, () => {
    const hasMap = menuPathsForRole(role).includes("/operations/map");
    assert.equal(hasMap, MAP_VISIBLE_BY_ROLE[role]);
  });
}

test("Ω-ACESSO gating dinâmico: remover o módulo field_operations tira o Mapa do menu do admin", () => {
  assert.equal(menuPathsForRole("tenant_admin").includes("/operations/map"), true);
  const semModulo = DEMO_MODULES.filter((m) => m !== "field_operations");
  assert.equal(menuPathsForRole("tenant_admin", semModulo).includes("/operations/map"), false);
});

test("Ω-ACESSO: sem NENHUM módulo provisionado, o menu do tenant fica vazio de itens gated (bug original)", () => {
  const vazio = menuPathsForRole("tenant_admin", []);
  assert.equal(vazio.includes("/operations/map"), false);
  assert.equal(vazio.includes("/work-orders"), false);
});

test("Ω-ACESSO: operator tem field_location:read (opera o mapa)", () => {
  assert.equal(ROLE_PERMISSIONS.operator.includes("field_location:read"), true);
});

test("Ω-ACESSO: getGovernedNavigationPaths inclui o Mapa e paths-chave (para o gating do sidebar)", () => {
  const governed = getGovernedNavigationPaths();
  assert.equal(governed.includes("/operations/map"), true);
  assert.equal(governed.includes("/operations/dispatches"), true);
  assert.equal(governed.includes("/work-orders"), true);
  assert.ok(governed.length >= 15);
});
