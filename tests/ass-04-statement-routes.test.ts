// B-ASS-04 · F7 — rotas de plataforma do demonstrativo, em memória, pelo app real (createApp).
// O fechamento usa o relógio real: o período fechado é sempre o mês ANTERIOR ao corrente em São Paulo.

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import {
  getMemoryStatementAuditForTests,
  resetStatementRuntimeForTests,
} from "../src/modules/subscription-billing/statements/statement.factory.js";
import { todayBusinessDate } from "../src/modules/subscription-billing/plans/plan-versioning.js";
import {
  getMemoryPlansRepositoryForTests,
  getMemorySubscriptionsRepositoryForTests,
  getMemoryTenantLookupForTests,
} from "../src/modules/subscription-billing/subscription-billing.service.js";

const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const TENANT_MANAGER = { "x-tenant-id": "ten_demo", "x-user-id": "usr_demo", "x-role": "manager" } as const;

function previousPeriod(): string {
  const today = todayBusinessDate(new Date());
  const [year, month] = today.split("-").map(Number) as [number, number];
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

function currentPeriod(): string {
  return todayBusinessDate(new Date()).slice(0, 7);
}

let seq = 0;

/** Organização com assinatura base vigente desde o 1º dia do mês anterior (R$ 199,90, 10 usuários, 10 GB). */
async function seedTenant(): Promise<string> {
  seq += 1;
  const tenantId = `ten_st_${seq}`;
  getMemoryTenantLookupForTests().upsert({ id: tenantId, slug: `org-st-${seq}` });
  const plans = getMemoryPlansRepositoryForTests();
  const plan = await plans.createPlan({ code: `st-base-${seq}`, kind: "base", name: "Base", description: "", active: true, createdBy: null });
  const from = new Date(`${previousPeriod()}-01T00:00:00-03:00`);
  await plans.createVersion({
    planId: plan.id,
    version: 1,
    validFrom: from,
    validTo: null,
    monthlyPriceCents: 19990,
    includedUsers: 10,
    includedStorageGb: 10,
    extraUserPriceCents: 500,
    extraGbPriceCents: 200,
    perVehiclePriceCents: null,
    pricingUnit: "flat",
    modules: ["dashboard"],
    notes: null,
    inaugural: false,
  });
  await getMemorySubscriptionsRepositoryForTests().createSubscription({
    tenantId,
    planId: plan.id,
    validFrom: from,
    validTo: null,
    monthlyPriceOverrideCents: null,
    includedUsersOverride: null,
    includedStorageGbOverride: null,
    extraUserPriceOverrideCents: null,
    extraGbPriceOverrideCents: null,
    dueDays: 10,
    status: "active",
    notes: null,
  });
  return tenantId;
}

type Json = Record<string, any>;

async function close(baseUrl: string, tenantId: string): Promise<Json> {
  const response = await requestJson(baseUrl, "/api/v1/platform/billing/statements/close", {
    method: "POST",
    headers: PLATFORM,
    body: { tenantId, period: previousPeriod() },
  });
  assert.equal(response.status, 200);
  return response.body.data as Json;
}

test("T-RT-1: ator de organização → 403 em leitura, fechamento e pagamento", async () => {
  await withApi(async (baseUrl) => {
    for (const [method, path] of [
      ["GET", "/api/v1/platform/billing/statements?tenantId=ten_demo"],
      ["POST", "/api/v1/platform/billing/statements/close"],
      ["POST", "/api/v1/platform/billing/statements/st_x/payments"],
      ["GET", "/api/v1/platform/billing/credits?tenantId=ten_demo"],
    ] as const) {
      const response = await requestJson(baseUrl, path, { method, headers: TENANT_MANAGER, body: method === "POST" ? {} : undefined });
      assert.equal(response.status, 403, `${method} ${path}`);
      assert.equal(response.body.error.reason, "platform_permission_required");
    }
  });
});

test("T-RT-2: sem tenantId → 400 tenant_id_required; período inválido → 400; mês corrente → 422", async () => {
  await withApi(async (baseUrl) => {
    const list = await requestJson(baseUrl, "/api/v1/platform/billing/statements", { headers: PLATFORM });
    assert.equal(list.status, 400);
    assert.equal(list.body.error.reason, "tenant_id_required");

    const tenantId = await seedTenant();
    const bad = await requestJson(baseUrl, "/api/v1/platform/billing/statements/close", {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId, period: "2026-13" },
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.reason, "invalid_period");

    const current = await requestJson(baseUrl, "/api/v1/platform/billing/statements/close", {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId, period: currentPeriod() },
    });
    assert.equal(current.status, 422);
    assert.equal(current.body.error.reason, "period_not_ended");
  });
});

