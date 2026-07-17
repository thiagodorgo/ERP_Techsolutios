import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Ω3F-6a (D-Ω3F-6) — Cancelar com DECISÃO FINANCEIRA (keep|keep_unpaid|zero) + Duplicar idempotente.
// Invariantes cobertos aqui (memory):
//  · a decisão é obrigatória e explícita (sem default silencioso) e fica gravada na OS;
//  · `zero` faz DELETE LÓGICO dos itens: somem da lista e do total agregado, mas persistem para auditoria;
//  · `keep`/`keep_unpaid` NÃO tocam o dinheiro;
//  · duplicar NÃO herda preço congelado (invariante Ω3-e) nem o desfecho da fonte;
//  · duplicar não roda a validação #4 (tarifa vigente) — cópia não pode falhar por tarifa que venceu;
//  · idempotência tenant-scoped do duplicate (replay → 409) e isolamento (cross-tenant → 404).

process.env.CORE_SAAS_PERSISTENCE = "memory";

import {
  createMemoryWorkOrderFinancialService,
  resetWorkOrderFinancialRuntimeForTests,
} from "../src/modules/work-order-financials/work-order-financial.service.js";
import {
  createMemoryWorkOrderCommentService,
  resetWorkOrderCommentRuntimeForTests,
} from "../src/modules/work-order-comments/work-order-comment.service.js";
import {
  createMemoryWorkOrderService,
  getMemoryWorkOrderRepositoryForTests,
  resetWorkOrderRuntimeForTests,
} from "../src/modules/work-orders/work-order.service.js";
import { WorkOrderError, type WorkOrderActorContext } from "../src/modules/work-orders/work-order.types.js";
import { createMemoryCustomerService, resetCustomerRuntimeForTests } from "../src/modules/customers/index.js";
import {
  createMemoryServiceCatalogService,
  resetServiceCatalogRuntimeForTests,
} from "../src/modules/service-catalog/service-catalog.service.js";
import { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests } from "../src/modules/tariffs/tariff.service.js";
import {
  getMemoryPriceTableRepositoryForTests,
  resetPriceTableRuntimeForTests,
} from "../src/modules/price-tables/price-table.service.js";

function actor(tenantId = randomUUID()): WorkOrderActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: [
      "work_orders:read",
      "work_orders:create",
      "work_orders:update",
      "work_orders:status",
      "work_orders:cancel",
      "work_orders:comment",
      "work_order_financials:read",
      "work_order_financials:create",
      "work_order_financials:update",
      "customers:read",
      "customers:create",
      "customers:update",
      "service_catalog:read",
      "service_catalog:create",
    ],
  };
}

function setup() {
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetCustomerRuntimeForTests();
  resetServiceCatalogRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetWorkOrderFinancialRuntimeForTests();
  resetWorkOrderCommentRuntimeForTests();

  return {
    workOrders: createMemoryWorkOrderService(),
    financials: createMemoryWorkOrderFinancialService(),
    comments: createMemoryWorkOrderCommentService(),
    customers: createMemoryCustomerService(),
    serviceCatalog: createMemoryServiceCatalogService(),
  };
}

// Semeia uma Tarifa numa Tabela de Valores PUBLICADA nos mesmos singletons que o
// ApplicableTariffResolver compartilhado consulta (espelho de tests/work-order-financials.test.ts).
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

// ---------- cancel: decisão financeira ----------

test("cancel keep: cancela, grava a decisão e NÃO toca os itens financeiros", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS keep" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 200 });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 15.5 });

  const cancelled = await s.workOrders.cancel(ctx, wo.id, { reason: "Cliente desistiu no local", financial_decision: "keep" });

  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.financialCancellationDecision, "keep");
  assert.equal(cancelled.cancellationReason, "Cliente desistiu no local");
  assert.ok(cancelled.cancelledAt instanceof Date);

  // O serviço foi prestado antes do cancelamento: o dinheiro fica de pé, intacto.
  const financeiro = await s.financials.list(ctx, wo.id);
  assert.equal(financeiro.items.length, 2);
  assert.equal(financeiro.totalAmount, 215.5);
});

