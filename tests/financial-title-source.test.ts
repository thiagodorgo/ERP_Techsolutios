import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// Ω4C PR-02 — Contas a Pagar POR ORIGEM (fuel_log|maintenance_order|insurance_policy → título payable).
// Espelha o faturamento OS→Título mas com o par GENÉRICO source_type/source_id: idempotente por fonte
// (anti-relançamento 409), reversível (retirar = soft-delete; relançar volta), atravessa o CHOKEPOINT de
// período (422 period_closed) e prova a POSSE da fonte via resolveOwnership (404 cross-tenant).
//
// Persistência = memory. Setado ANTES de qualquer import de código de app (todos DINÂMICOS, abaixo) para o
// config/env congelar "memory" (dotenv não sobrescreve var já presente) — padrão dos demais *-routes.test.ts.
process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";

// Imports SÓ de tipo (apagados na compilação → não carregam módulo/env). Valores vêm de import dinâmico.
import type {
  CreateFinancialTitleForSourceInput,
  FinancialTitleActorContext,
} from "../src/modules/financial-titles/financial-title.types.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

type FinancialTitlesModule = typeof import("../src/modules/financial-titles/index.js");
let financialTitlesModulePromise: Promise<FinancialTitlesModule> | undefined;
function loadFinancialTitles(): Promise<FinancialTitlesModule> {
  financialTitlesModulePromise ??= import("../src/modules/financial-titles/index.js");
  return financialTitlesModulePromise;
}

// ---------------------------------------------------------------------------------------------------
// Parte 1 — SERVIÇO (memory): a lógica de createForSource/findActiveBySource/removeForSource.
// ---------------------------------------------------------------------------------------------------

function actor(tenantId = randomUUID()): FinancialTitleActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: ["financial_titles:read", "financial_titles:create", "financial_titles:update"],
  };
}

async function service() {
  const fin = await loadFinancialTitles();
  fin.resetFinancialTitleRuntimeForTests();
  return fin.createMemoryFinancialTitleService();
}

// Payload mínimo de um lançamento a PAGAR por origem. Sobrescreva o que o caso precisar.
function payable(overrides: Partial<CreateFinancialTitleForSourceInput> = {}): CreateFinancialTitleForSourceInput {
  return {
    sourceType: "fuel_log",
    sourceId: randomUUID(),
    direction: "payable",
    partyType: "supplier",
    partyName: "Posto Central",
    amount: 320.5,
    dueDate: new Date("2026-08-10T00:00:00.000Z"),
    issueDate: new Date("2026-07-10T12:00:00.000Z"),
    ...overrides,
  };
}

test("createForSource: título a PAGAR grava source_type/source_id, status open, competencia derivada, createdBy do ator", async () => {
  const svc = await service();
  const ctx = actor();
  const title = await svc.createForSource(ctx, payable({ description: "Abastecimento interno" }));
  assert.equal(title.direction, "payable");
  assert.equal(title.partyType, "supplier");
  assert.equal(title.partyName, "Posto Central");
  assert.equal(title.sourceType, "fuel_log");
  assert.ok(title.sourceId);
  assert.equal(title.amount, 320.5);
  assert.equal(title.currency, "BRL");
  assert.equal(title.paidAmount, 0);
  assert.equal(title.status, "open");
  assert.equal(title.competencia, "2026-07");
  assert.equal(title.description, "Abastecimento interno");
  assert.equal(title.createdBy, ctx.userId);
  // Coexistência: NUNCA popula work_order_id/service_quote_id por este caminho.
  assert.equal(title.workOrderId, undefined);
  assert.equal(title.serviceQuoteId, undefined);
});

test("createForSource: issueDate default = now → competencia do mês corrente", async () => {
  const svc = await service();
  const { deriveCompetencia } = await loadFinancialTitles();
  const title = await svc.createForSource(actor(), payable({ issueDate: undefined }));
  assert.equal(title.competencia, deriveCompetencia(new Date()));
});

