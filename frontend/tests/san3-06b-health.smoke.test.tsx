import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { getPlatformHealth } from "../src/modules/platform/platform-health.service";
import { PlatformHealthScreen, PlatformHealthView } from "../src/modules/platform/pages/PlatformHealthPage";

// B-SAN3-06b E8 — Saúde (T29–T32): `GET /api/v1/health/ready` com o corpo real do backend (`health.routes.ts`); o
// `fetch` é o único dublê.

test("T29 readiness 200 exibe os três serviços, latências e revisão reais", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ status: "ready", version: "2.1.0", commit: "abc123", checks: { postgres: { status: "up", latencyMs: 11 }, redis: { status: "up", latencyMs: 7 }, worker: { status: "healthy", ageSeconds: 3 } } }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  try {
    const result = await getPlatformHealth();
    const html = renderToString(<PlatformHealthView data={result} />);
    assert.match(html, /Postgres/);
    assert.match(html, /Redis/);
    assert.match(html, /Worker/);
    assert.match(html, /11 ms/);
    assert.match(html, /7 ms/);
    assert.match(html, /2\.1\.0/);
    assert.match(html, /abc123/);
    assert.match(html, /Sistema pronto/);
    assert.equal((html.match(/Operacional/g) ?? []).length, 3);
    assert.doesNotMatch(html, /Indisponível/);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T30 readiness 503 preserva o corpo e distingue dependências", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ status: "not_ready", checks: { postgres: { status: "down", latencyMs: 20 }, redis: { status: "up", latencyMs: 5 }, worker: { status: "healthy", ageSeconds: 2 } } }), { status: 503, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  try {
    const result = await getPlatformHealth();
    const html = renderToString(<PlatformHealthView data={result} />);
    assert.match(html, /Sistema não pronto/);
    assert.match(html, /Postgres/);
    assert.match(html, /Indisponível/);
    assert.match(html, /Redis/);
    assert.match(html, /Operacional/);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T31 falha de rede é honesta e a rota pública não recebe autorização", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const original = globalThis.fetch;
  let init: RequestInit | undefined;
  globalThis.fetch = (async (_input, requestInit) => {
    init = requestInit;
    throw new Error("rede fora");
  }) as typeof fetch;
  try {
    const result = await getPlatformHealth();
    assert.equal(result.source, "fallback");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    const html = renderToString(<PlatformHealthScreen data={result} loading={false} />);
    assert.match(html, /Não foi possível consultar a prontidão/);
    assert.doesNotMatch(html, /Operacional|Indisponível|Sistema pronto/);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("T32 Saúde remove números antigos e mantém o selo de observabilidade", () => {
  const html = renderToString(<PlatformHealthView data={{ status: "ready", version: "real", commit: "real", checks: { postgres: { status: "up" }, redis: { status: "up" }, worker: { status: "healthy", ageSeconds: null } }, source: "api", stale: false }} />);
  assert.match(html, /Monitoramento em preparação/);
  assert.match(html, /Uptime, latência p95, erros/);
  assert.doesNotMatch(html, /128 ms|99,98%|Degradado|Último backup/);
});
