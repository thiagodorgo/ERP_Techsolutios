import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryServiceQuoteService,
  resetServiceQuoteRuntimeForTests,
} from "../src/modules/service-quotes/service-quote.service.js";
import { toServiceQuoteListDto } from "../src/modules/service-quotes/service-quote.dto.js";
import {
  ServiceQuoteError,
  type ServiceQuoteActorContext,
} from "../src/modules/service-quotes/service-quote.types.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";

function actor(tenantId = randomUUID()): ServiceQuoteActorContext {
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
  return createMemoryServiceQuoteService();
}

type SeedOptions = {
  readonly serviceCatalogId: string;
  readonly customerId?: string;
  readonly unitPrice: number;
  readonly currency?: string;
  readonly tableStatus?: "draft" | "published" | "archived";
  readonly validFrom?: Date;
  readonly validTo?: Date;
};

// Semeia uma Tarifa dentro de uma Tabela de Valores (published por padrão) diretamente nos repos de
// memória (mesmos singletons que o resolver do quote consulta). Retorna os ids gerados.
async function seedTariff(tenantId: string, opts: SeedOptions) {
  const priceTableRepo = getMemoryPriceTableRepositoryForTests();
  const tariffRepo = getMemoryTariffRepositoryForTests();
  const table = await priceTableRepo.create({
    tenantId,
    name: `Tabela ${randomUUID()}`,
    currency: opts.currency ?? "BRL",
    version: 1,
    status: opts.tableStatus ?? "published",
  });
  const tariff = await tariffRepo.create({
    tenantId,
    priceTableId: table.id,
    serviceCatalogId: opts.serviceCatalogId,
    customerId: opts.customerId,
    unitPrice: opts.unitPrice,
    currency: opts.currency ?? "BRL",
    origin: "seed",
    status: "active",
    validFrom: opts.validFrom,
    validTo: opts.validTo,
  });
  return { priceTableId: table.id, tariffId: tariff.id, tariff };
}

// ---------- Congelamento (invariante-âncora) ----------

test("congela unit_price da Tarifa publicada (source=tariff, status draft)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  const { tariffId, priceTableId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 150 });
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId });
  assert.equal(quote.frozenUnitPrice, 150);
  assert.equal(quote.frozenCurrency, "BRL");
  assert.equal(quote.priceSource, "tariff");
  assert.equal(quote.status, "draft");
  assert.equal(quote.sourceTariffId, tariffId);
  assert.equal(quote.sourcePriceTableId, priceTableId);
  assert.equal(quote.frozenTotal, 150);
});

test("INVARIANTE #1: alterar a Tarifa DEPOIS não muda o preço congelado", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100 });
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, quantity: 2 });
  assert.equal(quote.frozenUnitPrice, 100);
  assert.equal(quote.frozenTotal, 200);
  // Muta a Tarifa fonte para 999 (novo preço). O quote NÃO pode reagir.
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, unitPrice: 999 });
  const again = await svc.get(ctx, quote.id);
  assert.equal(again.frozenUnitPrice, 100);
  assert.equal(again.frozenTotal, 200);
});

test("INVARIANTE #2: desativar a Tarifa fonte não muda quote já congelado", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 77 });
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId });
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, isActive: false });
  const again = await svc.get(ctx, quote.id);
  assert.equal(again.frozenUnitPrice, 77);
});

test("A1: preço da Tarifa com >2 casas congela arredondado (2 casas)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 33.333 });
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, quantity: 3 });
  assert.equal(quote.frozenUnitPrice, 33.33);
  assert.equal(quote.frozenTotal, 99.99);
});

test("A2: cliente-específico vence a tarifa padrão (customer NULL)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  const customerId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100 }); // padrão
  await seedTariff(ctx.tenantId, { serviceCatalogId, customerId, unitPrice: 90 }); // cliente
  const specific = await svc.create(ctx, { service_catalog_id: serviceCatalogId, customer_id: customerId });
  assert.equal(specific.frozenUnitPrice, 90);
  const defaultQuote = await svc.create(ctx, { work_order_id: randomUUID(), service_catalog_id: serviceCatalogId });
  assert.equal(defaultQuote.frozenUnitPrice, 100);
});

test("A2: desempate determinístico entre 2 tarifas padrão concorrentes (maior valid_from vence)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100, validFrom: new Date("2026-01-01T00:00:00Z") });
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 120, validFrom: new Date("2026-06-01T00:00:00Z") });
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId });
  assert.equal(quote.frozenUnitPrice, 120);
});