test("createForSource: 2º lançamento ATIVO da mesma fonte+direção → 409 source_already_launched (idempotência)", async () => {
  const svc = await service();
  const { FinancialTitleError } = await loadFinancialTitles();
  const ctx = actor();
  const sourceId = randomUUID();
  await svc.createForSource(ctx, payable({ sourceId }));
  await assert.rejects(
    () => svc.createForSource(ctx, payable({ sourceId })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 409 && e.reason === "source_already_launched",
  );
});

test("createForSource: mesmo source_id mas source_type distinto NÃO colide (índice inclui source_type)", async () => {
  const svc = await service();
  const ctx = actor();
  const sourceId = randomUUID();
  const fromFuel = await svc.createForSource(ctx, payable({ sourceId, sourceType: "fuel_log" }));
  const fromMaint = await svc.createForSource(ctx, payable({ sourceId, sourceType: "maintenance_order" }));
  assert.notEqual(fromFuel.id, fromMaint.id);
  assert.equal(fromFuel.sourceType, "fuel_log");
  assert.equal(fromMaint.sourceType, "maintenance_order");
});

test("createForSource: source_type fora da allowlist → 400 invalid_source_type", async () => {
  const svc = await service();
  const { FinancialTitleError } = await loadFinancialTitles();
  await assert.rejects(
    () => svc.createForSource(actor(), payable({ sourceType: "work_order" })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 400 && e.reason === "invalid_source_type",
  );
});

test("createForSource: CHOKEPOINT — competência FECHADA bloqueia o lançamento → 422 period_closed", async () => {
  const svc = await service();
  const { FinancialTitleError, getMemoryFinancialPeriodCloseRepositoryForTests } = await loadFinancialTitles();
  const ctx = actor();
  // Fecha a competência derivada do issue_date (2026-07-10 → 2026-07).
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2026-07", "closed");
  await assert.rejects(
    () => svc.createForSource(ctx, payable({ issueDate: new Date("2026-07-10T12:00:00.000Z") })),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "period_closed",
  );
});

test("findActiveBySource: retorna o título ATIVO da fonte; é TENANT-SCOPED (outro tenant não enxerga)", async () => {
  const svc = await service();
  const ctx = actor();
  const sourceId = randomUUID();
  const created = await svc.createForSource(ctx, payable({ sourceId }));

  const found = await svc.findActiveBySource(ctx, "fuel_log", sourceId, "payable");
  assert.equal(found?.id, created.id);

  // Outro tenant NUNCA vê a fonte do primeiro (isolamento).
  const other = await svc.findActiveBySource(actor(), "fuel_log", sourceId, "payable");
  assert.equal(other, undefined);
});

test("removeForSource: RETIRA (soft-delete reversível) e some do findActiveBySource; RELANÇAR depois volta a criar", async () => {
  const svc = await service();
  const ctx = actor();
  const sourceId = randomUUID();
  const created = await svc.createForSource(ctx, payable({ sourceId }));

  const removed = await svc.removeForSource(ctx, "fuel_log", sourceId);
  assert.equal(removed.id, created.id);
  assert.ok(removed.deletedAt instanceof Date);
  assert.equal(await svc.findActiveBySource(ctx, "fuel_log", sourceId, "payable"), undefined);

  // Relançar após retirar: o índice parcial só conta ATIVOS → cria um título NOVO sem 409.
  const relaunched = await svc.createForSource(ctx, payable({ sourceId }));
  assert.notEqual(relaunched.id, created.id);
  assert.equal(relaunched.status, "open");
  assert.equal((await svc.findActiveBySource(ctx, "fuel_log", sourceId, "payable"))?.id, relaunched.id);
});

test("removeForSource: sem título ATIVO da fonte → 404 title_not_found", async () => {
  const svc = await service();
  const { FinancialTitleError } = await loadFinancialTitles();
  await assert.rejects(
    () => svc.removeForSource(actor(), "fuel_log", randomUUID()),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 404,
  );
});

test("removeForSource: CHOKEPOINT — retirar com competência FECHADA → 422 period_closed (reusa delete())", async () => {
  const svc = await service();
  const { FinancialTitleError, getMemoryFinancialPeriodCloseRepositoryForTests } = await loadFinancialTitles();
  const ctx = actor();
  const sourceId = randomUUID();
  await svc.createForSource(ctx, payable({ sourceId, issueDate: new Date("2026-07-10T12:00:00.000Z") }));
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, "2026-07", "closed");
  await assert.rejects(
    () => svc.removeForSource(ctx, "fuel_log", sourceId),
    (e: unknown) => e instanceof FinancialTitleError && e.statusCode === 422 && e.reason === "period_closed",
  );
});

test("ZERO regressão: o create público NÃO popula source (fica fora do índice de origem) e coexiste", async () => {
  const svc = await service();
  const ctx = actor();
  // Título avulso (POST /financial-titles): source_type/source_id ficam undefined.
  const avulso = await svc.create(ctx, {
    direction: "payable",
    party_type: "supplier",
    party_name: "Fornecedor Beta",
    amount: 100,
    due_date: "2026-08-10",
    issue_date: "2026-07-10",
  });
  assert.equal(avulso.sourceType, undefined);
  assert.equal(avulso.sourceId, undefined);
  // E dois avulsos coexistem (não participam da idempotência por origem).
  const avulso2 = await svc.create(ctx, {
    direction: "payable",
    party_type: "supplier",
    party_name: "Fornecedor Beta",
    amount: 200,
    due_date: "2026-08-10",
    issue_date: "2026-07-10",
  });
  assert.notEqual(avulso.id, avulso2.id);
});

// ---------------------------------------------------------------------------------------------------
// Parte 2 — ROTAS (HTTP, in-memory app): a route-factory montada nos módulos-fonte + RBAC + posse 404.
// ---------------------------------------------------------------------------------------------------

test("POST /fuel-logs/:id/payable cria conta a pagar (201), badge derivado no GET, DTO §2.8 sem tenant_id", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const fuelLogId = await createFuelLog(baseUrl, seed.tenantA, seed.managerA);

    const created = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: { party_type: "supplier", party_name: "Posto Central", amount: 320.5, due_date: "2026-08-10", issue_date: "2026-07-10" },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.direction, "payable");
    assert.equal(created.body.data.sourceType, "fuel_log");
    assert.equal(created.body.data.sourceId, fuelLogId);
    assert.equal(created.body.data.amount, 320.5);
    assert.equal(created.body.data.status, "open");
    assert.equal(created.body.data.active, true);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);

    // Badge derivado: GET devolve o título ATIVO da fonte.
    const badge = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });
    assert.equal(badge.status, 200);
    assert.equal(badge.body.data.id, created.body.data.id);
    assert.equal(badge.body.data.sourceType, "fuel_log");
  });
});

