import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import net, { type Socket } from "node:net";
import test from "node:test";

import { ClamAvEvidenceScanner } from "../src/modules/evidence/clamav-scanner.js";

test("fio contém somente INSTREAM e bytes, nunca identidade ou segredo", async () => {
  const canary = `AVREAL_CANARY_${randomUUID()}`;
  const canaryJwt = `AVREAL_JWT_${randomUUID()}`;
  const previousJwt = process.env.JWT_SECRET;
  process.env.JWT_SECRET = canaryJwt;
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
    assert.equal(wire.includes(Buffer.from(canaryJwt)), false);
    assert.equal(wire.includes(Buffer.from("JWT_SECRET")), false);
    assert.equal(wire.subarray(0, 10).toString("latin1"), "zINSTREAM\0");
    assert.equal(wire.includes(payload), true);
  } finally {
    if (previousJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwt;
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("nada do processo vaza: log pino real, detail, fio e JWT por valor", async () => {
  const canary = `AVREAL_CANARY_${randomUUID()}`;
  const canaryJwt = `AVREAL_JWT_${randomUUID()}`;
  const variants = [
    `stream: ${canary} FOUND\0`,
    `stream: ${canary}\0`,
    `stream: Heuristics.Limits.Exceeded.MaxFileSize FOUND\0`,
  ] as const;

  const childScript = `
import('./src/modules/evidence/upload-gate.ts').then(async (g) => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  try {
    await g.verifyUploadContent({
      via: 'V1',
      buffer: png,
      declaredMimeType: 'image/png',
      allowedMimeTypes: ['image/png'],
      scan: { tenantId: 'tenant-fixo', evidenceId: '${canary}', clientEvidenceId: '${canary}' },
    });
    console.log('__GATE__ ' + JSON.stringify({ kind: 'NONE' }));
  } catch (error) {
    console.log('__GATE__ ' + JSON.stringify({
      kind: error.kind,
      status: g.uploadGateStatus(error.kind),
      detail: error.detail,
      raw: error,
    }));
  }
  process.exit(0);
});`;

  for (const reply of variants) {
    const wireChunks: Buffer[] = [];
    const server = net.createServer((socket) => {
      socket.on("error", () => undefined);
      socket.on("data", (part) => {
        wireChunks.push(Buffer.from(part));
        if (Buffer.concat(wireChunks).subarray(-4).equals(Buffer.alloc(4))) {
          socket.end(reply);
        }
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    assert(address && typeof address !== "string");

    try {
      let stdout = "";
      let stderr = "";
      const exitCode = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ["--import", "tsx", "--input-type=module", "-e", childScript],
          {
            cwd: process.cwd(),
            env: {
              ...process.env,
              NODE_ENV: "test",
              LOG_LEVEL: "info",
              EVIDENCE_SCANNER: "clamav",
              CLAMAV_HOST: "127.0.0.1",
              CLAMAV_PORT: String(address.port),
              JWT_SECRET: canaryJwt,
            },
          },
        );
        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString("utf8");
        });
        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString("utf8");
        });
        child.once("error", reject);
        child.once("close", (code) => resolve(code));
      });

      assert.equal(exitCode, 0, stderr);
      const allOutput = stdout + stderr;
      assert.equal(allOutput.includes(canary), false, `canário vazou em stdout/stderr (${reply})`);
      assert.equal(allOutput.includes(canaryJwt), false, `JWT vazou em stdout/stderr (${reply})`);
      assert.equal(allOutput.includes("stream:"), false, `resposta bruta vazou em stdout/stderr (${reply})`);

      const lines = stdout.split(/\r?\n/).filter(Boolean);
      const gateLine = lines.find((line) => line.startsWith("__GATE__ "));
      assert.ok(gateLine, `linha __GATE__ ausente (${reply})`);
      const gatePayload = JSON.parse(gateLine.slice("__GATE__ ".length)) as {
        kind: string;
        status: number;
        detail: string;
      };
      assert.equal(gatePayload.detail.includes(canary), false, `canário vazou em error.detail (${reply})`);

      const pinoLines = lines.filter((line) => line.includes('"msg":"upload rejected by content gate"'));
      assert.equal(pinoLines.length, 1, `esperava 1 linha pino do gate, veio ${pinoLines.length}`);

      const wire = Buffer.concat(wireChunks);
      assert.equal(wire.subarray(0, 10).toString("latin1"), "zINSTREAM\0");
      assert.equal(wire.subarray(-4).equals(Buffer.alloc(4)), true);
      assert.equal(wire.includes(Buffer.from(canary)), false, `canário vazou no fio (${reply})`);
      assert.equal(wire.includes(Buffer.from(canaryJwt)), false, `JWT vazou no fio (${reply})`);
    } finally {
      server.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  }
});
