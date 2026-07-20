import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { WorkOrderPerformanceRow } from "../src/modules/technician-performance/technician-performance.types.js";
import type { WorkOrderPriority, WorkOrderStatus } from "../src/modules/work-orders/work-order.types.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Modo memory ANTES de qualquer import de RUNTIME (o .env força "prisma" e o dotenv não sobrescreve o
// process.env já definido). Só `import type` (apagado em runtime) e builtins estáticos acima; os módulos
// de runtime entram por `await import` abaixo — espelha o harness dos demais testes de rota.
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

const { computeTechnicianPerformance, createMemoryTechnicianPerformanceService, resetTechnicianPerformanceRuntimeForTests } =
  await import("../src/modules/technician-performance/index.js");
const { getMemoryWorkOrderRepositoryForTests, resetWorkOrderRuntimeForTests } = await import(
  "../src/modules/work-orders/index.js"
);

const OP_A = "11111111-1111-1111-1111-111111111111";
const OP_B = "22222222-2222-2222-2222-222222222222";

function row(overrides: Partial<WorkOrderPerformanceRow> = {}): WorkOrderPerformanceRow {
  return {
    operatorUserId: OP_A,
    status: "completed",
    createdAt: new Date("2026-07-10T00:00:00-03:00"),
    ...overrides,
  };
}

// -------------------------------------------------------------- compute PURO

test("compute: índice = concluídas ÷ atribuídas por operador; cancelledCount contado à parte", () => {
  const items = computeTechnicianPerformance([
    row({ operatorUserId: OP_A, status: "completed" }),
    row({ operatorUserId: OP_A, status: "completed" }),
    row({ operatorUserId: OP_A, status: "in_progress" }),
    row({ operatorUserId: OP_A, status: "cancelled" }),
    row({ operatorUserId: OP_B, status: "completed" }),
    row({ operatorUserId: OP_B, status: "open" }),
  ]);

  const a = items.find((item) => item.operatorUserId === OP_A);
  const b = items.find((item) => item.operatorUserId === OP_B);
  assert.equal(a?.assignedCount, 4);
  assert.equal(a?.completedCount, 2);
  assert.equal(a?.cancelledCount, 1);
  assert.equal(a?.completionRate, 0.5); // 2 / 4
  assert.equal(b?.assignedCount, 2);
  assert.equal(b?.completedCount, 1);
  assert.equal(b?.completionRate, 0.5); // 1 / 2
});

test("compute: operador sem OS atribuída NÃO aparece (nunca fabrica linha); rate nunca é 0 falso", () => {
  const items = computeTechnicianPerformance([row({ operatorUserId: OP_A, status: "open" })]);
  // OP_A tem 1 atribuída/0 concluída → rate 0 REAL (honesto). OP_B não tem nenhuma → ausente.
  assert.equal(items.length, 1);
  assert.equal(items[0]?.operatorUserId, OP_A);
  assert.equal(items[0]?.completionRate, 0);
  assert.equal(items.find((item) => item.operatorUserId === OP_B), undefined);
});

test("compute: janela por created_at (inclusiva) recorta o denominador", () => {
  const items = computeTechnicianPerformance(
    [
      row({ status: "completed", createdAt: new Date("2026-07-05T00:00:00-03:00") }), // dentro
      row({ status: "completed", createdAt: new Date("2026-07-20T00:00:00-03:00") }), // dentro
      row({ status: "completed", createdAt: new Date("2026-06-01T00:00:00-03:00") }), // ANTES do from
      row({ status: "open", createdAt: new Date("2026-08-15T00:00:00-03:00") }), // DEPOIS do to
    ],
    { from: new Date("2026-07-01T00:00:00-03:00"), to: new Date("2026-07-31T23:59:59-03:00") },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0]?.assignedCount, 2); // só as 2 de julho
  assert.equal(items[0]?.completedCount, 2);
  assert.equal(items[0]?.completionRate, 1);
});

test("compute: filtro operatorUserId isola um técnico", () => {
  const items = computeTechnicianPerformance(
    [row({ operatorUserId: OP_A }), row({ operatorUserId: OP_B })],
    { operatorUserId: OP_B },
  );
  assert.equal(items.length, 1);
  assert.equal(items[0]?.operatorUserId, OP_B);
});