test("cancel zero: itens somem da lista e o total agregado vira 0 (delete LÓGICO, decisão gravada)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS zero" });
  const item = await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 300 });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 20 });

  const antes = await s.financials.list(ctx, wo.id);
  assert.equal(antes.totalAmount, 320);

  const cancelled = await s.workOrders.cancel(ctx, wo.id, { reason: "Erro de abertura", financial_decision: "zero" });

  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.financialCancellationDecision, "zero");

  const depois = await s.financials.list(ctx, wo.id);
  assert.equal(depois.items.length, 0);
  assert.equal(depois.totalAmount, 0);

  // Delete LÓGICO: a linha persiste com deleted_at (auditoria), não some do banco.
  const removido = await s.financials.delete(ctx, wo.id, item.id).catch((error: unknown) => error);
  assert.ok(removido instanceof Error, "re-delete de item já apagado deve falhar (404), provando o delete lógico");
});

test("cancel keep_unpaid: itens intactos e decisão gravada (a cobrança é decidida pelas comissões depois)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS keep_unpaid" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 180 });

  const cancelled = await s.workOrders.cancel(ctx, wo.id, {
    reason: "Cancelado sem custo para o cliente",
    financial_decision: "keep_unpaid",
  });

  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.financialCancellationDecision, "keep_unpaid");

  const financeiro = await s.financials.list(ctx, wo.id);
  assert.equal(financeiro.items.length, 1);
  assert.equal(financeiro.totalAmount, 180);
});

test("cancel grava o evento work_order_cancelled na timeline com metadata curada", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS timeline" });
  await s.workOrders.cancel(ctx, wo.id, { reason: "Duplicidade", financial_decision: "zero" });

  const timeline = await s.workOrders.timeline(ctx, wo.id);
  const evento = timeline.find((event) => event.eventType === "work_order_cancelled");
  assert.ok(evento);
  assert.equal(evento.fromStatus, "open");
  assert.equal(evento.toStatus, "cancelled");
  assert.equal(evento.metadata.financialDecision, "zero");
  assert.equal(evento.metadata.cancellationReason, "Duplicidade");
  // §2.8 — metadata é allowlist: nada de tenant.
  assert.equal(evento.metadata.tenantId, undefined);
  assert.equal(evento.metadata.tenant_id, undefined);
});

// ---------- cancel: contrato de erro ----------

test("cancel sem motivo → 400 cancellation_reason_required", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS sem motivo" });

  await assert.rejects(
    () => s.workOrders.cancel(ctx, wo.id, { financial_decision: "keep" }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.reason, "cancellation_reason_required");
      return true;
    },
  );
  assert.equal((await s.workOrders.get(ctx, wo.id)).status, "open");
});

test("cancel com decisão inválida OU ausente → 422 invalid_financial_decision (sem default silencioso)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS decisão" });

  for (const body of [
    { reason: "x", financial_decision: "descontar" },
    { reason: "x", financial_decision: "" },
    { reason: "x" },
  ]) {
    await assert.rejects(
      () => s.workOrders.cancel(ctx, wo.id, body),
      (error: WorkOrderError) => {
        assert.equal(error.statusCode, 422);
        assert.equal(error.reason, "invalid_financial_decision");
        return true;
      },
    );
  }
  assert.equal((await s.workOrders.get(ctx, wo.id)).status, "open");
});

test("cancel de OS JÁ cancelada → 422 invalid_status_transition (não re-decide o dinheiro)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS dupla" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 100 });
  await s.workOrders.cancel(ctx, wo.id, { reason: "Primeiro cancelamento", financial_decision: "keep" });

  await assert.rejects(
    () => s.workOrders.cancel(ctx, wo.id, { reason: "Segundo cancelamento", financial_decision: "zero" }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.reason, "invalid_status_transition");
      return true;
    },
  );

  // A decisão original resiste e o `zero` do replay NÃO apagou o dinheiro.
  const atual = await s.workOrders.get(ctx, wo.id);
  assert.equal(atual.financialCancellationDecision, "keep");
  assert.equal((await s.financials.list(ctx, wo.id)).totalAmount, 100);
});

