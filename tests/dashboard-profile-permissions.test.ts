import assert from "node:assert/strict";
import test from "node:test";

import { resolveContextLandingRoute } from "../frontend/src/modules/context/landing-route.js";
import { resolveFrontendPermissionsFromBackend } from "../frontend/src/modules/auth/auth.adapter.js";
import {
  resolvePermissionsForRoles,
  type Role,
} from "../src/modules/core-saas/permissions/catalog.js";

function landingFor(...roles: Role[]) {
  return resolveContextLandingRoute(resolvePermissionsForRoles(roles));
}

test("cada perfil usa a primeira rota permitida pelo catálogo do backend", () => {
  assert.equal(landingFor("manager"), "/dashboard");
  assert.equal(landingFor("finance"), "/finance");
  assert.equal(landingFor("inventory"), "/inventory");
  assert.equal(landingFor("support"), "/dashboard");
});

test("financeiro precede estoque em vínculo multiperfil sem dashboard", () => {
  assert.equal(landingFor("inventory", "finance"), "/finance");
});

test("resolver falha fechado sem capacidade canônica conhecida", () => {
  assert.equal(resolveContextLandingRoute([]), null);
  assert.equal(resolveContextLandingRoute(["dashboard:view", "work-orders:view"]), null);
});

test("os.read de Suporte e Estoque não fabrica work_orders:read", () => {
  const mapped = resolveFrontendPermissionsFromBackend(["os.read"]);
  assert.equal(mapped.includes("work_orders:read"), false);
  assert.equal(resolveContextLandingRoute(mapped), null);

  for (const role of ["support", "inventory"] as const) {
    const canonical = resolvePermissionsForRoles([role]);
    if (!canonical.includes("work_orders:read")) {
      const effective = resolveFrontendPermissionsFromBackend(canonical);
      assert.equal(effective.includes("work_orders:read"), false, role);
    }
  }
});