test("T-RT-3: fecha o mês anterior; dinheiro em string decimal; segundo fechamento → alreadyClosed", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const first = await close(baseUrl, tenantId);
    assert.equal(first.closed.length, 1);
    const statement = first.closed[0] as Json;
    assert.equal(statement.status, "closed");
    assert.equal(statement.totalAmount, "199.90");
    assert.equal(statement.baseAmount, "199.90");
    assert.equal(statement.balance, "199.90");
    assert.equal(statement.warning, "no_usage_measured");
    assert.match(statement.dueDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal("totalCents" in statement, false, "centavos não vazam no DTO");

    const second = await close(baseUrl, tenantId);
    assert.equal(second.closed.length, 0);
    assert.equal(second.alreadyClosed.length, 1);
    assert.equal(second.alreadyClosed[0].id, statement.id);

    const list = await requestJson(baseUrl, `/api/v1/platform/billing/statements?tenantId=${tenantId}`, { headers: PLATFORM });
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
  });
});

test("T-RT-4: organização sem assinatura → skipped no_subscription", async () => {
  await withApi(async (baseUrl) => {
    getMemoryTenantLookupForTests().upsert({ id: "ten_st_nosub", slug: "org-nosub" });
    const data = await close(baseUrl, "ten_st_nosub");
    assert.deepEqual(data.skipped, [{ tenantId: "ten_st_nosub", reason: "no_subscription" }]);
  });
});

test("T-RT-5: pagamento manual parcial e total → 201, paid, saldo 0; acima do saldo → 422", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const statementId = (await close(baseUrl, tenantId)).closed[0].id as string;
    const path = `/api/v1/platform/billing/statements/${statementId}/payments`;

    const partial = await requestJson(baseUrl, path, { method: "POST", headers: PLATFORM, body: { tenantId, amount: "100.00", method: "pix" } });
    assert.equal(partial.status, 201);
    assert.equal(partial.body.data.statement.balance, "99.90");
    assert.equal(partial.body.data.payment.amount, "100.00");

    const over = await requestJson(baseUrl, path, { method: "POST", headers: PLATFORM, body: { tenantId, amount: "100.00" } });
    assert.equal(over.status, 422);
    assert.equal(over.body.error.reason, "amount_exceeds_balance");

    const rest = await requestJson(baseUrl, path, { method: "POST", headers: PLATFORM, body: { tenantId, amount: "99.90" } });
    assert.equal(rest.status, 201);
    assert.equal(rest.body.data.statement.status, "paid");
    assert.equal(rest.body.data.statement.balance, "0.00");

    const detail = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementId}?tenantId=${tenantId}`, { headers: PLATFORM });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.payments.length, 2);
  });
});

test("T-RT-6: estorno manual devolve o saldo; segundo estorno → 422", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const statementId = (await close(baseUrl, tenantId)).closed[0].id as string;
    const paid = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementId}/payments`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId, amount: "199.90" },
    });
    const paymentId = paid.body.data.payment.id as string;
    const reversePath = `/api/v1/platform/billing/statements/${statementId}/payments/${paymentId}/reverse`;

    const reversed = await requestJson(baseUrl, reversePath, { method: "POST", headers: PLATFORM, body: { tenantId, reason: "lançado na organização errada" } });
    assert.equal(reversed.status, 200);
    assert.equal(reversed.body.data.statement.status, "closed");
    assert.equal(reversed.body.data.statement.balance, "199.90");

    const again = await requestJson(baseUrl, reversePath, { method: "POST", headers: PLATFORM, body: { tenantId, reason: "lançado na organização errada" } });
    assert.equal(again.status, 422);
    assert.equal(again.body.error.reason, "payment_already_reversed");
  });
});

