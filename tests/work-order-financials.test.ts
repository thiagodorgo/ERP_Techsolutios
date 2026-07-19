import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3F-3a — Financeiro da OS: congelamento (anti-refaturamento), item manual, total agregado,
// PATCH inline do preço JÁ congelado, delete lógico, idempotência e isolamento (memory).

import {
  createMemoryWorkOrderFinancialService,
  createMemoryWorkOrderInvoicingService,
  getMemoryWorkOrderFinancialRepositoryForTests,
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
import { WorkOrderError } from "../src/modules/work-orders/work-order.types.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";

function actor(tenantId = randomUUID()): WorkOrderFinancialActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: [
      "work_order_financials:read",
      "work_order_financials:create",
      "work_order_financials:update",
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
  return {
    financials: createMemoryWorkOrderFinancialService(),
    workOrders: createMemoryWorkOrderService(),
  };
}

type SeedOptions = {
  readonly serviceCatalogId: string;
  readonly customerId?: string;
  readonly unitPrice: number;
  readonly currency?: string;
  readonly name?: string;
  readonly tableStatus?: "draft" | "published" | "archived";
};

// Semeia uma Tarifa numa Tabela de Valores (published por padrão) nos MESMOS singletons de memória
// que o ApplicableTariffResolver compartilhado consulta (espelho de tests/service-quotes.test.ts).
async function seedTariff(tenantId: string, opts: SeedOptions) {
  const table = await getMemoryPriceTableRepositoryForTests().create({
    tenantId,
    name: `Tabela ${randomUUID()}`,
    currency: opts.currency ?? "BRL",
    version: 1,
    status: opts.tableStatus ?? "published",
  });
  const tariff = await getMemoryTariffRepositoryForTests().create({
    tenantId,
    priceTableId: table.id,
    serviceCatalogId: opts.serviceCatalogId,
    customerId: opts.customerId,
    name: opts.name,
    unitPrice: opts.unitPrice,
    currency: opts.currency ?? "BRL",
    origin: "seed",
    status: "active",
  });
  return { priceTableId: table.id, tariffId: tariff.id };
}

// ---------- Congelamento (invariante-âncora) ----------

test("financeiro: lançar da Tarifa publicada congela unit/total com proveniência (source=tariff)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const serviceCatalogId = randomUUID();
  const { tariffId, priceTableId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 150 });
  const item = await s.financials.create(ctx, wo.id, { service_catalog_id: serviceCatalogId, description: "Guincho leve", quantity: 2 });
  assert.equal(item.unitAmount, 150);
  assert.equal(item.totalAmount, 300);
  assert.equal(item.currency, "BRL");
  assert.equal(item.source, "tariff");
  assert.equal(item.tariffId, tariffId);
  assert.equal(item.priceTableId, priceTableId);
  assert.equal(item.description, "Guincho leve");
});

test("INVARIANTE anti-refaturamento: alterar a Tarifa DEPOIS não muda o item lançado", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100 });
  const item = await s.financials.create(ctx, wo.id, { service_catalog_id: serviceCatalogId, description: "Item", quantity: 2 });
  assert.equal(item.unitAmount, 100);
  assert.equal(item.totalAmount, 200);
  // Muta a Tarifa fonte para 999. O item congelado NÃO pode reagir.
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, unitPrice: 999 });
  const listed = await s.financials.list(ctx, wo.id);
  assert.equal(listed.items[0]!.unitAmount, 100);
  assert.equal(listed.items[0]!.totalAmount, 200);
  assert.equal(listed.totalAmount, 200);
});

test("A1: preço da Tarifa com >2 casas congela arredondado (2 casas)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 33.333 });
  const item = await s.financials.create(ctx, wo.id, { service_catalog_id: serviceCatalogId, description: "Item", quantity: 3 });
  assert.equal(item.unitAmount, 33.33);
  assert.equal(item.totalAmount, 99.99);
});

