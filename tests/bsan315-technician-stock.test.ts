import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B-SAN3-15a (itens 35 a 37 do portão, primeira parte) — O ESTOQUE REAL DO TÉCNICO.
//
// `GET /api/v1/mobile/technician/stock` devolve só itens ATIVOS com saldo > 0 numa custódia que o SERVIDOR escolhe
// pelo ator autenticado (nunca pelo pedido): a custódia PROFISSIONAL de quem tem cadastro de profissional ativo; a BASE
// para o ator sem cadastro e com papel `tenant_wide` (Pergunta 5 (a) do plano, resposta do dono de 11/11); e nada
// (`custody: null`, `items: []`) para os demais. A resposta é mínima (§2.8): nunca `tenant_id`, id de perfil, ids de
// custódia nem custo. Plano `plano-B-SAN3-15-v2.md` §3.1 (T-B1 a T-B10) com a Emenda 1 (N-01, N-12).
//
// Cenário de partida (plano §3.1): o ator `inventory` cria X, Y, Z e W; tecA e tecB têm perfil de profissional criado
// pelo `tenant_admin` com `user_id` = um `randomUUID()` (o usuário semeado em memória não é UUID); X recebe LINK de 5
// para a custódia do tecA; Y, LINK de 3 para a do tecB; Z fica só na BASE, com 10; W numa viatura, com 2. As chamadas
// do tecA usam `x-user-id: tecAUser`, nunca o id semeado. Memória: o arnês de rota de `tests/stock-custody.test.ts`.

const STOCK_PATH = "/api/v1/mobile/technician/stock";

test("[T-B1] [escopo] o técnico vê só a própria custódia profissional", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);

    const response = await stock(baseUrl, techHeaders(seed.tenantA, s.tecAUser));

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(response.body.data.custody, { kind: "professional", label: "Técnico A" });
    assert.deepEqual(summarize(response.body.data.items), [`${s.x.sku}:5`]);
    assert.equal(response.body.data.items[0].itemId, s.x.id);
  });
});

test("[T-B2] [saldo] item zerado some e baixa reduz", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);
    const inv = inventoryHeaders(seed);

    // X: LINK 5 (cenário) e saída de 2 na própria custódia profissional → 3.
    await movement(baseUrl, inv, {
      item_id: s.x.id,
      type: "saida",
      quantidade: 2,
      custody_type: "professional",
      custody_operator_profile_id: s.profileA,
    });
    // V: LINK 4 e UNLINK 4 → saldo 0 na custódia → não aparece.
    const v = await createItem(baseUrl, inv, "BSAN-V01", "Fusível 10A");
    await entrada(baseUrl, inv, v.id, 4);
    await movement(baseUrl, inv, { item_id: v.id, type: "link", quantidade: 4, custody_type: "professional", custody_operator_profile_id: s.profileA });
    await movement(baseUrl, inv, { item_id: v.id, type: "unlink", quantidade: 4, custody_type: "professional", custody_operator_profile_id: s.profileA });

    const response = await stock(baseUrl, techHeaders(seed.tenantA, s.tecAUser));

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(summarize(response.body.data.items), [`${s.x.sku}:3`]);
  });
});

