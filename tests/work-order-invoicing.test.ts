import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// Ω4-3 — Faturamento OS→Título: minta um Título a RECEBER a partir do agregado CONGELADO do Financeiro
// da OS (nunca relê tarifa), idempotente por OS (anti-refaturamento), carimba+trava os itens faturados.

import {
  WorkOrderFinancialService,
  createMemoryWorkOrderFinancialService,
  createMemoryWorkOrderInvoicingService,
  getMemoryWorkOrderFinancialRepositoryForTests,
  resetWorkOrderFinancialRuntimeForTests,
} from "../src/modules/work-order-financials/work-order-financial.service.js";
import {
  createDefaultFinancialUnitOfWork,
  type FinancialUnitOfWork,
  type FinancialUowContext,
  type FinancialUowResolver,
} from "../src/modules/financial-uow/index.js";
import { createMemoryApplicableTariffResolver } from "../src/modules/service-quotes/service-quote.service.js";
import {
  WorkOrderFinancialError,
  type WorkOrderFinancialActorContext,
} from "../src/modules/work-order-financials/work-order-financial.types.js";
import {
  createMemoryWorkOrderService,
  resetWorkOrderRuntimeForTests,
} from "../src/modules/work-orders/work-order.service.js";
import {
  FinancialTitleError,
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  getMemoryFinancialTitleRepositoryForTests,
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

// =====================================================================================================
// B-SAN3-02 — faturamento ATÔMICO (título + carimbo na mesma unidade) e título COMPLEMENTAR para o delta.
// Memória = dublê honesto da UoW (mutex + journal): prova contrato, precedência e rollback do dublê; a prova
// de atomicidade/corrida contra o Postgres é a suíte tests/work-order-invoicing-atomic-db.test.ts.
// =====================================================================================================

/** UoW de memória (a mesma do resolver default) com o contexto trocado por `mutate` — injeção de falha/decisão. */
function wrappedUow(mutate: (ctx: FinancialUowContext) => FinancialUowContext): FinancialUowResolver {
  return async () => {
    const base = await createDefaultFinancialUnitOfWork();
    const wrapped: FinancialUnitOfWork = {
      run: (tenantId, work) => base.run(tenantId, (ctx) => work(mutate(ctx))),
    };
    return wrapped;
  };
}

/** Proxy que troca só os membros nomeados e delega o resto (padrão de tests/financial-entries.test.ts). */
function override<T extends object>(target: T, members: Record<string, (...args: never[]) => unknown>): T {
  return new Proxy(target, {
    get(obj, property, receiver) {
      if (typeof property === "string" && property in members) return members[property];
      const member = Reflect.get(obj, property, receiver);
      return typeof member === "function" ? member.bind(obj) : member;
    },
  });
}

async function stampedCount(ctx: WorkOrderFinancialActorContext, workOrderId: string, financials: ReturnType<typeof setup>["financials"]) {
  return (await financials.list(ctx, workOrderId)).items.filter((item) => item.invoicedAt != null).length;
}

function hasReason(status: number, reason: string) {
  return (e: unknown) =>
    typeof e === "object" && e !== null && (e as { statusCode?: number }).statusCode === status && (e as { reason?: string }).reason === reason;
}

// ---------- K1 — falha injetada entre o título e o carimbo → nada persiste ----------

test("[B-SAN3-02][T-A1] falha injetada no carimbo → o faturamento rejeita e NEM título NEM carimbo persistem", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 100 });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "Pedágio", unit_amount: 20 });
  const injected = new Error("falha injetada no carimbo");
  const invoicing = createMemoryWorkOrderInvoicingService(
    wrappedUow((uowCtx) => ({
      ...uowCtx,
      workOrderItems: override(uowCtx.workOrderItems, {
        markInvoiced: async () => {
          throw injected;
        },
      }),
    })),
  );
  await assert.rejects(() => invoicing.invoice(ctx, wo.id, {}), (e: unknown) => e === injected);
  assert.equal((await s.titles.list(ctx, {})).total, 0, "nenhum título persiste");
  assert.equal(await stampedCount(ctx, wo.id, s.financials), 0, "nenhum item carimbado");
  assert.equal((await s.financials.list(ctx, wo.id)).items.length, 2, "os itens seguem intactos");
});

