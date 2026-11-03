import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import express from "express";

import { ROLE_PERMISSIONS, type Permission } from "../src/modules/core-saas/permissions/catalog.js";
import { getMemoryChargeRepositoryForTests, resetChargeRuntimeForTests } from "../src/modules/charging/charge.service.js";
import { getMemoryImpoundRepositoryForTests, resetImpoundRuntimeForTests } from "../src/modules/impound/impound.service.js";
import { createImpoundPaymentRouter } from "../src/modules/impound-payments/impound-payment.routes.js";
import {
  createMemoryImpoundPaymentService,
  getMemoryImpoundPaymentRepositoryForTests,
  resetImpoundPaymentRuntimeForTests,
} from "../src/modules/impound-payments/impound-payment.service.js";
import { PAYMENT_METHODS, type PaymentConnectionPort } from "../src/modules/impound-payments/impound-payment.types.js";
import { createMemoryReleaseService, getMemoryReleaseRepositoryForTests, resetReleaseRuntimeForTests } from "../src/modules/release/release.service.js";

// B-PATIO-REC-01 F3 — rotas da cobrança on-line, a permissão `charging:online_payment` e a allowlist do DTO. Ambiente [SB].

const ONLINE_PAYMENT = "charging:online_payment" as Permission;
const SETTLE = "charging:settle" as Permission;
const CPF = "529.982.247-25";
const OPEN = { isEnabled: async () => true };

function headers(tenantId: string, role: string): Record<string, string> {
  return { "content-type": "application/json", "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": role };
}

async function call(baseUrl: string, path: string, init: { method?: string; headers: Record<string, string>; body?: unknown }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function listen(app: express.Express): Promise<{ baseUrl: string; server: Server }> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return { baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server };
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function withApp(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  const { app } = await import("../src/app.js");
  const { baseUrl, server } = await listen(app);
  try {
    await callback(baseUrl);
  } finally {
    await close(server);
  }
}

async function withCustomApp(service: ReturnType<typeof createMemoryImpoundPaymentService>, callback: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", createImpoundPaymentRouter(async () => service));
  const { baseUrl, server } = await listen(app);
  try {
    await callback(baseUrl);
  } finally {
    await close(server);
  }
}

function resetAll(): void {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetReleaseRuntimeForTests();
  resetImpoundPaymentRuntimeForTests();
}

// Processo em liberação STANDARD com R$ 150 de remoção devida.
async function processInRelease(tenantId: string): Promise<string> {
  const impound = getMemoryImpoundRepositoryForTests();
  const profileId = randomUUID();
  const process = await impound.openFromRemovalAtomic({
    tenantId,
    serviceOrderId: randomUUID(),
    profileId,
    originAuthority: "Autoridade solicitante",
    unidentifiedReason: "Aguardando vistoria de recepção",
    completedAt: new Date(Date.now() - 2 * 86_400_000),
    actorId: undefined,
  });
  await impound.applyTransition({
    tenantId,
    processId: process.id,
    expectedFrom: "RECEPTION",
    to: "ACTIVE_CUSTODY",
    setEnteredAt: false,
    setFrozenAt: false,
    event: { type: "STATUS_CHANGE", payload: { from: "RECEPTION", to: "ACTIVE_CUSTODY", reason: null }, occurredAt: new Date(), actorId: undefined },
  });
  getMemoryChargeRepositoryForTests().setProfileForTests(tenantId, profileId, {
    scope: "PUBLIC_AGREEMENT",
    model: "ROLLING_24H",
    cap: "SIX_MONTHS",
    dailyServiceCatalogId: randomUUID(),
  });
  getMemoryReleaseRepositoryForTests().setProfileRequirementsForTests(tenantId, profileId, []);
  await getMemoryChargeRepositoryForTests().createManualCharge({
    tenantId,
    processId: process.id,
    kind: "REMOVAL",
    quantity: "1.00",
    unitAmount: "150.00",
    totalAmount: "150.00",
    currency: "BRL",
    occurredAt: new Date(),
  });
  await createMemoryReleaseService().start({ tenantId, userId: randomUUID() }, process.id, { recipient_name: "R" });
  return process.id;
}

// K1 (emenda §12): a porta devolve o DONO da conexão; aqui, a própria organização que pediu.
const ownPort: PaymentConnectionPort = {
  resolve: async (tenantId) => ({ ok: true, account: { scope: "organization", connectionId: randomUUID(), ownerTenantId: tenantId }, provider: "asaas", methods: PAYMENT_METHODS }),
};

function deepKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) deepKeys(item, keys);
  } else if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      keys.add(key);
      deepKeys(inner, keys);
    }
  }
  return keys;
}