test("[T-B3] [ator] o pedido não escolhe a custódia (query, cabeçalho de organização e token)", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);

    // (i) query apontando para o tecB: ignorada.
    const byQuery = await stock(
      baseUrl,
      techHeaders(seed.tenantA, s.tecAUser),
      `?userId=${s.tecBUser}&operatorProfileId=${s.profileB}&user_id=${s.tecBUser}&custody_operator_profile_id=${s.profileB}`,
    );
    assert.equal(byQuery.status, 200, JSON.stringify(byQuery.body));
    assert.deepEqual(summarize(byQuery.body.data.items), [`${s.x.sku}:5`]);

    // (ii-a) memória e cabeçalhos legados: X-Tenant-Id da org B (onde o tecA não tem nada) → 200, custody null,
    // items [] e nenhum id de item da org A no corpo.
    const otherOrg = await stock(baseUrl, techHeaders(seed.tenantB, s.tecAUser));
    assert.equal(otherOrg.status, 200, JSON.stringify(otherOrg.body));
    assert.equal(otherOrg.body.data.custody, null);
    assert.deepEqual(otherOrg.body.data.items, []);
    const raw = JSON.stringify(otherOrg.body);
    for (const id of [s.x.id, s.y.id, s.z.id, s.w.id]) {
      assert.equal(raw.includes(id), false, `o corpo da org B não pode citar o item ${id} da org A`);
    }

    // (ii-b) token assinado do tecA na org A com X-Tenant-Id da org B: o cabeçalho é ignorado, vale o token.
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const token = await signAccessToken({
      user_id: s.tecAUser,
      tenant_id: seed.tenantA.id,
      email: "tec-a@example.com",
      roles: ["field_technician"],
    });
    const signed = await stock(baseUrl, { authorization: `Bearer ${token}`, "x-tenant-id": seed.tenantB.id });
    assert.equal(signed.status, 200, JSON.stringify(signed.body));
    assert.deepEqual(summarize(signed.body.data.items), [`${s.x.sku}:5`]);
  });
});

test("[T-B4] [sem cadastro] técnico de campo sem perfil, ou com perfil inativo → custody null e items []", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);

    // Sem perfil: técnico de campo e técnico (papéis `assigned_only`) não caem na BASE.
    for (const role of ["field_technician", "technician"]) {
      const noProfile = await stock(baseUrl, { ...techHeaders(seed.tenantA, randomUUID()), "x-role": role });
      assert.equal(noProfile.status, 200, `${role}: ${JSON.stringify(noProfile.body)}`);
      assert.equal(noProfile.body.data.custody, null, role);
      assert.deepEqual(noProfile.body.data.items, [], role);
    }

    // Perfil INATIVO com peça na custódia: nada aparece.
    const inactiveUser = randomUUID();
    const inactiveProfile = await createOperatorProfile(baseUrl, seed, inactiveUser, "Técnico Inativo");
    const inv = inventoryHeaders(seed);
    await entrada(baseUrl, inv, s.z.id, 1);
    await movement(baseUrl, inv, { item_id: s.z.id, type: "link", quantidade: 1, custody_type: "professional", custody_operator_profile_id: inactiveProfile });
    const deactivated = await requestJson(baseUrl, `/api/v1/operator-profiles/${inactiveProfile}`, {
      method: "PATCH",
      headers: adminHeaders(seed),
      body: { is_active: false },
    });
    assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));

    const inactive = await stock(baseUrl, techHeaders(seed.tenantA, inactiveUser));
    assert.equal(inactive.status, 200, JSON.stringify(inactive.body));
    assert.equal(inactive.body.data.custody, null);
    assert.deepEqual(inactive.body.data.items, []);
  });
});

test("[T-B9] [gerente] sem perfil vê exatamente a BASE; com perfil ativo vê a própria custódia; [field_technician, manager] sem perfil vê a BASE", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);

    // Gerente sem cadastro de profissional → a BASE: exatamente [Z: 10].
    const manager = await stock(baseUrl, { ...techHeaders(seed.tenantA, randomUUID()), "x-role": "manager" });
    assert.equal(manager.status, 200, JSON.stringify(manager.body));
    assert.deepEqual(manager.body.data.custody, { kind: "base", label: "Base da organização" });
    assert.deepEqual(summarize(manager.body.data.items), [`${s.z.sku}:10`]);

    // N-12 — presença e união: o ator [field_technician, manager] sem perfil também vê a BASE.
    const mixed = await stock(baseUrl, { ...techHeaders(seed.tenantA, randomUUID()), "x-role": "field_technician,manager" });
    assert.equal(mixed.status, 200, JSON.stringify(mixed.body));
    assert.equal(mixed.body.data.custody?.kind, "base");
    assert.deepEqual(summarize(mixed.body.data.items), [`${s.z.sku}:10`]);

    // Gerente COM perfil ativo → a própria custódia profissional (nunca a BASE).
    const managerUser = randomUUID();
    const managerProfile = await createOperatorProfile(baseUrl, seed, managerUser, "Gerente com cadastro");
    const inv = inventoryHeaders(seed);
    await entrada(baseUrl, inv, s.w.id, 1);
    await movement(baseUrl, inv, { item_id: s.w.id, type: "link", quantidade: 1, custody_type: "professional", custody_operator_profile_id: managerProfile });
    const withProfile = await stock(baseUrl, { ...techHeaders(seed.tenantA, managerUser), "x-role": "manager" });
    assert.equal(withProfile.status, 200, JSON.stringify(withProfile.body));
    assert.deepEqual(withProfile.body.data.custody, { kind: "professional", label: "Gerente com cadastro" });
    assert.deepEqual(summarize(withProfile.body.data.items), [`${s.w.sku}:1`]);
  });
});