test("[isolamento] cancel de OS de outra organização → 404 (nada vaza, nada muda)", async () => {
  const s = setup();
  const ctxA = actor();
  const ctxB = actor();
  const wo = await s.workOrders.create(ctxA, { title: "OS do tenant A" });

  await assert.rejects(
    () => s.workOrders.cancel(ctxB, wo.id, { reason: "cross", financial_decision: "zero" }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.reason, "not_found");
      return true;
    },
  );
  assert.equal((await s.workOrders.get(ctxA, wo.id)).status, "open");
});

// ---------- duplicate ----------

test("duplicate: novo código, status open e mesmos vínculos/endereços da fonte", async () => {
  const s = setup();
  const ctx = actor();
  const source = await s.workOrders.create(ctx, {
    title: "Remoção Curitiba → São José",
    description: "Veículo com pane seca",
    priority: "high",
    serviceAddress: "Rua das Flores, 100",
    serviceCity: "Curitiba",
    serviceState: "PR",
    serviceZipCode: "80010-000",
    serviceLatitude: -25.43,
    serviceLongitude: -49.27,
    destinationAddress: "Av. Central, 900",
    destinationCity: "São José dos Pinhais",
    destinationState: "PR",
    service_details: { plate: "ABC1D23", color: "prata" },
    scheduledFor: new Date("2026-07-20T10:00:00.000Z").toISOString(),
  });

  const copy = await s.workOrders.duplicate(ctx, source.id, {});

  assert.notEqual(copy.id, source.id);
  assert.notEqual(copy.code, source.code, "a cópia consome um NOVO número de OS");
  assert.equal(copy.status, "open");
  assert.equal(copy.title, source.title);
  assert.equal(copy.description, source.description);
  assert.equal(copy.priority, "high");
  assert.equal(copy.serviceAddress, "Rua das Flores, 100");
  assert.equal(copy.serviceCity, "Curitiba");
  assert.equal(copy.serviceLatitude, -25.43);
  assert.equal(copy.destinationAddress, "Av. Central, 900");
  assert.equal(copy.destinationCity, "São José dos Pinhais");
  assert.deepEqual(copy.serviceDetails, { plate: "ABC1D23", color: "prata" });
  // Novo ciclo: agendamento e autoria são do momento da cópia, não da fonte.
  assert.equal(copy.scheduledFor, undefined);
  assert.equal(copy.createdBy, ctx.userId);
  assert.equal(copy.clientActionId, undefined);
});

test("duplicate NÃO herda o preço congelado: itens financeiros da fonte não vão para a cópia (Ω3-e)", async () => {
  const s = setup();
  const ctx = actor();
  const source = await s.workOrders.create(ctx, { title: "OS com dinheiro" });
  await s.financials.create(ctx, source.id, { source: "manual", description: "Guincho", unit_amount: 250 });
  await s.financials.create(ctx, source.id, { source: "manual", description: "Pedágio", unit_amount: 18 });
  assert.equal((await s.financials.list(ctx, source.id)).totalAmount, 268);

  const copy = await s.workOrders.duplicate(ctx, source.id, {});

  const financeiroCopia = await s.financials.list(ctx, copy.id);
  assert.equal(financeiroCopia.items.length, 0, "a OS duplicada nasce sem itens financeiros");
  assert.equal(financeiroCopia.totalAmount, 0);
  // A fonte permanece intacta.
  assert.equal((await s.financials.list(ctx, source.id)).totalAmount, 268);
});

test("duplicate NÃO herda o desfecho da fonte (cancelamento/decisão financeira)", async () => {
  const s = setup();
  const ctx = actor();
  const source = await s.workOrders.create(ctx, { title: "OS cancelada" });
  await s.workOrders.cancel(ctx, source.id, { reason: "Cliente desistiu", financial_decision: "zero" });

  const copy = await s.workOrders.duplicate(ctx, source.id, {});

  assert.equal(copy.status, "open");
  assert.equal(copy.cancelledAt, undefined);
  assert.equal(copy.cancellationReason, undefined);
  assert.equal(copy.financialCancellationDecision, undefined);
});

