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

async function request(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`, { headers: PLATFORM_HEADERS });
  return { status: response.status, body: await response.json() as any };
}

async function baseUrlOf(server: Server): Promise<string> {
  if (!server.listening) await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}
