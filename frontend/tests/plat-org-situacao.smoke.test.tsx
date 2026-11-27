import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { OrganizationStatusDialog, PLATFORM_STATUS_REASONS, activeUsersInDetail } from "../src/modules/platform/components/OrganizationStatusDialog";
import { adaptPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.adapter";
import { updatePlatformTenantStatus } from "../src/modules/platform/platform.service";
import { DETAIL_A, ORGANIZATION_A, jsonResponse } from "./helpers/plat-org.fixture";

const detail = { detail: DETAIL_A, source: "api" as const, forbidden: false, notFound: false };
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } } });

test("FS1 contagem usa somente usuários ativos da leitura nova", () => {
  const adapted = adaptPlatformTenantDetail(DETAIL_A);
  assert.ok(adapted);
  assert.equal(activeUsersInDetail({ ...detail, detail: adapted }), 2);
  assert.equal(activeUsersInDetail({ ...detail, detail: { ...DETAIL_A, users: [] } }), 0);
  assert.equal(activeUsersInDetail({ detail: null, source: "fallback", forbidden: true, notFound: false }), 0);
});

test("FS1 confirmação apresenta contagem consultada, nome atual e motivo", () => {
  const html = renderToString(<OrganizationStatusDialog organization={ORGANIZATION_A} detail={detail} onClose={() => undefined} onConfirm={async () => undefined} />);
  assert.match(html.replace(/<!--.*?-->/g, ""), /2 Usuários ativos no cadastro consultado/);
  assert.match(html, /Digite o nome atual/);
  assert.match(html, /Motivo/);
  assert.match(html, /impede o acesso e encerra sessões/);
});

test("FS2 enumeração e PATCH são idênticos para suspender e reativar", async () => {
  assert.deepEqual(PLATFORM_STATUS_REASONS, ["nonpayment", "customer_request", "security", "other"]);
  const calls: { url: string; method?: string; body?: unknown }[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return jsonResponse({ data: { ...ORGANIZATION_A, status: calls.length === 1 ? "suspended" : "active" } });
  }) as typeof fetch;
  try {
    await updatePlatformTenantStatus(ORGANIZATION_A.id, { status: "suspended", reason: "security" });
    await updatePlatformTenantStatus(ORGANIZATION_A.id, { status: "active", reason: "customer_request" });
  } finally {
    globalThis.fetch = previous;
  }
  assert.deepEqual(calls.map((call) => call.method), ["PATCH", "PATCH"]);
  assert.equal(calls.every((call) => call.url.endsWith(`/platform/tenants/${ORGANIZATION_A.id}/status`)), true);
  assert.deepEqual(calls.map((call) => call.body), [
    { status: "suspended", reason: "security" },
    { status: "active", reason: "customer_request" },
  ]);
  assert.doesNotMatch(JSON.stringify(calls), /payment_regularized|POST/);
});
