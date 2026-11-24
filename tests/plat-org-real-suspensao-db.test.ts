import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import {
  desmontarSessaoReal,
  entrar,
  montarSessaoReal,
  novaOrganizacao,
  portador,
  type SessaoRealHarness,
} from "./helpers/users-seg-desativado-sessao.js";

const connectionString = process.env.DATABASE_URL;
assert.ok(connectionString, "DATABASE_URL is required");

let harnessPromise: Promise<SessaoRealHarness> | undefined;
const harness = () => (harnessPromise ??= montarSessaoReal(connectionString));

after(async () => {
  if (harnessPromise) {
    const h = await harnessPromise.catch(() => undefined);
    if (h) await desmontarSessaoReal(h);
  }
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
