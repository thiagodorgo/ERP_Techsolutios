import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import { desmontarPlatOrgReal, montarPlatOrgReal, type PlatOrgRealHarness } from "./helpers/plat-org-real.js";
import {
  entrar,
  novaOrganizacao,
  portador,
} from "./helpers/users-seg-desativado-sessao.js";

const connectionString = process.env.DATABASE_URL;
assert.ok(connectionString, "DATABASE_URL is required");

let harnessPromise: Promise<PlatOrgRealHarness> | undefined;
const harness = () => (harnessPromise ??= montarPlatOrgReal(connectionString));

after(async () => {
  if (harnessPromise) {
    const h = await harnessPromise.catch(() => undefined);
    if (h) await desmontarPlatOrgReal(h);
  }
});

test("S2: suspensão pela rota encerra a sessão, que não revive após reativação", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "plat-org-s2");
  const controle = await novaOrganizacao(h, "plat-org-s2-controle");
  const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
  const sessaoControle = await entrar(h, { tenantId: controle.tenantId, email: controle.email, password: controle.password });

  for (const status of ["suspended", "active"] as const) {
    const response = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${org.tenantId}/status`, {
      method: "PATCH",
      headers: h.platformHeaders,
      body: { status, reason: "security" },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }

  const antiga = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", { headers: portador(sessao.accessToken) });
  const positiva = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", { headers: portador(sessaoControle.accessToken) });
  assert.equal(antiga.status, 401, JSON.stringify(antiga.body));
  assert.equal(antiga.body.error?.reason, "session_inactive");
  assert.equal(positiva.status, 200, JSON.stringify(positiva.body));
});

test("S1/S5: organização suspensa no banco corta o token e não afeta outra organização", async () => {
  const h = await harness();
  assert.equal(process.env.CORE_SAAS_PERSISTENCE, "prisma");
  const [runtimeRole] = await h.admin.$queryRaw<Array<{ rolbypassrls: boolean }>>`
    SELECT rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
  `;
  assert.equal(runtimeRole?.rolbypassrls, false);
  const orgA = await novaOrganizacao(h, "plat-org-s1-a");
  const orgB = await novaOrganizacao(h, "plat-org-s1-b");
  const sessaoA = await entrar(h, { tenantId: orgA.tenantId, email: orgA.email, password: orgA.password });
  const sessaoB = await entrar(h, { tenantId: orgB.tenantId, email: orgB.email, password: orgB.password });

  await h.admin.tenant.update({ where: { id: orgA.tenantId }, data: { status: "suspended" } });

  const recusada = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
    headers: portador(sessaoA.accessToken),
  });
  const controle = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
    headers: portador(sessaoB.accessToken),
  });
  assert.equal(recusada.status, 401, JSON.stringify(recusada.body));
  assert.equal(recusada.body.error?.reason, "session_inactive");
  assert.equal(controle.status, 200, JSON.stringify(controle.body));
});

test("S3: senha certa revela tenant_suspended e senha errada permanece genérica", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "plat-org-s3");
  await h.admin.tenant.update({ where: { id: org.tenantId }, data: { status: "suspended" } });

  const correta = await requestJson(h.baseUrl, "/api/v1/auth/login", {
    method: "POST",
    body: { tenantId: org.tenantId, email: org.email, password: org.password },
  });
  const errada = await requestJson(h.baseUrl, "/api/v1/auth/login", {
    method: "POST",
    body: { tenantId: org.tenantId, email: org.email, password: `${org.password}-errada` },
  });
  assert.equal(correta.status, 403, JSON.stringify(correta.body));
  assert.equal(correta.body.error?.reason, "tenant_suspended");
  assert.equal(errada.status, 401, JSON.stringify(errada.body));
  assert.equal(errada.body.error?.code, "INVALID_CREDENTIALS");
});

test("S4/S7: refresh suspenso falha e login volta após reativação", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "plat-org-s4");
  const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
  await h.admin.tenant.update({ where: { id: org.tenantId }, data: { status: "suspended" } });

  const refresh = await requestJson(h.baseUrl, "/api/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken: sessao.refreshToken },
  });
  assert.equal(refresh.status, 401, JSON.stringify(refresh.body));

  await h.admin.tenant.update({ where: { id: org.tenantId }, data: { status: "active" } });
  const nova = await requestJson(h.baseUrl, "/api/v1/auth/login", {
    method: "POST",
    body: { tenantId: org.tenantId, email: org.email, password: org.password },
  });
  assert.equal(nova.status, 200, JSON.stringify(nova.body));
});

test("S6: a organização de sistema não pode ser suspensa", async () => {
  const h = await harness();
  let system = await h.admin.tenant.findUnique({ where: { slug: "platform" }, select: { id: true } });
  if (!system) {
    system = await h.admin.tenant.create({
      data: { name: "Plataforma", slug: "platform", status: "active", modules: [] },
      select: { id: true },
    });
    h.tenantIds.push(system.id);
  }
  const response = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${system.id}/status`, {
    method: "PATCH",
    headers: h.platformHeaders,
    body: { status: "suspended", reason: "security" },
  });
  assert.equal(response.status, 422, JSON.stringify(response.body));
  assert.equal(response.body.error?.reason, "platform_organization");
  assert.equal((await h.admin.tenant.findUniqueOrThrow({ where: { id: system.id } })).status, "active");
  const plataforma = await requestJson(h.baseUrl, "/api/v1/platform/tenants", { headers: h.platformHeaders });
  assert.equal(plataforma.status, 200, JSON.stringify(plataforma.body));
});

test("S10: suspensão e reativação registram ator, transição e motivo", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "plat-org-s10");
  for (const status of ["suspended", "active"] as const) {
    const response = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${org.tenantId}/status`, {
      method: "PATCH",
      headers: h.platformHeaders,
      body: { status, reason: "customer_request" },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
  const rows = await h.admin.platformAuditLog.findMany({
    where: { tenant_id: org.tenantId, action: { in: ["organization.suspended", "organization.reactivated"] } },
    orderBy: { created_at: "asc" },
  });
  assert.deepEqual(rows.map((row) => row.action), ["organization.suspended", "organization.reactivated"]);
  assert.deepEqual(rows.map((row) => row.actor_user_id), [h.actor.userId, h.actor.userId]);
  assert.deepEqual(rows.map((row) => row.metadata), [
    { actor_user_id: h.actor.userId, reason_code: "customer_request", status_from: "active", status_to: "suspended" },
    { actor_user_id: h.actor.userId, reason_code: "customer_request", status_from: "suspended", status_to: "active" },
  ]);
});

test("S11: criar usuário em organização suspensa é recusado", async () => {
  const h = await harness();
  const org = await novaOrganizacao(h, "plat-org-s11");
  await h.admin.tenant.update({ where: { id: org.tenantId }, data: { status: "suspended" } });
  const before = await h.admin.user.count({ where: { tenant_id: org.tenantId } });
  const response = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${org.tenantId}/admin-user`, {
    method: "POST",
    headers: h.platformHeaders,
    body: { name: "Administrador suspenso", email: `s11-${Date.now()}@example.com` },
  });
  assert.equal(response.status, 400, JSON.stringify(response.body));
  assert.equal(response.body.error?.reason, "inactive_tenant");
  assert.equal(await h.admin.user.count({ where: { tenant_id: org.tenantId } }), before);
});
