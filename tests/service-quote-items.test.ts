import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3F-4a — Itens do Orçamento: congelamento (anti-refaturamento), item manual, total agregado,
// PATCH inline do preço JÁ congelado, delete lógico, idempotência, isolamento e a REGRA NOVA
// (itens só em orçamento draft) — memory.

import {
  createMemoryServiceQuoteItemService,
  resetServiceQuoteItemRuntimeForTests,
} from "../src/modules/service-quote-items/service-quote-item.service.js";
import {
  ServiceQuoteItemError,
  type ServiceQuoteItemActorContext,
} from "../src/modules/service-quote-items/service-quote-item.types.js";
import {
  createMemoryServiceQuoteService,
  resetServiceQuoteRuntimeForTests,
} from "../src/modules/service-quotes/service-quote.service.js";
import type { ServiceQuoteActorContext } from "../src/modules/service-quotes/service-quote.types.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";

function actor(tenantId = randomUUID()): ServiceQuoteItemActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["service_quotes:read", "service_quotes:create", "service_quotes:update"],
  };
}

function setup() {
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetServiceQuoteRuntimeForTests();
  resetServiceQuoteItemRuntimeForTests();
  return {
    items: createMemoryServiceQuoteItemService(),
    quotes: createMemoryServiceQuoteService(),
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
// que o ApplicableTariffResolver compartilhado consulta (espelho de tests/work-order-financials.test.ts).
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

// Cria um orçamento-pai em `draft` (container dos itens). Usa preço manual só para materializar o
// cabeçalho — o congelamento dos ITENS é o que este bloco exercita.
async function createQuote(
  quotes: ReturnType<typeof createMemoryServiceQuoteService>,
  ctx: ServiceQuoteActorContext,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const quote = await quotes.create(ctx, {
    service_catalog_id: randomUUID(),
    price_source: "manual",
    unit_price: 1,
    ...overrides,
  });
  return quote.id;
}

// ---------- Congelamento (invariante-âncora) ----------

test("item: lançar da Tarifa publicada congela unit/total com proveniência (source=tariff)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const serviceCatalogId = randomUUID();
  const { tariffId, priceTableId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 150 });
  const item = await s.items.create(ctx, quoteId, { service_catalog_id: serviceCatalogId, description: "Guincho leve", quantity: 2 });
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
  const quoteId = await createQuote(s.quotes, ctx);
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100 });
  const item = await s.items.create(ctx, quoteId, { service_catalog_id: serviceCatalogId, description: "Item", quantity: 2 });
  assert.equal(item.unitAmount, 100);
  assert.equal(item.totalAmount, 200);
  // Muta a Tarifa fonte para 999. O item congelado NÃO pode reagir.
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, unitPrice: 999 });
  const listed = await s.items.list(ctx, quoteId);
  assert.equal(listed.items[0]!.unitAmount, 100);
  assert.equal(listed.items[0]!.totalAmount, 200);
  assert.equal(listed.totalAmount, 200);
});

test("A1: preço da Tarifa com >2 casas congela arredondado (2 casas)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 33.333 });
  const item = await s.items.create(ctx, quoteId, { service_catalog_id: serviceCatalogId, description: "Item", quantity: 3 });
  assert.equal(item.unitAmount, 33.33);
  assert.equal(item.totalAmount, 99.99);
});

test("description do corpo prevalece; sem corpo usa o nome da Tarifa; sem ambos → 400 required_description", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const withName = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId: withName, unitPrice: 10, name: "Km rodado" });
  const fromTariffName = await s.items.create(ctx, quoteId, { service_catalog_id: withName, client_action_id: "a-1" });
  assert.equal(fromTariffName.description, "Km rodado");
  const fromBody = await s.items.create(ctx, quoteId, { service_catalog_id: withName, description: "Km extra", client_action_id: "a-2" });
  assert.equal(fromBody.description, "Km extra");

  const withoutName = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId: withoutName, unitPrice: 10 });
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { service_catalog_id: withoutName }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 400 && e.reason === "required_description",
  );
});

// ---------- Item manual ----------

test("item manual (pedágio): description + unit_amount + notes, sem proveniência de tarifa", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const item = await s.items.create(ctx, quoteId, {
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
  const quoteId = await createQuote(s.quotes, ctx);
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio" }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 400 && e.reason === "required_unit_price",
  );
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "manual", unit_amount: 10 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 400 && e.reason === "required_description",
  );
});

