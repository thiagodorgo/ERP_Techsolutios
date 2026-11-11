import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-SAN3-23, Emenda 1 e Emenda 1.1 do plano (`crit-23-em1`, EM1-02, EM1-03, EM1-04) — em MEMÓRIA.
//
// A regra (o precedente `FinancialTitleService.changeStatus`): quando o CAS de situação casa 0 linhas, o serviço
// RELÊ a OS e REVALIDA a MESMA operação sobre a situação relida; se continua válida, regrava UMA vez, com o CAS
// sobre a relida; se não, responde o erro do PRÓPRIO check. A 2ª falha responde 409, sem laço.
//
// Tabela da revalidação, por escritor (EM1-03): concluir/mudar situação = escopo por objeto + transição; atribuir =
// trava de técnico + transição; despachar = situação terminal + trava de técnico. O evento da regravação leva a
// situação RELIDA como origem.
//
// O gancho entre a leitura do serviço e a escrita do repositório é um Proxy sobre o repositório de memória: roda
// ANTES da n-ésima chamada do escritor, de forma determinística (nunca relógio). Os testes da unidade de
// cancelamento em memória (EM1-04) usam a corrida natural de `Promise.all`, com atraso de microtarefa variável.
// -----------------------------------------------------------------------------------------------

process.env.CORE_SAAS_PERSISTENCE = "memory";

import {
  createMemoryWorkOrderFinancialService,
  resetWorkOrderFinancialRuntimeForTests,
} from "../src/modules/work-order-financials/work-order-financial.service.js";
import {
  createMemoryWorkOrderService,
  getMemoryWorkOrderRepositoryForTests,
  resetWorkOrderRuntimeForTests,
  WorkOrderService,
} from "../src/modules/work-orders/work-order.service.js";
import type { WorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import type { WorkOrderActorContext, WorkOrderStatus } from "../src/modules/work-orders/work-order.types.js";

type Writer = "changeStatus" | "assign" | "assignFromDispatch";
const WRITERS: readonly Writer[] = ["changeStatus", "assign", "assignFromDispatch"];
const LOOP_GUARD = 5;

function manager(tenantId: string): WorkOrderActorContext {
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
      "work_orders:assign",
      "work_order_financials:read",
      "work_order_financials:create",
      "work_order_financials:update",
    ],
  } as unknown as WorkOrderActorContext;
}

function technician(tenantId: string): WorkOrderActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["field_technician"],
    permissions: ["work_orders:read", "work_orders:status"],
  } as unknown as WorkOrderActorContext;
}

function setup() {
  resetWorkOrderRuntimeForTests();
  resetWorkOrderFinancialRuntimeForTests();
  const tenantId = randomUUID();
  return {
    tenantId,
    boss: manager(tenantId),
    repo: getMemoryWorkOrderRepositoryForTests(),
    workOrders: createMemoryWorkOrderService(),
    financials: createMemoryWorkOrderFinancialService(),
  };
}

type Ctx = ReturnType<typeof setup>;
type Counts = Record<Writer, number>;

/**
 * O serviço REAL sobre um Proxy do repositório de memória. `before[writer][n]` roda antes da n-ésima chamada (1, 2…)
 * daquele escritor; `alwaysMiss` faz os três escritores casarem 0 sempre (o dublê do EM1-02). Mais de `LOOP_GUARD`
 * chamadas a um escritor = laço: falha alto em vez de girar.
 */
function hookedService(ctx: Ctx, options: { before?: Partial<Record<Writer, Record<number, () => Promise<void>>>>; alwaysMiss?: boolean } = {}) {
  const counts: Counts = { changeStatus: 0, assign: 0, assignFromDispatch: 0 };
  const proxy = new Proxy(ctx.repo, {
    get(target, property, receiver) {
      const member = Reflect.get(target, property, receiver);
      if (typeof property === "string" && (WRITERS as readonly string[]).includes(property)) {
        const writer = property as Writer;
        return async (input: unknown) => {
          counts[writer] += 1;
          if (counts[writer] > LOOP_GUARD) throw new Error(`laço: ${writer} chamado ${counts[writer]} vezes`);
          await options.before?.[writer]?.[counts[writer]]?.();
          if (options.alwaysMiss) return undefined;
          return (member as (i: unknown) => Promise<unknown>).call(target, input);
        };
      }
      return typeof member === "function" ? member.bind(target) : member;
    },
  }) as WorkOrderRepository;
  const service = new WorkOrderService(proxy, { hasActiveDispatchAtSite: async () => false });
  return { service, counts };
}

