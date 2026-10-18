import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolvePermissionsForRoles } from "../src/modules/core-saas/permissions/catalog.js";

const authRoutesSource = readFileSync(
  new URL("../src/modules/auth/routes/auth.routes.ts", import.meta.url),
  "utf8",
);

test("active-tenant serializa permissões pelo mesmo resolvedor canônico do login", () => {
  assert.match(
    authRoutesSource,
    /roles:\s*\[\.\.\.match\.user\.roles\],[\s\S]{0,160}permissions:\s*resolveLoginPermissions\(match\.user\.roles\)/,
  );
});

test("catálogo devolvido distingue Financeiro, Estoque e Suporte", () => {
  const finance = resolvePermissionsForRoles(["finance"]);
  const inventory = resolvePermissionsForRoles(["inventory"]);
  const support = resolvePermissionsForRoles(["support"]);

  assert.ok(finance.includes("financial_entries:read"));
  assert.equal(finance.includes("dashboard:read"), false);
  assert.ok(inventory.includes("inventory_items:read"));
  assert.equal(inventory.includes("dashboard:read"), false);
  assert.ok(support.includes("dashboard:read"));
  assert.equal(support.includes("work_orders:read"), false);
});

test("active-tenant preserva recusas e resposta de erro sem permissões fabricadas", () => {
  assert.match(authRoutesSource, /if \(!match\) \{[\s\S]{0,180}status\(403\)/);
  assert.match(authRoutesSource, /Unable to switch tenant/);
});
