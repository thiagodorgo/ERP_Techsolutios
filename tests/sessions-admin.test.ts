import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  deviceLabelFromUserAgent,
  toSessionView,
} from "../src/modules/auth/services/session-admin.service.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// =============================================================================
// Ω4C PR-11 — Sessões administrativas + revogação REAL.
// (1) Projeção §2.8 (pura, memória): SessionView nunca vaza refresh_token_hash/ip/tenant_id/user_id.
// (2) RBAC das rotas (memória, sem DB): requirePermission curto-circuita antes do handler → prova a
//     segregação auditor(read)×admin(revoke) e o gate de leitura.
// (3) Integração REAL (DB-gated): revogar por id marca revoked_at → refreshSession subsequente FALHA;
//     cross-tenant → 404 sem revogar; idempotência; histórico de acessos; auditoria da revogação.
// =============================================================================

// ---------------------------------------------------------------------------
// (1) §2.8 — projeção pura
// ---------------------------------------------------------------------------
test("SessionView (§2.8) só expõe a allowlist — nunca token/ip/tenant/user_id", () => {
  const view = toSessionView(
    {
      id: "sess-1",
      user_id: "11111111-1111-4111-8111-111111111111",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36",
      ip_address: "203.0.113.9",
      created_at: new Date("2026-01-01T10:00:00Z"),
      updated_at: new Date("2026-01-01T11:00:00Z"),
      revoked_at: null,
      expires_at: new Date(Date.now() + 3_600_000),
    },
    "worker@example.com",
  );

  assert.deepEqual(Object.keys(view).sort(), [
    "deviceLabel",
    "id",
    "lastActivityAt",
    "loginAt",
    "status",
    "userLabel",
  ]);
  assert.equal(view.userLabel, "worker@example.com");
  assert.equal(view.status, "active");
  assert.equal(view.deviceLabel, "Chrome · Windows");

  const serialized = JSON.stringify(view);
  assert.equal(serialized.includes("203.0.113.9"), false); // ip omitido
  assert.equal(serialized.includes("refresh_token_hash"), false);
  assert.equal(serialized.includes("11111111-1111-4111-8111-111111111111"), false); // user_id cru
  assert.equal(serialized.includes("Mozilla"), false); // UA crua
});

test("deviceLabelFromUserAgent gera rótulo grosseiro (nunca a UA crua)", () => {
  assert.equal(deviceLabelFromUserAgent(undefined), "Dispositivo desconhecido");
  assert.equal(deviceLabelFromUserAgent(""), "Dispositivo desconhecido");
  assert.equal(
    deviceLabelFromUserAgent("Mozilla/5.0 (Macintosh) Firefox/121.0"),
    "Firefox · macOS",
  );
  assert.equal(
    deviceLabelFromUserAgent("Mozilla/5.0 (Linux; Android 13) Chrome/119.0 Mobile Safari/537.36"),
    "Chrome · Android",
  );
});

// ---------------------------------------------------------------------------
// (2) RBAC das rotas (memória)
// ---------------------------------------------------------------------------
test("GET /sessions exige sessions:read (viewer/operator → 403)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const viewer = await get(baseUrl, "/api/v1/sessions", authHeaders(seed.tenant, seed.viewer, "viewer"));
    assert.equal(viewer.status, 403);
    assert.equal(viewer.body.error.reason, "permission_required");

    const operator = await get(baseUrl, "/api/v1/sessions", authHeaders(seed.tenant, seed.viewer, "operator"));
    assert.equal(operator.status, 403);
    assert.equal(operator.body.error.reason, "permission_required");
  });
});

test("POST /sessions/:id/revoke exige sessions:revoke — auditor (tem read) → 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const target = "22222222-2222-4222-8222-222222222222";
    const auditor = await post(
      baseUrl,
      `/api/v1/sessions/${target}/revoke`,
      authHeaders(seed.tenant, seed.auditor, "auditor"),
    );

    // auditor tem sessions:read mas NÃO sessions:revoke → 403 (segregação de funções).
    assert.equal(auditor.status, 403);
    assert.equal(auditor.body.error.reason, "permission_required");
  });
});