test("tarifa em tabela NÃO publicada (draft) não é aplicável → 422", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100, tableStatus: "draft" });
  await assert.rejects(
    () => svc.create(ctx, { service_catalog_id: serviceCatalogId }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

test("sem tarifa aplicável + source=tariff → 422 tariff_not_found_for_service", async () => {
  const svc = setup();
  const ctx = actor();
  await assert.rejects(
    () => svc.create(ctx, { service_catalog_id: randomUUID() }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "tariff_not_found_for_service",
  );
});

test("tarifa com validTo no passado não é aplicável → 422", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100, validTo: new Date("2020-01-01T00:00:00Z") });
  await assert.rejects(
    () => svc.create(ctx, { service_catalog_id: serviceCatalogId }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422,
  );
});

test("tarifa com validFrom no futuro não é aplicável → 422", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 100, validFrom: new Date("2999-01-01T00:00:00Z") });
  await assert.rejects(
    () => svc.create(ctx, { service_catalog_id: serviceCatalogId }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422,
  );
});

// ---------- Preço manual ----------

test("source=manual congela unitPrice informado sem source_tariff_id", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, {
    service_catalog_id: randomUUID(),
    price_source: "manual",
    unit_price: 42.5,
    quantity: 4,
  });
  assert.equal(quote.priceSource, "manual");
  assert.equal(quote.frozenUnitPrice, 42.5);
  assert.equal(quote.frozenTotal, 170);
  assert.equal(quote.sourceTariffId, undefined);
  assert.equal(quote.sourcePriceTableId, undefined);
});

test("source=manual sem unit_price → 400 required_unit_price", async () => {
  const svc = setup();
  await assert.rejects(
    () => svc.create(actor(), { service_catalog_id: randomUUID(), price_source: "manual" }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 400 && e.reason === "required_unit_price",
  );
});

test("price_source inválido → 400", async () => {
  const svc = setup();
  await assert.rejects(
    () => svc.create(actor(), { service_catalog_id: randomUUID(), price_source: "chute" }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 400 && e.reason === "invalid_price_source",
  );
});

// ---------- Quantidade / total ----------

test("A4: quantity=0 → 400 invalid_quantity", async () => {
  const svc = setup();
  await assert.rejects(
    () => svc.create(actor(), { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10, quantity: 0 }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 400 && e.reason === "invalid_quantity",
  );
});

test("A4: quantity negativa → 400 invalid_quantity", async () => {
  const svc = setup();
  await assert.rejects(
    () => svc.create(actor(), { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10, quantity: -2 }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 400 && e.reason === "invalid_quantity",
  );
});

test("A3: frozen_total acima do teto Decimal(12,2) → 422 quote_total_overflow", async () => {
  const svc = setup();
  await assert.rejects(
    () => svc.create(actor(), { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 9999999999.99, quantity: 2 }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "quote_total_overflow",
  );
});

// Achado validador-mestre — quantity é Decimal(12,2); acima do teto estouraria o numeric no Postgres
// (500) mesmo com o total baixo. Guard garante 422 e paridade InMemory×Prisma.
test("quantity acima do teto Decimal(12,2) → 422 (não 500), mesmo com total baixo", async () => {
  const svc = setup();
  await assert.rejects(
    () => svc.create(actor(), { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 0.01, quantity: 100000000000 }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "quote_total_overflow",
  );
});

test("PATCH quantity acima do teto em draft → 422 (não 500)", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 0.01 });
  await assert.rejects(
    () => svc.update(ctx, quote.id, { quantity: 100000000000 }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "quote_total_overflow",
  );
});

// ---------- Edição em draft ----------

test("PATCH quantidade em draft recomputa frozen_total do preço JÁ congelado (não relê tarifa)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  const { tariffId } = await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 50 });
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, quantity: 1 });
  // muda a tarifa: prova que o recompute NÃO a relê
  await getMemoryTariffRepositoryForTests().update({ tenantId: ctx.tenantId, tariffId, unitPrice: 999 });
  const updated = await svc.update(ctx, quote.id, { quantity: 3 });
  assert.equal(updated.frozenUnitPrice, 50);
  assert.equal(updated.frozenTotal, 150);
});

test("PATCH notes em draft atualiza notas", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  const updated = await svc.update(ctx, quote.id, { notes: "Aprovar com o cliente" });
  assert.equal(updated.notes, "Aprovar com o cliente");
});