test("[B-SAN3-02][T-A3] contagem carimbada MENOR que a selecionada → 409 invoice_items_changed e rollback total", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 100 });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 50 });
  const invoicing = createMemoryWorkOrderInvoicingService(
    wrappedUow((uowCtx) => ({
      ...uowCtx,
      workOrderItems: override(uowCtx.workOrderItems, {
        // Carimba de verdade (o journal guarda a before-image) e MENTE a contagem: a guarda do passo 7 aborta.
        markInvoiced: async (input: Parameters<FinancialUowContext["workOrderItems"]["markInvoiced"]>[0]) =>
          (await uowCtx.workOrderItems.markInvoiced(input)) - 1,
      }),
    })),
  );
  await assert.rejects(() => invoicing.invoice(ctx, wo.id, {}), hasReason(409, "invoice_items_changed"));
  assert.equal((await s.titles.list(ctx, {})).total, 0);
  assert.equal(await stampedCount(ctx, wo.id, s.financials), 0, "o carimbo da unidade abortada foi desfeito");
});

test("[B-SAN3-02][T-A6] falha TRANSIENTE por código (P2034; P2010 + meta.code 40P01) → 503 invoice_transient_conflict, nada persiste", async () => {
  for (const transient of [{ code: "P2034" }, { code: "P2010", meta: { code: "40P01" } }]) {
    const s = setup();
    const ctx = actor();
    const wo = await s.workOrders.create(ctx, { title: "OS" });
    await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 100 });
    const invoicing = createMemoryWorkOrderInvoicingService(
      wrappedUow((uowCtx) => ({
        ...uowCtx,
        workOrderItems: override(uowCtx.workOrderItems, {
          markInvoiced: async () => {
            throw Object.assign(new Error("transiente injetado"), transient);
          },
        }),
      })),
    );
    await assert.rejects(() => invoicing.invoice(ctx, wo.id, {}), hasReason(503, "invoice_transient_conflict"), JSON.stringify(transient));
    assert.equal((await s.titles.list(ctx, {})).total, 0);
    assert.equal(await stampedCount(ctx, wo.id, s.financials), 0);
  }
});

test("[B-SAN3-02][T-A7] um 409 ALHEIO e o 400 de pai inválido nascidos na unidade PROPAGAM intactos (nunca viram already_invoiced)", async () => {
  const cases = [
    new FinancialTitleError(409, "FINANCIAL_TITLE_CONFLICT", "source_already_launched", "409 alheio injetado"),
    new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_parent_title_reference", "400 injetado"),
  ];
  for (const injected of cases) {
    const s = setup();
    const ctx = actor();
    const wo = await s.workOrders.create(ctx, { title: "OS" });
    await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 100 });
    const invoicing = createMemoryWorkOrderInvoicingService(
      wrappedUow((uowCtx) => ({
        ...uowCtx,
        titles: override(uowCtx.titles, {
          create: async () => {
            throw injected;
          },
        }),
      })),
    );
    await assert.rejects(() => invoicing.invoice(ctx, wo.id, {}), hasReason(injected.statusCode, injected.reason));
    assert.equal((await s.titles.list(ctx, {})).total, 0);
    assert.equal(await stampedCount(ctx, wo.id, s.financials), 0);
  }
});

// ---------- K2 — CAS do item carimbado (memória) ----------

test("[B-SAN3-02][T-M4b] pré-check passou com o item ainda sem carimbo, o carimbo venceu → PATCH/DELETE = 422 item_invoiced (não 404)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const item = await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 100 });
  await s.invoicing.invoice(ctx, wo.id, {});
  for (const op of ["update", "delete"] as const) {
    const real = getMemoryWorkOrderFinancialRepositoryForTests();
    let reads = 0;
    // A 1ª leitura (pré-check do serviço) devolve o item SEM carimbo — a corrida em que o faturamento commitou
    // entre o pré-check e a escrita. As seguintes leem o estado real (carimbado).
    const racing = override(real, {
      findById: async (tenantId: string, workOrderId: string, itemId: string) => {
        const current = await real.findById(tenantId, workOrderId, itemId);
        reads += 1;
        return reads === 1 && current ? { ...current, invoicedAt: undefined, titleId: undefined } : current;
      },
    });
    const service = new WorkOrderFinancialService(racing, createMemoryWorkOrderService(), createMemoryApplicableTariffResolver());
    await assert.rejects(
      () => (op === "update" ? service.update(ctx, wo.id, item.id, { quantity: 3 }) : service.delete(ctx, wo.id, item.id)),
      hasReason(422, "item_invoiced"),
      op,
    );
    const after = await real.findById(ctx.tenantId, wo.id, item.id);
    assert.ok(after?.invoicedAt instanceof Date, `${op}: o item segue carimbado`);
    assert.equal(after?.totalAmount, 100, `${op}: o item segue intacto`);
  }
});

