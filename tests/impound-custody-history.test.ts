import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { toCustodyHistoryListDto } from "../src/modules/impound/impound.custody-history.dto.js";
import {
  createMemoryImpoundCustodyHistoryService,
  getMemoryImpoundCustodyHistoryRepositoryForTests,
  resetImpoundCustodyHistoryRuntimeForTests,
} from "../src/modules/impound/impound.custody-history.service.js";
import { ImpoundCustodyHistoryError } from "../src/modules/impound/impound.custody-history.types.js";
import type { ImpoundActorContext } from "../src/modules/impound/impound.types.js";

function actor(overrides: Partial<ImpoundActorContext> = {}): ImpoundActorContext {
  return {
    tenantId: overrides.tenantId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    roles: overrides.roles ?? ["manager"],
    permissions: overrides.permissions ?? ["impound:read"],
  };
}

function setup() {
  resetImpoundCustodyHistoryRuntimeForTests();
  return { service: createMemoryImpoundCustodyHistoryService(), repository: getMemoryImpoundCustodyHistoryRepositoryForTests() };
}

// ── agrupamento por identidade ─────────────────────────────────────────────────

test("custody-history: agrupa TODOS os processos da mesma identidade, marca o atual, ordena por entrada DESC", async () => {
  const { service, repository } = setup();
  const a = actor();
  const identityId = randomUUID();
  const p1 = randomUUID(); // mais antigo
  const p2 = randomUUID(); // atual (mais recente)
  const p3 = randomUUID(); // OUTRA identidade — não deve aparecer
  repository.registerProcessForTests({ tenantId: a.tenantId, id: p1, identityId, vehiclePlate: "ABC1D23", status: "RELEASED", enteredAt: new Date("2026-05-01T10:00:00Z"), yardName: "Pátio Central" });
  repository.registerProcessForTests({ tenantId: a.tenantId, id: p2, identityId, vehiclePlate: "ABC1D23", status: "ACTIVE_CUSTODY", enteredAt: new Date("2026-07-01T10:00:00Z"), yardName: "Pátio Norte" });
  repository.registerProcessForTests({ tenantId: a.tenantId, id: p3, identityId: randomUUID(), vehiclePlate: "XYZ9K88", status: "ACTIVE_CUSTODY", enteredAt: new Date("2026-06-01T10:00:00Z") });

  const history = await service.listCustodyHistory(a, p2);
  assert.equal(history.length, 2, "só os 2 processos da mesma identidade");
  assert.equal(history[0].id, p2, "mais recente (entrada desc) primeiro");
  assert.equal(history[0].isCurrent, true);
  assert.equal(history[1].id, p1);
  assert.equal(history[1].isCurrent, false);
  assert.equal(history[1].status, "RELEASED");
  assert.equal(history[0].yardName, "Pátio Norte");
});

test("custody-history: processo SEM identidade resolvida → só o próprio (custódia única), isCurrent=true", async () => {
  const { service, repository } = setup();
  const a = actor();
  const p = randomUUID();
  repository.registerProcessForTests({ tenantId: a.tenantId, id: p, vehiclePlate: "ABC1D23", status: "ACTIVE_CUSTODY", enteredAt: new Date() });

  const history = await service.listCustodyHistory(a, p);
  assert.equal(history.length, 1);
  assert.equal(history[0].id, p);
  assert.equal(history[0].isCurrent, true);
});

test("custody-history: identidade de OUTRO tenant não vaza (tenant-scoped)", async () => {
  const { service, repository } = setup();
  const a = actor();
  const identityId = randomUUID();
  const mine = randomUUID();
  repository.registerProcessForTests({ tenantId: a.tenantId, id: mine, identityId, vehiclePlate: "ABC1D23", status: "ACTIVE_CUSTODY", enteredAt: new Date("2026-07-01T10:00:00Z") });
  // MESMO identityId (colisão improvável, mas o filtro é tenant-first) sob OUTRO tenant.
  repository.registerProcessForTests({ tenantId: randomUUID(), id: randomUUID(), identityId, vehiclePlate: "ABC1D23", status: "RELEASED", enteredAt: new Date("2026-06-01T10:00:00Z") });

  const history = await service.listCustodyHistory(a, mine);
  assert.equal(history.length, 1, "só o processo do meu tenant");
  assert.equal(history[0].id, mine);
});

