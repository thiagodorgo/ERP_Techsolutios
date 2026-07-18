import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// Ω4-3 — Faturamento OS→Título: minta um Título a RECEBER a partir do agregado CONGELADO do Financeiro
// da OS (nunca relê tarifa), idempotente por OS (anti-refaturamento), carimba+trava os itens faturados.

import {
  createMemoryWorkOrderFinancialService,
  createMemoryWorkOrderInvoicingService,
  resetWorkOrderFinancialRuntimeForTests,
} from "../src/modules/work-order-financials/work-order-financial.service.js";
import {
  WorkOrderFinancialError,
  type WorkOrderFinancialActorContext,
} from "../src/modules/work-order-financials/work-order-financial.types.js";
import {
  createMemoryWorkOrderService,
  resetWorkOrderRuntimeForTests,
} from "../src/modules/work-orders/work-order.service.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

function actor(tenantId = randomUUID()): WorkOrderFinancialActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: [
      "work_order_financials:read",
      "work_order_financials:create",
      "work_order_financials:update",
      "financial_titles:read",
      "financial_titles:create",
      "work_orders:read",
      "work_orders:create",
    ],
  };
}

function setup() {
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetWorkOrderFinancialRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
  return {
    financials: createMemoryWorkOrderFinancialService(),
    invoicing: createMemoryWorkOrderInvoicingService(),
    workOrders: createMemoryWorkOrderService(),
    titles: createMemoryFinancialTitleService(),
  };
}

async function seedTariff(tenantId: string, opts: { serviceCatalogId: string; unitPrice: number; currency?: string; name?: string }) {
  const table = await getMemoryPriceTableRepositoryForTests().create({
    tenantId,
    name: `Tabela ${randomUUID()}`,
    currency: opts.currency ?? "BRL",
    version: 1,
    status: "published",
  });
  const tariff = await getMemoryTariffRepositoryForTests().create({
    tenantId,
    priceTableId: table.id,
    serviceCatalogId: opts.serviceCatalogId,
    name: opts.name,
    unitPrice: opts.unitPrice,
    currency: opts.currency ?? "BRL",
    origin: "seed",
    status: "active",
  });
  return { priceTableId: table.id, tariffId: tariff.id };
}

// ---------- Faturar (invariante-âncora) ----------

test("faturar OS com itens → Título receivable: amount = Σ CONGELADA, currency do agregado, work_order_id, competencia derivada; itens carimbados", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS", customerName: "Cliente Alfa" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 150.5, quantity: 2 });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 12.25 });

  const result = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(result.title.direction, "receivable");
  assert.equal(result.title.partyType, "customer");
  assert.equal(result.title.partyName, "Cliente Alfa");
  assert.equal(result.title.amount, 313.25); // 301 + 12.25
  assert.equal(result.totalAmount, 313.25);
  assert.equal(result.title.currency, "BRL");
  assert.equal(result.title.workOrderId, wo.id);
  assert.equal(result.title.status, "open");
  assert.equal(result.title.competencia, deriveCompetencia(new Date()));
  assert.equal(result.invoicedItemCount, 2);

  // Os itens do agregado ganham invoiced_at + title_id.
  const listed = await s.financials.list(ctx, wo.id);
  for (const item of listed.items) {
    assert.ok(item.invoicedAt instanceof Date);
    assert.equal(item.titleId, result.title.id);
  }
});

test("valor NÃO relê tarifa: o Título usa a Σ CONGELADA mesmo que a tarifa mude depois", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100 });
  await s.financials.create(ctx, wo.id, { service_catalog_id: serviceCatalogId, description: "Item", quantity: 2 });
  // Muta a tarifa para 999 DEPOIS do congelamento: o faturamento não pode reagir.
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, unitPrice: 999 });

  const result = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(result.title.amount, 200); // 100 * 2 congelado (não 999)
  assert.equal(result.totalAmount, 200);
});

test("party_name usa fallback neutro quando a OS não tem cliente (NÃO 422)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS sem cliente" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 40 });
  const result = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(result.title.partyName, "Cliente não informado");
  assert.equal(result.title.partyId, undefined);
});

// ---------- Anti-refaturamento (idempotência D-Ω4-C2) ----------