test("description do corpo prevalece; sem corpo usa o nome da Tarifa; sem ambos → 400 required_description", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const withName = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId: withName, unitPrice: 10, name: "Km rodado" });
  const fromTariffName = await s.financials.create(ctx, wo.id, { service_catalog_id: withName, client_action_id: "a-1" });
  assert.equal(fromTariffName.description, "Km rodado");
  const fromBody = await s.financials.create(ctx, wo.id, { service_catalog_id: withName, description: "Km extra", client_action_id: "a-2" });
  assert.equal(fromBody.description, "Km extra");

  const withoutName = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId: withoutName, unitPrice: 10 });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { service_catalog_id: withoutName }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 400 && e.reason === "required_description",
  );
});

// ---------- Item manual ----------

test("item manual (pedágio): description + unit_amount + notes, sem proveniência de tarifa", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const item = await s.financials.create(ctx, wo.id, {
    source: "manual",
    description: "Pedágio BR-101",
    unit_amount: 12.5,
    quantity: 2,
    notes: "Ida e volta",
  });
  assert.equal(item.source, "manual");
  assert.equal(item.description, "Pedágio BR-101");
  assert.equal(item.unitAmount, 12.5);
  assert.equal(item.totalAmount, 25);
  assert.equal(item.notes, "Ida e volta");
  assert.equal(item.tariffId, undefined);
  assert.equal(item.priceTableId, undefined);
});

test("manual sem unit_amount → 400 required_unit_price; sem description → 400 required_description", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio" }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 400 && e.reason === "required_unit_price",
  );
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "manual", unit_amount: 10 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 400 && e.reason === "required_description",
  );
});

test("source inválido → 400 invalid_price_source", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "chute", description: "x", unit_amount: 1 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 400 && e.reason === "invalid_price_source",
  );
});

test("homogeneidade de moeda por OS: 1º item fixa a moeda; divergente → 422 currency_mismatch (achado J-Ω3F-3A)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  // 1º item fixa BRL.
  const brl = await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 10, currency: "BRL" });
  assert.equal(brl.currency, "BRL");
  // 2º item em moeda diferente na MESMA OS → 422 (o total agregado seria sem sentido).
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "manual", description: "Toll", unit_amount: 5, currency: "USD" }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "currency_mismatch",
  );
  // Mesma moeda → segue aceitando (o agregado permanece single-currency).
  const brl2 = await s.financials.create(ctx, wo.id, { source: "manual", description: "Estacionamento", unit_amount: 8, currency: "BRL" });
  assert.equal(brl2.currency, "BRL");
});

// ---------- Quantidade / teto Decimal(12,2) ----------

test("quantity=0 e negativa → 400 invalid_quantity (precedente do orçamento, NÃO 422)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  for (const quantity of [0, -2]) {
    await assert.rejects(
      () => s.financials.create(ctx, wo.id, { source: "manual", description: "x", unit_amount: 10, quantity }),
      (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 400 && e.reason === "invalid_quantity",
    );
  }
});

test("total acima do teto Decimal(12,2) → 422 financial_total_overflow", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "manual", description: "x", unit_amount: 9999999999.99, quantity: 2 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "financial_total_overflow",
  );
});

test("quantity acima do teto Decimal(12,2) → 422 (não 500), mesmo com total baixo", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "manual", description: "x", unit_amount: 0.01, quantity: 100000000000 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "financial_total_overflow",
  );
});

// ---------- Tarifa não aplicável ----------

test("sem tarifa aplicável (source=tariff) → 422 tariff_not_found_for_service", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { service_catalog_id: randomUUID(), description: "x" }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

test("tarifa em tabela NÃO publicada (draft) não é aplicável → 422", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100, tableStatus: "draft" });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { service_catalog_id: serviceCatalogId, description: "x" }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

// ---------- Isolamento ----------

