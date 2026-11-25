import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { createApp } from "../src/app.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";

const PLATFORM_HEADERS = {
  "x-user-id": "usr_platform_test",
  "x-role": "super_admin",
} as const;

test("R1 — a lista de organizações em memória nasce vazia, sem cadastros fictícios", async () => {
  await withApi(async (baseUrl) => {
    const response = await request(baseUrl, "/api/v1/platform/tenants");

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(response.body.data, []);
  });
});

test("R5 — id que não é UUID recebe 404 sem consultar outro cadastro", async () => {
  await withApi(async (baseUrl) => {
    const response = await request(baseUrl, "/api/v1/platform/tenants/nao-e-uuid");

    assert.equal(response.status, 404, JSON.stringify(response.body));
    assert.equal(response.body.error?.reason, "platform_tenant_not_found");
  });
});

test("R2/R4/R8 — criação usa UUID, campos imutáveis recusam e módulos seguem pela assinatura", async () => {
  await withApi(async (baseUrl) => {
    const created = await request(baseUrl, "/api/v1/platform/tenants", {
      method: "POST",
      body: { name: "Organização A", group: { name: "Grupo Teste A" } },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.match(created.body.data.organization.id, /^[0-9a-f-]{36}$/i);
    assert.equal(created.body.data.organization.id.startsWith("pten-"), false);

    for (const field of ["plan", "status", "slug"] as const) {
      const changed = await request(baseUrl, `/api/v1/platform/tenants/${created.body.data.organization.id}`, {
        method: "PATCH",
        body: { [field]: field === "plan" ? "starter" : field === "status" ? "suspended" : "forjado" },
      });
      assert.equal(changed.status, 422, `${field}: ${JSON.stringify(changed.body)}`);
      assert.equal(changed.body.error?.reason, "field_not_editable_here");
    }

    const modules = await request(baseUrl, `/api/v1/platform/tenants/${created.body.data.organization.id}/modules`, {
      method: "PATCH",
      body: { enabledModules: ["finance"] },
    });
    assert.equal(modules.status, 409, JSON.stringify(modules.body));
    assert.equal(modules.body.error?.reason, "module_change_requires_subscription");
  });
});

test("R3 — campos externos de autoridade são rejeitados pela lista fechada", async () => {
  await withApi(async (baseUrl) => {
    for (const field of ["slug", "status", "modules", "tenant_id"] as const) {
      const response = await request(baseUrl, "/api/v1/platform/tenants", {
        method: "POST",
        body: { name: "Organização B", group: { name: "Grupo Teste B" }, [field]: "forjado" },
      });
      assert.equal(response.status, 400, `${field}: ${JSON.stringify(response.body)}`);
      assert.equal(response.body.error?.reason, "unknown_field");
    }
  });
});

test("R6/R7 — as oito rotas falham fechadas para papel de organização e para chave ausente", async () => {
  await withApi(async (baseUrl) => {
    const paths = [
      ["GET", "/api/v1/platform/tenants"],
      ["POST", "/api/v1/platform/tenants"],
      ["GET", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111"],
      ["PATCH", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111"],
      ["PATCH", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/status"],
      ["GET", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/modules"],
      ["PATCH", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/modules"],
      ["POST", "/api/v1/platform/tenants/11111111-1111-4111-8111-111111111111/admin-user"],
    ] as const;
    for (const [method, path] of paths) {
      const tenantRole = await request(baseUrl, path, {
        method,
        headers: { "x-tenant-id": "11111111-1111-4111-8111-111111111111", "x-user-id": "usr_org", "x-role": "tenant_admin" },
        body: {},
      });
      assert.equal(tenantRole.status, 403, `${method} ${path}`);
      const noPermission = await request(baseUrl, path, {
        method,
        headers: { ...PLATFORM_HEADERS, "x-permissions": "" },
        body: {},
      });
      assert.equal(noPermission.status, 403, `${method} ${path}`);
    }
  });
});

test("R9 — o repositório Prisma reutiliza slug e contexto RLS canônicos", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/modules/platform/platform-organizations-prisma.repository.ts", import.meta.url), "utf8"));
  assert.match(source, /import\s*\{[^}]*createTenantSlug[^}]*\}\s*from/);
  assert.match(source, /import\s*\{[^}]*setTenantRlsContext[^}]*\}\s*from/);
  assert.doesNotMatch(source, /normalize\(["']NFD["']\)/);
});

test("C14 — criação intercalada com addMember não fecha vínculo de outra filial do grupo", async () => {
  const { InMemoryPlatformOrganizationsRepository } = await import("../src/modules/platform/platform-organizations.repository.js");
  const { PlatformOrganizationsService } = await import("../src/modules/platform/platform-organizations.service.js");
  const { InMemoryEconomicGroupsRepository } = await import("../src/modules/subscription-billing/economic-groups/economic-groups.repository.js");
  const { EconomicGroupsService } = await import("../src/modules/subscription-billing/economic-groups/economic-groups.service.js");
  const { InMemoryBillingProfileRepository } = await import("../src/modules/subscription-billing/billing-profile/billing-profile.js");
  const { createDefaultSubscriptionsService } = await import("../src/modules/subscription-billing/subscription-billing.service.js");

  const repository = new InMemoryPlatformOrganizationsRepository();
  const baseGroupRepository = new InMemoryEconomicGroupsRepository();
  const directory = {
    getTenant: async (id: string) => {
      const row = await repository.findById(id);
      return row ? { id: row.id, slug: row.slug, name: row.name } : null;
    },
    listTenantIds: async () => (await repository.list()).map((row) => row.id),
  };

  let shouldInterleave = false;
  let bReads = 0;
  let service!: InstanceType<typeof PlatformOrganizationsService>;
  let groupId!: string;

  const decoratedGroupRepository: typeof baseGroupRepository = {
    listGroups: () => baseGroupRepository.listGroups(),
    getGroup: (id) => baseGroupRepository.getGroup(id),
    createGroup: (input) => baseGroupRepository.createGroup(input),
    updateGroup: (id, patch) => baseGroupRepository.updateGroup(id, patch),
    softDeleteGroup: (id, actorId, at) => baseGroupRepository.softDeleteGroup(id, actorId, at),
    applyMembershipChanges: (input) => baseGroupRepository.applyMembershipChanges(input),
    async listMembershipsOfTenants(tenantIds) {
      const result = await baseGroupRepository.listMembershipsOfTenants(tenantIds);
      if (shouldInterleave) {
        bReads += 1;
        if (bReads === 2) {
          shouldInterleave = false;
          const interleaveService = new PlatformOrganizationsService(
            repository,
            new EconomicGroupsService(baseGroupRepository, directory),
            await createDefaultSubscriptionsService(),
            new InMemoryBillingProfileRepository(),
          );
          await interleaveService.createTenant({ name: "Filial A Intercalada", group: { id: groupId } }, "usr_platform_test");
        }
      }
      return result;
    },
  };

  const groups = new EconomicGroupsService(decoratedGroupRepository, directory);
  service = new PlatformOrganizationsService(
    repository,
    groups,
    await createDefaultSubscriptionsService(),
    new InMemoryBillingProfileRepository(),
  );

  const group = await groups.createGroup({ name: "Grupo C14", actorId: "usr_platform_test" });
  groupId = group.id;
  const seed = await service.createTenant({ name: "Filial Semente", group: { id: groupId } }, "usr_platform_test");
  assert.equal(seed.provisioning.group.status, "done");

  shouldInterleave = true;
  const createdB = await service.createTenant({ name: "Filial B Intercalada", group: { id: groupId } }, "usr_platform_test");
  assert.equal(createdB.provisioning.group.status, "done");

  const detail = await groups.getGroup(groupId);
  const activeNames = detail.members.filter((m) => m.validTo === null).map((m) => m.tenantName).sort();
  assert.deepEqual(activeNames, ["Filial A Intercalada", "Filial B Intercalada", "Filial Semente"]);
});

test("C16 — addMember recusa organização que já está em outro grupo com 422 tenant_in_another_group", async () => {
  const { InMemoryPlatformOrganizationsRepository } = await import("../src/modules/platform/platform-organizations.repository.js");
  const { InMemoryEconomicGroupsRepository } = await import("../src/modules/subscription-billing/economic-groups/economic-groups.repository.js");
  const { EconomicGroupsService } = await import("../src/modules/subscription-billing/economic-groups/economic-groups.service.js");

  const repository = new InMemoryPlatformOrganizationsRepository();
  const groupRepository = new InMemoryEconomicGroupsRepository();
  const directory = {
    getTenant: async (id: string) => {
      const row = await repository.findById(id);
      return row ? { id: row.id, slug: row.slug, name: row.name } : null;
    },
    listTenantIds: async () => (await repository.list()).map((row) => row.id),
  };
  const groups = new EconomicGroupsService(groupRepository, directory);
  const groupX = await groups.createGroup({ name: "Grupo C16 X", actorId: "usr_platform_test" });
  const groupY = await groups.createGroup({ name: "Grupo C16 Y", actorId: "usr_platform_test" });
  const created = await repository.create({ name: "Filial C16", group: { id: groupX.id }, actorUserId: "usr_platform_test" });

  await groups.addMember(groupX.id, { tenantId: created.organization.id, actorId: "usr_platform_test" });
  await assert.rejects(
    () => groups.addMember(groupY.id, { tenantId: created.organization.id, actorId: "usr_platform_test" }),
    (error: { statusCode?: number; reason?: string }) => error.statusCode === 422 && error.reason === "tenant_in_another_group",
  );
});

test("C9: falha injetada na assinatura mantém organização e grupo íntegros com subscription failed", async () => {
  const { InMemoryPlatformOrganizationsRepository } = await import("../src/modules/platform/platform-organizations.repository.js");
  const { PlatformOrganizationsService } = await import("../src/modules/platform/platform-organizations.service.js");
  const { InMemoryEconomicGroupsRepository } = await import("../src/modules/subscription-billing/economic-groups/economic-groups.repository.js");
  const { EconomicGroupsService } = await import("../src/modules/subscription-billing/economic-groups/economic-groups.service.js");
  const { InMemoryBillingProfileRepository } = await import("../src/modules/subscription-billing/billing-profile/billing-profile.js");
  const { InMemoryPlansRepository } = await import("../src/modules/subscription-billing/plans/plans.repository.js");
  const { PlansService } = await import("../src/modules/subscription-billing/plans/plans.service.js");
  const { InMemorySubscriptionsRepository } = await import("../src/modules/subscription-billing/plans/subscriptions.repository.js");
  const { SubscriptionsService } = await import("../src/modules/subscription-billing/plans/subscriptions.service.js");
  const { RecordingTenantModulesWriter } = await import("../src/modules/subscription-billing/plans/tenant-modules.sync.js");
  const { InMemoryTenantLookup } = await import("../src/modules/subscription-billing/subscription-billing.service.js");

  const repository = new InMemoryPlatformOrganizationsRepository();
  const groupRepository = new InMemoryEconomicGroupsRepository();
  const directory = {
    getTenant: async (id: string) => {
      const row = await repository.findById(id);
      return row ? { id: row.id, slug: row.slug, name: row.name } : null;
    },
    listTenantIds: async () => (await repository.list()).map((row) => row.id),
  };
  const groups = new EconomicGroupsService(groupRepository, directory);
  const plansRepository = new InMemoryPlansRepository();
  const plans = new PlansService(plansRepository);
  const plan = await plans.createPlan({ code: "c9", kind: "base", name: "Plano C9", description: "" });
  await plans.addVersion(plan.id, {
    validFrom: new Date(), monthlyPriceCents: 10000, includedUsers: 1, includedStorageGb: 1,
    extraUserPriceCents: 1000, extraGbPriceCents: 100, perVehiclePriceCents: null,
    modules: [], notes: null, inaugural: false,
  });
  const tenants = new InMemoryTenantLookup();
  const baseSubscriptions = new SubscriptionsService(
    new InMemorySubscriptionsRepository(), plansRepository, tenants, new RecordingTenantModulesWriter(),
  );
  const subscriptions = new Proxy(baseSubscriptions, {
    get(target, prop, receiver) {
      if (prop === "putSubscription") return async () => { throw new Error("falha injetada C9"); };
      const value = Reflect.get(target, prop, receiver) as unknown;
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
  const service = new PlatformOrganizationsService(
    repository,
    groups,
    subscriptions,
    new InMemoryBillingProfileRepository(),
    undefined,
    (row) => tenants.upsert({ id: row.id, slug: row.slug }),
  );

  const result = await service.createTenant({
    name: "Filial C9",
    group: { name: "Grupo C9" },
    plan: { code: plan.code },
  }, "usr_platform_test");
  assert.deepEqual(result.provisioning.subscription, { status: "failed", reason: "step_failed" });
  assert.equal(result.provisioning.group.status, "done");
  assert.equal((await repository.list()).some((row) => row.id === result.organization.id), true);
  const group = await groups.getGroup(result.organization.group!.id);
  assert.equal(group.members.some((member) => member.tenantId === result.organization.id && member.validTo === null), true);
  assert.equal(result.organization.setup.complete, false);
});

async function withApi(run: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const server = createApp(new MemoryCoreSaasAdapter(core)).listen(0);
  try {
    await run(await baseUrlOf(server));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function request(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: { "content-type": "application/json", ...PLATFORM_HEADERS, ...options.headers },
    ...(options.body === undefined || options.method === "GET" || options.method === "HEAD"
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  return { status: response.status, body: await response.json() as any };
}

async function baseUrlOf(server: Server): Promise<string> {
  if (!server.listening) await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}