test("anti-refaturamento: faturar 2× a mesma OS → 2º = 409 already_invoiced (só 1 título)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 200 });
  const first = await s.invoicing.invoice(ctx, wo.id, {});
  await assert.rejects(
    () => s.invoicing.invoice(ctx, wo.id, {}),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 409 && e.reason === "already_invoiced",
  );
  // Só existe UM título receivable ativo para a OS.
  const titles = await s.titles.list(ctx, { direction: "receivable" });
  assert.equal(titles.total, 1);
  assert.equal(titles.items[0]!.id, first.title.id);
});

test("paridade InMemory: a InMemory de títulos simula o índice PARCIAL (rejeita 2º receivable ativo da OS)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Item", unit_amount: 50 });
  await s.invoicing.invoice(ctx, wo.id, {});
  // Um create direto de título receivable com o mesmo work_order_id (via createForWorkOrder) também bate.
  await assert.rejects(
    () =>
      s.titles.createForWorkOrder(ctx, {
        workOrderId: wo.id,
        direction: "receivable",
        partyType: "customer",
        partyName: "X",
        amount: 10,
        currency: "BRL",
        issueDate: new Date(),
        dueDate: new Date(),
      }),
    (e: unknown) => e instanceof Error && (e as { statusCode?: number }).statusCode === 409,
  );
});

// ---------- Nada a faturar ----------

test("OS sem itens faturáveis → 422 nothing_to_invoice", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS vazia" });
  await assert.rejects(
    () => s.invoicing.invoice(ctx, wo.id, {}),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "nothing_to_invoice",
  );
});

test("OS com itens JÁ faturados mas SEM título ativo (título removido) → 422 nothing_to_invoice", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Item", unit_amount: 30 });
  const result = await s.invoicing.invoice(ctx, wo.id, {});
  // Remove o título (delete lógico) — sem título ATIVO, o pre-check de idempotência não dispara; os itens
  // seguem carimbados, então o agregado faturável fica vazio ⇒ 422 nothing_to_invoice (não 409).
  await s.titles.delete(ctx, result.title.id);
  await assert.rejects(
    () => s.invoicing.invoice(ctx, wo.id, {}),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "nothing_to_invoice",
  );
});

// ---------- Trava dos itens faturados (D-Ω4-C1) ----------

test("trava D-Ω4-C1: PATCH/DELETE de item faturado → 422 item_invoiced; item não faturado segue editável", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const invoiced = await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 100 });
  await s.invoicing.invoice(ctx, wo.id, {});
  // Item novo, lançado DEPOIS do faturamento — fica "a faturar" e permanece editável.
  const fresh = await s.financials.create(ctx, wo.id, { source: "manual", description: "Extra", unit_amount: 20 });

  await assert.rejects(
    () => s.financials.update(ctx, wo.id, invoiced.id, { quantity: 3 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "item_invoiced",
  );
  await assert.rejects(
    () => s.financials.delete(ctx, wo.id, invoiced.id),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "item_invoiced",
  );
  // O item novo (não faturado) segue editável.
  const patched = await s.financials.update(ctx, wo.id, fresh.id, { quantity: 2 });
  assert.equal(patched.totalAmount, 40);
});

// ---------- Chokepoint (competência fechada) ----------

test("chokepoint: faturar em competência fechada → 422 period_closed (propaga do titleService)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Item", unit_amount: 100 });
  // Fecha a competência corrente (issue_date = server now) ANTES de faturar.
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(
    () => s.invoicing.invoice(ctx, wo.id, {}),
    (e: unknown) => e instanceof Error && (e as { reason?: string }).reason === "period_closed" && (e as { statusCode?: number }).statusCode === 422,
  );
});

// ---------- Isolamento ----------

test("cross-tenant: faturar OS de outra organização → 404 work_order_not_found (nada vaza)", async () => {
  const s = setup();
  const owner = actor();
  const intruder = actor();
  const wo = await s.workOrders.create(owner, { title: "OS" });
  await s.financials.create(owner, wo.id, { source: "manual", description: "Item", unit_amount: 100 });
  await assert.rejects(
    () => s.invoicing.invoice(intruder, wo.id, {}),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 404 && e.reason === "work_order_not_found",
  );
});

// ---------- due_date ----------

test("due_date default = hoje + 30 dias quando ausente no corpo", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Item", unit_amount: 100 });
  const before = Date.now();
  const result = await s.invoicing.invoice(ctx, wo.id, {});
  const expected = before + 30 * 24 * 60 * 60 * 1000;
  assert.ok(Math.abs(result.title.dueDate.getTime() - expected) < 5 * 60 * 1000, "due_date ~ hoje+30d");
});