test("duplicate com client_action_id: replay → 409 duplicate_work_order (e não cria segunda OS)", async () => {
  const s = setup();
  const ctx = actor();
  const source = await s.workOrders.create(ctx, { title: "OS idempotente" });

  const first = await s.workOrders.duplicate(ctx, source.id, { client_action_id: "dup-act-1" });
  assert.equal(first.clientActionId, "dup-act-1");

  await assert.rejects(
    () => s.workOrders.duplicate(ctx, source.id, { client_action_id: "dup-act-1" }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.reason, "duplicate_work_order");
      return true;
    },
  );

  const { total } = await s.workOrders.list(ctx, {});
  assert.equal(total, 2, "fonte + 1 cópia: o replay não gerou uma terceira OS");
});

test("[isolamento] client_action_id é TENANT-SCOPED: a mesma chave em outra organização não colide", async () => {
  const s = setup();
  const ctxA = actor();
  const ctxB = actor();
  const sourceA = await s.workOrders.create(ctxA, { title: "OS A" });
  const sourceB = await s.workOrders.create(ctxB, { title: "OS B" });

  const copyA = await s.workOrders.duplicate(ctxA, sourceA.id, { client_action_id: "mesma-chave" });
  const copyB = await s.workOrders.duplicate(ctxB, sourceB.id, { client_action_id: "mesma-chave" });

  assert.equal(copyA.tenantId, ctxA.tenantId);
  assert.equal(copyB.tenantId, ctxB.tenantId);
  assert.notEqual(copyA.id, copyB.id);
});

test("duplicate copy_comments: true copia os comentários ativos preservando o AUTOR ORIGINAL", async () => {
  const s = setup();
  const ctx = actor();
  const autorOriginal = actor(ctx.tenantId);
  const source = await s.workOrders.create(ctx, { title: "OS comentada" });
  await s.comments.addComment(autorOriginal, source.id, { message: "Cliente pediu para ligar antes" });
  await s.comments.addComment(ctx, source.id, { message: "Portão azul, fundos" });
  // Comentário excluído (delete lógico) NÃO deve ser copiado.
  const removido = await s.comments.addComment(ctx, source.id, { message: "Comentário errado" });
  await s.comments.deleteComment(ctx, source.id, removido.id);

  const copy = await s.workOrders.duplicate(ctx, source.id, { copy_comments: true });

  const copiados = await s.comments.listComments(ctx, copy.id);
  assert.equal(copiados.length, 2);
  assert.deepEqual(
    copiados.map((comment) => comment.message),
    ["Cliente pediu para ligar antes", "Portão azul, fundos"],
  );
  // Quem duplica NÃO vira autor do que a equipe escreveu.
  assert.equal(copiados[0].authorUserId, autorOriginal.userId);
  assert.equal(copiados[1].authorUserId, ctx.userId);
  // A fonte segue com os seus 2 comentários ativos.
  assert.equal((await s.comments.listComments(ctx, source.id)).length, 2);
});

test("duplicate copy_comments: default (ausente/false) NÃO copia comentários", async () => {
  const s = setup();
  const ctx = actor();
  const source = await s.workOrders.create(ctx, { title: "OS comentada" });
  await s.comments.addComment(ctx, source.id, { message: "Observação da fonte" });

  const semOpcao = await s.workOrders.duplicate(ctx, source.id, {});
  const explicitoFalse = await s.workOrders.duplicate(ctx, source.id, { copy_comments: false });

  assert.equal((await s.comments.listComments(ctx, semOpcao.id)).length, 0);
  assert.equal((await s.comments.listComments(ctx, explicitoFalse.id)).length, 0);
});

