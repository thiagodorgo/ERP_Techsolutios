import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { JOB_NAMES } from "../src/infra/jobs/job.types.js";
import { getDefaultJobRegistry, resetDefaultJobRegistryForTests } from "../src/infra/jobs/job.registry.js";

const routes = [
  ["GET", "/api/v1/platform/cloud-charge-rules"],
  ["POST", "/api/v1/platform/cloud-charge-rules"],
  ["GET", "/api/v1/platform/cloud-charge-rules/rule-ass01"],
  ["PATCH", "/api/v1/platform/cloud-charge-rules/rule-ass01"],
  ["GET", "/api/v1/platform/cloud-charges/calculation-runs"],
  ["POST", "/api/v1/platform/cloud-charges/calculation-runs"],
  ["GET", "/api/v1/platform/cloud-charges/calculation-runs/run-ass01"],
  ["GET", "/api/v1/platform/cloud-charges/calculation-runs/run-ass01/tenant-charges"],
  ["GET", "/api/v1/platform/cloud-charges/summary"],
] as const;

for (const [method, path] of routes) {
  test(`ASS-01 ${method} ${path} responde 404 padrao`, async () => {
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
        error: { code: "NOT_FOUND", message: "Route not found.", reason: "route_not_found" },
      });
    } finally {
      await closeServer(server);
    }
  });
}

test("ASS-01 nome do job cloud-charges.calculate foi retirado", () => {
  assert.equal(JOB_NAMES.includes("cloud-charges.calculate" as never), false);
});

test("ASS-01 registry nao resolve cloud-charges.calculate", () => {
  resetDefaultJobRegistryForTests();
  assert.equal(getDefaultJobRegistry().get("cloud-charges.calculate" as never), undefined);
  resetDefaultJobRegistryForTests();
});

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
