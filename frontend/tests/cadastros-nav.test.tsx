import assert from "node:assert/strict";
import test from "node:test";

import type { NavigationAccessContext } from "../src/navigation/types";

const CADASTROS_PATHS = [
  "/cadastros/clientes",
  "/cadastros/viaturas",
  "/cadastros/equipes",
  "/cadastros/servicos",
  "/cadastros/tabelas-valores",
  "/cadastros/tarifas",
  "/cadastros/filiais",
  "/cadastros/fornecedores",
];

const REGISTRY_PERMISSIONS = [
  "customers:read",
  "vehicles:read",
  "teams:read",
  "service_catalog:read",
  "price_tables:read",
  "tariffs:read",
  "branches:read",
  "suppliers:read",
];

function flattenPaths(items: readonly { path: string; children?: readonly { path: string }[] }[]): string[] {
  return items.flatMap((item) => [item.path, ...(item.children?.map((child) => child.path) ?? [])]);
}

test("cadastros: Gestor com permissoes de leitura ve todas as 8 telas do menu Cadastros (A5 + Ω2-a + Ω2-b)", async () => {
  const { filterNavigationItems } = await import("../src/navigation/types");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");

  const context: NavigationAccessContext = {
    roles: ["Gestor Operacional"],
    permissions: [...REGISTRY_PERMISSIONS, "dashboard:view", "work_orders:read"],
    mode: "operation",
    scope: "tenant",
    tenantStatus: "active",
  };

  const paths = flattenPaths(filterNavigationItems(context, tenantNavigation));

  for (const path of CADASTROS_PATHS) {
    assert.equal(paths.includes(path), true, `esperado ${path} visivel para Gestor com permissoes`);
  }
});

test("cadastros: Administrador em modo tenant_admin tambem enxerga o menu Cadastros (A5)", async () => {
  const { filterNavigationItems } = await import("../src/navigation/types");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");

  const context: NavigationAccessContext = {
    roles: ["Administrador"],
    permissions: [...REGISTRY_PERMISSIONS, "tenant:manage"],
    mode: "tenant_admin",
    scope: "tenant",
    tenantStatus: "active",
  };

  const paths = flattenPaths(filterNavigationItems(context, tenantNavigation));

  for (const path of CADASTROS_PATHS) {
    assert.equal(paths.includes(path), true, `esperado ${path} visivel para Administrador`);
  }
});

test("cadastros: perfil sem permissoes de leitura nao ve nenhuma tela de Cadastros (A5)", async () => {
  const { filterNavigationItems } = await import("../src/navigation/types");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");

  const context: NavigationAccessContext = {
    roles: ["Operador Logistico"],
    permissions: ["dashboard:view", "work_orders:read", "field_dispatch:read"],
    mode: "operation",
    scope: "tenant",
    tenantStatus: "active",
  };

  const paths = flattenPaths(filterNavigationItems(context, tenantNavigation));

  for (const path of CADASTROS_PATHS) {
    assert.equal(paths.includes(path), false, `esperado ${path} oculto sem permissao de leitura`);
  }
});

test("cadastros: cada tela some individualmente ao faltar sua permissao de leitura (A5)", async () => {
  const { filterNavigationItems } = await import("../src/navigation/types");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");

  // Sem `customers:read`: Clientes some, mas as demais telas de Cadastros permanecem.
  const context: NavigationAccessContext = {
    roles: ["Gestor Operacional"],
    permissions: ["vehicles:read", "teams:read", "service_catalog:read"],
    mode: "operation",
    scope: "tenant",
    tenantStatus: "active",
  };

  const paths = flattenPaths(filterNavigationItems(context, tenantNavigation));

  assert.equal(paths.includes("/cadastros/clientes"), false, "Clientes deve sumir sem customers:read");
  assert.equal(paths.includes("/cadastros/viaturas"), true);
  assert.equal(paths.includes("/cadastros/equipes"), true);
  assert.equal(paths.includes("/cadastros/servicos"), true);
});

test("cadastros: rotulo do grupo 'Cadastros' resolve e agrupa as 8 telas (A5 + Ω2-a + Ω2-b)", async () => {
  const { filterNavigationItems } = await import("../src/navigation/types");
  const { tenantNavigation } = await import("../src/navigation/tenantNavigation");
  const { groupNavigationItems, navigationGroupLabels } = await import("../src/modules/navigation/navigation.adapter");

  assert.equal(navigationGroupLabels.registry, "Cadastros");

  const context: NavigationAccessContext = {
    roles: ["Gestor Operacional"],
    permissions: REGISTRY_PERMISSIONS,
    mode: "operation",
    scope: "tenant",
    tenantStatus: "active",
  };

  const groups = groupNavigationItems(filterNavigationItems(context, tenantNavigation));
  const registryGroup = groups.find((group) => group.scope === "registry");

  assert.ok(registryGroup, "grupo registry deve existir");
  assert.equal(registryGroup.label, "Cadastros");
  assert.equal(registryGroup.items.length, 8);
  assert.deepEqual(
    registryGroup.items.map((item) => item.path).sort(),
    [...CADASTROS_PATHS].sort(),
  );
});