test("T-RT-7: ajuste só em reaberto; delta em string assinada vale no novo fechamento; abaixo de 0 → 422", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const statementId = (await close(baseUrl, tenantId)).closed[0].id as string;
    const path = `/api/v1/platform/billing/statements/${statementId}/adjustment`;

    const onClosed = await requestJson(baseUrl, path, {
      method: "PATCH",
      headers: PLATFORM,
      body: { tenantId, adjustmentsAmount: "-10.00", adjustmentNote: "desconto combinado" },
    });
    assert.equal(onClosed.status, 422);
    assert.equal(onClosed.body.error.reason, "statement_not_adjustable");

    const reopened = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementId}/reopen`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId, reason: "desconto combinado com o cliente" },
    });
    assert.equal(reopened.status, 200);

    const adjusted = await requestJson(baseUrl, path, {
      method: "PATCH",
      headers: PLATFORM,
      body: { tenantId, adjustmentsAmount: "-10.00", adjustmentNote: "desconto combinado" },
    });
    assert.equal(adjusted.status, 200);
    assert.equal(adjusted.body.data.adjustmentsAmount, "-10.00");

    const tooMuch = await requestJson(baseUrl, path, {
      method: "PATCH",
      headers: PLATFORM,
      body: { tenantId, adjustmentsAmount: "-500.00", adjustmentNote: "erro" },
    });
    assert.equal(tooMuch.status, 422);
    assert.equal(tooMuch.body.error.reason, "adjustment_exceeds_total");

    const reclosed = await close(baseUrl, tenantId);
    assert.equal(reclosed.closed.length, 1, "o fechamento manual fecha o reaberto");
    assert.equal(reclosed.closed[0].totalAmount, "189.90");
  });
});

test("T-RT-8: reabrir exige motivo ≥ 10; id desconhecido → 404; id de OUTRA organização → 404", async () => {
  await withApi(async (baseUrl) => {
    const tenantA = await seedTenant();
    const tenantB = await seedTenant();
    const statementA = (await close(baseUrl, tenantA)).closed[0].id as string;

    const short = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementA}/reopen`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId: tenantA, reason: "curto" },
    });
    assert.equal(short.status, 400);
    assert.equal(short.body.error.reason, "reason_too_short");

    const unknown = await requestJson(baseUrl, `/api/v1/platform/billing/statements/st_nope?tenantId=${tenantA}`, { headers: PLATFORM });
    assert.equal(unknown.status, 404);

    const crossTenant = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementA}?tenantId=${tenantB}`, { headers: PLATFORM });
    assert.equal(crossTenant.status, 404, "demonstrativo de A não aparece pelo tenantId de B");

    const crossPay = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementA}/payments`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId: tenantB, amount: "1.00" },
    });
    assert.equal(crossPay.status, 404, "pagamento não cruza organização");

    const reopened = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementA}/reopen`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId: tenantA, reason: "medição de armazenamento corrigida" },
    });
    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.data.status, "reopened");
  });
});

test("T-RT-9: cancelar com pagamento → 422; sem pagamento → cancelled", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const statementId = (await close(baseUrl, tenantId)).closed[0].id as string;
    await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementId}/payments`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId, amount: "1.00" },
    });
    const blocked = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementId}/cancel`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId, reason: "contrato encerrado" },
    });
    assert.equal(blocked.status, 422);
    assert.equal(blocked.body.error.reason, "statement_has_payments");

    const other = await seedTenant();
    const otherId = (await close(baseUrl, other)).closed[0].id as string;
    const cancelled = await requestJson(baseUrl, `/api/v1/platform/billing/statements/${otherId}/cancel`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId: other, reason: "contrato encerrado" },
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, "cancelled");
  });
});

test("T-RT-10: crédito desconhecido → 404 nas duas portas; lista de créditos vazia", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const list = await requestJson(baseUrl, `/api/v1/platform/billing/credits?tenantId=${tenantId}`, { headers: PLATFORM });
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.data, []);
    for (const action of ["apply", "write-off"]) {
      const response = await requestJson(baseUrl, `/api/v1/platform/billing/credits/cr_nope/${action}`, {
        method: "POST",
        headers: PLATFORM,
        body: { tenantId, statementId: "st_x", reason: "não existe" },
      });
      assert.equal(response.status, 404, action);
      assert.equal(response.body.error.reason, "credit_not_found");
    }
  });
});

test("T-RT-11: trilha de auditoria pela allowlist — só primitivos, sem chave proibida", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const statementId = (await close(baseUrl, tenantId)).closed[0].id as string;
    await requestJson(baseUrl, `/api/v1/platform/billing/statements/${statementId}/payments`, {
      method: "POST",
      headers: PLATFORM,
      body: { tenantId, amount: "199.90", note: "token=abc path=/x" },
    });
    const events = getMemoryStatementAuditForTests().events.filter((event) => event.tenantId === tenantId);
    assert.deepEqual(
      events.map((event) => event.action),
      ["subscription_statement.closed", "subscription_statement.payment_recorded"],
    );
    const forbidden = /token|path|bucket|storage|base64|note/i;
    for (const event of events) {
      for (const [key, value] of Object.entries(event.metadata)) {
        assert.equal(forbidden.test(key), false, `chave proibida ${key}`);
        assert.ok(value === null || ["string", "number", "boolean"].includes(typeof value));
        if (typeof value === "string") assert.equal(/token=|path=/.test(value), false, "texto livre não vaza");
      }
    }
  });
});

async function withApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  resetStatementRuntimeForTests();

  const { createApp } = await import("../src/app.js");
  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await closeServer(server);
  }
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
): Promise<{ status: number; body: Json }> {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: (await response.json()) as Json };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

// ------------------------------------------------------------------------------------ F8 · perfil de cobrança

const VALID_CNPJ = "11.222.333/0001-81";
const VALID_CNPJ_ALNUM = "12ABC34501DE35";
const VALID_CPF = "529.982.247-25";

test("T-ST-59: PUT incompleto → 200 com complete=false e missing[]; GET reflete", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const path = `/api/v1/platform/billing/tenants/${tenantId}/billing-profile`;
    const empty = await requestJson(baseUrl, path, { headers: PLATFORM });
    assert.equal(empty.status, 200);
    assert.equal(empty.body.data.complete, false);
    assert.equal(empty.body.data.missing.length, 10);

    const draft = await requestJson(baseUrl, path, {
      method: "PUT",
      headers: PLATFORM,
      body: { legalName: "Pátio Exemplo Ltda", document: VALID_CNPJ, email: "financeiro@exemplo.com.br" },
    });
    assert.equal(draft.status, 200);
    assert.equal(draft.body.data.complete, false);
    assert.equal(draft.body.data.document, "11222333000181");
    assert.deepEqual(draft.body.data.missing, ["address.postalCode", "address.street", "address.number", "address.district", "address.city", "address.state", "paymentMethod"]);

    const full = await requestJson(baseUrl, path, {
      method: "PUT",
      headers: PLATFORM,
      body: {
        legalName: "Pátio Exemplo Ltda",
        document: VALID_CNPJ,
        email: "financeiro@exemplo.com.br",
        address: { postalCode: "01310-100", street: "Av. Paulista", number: "1000", district: "Bela Vista", city: "São Paulo", cityIbge: "3550308", state: "sp" },
        paymentMethod: "pix",
      },
    });
    assert.equal(full.status, 200);
    assert.equal(full.body.data.complete, true);
    assert.deepEqual(full.body.data.missing, []);
    assert.equal(full.body.data.address.state, "SP");

    const read = await requestJson(baseUrl, path, { headers: PLATFORM });
    assert.equal(read.body.data.complete, true);
    assert.equal(read.body.data.address.postalCode, "01310100");
  });
});

test("T-ST-60: documento inválido → 422 document_invalid (CNPJ de 13, DV errado, CPF repetido); CNPJ alfanumérico e CPF válidos passam", async () => {
  await withApi(async (baseUrl) => {
    const tenantId = await seedTenant();
    const path = `/api/v1/platform/billing/tenants/${tenantId}/billing-profile`;
    for (const document of ["1122233300018", "11.222.333/0001-82", "111.111.111-11", "12ABC34501DE36", "abc"]) {
      const response = await requestJson(baseUrl, path, { method: "PUT", headers: PLATFORM, body: { document } });
      assert.equal(response.status, 422, document);
      assert.equal(response.body.error.reason, "document_invalid", document);
    }
    for (const [document, expected] of [[VALID_CNPJ_ALNUM, "12ABC34501DE35"], [VALID_CPF, "52998224725"], ["12.abc.345/01de-35", "12ABC34501DE35"]]) {
      const response = await requestJson(baseUrl, path, { method: "PUT", headers: PLATFORM, body: { document } });
      assert.equal(response.status, 200, document);
      assert.equal(response.body.data.document, expected);
    }
  });
});

test("T-ST-61: organização inexistente → 404; organização de sistema → 422; ator de organização → 403; trilha sem dado pessoal", async () => {
  await withApi(async (baseUrl) => {
    const missing = await requestJson(baseUrl, "/api/v1/platform/billing/tenants/ten_nope/billing-profile", { headers: PLATFORM });
    assert.equal(missing.status, 404);

    getMemoryTenantLookupForTests().upsert({ id: "ten_platform_sys", slug: "platform" });
    const system = await requestJson(baseUrl, "/api/v1/platform/billing/tenants/ten_platform_sys/billing-profile", {
      method: "PUT",
      headers: PLATFORM,
      body: { legalName: "Plataforma" },
    });
    assert.equal(system.status, 422);
    assert.equal(system.body.error.reason, "platform_organization");

    const tenantId = await seedTenant();
    const path = `/api/v1/platform/billing/tenants/${tenantId}/billing-profile`;
    const denied = await requestJson(baseUrl, path, { method: "PUT", headers: TENANT_MANAGER, body: {} });
    assert.equal(denied.status, 403);

    await requestJson(baseUrl, path, {
      method: "PUT",
      headers: PLATFORM,
      body: { legalName: "Pátio Exemplo Ltda", document: VALID_CPF, email: "pessoa@exemplo.com.br" },
    });
    const event = getMemoryStatementAuditForTests().events.find((item) => item.tenantId === tenantId && item.action === "subscription_billing_profile.updated");
    assert.ok(event, "PUT do perfil entra na trilha");
    const serialized = JSON.stringify(event.metadata);
    for (const leak of ["52998224725", "pessoa@", "Pátio Exemplo"]) assert.equal(serialized.includes(leak), false, `vazou ${leak}`);
  });
});
