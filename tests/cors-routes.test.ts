import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// P-SAN-CORS (Ω-INFRA-3) — prova de integração no express: com CORS_ORIGIN allowlist, a origem
// permitida é refletida no Access-Control-Allow-Origin e a proibida NÃO é (nem "*"). O env é
// singleton (parseado no 1º import), então CORS_ORIGIN é setado ANTES do import dinâmico do app.

const ALLOWED_ORIGIN = "https://app.allowed.example";
const FORBIDDEN_ORIGIN = "https://evil.example";

async function withApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  // Allowlist restritiva (não-vazia) — força o ramo `origin: [...]` do app.ts mesmo em NODE_ENV=test.
  process.env.CORS_ORIGIN = ALLOWED_ORIGIN;

  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);

  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await closeServer(server);
  }
}

test("origem PERMITIDA é refletida no Access-Control-Allow-Origin", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { origin: ALLOWED_ORIGIN },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN);
  });
});

test("origem PROIBIDA não é refletida (nem curinga '*')", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { origin: FORBIDDEN_ORIGIN },
    });
    // O request HTTP ainda responde 200 (CORS é enforcement do browser); mas o servidor NÃO autoriza
    // a origem proibida — o cabeçalho fica ausente (ou, no mínimo, nunca vale a origem proibida/"*").
    const allowOrigin = response.headers.get("access-control-allow-origin");
    assert.notEqual(allowOrigin, FORBIDDEN_ORIGIN);
    assert.notEqual(allowOrigin, "*");
  });
});

test("preflight OPTIONS de origem proibida não autoriza a origem", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      method: "OPTIONS",
      headers: {
        origin: FORBIDDEN_ORIGIN,
        "access-control-request-method": "GET",
      },
    });
    const allowOrigin = response.headers.get("access-control-allow-origin");
    assert.notEqual(allowOrigin, FORBIDDEN_ORIGIN);
    assert.notEqual(allowOrigin, "*");
  });
});

test("requisição sem Origin (server-to-server) segue servida normalmente", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
  });
});

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
