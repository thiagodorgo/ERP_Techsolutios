import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { WorkOrderTimeseriesRow } from "../src/modules/work-order-timeseries/work-order-timeseries.types.js";
import type { WorkOrderPriority, WorkOrderStatus } from "../src/modules/work-orders/work-order.types.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Modo memory ANTES de qualquer import de RUNTIME (o .env força "prisma" e o dotenv não sobrescreve o
// process.env já definido). Só `import type` (apagado em runtime) e builtins estáticos acima; os módulos
// de runtime entram por `await import` abaixo — espelha o harness dos demais testes de rota.
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

const {
  computeWorkOrderTimeseries,
  enumerateDays,
  createMemoryWorkOrderTimeseriesService,
  resetWorkOrderTimeseriesRuntimeForTests,
} = await import("../src/modules/work-order-timeseries/index.js");
const { getMemoryWorkOrderRepositoryForTests, resetWorkOrderRuntimeForTests } = await import(
  "../src/modules/work-orders/index.js"
);
const { deriveBusinessDate } = await import("../src/config/business-time.js");

const WINDOW = { from: "2026-07-01", to: "2026-07-31" } as const; // 31 dias

const at = (iso: string): Date => new Date(iso);

function row(overrides: Partial<WorkOrderTimeseriesRow> = {}): WorkOrderTimeseriesRow {
  return {
    status: "open",
    createdAt: at("2026-07-10T12:00:00Z"), // 09:00 BRT de 10/07
    ...overrides,
  };
}

function pointFor(points: readonly { date: string }[], date: string) {
  return points.find((point) => point.date === date);
}

// -------------------------------------------------------------- compute PURO

test("compute: created/completed/cancelled no dia certo + zero-fill contínuo da janela", () => {
  const result = computeWorkOrderTimeseries(
    [
      row({ status: "open", createdAt: at("2026-07-10T12:00:00Z") }),
      row({ status: "open", createdAt: at("2026-07-10T15:00:00Z") }),
      // criada em 10, concluída em 20 → conta created em 10 E completed em 20 (métricas independentes)
      row({ status: "completed", createdAt: at("2026-07-10T12:00:00Z"), completedAt: at("2026-07-20T12:00:00Z") }),
      row({ status: "cancelled", createdAt: at("2026-07-11T12:00:00Z"), cancelledAt: at("2026-07-25T12:00:00Z") }),
    ],
    WINDOW,
  );

  assert.equal(result.bucket, "day");
  assert.equal(result.timezone, "America/Sao_Paulo");
  assert.equal(result.from, "2026-07-01");
  assert.equal(result.to, "2026-07-31");
  assert.equal(result.points.length, 31); // zero-fill: TODO dia 01..31

  assert.equal(pointFor(result.points, "2026-07-10")?.created, 3); // 2 open + 1 completed criadas em 10
  assert.equal(pointFor(result.points, "2026-07-11")?.created, 1); // a cancelada criada em 11
  assert.equal(pointFor(result.points, "2026-07-20")?.completed, 1);
  assert.equal(pointFor(result.points, "2026-07-25")?.cancelled, 1);
  // dia sem OS = 0 honesto (não omitido)
  assert.deepEqual(pointFor(result.points, "2026-07-05"), {
    date: "2026-07-05",
    created: 0,
    completed: 0,
    cancelled: 0,
  });
  // série contígua e ordenada
  assert.equal(result.points[0]?.date, "2026-07-01");
  assert.equal(result.points[30]?.date, "2026-07-31");
});

test("compute: bucketing usa o FUSO America/Sao_Paulo, não UTC", () => {
  // 02:00Z de 16/07 = 23:00 BRT de 15/07 → cai em 2026-07-15, não 07-16.
  const result = computeWorkOrderTimeseries([row({ status: "open", createdAt: at("2026-07-16T02:00:00Z") })], WINDOW);
  assert.equal(pointFor(result.points, "2026-07-15")?.created, 1);
  assert.equal(pointFor(result.points, "2026-07-16")?.created, 0);
});