test("source inválido → 400 invalid_price_source", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "chute", description: "x", unit_amount: 1 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 400 && e.reason === "invalid_price_source",
  );
});

test("homogeneidade de moeda por orçamento: 1º item fixa a moeda; divergente → 422 currency_mismatch (achado J-Ω3F-3A)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  // 1º item fixa BRL.
  const brl = await s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio", unit_amount: 10, currency: "BRL" });
  assert.equal(brl.currency, "BRL");
  // 2º item em moeda diferente no MESMO orçamento → 422 (o total agregado seria sem sentido).
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "manual", description: "Toll", unit_amount: 5, currency: "USD" }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "currency_mismatch",
  );
  // Mesma moeda → segue aceitando (o agregado permanece single-currency).
  const brl2 = await s.items.create(ctx, quoteId, { source: "manual", description: "Estacionamento", unit_amount: 8, currency: "BRL" });
  assert.equal(brl2.currency, "BRL");
});

// ---------- Quantidade / teto Decimal(12,2) ----------

test("quantity=0 e negativa → 400 invalid_quantity (precedente do orçamento, NÃO 422)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  for (const quantity of [0, -2]) {
    await assert.rejects(
      () => s.items.create(ctx, quoteId, { source: "manual", description: "x", unit_amount: 10, quantity }),
      (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 400 && e.reason === "invalid_quantity",
    );
  }
});

test("total acima do teto Decimal(12,2) → 422 quote_item_total_overflow", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "manual", description: "x", unit_amount: 9999999999.99, quantity: 2 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "quote_item_total_overflow",
  );
});

test("quantity acima do teto Decimal(12,2) → 422 (não 500), mesmo com total baixo", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "manual", description: "x", unit_amount: 0.01, quantity: 100000000000 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "quote_item_total_overflow",
  );
});

// ---------- Tarifa não aplicável ----------

test("sem tarifa aplicável (source=tariff) → 422 tariff_not_found_for_service", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { service_catalog_id: randomUUID(), description: "x" }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

test("tarifa em tabela NÃO publicada (draft) não é aplicável → 422", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100, tableStatus: "draft" });
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { service_catalog_id: serviceCatalogId, description: "x" }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

// ---------- Isolamento ----------

