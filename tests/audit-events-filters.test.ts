import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω4C PR-11 (D-Ω4C-AUD-FILTERS / D-Ω4C-AUD-ALLOWLIST-2.8) — filtros server-side + paginação + §2.8 do
// GET /api/v1/audit-events, exercitados em MEMÓRIA (CORE_SAAS_PERSISTENCE=memory, sem DB). Os eventos
// são inseridos direto no store in-memory para controlar action/actor/timestamp determinísticos.

const TENANT_A_ADMIN = "tenant_admin";

test("audit-events aplica filtros server-side, paginação e projeção §2.8", async () => {
  await withApi(async ({ baseUrl, store, seed }) => {
    const base = Date.UTC(2026, 0, 1, 12, 0, 0);
    // 5 eventos do tenant A com actions/actores/timestamps distintos.
    saveEvent(store, {
      id: "aud_1",
      action: "user.created",
      actor_user_id: seed.adminA.id,
      tenant_id: seed.tenantA.id,
      timestamp: new Date(base + 1_000),
      metadata: { ipAddress: "203.0.113.5", userAgent: "Mozilla/5.0 secret-UA", accessToken: "leak-me" },
    });
    saveEvent(store, {
      id: "aud_2",
      action: "user.updated",
      actor_user_id: seed.adminA.id,
      tenant_id: seed.tenantA.id,
      timestamp: new Date(base + 2_000),
    });
    saveEvent(store, {
      id: "aud_3",
      action: "user.created",
      actor_user_id: seed.viewerA.id,
      tenant_id: seed.tenantA.id,
      timestamp: new Date(base + 3_000),
    });
    saveEvent(store, {
      id: "aud_4",
      action: "auth.session.revoked",
      actor_user_id: seed.adminA.id,
      tenant_id: seed.tenantA.id,
      timestamp: new Date(base + 4_000),
    });
    saveEvent(store, {
      id: "aud_5",
      action: "user.created",
      actor_user_id: seed.adminA.id,
      tenant_id: seed.tenantA.id,
      timestamp: new Date(base + 5_000),
    });
    // Evento de OUTRO tenant — nunca deve aparecer.
    saveEvent(store, {
      id: "aud_other",
      action: "user.created",
      actor_user_id: "someone",
      tenant_id: seed.tenantB.id,
      timestamp: new Date(base + 9_000),
    });

    const headers = authHeaders(seed.tenantA, seed.adminA, TENANT_A_ADMIN);

    // Sem filtro: só os 5 do tenant A, ordenados DESC (mais recente primeiro).
    const all = await get(baseUrl, "/api/v1/audit-events", headers);
    assert.equal(all.status, 200);
    assert.deepEqual(
      all.body.data.map((event: { id: string }) => event.id),
      ["aud_5", "aud_4", "aud_3", "aud_2", "aud_1"],
    );

    // §2.8: nenhum item carrega metadata/ip/token/user_agent — só a allowlist.
    for (const item of all.body.data) {
      assert.deepEqual(Object.keys(item).sort(), ["action", "actor_user_id", "id", "tenant_id", "timestamp"]);
      assert.equal("metadata" in item, false);
      assert.equal("ipAddress" in item, false);
    }
    const rawJson = JSON.stringify(all.body.data);
    assert.equal(rawJson.includes("203.0.113.5"), false);
    assert.equal(rawJson.includes("secret-UA"), false);
    assert.equal(rawJson.includes("leak-me"), false);
    // O contrato estável (core-saas-contract) mantém tenant_id do PRÓPRIO ator.
    assert.equal(all.body.data[0].tenant_id, seed.tenantA.id);

    // Filtro por action.
    const byAction = await get(baseUrl, "/api/v1/audit-events?action=user.created", headers);
    assert.equal(byAction.status, 200);
    assert.deepEqual(
      byAction.body.data.map((event: { id: string }) => event.id),
      ["aud_5", "aud_3", "aud_1"],
    );

    // Filtro por ator.
    const byActor = await get(baseUrl, `/api/v1/audit-events?actorId=${seed.viewerA.id}`, headers);
    assert.equal(byActor.status, 200);
    assert.deepEqual(
      byActor.body.data.map((event: { id: string }) => event.id),
      ["aud_3"],
    );

    // Filtro por período (from>=): a partir de aud_3.
    const fromIso = new Date(base + 3_000).toISOString();
    const byFrom = await get(baseUrl, `/api/v1/audit-events?from=${encodeURIComponent(fromIso)}`, headers);
    assert.equal(byFrom.status, 200);
    assert.deepEqual(
      byFrom.body.data.map((event: { id: string }) => event.id),
      ["aud_5", "aud_4", "aud_3"],
    );

    // Período que exclui tudo (from no futuro) → vazio honesto.
    const future = new Date(base + 1_000_000).toISOString();
    const byFuture = await get(baseUrl, `/api/v1/audit-events?from=${encodeURIComponent(future)}`, headers);
    assert.equal(byFuture.status, 200);
    assert.deepEqual(byFuture.body.data, []);

    // Paginação: página 1 (limit=2) traz os 2 mais recentes + nextOffset=2.
    const page1 = await get(baseUrl, "/api/v1/audit-events?limit=2", headers);
    assert.equal(page1.status, 200);
    assert.deepEqual(
      page1.body.data.map((event: { id: string }) => event.id),
      ["aud_5", "aud_4"],
    );
    assert.equal(page1.body.nextOffset, 2);

    // Página 2.
    const page2 = await get(baseUrl, "/api/v1/audit-events?limit=2&offset=2", headers);
    assert.equal(page2.status, 200);
    assert.deepEqual(
      page2.body.data.map((event: { id: string }) => event.id),
      ["aud_3", "aud_2"],
    );
    assert.equal(page2.body.nextOffset, 4);

    // Última página: sem nextOffset.
    const page3 = await get(baseUrl, "/api/v1/audit-events?limit=2&offset=4", headers);
    assert.equal(page3.status, 200);
    assert.deepEqual(
      page3.body.data.map((event: { id: string }) => event.id),
      ["aud_1"],
    );
    assert.equal("nextOffset" in page3.body, false);
  });
});

