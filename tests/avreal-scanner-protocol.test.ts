import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import net, { type Server, type Socket } from "node:net";
import test from "node:test";

import { ClamAvEvidenceScanner } from "../src/modules/evidence/clamav-scanner.js";

type ServerScenario = {
  readonly response?: Buffer;
  readonly respondBeforeTerminator?: boolean;
  readonly closeWithoutResponse?: boolean;
};

type CapturedRequest = {
  command: Buffer;
  chunks: Buffer[];
  terminatorReceived: boolean;
};

async function withFakeClamd<T>(
  scenario: ServerScenario,
  run: (port: number, captured: CapturedRequest) => Promise<T>,
): Promise<T> {
  const captured: CapturedRequest = { command: Buffer.alloc(0), chunks: [], terminatorReceived: false };
  const sockets = new Set<Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    let pending = Buffer.alloc(0);
    let commandRead = false;
    let replied = false;

    const reply = () => {
      if (replied) return;
      replied = true;
      if (scenario.closeWithoutResponse) {
        socket.end();
        return;
      }
      socket.end(scenario.response ?? Buffer.from("stream: OK\0"));
    };

    socket.on("data", (part) => {
      pending = Buffer.concat([pending, part]);
      if (!commandRead) {
        const commandEnd = pending.indexOf(0);
        if (commandEnd < 0) return;
        captured.command = pending.subarray(0, commandEnd + 1);
        pending = pending.subarray(commandEnd + 1);
        commandRead = true;
        if (scenario.respondBeforeTerminator) reply();
      }

      while (!scenario.respondBeforeTerminator && pending.length >= 4) {
        const size = pending.readUInt32BE(0);
        if (size === 0) {
          captured.terminatorReceived = true;
          pending = pending.subarray(4);
          reply();
          return;
        }
        if (pending.length < 4 + size) return;
        captured.chunks.push(Buffer.from(pending.subarray(4, 4 + size)));
        pending = pending.subarray(4 + size);
      }
    });
  });

  await listen(server);
  const address = server.address();
  assert(address && typeof address !== "string");
  let watchdog: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      run(address.port, captured),
      new Promise<never>((_resolve, reject) => {
        watchdog = setTimeout(() => reject(new Error("watchdog do servidor falso excedido")), 2_000);
      }),
    ]);
  } finally {
    if (watchdog) clearTimeout(watchdog);
    for (const socket of sockets) socket.destroy();
    await close(server);
  }
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function input(buffer: Buffer) {
  return {
    tenantId: "tenant-canary",
    evidenceId: "evidence-canary",
    clientEvidenceId: "client-canary",
    mimeType: "image/png",
    sizeBytes: buffer.length,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    buffer,
  };
}

for (const size of [0, 1, 64 * 1024, 64 * 1024 + 1, 1024 * 1024]) {
  test(`INSTREAM preserva bytes e framing para ${size} byte(s)`, async () => {
    const bytes = Buffer.alloc(size, 0xa5);
    await withFakeClamd({}, async (port, captured) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
      assert.deepEqual(await scanner.scan(input(bytes)), { status: "clean" });
      assert.equal(captured.command.toString("latin1"), "zINSTREAM\0");
      assert.equal(captured.terminatorReceived, true);
      assert(captured.chunks.every((chunk) => chunk.length <= 64 * 1024));
      assert.equal(Buffer.concat(captured.chunks).equals(bytes), true);
    });
  });
}

test("FOUND completo vira infected", async () => {
  await withFakeClamd({ response: Buffer.from("stream: Eicar-Signature FOUND\0") }, async (port) => {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
    assert.deepEqual(await scanner.scan(input(Buffer.from("x"))), { status: "infected" });
  });
});

test("ERROR completo vira failed", async () => {
  await withFakeClamd({ response: Buffer.from("stream: INSTREAM size limit exceeded. ERROR\0") }, async (port) => {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
    assert.equal((await scanner.scan(input(Buffer.from("x")))).status, "failed");
  });
});

for (const response of ["stream: Not.OK FOUND\0", "xstream: OK\0", "stream: OK trailing\0"]) {
  test(`resposta parecida com OK não aprova: ${JSON.stringify(response)}`, async () => {
    await withFakeClamd({ response: Buffer.from(response) }, async (port) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
      assert.notEqual((await scanner.scan(input(Buffer.from("x")))).status, "clean");
    });
  });
}

test("EOF sem resposta terminada em NUL falha fechado", async () => {
  await withFakeClamd({ response: Buffer.from("stream: OK") }, async (port) => {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
    assert.equal((await scanner.scan(input(Buffer.from("x")))).status, "failed");
  });
});

test("EOF sem resposta falha fechado", async () => {
  await withFakeClamd({ closeWithoutResponse: true }, async (port) => {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
    assert.equal((await scanner.scan(input(Buffer.from("x")))).status, "failed");
  });
});

test("resposta recebida antes do terminador nunca aprova", async () => {
  await withFakeClamd({ respondBeforeTerminator: true }, async (port) => {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
    assert.equal((await scanner.scan(input(Buffer.alloc(1024 * 1024)))).status, "failed");
  });
});

test("erro real de limite recebido antes do terminador mantém razão fail-closed", async () => {
  await withFakeClamd(
    {
      respondBeforeTerminator: true,
      response: Buffer.from("INSTREAM size limit exceeded. ERROR\0"),
    },
    async (port) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
      assert.deepEqual(await scanner.scan(input(Buffer.alloc(1024 * 1024))), {
        status: "failed",
        reason: "stream_limit_misconfigured",
      });
    },
  );
});

test("duas respostas no mesmo frame falham fechado", async () => {
  await withFakeClamd({ response: Buffer.from("stream: OK\0stream: OK\0") }, async (port) => {
    const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
    assert.equal((await scanner.scan(input(Buffer.from("x")))).status, "failed");
  });
});
