import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { createApp } from "../src/app.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import { CANONICAL_MODULE_KEYS } from "../src/modules/platform/platform-modules.service.js";
import type {
  CreatedOrganizationRecord,
  CreateOrganizationRecord,
  PlatformOrganizationsRepository,
} from "../src/modules/platform/platform-organizations.repository.js";
import type { PlatformOrganizationsService } from "../src/modules/platform/platform-organizations.service.js";
import type {
  PlatformModule,
  PlatformOrganizationRecord,
  UpdateTenantStatusDto,
} from "../src/modules/platform/platform.types.js";

// B-PLANOS-MODULOS (§8.2 do plano, T1 a T12) — a porta `PATCH /api/v1/platform/tenants/:tenantId/modules` em modo
// memória. Decisão do dono `D-PLANOS-MODULOS-PORTA-REAL` (P1, opção A): organização SEM assinatura em vigor é
// ligada e desligada pela plataforma, de verdade e com trilha; COM assinatura em vigor a porta recusa 409 e quem
// manda nos módulos é o plano contratado.
//
// Vermelho-controle no head-base `8719cf045`: `updateTenantModules` lançava 409 para TODA organização e a leitura
// devolvia o mapa de código `modulesByPlan` com o plano cravado `"starter"` — quatro chaves com `availableInPlan`
// verdadeiro e o resto do catálogo `blocked_by_plan` mesmo para organização sem assinatura nenhuma.
// T6 e T12 são travas de contrato que o §5.2 do plano marca como "como hoje" (400 unknown_field e 404
// platform_tenant_not_found já existem no head-base): nascem verdes de propósito e existem para não regredir.

const PLATFORM_HEADERS = { "x-user-id": "usr_platform_modulos", "x-role": "super_admin" } as const;
const ATOR = "3f2b6a10-4c5d-4e6f-8a7b-0c1d2e3f4a5b";

type Resposta = { readonly status: number; readonly body: any };
type ErroEsperado = { readonly statusCode?: number; readonly reason?: string };

function sufixo(): string {
  return `${Date.now().toString(36)}${Math.random().toString(16).slice(2, 10)}`;
}

function porChave(modulos: readonly PlatformModule[]): Map<string, PlatformModule> {
  return new Map(modulos.map((modulo) => [modulo.key, modulo]));
}

function chaves(modulos: readonly PlatformModule[]): string[] {
  return modulos.map((modulo) => modulo.key);
}

async function criarOrganizacao(baseUrl: string, rotulo: string): Promise<string> {
  const resposta = await request(baseUrl, "/api/v1/platform/tenants", {
    method: "POST",
    body: { name: `Organização Teste ${rotulo}`, group: { name: `Grupo Teste ${rotulo}` } },
  });
  assert.equal(resposta.status, 201, JSON.stringify(resposta.body));
  return String(resposta.body.data.organization.id);
}

function lerModulos(baseUrl: string, id: string): Promise<Resposta> {
  return request(baseUrl, `/api/v1/platform/tenants/${id}/modules`);
}

function patchModulos(baseUrl: string, id: string, enabledModules: unknown): Promise<Resposta> {
  return request(baseUrl, `/api/v1/platform/tenants/${id}/modules`, {
    method: "PATCH",
    body: { enabledModules },
  });
}