test("isolamento: tarifa existente SÓ em outro tenant é invisível → 422 (nunca vaza cross-tenant)", async () => {
  const s = setup();
  const owner = actor();
  const intruder = actor();
  const serviceCatalogId = randomUUID();
  // A tarifa vive no tenant do owner; o orçamento e o lançamento são do intruder.
  await seedTariff(owner.tenantId, { serviceCatalogId, unitPrice: 100, name: "Tarifa alheia" });
  const quoteId = await createQuote(s.quotes, intruder);
  await assert.rejects(
    () => s.items.create(intruder, quoteId, { service_catalog_id: serviceCatalogId, description: "x" }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

test("isolamento: orçamento de outro tenant → 404 quote_not_found (create/list/update)", async () => {
  const s = setup();
  const owner = actor();
  const quoteId = await createQuote(s.quotes, owner);
  const item = await s.items.create(owner, quoteId, { source: "manual", description: "x", unit_amount: 10 });
  const intruder = actor();
  await assert.rejects(
    () => s.items.create(intruder, quoteId, { source: "manual", description: "y", unit_amount: 5 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 404 && e.reason === "quote_not_found",
  );
  await assert.rejects(
    () => s.items.list(intruder, quoteId),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 404 && e.reason === "quote_not_found",
  );
  await assert.rejects(
    () => s.items.update(intruder, quoteId, item.id, { quantity: 3 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 404 && e.reason === "quote_not_found",
  );
});

// ---------- REGRA NOVA: item só em orçamento draft ----------

test("REGRA NOVA: criar/editar/deletar item em orçamento NÃO-draft → 422 quote_not_editable", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  // Lança um item enquanto draft, depois aprova o orçamento.
  const item = await s.items.create(ctx, quoteId, { source: "manual", description: "x", unit_amount: 10 });
  await s.quotes.updateStatus(ctx, quoteId, { status: "approved" });
  // create → 422
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "manual", description: "y", unit_amount: 5 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "quote_not_editable",
  );
  // update → 422
  await assert.rejects(
    () => s.items.update(ctx, quoteId, item.id, { quantity: 2 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "quote_not_editable",
  );
  // delete → 422
  await assert.rejects(
    () => s.items.delete(ctx, quoteId, item.id),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "quote_not_editable",
  );
  // list segue permitida (leitura não exige draft).
  const listed = await s.items.list(ctx, quoteId);
  assert.equal(listed.items.length, 1);
});

// ---------- Idempotência ----------

test("409 idempotência: replay do mesmo client_action_id → duplicate_quote_item", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  await s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-1" });
  await assert.rejects(
    () => s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-1" }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 409 && e.reason === "duplicate_quote_item",
  );
});

test("idempotência liberada após delete lógico (unique parcial só entre ativos)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const first = await s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-2" });
  await s.items.delete(ctx, quoteId, first.id);
  const second = await s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-2" });
  assert.ok(second.id !== first.id);
});

// ---------- Total agregado + delete lógico ----------

test("B1: total agregado soma SÓ itens não-deletados; delete lógico some da lista e do total", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const kept = await s.items.create(ctx, quoteId, { source: "manual", description: "Guincho", unit_amount: 150.5, quantity: 2 });
  const removedItem = await s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio", unit_amount: 12.25 });
  let listed = await s.items.list(ctx, quoteId);
  assert.equal(listed.items.length, 2);
  assert.equal(listed.totalAmount, 313.25);
  assert.equal(listed.currency, "BRL");

  const removed = await s.items.delete(ctx, quoteId, removedItem.id);
  assert.ok(removed.deletedAt);
  listed = await s.items.list(ctx, quoteId);
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0]!.id, kept.id);
  assert.equal(listed.totalAmount, 301);
});

test("re-delete e PATCH de item deletado → 404 quote_item_not_found", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const item = await s.items.create(ctx, quoteId, { source: "manual", description: "x", unit_amount: 10 });
  await s.items.delete(ctx, quoteId, item.id);
  await assert.rejects(
    () => s.items.delete(ctx, quoteId, item.id),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 404 && e.reason === "quote_item_not_found",
  );
  await assert.rejects(
    () => s.items.update(ctx, quoteId, item.id, { quantity: 2 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 404 && e.reason === "quote_item_not_found",
  );
});

// ---------- PATCH inline (recompute do congelado) ----------

test("PATCH quantity recomputa total do preço JÁ CONGELADO (não relê a tarifa)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 50 });
  const item = await s.items.create(ctx, quoteId, { service_catalog_id: serviceCatalogId, description: "Item", quantity: 1 });
  // muda a tarifa: prova que o recompute NÃO a relê
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, unitPrice: 999 });
  const updated = await s.items.update(ctx, quoteId, item.id, { quantity: 3 });
  assert.equal(updated.unitAmount, 50);
  assert.equal(updated.totalAmount, 150);
});

test("PATCH unit_amount em item MANUAL recomputa total; notes/description editáveis inline", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const item = await s.items.create(ctx, quoteId, { source: "manual", description: "Pedágio", unit_amount: 10, quantity: 2 });
  const updated = await s.items.update(ctx, quoteId, item.id, { unit_amount: 12.5, description: "Pedágio atualizado", notes: "conferido" });
  assert.equal(updated.unitAmount, 12.5);
  assert.equal(updated.totalAmount, 25);
  assert.equal(updated.description, "Pedágio atualizado");
  assert.equal(updated.notes, "conferido");
});

test("PATCH unit_amount em item de TARIFA → 422 unit_amount_not_editable (preço congelado)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 50 });
  const item = await s.items.create(ctx, quoteId, { service_catalog_id: serviceCatalogId, description: "Item" });
  await assert.rejects(
    () => s.items.update(ctx, quoteId, item.id, { unit_amount: 999 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "unit_amount_not_editable",
  );
});

test("PATCH quantity acima do teto → 422 quote_item_total_overflow (não 500)", async () => {
  const s = setup();
  const ctx = actor();
  const quoteId = await createQuote(s.quotes, ctx);
  const item = await s.items.create(ctx, quoteId, { source: "manual", description: "x", unit_amount: 0.01 });
  await assert.rejects(
    () => s.items.update(ctx, quoteId, item.id, { quantity: 100000000000 }),
    (e: unknown) => e instanceof ServiceQuoteItemError && e.statusCode === 422 && e.reason === "quote_item_total_overflow",
  );
});
