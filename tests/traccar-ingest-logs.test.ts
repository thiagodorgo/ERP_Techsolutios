import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { Writable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";

import pino from "pino";

import { createTraccarForwardAuthenticator } from "../src/integrations/traccar/traccar-forward-auth.js";
import {
  createTraccarIngestApp,
  TRACCAR_INGEST_PATH,
  type TraccarIngestHandler,
} from "../src/integrations/traccar/traccar-ingest.app.js";
import { createTraccarIngestLimiter } from "../src/integrations/traccar/traccar-rate-limit.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · logs sem segredo e sem coordenada (plano v2.1 §4.7; A-02; MUT-16, MUT-28).
// O app de ingestão é ligado a um logger `pino` REAL com destino em memória; cada desfecho leva um segredo-sentinela
// (no header, e na query quando a forma permite) e uma coordenada-sentinela, e nenhum dos dois pode aparecer no log.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET_SENTINEL = "SENTINELA-SEGREDO-TRC01-9f8e7d6c5b4a39281706";
const WRONG_SENTINEL = "SENTINELA-ERRADO-TRC01-00112233445566778899";
const COORD_DIGITS = "4817263";
const LATITUDE = -23.4817263;
const LONGITUDE = -46.4817263;

function body(overrides: Record<string, unknown> = {}): string {
  const fixture = JSON.parse(
    readFileSync(path.join(ROOT, "infra", "traccar", "fixtures", "6.16.0", "position-osmand.json"), "utf8"),
  ) as { position: Record<string, unknown>; device: Record<string, unknown> };
  fixture.position.latitude = LATITUDE;
  fixture.position.longitude = LONGITUDE;
  Object.assign(fixture.position, overrides);
  return JSON.stringify(fixture);
}

function memoryLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { logger: pino({ level: "info" }, stream), text: () => lines.join("") };
}

async function scenario(
  ingest: TraccarIngestHandler,
  send: (base: string) => Promise<Response>,
  options: { timeoutMs?: number } = {},
): Promise<{ status: number; log: string }> {
  const { logger, text } = memoryLogger();
  const app = createTraccarIngestApp({
    authenticator: createTraccarForwardAuthenticator({ current: SECRET_SENTINEL }),
    limiter: createTraccarIngestLimiter({ ratePerSecond: 20, burst: 100, maxConcurrency: 10 }),
    ingest,
    instanceKey: "erp-dev",
    timeoutMs: options.timeoutMs ?? 2_000,
    logger,
  });
  const server: Server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await send(`http://127.0.0.1:${port}`);
    await response.arrayBuffer();
    await new Promise((resolve) => setImmediate(resolve));
    return { status: response.status, log: text() };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function postWith(
  base: string,
  options: { token?: string; contentType?: string; payload?: string; query?: string } = {},
): Promise<Response> {
  return fetch(`${base}${TRACCAR_INGEST_PATH}${options.query ?? ""}`, {
    method: "POST",
    headers: {
      "content-type": options.contentType ?? "application/json",
      "x-traccar-forward-token": options.token ?? SECRET_SENTINEL,
    },
    body: options.payload ?? body(),
  });
}

function assertClean(result: { status: number; log: string }, expectedStatus: number): void {
  assert.equal(result.status, expectedStatus);
  assert.match(result.log, new RegExp(`"statusCode":${expectedStatus}`), "o desfecho tem de aparecer no log (o teste não pode passar vazio)");
  assert.ok(!result.log.includes(SECRET_SENTINEL), "o segredo apareceu no log");
  assert.ok(!result.log.includes(WRONG_SENTINEL), "o valor apresentado apareceu no log");
  assert.ok(!result.log.includes(COORD_DIGITS), "a coordenada apareceu no log");
  assert.ok(!/x-traccar-forward-token/i.test(result.log), "nome de header no log: o serializador não é de allowlist");
}

const stored: TraccarIngestHandler = async () => ({ kind: "stored" });

test("logs: 204 (gravado) sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  assertClean(await scenario(stored, (base) => postWith(base)), 204);
});

test("logs: 202 (quarentena) sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  assertClean(await scenario(async () => ({ kind: "quarantined", reason: "unmapped_device" }), (base) => postWith(base)), 202);
});

test("logs: 400 (query string) sem segredo nem coordenada, nem os da query", { timeout: 30_000 }, async () => {
  const query = `?token=${SECRET_SENTINEL}&lat=${LATITUDE}&lon=${LONGITUDE}`;
  assertClean(await scenario(stored, (base) => postWith(base, { query })), 400);
});

test("logs: 401 sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  assertClean(await scenario(stored, (base) => postWith(base, { token: WRONG_SENTINEL })), 401);
});

test("logs: 400 (JSON inválido) sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  const payload = `{"position":{"latitude":${LATITUDE},"longitude":${LONGITUDE},`;
  assertClean(await scenario(stored, (base) => postWith(base, { payload })), 400);
});

test("logs: 413 sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  const payload = body() + " ".repeat(70 * 1024);
  assertClean(await scenario(stored, (base) => postWith(base, { payload })), 413);
});

test("logs: 415 sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  assertClean(await scenario(stored, (base) => postWith(base, { contentType: "text/plain" })), 415);
});

test("logs: 422 sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  const payload = body({ tenantId: "00000000-0000-0000-0000-000000000001" });
  assertClean(await scenario(stored, (base) => postWith(base, { payload })), 422);
});

test("logs: 503 (serviço falso estoura o tempo) sem segredo nem coordenada", { timeout: 30_000 }, async () => {
  const slow: TraccarIngestHandler = () => new Promise((resolve) => setTimeout(() => resolve({ kind: "stored" }), 1_500));
  assertClean(await scenario(slow, (base) => postWith(base), { timeoutMs: 200 }), 503);
});