test("compute: janela recorta — evento fora de [from,to] não conta; métricas independentes", () => {
  const result = computeWorkOrderTimeseries(
    [
      // criada ANTES do from, concluída DENTRO → só completed conta
      row({ status: "completed", createdAt: at("2026-06-20T12:00:00Z"), completedAt: at("2026-07-20T12:00:00Z") }),
      // criada DENTRO, concluída DEPOIS do to → só created conta
      row({ status: "completed", createdAt: at("2026-07-15T12:00:00Z"), completedAt: at("2026-08-05T12:00:00Z") }),
      // criada DEPOIS do to → nada conta
      row({ status: "open", createdAt: at("2026-08-10T12:00:00Z") }),
    ],
    WINDOW,
  );

  const totalCreated = result.points.reduce((sum, point) => sum + point.created, 0);
  const totalCompleted = result.points.reduce((sum, point) => sum + point.completed, 0);
  assert.equal(totalCreated, 1); // só a criada em 07-15
  assert.equal(totalCompleted, 1); // só a concluída em 07-20
  assert.equal(pointFor(result.points, "2026-07-20")?.completed, 1);
  assert.equal(pointFor(result.points, "2026-07-15")?.created, 1);
});

test("compute: completed/cancelled sem timestamp terminal caem em created_at (fallback documentado, evento não some)", () => {
  const result = computeWorkOrderTimeseries(
    [
      row({ status: "cancelled", createdAt: at("2026-07-12T12:00:00Z") }), // sem cancelledAt
      row({ status: "completed", createdAt: at("2026-07-13T12:00:00Z") }), // sem completedAt
    ],
    WINDOW,
  );
  assert.equal(pointFor(result.points, "2026-07-12")?.cancelled, 1);
  assert.equal(pointFor(result.points, "2026-07-13")?.completed, 1);
});

test("enumerateDays: série contígua inclusiva (from=to → 1 dia; cruza mês → contígua)", () => {
  assert.deepEqual(enumerateDays({ from: "2026-07-01", to: "2026-07-01" }), ["2026-07-01"]);
  // 2026 não é bissexto → fevereiro tem 28 dias.
  assert.deepEqual(enumerateDays({ from: "2026-02-27", to: "2026-03-01" }), ["2026-02-27", "2026-02-28", "2026-03-01"]);
});

// -------------------------------------------------------------- serviço InMemory (agrega real + isola)

async function seedWorkOrder(
  tenantId: string,
  code: string,
  status: WorkOrderStatus,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await getMemoryWorkOrderRepositoryForTests().create({
    tenantId,
    code,
    title: `OS ${code}`,
    priority: "medium" as WorkOrderPriority,
    status,
    ...overrides,
  });
}

function actor(tenantId: string) {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager" as const],
    permissions: ["work_orders:read" as const],
  };
}

test("serviço InMemory: agrega OSs REAIS do tenant, zero-fill na janela e ISOLA cross-tenant", async () => {
  resetWorkOrderRuntimeForTests();
  resetWorkOrderTimeseriesRuntimeForTests();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const now = new Date();

  await seedWorkOrder(tenantA, "OS-A1", "open");
  await seedWorkOrder(tenantA, "OS-A2", "open");
  await seedWorkOrder(tenantA, "OS-A3", "completed", { completedAt: now });
  await seedWorkOrder(tenantA, "OS-A4", "cancelled", { cancelledAt: now });
  await seedWorkOrder(tenantB, "OS-B1", "open"); // outro tenant

  const service = createMemoryWorkOrderTimeseriesService();

  const resultA = await service.getTimeseries(actor(tenantA), { days: "7" });
  assert.equal(resultA.points.length, 7); // zero-fill: 7 dias
  const today = deriveBusinessDate(now);
  assert.equal(resultA.to, today);
  const lastA = resultA.points[resultA.points.length - 1];
  assert.equal(lastA?.date, today);
  assert.equal(lastA?.created, 4); // as 4 OS de A foram criadas "hoje"
  assert.equal(lastA?.completed, 1);
  assert.equal(lastA?.cancelled, 1);
  // primeiro dia da janela sem OS = 0 (honesto)
  assert.deepEqual(resultA.points[0], { date: resultA.from, created: 0, completed: 0, cancelled: 0 });

  // tenant B só enxerga o próprio dado (isolamento)
  const resultB = await service.getTimeseries(actor(tenantB), { days: "7" });
  const totalCreatedB = resultB.points.reduce((sum, point) => sum + point.created, 0);
  assert.equal(totalCreatedB, 1);

  resetWorkOrderRuntimeForTests();
  resetWorkOrderTimeseriesRuntimeForTests();
});