test("[B-SAN3-02][T-M4c] CAS do repositório InMemory: update/softDelete diretos num item carimbado devolvem undefined e não mexem", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const item = await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 100 });
  await s.invoicing.invoice(ctx, wo.id, {});
  const repo = getMemoryWorkOrderFinancialRepositoryForTests();
  assert.equal(await repo.update({ tenantId: ctx.tenantId, workOrderId: wo.id, itemId: item.id, quantity: 9, totalAmount: 900 }), undefined);
  assert.equal(await repo.softDelete(ctx.tenantId, wo.id, item.id, ctx.userId), undefined);
  const after = await repo.findById(ctx.tenantId, wo.id, item.id);
  assert.equal(after?.totalAmount, 100);
  assert.equal(after?.deletedAt, undefined);
});

// ---------- K3 — o delta vira título COMPLEMENTAR ----------

test("[B-SAN3-02][T-C1m] o delta: item lançado depois do 1º faturamento → 201 COMPLEMENTAR só com ele; o original não muda", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS", customerName: "Cliente Alfa" });
  const old = await s.financials.create(ctx, wo.id, { source: "manual", description: "Guincho", unit_amount: 300 });
  const first = await s.invoicing.invoice(ctx, wo.id, {});
  const before = await s.titles.get(ctx, first.title.id);
  const fresh = await s.financials.create(ctx, wo.id, { source: "manual", description: "Extra", unit_amount: 45.5 });

  const second = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(second.title.parentTitleId, first.title.id);
  assert.equal(second.parentTitleId, first.title.id);
  assert.equal(second.title.amount, 45.5);
  assert.equal(second.totalAmount, 45.5);
  assert.equal(second.invoicedItemCount, 1);
  assert.equal(second.title.workOrderId, wo.id);
  assert.equal(first.parentTitleId, undefined, "o 1º faturamento é ORIGINAL");
  assert.equal(first.title.parentTitleId, undefined);

  const after = await s.titles.get(ctx, first.title.id);
  assert.equal(after.amount, before.amount);
  assert.equal(after.status, before.status);
  assert.equal(after.paidAmount, before.paidAmount);
  assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime(), "o original não foi tocado");

  const items = (await s.financials.list(ctx, wo.id)).items;
  assert.equal(items.find((i) => i.id === old.id)?.titleId, first.title.id);
  assert.equal(items.find((i) => i.id === fresh.id)?.titleId, second.title.id);
  assert.equal((await s.titles.list(ctx, {})).total, 2);
});

test("[B-SAN3-02][T-C2] terceiro delta: o pai é SEMPRE o original, nunca o complementar anterior", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 10 });
  const t1 = await s.invoicing.invoice(ctx, wo.id, {});
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 20 });
  const t2 = await s.invoicing.invoice(ctx, wo.id, {});
  await s.financials.create(ctx, wo.id, { source: "manual", description: "C", unit_amount: 30 });
  const t3 = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(t2.title.parentTitleId, t1.title.id);
  assert.equal(t3.title.parentTitleId, t1.title.id, "T3 aponta o ORIGINAL (T1), não o T2");
  assert.equal(t3.title.amount, 30);
});

test("[B-SAN3-02][T-C3] original PAGO: o delta nasce complementar e o original continua pago", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 80 });
  const t1 = await s.invoicing.invoice(ctx, wo.id, {});
  await s.titles.applyPayment(ctx, t1.title.id, 80);
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 15 });
  const t2 = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(t2.title.parentTitleId, t1.title.id);
  const paid = await s.titles.get(ctx, t1.title.id);
  assert.equal(paid.status, "paid");
  assert.equal(paid.paidAmount, 80);
});

test("[B-SAN3-02][T-C4] original REMOVIDO sem complementar: o próximo faturamento nasce ORIGINAL; os itens antigos seguem no T1", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  const old = await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 40 });
  const t1 = await s.invoicing.invoice(ctx, wo.id, {});
  await s.titles.delete(ctx, t1.title.id);
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 25 });
  const t2 = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(t2.title.parentTitleId, undefined, "sem original ativo → nasce ORIGINAL");
  assert.equal(t2.title.amount, 25, "os itens carimbados no T1 não entram");
  const items = (await s.financials.list(ctx, wo.id)).items;
  assert.equal(items.find((i) => i.id === old.id)?.titleId, t1.title.id);
});