test("T1 — organização sem assinatura: PATCH [work_orders] responde 200 e o GET mostra work_orders enabled", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t1-${sufixo()}`);

    const escrito = await patchModulos(baseUrl, id, ["work_orders"]);
    assert.equal(escrito.status, 200, JSON.stringify(escrito.body));

    const lido = await lerModulos(baseUrl, id);
    assert.equal(lido.status, 200, JSON.stringify(lido.body));
    assert.equal(porChave(lido.body.data as PlatformModule[]).get("work_orders")?.status, "enabled");
  });
});

test("T2 — sem assinatura: nenhuma área fica blocked_by_plan e availableInPlan é verdadeiro em todo o catálogo", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t2-${sufixo()}`);
    assert.equal((await patchModulos(baseUrl, id, ["work_orders"])).status, 200);

    const lido = await lerModulos(baseUrl, id);
    assert.equal(lido.status, 200, JSON.stringify(lido.body));
    const modulos = lido.body.data as PlatformModule[];
    assert.deepEqual(chaves(modulos), [...CANONICAL_MODULE_KEYS]);
    for (const modulo of modulos) {
      assert.notEqual(modulo.status, "blocked_by_plan", `${modulo.key} bloqueado pelo plano sem assinatura`);
      assert.equal(modulo.availableInPlan, true, `${modulo.key}: availableInPlan`);
    }
    assert.equal(porChave(modulos).get("work_orders")?.status, "enabled");
    assert.equal(porChave(modulos).get("patios")?.status, "disabled");
  });
});

test("T2 (apelido) — chave antiga gravada como apelido aparece na leitura pela chave canônica ligada", async () => {
  const linha: PlatformOrganizationRecord = {
    id: "0b7a1c40-1111-4111-8111-111111111111",
    name: "Organização Teste Apelido",
    slug: "org-apelido",
    status: "active",
    modules: ["work-orders"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const { service, tenants } = await arnesDeServico(repositorioDeUmaLinha(linha));
  tenants.upsert({ id: linha.id, slug: linha.slug });

  const modulos = await service.listTenantModules(linha.id);
  assert.equal(porChave(modulos).get("work_orders")?.status, "enabled");
});

test("T3 — chave fora do catálogo responde 422 module_unknown e a leitura não muda", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t3-${sufixo()}`);
    const antes = await lerModulos(baseUrl, id);

    const resposta = await patchModulos(baseUrl, id, ["nao_existe"]);
    assert.equal(resposta.status, 422, JSON.stringify(resposta.body));
    assert.equal(resposta.body.error?.reason, "module_unknown");
    assert.deepEqual(await lerModulos(baseUrl, id), antes);
  });
});

test("T4 — apelido na escrita responde 422 module_unknown e a leitura não muda", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t4-${sufixo()}`);
    const antes = await lerModulos(baseUrl, id);

    for (const apelido of ["work-orders", "checklists"]) {
      const resposta = await patchModulos(baseUrl, id, [apelido]);
      assert.equal(resposta.status, 422, `${apelido}: ${JSON.stringify(resposta.body)}`);
      assert.equal(resposta.body.error?.reason, "module_unknown");
    }
    assert.deepEqual(await lerModulos(baseUrl, id), antes);
  });
});

test("T5 — corpo malformado responde 400 invalid_field e nunca vira lista vazia", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t5-${sufixo()}`);
    assert.equal((await patchModulos(baseUrl, id, ["work_orders"])).status, 200);

    const malformados: ReadonlyArray<{ readonly rotulo: string; readonly corpo: Record<string, unknown> }> = [
      { rotulo: "ausente", corpo: {} },
      { rotulo: "texto", corpo: { enabledModules: "work_orders" } },
      { rotulo: "número", corpo: { enabledModules: 7 } },
      { rotulo: "objeto", corpo: { enabledModules: { 0: "work_orders", length: 1 } } },
      { rotulo: "nulo", corpo: { enabledModules: null } },
      { rotulo: "item número", corpo: { enabledModules: ["work_orders", 5] } },
      { rotulo: "item nulo", corpo: { enabledModules: [null] } },
      { rotulo: "item objeto", corpo: { enabledModules: [{ key: "work_orders" }] } },
    ];
    for (const caso of malformados) {
      const resposta = await request(baseUrl, `/api/v1/platform/tenants/${id}/modules`, {
        method: "PATCH",
        body: caso.corpo,
      });
      assert.equal(resposta.status, 400, `${caso.rotulo}: ${JSON.stringify(resposta.body)}`);
      assert.equal(resposta.body.error?.reason, "invalid_field", caso.rotulo);
    }

    const modulos = (await lerModulos(baseUrl, id)).body.data as PlatformModule[];
    assert.equal(porChave(modulos).get("work_orders")?.status, "enabled", "corpo malformado não pode desligar área");
  });
});

test("T6 — campo desconhecido no corpo responde 400 unknown_field", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t6-${sufixo()}`);
    const resposta = await request(baseUrl, `/api/v1/platform/tenants/${id}/modules`, {
      method: "PATCH",
      body: { enabledModules: ["work_orders"], plan: "enterprise" },
    });
    assert.equal(resposta.status, 400, JSON.stringify(resposta.body));
    assert.equal(resposta.body.error?.reason, "unknown_field");
  });
});