async function newWorkOrder(ctx: Ctx, title = "OS B-SAN3-23"): Promise<string> {
  const workOrder = await ctx.workOrders.create(ctx.boss, { title });
  return workOrder.id;
}

async function setTechnician(ctx: Ctx, workOrderId: string, userId: string): Promise<void> {
  const current = await ctx.repo.findById(ctx.tenantId, workOrderId);
  assert.ok(current);
  const done = await ctx.repo.assignFromDispatch({
    tenantId: ctx.tenantId,
    workOrderId,
    operatorId: userId,
    userId,
    assignedBy: ctx.boss.userId,
    dispatchId: randomUUID(),
    source: "field_dispatch",
    message: "Despacho do arnês.",
    event: { fromStatus: current.status, actorUserId: ctx.boss.userId, message: "Despacho do arnês.", metadata: {} },
  });
  assert.ok(done, "o despacho do arnês gravou");
}

async function setStatus(ctx: Ctx, workOrderId: string, status: WorkOrderStatus): Promise<void> {
  const current = await ctx.repo.findById(ctx.tenantId, workOrderId);
  assert.ok(current);
  const done = await ctx.repo.changeStatus({
    tenantId: ctx.tenantId,
    workOrderId,
    status,
    expectedStatus: current.status,
    message: "Situação do arnês.",
    actorUserId: ctx.boss.userId,
  });
  assert.ok(done, `o arnês levou a OS a ${status}`);
}

async function rejection(promise: Promise<unknown>): Promise<{ statusCode?: number; reason?: string; message?: string }> {
  try {
    await promise;
  } catch (error) {
    return error as { statusCode?: number; reason?: string; message?: string };
  }
  assert.fail("era para recusar e passou");
}

function expectError(error: { statusCode?: number; reason?: string; message?: string }, statusCode: number, reason: string, label: string): void {
  assert.equal(error.statusCode, statusCode, `${label}: status (${error.reason ?? error.message})`);
  assert.equal(error.reason, reason, `${label}: motivo`);
}

async function events(ctx: Ctx, workOrderId: string, eventType: string): Promise<string[]> {
  const timeline = await ctx.repo.listTimeline(ctx.tenantId, workOrderId);
  return timeline.filter((event) => event.eventType === eventType).map((event) => `${event.fromStatus}>${event.toStatus}`);
}

// ------------------------------------------------------------- EM1-02 — uma regravação só, e depois 409

test("[EM1-02] o CAS sempre casa 0: cada escritor é chamado EXATAMENTE 2 vezes (a escrita e UMA regravação) e o serviço responde 409", async () => {
  const ctx = setup();
  // OS `assigned`: as três operações são válidas sobre ela (assigned → accepted; atribuir e despachar de novo).
  const workOrderId = await newWorkOrder(ctx);
  await setTechnician(ctx, workOrderId, randomUUID());
  const { service, counts } = hookedService(ctx, { alwaysMiss: true });

  expectError(await rejection(service.changeStatus(ctx.boss, workOrderId, { status: "accepted" })), 409, "invalid_status_transition", "mudar situação");
  const target = randomUUID();
  expectError(await rejection(service.assign(ctx.boss, workOrderId, { operatorId: target })), 409, "invalid_status_transition", "atribuir");
  expectError(
    await rejection(service.assignFromDispatch(ctx.boss, { workOrderId, operatorUserId: target, dispatchId: randomUUID(), source: "field_dispatch" })),
    409,
    "invalid_status_transition",
    "despachar",
  );
  assert.deepEqual(counts, { changeStatus: 2, assign: 2, assignFromDispatch: 2 });
});

