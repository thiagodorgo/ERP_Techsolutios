import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import net, { type Socket } from "node:net";
import test from "node:test";

import { ClamAvEvidenceScanner } from "../src/modules/evidence/clamav-scanner.js";

test("fio contém somente INSTREAM e bytes, nunca identidade ou segredo", async () => {
  const canary = `AVREAL_CANARY_${randomUUID()}`;
  const payload = Buffer.from("safe-payload");
  const received: Buffer[] = [];
  const sockets = new Set<Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("data", (part) => {
      received.push(Buffer.from(part));
      if (Buffer.concat(received).subarray(-4).equals(Buffer.alloc(4))) socket.end("stream: OK\0");
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  try {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port: address.port });
    assert.equal(
      (
        await scanner.scan({
          tenantId: canary,
          evidenceId: canary,
          clientEvidenceId: canary,
          mimeType: "image/png",
          sizeBytes: payload.length,
          checksumSha256: createHash("sha256").update(payload).digest("hex"),
          buffer: payload,
        })
      ).status,
      "clean",
    );
    const wire = Buffer.concat(received);
    assert.equal(wire.includes(Buffer.from(canary)), false);
    assert.equal(wire.includes(Buffer.from("JWT_SECRET")), false);
    assert.equal(wire.subarray(0, 10).toString("latin1"), "zINSTREAM\0");
    assert.equal(wire.includes(payload), true);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("resposta bruta nunca aparece em reason nem em console", async () => {
  const canary = `AVREAL_CANARY_${randomUUID()}`;
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  const server = net.createServer((socket) => {
    let received = Buffer.alloc(0);
    socket.on("data", (part) => {
      received = Buffer.concat([received, part]);
      if (received.subarray(-4).equals(Buffer.alloc(4))) socket.end(`stream: ${canary}\0`);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  try {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port: address.port });
    const buffer = Buffer.from("x");
    const result = await scanner.scan({
      tenantId: canary,
      evidenceId: canary,
      clientEvidenceId: canary,
      mimeType: "image/png",
      sizeBytes: 1,
      checksumSha256: createHash("sha256").update(buffer).digest("hex"),
      buffer,
    });
    assert.equal(result.status, "failed");
    assert.equal(JSON.stringify(result).includes(canary), false);
    assert.equal(JSON.stringify(warnings).includes(canary), false);
  } finally {
    console.warn = originalWarn;
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