test("POST /fuel-logs/:id/payable duas vezes → 409 source_already_launched (idempotência por origem)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const fuelLogId = await createFuelLog(baseUrl, seed.tenantA, seed.managerA);
    const body = { party_type: "supplier", party_name: "Posto Central", amount: 100, due_date: "2026-08-10", issue_date: "2026-07-10" };

    const first = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body,
    });
    const second = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body,
    });

    assert.equal(first.status, 201);
    assert.equal(second.status, 409);
    assert.equal(second.body.error.reason, "source_already_launched");
  });
});

test("DELETE /fuel-logs/:id/payable retira (soft-delete) → GET vira null → RELANÇAR devolve 201", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const fuelLogId = await createFuelLog(baseUrl, seed.tenantA, seed.managerA);
    const body = { party_type: "supplier", party_name: "Posto Central", amount: 100, due_date: "2026-08-10", issue_date: "2026-07-10" };

    await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body,
    });
    const retracted = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });
    const badgeAfter = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });
    const relaunched = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body,
    });

    assert.equal(retracted.status, 200);
    assert.equal(retracted.body.data.active, false);
    assert.equal(badgeAfter.status, 200);
    assert.equal(badgeAfter.body.data, null);
    assert.equal(relaunched.status, 201);
    assert.equal(relaunched.body.data.active, true);
  });
});

test("[posse] POST /fuel-logs/:id/payable com a fonte de OUTRA organização → 404 (resolveOwnership)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const fuelLogId = await createFuelLog(baseUrl, seed.tenantA, seed.managerA);

    // finance da organização B tenta lançar sobre o abastecimento da A → o service.get() do módulo dá 404.
    const cross = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.financeB, "finance"),
      body: { party_type: "supplier", party_name: "Posto Central", amount: 100, due_date: "2026-08-10", issue_date: "2026-07-10" },
    });

    assert.equal(cross.status, 404);
  });
});

