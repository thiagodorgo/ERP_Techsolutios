import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { signAccessToken } from "../src/modules/auth/index.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import { InMemoryPlatformOverviewRepository } from "../src/modules/platform/platform-overview.repository.js";

const FABRICATED_KEYS = ["mrr", "uptime", "apiCalls", "storageGb", "usageSummary", "activeUsers"];

test("GET /platform/overview returns a real aggregate to a platform actor", async () => {
  await withPlatformApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/overview", {
      headers: {
        "x-user-id": "usr_platform",
        "x-role": "super_admin",
      },
    });

    assert.equal(response.status, 200);
    // Contrato para o front: { data: { activeOrgs, totalOrgs, totalUsers, orgs: [...] } }.
    assert.equal(typeof response.body.data.activeOrgs, "number");
    assert.equal(typeof response.body.data.totalOrgs, "number");
    assert.equal(typeof response.body.data.totalUsers, "number");
    assert.equal(Array.isArray(response.body.data.orgs), true);
  });
});

test("GET /platform/overview accepts a platform JWT and rejects a tenant JWT (isolation)", async () => {
  await withPlatformApi(async (baseUrl) => {
    const platformToken = await signAccessToken({
      user_id: "usr_platform_jwt",
      tenant_id: "platform",
      email: "platform@example.com",
      roles: ["platform_admin"],
    });
    const tenantAdminToken = await signAccessToken({
      user_id: "usr_tenant_admin_jwt",
      tenant_id: "ten_demo",
      email: "admin@example.com",
      roles: ["tenant_admin"],
    });
    const managerToken = await signAccessToken({
      user_id: "usr_manager_jwt",
      tenant_id: "ten_demo",
      email: "manager@example.com",
      roles: ["manager"],
    });

    const platformActor = await requestJson(baseUrl, "/api/v1/platform/overview", {
      headers: { authorization: `Bearer ${platformToken}` },
    });
    assert.equal(platformActor.status, 200);
    assert.equal(Array.isArray(platformActor.body.data.orgs), true);

    // NÃO-platform (tenant_admin / manager) → 403: nenhum papel de tenant alcança o agregado.
    for (const token of [tenantAdminToken, managerToken]) {
      const denied = await requestJson(baseUrl, "/api/v1/platform/overview", {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(denied.status, 403);
      assert.equal(denied.body.error.reason, "platform_permission_required");
    }
  });
});

test("GET /platform/overview is unreachable without a valid credential", async () => {
  await withPlatformApi(async (baseUrl) => {
    // Sem auth alguma → 403 (o gate de plataforma exige um ator).
    const missingActor = await requestJson(baseUrl, "/api/v1/platform/overview");
    assert.equal(missingActor.status, 403);
    assert.equal(missingActor.body.error.reason, "platform_actor_required");

    // Token inválido → 401 antes de qualquer fallback (credencial forjada não vaza o agregado).
    const invalidToken = await requestJson(baseUrl, "/api/v1/platform/overview", {
      headers: { authorization: "Bearer invalid.token.value" },
    });
    assert.equal(invalidToken.status, 401);
    assert.equal(invalidToken.body.error.code, "INVALID_TOKEN");
  });
});

test("GET /platform/overview never leaks fabricated usage/billing fields (§2.8)", async () => {
  await withPlatformApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/overview", {
      headers: {
        "x-user-id": "usr_platform",
        "x-role": "super_admin",
      },
    });

    assert.equal(response.status, 200);

    // Chaves do agregado são EXATAMENTE as contagens honestas — sem mrr/uptime/apiCalls/storageGb.
    assert.deepEqual(
      Object.keys(response.body.data).sort(),
      ["activeOrgs", "orgs", "totalOrgs", "totalUsers"],
    );
    for (const key of FABRICATED_KEYS) {
      assert.equal(response.body.data[key], undefined);
    }
    // Cada organização só carrega metadados + contagens (nenhum campo fabricado herdado do seed antigo).
    for (const org of response.body.data.orgs as Array<Record<string, unknown>>) {
      for (const key of FABRICATED_KEYS) {
        assert.equal(org[key], undefined);
      }
    }
  });
});

test("overview aggregate counts each org's own users only — sum equals the per-tenant sum", async () => {
  // Prova a semântica de agregação (a mesma do caminho Prisma): userCount de uma org conta SÓ os
  // usuários dela; totalUsers = Σ das orgs; nenhuma contaminação cruzada entre 3 organizações.
  const repository = new InMemoryPlatformOverviewRepository([
    {
      id: "org-a",
      name: "Org A",
      slug: "org-a",
      status: "active",
      modules: ["dashboard", "users"],
      userIds: ["a-1", "a-2", "a-3"],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "org-b",
      name: "Org B",
      slug: "org-b",
      status: "inactive",
      modules: ["dashboard"],
      userIds: ["b-1", "b-2"],
    },
    {
      id: "org-c",
      name: "Org C",
      status: "active",
      userIds: [],
    },
  ]);

  const overview = await repository.getOverview();

  assert.equal(overview.totalOrgs, 3);
  assert.equal(overview.activeOrgs, 2);
  assert.equal(overview.totalUsers, 5);

  const orgA = overview.orgs.find((org) => org.id === "org-a");
  const orgB = overview.orgs.find((org) => org.id === "org-b");
  const orgC = overview.orgs.find((org) => org.id === "org-c");

  assert.equal(orgA?.userCount, 3);
  assert.equal(orgA?.moduleCount, 2);
  assert.equal(orgB?.userCount, 2);
  assert.equal(orgC?.userCount, 0);

  // Σ dos userCount por org bate com totalUsers → sem contagem cruzada.
  const summed = overview.orgs.reduce((total, org) => total + org.userCount, 0);
  assert.equal(summed, overview.totalUsers);
});

test("overview aggregate is an honest empty result with no data", async () => {
  const overview = await new InMemoryPlatformOverviewRepository().getOverview();

  assert.deepEqual(overview, {
    activeOrgs: 0,
    totalOrgs: 0,
    totalUsers: 0,
    orgs: [],
  });
});

async function withPlatformApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const { createApp } = await import("../src/app.js");
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const app = createApp(new MemoryCoreSaasAdapter(service));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback(baseUrl);
  } finally {
    await closeServer(server);
  }
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    readonly headers?: Record<string, string>;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