test("T-DOM-13 · operator não gera cobrança on-line: 403 permission_required", async () => {
  resetAll();
  await withApp(async (baseUrl) => {
    const tenantId = randomUUID();
    const response = await call(baseUrl, `/api/v1/impound-processes/${randomUUID()}/online-payment`, {
      method: "POST",
      headers: headers(tenantId, "operator"),
      body: { payerName: "Maria", payerDocument: CPF },
    });
    assert.equal(response.status, 403, JSON.stringify(response.body));
    assert.equal((response.body.error as { reason?: string })?.reason, "permission_required");
  });
});

test("T-DOM-14 · charging:online_payment tem a MESMA distribuição de charging:settle (gestão + admins; nunca operator, finance, auditor)", () => {
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    assert.equal(permissions.includes(ONLINE_PAYMENT), permissions.includes(SETTLE), `${role}: online_payment ≠ settle`);
  }
  for (const role of ["manager", "tenant_admin", "super_admin", "platform_admin"] as const) {
    assert.equal(ROLE_PERMISSIONS[role].includes(ONLINE_PAYMENT), true, role);
  }
  for (const role of ["operator", "finance", "auditor", "viewer", "support", "inventory", "field_technician", "field_dispatcher", "technician"] as const) {
    assert.equal(ROLE_PERMISSIONS[role].includes(ONLINE_PAYMENT), false, role);
  }
});

test("T-DOM-15 · R-ISO: processo de outra organização → 404 nas leituras e na criação, sem revelar a cobrança", async () => {
  resetAll();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const processA = await processInRelease(tenantA);
  await createMemoryImpoundPaymentService({ connections: ownPort, gate: OPEN }).create(
    { tenantId: tenantA, userId: randomUUID(), roles: ["manager"], permissions: [] },
    processA,
    { payerName: "Maria", payerDocument: CPF },
  );
  await withApp(async (baseUrl) => {
    for (const suffix of ["online-payment", "online-payments"]) {
      const response = await call(baseUrl, `/api/v1/impound-processes/${processA}/${suffix}`, { headers: headers(tenantB, "manager") });
      assert.equal(response.status, 404, `${suffix}: ${JSON.stringify(response.body)}`);
      assert.doesNotMatch(JSON.stringify(response.body), /Maria|amountCents|intent/);
    }
    const own = await call(baseUrl, `/api/v1/impound-processes/${processA}/online-payments`, { headers: headers(tenantA, "manager") });
    assert.equal(own.status, 200);
    assert.equal((own.body.data as unknown[]).length, 1);
  });
  await withCustomApp(createMemoryImpoundPaymentService({ connections: ownPort, gate: OPEN }), async (baseUrl) => {
    const response = await call(baseUrl, `/api/v1/impound-processes/${processA}/online-payment`, {
      method: "POST",
      headers: headers(tenantB, "manager"),
      body: { payerName: "Maria", payerDocument: CPF },
    });
    assert.equal(response.status, 404, JSON.stringify(response.body));
  });
});