test("custody-history: processo inexistente/de outro tenant → 404", async () => {
  const { service } = setup();
  await assert.rejects(
    () => service.listCustodyHistory(actor(), randomUUID()),
    (error: unknown) => error instanceof ImpoundCustodyHistoryError && error.statusCode === 404 && error.reason === "process_not_found",
  );
});

// ── DTO / §allowlist ────────────────────────────────────────────────────────────

test("DTO: toCustodyHistoryListDto normaliza (null p/ ausentes) e NUNCA expõe tenant_id/identity_id (§allowlist)", () => {
  const dto = toCustodyHistoryListDto([
    { id: "p1", vehiclePlate: "ABC1D23", vehicleUnidentified: false, status: "ACTIVE_CUSTODY", enteredAt: new Date("2026-07-01T10:00:00.000Z"), yardName: "Pátio Central", isCurrent: true },
    { id: "p2", vehicleUnidentified: true, status: "RELEASED", isCurrent: false },
  ]);
  assert.equal(dto.items[0].vehiclePlate, "ABC1D23");
  assert.equal(dto.items[0].isCurrent, true);
  assert.equal(dto.items[0].enteredAt, "2026-07-01T10:00:00.000Z");
  assert.equal(dto.items[1].vehiclePlate, null, "placa ausente → null");
  assert.equal(dto.items[1].enteredAt, null);
  assert.equal(dto.items[1].yardName, null);
  const json = JSON.stringify(dto);
  assert.equal(json.includes("tenant"), false, "§allowlist: nenhum tenant_id");
  assert.equal(json.includes("identity"), false, "§allowlist: identity_id resolvido server-side, nunca no DTO");
});

// ── HTTP: gate impound:read ───────────────────────────────────────────────────

test("HTTP: GET /impound-processes/:id/custody-history exige impound:read (finance NÃO tem → 403)", async () => {
  await withApi(async ({ baseUrl, tenantId }) => {
    const response = await getReq(baseUrl, `/api/v1/impound-processes/${randomUUID()}/custody-history`, headers(tenantId, "finance"));
    assert.equal(response.status, 403, "finance não tem impound:read — barrado pelo gate");
  });
});

test("HTTP: GET /impound-processes/:id/custody-history — manager tem impound:read, passa o gate (404 do processo inexistente, não 403)", async () => {
  await withApi(async ({ baseUrl, tenantId }) => {
    const response = await getReq(baseUrl, `/api/v1/impound-processes/${randomUUID()}/custody-history`, headers(tenantId, "manager"));
    assert.notEqual(response.status, 403, "manager tem impound:read — não barrado pelo RBAC");
    assert.equal(response.status, 404, "processo inexistente — o gate passou, falhou na existência (esperado)");
  });
});

// ── helpers HTTP (mesmo padrão de tests/impound-checklist-link.test.ts — memória, sem DB) ───────────────────────

async function withApi(callback: (context: { baseUrl: string; tenantId: string }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  const { app } = await import("../src/app.js");
  const tenantId = randomUUID();
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);
  try {
    await callback({ baseUrl, tenantId });
  } finally {
    await closeServer(server);
  }
}

function headers(tenantId: string, role: string): Record<string, string> {
  return { "x-tenant-id": tenantId, "x-user-id": randomUUID(), "x-role": role };
}

async function getReq(baseUrl: string, path: string, extraHeaders: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { "content-type": "application/json", ...extraHeaders } });
  return { status: response.status, body: await response.json() };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