test("[T-B5] [permissão] finance, support e field_dispatcher → 403; field_technician, technician e manager → 200", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);

    for (const role of ["finance", "support", "field_dispatcher"]) {
      const denied = await stock(baseUrl, { ...techHeaders(seed.tenantA, s.tecAUser), "x-role": role });
      assert.equal(denied.status, 403, `${role}: ${JSON.stringify(denied.body)}`);
      assert.equal(JSON.stringify(denied.body).includes(s.x.id), false, `${role}: o 403 não cita item`);
    }
    for (const role of ["field_technician", "technician", "manager"]) {
      const allowed = await stock(baseUrl, { ...techHeaders(seed.tenantA, s.tecAUser), "x-role": role });
      assert.equal(allowed.status, 200, `${role}: ${JSON.stringify(allowed.body)}`);
    }
  });
});

test("[T-B6] [resposta] conjunto exato de chaves, em profundidade, para kind professional e base", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);

    const professional = await stock(baseUrl, techHeaders(seed.tenantA, s.tecAUser));
    const base = await stock(baseUrl, { ...techHeaders(seed.tenantA, randomUUID()), "x-role": "manager" });

    for (const [label, response] of [["professional", professional], ["base", base]] as const) {
      assert.equal(response.status, 200, `${label}: ${JSON.stringify(response.body)}`);
      assert.deepEqual(Object.keys(response.body).sort(), ["data"], label);
      const data = response.body.data;
      assert.deepEqual(Object.keys(data).sort(), ["custody", "generatedAt", "items"], label);
      assert.deepEqual(Object.keys(data.custody).sort(), ["kind", "label"], label);
      assert.equal(data.custody.kind, label);
      assert.ok(data.items.length > 0, `${label}: o caso exige ao menos 1 item`);
      for (const item of data.items) {
        assert.deepEqual(Object.keys(item).sort(), ["available", "itemId", "name", "sku", "unit"], label);
        assert.equal(typeof item.available, "number", label);
      }
      assert.ok(!Number.isNaN(Date.parse(data.generatedAt)), `${label}: generatedAt é instante ISO`);
      // Em profundidade: nenhuma chave de organização, perfil, custódia por id nem custo, em nível nenhum.
      const forbidden = collectKeys(response.body).filter((key) =>
        /tenant|operatorprofile|profileid|custody.*id|vehicle|cost|price|userid/i.test(key),
      );
      assert.deepEqual(forbidden, [], `${label}: chaves proibidas ${forbidden.join(",")}`);
      const raw = JSON.stringify(response.body);
      for (const secret of [seed.tenantA.id, s.profileA, s.profileB, s.vehicle, s.tecAUser]) {
        assert.equal(raw.includes(secret), false, `${label}: o corpo não pode trazer ${secret}`);
      }
    }
  });
});

