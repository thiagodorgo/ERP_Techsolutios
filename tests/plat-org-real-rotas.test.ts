import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { createApp } from "../src/app.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";

const PLATFORM_HEADERS = {
  "x-user-id": "usr_platform_test",
  "x-role": "super_admin",
} as const;

test("R1 — a lista de organizações em memória nasce vazia, sem cadastros fictícios", async () => {
  await withApi(async (baseUrl) => {
    const response = await request(baseUrl, "/api/v1/platform/tenants");

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(response.body.data, []);
  });
});

test("R5 — id que não é UUID recebe 404 sem consultar outro cadastro", async () => {
  await withApi(async (baseUrl) => {
    const response = await request(baseUrl, "/api/v1/platform/tenants/nao-e-uuid");

    assert.equal(response.status, 404, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "platform_tenant_not_found");
  });
});

test("R2/R4/R8 — criação usa UUID, campos imutáveis recusam e módulos seguem pela assinatura", async () => {
  await withApi(async (baseUrl) => {
    const created = await request(baseUrl, "/api/v1/platform/tenants", {
      method: "POST",
      body: { name: "Organização A", group: { name: "Grupo Teste A" } },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.match(created.body.data.organization.id, /^[0-9a-f-]{36}$/i);
    assert.equal(created.body.data.organization.id.startsWith("pten-"), false);

    for (const field of ["plan", "status", "slug"] as const) {
      const changed = await request(baseUrl, `/api/v1/platform/tenants/${created.body.data.organization.id}`, {
        method: "PATCH",
        body: { [field]: field === "plan" ? "starter" : field === "status" ? "suspended" : "forjado" },
      });
      assert.equal(changed.status, 422, `${field}: ${JSON.stringify(changed.body)}`);
      assert.equal(changed.body.error?.reason, "field_not_editable_here");
    }

    const modules = await request(baseUrl, `/api/v1/platform/tenants/${created.body.data.organization.id}/modules`, {
      method: "PATCH",
      body: { enabledModules: ["finance"] },
    });
    assert.equal(modules.status, 409, JSON.stringify(modules.body));
    assert.equal(modules.body.error?.reason, "module_change_requires_subscription");
  });
});

test("R3 — campos externos de autoridade são rejeitados pela lista fechada", async () => {
  await withApi(async (baseUrl) => {
    for (const field of ["slug", "status", "modules", "tenant_id"] as const) {
      const response = await request(baseUrl, "/api/v1/platform/tenants", {
        method: "POST",
        body: { name: "Organização B", group: { name: "Grupo Teste B" }, [field]: "forjado" },
      });
      assert.equal(response.status, 400, `${field}: ${JSON.stringify(response.body)}`);
      assert.equal(response.body.error?.reason, "unknown_field");
    }
  });
});

test("R6/R7 — as oito rotas falham fechadas para papel de organização e para chave ausente", async () => {
  await withApi(async (baseUrl) => {
    const paths = [
      ["GET", "/api/v1/platform/tenants"],
      ["POST", "/api/v1/platform/tenants"],
      ["GET", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111"],
      ["PATCH", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111"],
      ["PATCH", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/status"],
      ["GET", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/modules"],
      ["PATCH", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/modules"],
      ["POST", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/admin-user"],
    ] as const;
    for (const [method, path] of paths) {
      const tenantRole = await request(baseUrl, path, {
        method,
        headers: { "x-tenant-id": "11111111-1111-4111-8111-111111111111", "x-user-id": "usr_org", "x-role": "tenant_admin" },
        body: {},
      });
      assert.equal(tenantRole.status, 403, `${method} ${path}`);
      const noPermission = await request(baseUrl, path, {
        method,
        headers: { ...PLATFORM_HEADERS, "x-permissions": "" },
        body: {},
      });
      assert.equal(noPermission.status, 403, `${method} ${path}`);
    }
  });
});

test("R9 — o repositório Prisma reutiliza slug e contexto RLS canônicos", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/modules/platform/platform-organizations-prisma.repository.ts", import.meta.url), "utf8"));
  assert.match(source, /import\s*\{[^}]*createTenantSlug[^}]*\}\s*from/);
  assert.match(source, /import\s*\{[^}]*setTenantRlsContext[^}]*\}\s*from/);
  assert.doesNotMatch(source, /normalize\(["']NFD["']\)/);
});

async function withApi(run: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const server = createApp(new MemoryCoreSaasAdapter(core)).listen(0);
  try {
    await run(await baseUrlOf(server));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function request(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: { "content-type": "application/json", ...PLATFORM_HEADERS, ...options.headers },
    ...(options.body === undefined || options.method === "GET" || options.method === "HEAD"
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  return { status: response.status, body: await response.json() as any };
}

async function baseUrlOf(server: Server): Promise<string> {
  if (!server.listening) await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}
