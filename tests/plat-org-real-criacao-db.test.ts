import assert from "node:assert/strict";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import {
  assegurarPapeisGlobais,
  criarGrupo,
  criarOrganizacaoPelaPlataforma,
  desmontarPlatOrgReal,
  montarPlatOrgReal,
  type PlatOrgRealHarness,
} from "./helpers/plat-org-real.js";
import { requestJson } from "./helpers/auth-identity-fixture.js";

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

test("C10: mesmo nome é serializado no grupo e permitido em outro grupo", async () => {
  const h = await harness();
  assert.equal(process.env.CORE_SAAS_PERSISTENCE, "prisma");
  const [runtimeRole] = await h.admin.$queryRaw<Array<{ rolbypassrls: boolean; rolsuper: boolean }>>`
    SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = ${h.role.roleName}
  `;
  assert.deepEqual(runtimeRole, { rolbypassrls: false, rolsuper: false });

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const groupA = await criarGrupo(h, `Grupo C10 A ${suffix}`);
  const groupB = await criarGrupo(h, `Grupo C10 B ${suffix}`);
  let releaseHold: () => void = () => undefined;
  const holdUntil = new Promise<void>((resolve) => {
    releaseHold = resolve;
  });
  let holderHasLock: () => void = () => undefined;
  const holderLockAcquired = new Promise<void>((resolve) => {
    holderHasLock = resolve;
  });

  const holder = h.admin.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM economic_groups WHERE id = ${groupA.id}::uuid FOR UPDATE`;
      holderHasLock();
      await holdUntil;
    },
    { maxWait: 30_000, timeout: 30_000 },
  );
  await holderLockAcquired;

  let resolvedWhileHeld = false;
  let released = false;
  const requests = Promise.all([
    criarOrganizacaoPelaPlataforma(h, { name: "Filial Homônima", group: { id: groupA.id } }),
    criarOrganizacaoPelaPlataforma(h, { name: "  filial homonima  ", group: { id: groupA.id } }),
  ]).then((responses) => {
    if (!released) resolvedWhileHeld = true;
    return responses;
  });

  let waiters = 0;
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline && waiters < 2 && !resolvedWhileHeld) {
    const [row] = await h.admin.$queryRaw<Array<{ waiters: number }>>`
      SELECT count(DISTINCT a.pid)::int AS waiters
      FROM pg_stat_activity a
      JOIN pg_locks l ON l.pid = a.pid
      JOIN pg_class c ON c.oid = l.relation
      WHERE a.usename = ${h.role.roleName}
        AND c.relname = 'economic_groups'
        AND cardinality(pg_blocking_pids(a.pid)) > 0
    `;
    waiters = row?.waiters ?? 0;
    if (waiters < 2) await new Promise((resolve) => setTimeout(resolve, 50));
  }

  released = true;
  releaseHold();
  await holder;
  const responses = await requests;
  const statuses = responses.map((response) => response.status).sort((a, b) => a - b);

  assert.deepEqual(statuses, [201, 409], JSON.stringify(responses.map((response) => response.body)));
  assert.equal(resolvedWhileHeld, false, "as criações não podem concluir enquanto a linha do grupo está travada");
  assert.equal(waiters, 2, "as duas transações do app devem esperar a linha de economic_groups");

  const conflict = responses.find((response) => response.status === 409);
  assert.equal(conflict?.body.error?.reason, "organization_name_conflict");
  const winner = responses.find((response) => response.status === 201);
  const winnerId = (winner?.body.data as { organization?: { id?: string } } | undefined)?.organization?.id;
  assert.ok(winnerId);
  const tenants = await h.admin.tenant.findMany({ where: { id: winnerId } });
  assert.equal(tenants.length, 1);
  const membership = await h.admin.economicGroupMember.findFirst({
    where: { tenant_id: tenants[0]!.id, group_id: groupA.id, valid_to: null },
  });
  assert.ok(membership);

  const otherGroup = await criarOrganizacaoPelaPlataforma(h, {
    name: "Filial Homônima",
    group: { id: groupB.id },
  });
  assert.equal(otherGroup.status, 201, JSON.stringify(otherGroup.body));
});

test("C8: plano inválido é recusado antes de criar a organização", async () => {
  const h = await harness();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const name = `Filial C8 ${suffix}`;
  const group = await criarGrupo(h, `Grupo C8 ${suffix}`);

  const response = await requestJson(h.baseUrl, "/api/v1/platform/tenants", {
    method: "POST",
    headers: h.platformHeaders,
    body: { name, group: { id: group.id }, plan: { code: "starter" } },
  });

  assert.equal(response.status, 422, JSON.stringify(response.body));
  assert.equal(response.body.error?.reason, "plan_not_found");
  assert.equal(await h.admin.tenant.count({ where: { name } }), 0);
  assert.equal(await h.admin.economicGroupMember.count({ where: { group_id: group.id } }), 0);
});

test("C15: paridade do Passo 1 com PrismaCoreSaasStore.createTenant sob papel sem bypass", async () => {
  const h = await harness();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { PrismaCoreSaasStore } = await import("../src/modules/core-saas/store/prisma-core-saas.store.js");
  const store = new PrismaCoreSaasStore(h.client);
  const orgStore = await store.createTenant({ name: `Filial Paridade ${suffix}`, status: "active", modules: [] });
  h.tenantIds.push(orgStore.id);

  const created = await criarOrganizacaoPelaPlataforma(h, {
    name: `Filial Paridade ${suffix}`,
    group: { name: `Grupo C15 ${suffix}` },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const orgRouteId = (created.body.data as { organization: { id: string } }).organization.id;

  const [rowStore, rowRoute] = await Promise.all([
    h.admin.tenant.findUniqueOrThrow({ where: { id: orgStore.id } }),
    h.admin.tenant.findUniqueOrThrow({ where: { id: orgRouteId } }),
  ]);
  const slugPattern = new RegExp(`^filial-paridade-${suffix}-[a-z0-9]+$`);
  assert.match(rowStore.slug, slugPattern);
  assert.match(rowRoute.slug, slugPattern);
  assert.equal(rowRoute.status, rowStore.status);
  assert.deepEqual(rowRoute.modules, rowStore.modules);

  const [auditStore, auditRoute] = await Promise.all([
    h.admin.auditLog.findFirst({ where: { tenant_id: orgStore.id, action: "tenant.created" } }),
    h.admin.auditLog.findFirst({ where: { tenant_id: orgRouteId, action: "tenant.created" } }),
  ]);
  assert.ok(auditStore, "store.createTenant deve gravar tenant.created");
  assert.ok(auditRoute, "rota da plataforma deve gravar tenant.created sob RLS");
  assert.equal(auditRoute.action, auditStore.action);
  assert.equal(auditRoute.resource_type, auditStore.resource_type);
  assert.equal(auditRoute.actor_type, auditStore.actor_type);
  assert.equal(auditRoute.outcome, auditStore.outcome);
  assert.equal(auditRoute.severity, auditStore.severity);
  assert.equal(auditRoute.tenant_id, orgRouteId);
});

test("C2: grupo novo + 1ª filial — o grupo existe e o vínculo vale hoje", async () => {
  const h = await harness();
  const suffix = uniqueSuffix();
  const created = await criarOrganizacaoPelaPlataforma(h, {
    name: `Filial C2 ${suffix}`,
    group: { name: `Grupo C2 ${suffix}` },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const organization = organizationOf(created.body);
  const group = await h.admin.economicGroup.findFirstOrThrow({
    where: { name: `Grupo C2 ${suffix}` },
  });
  const membership = await h.admin.economicGroupMember.findFirstOrThrow({
    where: { tenant_id: organization.id, group_id: group.id },
  });
  assert.ok(membership.valid_from.getTime() <= Date.now());
  assert.equal(membership.valid_to, null);
});

test("C3: 2ª filial no mesmo grupo — as duas no grupo, a 1ª intacta", async () => {
  const h = await harness();
  const suffix = uniqueSuffix();
  const first = await criarOrganizacaoPelaPlataforma(h, {
    name: `Filial C3 A ${suffix}`,
    group: { name: `Grupo C3 ${suffix}` },
  });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const firstOrganization = organizationOf(first.body);
  const groupId = firstOrganization.group?.id;
  assert.ok(groupId);
  const before = await h.admin.economicGroupMember.findFirstOrThrow({
    where: { tenant_id: firstOrganization.id, group_id: groupId, valid_to: null },
  });

  const second = await criarOrganizacaoPelaPlataforma(h, {
    name: `Filial C3 B ${suffix}`,
    group: { id: groupId },
  });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  const secondOrganization = organizationOf(second.body);
  const open = await h.admin.economicGroupMember.findMany({
    where: { group_id: groupId, tenant_id: { in: [firstOrganization.id, secondOrganization.id] }, valid_to: null },
    orderBy: { tenant_id: "asc" },
  });
  assert.equal(open.length, 2);
  const firstAfter = open.find((row) => row.tenant_id === firstOrganization.id);
  assert.equal(firstAfter?.id, before.id);
  assert.equal(firstAfter?.valid_from.toISOString(), before.valid_from.toISOString());
});

test("C5: a provisória volta uma vez no 201 e não cai em nenhuma trilha", async () => {
  const h = await harness();
  await assegurarPapeisGlobais(h, ["tenant_admin"]);
  const suffix = uniqueSuffix();
  const created = await createOrganization(h, {
    name: `Filial C5 ${suffix}`,
    group: { name: `Grupo C5 ${suffix}` },
    admin: { name: "Admin C5", email: `c5-${suffix}@example.com` },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const organization = organizationOf(created.body);
  const temporaryPassword = (created.body.data as { temporaryPassword?: unknown }).temporaryPassword;
  assert.equal(typeof temporaryPassword, "string");
  assert.ok((temporaryPassword as string).length > 0);

  const [auditRows, platformRows] = await Promise.all([
    h.admin.auditLog.findMany({ where: { tenant_id: organization.id } }),
    h.admin.platformAuditLog.findMany({ where: { tenant_id: organization.id } }),
  ]);
  for (const row of [...auditRows, ...platformRows]) {
    assert.equal(JSON.stringify(row.metadata).includes(temporaryPassword as string), false);
  }
  const detail = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${organization.id}`, {
    headers: h.platformHeaders,
  });
  assert.equal(detail.status, 200, JSON.stringify(detail.body));
  assert.equal("temporaryPassword" in (detail.body.data as object), false);
});

