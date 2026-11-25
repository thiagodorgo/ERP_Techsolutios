import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("leilao-deserto-db exige DATABASE_URL", { skip: "Defina DATABASE_URL para executar a suíte -db." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL ??= "silent";

  const { app } = await import("../src/app.js");

  async function withApp(callback: (baseUrl: string) => Promise<void>): Promise<void> {
    const server: Server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      await callback(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  }

  test("LD1-db · a rota de leilão sem lance alcança o serviço Prisma e preserva 404 tenant-scoped", async () => {
    const tenantId = randomUUID();
    const processId = randomUUID();
    await withApp(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/impound-processes/${processId}/auction/deserted`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": "manager" },
        body: JSON.stringify({ round_number: 1, custody_seq: 0 }),
      });
      const body = (await response.json()) as { error?: { reason?: string } };
      assert.deepEqual({ http: response.status, reason: body.error?.reason }, { http: 404, reason: "process_not_found" });
    });
  });
}