test("[T-B7] [item inativo] item desativado não aparece", async () => {
  await withStockApi(async ({ baseUrl, seed }) => {
    const s = await scenario(baseUrl, seed);
    const inv = inventoryHeaders(seed);

    const u = await createItem(baseUrl, inv, "BSAN-U01", "Relé 12V");
    await entrada(baseUrl, inv, u.id, 2);
    await movement(baseUrl, inv, { item_id: u.id, type: "link", quantidade: 2, custody_type: "professional", custody_operator_profile_id: s.profileA });
    const before = await stock(baseUrl, techHeaders(seed.tenantA, s.tecAUser));
    assert.deepEqual(summarize(before.body.data.items), ["BSAN-U01:2", `${s.x.sku}:5`]);

    const deactivated = await requestJson(baseUrl, `/api/v1/inventory-items/${u.id}`, {
      method: "PATCH",
      headers: inv,
      body: { is_active: false },
    });
    assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));

    const after = await stock(baseUrl, techHeaders(seed.tenantA, s.tecAUser));
    assert.equal(after.status, 200, JSON.stringify(after.body));
    assert.deepEqual(summarize(after.body.data.items), [`${s.x.sku}:5`]);
  });
});

test("[T-B10] [erro] o resolvedor de perfil lança Error('db down') → 503 com texto neutro, nunca 200 com custody null", async () => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ default: express }, { createInventoryItemRouter }, service, { InMemoryInventoryRepository }] = await Promise.all([
    import("express"),
    import("../src/modules/inventory/inventory.routes.js"),
    import("../src/modules/inventory/inventory.service.js"),
    import("../src/modules/inventory/inventory.repository.js"),
  ]);
  const failingProfiles = {
    async findByUserId(): Promise<never> {
      throw new Error("db down");
    },
  };
  const injected = new service.InventoryService(new InMemoryInventoryRepository(), {
    resolveActorOperatorProfile: service.createActorOperatorProfileResolver(async () => failingProfiles),
  });
  const app = express();
  app.use(express.json());
  app.use("/api/v1", createInventoryItemRouter({} as never, async () => injected));
  const server = app.listen(0);
  try {
    const baseUrl = await getBaseUrl(server);
    for (const role of ["field_technician", "manager"]) {
      const response = await stock(baseUrl, { "x-tenant-id": randomUUID(), "x-user-id": randomUUID(), "x-role": role });
      assert.equal(response.status, 503, `${role}: ${JSON.stringify(response.body)}`);
      assert.equal(JSON.stringify(response.body).includes("db down"), false, `${role}: o corpo não traz o erro cru`);
      assert.equal(response.body?.data, undefined, `${role}: nada de dado com a falha`);
    }
  } finally {
    await closeServer(server);
  }
});

// ------------------------------------------------------------------------------------------------ arnês

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly inventoryA: User;
};

type StockApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

type Item = { readonly id: string; readonly sku: string };

type Scenario = {
  readonly x: Item;
  readonly y: Item;
  readonly z: Item;
  readonly w: Item;
  readonly tecAUser: string;
  readonly tecBUser: string;
  readonly profileA: string;
  readonly profileB: string;
  readonly vehicle: string;
};

async function scenario(baseUrl: string, seed: SeedData): Promise<Scenario> {
  const inv = inventoryHeaders(seed);
  const tecAUser = randomUUID();
  const tecBUser = randomUUID();
  const profileA = await createOperatorProfile(baseUrl, seed, tecAUser, "Técnico A");
  const profileB = await createOperatorProfile(baseUrl, seed, tecBUser, "Técnico B");
  const vehicle = await createVehicle(baseUrl, seed, "BSN1A15");

  const x = await createItem(baseUrl, inv, "BSAN-X01", "Disjuntor 20A");
  const y = await createItem(baseUrl, inv, "BSAN-Y01", "Cabo 2,5 mm");
  const z = await createItem(baseUrl, inv, "BSAN-Z01", "Tomada 10A");
  const w = await createItem(baseUrl, inv, "BSAN-W01", "Cinta de reboque");

  await entrada(baseUrl, inv, x.id, 5);
  await movement(baseUrl, inv, { item_id: x.id, type: "link", quantidade: 5, custody_type: "professional", custody_operator_profile_id: profileA });
  await entrada(baseUrl, inv, y.id, 3);
  await movement(baseUrl, inv, { item_id: y.id, type: "link", quantidade: 3, custody_type: "professional", custody_operator_profile_id: profileB });
  await entrada(baseUrl, inv, z.id, 10);
  await entrada(baseUrl, inv, w.id, 2);
  await movement(baseUrl, inv, { item_id: w.id, type: "link", quantidade: 2, custody_type: "vehicle", custody_vehicle_id: vehicle });

  return { x, y, z, w, tecAUser, tecBUser, profileA, profileB, vehicle };
}