test("isolamento: tarifa existente SÓ em outro tenant é invisível → 422 (nunca vaza cross-tenant)", async () => {
  const s = setup();
  const owner = actor();
  const intruder = actor();
  const serviceCatalogId = randomUUID();
  // A tarifa vive no tenant do owner; a OS e o lançamento são do intruder.
  await seedTariff(owner.tenantId, { serviceCatalogId, unitPrice: 100, name: "Tarifa alheia" });
  const wo = await s.workOrders.create(intruder, { title: "OS" });
  await assert.rejects(
    () => s.financials.create(intruder, wo.id, { service_catalog_id: serviceCatalogId, description: "x" }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

test("isolamento: OS de outro tenant → 404 work_order_not_found (create/list/update)", async () => {
  const s = setup();
  const owner = actor();
  const wo = await s.workOrders.create(owner, { title: "OS" });
  const item = await s.financials.create(owner, wo.id, { source: "manual", description: "x", unit_amount: 10 });
  const intruder = actor();
  await assert.rejects(
    () => s.financials.create(intruder, wo.id, { source: "manual", description: "y", unit_amount: 5 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 404 && e.reason === "work_order_not_found",
  );
  await assert.rejects(
    () => s.financials.list(intruder, wo.id),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 404 && e.reason === "work_order_not_found",
  );
  await assert.rejects(
    () => s.financials.update(intruder, wo.id, item.id, { quantity: 3 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 404 && e.reason === "work_order_not_found",
  );
});

// ---------- Idempotência ----------

test("409 idempotência: replay do mesmo client_action_id → duplicate_financial_item", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-1" });
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-1" }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 409 && e.reason === "duplicate_financial_item",
  );
});

test("idempotência liberada após delete lógico (unique parcial só entre ativos)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const first = await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-2" });
  await s.financials.delete(ctx, wo.id, first.id);
  const second = await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-2" });
  assert.ok(second.id !== first.id);
});

// ---------- Total agregado + delete lógico ----------

test("B1: total agregado soma SÓ itens não-deletados; delete lógico some da lista e do total", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const kept = await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 150.5, quantity: 2 });
  const removedItem = await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 12.25 });
  let listed = await s.financials.list(ctx, wo.id);
  assert.equal(listed.items.length, 2);
  assert.equal(listed.totalAmount, 313.25);
  assert.equal(listed.currency, "BRL");

  const removed = await s.financials.delete(ctx, wo.id, removedItem.id);
  assert.ok(removed.deletedAt);
  listed = await s.financials.list(ctx, wo.id);
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0]!.id, kept.id);
  assert.equal(listed.totalAmount, 301);
});

test("re-delete e PATCH de item deletado → 404 financial_item_not_found", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const item = await s.financials.create(ctx, wo.id, { source: "manual", description: "x", unit_amount: 10 });
  await s.financials.delete(ctx, wo.id, item.id);
  await assert.rejects(
    () => s.financials.delete(ctx, wo.id, item.id),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 404 && e.reason === "financial_item_not_found",
  );
  await assert.rejects(
    () => s.financials.update(ctx, wo.id, item.id, { quantity: 2 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 404 && e.reason === "financial_item_not_found",
  );
});

// ---------- PATCH inline (recompute do congelado) ----------

test("PATCH quantity recomputa total do preço JÁ CONGELADO (não relê a tarifa)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 50 });
  const item = await s.financials.create(ctx, wo.id, { service_catalog_id: serviceCatalogId, description: "Item", quantity: 1 });
  // muda a tarifa: prova que o recompute NÃO a relê
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, unitPrice: 999 });
  const updated = await s.financials.update(ctx, wo.id, item.id, { quantity: 3 });
  assert.equal(updated.unitAmount, 50);
  assert.equal(updated.totalAmount, 150);
});

test("PATCH unit_amount em item MANUAL recomputa total; notes/description editáveis inline", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const item = await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 10, quantity: 2 });
  const updated = await s.financials.update(ctx, wo.id, item.id, { unit_amount: 12.5, description: "Pedágio atualizado", notes: "conferido" });
  assert.equal(updated.unitAmount, 12.5);
  assert.equal(updated.totalAmount, 25);
  assert.equal(updated.description, "Pedágio atualizado");
  assert.equal(updated.notes, "conferido");
});