// ------------------------------------------------------------- EM1-03 — a tabela da revalidação, por escritor

test("[EM1-03 · mudar situação · escopo por objeto] o técnico perde a OS entre a leitura e a escrita → 403 not_assigned_to_actor, como em sequência; nada gravado em nome dele", async () => {
  const ctx = setup();
  const t1 = technician(ctx.tenantId);
  const t2 = randomUUID();
  const workOrderId = await newWorkOrder(ctx);
  await setTechnician(ctx, workOrderId, t1.userId);
  await setStatus(ctx, workOrderId, "accepted");
  const { service, counts } = hookedService(ctx, {
    before: {
      changeStatus: {
        1: async () => {
          await setTechnician(ctx, workOrderId, t2);
          await setStatus(ctx, workOrderId, "on_route");
        },
      },
    },
  });

  const error = await rejection(service.changeStatus(t1, workOrderId, { status: "on_route" }));
  expectError(error, 403, "not_assigned_to_actor", "T1 em corrida");
  expectError(await rejection(ctx.workOrders.changeStatus(t1, workOrderId, { status: "on_route" })), 403, "not_assigned_to_actor", "T1 em sequência");
  const after = await ctx.repo.findById(ctx.tenantId, workOrderId);
  assert.equal(after?.assignedUserId, t2);
  assert.notEqual(after?.updatedBy, t1.userId, "nenhuma escrita em nome de T1");
  assert.equal(counts.changeStatus, 1, "a revalidação recusou antes da regravação");
});

test("[EM1-03 · mudar situação · transição] concluir lê in_progress e o cancelamento commita no meio → 409 invalid_status_transition; OS cancelled/zero; item depois → 422", async () => {
  const ctx = setup();
  const workOrderId = await newWorkOrder(ctx);
  await ctx.financials.create(ctx.boss, workOrderId, { source: "manual", description: "Guincho", unit_amount: 200 });
  await setTechnician(ctx, workOrderId, randomUUID());
  for (const status of ["accepted", "on_route", "on_site", "in_progress"] as const) await setStatus(ctx, workOrderId, status);
  const { service, counts } = hookedService(ctx, {
    before: { changeStatus: { 1: async () => void (await ctx.workOrders.cancel(ctx.boss, workOrderId, { reason: "Corrida", financial_decision: "zero" })) } },
  });

  expectError(await rejection(service.changeStatus(ctx.boss, workOrderId, { status: "completed" })), 409, "invalid_status_transition", "concluir");
  const after = await ctx.repo.findById(ctx.tenantId, workOrderId);
  assert.deepEqual([after?.status, after?.financialCancellationDecision], ["cancelled", "zero"]);
  assert.equal(counts.changeStatus, 1);
  expectError(
    await rejection(ctx.financials.create(ctx.boss, workOrderId, { source: "manual", description: "Depois", unit_amount: 10 })),
    422,
    "work_order_cancelled",
    "item depois do cancelamento",
  );
  assert.equal((await ctx.financials.list(ctx.boss, workOrderId)).items.length, 0);
});

test("[EM1-03 · mudar situação · regravação] a situação nova ainda permite a mesma operação → regrava UMA vez; o evento leva a situação RELIDA como origem", async () => {
  const ctx = setup();
  const workOrderId = await newWorkOrder(ctx);
  await setTechnician(ctx, workOrderId, randomUUID());
  const { service, counts } = hookedService(ctx, { before: { changeStatus: { 1: async () => setStatus(ctx, workOrderId, "accepted") } } });

  const updated = await service.changeStatus(ctx.boss, workOrderId, { status: "accepted" });
  assert.equal(updated.status, "accepted");
  assert.equal(counts.changeStatus, 2);
  assert.deepEqual(await events(ctx, workOrderId, "work_order_status_changed"), ["accepted>accepted"]);
});

