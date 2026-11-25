import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "prisma";

import {
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
  const tenants = await h.admin.tenant.findMany({ where: { name: { in: ["Filial Homônima", "  filial homonima  "] } } });
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