test("[rbac] papel SEM financial_titles:create (manager) → 403 ao lançar; anônimo → 403", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const fuelLogId = await createFuelLog(baseUrl, seed.tenantA, seed.managerA);
    const body = { party_type: "supplier", party_name: "Posto Central", amount: 100, due_date: "2026-08-10", issue_date: "2026-07-10" };

    const asManager = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body,
    });
    const anonymous = await requestJson(baseUrl, `/api/v1/fuel-logs/${fuelLogId}/payable`, { method: "POST", body });

    assert.equal(asManager.status, 403);
    assert.equal(anonymous.status, 403);
  });
});

test("POST /maintenance-orders/:id/payable prova a route-factory num 2º sourceType (maintenance_order)", async () => {
  await withApi(async ({ baseUrl, seed }) => {
    const maintenanceId = await createMaintenance(baseUrl, seed.tenantA, seed.managerA);

    const created = await requestJson(baseUrl, `/api/v1/maintenance-orders/${maintenanceId}/payable`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: { party_type: "supplier", party_name: "Oficina Central", amount: 890.9, due_date: "2026-08-20", issue_date: "2026-07-15" },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.sourceType, "maintenance_order");
    assert.equal(created.body.data.sourceId, maintenanceId);
    assert.equal(created.body.data.amount, 890.9);
  });
});

// ---------------------------------------------------------------------------------------------------
// Harness (memory app) — reseta fuel-logs/maintenance-orders/vehicles/financial-titles entre casos.
// ---------------------------------------------------------------------------------------------------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly financeA: User;
  readonly financeB: User;
};

type ApiContext = { readonly baseUrl: string; readonly seed: SeedData };

async function withApi(callback: (context: ApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFuelLogRuntimeForTests },
    { resetMaintenanceOrderRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/fuel-logs/index.js"),
    import("../src/modules/maintenance-orders/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const { resetFinancialTitleRuntimeForTests } = await loadFinancialTitles();
  resetFinancialTitleRuntimeForTests();
  resetFuelLogRuntimeForTests();
  resetMaintenanceOrderRuntimeForTests();
  resetVehicleRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetFinancialTitleRuntimeForTests();
    resetFuelLogRuntimeForTests();
    resetMaintenanceOrderRuntimeForTests();
    resetVehicleRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Payable A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Payable B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "pay-manager-a@example.com", roles: ["manager"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "pay-finance-a@example.com", roles: ["finance"] });
  const financeB = service.createUser({ tenantId: tenantB.id, name: "Finance B", email: "pay-finance-b@example.com", roles: ["finance"] });
  return { tenantA, tenantB, managerA, financeA, financeB };
}

async function createVehicle(baseUrl: string, tenant: Tenant, user: User, plate: string): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/vehicles", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { plate, model: "Caminhão Guincho" },
  });
  assert.equal(created.status, 201, `vehicle creation failed: ${JSON.stringify(created.body)}`);
  return created.body.data.id as string;
}

async function createFuelLog(baseUrl: string, tenant: Tenant, user: User): Promise<string> {
  const vehicleId = await createVehicle(baseUrl, tenant, user, plate());
  const created = await requestJson(baseUrl, "/api/v1/fuel-logs", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { vehicle_id: vehicleId, liters: 40, total_value: 320.5, odometer: 1000 },
  });
  assert.equal(created.status, 201, `fuel-log creation failed: ${JSON.stringify(created.body)}`);
  return created.body.data.id as string;
}

async function createMaintenance(baseUrl: string, tenant: Tenant, user: User): Promise<string> {
  const vehicleId = await createVehicle(baseUrl, tenant, user, plate());
  const created = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { vehicle_id: vehicleId, type: "preventiva", description: "Troca de óleo e filtros." },
  });
  assert.equal(created.status, 201, `maintenance creation failed: ${JSON.stringify(created.body)}`);
  return created.body.data.id as string;
}

let plateSeq = 0;
function plate(): string {
  plateSeq += 1;
  return `PAY${String(plateSeq).padStart(4, "0")}`;
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
  await new Promise<void>((resolve) => server.once("listening", resolve));
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
