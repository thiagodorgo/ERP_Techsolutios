import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

test("rota de summary de cloud charges foi retirada", async () => {
  await expectStandardNotFound("GET", "/api/v1/platform/cloud-charges/summary");
});

test("rota de regras de cloud charges foi retirada", async () => {
  await expectStandardNotFound("POST", "/api/v1/platform/cloud-charge-rules");
});

async function expectStandardNotFound(method: string, path: string): Promise<void> {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createApp } = await import("../src/app.js");
  const server = createApp().listen(0);
  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-user-id": "usr-ass01", "x-role": "super_admin" },
      body: method === "GET" ? undefined : "{}",
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: "NOT_FOUND", reason: "route_not_found", message: "Route not found." },
    });
  } finally {
    await closeServer(server);
  }
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
