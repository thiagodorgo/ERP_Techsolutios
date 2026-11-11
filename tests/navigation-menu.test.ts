import assert from "node:assert/strict";
import test from "node:test";

import {
  filterNavigationByPermissions,
  filterNavigationByTenantModules,
  getMenuForCurrentUser,
  type NavigationItem,
} from "../src/modules/navigation/index.js";

test("Platform Admin com cost allocation recebe itens Platform", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-platform",
    roles: ["super_admin"],
    permissions: ["platform:tenants:read", "platform:cloud-cost-allocation:read"],
  });

  assert.equal(menu.some((item) => item.id === "platform.tenants"), true);
  assert.equal(menu.some((item) => item.id === "platform.cloudBilling"), true);
  assert.equal(menu.every((item) => item.group === "platform"), true);
});

test("Tenant Admin nao recebe itens Platform", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-admin",
    tenantId: "ten-a",
    roles: ["tenant_admin"],
    permissions: ["tenant_checklists:read", "dashboard:read"],
    enabledModules: ["tenant_checklist", "dashboard"],
  });

  assert.equal(menu.some((item) => item.group === "platform"), false);
  assert.equal(menu.some((item) => item.id === "tenant.checklists"), true);
});

test("Usuario sem permissao nao recebe item protegido", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-viewer",
    tenantId: "ten-a",
    roles: ["viewer"],
    permissions: ["dashboard:read"],
    enabledModules: ["dashboard", "tenant_checklist"],
  });

  assert.equal(menu.some((item) => item.id === "tenant.dashboard"), true);
  assert.equal(menu.some((item) => item.id === "tenant.checklists"), false);
});

test("Item com permissao e modulo aparece", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-ops",
    tenantId: "ten-a",
    roles: ["operator"],
    permissions: ["checklist_runs:read"],
    enabledModules: ["tenant_checklist"],
  });

  assert.equal(menu.some((item) => item.id === "operations.checklists"), true);
});

test("Children sem permissao sao removidos", () => {
  const items: NavigationItem[] = [
    {
      id: "parent",
      label: "Parent",
      path: "/parent",
      icon: "Folder",
      group: "tenant",
      order: 1,
      status: "implemented",
      requiredPermissions: ["parent:read"],
      children: [
        {
          id: "child.allowed",
          label: "Allowed",
          path: "/parent/allowed",
          icon: "Check",
          group: "tenant",
          order: 1,
          status: "implemented",
          requiredPermissions: ["child:read"],
        },
        {
          id: "child.denied",
          label: "Denied",
          path: "/parent/denied",
          icon: "Lock",
          group: "tenant",
          order: 2,
          status: "implemented",
          requiredPermissions: ["child:write"],
        },
      ],
    },
  ];

  const filtered = filterNavigationByPermissions(items, ["child:read"]);

  assert.equal(filtered.length, 1);
  assert.deepEqual(filtered[0].children?.map((item) => item.id), ["child.allowed"]);
});

test("Ordenacao e estavel por order e id", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-platform",
    roles: ["super_admin"],
    permissions: ["platform:audit:read", "platform:dashboard:read", "platform:tenants:read"],
  });

  assert.deepEqual(menu.map((item) => item.id), [
    "platform.dashboard",
    "platform.tenants",
    "platform.audit",
  ]);
});

test("Item planned/future pode aparecer com permissao e status correto", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-finance",
    tenantId: "ten-a",
    roles: ["tenant_admin"],
    permissions: ["financial_entries:read", "financial_titles:read"],
    enabledModules: ["finance"],
    scope: "finance",
  });

  // B-SAN3-04a (item 13): /finance, /finance/charges e /finance/payments passaram a "implemented", governados pelas
  // permissões que as rotas e o App.tsx comparam (financial_entries:read / financial_titles:read); /finance/invoices
  // segue "future" e continua aparecendo com a permissão — é o caso "future com permissão" que este teste pina.
  assert.equal(menu.find((item) => item.id === "finance.dashboard")?.status, "implemented");
  assert.equal(menu.find((item) => item.id === "finance.charges")?.status, "implemented");
  assert.equal(menu.find((item) => item.id === "finance.invoices")?.status, "future");
});

