import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3F-4b (D-Ω3F-4B) — aprovar orçamento → cria OS (idempotente) + compartilhar. Backend puro, memory.
// O approve chama o WorkOrderService memory real (createDefaultWorkOrderService), então o catálogo de
// serviço e o cliente precisam existir nos singletons de cadastro para a OS referenciá-los.

import {
  createMemoryServiceQuoteService,
  resetServiceQuoteRuntimeForTests,
} from "../src/modules/service-quotes/service-quote.service.js";
import { toServiceQuoteDto } from "../src/modules/service-quotes/service-quote.dto.js";
import {
  ServiceQuoteError,
  type ServiceQuoteActorContext,
} from "../src/modules/service-quotes/service-quote.types.js";
import {
  getMemoryTariffRepositoryForTests,
  resetTariffRuntimeForTests,
} from "../src/modules/tariffs/tariff.service.js";
import {
  getMemoryPriceTableRepositoryForTests,
  resetPriceTableRuntimeForTests,
} from "../src/modules/price-tables/price-table.service.js";
import {
  createMemoryServiceCatalogService,
  resetServiceCatalogRuntimeForTests,
} from "../src/modules/service-catalog/service-catalog.service.js";
import {
  createMemoryCustomerService,
  resetCustomerRuntimeForTests,
} from "../src/modules/customers/customer.service.js";
import {
  createMemoryWorkOrderService,
  resetWorkOrderRuntimeForTests,
} from "../src/modules/work-orders/work-order.service.js";

function actor(tenantId = randomUUID()): ServiceQuoteActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["service_quotes:read", "service_quotes:create", "service_quotes:update", "service_quotes:approve"],
  };
}

function setup() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetServiceQuoteRuntimeForTests();
  resetServiceCatalogRuntimeForTests();
  resetCustomerRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  return createMemoryServiceQuoteService();
}

async function seedServiceCatalog(ctx: ServiceQuoteActorContext): Promise<string> {
  const service = createMemoryServiceCatalogService();
  const created = await service.create(ctx, { name: `Serviço ${randomUUID()}` });
  return created.id;
}

async function seedCustomer(ctx: ServiceQuoteActorContext): Promise<string> {
  const service = createMemoryCustomerService();
  const created = await service.create(ctx, { name: `Cliente ${randomUUID()}` });
  return created.id;
}

async function seedTariff(tenantId: string, serviceCatalogId: string, unitPrice: number): Promise<void> {
  const table = await getMemoryPriceTableRepositoryForTests().create({
    tenantId,
    name: `Tabela ${randomUUID()}`,
    currency: "BRL",
    version: 1,
    status: "published",
  });
  await getMemoryTariffRepositoryForTests().create({
    tenantId,
    priceTableId: table.id,
    serviceCatalogId,
    unitPrice,
    currency: "BRL",
    origin: "seed",
    status: "active",
  });
}

// ---------- approve → cria OS ----------

test("approve de orçamento draft (tarifa) → cria OS, createdWorkOrderId preenchido, status approved", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  await seedTariff(ctx.tenantId, serviceCatalogId, 150);
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, quantity: 2 });

  const { quote: approved, workOrderId } = await svc.approve(ctx, quote.id, {});
  assert.ok(workOrderId);
  assert.equal(approved.status, "approved");
  assert.equal(approved.createdWorkOrderId, workOrderId);

  // A OS existe no WorkOrderService de memória (mesmo singleton).
  const wo = await createMemoryWorkOrderService().get(ctx, workOrderId);
  assert.equal(wo.id, workOrderId);
  assert.equal(wo.serviceCatalogId, serviceCatalogId);
});

test("CONCORRÊNCIA (condição critico J-Ω3F-4B): dois approve simultâneos → 1 OS + 1×409 (sem OS órfã)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  await seedTariff(ctx.tenantId, serviceCatalogId, 150);
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, quantity: 1 });

  // Duplo-clique/retry: dois approve concorrentes do MESMO orçamento.
  const results = await Promise.allSettled([svc.approve(ctx, quote.id, {}), svc.approve(ctx, quote.id, {})]);
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");
  // Exatamente um vencedor (1 OS) e um 409 — nunca 2 OSs.
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  const err = (rejected[0] as PromiseRejectedResult).reason;
  assert.ok(err instanceof ServiceQuoteError && err.statusCode === 409 && err.reason === "quote_already_approved");

  // Só UMA OS nasceu no tenant (o perdedor NÃO criou OS órfã).
  const wos = await createMemoryWorkOrderService().list(ctx, {});
  assert.equal(wos.items.length, 1);
});

test("approve encaminha a ORIGEM do corpo à OS (condição fid-avaliador J-Ω3F-4B)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  await seedTariff(ctx.tenantId, serviceCatalogId, 150);
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, quantity: 1 });

  const { workOrderId } = await svc.approve(ctx, quote.id, {
    serviceAddress: "Rua da Coleta, 10",
    serviceCity: "Curitiba",
    destinationAddress: "Oficina Central, 200",
    activation_mode: "guincho",
  });
  const wo = await createMemoryWorkOrderService().get(ctx, workOrderId);
  assert.equal(wo.serviceAddress, "Rua da Coleta, 10");
  assert.equal(wo.serviceCity, "Curitiba");
  assert.equal(wo.destinationAddress, "Oficina Central, 200");
});