test("compute: ordena por índice de conclusão desc (ranking de alocação)", () => {
  const items = computeTechnicianPerformance([
    row({ operatorUserId: OP_A, status: "completed" }),
    row({ operatorUserId: OP_A, status: "open" }), // A: 1/2 = 0.5
    row({ operatorUserId: OP_B, status: "completed" }),
    row({ operatorUserId: OP_B, status: "completed" }), // B: 2/2 = 1.0
  ]);
  assert.equal(items[0]?.operatorUserId, OP_B); // maior índice primeiro
  assert.equal(items[0]?.completionRate, 1);
  assert.equal(items[1]?.operatorUserId, OP_A);
});

// -------------------------------------------------------------- serviço InMemory (paridade + isolamento)

async function seedWorkOrder(
  tenantId: string,
  assignedUserId: string | undefined,
  status: WorkOrderStatus,
  code: string,
): Promise<void> {
  await getMemoryWorkOrderRepositoryForTests().create({
    tenantId,
    code,
    title: `OS ${code}`,
    priority: "medium" as WorkOrderPriority,
    assignedUserId,
    status,
  });
}

function actor(tenantId: string, operatorUserId = OP_A) {
  return {
    tenantId,
    userId: operatorUserId,
    roles: ["manager" as const],
    permissions: ["field_dispatch:read" as const],
  };
}

test("serviço InMemory: agrega OSs REAIS do tenant e ISOLA cross-tenant", async () => {
  resetWorkOrderRuntimeForTests();
  resetTechnicianPerformanceRuntimeForTests();
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  await seedWorkOrder(tenantA, OP_A, "completed", "OS-A1");
  await seedWorkOrder(tenantA, OP_A, "completed", "OS-A2");
  await seedWorkOrder(tenantA, OP_A, "in_progress", "OS-A3");
  await seedWorkOrder(tenantA, undefined, "open", "OS-A4"); // sem técnico → ignorada
  await seedWorkOrder(tenantB, OP_B, "completed", "OS-B1"); // outro tenant

  const service = createMemoryTechnicianPerformanceService();
  const resultA = await service.getPerformance(actor(tenantA));
  assert.equal(resultA.items.length, 1);
  assert.equal(resultA.items[0]?.operatorUserId, OP_A);
  assert.equal(resultA.items[0]?.assignedCount, 3); // a sem técnico não conta
  assert.equal(resultA.items[0]?.completedCount, 2);
  assert.equal(resultA.items[0]?.completionRate, 0.6667); // 2/3 arredondado a 4 casas

  // tenant B só enxerga o próprio dado (isolamento)
  const resultB = await service.getPerformance(actor(tenantB, OP_B));
  assert.equal(resultB.items.length, 1);
  assert.equal(resultB.items[0]?.operatorUserId, OP_B);
  assert.equal(resultB.items[0]?.assignedCount, 1);

  resetWorkOrderRuntimeForTests();
  resetTechnicianPerformanceRuntimeForTests();
});

test("serviço InMemory: técnico pedido SEM OS → linha zerada com completionRate=null (não 0 fabricado)", async () => {
  resetWorkOrderRuntimeForTests();
  resetTechnicianPerformanceRuntimeForTests();
  const tenantA = randomUUID();
  await seedWorkOrder(tenantA, OP_A, "completed", "OS-A1");

  const service = createMemoryTechnicianPerformanceService();
  const semOs = randomUUID();
  const result = await service.getPerformance(actor(tenantA), { operatorUserId: semOs });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.operatorUserId, semOs);
  assert.equal(result.items[0]?.assignedCount, 0);
  assert.equal(result.items[0]?.completedCount, 0);
  assert.equal(result.items[0]?.completionRate, null); // null explícito, nunca 0

  resetWorkOrderRuntimeForTests();
  resetTechnicianPerformanceRuntimeForTests();
});

test("serviço InMemory: from > to → 400 invalid_window", async () => {
  resetWorkOrderRuntimeForTests();
  resetTechnicianPerformanceRuntimeForTests();
  const service = createMemoryTechnicianPerformanceService();
  await assert.rejects(
    () => service.getPerformance(actor(randomUUID()), { from: "2026-08-01", to: "2026-07-01" }),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).reason === "invalid_window",
  );
  resetWorkOrderRuntimeForTests();
  resetTechnicianPerformanceRuntimeForTests();
});

// -------------------------------------------------------------- rotas HTTP (RBAC + wiring + isolamento)