test("due_date do corpo é respeitado", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Item", unit_amount: 100 });
  const result = await s.invoicing.invoice(ctx, wo.id, { due_date: "2026-12-25" });
  assert.equal(new Date(result.title.dueDate).toISOString().slice(0, 10), "2026-12-25");
});

test("due_date inválido no corpo → 400 invalid_due_date", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Item", unit_amount: 100 });
  await assert.rejects(
    () => s.invoicing.invoice(ctx, wo.id, { due_date: "não-é-data" }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 400 && e.reason === "invalid_due_date",
  );
});

// ---------- Rotas + RBAC (financial_titles:create é a autoridade) ----------

test("[rota] finance FATURA → 201 (DTO sem tenant_id, workOrderId setado); replay → 409 already_invoiced", async () => {
  await withInvoicingApi(async ({ baseUrl, seed, createWorkOrder, addManualItem }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    await addManualItem(workOrderId, seed.tenantA, seed.managerA, 250);
    const invoiced = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: {},
    });
    assert.equal(invoiced.status, 201);
    assert.equal(invoiced.body.data.direction, "receivable");
    assert.equal(invoiced.body.data.amount, 250);
    assert.equal(invoiced.body.data.workOrderId, workOrderId);
    assert.equal(invoiced.body.data.tenantId, undefined);
    assert.equal(invoiced.body.data.tenant_id, undefined);
    assert.equal(invoiced.body.invoicedTotal, 250);
    assert.equal(invoiced.body.invoicedItemCount, 1);

    const replay = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: {},
    });
    assert.equal(replay.status, 409);
    assert.equal(replay.body.error.reason, "already_invoiced");
  });
});

test("[rota][RBAC] sem financial_titles:create (manager/viewer) → 403; sem headers → 403", async () => {
  await withInvoicingApi(async ({ baseUrl, seed, createWorkOrder, addManualItem }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    await addManualItem(workOrderId, seed.tenantA, seed.managerA, 100);
    const asManager = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {},
    });
    const asViewer = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: {},
    });
    const anon = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, { method: "POST", body: {} });
    assert.equal(asManager.status, 403);
    assert.equal(asViewer.status, 403);
    assert.equal(anon.status, 403);
  });
});

test("[rota] OS sem itens faturáveis → 422 nothing_to_invoice", async () => {
  await withInvoicingApi(async ({ baseUrl, seed, createWorkOrder }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    const res = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: {},
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "nothing_to_invoice");
  });
});

// ---------- harness (espelho de tests/work-order-financials-routes.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly managerA: User;
  readonly financeA: User;
  readonly viewerA: User;
};

type InvoicingApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly createWorkOrder: (tenant: Tenant, user: User) => Promise<string>;
  readonly addManualItem: (workOrderId: string, tenant: Tenant, user: User, unitAmount: number) => Promise<void>;
};

async function withInvoicingApi(callback: (context: InvoicingApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetWorkOrderFinancialRuntimeForTests();
  resetFinancialTitleRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const createWorkOrder = async (tenant: Tenant, user: User): Promise<string> => {
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(tenant, user, "manager"),
      body: { title: `OS Faturamento ${randomUUID()}`, customerName: "Cliente Alfa" },
    });
    assert.equal(created.status, 201);
    return created.body.data.id as string;
  };

  const addManualItem = async (workOrderId: string, tenant: Tenant, user: User, unitAmount: number): Promise<void> => {
    const res = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/financial-items`, {
      method: "POST",
      headers: authHeaders(tenant, user, "manager"),
      body: { source: "manual", description: "Serviço", unit_amount: unitAmount },
    });
    assert.equal(res.status, 201);
  };

  try {
    await callback({ baseUrl, seed, createWorkOrder, addManualItem });
  } finally {
    await closeServer(server);
    resetPriceTableRuntimeForTests();
    resetTariffRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetWorkOrderFinancialRuntimeForTests();
    resetFinancialTitleRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Invoicing A", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "invoicing-manager-a@example.com", roles: ["manager"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "invoicing-finance-a@example.com", roles: ["finance"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "invoicing-viewer-a@example.com", roles: ["viewer"] });
  return { tenantA, managerA, financeA, viewerA };
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