test("C6: a trilha organization.created tem o ator e nenhum dado pessoal", async () => {
  const h = await harness();
  const suffix = uniqueSuffix();
  const name = `Filial C6 ${suffix}`;
  const created = await criarOrganizacaoPelaPlataforma(h, {
    name,
    group: { name: `Grupo C6 ${suffix}` },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const organization = organizationOf(created.body);
  const audit = await h.admin.platformAuditLog.findFirstOrThrow({
    where: { action: "organization.created", tenant_id: organization.id },
  });
  assert.equal(audit.actor_user_id, h.actor.userId);
  const metadata = JSON.stringify(audit.metadata);
  assert.equal(metadata.includes(name), false);
  assert.equal(metadata.includes("@"), false);
  assert.equal(/cpf|cnpj|document/i.test(metadata), false);
});

test("C7: administrador com e-mail que já existe no grupo falha com email_in_group e não cria usuário", async () => {
  const h = await harness();
  await assegurarPapeisGlobais(h, ["tenant_admin"]);
  const suffix = uniqueSuffix();
  const email = `c7-${suffix}@example.com`;
  const first = await createOrganization(h, {
    name: `Filial C7 A ${suffix}`,
    group: { name: `Grupo C7 ${suffix}` },
    admin: { name: "Admin C7", email },
  });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const firstData = first.body.data as { organization: { group: { id: string } }; provisioning: { admin: { status: string } }; temporaryPassword?: string };
  assert.equal(firstData.provisioning.admin.status, "done");
  assert.ok((firstData.temporaryPassword?.length ?? 0) > 0);

  const second = await createOrganization(h, {
    name: `Filial C7 B ${suffix}`,
    group: { id: firstData.organization.group.id },
    admin: { name: "Admin C7 repetido", email },
  });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  assert.deepEqual((second.body.data as { provisioning: { admin: unknown } }).provisioning.admin, {
    status: "failed",
    reason: "email_in_group",
  });
  assert.equal(await h.admin.user.count({ where: { email } }), 1);
});

test("C12: só nome e grupo — 201 com missing plano, administrador e perfil", async () => {
  const h = await harness();
  const suffix = uniqueSuffix();
  const created = await criarOrganizacaoPelaPlataforma(h, {
    name: `Filial C12 ${suffix}`,
    group: { name: `Grupo C12 ${suffix}` },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const organization = organizationOf(created.body);
  const detail = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${organization.id}`, {
    headers: h.platformHeaders,
  });
  assert.equal(detail.status, 200, JSON.stringify(detail.body));
  const setup = (detail.body.data as { setup: { complete: boolean; missing: string[] } }).setup;
  assert.equal(setup.complete, false);
  assert.deepEqual([...setup.missing].sort(), ["admin", "plan", "profile"]);
});

test("C13: completar cada passo pela rota própria tira o item de missing", async () => {
  const h = await harness();
  await assegurarPapeisGlobais(h, ["tenant_admin"]);
  const suffix = uniqueSuffix();
  const created = await criarOrganizacaoPelaPlataforma(h, {
    name: `Filial C13 ${suffix}`,
    group: { name: `Grupo C13 ${suffix}` },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const organization = organizationOf(created.body);

  const admin = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${organization.id}/admin-user`, {
    method: "POST",
    headers: h.platformHeaders,
    body: { name: "Admin C13", email: `c13-${suffix}@example.com` },
  });
  assert.equal(admin.status, 201, JSON.stringify(admin.body));
  assert.equal((await setupOf(h, organization.id)).missing.includes("admin"), false);

  const planCode = `c13-${suffix}`.toLowerCase();
  const plan = await requestJson(h.baseUrl, "/api/v1/platform/billing/plans", {
    method: "POST",
    headers: h.platformHeaders,
    body: { code: planCode, kind: "base", name: `Plano C13 ${suffix}`, description: "Plano de teste C13" },
  });
  assert.equal(plan.status, 201, JSON.stringify(plan.body));
  const planId = (plan.body.data as { id: string }).id;
  const version = await requestJson(h.baseUrl, `/api/v1/platform/billing/plans/${planId}/versions`, {
    method: "POST",
    headers: h.platformHeaders,
    body: {
      validFrom: businessDate(), monthlyPrice: "100.00", includedUsers: 1,
      includedStorageGb: "1", extraUserPrice: "10.00", extraGbPrice: "1.00",
      modules: [],
    },
  });
  assert.equal(version.status, 201, JSON.stringify(version.body));
  const subscription = await requestJson(h.baseUrl, `/api/v1/platform/billing/tenants/${organization.id}/subscription`, {
    method: "PUT",
    headers: h.platformHeaders,
    body: { planCode, validFrom: businessDate() },
  });
  assert.equal(subscription.status, 200, JSON.stringify(subscription.body));
  assert.equal((await setupOf(h, organization.id)).missing.includes("plan"), false);

  // Não existe rota própria de perfil neste objeto; gravação equivalente ao profiles.upsert do produto.
  await h.admin.tenantBillingProfile.create({
    data: {
      tenant_id: organization.id, legal_name: "Filial C13 Ltda", document: "12345678000190",
      email: `financeiro-c13-${suffix}@example.com`, postal_code: "01001000", street: "Praça da Sé",
      number: "1", district: "Sé", city: "São Paulo", state: "SP", payment_method: "pix", complete: true,
    },
  });
  const finalSetup = await setupOf(h, organization.id);
  assert.equal(finalSetup.missing.includes("profile"), false);
  assert.equal(finalSetup.complete, true);
  assert.deepEqual(finalSetup.missing, []);
});

test("C17: o 1º administrador e a rota admin-user cadastram o usuário com papel atribuído na mesma transação", async () => {
  const h = await harness();
  await assegurarPapeisGlobais(h, ["tenant_admin"]);
  const suffix = uniqueSuffix();
  const emailA = `c17-a-${suffix}@example.com`;
  const emailB = `c17-b-${suffix}@example.com`;
  const created = await createOrganization(h, {
    name: `Filial C17 ${suffix}`,
    group: { name: `Grupo C17 ${suffix}` },
    admin: { name: "Admin C17", email: emailA },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const data = created.body.data as { organization: { id: string }; provisioning: { admin: { status: string } }; temporaryPassword?: string };
  assert.equal(data.provisioning.admin.status, "done");
  assert.ok((data.temporaryPassword?.length ?? 0) > 0);
  await assertSingleTenantAdmin(h, data.organization.id, emailA);

  const second = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${data.organization.id}/admin-user`, {
    method: "POST",
    headers: h.platformHeaders,
    body: { name: "Admin C17 B", email: emailB },
  });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  assert.ok((((second.body.data as { temporaryPassword?: string }).temporaryPassword)?.length ?? 0) > 0);
  await assertSingleTenantAdmin(h, data.organization.id, emailB);

  const users = await h.admin.user.findMany({ where: { tenant_id: data.organization.id }, select: { id: true } });
  assert.equal(users.length, 2);
  for (const user of users) {
    assert.ok(await h.admin.userRoleAssignment.count({ where: { user_id: user.id } }) >= 1);
  }
});

test("C18: falha forçada na atribuição do papel não grava usuário em nenhum dos dois caminhos", async () => {
  let derrubarPapel = false;
  const embrulharCliente = (client: PrismaClient): PrismaClient =>
    new Proxy(client, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver) as unknown;
        if (prop !== "$transaction") {
          return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
        }
        return (arg: unknown, ...rest: unknown[]) => {
          const original = (value as (...args: unknown[]) => unknown).bind(target);
          if (typeof arg !== "function" || !derrubarPapel) return original(arg, ...rest);
          return original((tx: object) => (arg as (wrapped: unknown) => unknown)(new Proxy(tx, {
            get(txTarget, txProp, txReceiver) {
              const txValue = Reflect.get(txTarget, txProp, txReceiver) as unknown;
              if (txProp !== "role") {
                return typeof txValue === "function" ? (txValue as (...args: unknown[]) => unknown).bind(txTarget) : txValue;
              }
              return new Proxy(txValue as object, {
                get(roleTarget, roleProp, roleReceiver) {
                  if (roleProp === "findFirst") return async () => null;
                  const roleValue = Reflect.get(roleTarget, roleProp, roleReceiver) as unknown;
                  return typeof roleValue === "function" ? (roleValue as (...args: unknown[]) => unknown).bind(roleTarget) : roleValue;
                },
              });
            },
          })));
        };
      },
    }) as PrismaClient;
  const h2 = await montarPlatOrgReal(connectionString, { embrulharCliente });
  try {
    const suffix = uniqueSuffix();
    const seed = await criarOrganizacaoPelaPlataforma(h2, {
      name: `Filial C18 base ${suffix}`,
      group: { name: `Grupo C18 base ${suffix}` },
    });
    assert.equal(seed.status, 201, JSON.stringify(seed.body));
    const seedOrganization = organizationOf(seed.body);

    derrubarPapel = true;
    const emailA = `c18-a-${suffix}@example.com`;
    const failedCreate = await createOrganization(h2, {
      name: `Filial C18 falha ${suffix}`,
      group: { name: `Grupo C18 falha ${suffix}` },
      admin: { name: "Admin C18 A", email: emailA },
    });
    assert.equal(failedCreate.status, 201, JSON.stringify(failedCreate.body));
    const failedData = failedCreate.body.data as { organization: { id: string }; provisioning: { admin: unknown }; temporaryPassword?: string };
    assert.deepEqual(failedData.provisioning.admin, { status: "failed", reason: "step_failed" });
    assert.equal(failedData.temporaryPassword, undefined);
    assert.equal(await h2.admin.user.count({ where: { email: emailA } }), 0);
    assert.equal(await h2.admin.user.count({ where: { tenant_id: failedData.organization.id } }), 0);

    const emailB = `c18-b-${suffix}@example.com`;
    const failedRoute = await requestJson(h2.baseUrl, `/api/v1/platform/tenants/${seedOrganization.id}/admin-user`, {
      method: "POST", headers: h2.platformHeaders, body: { name: "Admin C18 B", email: emailB },
    });
    assert.equal(failedRoute.status, 400, JSON.stringify(failedRoute.body));
    assert.equal(failedRoute.body.error?.reason, "invalid_request");
    assert.equal(failedRoute.body.error?.message, "Role is not assignable to tenant: tenant_admin");
    assert.equal(await h2.admin.user.count({ where: { email: emailB } }), 0);
    assert.equal(await h2.admin.userRoleAssignment.count({ where: { tenant_id: seedOrganization.id } }), 0);

    derrubarPapel = false;
    await assegurarPapeisGlobais(h2, ["tenant_admin"]);
    const emailC = `c18-c-${suffix}@example.com`;
    const control = await requestJson(h2.baseUrl, `/api/v1/platform/tenants/${seedOrganization.id}/admin-user`, {
      method: "POST", headers: h2.platformHeaders, body: { name: "Admin C18 C", email: emailC },
    });
    assert.equal(control.status, 201, JSON.stringify(control.body));
    await assertSingleTenantAdmin(h2, seedOrganization.id, emailC);
  } finally {
    derrubarPapel = false;
    await desmontarPlatOrgReal(h2);
  }
});

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function organizationOf(body: unknown): { readonly id: string; readonly group?: { readonly id: string } | null } {
  const organization = (body as { data?: { organization?: { id?: unknown; group?: { id: string } | null } } }).data?.organization;
  assert.equal(typeof organization?.id, "string", JSON.stringify(body));
  return organization as { id: string; group?: { id: string } | null };
}

async function createOrganization(h: PlatOrgRealHarness, body: unknown) {
  const response = await requestJson(h.baseUrl, "/api/v1/platform/tenants", {
    method: "POST", headers: h.platformHeaders, body,
  });
  const id = (response.body.data as { organization?: { id?: unknown } } | undefined)?.organization?.id;
  if (typeof id === "string" && !h.tenantIds.includes(id)) h.tenantIds.push(id);
  return response;
}

async function setupOf(h: PlatOrgRealHarness, tenantId: string) {
  const detail = await requestJson(h.baseUrl, `/api/v1/platform/tenants/${tenantId}`, { headers: h.platformHeaders });
  assert.equal(detail.status, 200, JSON.stringify(detail.body));
  return (detail.body.data as { setup: { complete: boolean; missing: string[] } }).setup;
}

async function assertSingleTenantAdmin(h: PlatOrgRealHarness, tenantId: string, email: string): Promise<void> {
  const user = await h.admin.user.findFirstOrThrow({ where: { email } });
  assert.equal(user.tenant_id, tenantId);
  const assignments = await h.admin.userRoleAssignment.findMany({
    where: { user_id: user.id }, include: { role: true },
  });
  assert.equal(assignments.length, 1);
  assert.equal(assignments[0]?.role.key, "tenant_admin");
  assert.equal(assignments[0]?.role.tenant_id, null);
}

function businessDate(): string {
  return new Date().toISOString().slice(0, 10);
}