test("T7 — itens repetidos gravam uma vez só e a lista fica na ordem do catálogo", async () => {
  const { InMemoryPlatformOrganizationsRepository } = await import(
    "../src/modules/platform/platform-organizations.repository.js"
  );
  const repository = new InMemoryPlatformOrganizationsRepository();
  const { service } = await arnesDeServico(repository);
  const { organization } = await criarOrganizacaoNoServico(service, "t7");

  const modulos = await service.updateTenantModules(
    organization.id,
    { enabledModules: ["finance", "work_orders", "finance", "work_orders"] },
    ATOR,
  );

  assert.deepEqual(chaves(modulos), [...CANONICAL_MODULE_KEYS]);
  assert.deepEqual(
    modulos.filter((modulo) => modulo.status === "enabled").map((modulo) => modulo.key),
    ["work_orders", "finance"],
  );
  assert.deepEqual((await repository.findById(organization.id))?.modules, ["work_orders", "finance"]);
});

test("T8 — lista vazia desliga tudo: 200 e o GET mostra todas as áreas disabled", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t8-${sufixo()}`);
    assert.equal((await patchModulos(baseUrl, id, ["work_orders", "patios"])).status, 200);

    const vazio = await patchModulos(baseUrl, id, []);
    assert.equal(vazio.status, 200, JSON.stringify(vazio.body));

    const modulos = (await lerModulos(baseUrl, id)).body.data as PlatformModule[];
    assert.deepEqual(chaves(modulos), [...CANONICAL_MODULE_KEYS]);
    for (const modulo of modulos) {
      assert.equal(modulo.status, "disabled", `${modulo.key} deveria estar desligado`);
    }
  });
});

test("T9 — a organização da própria plataforma responde 422 platform_organization e nada é escrito", async () => {
  const linha: PlatformOrganizationRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Plataforma",
    slug: "platform",
    status: "active",
    modules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const escritas: string[][] = [];
  const { service } = await arnesDeServico(repositorioDeUmaLinha(linha, escritas));

  await assert.rejects(
    () => service.updateTenantModules(linha.id, { enabledModules: ["work_orders"] }, ATOR),
    (erro: ErroEsperado) => erro.statusCode === 422 && erro.reason === "platform_organization",
  );
  assert.deepEqual(escritas, []);
});

test("T10 — organização com assinatura em vigor: 409, leitura com blocked_by_plan e availableInPlan falso", async () => {
  await withApi(async (baseUrl) => {
    const id = await criarOrganizacao(baseUrl, `t10-${sufixo()}`);
    assert.equal((await patchModulos(baseUrl, id, ["work_orders"])).status, 200);

    const { createMemoryPlansService, createMemorySubscriptionsService } = await import(
      "../src/modules/subscription-billing/subscription-billing.service.js"
    );
    const plans = createMemoryPlansService();
    const subscriptions = createMemorySubscriptionsService();
    const plan = await plans.createPlan({
      code: `t10_${sufixo()}`,
      kind: "base",
      name: "Plano Teste T10",
      description: "",
    });
    await plans.addVersion(plan.id, {
      validFrom: new Date(),
      monthlyPriceCents: 10000,
      includedUsers: 1,
      includedStorageGb: 1,
      extraUserPriceCents: 1000,
      extraGbPriceCents: 100,
      perVehiclePriceCents: null,
      modules: ["work_orders", "finance"],
      notes: null,
      inaugural: false,
    });
    await subscriptions.putSubscription(id, { planCode: plan.code, validFrom: new Date() });

    const recusado = await patchModulos(baseUrl, id, ["patios"]);
    assert.equal(recusado.status, 409, JSON.stringify(recusado.body));
    assert.equal(recusado.body.error?.reason, "module_change_requires_subscription");

    const lido = await lerModulos(baseUrl, id);
    assert.equal(lido.status, 200, JSON.stringify(lido.body));
    const mapa = porChave(lido.body.data as PlatformModule[]);
    assert.equal(mapa.get("work_orders")?.status, "enabled");
    assert.equal(mapa.get("work_orders")?.availableInPlan, true);
    assert.equal(mapa.get("patios")?.status, "blocked_by_plan");
    assert.equal(mapa.get("patios")?.availableInPlan, false);
    assert.equal(mapa.get("finance")?.status, "blocked_by_plan");
    assert.equal(mapa.get("finance")?.availableInPlan, false);
  });
});

test("T11 — a mesma lista duas vezes responde 200 nas duas e registra UMA mudança", async () => {
  const { InMemoryPlatformOrganizationsRepository } = await import(
    "../src/modules/platform/platform-organizations.repository.js"
  );
  const base = new InMemoryPlatformOrganizationsRepository();
  let mudancas = 0;
  const repository: PlatformOrganizationsRepository = {
    list: () => base.list(),
    findById: (id: string) => base.findById(id),
    create: (input: CreateOrganizationRecord) => base.create(input),
    rename: (id: string, name: string, groupId: string | null, actorUserId: string) =>
      base.rename(id, name, groupId, actorUserId),
    changeStatus: (id: string, input: UpdateTenantStatusDto, actorUserId: string) =>
      base.changeStatus(id, input, actorUserId),
    replaceModules: async (id: string, modules: readonly string[], actorUserId: string, now: Date) => {
      const resultado = await base.replaceModules(id, modules, actorUserId, now);
      if (resultado.kind === "changed") mudancas += 1;
      return resultado;
    },
  };
  const { service } = await arnesDeServico(repository);
  const { organization } = await criarOrganizacaoNoServico(service, "t11");

  const primeira = await service.updateTenantModules(organization.id, { enabledModules: ["work_orders"] }, ATOR);
  const depoisDaPrimeira = (await repository.findById(organization.id))?.updatedAt;
  const segunda = await service.updateTenantModules(organization.id, { enabledModules: ["work_orders"] }, ATOR);

  assert.deepEqual(chaves(segunda), chaves(primeira));
  assert.deepEqual(
    segunda.map((modulo) => modulo.status),
    primeira.map((modulo) => modulo.status),
  );
  assert.equal(mudancas, 1, "a segunda chamada não pode escrever de novo");
  assert.deepEqual((await repository.findById(organization.id))?.updatedAt, depoisDaPrimeira);
});

test("T12 — organização inexistente e id que não é UUID recebem 404 platform_tenant_not_found", async () => {
  await withApi(async (baseUrl) => {
    for (const id of ["11111111-1111-4111-8111-222222222222", "nao-e-uuid"]) {
      const resposta = await patchModulos(baseUrl, id, ["work_orders"]);
      assert.equal(resposta.status, 404, `${id}: ${JSON.stringify(resposta.body)}`);
      assert.equal(resposta.body.error?.reason, "platform_tenant_not_found");

      const leitura = await lerModulos(baseUrl, id);
      assert.equal(leitura.status, 404, `${id}: ${JSON.stringify(leitura.body)}`);
      assert.equal(leitura.body.error?.reason, "platform_tenant_not_found");
    }
  });
});

async function criarOrganizacaoNoServico(
  service: PlatformOrganizationsService,
  rotulo: string,
): Promise<{ readonly organization: { readonly id: string } }> {
  const criado = await service.createTenant(
    { name: `Organização Teste ${rotulo} ${sufixo()}`, group: { name: `Grupo Teste ${rotulo} ${sufixo()}` } },
    ATOR,
  );
  return { organization: { id: criado.organization.id } };
}

function repositorioDeUmaLinha(linha: PlatformOrganizationRecord, escritas: string[][] = []): PlatformOrganizationsRepository {
  let atual = linha;
  return {
    async list() {
      return [atual];
    },
    async findById(id: string) {
      return id === atual.id ? atual : null;
    },
    async create(_input: CreateOrganizationRecord): Promise<CreatedOrganizationRecord> {
      throw new Error("create não é exercitado neste teste");
    },
    async rename() {
      throw new Error("rename não é exercitado neste teste");
    },
    async changeStatus() {
      throw new Error("changeStatus não é exercitado neste teste");
    },
    async replaceModules(id: string, modules: readonly string[], _actorUserId: string, now: Date) {
      if (id !== atual.id) return { kind: "not_found" } as const;
      atual = { ...atual, modules: [...modules], updatedAt: now };
      escritas.push([...modules]);
      return { kind: "changed", organization: atual } as const;
    },
  };
}

async function arnesDeServico(repository: PlatformOrganizationsRepository) {
  const { PlatformOrganizationsService } = await import("../src/modules/platform/platform-organizations.service.js");
  const { InMemoryEconomicGroupsRepository } = await import(
    "../src/modules/subscription-billing/economic-groups/economic-groups.repository.js"
  );
  const { EconomicGroupsService } = await import(
    "../src/modules/subscription-billing/economic-groups/economic-groups.service.js"
  );
  const { InMemoryBillingProfileRepository } = await import(
    "../src/modules/subscription-billing/billing-profile/billing-profile.js"
  );
  const { InMemoryPlansRepository } = await import("../src/modules/subscription-billing/plans/plans.repository.js");
  const { PlansService } = await import("../src/modules/subscription-billing/plans/plans.service.js");
  const { InMemorySubscriptionsRepository } = await import(
    "../src/modules/subscription-billing/plans/subscriptions.repository.js"
  );
  const { SubscriptionsService } = await import("../src/modules/subscription-billing/plans/subscriptions.service.js");
  const { InMemoryTenantLookup } = await import("../src/modules/subscription-billing/subscription-billing.service.js");

  const tenants = new InMemoryTenantLookup();
  const plansRepository = new InMemoryPlansRepository();
  const subscriptions = new SubscriptionsService(
    new InMemorySubscriptionsRepository(),
    plansRepository,
    tenants,
    {
      writeModules: async (tenantId: string, modules: readonly string[]) => {
        await repository.replaceModules(tenantId, [...modules], ATOR, new Date());
      },
    },
  );
  const directory = {
    getTenant: async (id: string) => {
      const row = await repository.findById(id);
      return row ? { id: row.id, slug: row.slug, name: row.name } : null;
    },
    listTenantIds: async () => (await repository.list()).map((row) => row.id),
  };
  const groups = new EconomicGroupsService(new InMemoryEconomicGroupsRepository(), directory);
  const service = new PlatformOrganizationsService(
    repository,
    groups,
    subscriptions,
    new InMemoryBillingProfileRepository(),
    undefined,
    (row) => {
      tenants.upsert({ id: row.id, slug: row.slug });
    },
  );

  return { service, repository, plans: new PlansService(plansRepository), subscriptions, tenants };
}

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
): Promise<Resposta> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: { "content-type": "application/json", ...PLATFORM_HEADERS, ...options.headers },
    ...(options.body === undefined || options.method === "GET" || options.method === "HEAD"
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  return { status: response.status, body: (await response.json()) as any };
}

async function baseUrlOf(server: Server): Promise<string> {
  if (!server.listening) await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}