test("approve de orçamento MANUAL (sem tarifa, cliente+serviço) → SUCESSO (prova skipApplicableTariffCheck)", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  const customerId = await seedCustomer(ctx);
  // Orçamento manual com cliente E serviço, mas SEM tarifa vigente. Sem o skip, a validação #4 daria 422.
  const quote = await svc.create(ctx, {
    service_catalog_id: serviceCatalogId,
    customer_id: customerId,
    price_source: "manual",
    unit_price: 99,
  });
  const { workOrderId } = await svc.approve(ctx, quote.id, {});
  assert.ok(workOrderId);
  const wo = await createMemoryWorkOrderService().get(ctx, workOrderId);
  assert.equal(wo.customerId, customerId);
});

test("approve replay (2ª chamada) → 409 quote_already_approved", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, price_source: "manual", unit_price: 10 });
  await svc.approve(ctx, quote.id, {});
  await assert.rejects(
    () => svc.approve(ctx, quote.id, {}),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 409 && e.reason === "quote_already_approved",
  );
});

test("approve de orçamento rejected → 409 quote_not_approvable", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await svc.updateStatus(ctx, quote.id, { status: "rejected" });
  await assert.rejects(
    () => svc.approve(ctx, quote.id, {}),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 409 && e.reason === "quote_not_approvable",
  );
});

test("approve de orçamento void → 409 quote_not_approvable", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await svc.updateStatus(ctx, quote.id, { status: "void" });
  await assert.rejects(
    () => svc.approve(ctx, quote.id, {}),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 409 && e.reason === "quote_not_approvable",
  );
});

test("approve de orçamento já approved (via status, sem OS) → 409 quote_not_approvable", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await svc.updateStatus(ctx, quote.id, { status: "approved" });
  await assert.rejects(
    () => svc.approve(ctx, quote.id, {}),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 409 && e.reason === "quote_not_approvable",
  );
});

test("approve com valid_until no passado → 422 quote_expired", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  const quote = await svc.create(ctx, {
    service_catalog_id: serviceCatalogId,
    price_source: "manual",
    unit_price: 10,
    valid_until: "2020-01-01T00:00:00Z",
  });
  await assert.rejects(
    () => svc.approve(ctx, quote.id, {}),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "quote_expired",
  );
});

test("approve com frozen_total = 0 (unit_price 0) → 422 quote_empty", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 0 });
  assert.equal(quote.frozenTotal, 0);
  await assert.rejects(
    () => svc.approve(ctx, quote.id, {}),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "quote_empty",
  );
});

test("approve cross-tenant → 404", async () => {
  const svc = setup();
  const owner = actor();
  const serviceCatalogId = await seedServiceCatalog(owner);
  const quote = await svc.create(owner, { service_catalog_id: serviceCatalogId, price_source: "manual", unit_price: 10 });
  await assert.rejects(
    () => svc.approve(actor(), quote.id, {}),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 404,
  );
});

test("approve grava activation_mode no service_details da OS criada", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, price_source: "manual", unit_price: 10 });
  const { workOrderId } = await svc.approve(ctx, quote.id, { activation_mode: "aplicativo" });
  const wo = await createMemoryWorkOrderService().get(ctx, workOrderId);
  assert.equal(wo.serviceDetails?.activation_mode, "aplicativo");
});

// ---------- share ----------

test("share gera token; 2ª chamada reusa (idempotente); token NÃO aparece no DTO normal", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  const first = await svc.share(ctx, quote.id);
  assert.ok(first.shareToken);
  assert.equal(first.sharePath, `/orcamentos/compartilhado/${first.shareToken}`);
  const second = await svc.share(ctx, quote.id);
  assert.equal(second.shareToken, first.shareToken);

  // §2.8 — o token NUNCA vaza no DTO normal do orçamento.
  const dto = toServiceQuoteDto(await svc.get(ctx, quote.id)) as Record<string, unknown>;
  assert.equal("shareToken" in dto, false);
  assert.equal(JSON.stringify(dto).includes(first.shareToken), false);
});

test("share de orçamento void → 422 quote_not_shareable", async () => {
  const svc = setup();
  const ctx = actor();
  const quote = await svc.create(ctx, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await svc.updateStatus(ctx, quote.id, { status: "void" });
  await assert.rejects(
    () => svc.share(ctx, quote.id),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 422 && e.reason === "quote_not_shareable",
  );
});

test("share cross-tenant → 404", async () => {
  const svc = setup();
  const owner = actor();
  const quote = await svc.create(owner, { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 });
  await assert.rejects(
    () => svc.share(actor(), quote.id),
    (e: unknown) => e instanceof ServiceQuoteError && e.statusCode === 404,
  );
});

// ---------- cabeçalho editável (Ω3F-4a) ----------

test("PATCH em draft edita number/valid_until; approve usa o number no título default", async () => {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedServiceCatalog(ctx);
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, price_source: "manual", unit_price: 10 });
  const updated = await svc.update(ctx, quote.id, { number: "ORC-2026-001" });
  assert.equal(updated.number, "ORC-2026-001");
  const { workOrderId } = await svc.approve(ctx, quote.id, {});
  const wo = await createMemoryWorkOrderService().get(ctx, workOrderId);
  assert.equal(wo.title, "OS do orçamento ORC-2026-001");
});