test("PATCH unit_amount em item de TARIFA → 422 unit_amount_not_editable (preço congelado)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 50 });
  const item = await s.financials.create(ctx, wo.id, { service_catalog_id: serviceCatalogId, description: "Item" });
  await assert.rejects(
    () => s.financials.update(ctx, wo.id, item.id, { unit_amount: 999 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "unit_amount_not_editable",
  );
});

test("PATCH quantity acima do teto → 422 financial_total_overflow (não 500)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const item = await s.financials.create(ctx, wo.id, { source: "manual", description: "x", unit_amount: 0.01 });
  await assert.rejects(
    () => s.financials.update(ctx, wo.id, item.id, { quantity: 100000000000 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "financial_total_overflow",
  );
});

// ---------- Ω4-3 — trava anti-refaturamento do item faturado (D-Ω4-C1) ----------

test("Ω4-3 trava: PATCH e DELETE de item FATURADO → 422 item_invoiced; item não faturado segue editável/removível", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const invoiced = await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 100 });
  const free = await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 20 });
  // Carimba SÓ o primeiro item como faturado (simula o markInvoiced do faturamento).
  const stamped = await getMemoryWorkOrderFinancialRepositoryForTests().markInvoiced({
    tenantId: ctx.tenantId,
    workOrderId: wo.id,
    itemIds: [invoiced.id],
    titleId: randomUUID(),
    invoicedAt: new Date(),
    updatedBy: ctx.userId,
  });
  assert.equal(stamped, 1);

  await assert.rejects(
    () => s.financials.update(ctx, wo.id, invoiced.id, { quantity: 5 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "item_invoiced",
  );
  await assert.rejects(
    () => s.financials.delete(ctx, wo.id, invoiced.id),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "item_invoiced",
  );
  // O item NÃO faturado permanece mutável.
  const patched = await s.financials.update(ctx, wo.id, free.id, { quantity: 2 });
  assert.equal(patched.totalAmount, 40);
  const removed = await s.financials.delete(ctx, wo.id, free.id);
  assert.ok(removed.deletedAt);
});

test("Ω4-3 markInvoiced é idempotente: não re-carimba item já faturado nem toca item deletado", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const a = await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 10 });
  const b = await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 20 });
  const repo = getMemoryWorkOrderFinancialRepositoryForTests();
  const firstTitle = randomUUID();
  assert.equal(await repo.markInvoiced({ tenantId: ctx.tenantId, workOrderId: wo.id, itemIds: [a.id], titleId: firstTitle, invoicedAt: new Date(), updatedBy: ctx.userId }), 1);
  // Re-carimbar A (já faturado) com outro título não conta e não sobrescreve o title_id original.
  assert.equal(await repo.markInvoiced({ tenantId: ctx.tenantId, workOrderId: wo.id, itemIds: [a.id, b.id], titleId: randomUUID(), invoicedAt: new Date(), updatedBy: ctx.userId }), 1);
  const listed = await s.financials.list(ctx, wo.id);
  const stampedA = listed.items.find((item) => item.id === a.id)!;
  assert.equal(stampedA.titleId, firstTitle);
});

test("Ω4-3 listInvoiceable exclui itens já faturados e deletados (fonte do agregado faturável)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const invoiced = await s.financials.create(ctx, wo.id, { source: "manual", description: "Faturado", unit_amount: 100 });
  const deleted = await s.financials.create(ctx, wo.id, { source: "manual", description: "Deletado", unit_amount: 50 });
  const open = await s.financials.create(ctx, wo.id, { source: "manual", description: "Aberto", unit_amount: 30 });
  const repo = getMemoryWorkOrderFinancialRepositoryForTests();
  await repo.markInvoiced({ tenantId: ctx.tenantId, workOrderId: wo.id, itemIds: [invoiced.id], titleId: randomUUID(), invoicedAt: new Date(), updatedBy: ctx.userId });
  await s.financials.delete(ctx, wo.id, deleted.id);
  const invoiceable = await repo.listInvoiceableByWorkOrder(ctx.tenantId, wo.id);
  assert.equal(invoiceable.length, 1);
  assert.equal(invoiceable[0]!.id, open.id);
});