test("serviço InMemory: from > to → 400 invalid_window", async () => {
  resetWorkOrderRuntimeForTests();
  resetWorkOrderTimeseriesRuntimeForTests();
  const service = createMemoryWorkOrderTimeseriesService();
  await assert.rejects(
    () => service.getTimeseries(actor(randomUUID()), { from: "2026-08-01", to: "2026-07-01" }),
    (error: unknown) => (error as { statusCode?: number; reason?: string }).reason === "invalid_window",
  );
  resetWorkOrderRuntimeForTests();
  resetWorkOrderTimeseriesRuntimeForTests();
});

// -------------------------------------------------------------- rotas HTTP (RBAC + wiring + §2.8 + isolamento)

test("rota: 200 série+zero-fill+§2.8; 403 sem work_orders:read; 400 janela/days inválidos; isola tenant", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    await seedWorkOrder(seed.tenantA.id, "OS-A1", "open");
    await seedWorkOrder(seed.tenantA.id, "OS-A2", "completed", { completedAt: new Date() });
    await seedWorkOrder(seed.tenantB.id, "OS-B1", "open");

    const path = "/api/v1/operations/work-orders-timeseries";
    const unauthenticated = await requestJson(baseUrl, path);
    // finance NÃO tem work_orders:read → 403 (gate por permissão de leitura de OS).
    const forbidden = await requestJson(baseUrl, path, { headers: authHeaders(seed.tenantA, seed.financeA, "finance") });
    const authorized = await requestJson(baseUrl, `${path}?days=7`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const defaultWindow = await requestJson(baseUrl, path, { headers: authHeaders(seed.tenantA, seed.managerA, "manager") });
    const explicit = await requestJson(baseUrl, `${path}?from=2026-07-01&to=2026-07-03`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const badWindow = await requestJson(baseUrl, `${path}?from=2026-08-01&to=2026-07-01`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const badDays = await requestJson(baseUrl, `${path}?days=0`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const crossTenant = await requestJson(baseUrl, `${path}?days=7`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(unauthenticated.status, 403);
    assert.equal(forbidden.status, 403);

    assert.equal(authorized.status, 200);
    assert.equal(authorized.body.data.bucket, "day");
    assert.equal(authorized.body.data.timezone, "America/Sao_Paulo");
    assert.equal(authorized.body.data.points.length, 7);
    // §2.8 — o DTO não vaza tenant_id
    assert.equal("tenantId" in authorized.body.data, false);
    assert.equal("tenant_id" in authorized.body.data, false);
    assert.equal("tenantId" in authorized.body.data.points[0], false);
    const totalCreatedA = authorized.body.data.points.reduce((sum: number, point: { created: number }) => sum + point.created, 0);
    const totalCompletedA = authorized.body.data.points.reduce((sum: number, point: { completed: number }) => sum + point.completed, 0);
    assert.equal(totalCreatedA, 2); // as 2 OS de A criadas hoje entram na janela
    assert.equal(totalCompletedA, 1);

    assert.equal(defaultWindow.status, 200);
    assert.equal(defaultWindow.body.data.points.length, 30); // default: janela de 30 dias

    assert.equal(explicit.status, 200);
    assert.equal(explicit.body.data.points.length, 3); // 01,02,03
    assert.equal(explicit.body.data.from, "2026-07-01");
    assert.equal(explicit.body.data.to, "2026-07-03");

    assert.equal(badWindow.status, 400);
    assert.equal(badWindow.body.error.reason, "invalid_window");
    assert.equal(badDays.status, 400);
    assert.equal(badDays.body.error.reason, "invalid_days");

    // tenant B só conta a própria OS (isolamento por tenant)
    assert.equal(crossTenant.status, 200);
    const totalCreatedB = crossTenant.body.data.points.reduce((sum: number, point: { created: number }) => sum + point.created, 0);
    assert.equal(totalCreatedB, 1);
  });
});

// -------------------------------------------------------------- harness HTTP

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly financeA: User;
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
  resetWorkOrderTimeseriesRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "TS A", modules: ["dashboard", "work_orders", "field_operations"] });
  const tenantB = core.createTenant({ name: "TS B", modules: ["dashboard", "work_orders", "field_operations"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Manager A", email: `ts-mgr-a-${randomUUID()}@e.com`, roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Manager B", email: `ts-mgr-b-${randomUUID()}@e.com`, roles: ["manager"] });
  const financeA = core.createUser({ tenantId: tenantA.id, name: "Finance A", email: `ts-fin-a-${randomUUID()}@e.com`, roles: ["finance"] });

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB, managerA, managerB, financeA } });
  } finally {
    await closeServer(server);
    resetWorkOrderRuntimeForTests();
    resetWorkOrderTimeseriesRuntimeForTests();
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
