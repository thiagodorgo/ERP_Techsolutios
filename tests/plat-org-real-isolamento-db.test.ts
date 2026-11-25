import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import {
  criarOrganizacaoPelaPlataforma,
  desmontarPlatOrgReal,
  montarPlatOrgReal,
  type PlatOrgRealHarness,
} from "./helpers/plat-org-real.js";
import { novaOrganizacao } from "./helpers/users-seg-desativado-sessao.js";

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

test("I1: tenant_admin recebe 403 nas oito rotas e não altera o banco", async () => {
  const h = await harness();
  const target = await novaOrganizacao(h, "plat-org-i1-target");
  const headers = {
    "x-tenant-id": h.actor.tenantId,
    "x-user-id": h.actor.userId,
    "x-role": "tenant_admin",
  };
  const routes = [
    ["GET", "/api/v1/platform/tenants", undefined],
    ["POST", "/api/v1/platform/tenants", { name: "Negada I1", group: { name: "Grupo Negado I1" } }],
    ["GET", `/api/v1/platform/tenants/${target.tenantId}`, undefined],
    ["PATCH", `/api/v1/platform/tenants/${target.tenantId}`, { name: "Negada I1" }],
    ["PATCH", `/api/v1/platform/tenants/${target.tenantId}/status`, { status: "suspended", reason: "security" }],
    ["GET", `/api/v1/platform/tenants/${target.tenantId}/modules`, undefined],
    ["PATCH", `/api/v1/platform/tenants/${target.tenantId}/modules`, { enabledModules: [] }],
    ["POST", `/api/v1/platform/tenants/${target.tenantId}/admin-user`, { name: "Negado", email: "negado@example.com" }],
  ] as const;
  const before = await counts(h);

  for (const [method, path, body] of routes) {
    const response = await requestJson(h.baseUrl, path, {
      method,
      headers,
      ...(body ? { body } : {}),
    });
    assert.equal(response.status, 403, `${method} ${path}: ${JSON.stringify(response.body)}`);
  }

  assert.deepEqual(await counts(h), before);
});

test("I2: GET /tenants não devolve usuário, e-mail nem documento", async () => {
  const h = await harness();
  const response = await requestJson(h.baseUrl, "/api/v1/platform/tenants", {
    headers: h.platformHeaders,
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));

  const forbidden = new Set(["user", "users", "email", "document", "documento", "cpf", "cnpj"]);
  for (const key of collectKeys(response.body)) {
    assert.equal(forbidden.has(key.toLowerCase()), false, `campo proibido na lista: ${key}`);
  }
});

test("I3: administrador de A não é visível sob o GUC de B", async () => {
  const h = await harness();
  const orgB = await novaOrganizacao(h, "plat-org-i3-b");
  const visibleInB = await h.client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${orgB.tenantId}, true)`;
    return tx.user.findFirst({ where: { id: h.actor.userId } });
  });
  assert.equal(visibleInB, null);
});

test("I4: criação de administrador na organização de sistema é recusada", async () => {
  const h = await harness();
  let system = await h.admin.tenant.findUnique({ where: { slug: "platform" }, select: { id: true } });
  if (!system) {
    system = await h.admin.tenant.create({
      data: { name: "Plataforma", slug: "platform", status: "active", modules: [] },
      select: { id: true },
    });
    h.tenantIds.push(system.id);
  }
  const before = await h.admin.user.count({ where: { tenant_id: system.id } });
  const response = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${system.id}/admin-user`, {
    method: "POST",
    headers: h.platformHeaders,
    body: { name: "Administrador indevido", email: "indevido@example.com" },
  });
  assert.equal(response.status, 422, JSON.stringify(response.body));
  assert.equal(response.body.error?.reason, "platform_organization");
  assert.equal(await h.admin.user.count({ where: { tenant_id: system.id } }), before);
});

test("I5: criação real roda pelo papel NOSUPERUSER NOBYPASSRLS", async () => {
  const h = await harness();
  assert.equal(process.env.CORE_SAAS_PERSISTENCE, "prisma");
  const [runtime] = await h.client.$queryRaw<Array<{ current_user: string; rolbypassrls: boolean; rolsuper: boolean }>>`
    SELECT current_user, r.rolbypassrls, r.rolsuper
    FROM pg_roles r
    WHERE r.rolname = current_user
  `;
  assert.deepEqual(runtime, {
    current_user: h.role.roleName,
    rolbypassrls: false,
    rolsuper: false,
  });

  const response = await criarOrganizacaoPelaPlataforma(h, {
    name: `Organização I5 ${Date.now()}`,
    group: { name: `Grupo I5 ${Date.now()}-${Math.random().toString(16).slice(2)}` },
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal((response.body.data as { provisioning?: { group?: { status?: string } } })?.provisioning?.group?.status, "done");
});

test("I6: rename da organização de sistema é recusado e o nome não muda", async () => {
  const h = await harness();
  let system = await h.admin.tenant.findUnique({ where: { slug: "platform" }, select: { id: true, name: true } });
  if (!system) {
    system = await h.admin.tenant.create({
      data: { name: "Plataforma", slug: "platform", status: "active", modules: [] },
      select: { id: true, name: true },
    });
    h.tenantIds.push(system.id);
  }
  const denied = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${system.id}`, {
    method: "PATCH",
    headers: h.platformHeaders,
    body: { name: "Novo Nome" },
  });
  assert.equal(denied.status, 422, JSON.stringify(denied.body));
  assert.equal(denied.body.error?.reason, "platform_organization");
  assert.equal((await h.admin.tenant.findUniqueOrThrow({ where: { id: system.id } })).name, system.name);

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const created = await criarOrganizacaoPelaPlataforma(h, {
    name: `Filial I6 ${suffix}`,
    group: { name: `Grupo I6 ${suffix}` },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const organizationId = (created.body.data as { organization: { id: string } }).organization.id;
  const renamed = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${organizationId}`, {
    method: "PATCH",
    headers: h.platformHeaders,
    body: { name: `Filial I6 renomeada ${suffix}` },
  });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
  assert.equal((await h.admin.tenant.findUniqueOrThrow({ where: { id: organizationId } })).name, `Filial I6 renomeada ${suffix}`);
});

async function counts(h: PlatOrgRealHarness) {
  const [tenants, users, members, audits] = await Promise.all([
    h.admin.tenant.count(),
    h.admin.user.count(),
    h.admin.economicGroupMember.count(),
    h.admin.platformAuditLog.count(),
  ]);
  return { tenants, users, members, audits };
}

function collectKeys(value: unknown, keys: string[] = []): readonly string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}