test("[EM1-03 · atribuir · trava de técnico] o atendimento começa entre a leitura e a escrita → 409 technician_change_requires_authorization, como em sequência", async () => {
  const ctx = setup();
  const x = randomUUID();
  const workOrderId = await newWorkOrder(ctx);
  await setTechnician(ctx, workOrderId, x);
  const { service, counts } = hookedService(ctx, { before: { assign: { 1: async () => setStatus(ctx, workOrderId, "on_site") } } });

  const y = randomUUID();
  expectError(await rejection(service.assign(ctx.boss, workOrderId, { operatorId: y })), 409, "technician_change_requires_authorization", "atribuir em corrida");
  const sequential = hookedService(ctx).service;
  expectError(await rejection(sequential.assign(ctx.boss, workOrderId, { operatorId: y })), 409, "technician_change_requires_authorization", "atribuir em sequência");
  assert.equal((await ctx.repo.findById(ctx.tenantId, workOrderId))?.assignedUserId, x);
  assert.equal(counts.assign, 1);
});

test("[EM1-03 · atribuir · regravação] um despacho legítimo entra no meio → a atribuição revalida sobre `assigned` e regrava UMA vez; o evento dela leva `assigned` como origem", async () => {
  const ctx = setup();
  const workOrderId = await newWorkOrder(ctx);
  const x = randomUUID();
  const { service, counts } = hookedService(ctx, { before: { assign: { 1: async () => setTechnician(ctx, workOrderId, x) } } });

  const y = randomUUID();
  const updated = await service.assign(ctx.boss, workOrderId, { operatorId: y });
  assert.deepEqual([updated.status, updated.assignedOperatorId], ["assigned", y]);
  assert.equal(counts.assign, 2);
  assert.deepEqual(await events(ctx, workOrderId, "work_order_assigned"), ["open>assigned", "assigned>assigned"]);
});

test("[EM1-03 · despachar · terminal] o cancelamento commita no meio → 409 invalid_status_transition; a OS cancelada não ganha técnico", async () => {
  const ctx = setup();
  const workOrderId = await newWorkOrder(ctx);
  const { service, counts } = hookedService(ctx, {
    before: { assignFromDispatch: { 1: async () => void (await ctx.workOrders.cancel(ctx.boss, workOrderId, { reason: "Corrida", financial_decision: "keep" })) } },
  });

  const target = randomUUID();
  expectError(
    await rejection(service.assignFromDispatch(ctx.boss, { workOrderId, operatorUserId: target, dispatchId: randomUUID(), source: "field_dispatch" })),
    409,
    "invalid_status_transition",
    "despachar",
  );
  const after = await ctx.repo.findById(ctx.tenantId, workOrderId);
  assert.deepEqual([after?.status, after?.assignedUserId ?? null], ["cancelled", null]);
  assert.equal(counts.assignFromDispatch, 1);
});

test("[EM1-03 · despachar · trava de técnico] o atendimento do outro técnico começa no meio → 409 technician_change_requires_authorization", async () => {
  const ctx = setup();
  const x = randomUUID();
  const workOrderId = await newWorkOrder(ctx);
  await setTechnician(ctx, workOrderId, x);
  const { service, counts } = hookedService(ctx, { before: { assignFromDispatch: { 1: async () => setStatus(ctx, workOrderId, "on_site") } } });

  const y = randomUUID();
  expectError(
    await rejection(service.assignFromDispatch(ctx.boss, { workOrderId, operatorUserId: y, dispatchId: randomUUID(), source: "field_dispatch_reassign" })),
    409,
    "technician_change_requires_authorization",
    "despachar",
  );
  assert.equal((await ctx.repo.findById(ctx.tenantId, workOrderId))?.assignedUserId, x);
  assert.equal(counts.assignFromDispatch, 1);
});

// ------------------------------------------------------------- EM1-04 — a unidade de cancelamento em memória

async function afterMicrotasks<T>(count: number, work: () => Promise<T>): Promise<T> {
  for (let index = 0; index < count; index += 1) await null;
  return work();
}