// ---------- Máquina de estado ----------

test("máquina: draft→approved→void; approved imutável ao editar quantidade → 422 quote_not_editable", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  const approved = await svc.updateStatus(ctx, quote.id, { status: "approved" });
  assert.equal(approved.status, "approved");
  await assert.rejects(
    () => svc.update(ctx, quote.id, { quantity: 5 }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "quote_not_editable",
  );
  const voided = await svc.updateStatus(ctx, quote.id, { status: "void" });
  assert.equal(voided.status, "void");
  assert.equal(voided.isActive, false);
});

test("máquina: transição inválida (approved→draft) → 422 invalid_status_transition", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await svc.updateStatus(ctx, quote.id, { status: "approved" });
  await assert.rejects(
    () => svc.updateStatus(ctx, quote.id, { status: "draft" }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "invalid_status_transition",
  );
});

test("máquina: draft→rejected permitido", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  const rejected = await svc.updateStatus(ctx, quote.id, { status: "rejected" });
  assert.equal(rejected.status, "rejected");
});

// ---------- Chave natural / duplicidade ----------

test("409 chave natural: quote ativo por (work_order, service); void libera re-orçar", async () => {
  const svc = setup();
  const ctx = actor();
  const workOrderId = randomUUID();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 10 });
  const first = await svc.create(ctx, { work_order_id: workOrderId, service_catalog_id: serviceCatalogId });
  await assert.rejects(
    () => svc.create(ctx, { work_order_id: workOrderId, service_catalog_id: serviceCatalogId }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 409 && e.reason === "duplicate_quote_for_service",
  );
  // void libera
  await svc.updateStatus(ctx, first.id, { status: "void" });
  const reQuoted = await svc.create(ctx, { work_order_id: workOrderId, service_catalog_id: serviceCatalogId });
  assert.ok(reQuoted.id !== first.id);
});

test("orçamentos avulsos (work_order_id NULL) coexistem para o mesmo serviço", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 10 });
  const a = await svc.create(ctx, { service_catalog_id: serviceCatalogId });
  const b = await svc.create(ctx, { service_catalog_id: serviceCatalogId });
  assert.ok(a.id !== b.id);
});

// ---------- Isolamento ----------

test("isolamento: get de outro tenant → 404", async () => {
  const svc = setup();
  const owner = actor();
  const quote = await svc.create(owner, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await assert.rejects(
    () => svc.get(actor(), quote.id),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 404,
  );
});

test("isolamento: update de outro tenant → 404", async () => {
  const svc = setup();
  const owner = actor();
  const quote = await svc.create(owner, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await assert.rejects(
    () => svc.update(actor(), quote.id, { quantity: 2 }),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 404,
  );
});

// ---------- List / DTO (lição B1) ----------

test("list filtra por work_order_id e por status", async () => {
  const svc = setup();
  const ctx = actor();
  const workOrderId = randomUUID();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, unitPrice: 10 });
  await svc.create(ctx, { work_order_id: workOrderId, service_catalog_id: serviceCatalogId });
  await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 5 });
  const byWo = await svc.list(ctx, { work_order_id: workOrderId });
  assert.equal(byWo.items.length, 1);
  const drafts = await svc.list(ctx, { status: "draft" });
  assert.equal(drafts.total, 2);
});

test("B1: list DTO emite dinheiro COM moeda, priceSource e links (workOrderId/customerId)", async () => {
  const svc = setup();
  const ctx = actor();
  const workOrderId = randomUUID();
  const customerId = randomUUID();
  const serviceCatalogId = randomUUID();
  await seedTariff(ctx.tenantId, { serviceCatalogId, customerId, unitPrice: 250, currency: "BRL" });
  await svc.create(ctx, { work_order_id: workOrderId, customer_id: customerId, service_catalog_id: serviceCatalogId, quantity: 2 });
  const dto = toServiceQuoteListDto(await svc.list(ctx, {}));
  assert.equal(dto.items.length, 1);
  const row = dto.items[0]!;
  assert.equal(row.frozenUnitPrice, 250);
  assert.equal(row.frozenCurrency, "BRL");
  assert.equal(row.frozenTotal, 500);
  assert.equal(row.priceSource, "tariff");
  assert.equal(row.workOrderId, workOrderId);
  assert.equal(row.customerId, customerId);
  assert.equal(row.serviceCatalogId, serviceCatalogId);
  assert.equal(typeof row.frozenTotal, "number");
});