test("duplicate copy_checklist: true herda template + snapshot congelado; default não herda nenhum", async () => {
  const s = setup();
  const ctx = actor();
  const checklistId = randomUUID();
  const source = await s.workOrders.create(ctx, { title: "OS com checklist", checklistId });
  await s.workOrders.freezeChecklistSnapshot(ctx, source.id, { items: [{ label: "Fotos do veículo" }] });

  const comChecklist = await s.workOrders.duplicate(ctx, source.id, { copy_checklist: true });
  const semChecklist = await s.workOrders.duplicate(ctx, source.id, {});

  assert.equal(comChecklist.checklistId, checklistId);
  assert.deepEqual(comChecklist.checklistSnapshot, { items: [{ label: "Fotos do veículo" }] });
  assert.equal(semChecklist.checklistId, undefined);
  assert.equal(semChecklist.checklistSnapshot, null);
});

test("duplicate grava work_order_created na cópia com duplicatedFrom (rastreia a origem)", async () => {
  const s = setup();
  const ctx = actor();
  const source = await s.workOrders.create(ctx, { title: "OS origem" });

  const copy = await s.workOrders.duplicate(ctx, source.id, {});

  const timeline = await s.workOrders.timeline(ctx, copy.id);
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].eventType, "work_order_created");
  assert.equal(timeline[0].toStatus, "open");
  assert.equal(timeline[0].metadata.duplicatedFrom, source.id);
  assert.equal(timeline[0].metadata.code, copy.code);
});

test("[isolamento] duplicate de OS de outra organização → 404 (não cria nada)", async () => {
  const s = setup();
  const ctxA = actor();
  const ctxB = actor();
  const source = await s.workOrders.create(ctxA, { title: "OS do tenant A" });

  await assert.rejects(
    () => s.workOrders.duplicate(ctxB, source.id, {}),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.reason, "not_found");
      return true;
    },
  );
  assert.equal((await s.workOrders.list(ctxB, {})).total, 0);
});

test("duplicate de OS com cliente+serviço SEM tarifa vigente → SUCESSO (a validação #4 não bloqueia a cópia)", async () => {
  const s = setup();
  const ctx = actor();
  const cliente = await s.customers.create(ctx, { name: "Transportadora Andrade" });
  const { id: serviceCatalogId } = await s.serviceCatalog.create(ctx, { name: "Remoção de veículo" });

  // Com tarifa vigente a OS-fonte nasce normalmente (a validação #4 do create passa).
  await seedTariff(ctx.tenantId, serviceCatalogId, 400);
  const source = await s.workOrders.create(ctx, {
    title: "Remoção contratada",
    customer_id: cliente.id,
    service_catalog_id: serviceCatalogId,
  });

  // A tarifa some (venceu / tabela despublicada) — o mundo mudou DEPOIS da OS-fonte existir.
  resetTariffRuntimeForTests();
  resetPriceTableRuntimeForTests();

  // Prova de que a validação #4 continua VIVA no create: o mesmo par cliente+serviço agora é rejeitado.
  await assert.rejects(
    () => s.workOrders.create(ctx, { title: "OS nova", customer_id: cliente.id, service_catalog_id: serviceCatalogId }),
    (error: WorkOrderError) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.reason, "tariff_not_found_for_service");
      return true;
    },
  );

  // ...e ainda assim duplicar a OS que JÁ existe funciona: cópia não pode falhar por tarifa vencida.
  const copy = await s.workOrders.duplicate(ctx, source.id, {});

  assert.equal(copy.status, "open");
  assert.equal(copy.customerId, cliente.id);
  assert.equal(copy.serviceCatalogId, serviceCatalogId);
  assert.notEqual(copy.code, source.code);
});

test("duplicate copia o snapshot do cliente CONGELADO na fonte (não re-resolve o cadastro renomeado)", async () => {
  const s = setup();
  const ctx = actor();
  const cliente = await s.customers.create(ctx, { name: "Nome Antigo", document: "12345678901" });
  const source = await s.workOrders.create(ctx, { title: "OS cliente", customer_id: cliente.id });
  assert.equal(source.customerName, "Nome Antigo");

  await s.customers.update(ctx, cliente.id, { name: "Nome Novo" });

  const copy = await s.workOrders.duplicate(ctx, source.id, {});

  // Semântica de snapshot: a cópia carrega o que a OS-fonte congelou, não o cadastro de hoje.
  assert.equal(copy.customerName, "Nome Antigo");
  assert.equal(copy.customerDocument, "12345678901");
  assert.equal(copy.customerId, cliente.id);
});