test("rota: 200 agrega por técnico; 403 sem field_dispatch:create (inclui o técnico de campo); isola cross-tenant", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    // Semeia OSs do tenant A diretamente no singleton de work_orders (read-aggregate).
    await seedWorkOrder(seed.tenantA.id, seed.techA, "completed", "OS-A1");
    await seedWorkOrder(seed.tenantA.id, seed.techA, "completed", "OS-A2");
    await seedWorkOrder(seed.tenantA.id, seed.techA, "open", "OS-A3");
    await seedWorkOrder(seed.tenantB.id, seed.techB, "completed", "OS-B1");

    const unauthenticated = await requestJson(baseUrl, "/api/v1/operations/technician-performance");
    const forbidden = await requestJson(baseUrl, "/api/v1/operations/technician-performance", {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"), // alias sem field_dispatch:*
    });
    // ALTA da junta (coordenador-de-acessos): o gate é `field_dispatch:create` (quem ALOCA), então o TÉCNICO
    // DE CAMPO canônico — que tem `field_dispatch:read` mas NÃO `:create` — fica EXCLUÍDO do ranking gerencial
    // tenant-wide (coerente com o "field-scoped" da RBAC_MATRIX). Gatear por :read o teria exposto (200).
    const fieldTechForbidden = await requestJson(baseUrl, "/api/v1/operations/technician-performance", {
      headers: authHeaders(seed.tenantA, seed.technicianA, "field_technician"),
    });
    const authorized = await requestJson(baseUrl, "/api/v1/operations/technician-performance", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const single = await requestJson(
      baseUrl,
      `/api/v1/operations/technician-performance?operatorUserId=${seed.techA}`,
      { headers: authHeaders(seed.tenantA, seed.managerA, "manager") },
    );
    const noOs = await requestJson(
      baseUrl,
      `/api/v1/operations/technician-performance?operatorUserId=${randomUUID()}`,
      { headers: authHeaders(seed.tenantA, seed.managerA, "manager") },
    );
    const crossTenant = await requestJson(baseUrl, "/api/v1/operations/technician-performance", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(unauthenticated.status, 403);
    assert.equal(forbidden.status, 403);
    // O técnico de campo (field_dispatch:read, sem :create) é barrado do ranking gerencial — o gate estreitado funciona.
    assert.equal(fieldTechForbidden.status, 403);

    assert.equal(authorized.status, 200);
    assert.equal(authorized.body.data.items.length, 1);
    assert.equal(authorized.body.data.items[0].operatorUserId, seed.techA);
    assert.equal(authorized.body.data.items[0].assignedCount, 3);
    assert.equal(authorized.body.data.items[0].completedCount, 2);
    assert.equal(authorized.body.data.items[0].completionRate, 0.6667);
    // §2.8 — o DTO não vaza tenant_id
    assert.equal("tenantId" in authorized.body.data.items[0], false);

    assert.equal(single.status, 200);
    assert.equal(single.body.data.items.length, 1);
    assert.equal(single.body.data.items[0].operatorUserId, seed.techA);

    assert.equal(noOs.status, 200);
    assert.equal(noOs.body.data.items.length, 1);
    assert.equal(noOs.body.data.items[0].assignedCount, 0);
    assert.equal(noOs.body.data.items[0].completionRate, null);

    // tenant B só vê o próprio técnico (isolamento por tenant)
    assert.equal(crossTenant.status, 200);
    assert.equal(crossTenant.body.data.items.length, 1);
    assert.equal(crossTenant.body.data.items[0].operatorUserId, seed.techB);
  });
});

// -------------------------------------------------------------- harness HTTP

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly technicianA: User;
  readonly techA: string;
  readonly techB: string;
};

async function withApi(callback: (ctx: { baseUrl: string; seed: SeedData }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] =
    await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/core-saas.service.js"),
      import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
      import("../src/modules/core-saas/store/core-saas.store.js"),
    ]);

  resetWorkOrderRuntimeForTests();
  resetTechnicianPerformanceRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Perf A", modules: ["dashboard", "work_orders", "field_operations"] });
  const tenantB = core.createTenant({ name: "Perf B", modules: ["dashboard", "work_orders", "field_operations"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Manager A", email: `perf-mgr-a-${randomUUID()}@e.com`, roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Manager B", email: `perf-mgr-b-${randomUUID()}@e.com`, roles: ["manager"] });
  const technicianA = core.createUser({ tenantId: tenantA.id, name: "Tech A", email: `perf-tech-a-${randomUUID()}@e.com`, roles: ["technician"] });

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed: { tenantA, tenantB, managerA, managerB, technicianA, techA: technicianA.id, techB: randomUUID() },
    });
  } finally {
    await closeServer(server);
    resetWorkOrderRuntimeForTests();
    resetTechnicianPerformanceRuntimeForTests();
  }
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return { status: response.status, body: text ? JSON.parse(text) : null };
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
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
