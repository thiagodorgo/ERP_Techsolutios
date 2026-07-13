import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// Ω-INFRA-1 — liveness (/health, estável, sem I/O) + readiness (/health/ready, ping Postgres+Redis).

async function withApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

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

test("/health é liveness estável (200, status ok, version/commit, sem I/O)", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "erp-techsolutions-api");
    assert.equal(typeof body.version, "string");
    assert.equal(typeof body.commit, "string");
    assert.equal(typeof body.timestamp, "string");
    // Liveness não expõe checagem de dependência nem dado sensível.
    assert.equal("checks" in body, false);
  });
});

test("/health/ready faz checagem profunda (ping Postgres+Redis) sem vazar dado sensível", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health/ready`);
    const body = (await response.json()) as {
      status: string;
      checks: { postgres: { status: string }; redis: { status: string } };
    };

    // Env-robusto: com Postgres+Redis de pé → 200/ready; sem eles → 503/not_ready. Sempre a mesma forma.
    assert.ok(response.status === 200 || response.status === 503);
    assert.ok(body.status === "ready" || body.status === "not_ready");
    assert.ok(["up", "down"].includes(body.checks.postgres.status));
    assert.ok(["up", "down"].includes(body.checks.redis.status));

    const ready = body.checks.postgres.status === "up" && body.checks.redis.status === "up";
    assert.equal(response.status, ready ? 200 : 503);
    assert.equal(body.status, ready ? "ready" : "not_ready");

    // §2.8 — nunca vazar URL/credencial/host da dependência.
    const raw = JSON.stringify(body);
    for (const secret of ["postgresql://", "redis://", "password", "@localhost", "DATABASE_URL"]) {
      assert.equal(raw.includes(secret), false, `readiness não pode conter "${secret}"`);
    }
  });
});

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
