import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import net, { type Server, type Socket } from "node:net";
import test from "node:test";

import { ClamAvEvidenceScanner } from "../src/modules/evidence/clamav-scanner.js";

function input(buffer: Buffer, sizeBytes = buffer.length) {
  return {
    tenantId: "tenant",
    evidenceId: "evidence",
    clientEvidenceId: "client",
    mimeType: "image/png",
    sizeBytes,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    buffer,
  };
}

async function withServer<T>(
  handler: (socket: Socket, connection: number) => void,
  run: (port: number, getConnections: () => number, sockets: Set<Socket>) => Promise<T>,
): Promise<T> {
  let connections = 0;
  const sockets = new Set<Socket>();
  const server = net.createServer((socket) => {
    connections += 1;
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    handler(socket, connections);
  });
  await listen(server);
  const address = server.address();
  assert(address && typeof address !== "string");
  try {
    return await run(address.port, () => connections, sockets);
  } finally {
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
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("condição não satisfeita no prazo do teste");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function within<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("watchdog do teste excedido")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function replyAfterTerminator(socket: Socket, response: Buffer): void {
  let pending = Buffer.alloc(0);
  let commandRead = false;
  socket.on("data", (part) => {
    pending = Buffer.concat([pending, part]);
    if (!commandRead) {
      const end = pending.indexOf(0);
      if (end < 0) return;
      pending = pending.subarray(end + 1);
      commandRead = true;
    }
    while (pending.length >= 4) {
      const size = pending.readUInt32BE(0);
      if (size === 0) {
        socket.end(response);
        return;
      }
      if (pending.length < size + 4) return;
      pending = pending.subarray(size + 4);
    }
  });
}

test("buffer acima do teto falha sem abrir socket", async () => {
  let socketFactoryCalls = 0;
  const scanner = new ClamAvEvidenceScanner({
    host: "127.0.0.1",
    port: 1,
    streamMaxBytes: 1024,
    socketFactory: () => {
      socketFactoryCalls += 1;
      throw new Error("socket não deveria ser criado");
    },
  });
  assert.deepEqual(await scanner.scan(input(Buffer.alloc(1025))), {
    status: "failed",
    reason: "stream_too_large",
  });
  assert.equal(socketFactoryCalls, 0);
});

test("sizeBytes divergente falha sem abrir socket", async () => {
  let socketFactoryCalls = 0;
  const scanner = new ClamAvEvidenceScanner({
    host: "127.0.0.1",
    port: 1,
    socketFactory: () => {
      socketFactoryCalls += 1;
      throw new Error("socket não deveria ser criado");
    },
  });
  assert.deepEqual(await scanner.scan(input(Buffer.from("abc"), 4)), {
    status: "failed",
    reason: "size_mismatch",
  });
  assert.equal(socketFactoryCalls, 0);
});

test("resposta maior que 4096 bytes falha e destrói o socket", async () => {
  await withServer(
    (socket) => replyAfterTerminator(socket, Buffer.concat([Buffer.alloc(4097, 0x41), Buffer.from([0])])),
    async (port, _connections, sockets) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
      assert.deepEqual(await scanner.scan(input(Buffer.from("x"))), {
        status: "failed",
        reason: "response_too_large",
      });
      await waitFor(() => sockets.size === 0);
      assert.equal(sockets.size, 0);
    },
  );
});

test("Heuristics.Limits.Exceeded vira infected com motivo distinto", async () => {
  await withServer(
    (socket) => replyAfterTerminator(socket, Buffer.from("stream: Heuristics.Limits.Exceeded.MaxFileSize FOUND\0")),
    async (port) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
      assert.deepEqual(await scanner.scan(input(Buffer.from("x"))), {
        status: "infected",
        reason: "scan_limit_exceeded",
      });
    },
  );
});

test("INSTREAM size limit exceeded é falha de configuração", async () => {
  await withServer(
    (socket) => replyAfterTerminator(socket, Buffer.from("stream: INSTREAM size limit exceeded. ERROR\0")),
    async (port) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port });
      assert.deepEqual(await scanner.scan(input(Buffer.from("x"))), {
        status: "failed",
        reason: "stream_limit_misconfigured",
      });
    },
  );
});

test("servidor mudo respeita prazo absoluto e fecha o socket", async () => {
  await withServer(
    () => undefined,
    async (port) => {
      let clientSocket: Socket | undefined;
      const scanner = new ClamAvEvidenceScanner({
        host: "127.0.0.1",
        port,
        scanTimeoutMs: 50,
        socketFactory: (options) => {
          clientSocket = net.createConnection(options);
          return clientSocket;
        },
      });
      const started = Date.now();
      assert.deepEqual(await within(scanner.scan(input(Buffer.from("x"))), 500), {
        status: "failed",
        reason: "timeout",
      });
      assert(Date.now() - started < 500);
      assert.equal(clientSocket?.destroyed, true);
    },
  );
});

test("saturação devolve scanner_busy sem abrir conexão adicional", async () => {
  await withServer(
    (socket) => setTimeout(() => replyAfterTerminator(socket, Buffer.from("stream: OK\0")), 80),
    async (port, getConnections) => {
      const scanner = new ClamAvEvidenceScanner({
        host: "127.0.0.1",
        port,
        maxConcurrentScans: 1,
        scanTimeoutMs: 500,
      });
      const first = scanner.scan(input(Buffer.from("one")));
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.deepEqual(await scanner.scan(input(Buffer.from("two"))), {
        status: "failed",
        reason: "scanner_busy",
      });
      assert.equal((await first).status, "clean");
      assert.equal(getConnections(), 1);
    },
  );
});

test("vaga do semáforo é devolvida depois de erro", async () => {
  await withServer(
    (socket, connection) => {
      if (connection === 1) socket.destroy();
      else replyAfterTerminator(socket, Buffer.from("stream: OK\0"));
    },
    async (port, getConnections) => {
      const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port, maxConcurrentScans: 1 });
      assert.equal((await scanner.scan(input(Buffer.from("one")))).status, "failed");
      assert.equal((await scanner.scan(input(Buffer.from("two")))).status, "clean");
      assert.equal(getConnections(), 2);
    },
  );
});

test("porta recusada falha fechado sem lançar", async () => {
  const probe = net.createServer();
  await listen(probe);
  const address = probe.address();
  assert(address && typeof address !== "string");
  await close(probe);
  const scanner = new ClamAvEvidenceScanner({ host: "127.0.0.1", port: address.port, scanTimeoutMs: 100 });
  assert.equal((await scanner.scan(input(Buffer.from("x")))).status, "failed");
});
