import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import type { Server } from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ClamAvEvidenceScanner } from "../src/modules/evidence/clamav-scanner.js";
import {
  resetEvidenceScannerForTests,
  resolveEvidenceScanner,
} from "../src/modules/evidence/evidence-scanner.factory.js";
import { PNG_BYTES } from "./helpers/upload-fixtures.js";

const host = process.env.AVREAL_CLAMAV_HOST;
const port = Number(process.env.AVREAL_CLAMAV_PORT ?? "3310");
const limitsPort = Number(process.env.AVREAL_CLAMAV_LIMITS_PORT ?? "0");
const mode = process.env.AVREAL_CLAMAV_MODE ?? "healthy";

function input(buffer: Buffer) {
  return {
    tenantId: "tenant-integration-canary",
    evidenceId: "evidence-integration-canary",
    clientEvidenceId: "client-integration-canary",
    mimeType: "application/octet-stream",
    sizeBytes: buffer.length,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    buffer,
  };
}

function command(commandBytes: string, targetPort = port): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: host!, port: targetPort });
    let response = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`timeout no comando ${commandBytes}`));
    }, 5_000);
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      socket.destroy();
      if (error) reject(error);
      else resolve(response.toString("utf8").replace(/\0$/, "").trim());
    };
    socket.once("connect", () => socket.write(Buffer.from(`z${commandBytes}\0`, "latin1")));
    socket.on("data", (part) => {
      response = Buffer.concat([response, part]);
      if (response.includes(0)) finish();
    });
    socket.once("error", finish);
    socket.once("end", () => {
      if (!response.includes(0)) finish(new Error("resposta sem terminador NUL"));
    });
  });
}

if (!host) {
  test("integração clamd requer AVREAL_CLAMAV_HOST", { skip: "endpoint clamd não informado" }, () => {});
} else if (mode === "unavailable") {
  test("pane do daemon falha fechado dentro do prazo", async () => {
    const scanner = new ClamAvEvidenceScanner({
      host,
      port,
      connectTimeoutMs: 500,
      scanTimeoutMs: 1_500,
    });
    const startedAt = Date.now();
    const result = await scanner.scan(input(Buffer.from("arquivo durante pane")));
    assert.equal(result.status, "failed");
    assert(Date.now() - startedAt < 2_500);
  });
} else {
  test("PING real responde PONG", async () => {
    assert.equal(await command("PING"), "PONG");
  });

  test("VERSION real tem versão, base e data parseável", async () => {
    const version = await command("VERSION");
    const match = /^ClamAV [^/]+\/[^/]+\/(.+)$/.exec(version);
    assert(match, `VERSION inesperada: ${version}`);
    assert.equal(Number.isFinite(Date.parse(match[1]!)), true, `data inválida: ${match[1]}`);
  });

  test("arquivo limpo real é aprovado", async () => {
    const scanner = new ClamAvEvidenceScanner({ host, port, maxDbAgeHours: 0 });
    assert.deepEqual(await scanner.scan(input(Buffer.from("arquivo limpo do ERP\n"))), {
      status: "clean",
    });
  });

  test("EICAR gerado em memória é detectado", async () => {
    const eicar = Buffer.from(
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
      "ascii",
    );
    resetEvidenceScannerForTests();
    assert.equal((await resolveEvidenceScanner().scan(input(eicar))).status, "infected");
  });

  test("saturação N+1 recusa sem fila e a vaga volta", async () => {
    const scanner = new ClamAvEvidenceScanner({
      host,
      port,
      maxConcurrentScans: 1,
      maxDbAgeHours: 0,
    });
    const large = input(Buffer.alloc(16 * 1024 * 1024, 0x41));
    const first = scanner.scan(large);
    const second = await scanner.scan(input(Buffer.from("concorrente")));
    assert.deepEqual(second, { status: "failed", reason: "scanner_busy" });
    assert.equal((await first).status, "clean");
    assert.equal((await scanner.scan(input(Buffer.from("depois")))).status, "clean");
  });

  if (limitsPort > 0) {
    test("limite real de MaxFileSize vira infected/scan_limit_exceeded", async () => {
      const scanner = new ClamAvEvidenceScanner({
        host,
        port: limitsPort,
        streamMaxBytes: 8 * 1024 * 1024,
        maxDbAgeHours: 0,
      });
      assert.deepEqual(await scanner.scan(input(Buffer.alloc(1536 * 1024, 0x41))), {
        status: "infected",
        reason: "scan_limit_exceeded",
      });
    });

    test("limite real de INSTREAM falha fechado", async () => {
      const scanner = new ClamAvEvidenceScanner({
        host,
        port: limitsPort,
        streamMaxBytes: 8 * 1024 * 1024,
        maxDbAgeHours: 0,
      });
      assert.deepEqual(await scanner.scan(input(Buffer.alloc(4 * 1024 * 1024, 0x41))), {
        status: "failed",
        reason: "stream_limit_misconfigured",
      });
    });

    test("HTTP real mobile entrega 201 limpo e 422 para PNG detectável", async () => {
      const infectedPng = Buffer.concat([
        PNG_BYTES,
        Buffer.from("ERP_AVREAL_TEST_SIGNATURE_2026", "ascii"),
      ]);
      const direct = new ClamAvEvidenceScanner({ host, port, maxDbAgeHours: 0 });
      assert.equal((await direct.scan(input(infectedPng))).status, "infected");
      await withMobileUploadApi(async (upload) => {
        assert.equal((await upload(PNG_BYTES)).status, 201);
        const infected = await upload(infectedPng);
        assert.equal(infected.status, 422, JSON.stringify(infected.body));
        assert.equal(infected.body?.error?.reason, "evidence_rejected");
      });
    });
  }
}