test("audit-events rejeita filtros malformados com 422", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, TENANT_A_ADMIN);

    const badFrom = await get(baseUrl, "/api/v1/audit-events?from=not-a-date", headers);
    assert.equal(badFrom.status, 422);
    assert.equal(badFrom.body.error.reason, "invalid_from");

    const badLimitLow = await get(baseUrl, "/api/v1/audit-events?limit=0", headers);
    assert.equal(badLimitLow.status, 422);
    assert.equal(badLimitLow.body.error.reason, "invalid_limit");

    const badLimitHigh = await get(baseUrl, "/api/v1/audit-events?limit=999", headers);
    assert.equal(badLimitHigh.status, 422);
    assert.equal(badLimitHigh.body.error.reason, "invalid_limit");

    const badOffset = await get(baseUrl, "/api/v1/audit-events?offset=-1", headers);
    assert.equal(badOffset.status, 422);
    assert.equal(badOffset.body.error.reason, "invalid_offset");
  });
});

test("audit-events exige audit.read (papel sem a permissão → 403)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const forbidden = await get(
      baseUrl,
      "/api/v1/audit-events",
      authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    );

    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.error.reason, "permission_required");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly viewerA: User;
};

type StoreLike = {
  saveAuditEvent(event: {
    id: string;
    action: string;
    actor_user_id: string;
    tenant_id: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }): unknown;
  clearAuditEvents(): void;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly store: StoreLike;
};

function saveEvent(store: StoreLike, event: Parameters<StoreLike["saveAuditEvent"]>[0]): void {
  store.saveAuditEvent(event);
}

async function withApi(callback: (context: ApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const [{ app }, { coreSaasService, coreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/index.js"),
  ]);

  coreSaasService.reset();

  const tenantA = coreSaasService.createTenant({ name: "Tenant Audit A" });
  const tenantB = coreSaasService.createTenant({ name: "Tenant Audit B" });
  const adminA = coreSaasService.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "admin-audit-a@example.com",
    roles: ["tenant_admin"],
  });
  const viewerA = coreSaasService.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "viewer-audit-a@example.com",
    roles: ["viewer"],
  });

  // createTenant/createUser emitem eventos de auditoria (aud_NNNNNN, timestamp=now) —
  // ruído p/ as asserções determinísticas. Limpa só o ledger de auditoria (preserva o seed).
  (coreSaasStore as unknown as StoreLike).clearAuditEvents();

  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed: { tenantA, tenantB, adminA, viewerA },
      store: coreSaasStore as unknown as StoreLike,
    });
  } finally {
    await closeServer(server);
  }
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

async function get(baseUrl: string, path: string, headers: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