// B-SAN3-24 (A9, P-MENU) — Cheques é item IMPLEMENTADO do Financeiro, governado pela mesma permissão que a rota do
// servidor e o PermissionGuard do App.tsx comparam (`cheques:read`): aparece com ela, some sem ela.
test("B-SAN3-24: finance.cheques é implementado e só aparece com cheques:read", () => {
  const actor = { userId: "usr-finance", tenantId: "ten-a", roles: ["finance"], enabledModules: ["finance"], scope: "finance" } as const;
  const withPermission = getMenuForCurrentUser({ ...actor, permissions: ["cheques:read"] });
  const cheques = withPermission.find((item) => item.id === "finance.cheques");
  assert.equal(cheques?.status, "implemented");
  assert.equal(cheques?.path, "/finance/cheques");
  assert.deepEqual(cheques?.requiredPermissions, ["cheques:read"]);
  assert.deepEqual(cheques?.requiredModules, ["finance"]);
  const without = getMenuForCurrentUser({ ...actor, permissions: ["financial_entries:read", "financial_titles:read", "financial_period:read"] });
  assert.equal(without.find((item) => item.id === "finance.cheques"), undefined);
});

test("Cloud Billing aparece com cost allocation read", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-platform",
    roles: ["super_admin"],
    permissions: ["platform:cloud-cost-allocation:read"],
  });
  const cloudBilling = menu.find((item) => item.id === "platform.cloudBilling");

  assert.ok(cloudBilling);
  assert.equal(cloudBilling.relatedEndpoints?.some((endpoint) => /secret|token|password/i.test(endpoint)), false);
});

test("Cloud Billing nao aparece somente com cloud charges read", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-platform",
    roles: ["super_admin"],
    permissions: ["platform:cloud-charges:read"],
  });

  assert.equal(menu.some((item) => item.id === "platform.cloudBilling"), false);
});

test("Filtro de modulo remove item quando tenant nao possui modulo exigido", () => {
  const filtered = filterNavigationByTenantModules(
    [
      {
        id: "tenant.checklists",
        label: "Checklists",
        path: "/administrator/checklists",
        icon: "ClipboardCheck",
        group: "tenant",
        order: 1,
        status: "implemented",
        requiredPermissions: ["tenant_checklists:read"],
        requiredModules: ["tenant_checklist"],
      },
    ],
    ["dashboard"],
  );

  assert.equal(filtered.length, 0);
});

test("T-ST-36 (B-ASS-04): Minha assinatura aparece com billing:read, sem exigir módulo, e some sem a permissão", () => {
  const withRead = getMenuForCurrentUser({
    userId: "usr-finance",
    tenantId: "ten-a",
    roles: ["finance"],
    permissions: ["billing:read"],
    enabledModules: [],
  });
  const item = withRead.find((entry) => entry.id === "tenant.billing");
  assert.ok(item, "o item aparece com billing:read e nenhum módulo");
  assert.equal(item.path, "/administrator/subscription");

  const withoutRead = getMenuForCurrentUser({
    userId: "usr-operator",
    tenantId: "ten-a",
    roles: ["operator"],
    permissions: ["dashboard:read"],
    enabledModules: ["dashboard"],
  });
  assert.equal(withoutRead.some((entry) => entry.id === "tenant.billing"), false);

  const platform = getMenuForCurrentUser({
    userId: "usr-platform",
    roles: ["super_admin"],
    permissions: ["billing:read", "platform:billing:read"],
  });
  assert.equal(platform.some((entry) => entry.id === "tenant.billing"), false, "ator de plataforma não é cliente");
});