function summarize(items: ReadonlyArray<{ readonly sku: string; readonly available: number }>): string[] {
  return items.map((item) => `${item.sku}:${item.available}`).sort();
}

function collectKeys(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const entry of value) collectKeys(entry, acc);
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      acc.push(key);
      collectKeys(entry, acc);
    }
  }
  return acc;
}

function techHeaders(tenant: Tenant, userId: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": userId, "x-role": "field_technician" };
}

function inventoryHeaders(seed: SeedData): Record<string, string> {
  return { "x-tenant-id": seed.tenantA.id, "x-user-id": seed.inventoryA.id, "x-role": "inventory" };
}

function adminHeaders(seed: SeedData): Record<string, string> {
  return { "x-tenant-id": seed.tenantA.id, "x-user-id": seed.adminA.id, "x-role": "tenant_admin" };
}

async function stock(baseUrl: string, headers: Record<string, string>, query = "") {
  return requestJson(baseUrl, `${STOCK_PATH}${query}`, { headers });
}

async function createItem(baseUrl: string, headers: Record<string, string>, sku: string, name: string): Promise<Item> {
  const created = await requestJson(baseUrl, "/api/v1/inventory-items", {
    method: "POST",
    headers,
    body: { sku, name, unit: "un" },
  });
  assert.equal(created.status, 201, `item creation failed: ${JSON.stringify(created.body)}`);
  return { id: created.body.data.id as string, sku: created.body.data.sku as string };
}

async function entrada(baseUrl: string, headers: Record<string, string>, itemId: string, quantidade: number): Promise<void> {
  await movement(baseUrl, headers, { item_id: itemId, type: "entrada", quantidade, unit_cost: 2 });
}

async function movement(baseUrl: string, headers: Record<string, string>, body: Record<string, unknown>): Promise<void> {
  const created = await requestJson(baseUrl, "/api/v1/stock-movements", { method: "POST", headers, body });
  assert.equal(created.status, 201, `movement failed: ${JSON.stringify(created.body)}`);
}

async function createOperatorProfile(baseUrl: string, seed: SeedData, userId: string, fullName: string): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/operator-profiles", {
    method: "POST",
    headers: adminHeaders(seed),
    body: { user_id: userId, full_name: fullName },
  });
  assert.equal(created.status, 201, `operator profile creation failed: ${JSON.stringify(created.body)}`);
  return created.body.data.id as string;
}

async function createVehicle(baseUrl: string, seed: SeedData, plate: string): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/vehicles", {
    method: "POST",
    headers: adminHeaders(seed),
    body: { plate, model: "Caminhao Guincho" },
  });
  assert.equal(created.status, 201, `vehicle creation failed: ${JSON.stringify(created.body)}`);
  return created.body.data.id as string;
}

async function withStockApi(callback: (context: StockApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetInventoryRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { resetOperatorProfileRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/inventory/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/operator-profiles/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetInventoryRuntimeForTests();
  resetVehicleRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetOperatorProfileRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Organização Estoque A", modules: ["dashboard", "work_orders"] });
  const tenantB = core.createTenant({ name: "Organização Estoque B", modules: ["dashboard", "work_orders"] });
  const adminA = core.createUser({ tenantId: tenantA.id, name: "Admin A", email: "bsan315-admin-a@example.com", roles: ["tenant_admin"] });
  const inventoryA = core.createUser({ tenantId: tenantA.id, name: "Estoque A", email: "bsan315-estoque-a@example.com", roles: ["inventory"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB, adminA, inventoryA } });
  } finally {
    await closeServer(server);
    resetInventoryRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetOperatorProfileRuntimeForTests();
  }
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", resolve));
  }
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
