import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlatformTenantFromApi,
  createTenantAdminUserFromApi,
  updatePlatformTenantFromApi,
  updatePlatformTenantModulesFromApi,
  updatePlatformTenantStatusFromApi,
} from "../src/modules/platform/platform.adapter";
import { adaptPlatformTenantDetail } from "../src/modules/platform/platform-tenant-detail.adapter";
import { DETAIL_A, ORGANIZATION_A, jsonResponse } from "./helpers/plat-org.fixture";

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
    dispatchEvent: () => true,
  },
});

type CapturedRequest = { readonly url: string; readonly method: string; readonly body: unknown };

function captureFetch(responseData: unknown, responseStatus = 200) {
  const calls: CapturedRequest[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return jsonResponse(responseData, responseStatus);
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = previous; } };
}

test("FC1 DTOs reais: criação, renomeação e administrador preservam retornos distintos", async () => {
  const created = { organization: ORGANIZATION_A, provisioning: { group: { status: "done" }, profile: { status: "skipped" }, subscription: { status: "skipped" }, admin: { status: "skipped" } } };
  const tenantInput = { name: "Organização A", group: { id: ORGANIZATION_A.group.id } };
  const capture = captureFetch({ data: created });
  try {
    const result = await createPlatformTenantFromApi(tenantInput as never);
    assert.deepEqual(result, created);
    assert.deepEqual(capture.calls[0], { url: "/api/v1/platform/tenants", method: "POST", body: tenantInput });
  } finally { capture.restore(); }

  const rename = captureFetch({ data: { ...ORGANIZATION_A, name: "Organização Renomeada" } });
  try {
    await updatePlatformTenantFromApi(ORGANIZATION_A.id, { name: "Organização Renomeada" });
    assert.deepEqual(rename.calls[0]?.body, { name: "Organização Renomeada" });
  } finally { rename.restore(); }

  const admin = captureFetch({ data: { user: { id: "user-a", name: "Administrador A", email: "admin-a@example.invalid" }, temporaryPassword: "temporaria" } });
  try {
    const result = await createTenantAdminUserFromApi(ORGANIZATION_A.id, { name: "Administrador A", email: "admin-a@example.invalid" });
    assert.equal((result as { temporaryPassword?: string }).temporaryPassword, "temporaria");
    assert.deepEqual(admin.calls[0]?.body, { name: "Administrador A", email: "admin-a@example.invalid" });
  } finally { admin.restore(); }
});

test("FC1 nome do plano vem da assinatura real do detalhe, nunca de PlatformOrganization.plan", () => {
  const detail = adaptPlatformTenantDetail(DETAIL_A);
  assert.equal(detail?.subscription?.planName, "Plano Regional Teste");
  assert.deepEqual(detail?.subscription, { planName: "Plano Regional Teste" });
  assert.equal("plan" in (ORGANIZATION_A as object), false);
});

test("FC2 erros por reason: 409 de módulos permanece conflito honesto e sem sucesso otimista", async () => {
  const capture = captureFetch({ error: { code: "CONFLICT", reason: "module_change_requires_subscription", message: "não expor" } }, 409);
  try {
    await assert.rejects(
      updatePlatformTenantModulesFromApi(ORGANIZATION_A.id, ["work_orders"]),
      (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === 409 && "reason" in error && error.reason === "module_change_requires_subscription"),
    );
  } finally { capture.restore(); }
});

test("FC3 payload fechado: situação envia status e reason na rota /status", async () => {
  const capture = captureFetch({ data: { ...ORGANIZATION_A, status: "suspended" } });
  try {
    await updatePlatformTenantStatusFromApi(ORGANIZATION_A.id, { status: "suspended", reason: "security" } as never);
    assert.deepEqual(capture.calls[0], {
      url: `/api/v1/platform/tenants/${ORGANIZATION_A.id}/status`,
      method: "PATCH",
      body: { status: "suspended", reason: "security" },
    });
  } finally { capture.restore(); }
});
