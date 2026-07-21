import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { attachAuthenticatedActor, signAccessToken } from "../src/modules/auth/index.js";
import {
  InMemoryPlatformTenantDetailRepository,
  type InMemoryPlatformTenantDetailSeed,
} from "../src/modules/platform/platform-tenant-detail.repository.js";
import { PlatformTenantDetailService } from "../src/modules/platform/platform-tenant-detail.service.js";
import { createPlatformRouter } from "../src/modules/platform/platform.routes.js";

// Metadados/indicadores que este endpoint NÃO tem fonte para (não fabricar) — provamos a ausência (§2.8).
const FORBIDDEN_KEYS = ["mrr", "uptime", "health", "apiCalls", "storageGb", "secret", "token", "tenant_id"];

const SEEDS: readonly InMemoryPlatformTenantDetailSeed[] = [
  {
    id: "org-a",
    name: "Organização A",
    slug: "org-a",
    status: "active",
    modules: ["dashboard", "users"],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    users: [
      { name: "Ana Admin", email: "ana@org-a.example.com", roles: ["tenant_admin"], status: "active" },
      { name: "Bruno Finan", email: "bruno@org-a.example.com", roles: ["finance", "manager"], status: "inactive" },
    ],
  },
  {
    id: "org-b",
    name: "Organização B",
    slug: "org-b",
    status: "inactive",
    modules: ["dashboard"],
    users: [{ name: "Carla B", email: "carla@org-b.example.com", roles: ["tenant_admin"], status: "active" }],
  },
];

test("GET /platform/tenants/:id/detail returns the real org detail to a platform actor (a)", async () => {
  await withSeededPlatformApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/tenants/org-a/detail", {
      headers: { "x-user-id": "usr_platform", "x-role": "super_admin" },
    });

    assert.equal(response.status, 200);
    // Contrato para o front: { data: { id, name, status, moduleCount, modules:[], users:[] } }.
    assert.equal(response.body.data.id, "org-a");
    assert.equal(typeof response.body.data.name, "string");
    assert.equal(response.body.data.status, "active");
    assert.equal(Array.isArray(response.body.data.modules), true);
    assert.equal(Array.isArray(response.body.data.users), true);
    // moduleCount = módulos HABILITADOS (2), enquanto o catálogo completo é maior.
    assert.equal(response.body.data.moduleCount, 2);
    assert.equal(response.body.data.modules.length > response.body.data.moduleCount, true);

    const dashboard = response.body.data.modules.find((m: { key: string }) => m.key === "dashboard");
    assert.equal(dashboard.enabled, true);
    assert.equal(typeof dashboard.label, "string");
    const disabled = response.body.data.modules.find((m: { enabled: boolean }) => m.enabled === false);
    assert.notEqual(disabled, undefined);

    // Usuários DA org (PII by-design), com rótulo PT-BR do papel (§3) — nunca termo técnico.
    assert.equal(response.body.data.users.length, 2);
    const ana = response.body.data.users.find((u: { email: string }) => u.email === "ana@org-a.example.com");
    assert.equal(ana.roleLabel, "Administrador");
    const bruno = response.body.data.users.find((u: { email: string }) => u.email === "bruno@org-a.example.com");
    assert.equal(bruno.roleLabel, "Financeiro · Gestor Operacional");
    assert.equal(bruno.status, "inactive");
  });
});

test("GET /platform/tenants/:id/detail is rejected for a non-platform role — 403 (b)", async () => {
  await withSeededPlatformApi(async (baseUrl) => {
    const tenantAdminToken = await signAccessToken({
      user_id: "usr_tenant_admin_jwt",
      tenant_id: "org-a",
      email: "admin@org-a.example.com",
      roles: ["tenant_admin"],
    });
    const managerToken = await signAccessToken({
      user_id: "usr_manager_jwt",
      tenant_id: "org-a",
      email: "manager@org-a.example.com",
      roles: ["manager"],
    });

    // Papel de tenant (mesmo o admin da própria org) NÃO alcança o endpoint de plataforma.
    for (const token of [tenantAdminToken, managerToken]) {
      const denied = await requestJson(baseUrl, "/api/v1/platform/tenants/org-a/detail", {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(denied.status, 403);
      assert.equal(denied.body.error.reason, "platform_permission_required");
      assert.equal(denied.body.data, undefined);
    }
  });
});

test("GET /platform/tenants/:id/detail is unreachable without a valid credential — 401/403 (c)", async () => {
  await withSeededPlatformApi(async (baseUrl) => {
    // Sem credencial alguma → 403 (o gate de plataforma exige um ator); nunca vaza o detalhe.
    const missingActor = await requestJson(baseUrl, "/api/v1/platform/tenants/org-a/detail");
    assert.equal(missingActor.status, 403);
    assert.equal(missingActor.body.error.reason, "platform_actor_required");
    assert.equal(missingActor.body.data, undefined);

    // Token forjado → 401 INVALID_TOKEN antes de qualquer fallback.
    const invalidToken = await requestJson(baseUrl, "/api/v1/platform/tenants/org-a/detail", {
      headers: { authorization: "Bearer invalid.token.value" },
    });
    assert.equal(invalidToken.status, 401);
    assert.equal(invalidToken.body.error.code, "INVALID_TOKEN");
    assert.equal(invalidToken.body.data, undefined);
  });
});

test("GET /platform/tenants/:id/detail returns 404 for an org that does not exist (d)", async () => {
  await withSeededPlatformApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/tenants/does-not-exist/detail", {
      headers: { "x-user-id": "usr_platform", "x-role": "super_admin" },
    });

    assert.equal(response.status, 404);
    assert.equal(response.body.error.reason, "platform_tenant_not_found");
    assert.equal(response.body.data, undefined);
  });
});

