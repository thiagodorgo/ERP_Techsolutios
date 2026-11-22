import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
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

async function withApi(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const { createApp } = await import("../src/app.js");
  const server: Server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function call(baseUrl: string, method: string, pathName: string, role: string, permissions: string) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: { "content-type": "application/json", "x-role": role, "x-user-id": "usr-platform", "x-permissions": permissions },
    ...(method === "POST" ? { body: JSON.stringify({ organizationId: "00000000-0000-4000-8000-000000000002", userId: "00000000-0000-4000-8000-000000000003" }) } : {}),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

test("GM-6-HTTP: billing manage sem users create admin lê, mas não marca nem retira", async () => {
  const factory = await import("../src/modules/subscription-billing/economic-groups/economic-group-managers.factory.js");
  factory.resetEconomicGroupManagersForTests();
  const groupId = randomUUID();
  factory.getMemoryEconomicGroupManagersForTests().addGroup(groupId);
  await withApi(async (baseUrl) => {
    const root = `/api/v1/platform/billing/economic-groups/${groupId}/managers`;
    const headers = ["super_admin", "platform:billing:read,platform:billing:manage"] as const;
    const list = await call(baseUrl, "GET", root, ...headers);
    assert.equal(list.status, 200);
    for (const [method, pathName] of [["POST", root], ["DELETE", `${root}/00000000-0000-4000-8000-000000000004`]] as const) {
      const response = await call(baseUrl, method, pathName, ...headers);
      assert.equal(response.status, 403, `${method} ${pathName}`);
      assert.equal(response.body.error?.reason, "platform_permission_required");
    }
  });
  factory.resetEconomicGroupManagersForTests();
});

test("GM-7-HTTP: ator de organização recebe 403 nas três rotas", async () => {
  await withApi(async (baseUrl) => {
    const root = "/api/v1/platform/billing/economic-groups/00000000-0000-4000-8000-000000000001/managers";
    for (const [method, pathName] of [["GET", root], ["POST", root], ["DELETE", `${root}/00000000-0000-4000-8000-000000000004`]] as const) {
      const response = await call(baseUrl, method, pathName, "tenant_admin", "platform:users:create_admin,platform:billing:read");
      assert.equal(response.status, 403, `${method} ${pathName}`);
      assert.equal(response.body.error?.reason, "platform_permission_required");
    }
  });
});
