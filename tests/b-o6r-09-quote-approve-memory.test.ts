import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// B-O6R-09 · fatia 6 · T25 (emenda 1 §1.4 e §3; emenda 1.1 EM1-01, EM1-07 e EM1-09) — a aprovação do orçamento no modo
// MEMÓRIA, com o mesmo contrato do Prisma:
//   [mem] falha injetada no evento da OS, no vínculo ou na escrita da OS → rejeita, 0 OS, orçamento draft; a nova → 1 OS;
//   [mem · T25c]  2 aprovações simultâneas → 1 OS; o perdedor ESPERA o vencedor e recebe 409 quote_already_approved com
//                 o `details.workOrderId` dele;
//   [mem · T25c-rb] o vencedor falha no evento enquanto o 2º espera → o 2º reserva e cria; 1 OS no total;
//   [mem · T25d]  a OS do caminho preparado é igual, campo a campo, à do create normal com o mesmo corpo;
//   [mem · T22]   aprovar 2× → a 2ª → 409 quote_already_approved com `details.workOrderId`.

import {
  createMemoryServiceQuoteService,
  getMemoryServiceQuoteRepositoryForTests,
  resetServiceQuoteRuntimeForTests,
} from "../src/modules/service-quotes/service-quote.service.js";
import { ServiceQuoteError, type ServiceQuoteActorContext } from "../src/modules/service-quotes/service-quote.types.js";
import { resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import { resetPriceTableRuntimeForTests } from "../src/modules/price-tables/price-table.service.js";
import {
  createMemoryServiceCatalogService,
  resetServiceCatalogRuntimeForTests,
} from "../src/modules/service-catalog/service-catalog.service.js";
import { resetCustomerRuntimeForTests } from "../src/modules/customers/customer.service.js";
import {
  createMemoryWorkOrderService,
  getMemoryWorkOrderRepositoryForTests,
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

async function setup() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetServiceQuoteRuntimeForTests();
  resetServiceCatalogRuntimeForTests();
  resetCustomerRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  const svc = createMemoryServiceQuoteService();
  const ctx = actor();
  const catalog = await createMemoryServiceCatalogService().create(ctx, { name: `Serviço ${randomUUID()}` });
  const quote = await svc.create(ctx, { service_catalog_id: catalog.id, price_source: "manual", unit_price: 80 });
  const contarOs = async () => (await createMemoryWorkOrderService().list(ctx, {})).items.length;
  return { svc, ctx, quote, catalogId: catalog.id, contarOs };
}

// Troca um método de uma instância por uma versão que falha UMA vez (a próxima chamada já é a original).
function falharUmaVez(alvo: Record<string, any>, metodo: string, marca: string, quando: (args: unknown[]) => boolean = () => true): () => void {
  const original = alvo[metodo];
  let falhou = false;
  alvo[metodo] = async function (this: unknown, ...args: unknown[]) {
    if (!falhou && quando(args)) {
      falhou = true;
      throw new Error(marca);
    }
    return original.apply(alvo, args);
  };
  return () => {
    alvo[metodo] = original;
  };
}

test("[mem] falha injetada no createEvent do escopo → rejeita, 0 OS, draft; nova aprovação → 1 OS", async () => {
  const { svc, ctx, quote, contarOs } = await setup();
  const restaurar = falharUmaVez(getMemoryWorkOrderRepositoryForTests() as never, "createEvent", "B_O6R_09_MEM_EVENTO");
  try {
    await assert.rejects(() => svc.approve(ctx, quote.id, {}), /B_O6R_09_MEM_EVENTO/);
  } finally {
    restaurar();
  }
  assert.equal(await contarOs(), 0, "sobrou OS depois da falha no evento");
  const reread = await svc.get(ctx, quote.id);
  assert.deepEqual([reread.status, reread.createdWorkOrderId], ["draft", undefined]);
  const { workOrderId } = await svc.approve(ctx, quote.id, {});
  assert.ok(workOrderId);
  assert.equal(await contarOs(), 1, "a sonda E: duas OS para um orçamento");
});

test("[mem] falha no vínculo → rejeita, 0 OS, draft", async () => {
  const { svc, ctx, quote, contarOs } = await setup();
  const repo = getMemoryServiceQuoteRepositoryForTests() as unknown as Record<string, any>;
  // O vínculo é `update({ createdWorkOrderId })` na main e `linkCreatedWorkOrderSync` no desenho novo: os dois falham.
  const restaurarUpdate = falharUmaVez(repo, "update", "B_O6R_09_MEM_VINCULO", (args) => Boolean((args[0] as { createdWorkOrderId?: string })?.createdWorkOrderId));
  const linkOriginal = repo.linkCreatedWorkOrderSync;
  repo.linkCreatedWorkOrderSync = () => {
    throw new Error("B_O6R_09_MEM_VINCULO");
  };
  try {
    await assert.rejects(() => svc.approve(ctx, quote.id, {}), /B_O6R_09_MEM_VINCULO/);
  } finally {
    restaurarUpdate();
    if (linkOriginal) repo.linkCreatedWorkOrderSync = linkOriginal;
    else delete repo.linkCreatedWorkOrderSync;
  }
  assert.equal(await contarOs(), 0, "OS órfã: a OS ficou e o vínculo não");
  const reread = await svc.get(ctx, quote.id);
  assert.deepEqual([reread.status, reread.createdWorkOrderId], ["draft", undefined]);
});

test("[mem] falha na escrita da OS (create do escopo) → rejeita, 0 OS, draft", async () => {
  const { svc, ctx, quote, contarOs } = await setup();
  const restaurar = falharUmaVez(getMemoryWorkOrderRepositoryForTests() as never, "create", "B_O6R_09_MEM_OS");
  try {
    await assert.rejects(() => svc.approve(ctx, quote.id, {}), /B_O6R_09_MEM_OS/);
  } finally {
    restaurar();
  }
  assert.equal(await contarOs(), 0);
  const reread = await svc.get(ctx, quote.id);
  assert.deepEqual([reread.status, reread.createdWorkOrderId], ["draft", undefined]);
});

test("[mem · T25c] 2 aprovações simultâneas → 1 OS; o perdedor → 409 quote_already_approved com details.workOrderId do vencedor", async () => {
  const { svc, ctx, quote, contarOs } = await setup();
  const results = await Promise.allSettled([svc.approve(ctx, quote.id, {}), svc.approve(ctx, quote.id, {})]);
  const fulfilled = results.filter((r): r is PromiseFulfilledResult<{ workOrderId: string }> => r.status === "fulfilled");
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  const err = rejected[0]!.reason as ServiceQuoteError & { details?: { workOrderId?: string } };
  assert.ok(err instanceof ServiceQuoteError, String(err));
  assert.equal(err.reason, "quote_already_approved", `o perdedor recebeu ${err.reason}`);
  assert.equal(err.details?.workOrderId, fulfilled[0]!.value.workOrderId);
  assert.equal(await contarOs(), 1);
});

test("[mem · T25c-rb] o vencedor falha no evento enquanto o 2º espera → o 2º reserva e cria; 1 OS no total", async () => {
  const { svc, ctx, quote, contarOs } = await setup();
  const restaurar = falharUmaVez(getMemoryWorkOrderRepositoryForTests() as never, "createEvent", "B_O6R_09_MEM_1A");
  try {
    const [primeira, segunda] = await Promise.allSettled([svc.approve(ctx, quote.id, {}), svc.approve(ctx, quote.id, {})]);
    assert.equal(primeira.status, "rejected", "o vencedor, com a falha injetada, não rejeitou");
    assert.match(String((primeira as PromiseRejectedResult).reason?.message), /B_O6R_09_MEM_1A/);
    assert.equal(segunda.status, "fulfilled", `o 2º não criou a sua OS: ${String((segunda as PromiseRejectedResult).reason?.message ?? "")}`);
  } finally {
    restaurar();
  }
  assert.equal(await contarOs(), 1);
});

test("[mem · T25d] a OS do caminho preparado é igual, campo a campo, à do create normal com o mesmo corpo (fora id, code e datas)", async () => {
  const { svc, ctx, quote, catalogId } = await setup();
  const corpo = {
    title: "OS de paridade",
    serviceAddress: "Rua da Coleta, 10",
    serviceCity: "Curitiba",
    destinationAddress: "Oficina Central, 200",
    destinationCity: "Curitiba",
    priority: "high",
    activation_mode: "aplicativo",
  };
  const { workOrderId } = await svc.approve(ctx, quote.id, corpo);
  const workOrders = createMemoryWorkOrderService();
  const viaOrcamento = await workOrders.get(ctx, workOrderId);
  const normal = await workOrders.create(
    ctx,
    {
      title: corpo.title,
      customer_id: quote.customerId,
      service_catalog_id: catalogId,
      serviceAddress: corpo.serviceAddress,
      serviceCity: corpo.serviceCity,
      destinationAddress: corpo.destinationAddress,
      destinationCity: corpo.destinationCity,
      service_details: { activation_mode: corpo.activation_mode },
      priority: corpo.priority,
    },
    { skipApplicableTariffCheck: true },
  );
  const semIdentidade = (wo: Record<string, unknown>) => {
    const { id: _id, code: _code, createdAt: _c, updatedAt: _u, ...resto } = wo;
    return resto;
  };
  assert.deepEqual(semIdentidade(viaOrcamento as never), semIdentidade((await workOrders.get(ctx, normal.id)) as never));
});

test("[mem · T22] aprovar 2× → 1 OS; a 2ª → 409 quote_already_approved com details.workOrderId = o da 1ª", async () => {
  const { svc, ctx, quote, contarOs } = await setup();
  const { workOrderId } = await svc.approve(ctx, quote.id, {});
  await assert.rejects(
    () => svc.approve(ctx, quote.id, { destinationAddress: "Outro destino" }),
    (e: any) => e instanceof ServiceQuoteError && e.statusCode === 409 && e.reason === "quote_already_approved" && e.details?.workOrderId === workOrderId,
  );
  assert.equal(await contarOs(), 1);
});
