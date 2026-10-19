import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import {
  createTraccarForwardAuthenticator,
  traccarForwardAuthMiddleware,
  TRACCAR_FORWARD_HEADER,
} from "../src/integrations/traccar/traccar-forward-auth.js";

// -----------------------------------------------------------------------------------------------
// B-TRC-01 · autenticação do forward do Traccar (plano v2.1 §4.6; MUT-17, MUT-18, MUT-19, MUT-38).
// Header único `X-Traccar-Forward-Token`; SHA-256 dos dois lados + `timingSafeEqual` em buffers de 32 bytes;
// current/previous, previous só até o prazo; header repetido e segredo em `Authorization` recusados.
// -----------------------------------------------------------------------------------------------

const CURRENT = "c".repeat(20) + "-current-forward-secret-0001";
const PREVIOUS = "p".repeat(20) + "-previous-forward-secret-0002";
const NOW = new Date("2026-10-11T21:00:00.000Z");

function request(headers: Record<string, string | string[]>) {
  const rawHeaders: string[] = [];
  const merged: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) rawHeaders.push(name, item);
    // Mesma junção que o Node faz para header não padronizado repetido (§11 M-35): "a, b".
    merged[name.toLowerCase()] = values.join(", ");
  }
  return { headers: merged, rawHeaders };
}

function authenticator(options: { previousUntil?: Date; now?: Date; compare?: typeof timingSafeEqual } = {}) {
  return createTraccarForwardAuthenticator(
    {
      current: CURRENT,
      previous: PREVIOUS,
      previousUntil: options.previousUntil ?? new Date(NOW.getTime() + 60 * 60 * 1000),
    },
    { now: () => options.now ?? NOW, compare: options.compare },
  );
}

test("auth: aceita o segredo current sem ecoá-lo", { timeout: 30_000 }, () => {
  const result = authenticator()(request({ [TRACCAR_FORWARD_HEADER]: CURRENT }));
  assert.equal(result.ok, true);
  assert.ok(!JSON.stringify(result).includes(CURRENT), "o resultado não pode carregar o segredo");
});

test("auth: aceita o previous antes do prazo", { timeout: 30_000 }, () => {
  const result = authenticator()(request({ [TRACCAR_FORWARD_HEADER]: PREVIOUS }));
  assert.equal(result.ok, true);
});

test("auth: recusa o previous depois do prazo (relógio injetado)", { timeout: 30_000 }, () => {
  const until = new Date("2026-10-11T22:00:00.000Z");
  const before = authenticator({ previousUntil: until, now: new Date("2026-10-11T21:59:59.000Z") });
  const after = authenticator({ previousUntil: until, now: new Date("2026-10-11T22:00:00.001Z") });
  assert.equal(before(request({ [TRACCAR_FORWARD_HEADER]: PREVIOUS })).ok, true);
  assert.equal(after(request({ [TRACCAR_FORWARD_HEADER]: PREVIOUS })).ok, false);
  assert.equal(after(request({ [TRACCAR_FORWARD_HEADER]: CURRENT })).ok, true, "o current continua valendo");
});

test("auth: recusa header ausente", { timeout: 30_000 }, () => {
  assert.equal(authenticator()(request({})).ok, false);
  assert.equal(authenticator()(request({ [TRACCAR_FORWARD_HEADER]: "" })).ok, false);
});

test("auth: recusa valor errado de mesmo tamanho e de tamanho diferente", { timeout: 30_000 }, () => {
  const sameLength = CURRENT.slice(0, -1) + (CURRENT.endsWith("1") ? "2" : "1");
  assert.equal(sameLength.length, CURRENT.length);
  assert.equal(authenticator()(request({ [TRACCAR_FORWARD_HEADER]: sameLength })).ok, false);
  assert.equal(authenticator()(request({ [TRACCAR_FORWARD_HEADER]: CURRENT + "x" })).ok, false);
  assert.equal(authenticator()(request({ [TRACCAR_FORWARD_HEADER]: "curto" })).ok, false);
});

test("auth: recusa header repetido, mesmo quando o primeiro valor é o certo", { timeout: 30_000 }, () => {
  assert.equal(authenticator()(request({ [TRACCAR_FORWARD_HEADER]: [CURRENT, "outro-valor"] })).ok, false);
  assert.equal(authenticator()(request({ [TRACCAR_FORWARD_HEADER]: [CURRENT, CURRENT] })).ok, false);
});

test("auth: recusa o segredo em `Authorization`", { timeout: 30_000 }, () => {
  assert.equal(authenticator()(request({ authorization: `Bearer ${CURRENT}` })).ok, false);
  assert.equal(authenticator()(request({ authorization: CURRENT })).ok, false);
  assert.equal(
    authenticator()(request({ [TRACCAR_FORWARD_HEADER]: CURRENT, authorization: `Bearer ${CURRENT}` })).ok,
    false,
    "Authorization presente recusa a requisição inteira",
  );
});

test("auth: compara digests SHA-256 de 32 bytes com timingSafeEqual (espião)", { timeout: 30_000 }, () => {
  const calls: Array<[number, number]> = [];
  const spy = ((a: NodeJS.ArrayBufferView, b: NodeJS.ArrayBufferView) => {
    calls.push([a.byteLength, b.byteLength]);
    return timingSafeEqual(a, b);
  }) as typeof timingSafeEqual;
  const auth = authenticator({ compare: spy });
  assert.equal(auth(request({ [TRACCAR_FORWARD_HEADER]: CURRENT })).ok, true);
  assert.equal(auth(request({ [TRACCAR_FORWARD_HEADER]: "x" })).ok, false);
  assert.ok(calls.length >= 2, `timingSafeEqual chamado ${calls.length} vez(es)`);
  for (const [left, right] of calls) {
    assert.equal(left, 32);
    assert.equal(right, 32);
  }
});

test("auth: a resposta 401 não traz o segredo nem o motivo", { timeout: 30_000 }, async () => {
  const app = express();
  app.use(traccarForwardAuthMiddleware(authenticator()));
  app.post("/x", (_request, response) => {
    response.status(204).end();
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const wrong = await fetch(`http://127.0.0.1:${port}/x`, {
      method: "POST",
      headers: { [TRACCAR_FORWARD_HEADER]: PREVIOUS.slice(0, -1) + "9", authorization: `Bearer ${CURRENT}` },
    });
    const text = await wrong.text();
    assert.equal(wrong.status, 401);
    assert.deepEqual(JSON.parse(text), { error: { code: "unauthorized" } });
    assert.ok(!text.includes(CURRENT) && !text.includes(PREVIOUS.slice(0, 10)));
    assert.equal(wrong.headers.get("www-authenticate"), null);
    const right = await fetch(`http://127.0.0.1:${port}/x`, { method: "POST", headers: { [TRACCAR_FORWARD_HEADER]: CURRENT } });
    assert.equal(right.status, 204);
    assert.equal(await right.text(), "");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