test("[B-SAN3-02][T-C9a] original removido COM complementar ativo + item novo → nasce ORIGINAL (o complementar não vira pai)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 40 });
  const t1 = await s.invoicing.invoice(ctx, wo.id, {});
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 10 });
  const t2 = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(t2.title.parentTitleId, t1.title.id);
  await s.titles.delete(ctx, t1.title.id);
  await s.financials.create(ctx, wo.id, { source: "manual", description: "C", unit_amount: 7 });
  const t3 = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(t3.title.parentTitleId, undefined, "T3 é ORIGINAL — nunca complementar do T2");
  assert.equal(t3.parentTitleId, undefined);
  assert.equal((await s.titles.get(ctx, t2.title.id)).parentTitleId, t1.title.id, "T2 segue apontando o T1 removido");
});

test("[B-SAN3-02][T-C9b] original removido com complementar ativo e SEM item novo → 422 nothing_to_invoice (não 409)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 40 });
  const t1 = await s.invoicing.invoice(ctx, wo.id, {});
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 10 });
  await s.invoicing.invoice(ctx, wo.id, {});
  await s.titles.delete(ctx, t1.title.id);
  await assert.rejects(() => s.invoicing.invoice(ctx, wo.id, {}), hasReason(422, "nothing_to_invoice"));
});

test("[B-SAN3-02][T-C10] original CANCELADO por status continua sendo o original ativo: o delta nasce complementar dele", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 40 });
  const t1 = await s.invoicing.invoice(ctx, wo.id, {});
  await s.titles.changeStatus(ctx, t1.title.id, { status: "cancelled" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 12 });
  const t2 = await s.invoicing.invoice(ctx, wo.id, {});
  assert.equal(t2.title.parentTitleId, t1.title.id);
  assert.equal((await s.titles.get(ctx, t1.title.id)).status, "cancelled");
});

test("[B-SAN3-02][T-C11] createForWorkOrderInUnit recusa pai de OUTRA OS, de OUTRA direção, REMOVIDO e COMPLEMENTAR → 400 invalid_parent_title_reference", async () => {
  const s = setup();
  const ctx = actor();
  const woA = await s.workOrders.create(ctx, { title: "OS A" });
  const woB = await s.workOrders.create(ctx, { title: "OS B" });
  await s.financials.create(ctx, woB.id, { source: "manual", description: "B", unit_amount: 10 });
  const otherWorkOrder = (await s.invoicing.invoice(ctx, woB.id, {})).title;
  const now = new Date();
  const otherDirection = await getMemoryFinancialTitleRepositoryForTests().create({
    tenantId: ctx.tenantId,
    direction: "payable",
    partyType: "supplier",
    partyName: "Fornecedor",
    amount: 5,
    currency: "BRL",
    issueDate: now,
    dueDate: now,
    status: "open",
    competencia: deriveCompetencia(now),
    workOrderId: woA.id,
  });
  await s.financials.create(ctx, woA.id, { source: "manual", description: "A1", unit_amount: 10 });
  const originalA = (await s.invoicing.invoice(ctx, woA.id, {})).title;
  await s.financials.create(ctx, woA.id, { source: "manual", description: "A2", unit_amount: 10 });
  const complementaryA = (await s.invoicing.invoice(ctx, woA.id, {})).title;
  const woC = await s.workOrders.create(ctx, { title: "OS C" });
  await s.financials.create(ctx, woC.id, { source: "manual", description: "C", unit_amount: 10 });
  const removedC = (await s.invoicing.invoice(ctx, woC.id, {})).title;
  await s.titles.delete(ctx, removedC.id);

  const uow = await createDefaultFinancialUnitOfWork();
  const cases: Array<[string, string, string]> = [
    ["outra OS", otherWorkOrder.id, woA.id],
    ["outra direção", otherDirection.id, woA.id],
    ["removido", removedC.id, woC.id],
    ["complementar", complementaryA.id, woA.id],
  ];
  assert.equal(originalA.parentTitleId, undefined);
  for (const [label, parentTitleId, workOrderId] of cases) {
    const totalBefore = (await s.titles.list(ctx, { include_deleted: true })).total;
    await assert.rejects(
      () =>
        uow.run(ctx.tenantId, (uowCtx) =>
          s.titles.createForWorkOrderInUnit(uowCtx, ctx, {
            workOrderId,
            direction: "receivable",
            partyType: "customer",
            partyName: "X",
            amount: 1,
            currency: "BRL",
            issueDate: now,
            dueDate: now,
            parentTitleId,
          }),
        ),
      hasReason(400, "invalid_parent_title_reference"),
      label,
    );
    assert.equal((await s.titles.list(ctx, { include_deleted: true })).total, totalBefore, `${label}: nada criado`);
  }
});