test("duplicate: a fonte permanece intacta e a cópia é uma OS independente no repositório", async () => {
  const s = setup();
  const ctx = actor();
  const source = await s.workOrders.create(ctx, { title: "OS fonte" });

  const copy = await s.workOrders.duplicate(ctx, source.id, {});
  await s.workOrders.cancel(ctx, copy.id, { reason: "Cópia indevida", financial_decision: "keep" });

  const fonteAtual = await getMemoryWorkOrderRepositoryForTests().findById(ctx.tenantId, source.id);
  assert.equal(fonteAtual?.status, "open", "cancelar a cópia não mexe na fonte");
  assert.equal(fonteAtual?.financialCancellationDecision, undefined);
});

// ---------- Porta dos fundos do cancelamento (condição BLOQUEANTE do coordenador-de-acessos, J-Ω3F-6A) ----------
// O PATCH /status legado exige só `work_orders:status` — que operator/técnico têm. Antes deste bloco, eles
// cancelavam por lá SEM decisão financeira, contornando o gate do POST /cancel e deixando NULL para o
// consumidor de comissões. Agora o service exige `work_orders:cancel` para o destino `cancelled`: não é
// política nova, é CUMPRIR o catálogo (que já não dava :cancel a esses papéis).

test("[J-Ω3F-6A] changeStatus→cancelled SEM work_orders:cancel → 403 (operator não cancela pelo legado)", async () => {
  const s = setup();
  const manager = actor();
  const wo = await s.workOrders.create(manager, { title: "OS" });

  // Mesmo tenant, mas papel de operador: tem :status, NÃO tem :cancel (espelha o catálogo real).
  const operator: WorkOrderActorContext = {
    ...manager,
    userId: randomUUID(),
    roles: ["operator"],
    permissions: ["work_orders:read", "work_orders:update", "work_orders:status"],
  };

  await assert.rejects(
    () => s.workOrders.changeStatus(operator, wo.id, { status: "cancelled", cancellationReason: "tentativa pelo legado" }),
    (e: unknown) => e instanceof WorkOrderError && e.statusCode === 403 && e.reason === "cancel_requires_permission",
  );

  // A OS NÃO foi cancelada: a porta dos fundos está fechada para quem não pode cancelar.
  const after = await s.workOrders.get(manager, wo.id);
  assert.notEqual(after.status, "cancelled");
});

test("[J-Ω3F-6A] operator SEGUE podendo mudar status não-terminal pelo legado (o gate é só p/ cancelled)", async () => {
  const s = setup();
  const manager = actor();
  const wo = await s.workOrders.create(manager, { title: "OS" });
  const operator: WorkOrderActorContext = {
    ...manager,
    userId: randomUUID(),
    roles: ["operator"],
    permissions: ["work_orders:read", "work_orders:update", "work_orders:status"],
  };

  // Não quebramos o fluxo legítimo do operador — só o cancelamento passou a exigir :cancel.
  const updated = await s.workOrders.changeStatus(operator, wo.id, { status: "assigned" });
  assert.equal(updated.status, "assigned");
});

// Pós-análise Ω3F-6 — paridade com os espelhos (work-order-financial/service-quote-item validators):
// o client_action_id vai para a coluna do unique PARCIAL; sem cap, uma string enorme estouraria o limite
// de linha do btree no Postgres (ERROR 54000, que NÃO é P2002) e viraria 500 em vez de 400.
test("[pós-análise] duplicate com client_action_id > 120 chars → 400 invalid_client_action_id (espelho dos vizinhos)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });

  await assert.rejects(
    () => s.workOrders.duplicate(ctx, wo.id, { client_action_id: "x".repeat(121) }),
    (e: unknown) => e instanceof WorkOrderError && e.statusCode === 400 && e.reason === "invalid_client_action_id",
  );

  // No limite (120) segue válido — o cap é o mesmo dos espelhos.
  const copy = await s.workOrders.duplicate(ctx, wo.id, { client_action_id: "y".repeat(120) });
  assert.notEqual(copy.code, wo.code);
});
