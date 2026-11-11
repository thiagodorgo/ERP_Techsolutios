import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-SAN3-08 (item 40 do portão), P1 — paridade do corpo. Liga as duas pontas: o corpo que a WEB monta
// (`buildServiceQuoteApproveBody`, modelo puro do front) é passado ao `ServiceQuoteService.approve` REAL do backend (memória),
// que chama o `WorkOrderService.create` real com a regra "reboque exige destino" (`work-order.service.ts:810-816`).
// Molde: `tests/checklist-editor-classifier-parity.test.ts` (o teste da raiz importa o modelo puro do front).
//
// Vermelho-controle registrado no diário `docs/revisoes/SAN3/B-SAN3-08-dev.md` (F0): com o builder copiado do mapeamento de
// hoje (snake_case, `service-quotes.service.ts:111-121`), [P1] e [P1-pino] recebem `422 destination_required`.

import { buildServiceQuoteApproveBody } from "../frontend/src/modules/registry/service-quotes/service-quote-approve.model.js";
import {
  createMemoryServiceQuoteService,
  resetServiceQuoteRuntimeForTests,
} from "../src/modules/service-quotes/service-quote.service.js";
import type { ServiceQuoteActorContext } from "../src/modules/service-quotes/service-quote.types.js";
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
import { resetCustomerRuntimeForTests } from "../src/modules/customers/customer.service.js";
import {
  createMemoryWorkOrderService,
  resetWorkOrderRuntimeForTests,
} from "../src/modules/work-orders/work-order.service.js";

function actor(): ServiceQuoteActorContext {
  return {
    tenantId: randomUUID(),
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

// Serviço de reboque: o catálogo marca `requires_destination: true` (a OS só nasce com destino real).
async function seedTowService(ctx: ServiceQuoteActorContext): Promise<string> {
  const created = await createMemoryServiceCatalogService().create(ctx, {
    name: `Reboque ${randomUUID()}`,
    requires_destination: true,
  });
  assert.equal(created.requiresDestination, true, "o serviço semeado exige destino");
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

async function draftTowQuote() {
  const svc = setup();
  const ctx = actor();
  const serviceCatalogId = await seedTowService(ctx);
  await seedTariff(ctx.tenantId, serviceCatalogId, 380);
  const quote = await svc.create(ctx, { service_catalog_id: serviceCatalogId, quantity: 1 });
  return { svc, ctx, quote };
}

function describeError(error: unknown): string {
  const e = error as { statusCode?: number; reason?: string; message?: string };
  return `${e.statusCode ?? "?"}:${e.reason ?? e.message ?? String(error)}`;
}

test("[P1] o corpo da web cria a OS com o destino, a origem e o modo de acionamento", async () => {
  const { svc, ctx, quote } = await draftTowQuote();
  const body = buildServiceQuoteApproveBody({
    destinationAddress: "Oficina Central, 200",
    serviceAddress: "Rua da Coleta, 10",
    activationMode: "guincho",
  });

  let result: Awaited<ReturnType<typeof svc.approve>>;
  try {
    result = await svc.approve(ctx, quote.id, body);
  } catch (error) {
    assert.fail(`o approve recusou o corpo da web: ${describeError(error)} · corpo=${JSON.stringify(body)}`);
  }
  const wo = await createMemoryWorkOrderService().get(ctx, result.workOrderId);
  assert.equal(wo.destinationAddress, "Oficina Central, 200");
  assert.equal(wo.serviceAddress, "Rua da Coleta, 10");
  assert.equal(wo.serviceDetails?.activation_mode, "guincho");
});

test("[P1-b] sem destino → 422 destination_required e o orçamento volta a rascunho, sem OS", async () => {
  const { svc, ctx, quote } = await draftTowQuote();
  const body = buildServiceQuoteApproveBody({ serviceAddress: "Rua da Coleta, 10" });

  await assert.rejects(svc.approve(ctx, quote.id, body), (error: unknown) => {
    assert.equal((error as { reason?: string }).reason, "destination_required", describeError(error));
    assert.equal((error as { statusCode?: number }).statusCode, 422);
    return true;
  });
  const after = await svc.get(ctx, quote.id);
  assert.equal(after.status, "draft");
  assert.ok(!after.createdWorkOrderId, "o orçamento recusado não guarda OS");
  const wos = await createMemoryWorkOrderService().list(ctx, {});
  assert.equal(wos.items.length, 0, "nenhuma OS nasceu");
});

test("[P1-pino] só a coordenada do destino cria a OS", async () => {
  const { svc, ctx, quote } = await draftTowQuote();
  const body = buildServiceQuoteApproveBody({ destinationLatitude: "-23.55", destinationLongitude: "-46.63" });

  let result: Awaited<ReturnType<typeof svc.approve>>;
  try {
    result = await svc.approve(ctx, quote.id, body);
  } catch (error) {
    assert.fail(`o approve recusou o pino do destino: ${describeError(error)} · corpo=${JSON.stringify(body)}`);
  }
  const wo = await createMemoryWorkOrderService().get(ctx, result.workOrderId);
  assert.equal(wo.destinationLatitude, -23.55);
  assert.equal(wo.destinationLongitude, -46.63);
  assert.equal(wo.destinationAddress, undefined);
});
