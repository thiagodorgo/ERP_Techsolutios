import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import net, { type Server, type Socket } from "node:net";
import test from "node:test";

import { ClamAvEvidenceScanner } from "../src/modules/evidence/clamav-scanner.js";

function input() {
  const buffer = Buffer.from("safe");
  return {
    tenantId: "tenant",
    evidenceId: "evidence",
    clientEvidenceId: "client",
    mimeType: "image/png",
    sizeBytes: buffer.length,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    buffer,
  };
}

async function withClamd<T>(
  version: (call: number) => string | undefined,
  run: (port: number, counts: { version: number; scan: number }) => Promise<T>,
): Promise<T> {
  const counts = { version: 0, scan: 0 };
  const sockets = new Set<Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.once("data", (first) => {
      if (first.toString("latin1").startsWith("zVERSION\0")) {
        counts.version += 1;
        const response = version(counts.version);
        if (response === undefined) socket.destroy();
        else socket.end(`${response}\0`);
        return;
      }
      counts.scan += 1;
      let pending = first;
      const consume = (part?: Buffer) => {
        if (part) pending = Buffer.concat([pending, part]);
        if (pending.subarray(-4).equals(Buffer.alloc(4))) socket.end("stream: OK\0");
      };
      consume();
      socket.on("data", (part) => consume(part));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  try {
    return await run(address.port, counts);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function versionAt(date: Date): string {
  return `ClamAV 1.4.6/27890/${date.toUTCString()}`;
}

test("VERSION fresco aprova e cacheia por 60 segundos", async () => {
  let now = Date.UTC(2026, 9, 30, 12);
  await withClamd(() => versionAt(new Date(now - 60 * 60 * 1000)), async (port, counts) => {
    const scanner = new ClamAvEvidenceScanner({
      host: "127.0.0.1",
      port,
      maxDbAgeHours: 72,
      now: () => now,
    });
    assert.equal((await scanner.scan(input())).status, "clean");
    now += 59_000;
    assert.equal((await scanner.scan(input())).status, "clean");
    assert.deepEqual(counts, { version: 1, scan: 2 });
  });
});

test("VERSION velho falha fechado", async () => {
  const now = Date.UTC(2026, 9, 30, 12);
  await withClamd(() => versionAt(new Date(now - 73 * 60 * 60 * 1000)), async (port, counts) => {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port, maxDbAgeHours: 72, now: () => now });
    assert.deepEqual(await scanner.scan(input()), { status: "failed", reason: "signatures_stale" });
    assert.equal(counts.scan, 0);
  });
});

for (const bad of ["ClamAV 1.4.6/27890/sem-data", undefined]) {
  test(`VERSION inválido/erro falha como signatures_unknown: ${String(bad)}`, async () => {
    await withClamd(() => bad, async (port, counts) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port, maxDbAgeHours: 72 });
      assert.deepEqual(await scanner.scan(input()), { status: "failed", reason: "signatures_unknown" });
      assert.equal(counts.scan, 0);
    });
  });
}

test("erro ao renovar não reutiliza o último VERSION bom", async () => {
  let now = Date.UTC(2026, 9, 30, 12);
  await withClamd(
    (call) => (call === 1 ? versionAt(new Date(now - 60 * 60 * 1000)) : undefined),
    async (port, counts) => {
      const scanner = new ClamAvEvidenceScanner({
        host: "127.0.0.1",
        port,
        maxDbAgeHours: 72,
        now: () => now,
      });
      assert.equal((await scanner.scan(input())).status, "clean");
      now += 61_000;
      assert.deepEqual(await scanner.scan(input()), { status: "failed", reason: "signatures_unknown" });
      assert.deepEqual(counts, { version: 2, scan: 1 });
    },
  );
});