test("[EM1-04] cancelar(zero) × atribuir, 20 rodadas, as duas largadas: nunca 404 para OS que existe; nunca itens zerados numa OS que não foi cancelada", async () => {
  const ctx = setup();
  const tally: Record<string, number> = {};
  for (let round = 0; round < 20; round += 1) {
    const workOrderId = await newWorkOrder(ctx, `OS ${round}`);
    await ctx.financials.create(ctx.boss, workOrderId, { source: "manual", description: "Guincho", unit_amount: 100 });
    const cancel = () => ctx.workOrders.cancel(ctx.boss, workOrderId, { reason: "Corrida", financial_decision: "zero" }).then(() => "ok", (e) => `${e.statusCode}/${e.reason}`);
    const assign = () => ctx.workOrders.assign(ctx.boss, workOrderId, { operatorId: randomUUID() }).then(() => "ok", (e) => `${e.statusCode}/${e.reason}`);
    const [c, a] = round % 2 === 0 ? await Promise.all([cancel(), assign()]) : (await Promise.all([assign(), cancel()])).reverse();
    const after = await ctx.repo.findById(ctx.tenantId, workOrderId);
    const active = (await ctx.financials.list(ctx.boss, workOrderId)).items.length;
    const key = `cancel=${c} assign=${a} => ${after?.status}/${after?.financialCancellationDecision ?? null}/ativos=${active}`;
    tally[key] = (tally[key] ?? 0) + 1;
    assert.notEqual(c, "404/not_found", `rodada ${round}: 404 falso (${key})`);
    assert.equal(c, "ok", `rodada ${round}: o cancelamento de uma OS atribuível tem de passar (${key})`);
    assert.deepEqual([after?.status, after?.financialCancellationDecision, active], ["cancelled", "zero", 0], `rodada ${round}: ${key}`);
    assert.ok(a === "ok" || a === "409/invalid_status_transition", `rodada ${round}: atribuir fora do conjunto (${key})`);
  }
});

test("[EM1-04] o CAS da memória compara a OS viva, não um retrato de antes do `await`: cancelar(keep|zero) × concluir/atribuir/despachar com atraso variável, 40 rodadas por par → nunca 'cancelou e não ficou cancelada', nunca 404, nunca decisão em OS não cancelada", async () => {
  const ctx = setup();
  const pairs = ["concluir", "atribuir", "despachar"] as const;
  for (const pair of pairs) {
    for (const decision of ["keep", "zero"] as const) {
      for (let round = 0; round < 40; round += 1) {
        const workOrderId = await newWorkOrder(ctx, `OS ${pair} ${decision} ${round}`);
        if (pair === "concluir") {
          await setTechnician(ctx, workOrderId, randomUUID());
          for (const status of ["accepted", "on_route", "on_site", "in_progress"] as const) await setStatus(ctx, workOrderId, status);
        }
        const other = () => {
          if (pair === "concluir") return ctx.workOrders.changeStatus(ctx.boss, workOrderId, { status: "completed" });
          if (pair === "atribuir") return ctx.workOrders.assign(ctx.boss, workOrderId, { operatorId: randomUUID() });
          return ctx.workOrders.assignFromDispatch(ctx.boss, { workOrderId, operatorUserId: randomUUID(), dispatchId: randomUUID(), source: "field_dispatch" });
        };
        const settle = (p: Promise<unknown>) => p.then(() => "ok", (e) => `${e.statusCode}/${e.reason}`);
        const delayCancel = round % 9;
        const delayOther = (round * 7) % 11;
        const [c, o] = await Promise.all([
          settle(afterMicrotasks(delayCancel, () => ctx.workOrders.cancel(ctx.boss, workOrderId, { reason: "Corrida", financial_decision: decision }))),
          settle(afterMicrotasks(delayOther, other)),
        ]);
        const after = await ctx.repo.findById(ctx.tenantId, workOrderId);
        const label = `${pair}/${decision} rodada ${round}: cancel=${c} outro=${o} => ${after?.status}/${after?.financialCancellationDecision ?? null}`;
        assert.notEqual(c, "404/not_found", `404 falso — ${label}`);
        if (c === "ok") assert.equal(after?.status, "cancelled", `cancelou e não ficou cancelada — ${label}`);
        if (after?.status !== "cancelled") assert.equal(after?.financialCancellationDecision ?? null, null, `decisão em OS não cancelada — ${label}`);
      }
    }
  }
});