// ---------- P-Ω3F6 Integridade ATÔMICA do cancelamento (terminal-guard + zero atômico + has_invoiced) ----------

// Helper: cancela pelo caminho legítimo (service.cancel não checa permissão — o gate é a rota).
async function cancelWO(
  workOrders: ReturnType<typeof createMemoryWorkOrderService>,
  ctx: WorkOrderFinancialActorContext,
  workOrderId: string,
  financialDecision: "keep" | "keep_unpaid" | "zero",
) {
  return workOrders.cancel(ctx as never, workOrderId, { reason: "cancelado no teste", financial_decision: financialDecision });
}

test("P-Ω3F6-TERMINAL-GUARD: CREATE de item em OS cancelada → 422 work_order_cancelled", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await cancelWO(s.workOrders, ctx, wo.id, "keep");
  await assert.rejects(
    () => s.financials.create(ctx, wo.id, { source: "manual", description: "tardio", unit_amount: 50 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "work_order_cancelled",
  );
});

test("P-Ω3F6-TERMINAL-GUARD: UPDATE de item em OS cancelada → 422 work_order_cancelled", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const item = await s.financials.create(ctx, wo.id, { source: "manual", description: "item", unit_amount: 100 });
  await cancelWO(s.workOrders, ctx, wo.id, "keep"); // keep preserva o item
  await assert.rejects(
    () => s.financials.update(ctx, wo.id, item.id, { quantity: 3 }),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "work_order_cancelled",
  );
});

test("P-Ω3F6-TERMINAL-GUARD: INVOICE de OS cancelada → 422 work_order_cancelled", async () => {
  const s = setup();
  const ctx = actor();
  const invoicing = createMemoryWorkOrderInvoicingService();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "item", unit_amount: 100 });
  await cancelWO(s.workOrders, ctx, wo.id, "keep");
  await assert.rejects(
    () => invoicing.invoice(ctx, wo.id, {}),
    (e: unknown) => e instanceof WorkOrderFinancialError && e.statusCode === 422 && e.reason === "work_order_cancelled",
  );
});

test("P-Ω3F6-ZERO-ATOMICIDADE: cancel(zero) soft-deleta TODOS os itens ativos numa operação (total → 0)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 100 });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 250 });
  const before = await s.financials.list(ctx, wo.id);
  assert.equal(before.totalAmount, 350);
  const cancelled = await cancelWO(s.workOrders, ctx, wo.id, "zero");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.financialCancellationDecision, "zero");
  const after = await s.financials.list(ctx, wo.id);
  assert.equal(after.items.length, 0, "todos os itens ativos foram zerados");
  assert.equal(after.totalAmount, 0, "invariante decision=zero ⇒ total=0");
});

test("P-Ω3F6 (ataque ALTA): cancel(zero) com item FATURADO → 422 has_invoiced_items (não destrói o lastro do Título)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const invoiced = await s.financials.create(ctx, wo.id, { source: "manual", description: "faturado", unit_amount: 300 });
  // Carimba o item como faturado (simula o markInvoiced do faturamento).
  await getMemoryWorkOrderFinancialRepositoryForTests().markInvoiced({
    tenantId: ctx.tenantId,
    workOrderId: wo.id,
    itemIds: [invoiced.id],
    titleId: randomUUID(),
    invoicedAt: new Date(),
    updatedBy: ctx.userId,
  });
  await assert.rejects(
    () => cancelWO(s.workOrders, ctx, wo.id, "zero"),
    (e: unknown) => e instanceof WorkOrderError && e.statusCode === 422 && e.reason === "has_invoiced_items",
  );
  // A OS NÃO foi cancelada e o item faturado segue intacto (nada destruído).
  const after = await s.workOrders.get(ctx, wo.id);
  assert.notEqual(after.status, "cancelled");
  const items = await s.financials.list(ctx, wo.id);
  assert.equal(items.items.length, 1);
  assert.ok(items.items[0]!.invoicedAt != null, "o lastro faturado do Título foi preservado");
});
