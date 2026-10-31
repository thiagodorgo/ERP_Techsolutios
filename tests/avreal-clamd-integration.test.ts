import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import net from "node:net";
import test from "node:test";

import { ClamAvEvidenceScanner } from "../src/modules/evidence/clamav-scanner.js";
import {
  resetEvidenceScannerForTests,
  resolveEvidenceScanner,
} from "../src/modules/evidence/evidence-scanner.factory.js";

const host = process.env.AVREAL_CLAMAV_HOST;
const port = Number(process.env.AVREAL_CLAMAV_PORT ?? "3310");
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
}