async function withMobileUploadApi(
  run: (upload: (bytes: Buffer) => Promise<{ status: number; body: any }>) => Promise<void>,
): Promise<void> {
  const evidenceRoot = path.join(os.tmpdir(), `erp-avreal-http-${process.pid}`);
  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    scannerFactory,
    workOrders,
    mobileEvidence,
    mobileSync,
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/evidence/evidence-scanner.factory.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/mobile/mobile-evidence-upload.js"),
    import("../src/modules/mobile/mobile-evidence-sync.js"),
  ]);
  scannerFactory.resetEvidenceScannerForTests();
  workOrders.resetWorkOrderRuntimeForTests();
  (mobileSync as { resetMobileEvidenceSyncStateForTests?: () => void }).resetMobileEvidenceSyncStateForTests?.();
  mobileEvidence.configureMobileEvidenceUploadStorageForTests(evidenceRoot);
  await mobileEvidence.resetMobileEvidenceUploadRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "AV real", modules: ["dashboard", "work_orders"] });
  const user = core.createUser({
    tenantId: tenant.id,
    name: "Admin AV",
    email: `avreal-${Date.now()}@example.com`,
    roles: ["tenant_admin"],
  });
  const authHeaders = {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": "tenant_admin",
  };
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const upload = async (bytes: Buffer) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const clientEvidenceId = `avreal-${suffix}`;
    const evidenceId = `evidence:${tenant.id}:${clientEvidenceId}`;
    const workOrder = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders,
      body: { title: "OS AV real", customerName: "Cliente", serviceAddress: "Rua Teste, 1" },
    });
    assert.equal(workOrder.status, 201, JSON.stringify(workOrder.body));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const receipt = await requestJson(baseUrl, "/api/v1/mobile/sync/evidence-actions", {
      method: "POST",
      headers: authHeaders,
      body: {
        client_batch_id: `batch-${suffix}`,
        actions: [{
          client_evidence_id: clientEvidenceId,
          type: "evidence.work_order_photo",
          local_created_at: "2026-10-31T12:00:00.000Z",
          payload: {
            work_order_id: workOrder.body.data.id,
            kind: "photo",
            file_name: "foto.png",
            content_type: "image/png",
            size_bytes: bytes.length,
            sha256,
          },
        }],
      },
    });
    assert.equal(receipt.status, 200, JSON.stringify(receipt.body));
    const form = new FormData();
    form.set("evidence_id", evidenceId);
    form.set("client_evidence_id", clientEvidenceId);
    form.set("sha256", sha256);
    form.set("size_bytes", String(bytes.length));
    form.set("content_type", "image/png");
    form.set("file", new Blob([bytes], { type: "image/png" }), "foto.png");
    const response = await fetch(`${baseUrl}/api/v1/mobile/evidence-uploads`, {
      method: "POST",
      headers: authHeaders,
      body: form,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };

  try {
    await run(upload);
  } finally {
    await closeServer(server);
    scannerFactory.resetEvidenceScannerForTests();
    workOrders.resetWorkOrderRuntimeForTests();
    (mobileSync as { resetMobileEvidenceSyncStateForTests?: () => void }).resetMobileEvidenceSyncStateForTests?.();
    await mobileEvidence.resetMobileEvidenceUploadRuntimeForTests();
    await rm(evidenceRoot, { recursive: true, force: true });
  }
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: { method: string; headers: Record<string, string>; body: unknown },
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method,
    headers: { "content-type": "application/json", ...options.headers },
    body: JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