// ---------- K4 — refaturar o carimbado / 2º original ----------

test("[B-SAN3-02][T-C5] paridade InMemory: um 2º ORIGINAL ativo da OS (createForWorkOrder direto) → 409 work_order_already_invoiced", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 50 });
  await s.invoicing.invoice(ctx, wo.id, {});
  const now = new Date();
  await assert.rejects(
    () =>
      s.titles.createForWorkOrder(ctx, {
        workOrderId: wo.id,
        direction: "receivable",
        partyType: "customer",
        partyName: "X",
        amount: 10,
        currency: "BRL",
        issueDate: now,
        dueDate: now,
      }),
    hasReason(409, "work_order_already_invoiced"),
  );
});

// ---------- Precedência (passo 0) e período ----------

test("[B-SAN3-02][T-PREC] período fechado COM delta → 422 period_closed; nenhum complementar; o item novo segue sem carimbo", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 50 });
  await s.invoicing.invoice(ctx, wo.id, {});
  const fresh = await s.financials.create(ctx, wo.id, { source: "manual", description: "B", unit_amount: 5 });
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(() => s.invoicing.invoice(ctx, wo.id, {}), hasReason(422, "period_closed"));
  assert.equal((await s.titles.list(ctx, {})).total, 1);
  const item = (await s.financials.list(ctx, wo.id)).items.find((i) => i.id === fresh.id);
  assert.equal(item?.invoicedAt, undefined);
});

test("[B-SAN3-02][T-PREC2] replay SEM delta em mês FECHADO → 409 already_invoiced (como hoje, antes do período)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS" });
  await s.financials.create(ctx, wo.id, { source: "manual", description: "A", unit_amount: 50 });
  await s.invoicing.invoice(ctx, wo.id, {});
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(() => s.invoicing.invoice(ctx, wo.id, {}), hasReason(409, "already_invoiced"));
});

test("[B-SAN3-02][T-PREC3] OS vazia em mês FECHADO → 422 nothing_to_invoice (como hoje, antes do período)", async () => {
  const s = setup();
  const ctx = actor();
  const wo = await s.workOrders.create(ctx, { title: "OS vazia" });
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(() => s.invoicing.invoice(ctx, wo.id, {}), hasReason(422, "nothing_to_invoice"));
});

// ---------- Contrato HTTP do complementar ----------

test("[B-SAN3-02][T-C8][rota] finance fatura, lança item e fatura de novo → 201 COMPLEMENTAR com parentTitleId e só o delta", async () => {
  await withInvoicingApi(async ({ baseUrl, seed, createWorkOrder, addManualItem }) => {
    const workOrderId = await createWorkOrder(seed.tenantA, seed.managerA);
    await addManualItem(workOrderId, seed.tenantA, seed.managerA, 250);
    const first = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: {},
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.parentTitleId, null, "o original sai com parentTitleId null");
    await addManualItem(workOrderId, seed.tenantA, seed.managerA, 30);
    const second = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: {},
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.data.parentTitleId, first.body.data.id);
    assert.equal(second.body.data.amount, 30);
    assert.equal(second.body.invoicedTotal, 30);
    assert.equal(second.body.invoicedItemCount, 1);
    assert.equal(second.body.data.tenantId, undefined);
    assert.equal(second.body.data.tenant_id, undefined);
    const replay = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/invoice`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body: {},
    });
    assert.equal(replay.status, 409);
    assert.equal(replay.body.error.reason, "already_invoiced");
    const listed = await requestJson(baseUrl, `/api/v1/financial-titles`, {
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });
    assert.equal(listed.status, 200);
    const complementary = listed.body.items.find((t: { id: string }) => t.id === second.body.data.id);
    assert.equal(complementary?.parentTitleId, first.body.data.id, "a lista de títulos expõe parentTitleId");
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
