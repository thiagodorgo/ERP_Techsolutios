import assert from "node:assert/strict";
import test from "node:test";

import {
  filterNavigationByPermissions,
  filterNavigationByTenantModules,
  getMenuForCurrentUser,
  type NavigationItem,
} from "../src/modules/navigation/index.js";

test("Platform Admin recebe itens Platform", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-platform",
    roles: ["super_admin"],
    permissions: ["platform:tenants:read", "platform:cloud-charges:read"],
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
    permissions: ["finance:read", "billing:read"],
    enabledModules: ["finance"],
    scope: "finance",
  });

  assert.equal(menu.find((item) => item.id === "finance.dashboard")?.status, "future");
  assert.equal(menu.find((item) => item.id === "finance.charges")?.status, "future");
});

test("relatedEndpoints sao retornados sem dados sensiveis", () => {
  const menu = getMenuForCurrentUser({
    userId: "usr-platform",
    roles: ["super_admin"],
    permissions: ["platform:cloud-charges:read"],
  });
  const cloudBilling = menu.find((item) => item.id === "platform.cloudBilling");

  assert.ok(cloudBilling);
  assert.equal(cloudBilling.relatedEndpoints?.some((endpoint) => /secret|token|password/i.test(endpoint)), false);
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