test("T-DOM-16 · allowlist do DTO: documento mascarado; nenhuma chave de organização, conexão, grupo ou id externo", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processInRelease(tenantId);
  await withCustomApp(createMemoryImpoundPaymentService({ connections: ownPort, gate: OPEN }), async (baseUrl) => {
    const created = await call(baseUrl, `/api/v1/impound-processes/${processId}/online-payment`, {
      method: "POST",
      headers: headers(tenantId, "manager"),
      body: { payerName: "Maria da Silva", payerDocument: CPF },
    });
    assert.equal(created.status, 202, JSON.stringify(created.body));
    // Uma intenção de GRUPO (que o REC-04 vai criar) semeada no mesmo processo: o DTO também não pode vazar os ids do grupo.
    const seeded = getMemoryImpoundPaymentRepositoryForTests().allIntentsForTests()[0]!;
    getMemoryImpoundPaymentRepositoryForTests().seedIntentForTests({
      ...seeded,
      id: randomUUID(),
      status: "cancelled",
      cancelReason: "cancel",
      account: { scope: "group", groupId: randomUUID(), groupConnectionId: randomUUID() },
      createdAt: new Date(seeded.createdAt.getTime() - 1000),
    });
    const live = await call(baseUrl, `/api/v1/impound-processes/${processId}/online-payment`, { headers: headers(tenantId, "manager") });
    const list = await call(baseUrl, `/api/v1/impound-processes/${processId}/online-payments`, { headers: headers(tenantId, "manager") });
    for (const body of [created.body, live.body, list.body]) {
      const keys = deepKeys(body);
      for (const forbidden of [
        "tenantId",
        "tenant_id",
        "externalChargeId",
        "external_charge_id",
        "connectionId",
        "paymentConnectionId",
        "groupId",
        "paymentGroupId",
        "groupConnectionId",
        "paymentGroupConnectionId",
        "account",
        "provider",
        "split",
        "token",
      ]) {
        assert.equal(keys.has(forbidden), false, `chave proibida no DTO: ${forbidden}`);
      }
      assert.doesNotMatch(JSON.stringify(body), /52998224725|529\.982\.247/);
    }
    const intent = (created.body.intent ?? {}) as Record<string, unknown>;
    assert.equal(intent.payerDocument, "***.***.***-25");
    assert.equal(intent.accountScope, "organization");
    assert.deepEqual((list.body.data as Array<{ accountScope: string }>).map((item) => item.accountScope), ["group", "organization"]);
    assert.equal(intent.amountLabel, "R$ 150,00");
    assert.equal(intent.status, "pending");
  });
});

test("T-DOM-17 · no app real, o portão PADRÃO do canal recusa: 422 channel_disabled", async () => {
  resetAll();
  await withApp(async (baseUrl) => {
    const tenantId = randomUUID();
    const response = await call(baseUrl, `/api/v1/impound-processes/${randomUUID()}/online-payment`, {
      method: "POST",
      headers: headers(tenantId, "manager"),
      body: { payerName: "Maria", payerDocument: CPF },
    });
    assert.equal((response.body.error as { reason?: string })?.reason, "channel_disabled", `expected 422 channel_disabled, got ${response.status}`);
    assert.equal(response.status, 422);

    // K3 (emenda §12, declarado): o express.json() global do app lê o corpo ANTES do roteador. JSON malformado → 400 do leitor,
    // sem eco do conteúdo e sem nada do processo. A garantia "com o canal desligado a resposta não depende do pedido" vale para
    // corpo JSON VÁLIDO (acima). Pendência P-PATIO-BODY-PARSER-ANTES-DO-PORTAO, da trilha de plataforma.
    const malformed = await fetch(`${baseUrl}/api/v1/impound-processes/${randomUUID()}/online-payment`, {
      method: "POST",
      headers: headers(tenantId, "manager"),
      body: "{",
    });
    const text = await malformed.text();
    assert.equal(malformed.status, 400, text);
    assert.doesNotMatch(text, /channel_disabled|impound|online/i);
  });
});

test("T-DOM-18 · com o canal ligado e a porta de conexão PADRÃO: 422 payment_mode_unset (sem modo, só baixa manual)", async () => {
  resetAll();
  const tenantId = randomUUID();
  const processId = await processInRelease(tenantId);
  await withCustomApp(createMemoryImpoundPaymentService({ gate: OPEN }), async (baseUrl) => {
    const response = await call(baseUrl, `/api/v1/impound-processes/${processId}/online-payment`, {
      method: "POST",
      headers: headers(tenantId, "manager"),
      body: { payerName: "Maria", payerDocument: CPF },
    });
    assert.equal(response.status, 422, JSON.stringify(response.body));
    assert.equal((response.body.error as { reason?: string })?.reason, "payment_mode_unset");
  });
});