// ---------------------------------------------------------------------------
// (3) Integração REAL — DB-gated
// ---------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Session admin integration requires DATABASE_URL and a migrated PostgreSQL database", {
    skip: "Set DATABASE_URL and run migrations to execute the real revocation integration test.",
  });
} else {
  test("revogação administrativa invalida a sessão DE VERDADE (refresh bloqueado) e isola por tenant", async () => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_SECRET = "dev-only-refresh-change-me";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";

    const [
      { PrismaPg },
      { PrismaClient },
      { withTenantRls },
      { AuthSessionService },
      { SessionAdminService },
      { AuditLogRepository },
    ] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
      import("../src/modules/auth/services/auth-session.service.js"),
      import("../src/modules/auth/services/session-admin.service.js"),
      import("../src/modules/core-saas/repositories/audit-log.repository.js"),
    ]);

    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    const userIds: string[] = [];

    const runner = (tenantId: string, work: Parameters<typeof withTenantRls>[2]) =>
      withTenantRls(client, tenantId, work);

    const sessionService = new AuthSessionService(runner, (tx) => new AuditLogRepository(tx));
    const adminService = new SessionAdminService(runner, (tx) => new AuditLogRepository(tx));

    try {
      // 3 tenants efêmeros (A operado; B intruso; C ruído) — isolamento com 3 tenants distintos.
      const tenantA = await client.tenant.create({ data: { name: `Sess A ${suffix}`, slug: `sess-a-${suffix}` } });
      const tenantB = await client.tenant.create({ data: { name: `Sess B ${suffix}`, slug: `sess-b-${suffix}` } });
      const tenantC = await client.tenant.create({ data: { name: `Sess C ${suffix}`, slug: `sess-c-${suffix}` } });
      tenantIds.push(tenantA.id, tenantB.id, tenantC.id);

      const emailA = `worker-a-${suffix}@example.com`;
      const userA = await withTenantRls(client, tenantA.id, (tx) =>
        tx.user.create({ data: { tenant_id: tenantA.id, name: "Worker A", email: emailA } }),
      );
      const adminA = await withTenantRls(client, tenantA.id, (tx) =>
        tx.user.create({ data: { tenant_id: tenantA.id, name: "Admin A", email: `admin-a-${suffix}@example.com` } }),
      );
      const adminB = await withTenantRls(client, tenantB.id, (tx) =>
        tx.user.create({ data: { tenant_id: tenantB.id, name: "Admin B", email: `admin-b-${suffix}@example.com` } }),
      );
      userIds.push(userA.id, adminA.id, adminB.id);

      // Duas sessões vivas para o usuário A (dois logins).
      const first = await sessionService.createSession({
        tenant_id: tenantA.id,
        user_id: userA.id,
        user_agent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36",
        ip_address: "203.0.113.10",
      });
      const second = await sessionService.createSession({
        tenant_id: tenantA.id,
        user_id: userA.id,
        user_agent: "Mozilla/5.0 (Macintosh) Safari/605.1",
        ip_address: "203.0.113.11",
      });

      // Sanidade: o refresh funciona ANTES da revogação.
      const preRefresh = await sessionService.refreshSession(first.refreshToken);
      assert.equal(preRefresh.ok, true);

      // Listar ativas (SessionView §2.8) — as duas aparecem, sem vazar segredo.
      const active = await adminService.listActiveSessions({ tenantId: tenantA.id, userId: adminA.id }, {});
      assert.equal(active.length, 2);
      const listedIds = active.map((session) => session.id).sort();
      assert.deepEqual(listedIds, [first.sessionId, second.sessionId].sort());
      const viewJson = JSON.stringify(active);
      assert.equal(viewJson.includes("203.0.113"), false); // nenhum ip
      assert.equal(viewJson.includes("refresh_token_hash"), false);
      assert.ok(active.every((session) => session.userLabel === emailA)); // rótulo = email
      assert.ok(active.every((session) => session.status === "active"));

      // REVOGAÇÃO administrativa (admin A revoga a 1ª sessão do worker, SEM o token da vítima).
      const revoke = await adminService.revokeSession({ tenantId: tenantA.id, userId: adminA.id }, first.sessionId);
      assert.deepEqual(revoke, { revoked: true });

      // revoked_at foi realmente carimbado.
      const revokedRow = await client.authSession.findUniqueOrThrow({ where: { id: first.sessionId } });
      assert.ok(revokedRow.revoked_at instanceof Date);

      // PROVA DO EFEITO REAL: o refresh subsequente (com o refresh token rotacionado do preRefresh) FALHA.
      assert.equal(preRefresh.ok, true);
      const blocked = await sessionService.refreshSession(
        preRefresh.ok ? preRefresh.refreshToken : first.refreshToken,
      );
      assert.equal(blocked.ok, false);
      assert.equal(blocked.ok === false ? blocked.reason : "", "revoked");

      // Idempotência: revogar de novo → 200 revoked:true, sem erro.
      const again = await adminService.revokeSession({ tenantId: tenantA.id, userId: adminA.id }, first.sessionId);
      assert.deepEqual(again, { revoked: true });

      // A 2ª sessão continua ativa (só a alvo foi derrubada).
      const stillActive = await adminService.listActiveSessions({ tenantId: tenantA.id, userId: adminA.id }, {});
      assert.deepEqual(
        stillActive.map((session) => session.id),
        [second.sessionId],
      );

      // ISOLAMENTO CROSS-TENANT: admin do tenant B tenta revogar a sessão viva do tenant A → 404, sem revogar.
      await assert.rejects(
        adminService.revokeSession({ tenantId: tenantB.id, userId: adminB.id }, second.sessionId),
        (error: unknown) =>
          typeof error === "object" && error !== null && (error as { statusCode?: number }).statusCode === 404,
      );
      const untouched = await client.authSession.findUniqueOrThrow({ where: { id: second.sessionId } });
      assert.equal(untouched.revoked_at, null);

      // Cross-tenant LISTAGEM: tenant C não vê nenhuma sessão do A.
      const tenantCView = await adminService.listActiveSessions({ tenantId: tenantC.id, userId: adminB.id }, {});
      assert.deepEqual(tenantCView, []);

      // Histórico de acessos: último login do worker A = created_at da sessão mais recente.
      const history = await adminService.accessHistory({ tenantId: tenantA.id, userId: adminA.id }, {});
      const workerAccess = history.find((entry) => entry.userLabel === emailA);
      assert.ok(workerAccess);
      assert.ok(workerAccess.lastAccessAt instanceof Date);

      // AUDITORIA da revogação (auth.session.revoked, ator=admin) foi escrita.
      const auditRows = await withTenantRls(client, tenantA.id, (tx) =>
        tx.auditLog.findMany({
          where: { tenant_id: tenantA.id, action: "auth.session.revoked", entity_id: first.sessionId },
        }),
      );
      const adminAudit = auditRows.find((row) => row.actor_user_id === adminA.id);
      assert.ok(adminAudit, "esperava trilha auth.session.revoked do admin");
      const auditJson = JSON.stringify(adminAudit?.metadata ?? {});
      assert.equal(auditJson.includes("203.0.113"), false); // sem ip na auditoria
      assert.equal(auditJson.includes("refresh_token_hash"), false);
    } finally {
      // Teardown FK-safe: auth_sessions → audit_logs → users → tenants.
      await client.authSession.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.auditLog.deleteMany({ where: { tenant_id: { in: tenantIds } } });
      await client.user.deleteMany({ where: { id: { in: userIds } } });
      await client.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await client.$disconnect();
    }
  });
}

type SeedData = {
  readonly tenant: Tenant;
  readonly admin: User;
  readonly auditor: User;
  readonly viewer: User;
};

async function withApi(callback: (context: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const [{ app }, { coreSaasService }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/index.js"),
  ]);

  coreSaasService.reset();
  const tenant = coreSaasService.createTenant({ name: "Tenant Sessions" });
  const admin = coreSaasService.createUser({
    tenantId: tenant.id,
    name: "Admin",
    email: "admin-sess@example.com",
    roles: ["tenant_admin"],
  });
  const auditor = coreSaasService.createUser({
    tenantId: tenant.id,
    name: "Auditor",
    email: "auditor-sess@example.com",
    roles: ["auditor"],
  });
  const viewer = coreSaasService.createUser({
    tenantId: tenant.id,
    name: "Viewer",
    email: "viewer-sess@example.com",
    roles: ["viewer"],
  });

  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenant, admin, auditor, viewer } });
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
    headers: { "content-type": "application/json", ...headers },
  });

  return { status: response.status, body: await response.json() };
}

async function post(baseUrl: string, path: string, headers: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
  });

  return { status: response.status, body: await response.json() };
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
