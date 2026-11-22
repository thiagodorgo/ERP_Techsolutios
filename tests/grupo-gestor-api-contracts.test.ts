import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Router } from "express";

import { createEconomicGroupManagersPlatformRouter } from "../src/modules/subscription-billing/economic-groups/economic-group-managers.routes.js";

function routes(router: Router): Array<{ method: string; path: string; permission: string }> {
  const out: Array<{ method: string; path: string; permission: string }> = [];
  for (const layer of (router as any).stack as any[]) {
    if (!layer.route) continue;
    const method = Object.keys(layer.route.methods).find((key) => key !== "_all")!.toUpperCase();
    const permission = layer.route.stack.map((item: any) => item.handle?.platformPermission).find(Boolean);
    out.push({ method, path: layer.route.path, permission });
  }
  return out;
}

test("GM-5/GM-6 · as 3 rotas usam o namespace e as permissões aprovadas", () => {
  assert.deepEqual(routes(createEconomicGroupManagersPlatformRouter()), [
    { method: "GET", path: "/economic-groups/:groupId/managers", permission: "platform:billing:read" },
    { method: "POST", path: "/economic-groups/:groupId/managers", permission: "platform:users:create_admin" },
    { method: "DELETE", path: "/economic-groups/:groupId/managers/:managerId", permission: "platform:users:create_admin" },
  ]);
});

test("GM-7 · contrato e censo registram as 3 rotas sem alterar as 10 do B-ASS-09", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const contract = readFileSync(path.join(root, "API_CONTRACTS.md"), "utf8");
  const fixture = JSON.parse(readFileSync(path.join(root, "tests", "fixtures", "plat-perm-rotas.json"), "utf8"));
  for (const [method, suffix, permission] of [
    ["GET", "/:groupId/managers", "platform:billing:read"],
    ["POST", "/:groupId/managers", "platform:users:create_admin"],
    ["DELETE", "/:groupId/managers/:managerId", "platform:users:create_admin"],
  ] as const) {
    const route = `${method} /api/v1/platform/billing/economic-groups${suffix}`;
    assert.equal(fixture[route], permission, route);
    assert.ok(contract.includes(`\`/api/v1/platform/billing/economic-groups${suffix}\``));
  }
});