test("GET /platform/tenants/:id/detail never leaks fabricated/secret fields (§2.8) (e)", async () => {
  await withSeededPlatformApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/tenants/org-a/detail", {
      headers: { "x-user-id": "usr_platform", "x-role": "super_admin" },
    });

    assert.equal(response.status, 200);

    // Chaves do detalhe são EXATAMENTE a allowlist — sem mrr/uptime/health nem qualquer segredo.
    assert.deepEqual(
      Object.keys(response.body.data).sort(),
      ["createdAt", "id", "moduleCount", "modules", "name", "slug", "status", "users"],
    );
    for (const key of FORBIDDEN_KEYS) {
      assert.equal(response.body.data[key], undefined);
    }

    // Cada módulo só carrega {key,label,enabled}.
    for (const module of response.body.data.modules as Array<Record<string, unknown>>) {
      assert.deepEqual(Object.keys(module).sort(), ["enabled", "key", "label"]);
    }

    // Cada usuário só carrega {name,email,roleLabel?,status} — sem roles técnicos crus, sem tenant_id/secret.
    for (const user of response.body.data.users as Array<Record<string, unknown>>) {
      const keys = Object.keys(user).sort();
      assert.equal(keys.every((key) => ["email", "name", "roleLabel", "status"].includes(key)), true);
      for (const key of FORBIDDEN_KEYS) {
        assert.equal(user[key], undefined);
      }
      assert.equal(user.roles, undefined);
    }
  });
});

test("detail memory repo is an honest null for any id when empty", async () => {
  const detail = await new InMemoryPlatformTenantDetailRepository().getDetail("org-a");

  assert.equal(detail, null);
});

test("detail isolation: getDetail(A) returns only A's users, never B's (per-org by construction)", async () => {
  const repository = new InMemoryPlatformTenantDetailRepository(SEEDS);

  const orgA = await repository.getDetail("org-a");
  const orgB = await repository.getDetail("org-b");

  assert.notEqual(orgA, null);
  assert.notEqual(orgB, null);

  // A só vê os e-mails de A; B só vê os de B — nenhuma contaminação cruzada.
  const emailsA = orgA?.users.map((user) => user.email) ?? [];
  const emailsB = orgB?.users.map((user) => user.email) ?? [];
  assert.deepEqual(emailsA.sort(), ["ana@org-a.example.com", "bruno@org-a.example.com"]);
  assert.deepEqual(emailsB, ["carla@org-b.example.com"]);
  assert.equal(emailsA.includes("carla@org-b.example.com"), false);

  // moduleCount = habilitados; o catálogo completo é sempre o mesmo tamanho para ambas as orgs.
  assert.equal(orgA?.moduleCount, 2);
  assert.equal(orgB?.moduleCount, 1);
  assert.equal(orgA?.modules.length, orgB?.modules.length);
  assert.equal(orgA?.modules.find((module) => module.key === "users")?.enabled, true);
  assert.equal(orgB?.modules.find((module) => module.key === "users")?.enabled, false);
});

async function withSeededPlatformApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const detailService = new PlatformTenantDetailService(new InMemoryPlatformTenantDetailRepository(SEEDS));

  const app = express();
  app.use(express.json());
  // Mesma composição de app.ts: /api/v1/platform sob attachAuthenticatedActor(); resolver de detalhe
  // injetado (4º parâmetro de createPlatformRouter, como o overview injeta o dele).
  app.use(
    "/api/v1/platform",
    attachAuthenticatedActor(),
    createPlatformRouter(undefined, undefined, undefined, () => Promise.resolve(detailService)),
  );

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
  options: { readonly headers?: Record<string, string> } = {},
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
