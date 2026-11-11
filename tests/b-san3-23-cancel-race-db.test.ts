import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  waitForOwnBlockedOrSettled,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-23 (item 23 do portão) — cancelamento da OS × escrita financeira, em PostgreSQL REAL.
//
// A propriedade (P-23, com o alcance da crítica r2, C23R2-08): a linha da OS serializa o cancelamento com toda
// escrita que CRIA, ALTERA ou APAGA item financeiro da OS e com todo FATURAMENTO (o único caminho que cria título
// com `work_order_id`). O cancelamento é uma unidade sob a trava exclusiva da OS (relê a situação, confere "há item
// faturado?" e zera no `zero`, muda a situação e grava o evento, tudo junto); a escrita de item e o faturamento
// relêem a situação sob a trava compartilhada da OS. E (P-23.4, Q1 = A do dono) nenhum escritor de situação grava
// sobre uma situação diferente da que validou.
//
// Arnês (padrão de `b-san3-12a-title-mutation-race-db.test.ts`): o VENCEDOR é SQL próprio numa transação aberta,
// com portão de commit, e informa o próprio pid; o PERDEDOR é o serviço real. A barreira é
// `waitForOwnBlockedOrSettled`: espera o perdedor bloqueado ATRÁS DO VENCEDOR (`pg_blocking_pids`), ou resolvido,
// sem filtro de texto (R-03), escopada pelo `application_name` da suíte. Nunca relógio como sincronização; os
// 6,5 s da A11/A12 são o cenário (uma trava mais longa que os 5 s do `$transaction`), contados DEPOIS da barreira.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("b-san3-23-cancel-race");
const HOLD_PAST_TX_TIMEOUT_MS = 6_500;

type Actor = { tenantId: string; userId: string; roles: string[]; permissions: string[] };
type Seed = { tenantId: string; userId: string; workOrderId: string; status: string; itemIds: string[]; actor: Actor };

const PERMISSIONS = [
  "work_orders:read",
  "work_orders:update",
  "work_orders:cancel",
  "work_orders:assign",
  "work_order_financials:read",
  "work_order_financials:create",
  "work_order_financials:update",
  "financial_titles:read",
  "financial_titles:create",
];

if (!connectionString) {
  test("B-SAN3-23 (cancelamento × escrita financeira sob Postgres) exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação: o modo e a tag da suíte (src/database/prisma.ts lê a URL no import).
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  const connection = withApplicationName(connectionString, applicationName);
  process.env.DATABASE_URL = connection;

  before(async () => {
    await bootstrap(connection);
  });
  after(async () => {
    await harness?.close();
  });

  // ------------------------------------------------------------- P-23.2 — escrita de item e faturamento

  test("[A1] lançar item × cancelamento em voo → o lançamento espera a OS e sai 422 work_order_cancelled; 0 item ativo", async (t) => {
    const s = await seed("a1");
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "keep"));
    const { barrier, won, lost } = await race(winner, () => h.financials.create(s.actor, s.workOrderId, manualItemBody()), "lançar atrás do cancelamento");
    const state = await osState(s);
    t.diagnostic(`[A1] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectNoDeadlock(lost);
    expectReason(lost, 422, "work_order_cancelled", "lançar perdedor");
    assert.equal(state.status, "cancelled");
    assert.equal(state.ativos, 0, "nenhum item ativo numa OS cancelada");
  });

  test("[A5] faturar × cancelamento em voo → o faturamento espera a OS e sai 422 work_order_cancelled; 0 título, 0 item faturado", async (t) => {
    const s = await seed("a5", { items: [100, 20] });
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "keep"));
    const { barrier, won, lost } = await race(winner, () => h.invoicing.invoice(s.actor, s.workOrderId, {}), "faturar atrás do cancelamento");
    const state = await osState(s);
    t.diagnostic(`[A5] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectNoDeadlock(lost);
    expectReason(lost, 422, "work_order_cancelled", "faturar perdedor");
    assert.equal(state.titulos, 0, "nenhum título numa OS cancelada");
    assert.equal(state.faturados, 0, "nenhum item faturado");
  });

  test("[A6a] editar item × cancelamento em voo → a edição espera a OS e sai 422 work_order_cancelled; o item fica intacto", async (t) => {
    const s = await seed("a6a", { items: [100] });
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "keep"));
    const { barrier, won, lost } = await race(winner, () => h.financials.update(s.actor, s.workOrderId, s.itemIds[0]!, { quantity: 3 }), "editar atrás do cancelamento");
    const item = await itemRow(s.itemIds[0]!);
    t.diagnostic(`[A6a] barreira=${barrier} | perdedor=${describe(lost)} | quantidade=${Number(item.quantity)} total=${Number(item.total_amount)}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectNoDeadlock(lost);
    expectReason(lost, 422, "work_order_cancelled", "editar perdedor");
    assert.equal(Number(item.quantity), 1, "a quantidade não mudou");
    assert.equal(Number(item.total_amount), 100, "o total não mudou");
  });

  test("[A6b] apagar item × cancelamento em voo → a exclusão espera a OS e sai 422 work_order_cancelled; o item segue ativo", async (t) => {
    const s = await seed("a6b", { items: [100] });
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "keep"));
    const { barrier, won, lost } = await race(winner, () => h.financials.delete(s.actor, s.workOrderId, s.itemIds[0]!), "apagar atrás do cancelamento");
    const item = await itemRow(s.itemIds[0]!);
    t.diagnostic(`[A6b] barreira=${barrier} | perdedor=${describe(lost)} | apagado=${item.deleted_at !== null}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectNoDeadlock(lost);
    expectReason(lost, 422, "work_order_cancelled", "apagar perdedor");
    assert.equal(item.deleted_at, null, "o item não foi apagado");
  });

  test("[A8] A1 sob papel NOSUPERUSER sem BYPASSRLS → a trava compartilhada funciona sob RLS: 422 work_order_cancelled; 0 item ativo", async (t) => {
    const s = await seed("a8");
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "keep"));
    const { barrier, won, lost } = await race(winner, () => h.roleFinancials.create(s.actor, s.workOrderId, manualItemBody()), "lançar (papel efêmero) atrás do cancelamento");
    const state = await osState(s);
    t.diagnostic(`[A8] papel=${h.role.roleName} | barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectNoDeadlock(lost);
    expectReason(lost, 422, "work_order_cancelled", "lançar perdedor sob o papel");
    assert.equal(state.ativos, 0);
  });

  // ------------------------------------------------------------- P-23.1 — o cancelamento como unidade

  test("[A2] cancelar(zero) × INSERT cru de item em voo → o cancelamento espera a OS, enxerga o item e o zera; 0 item ativo", async (t) => {
    const s = await seed("a2");
    const winner = await holdWinner(s, (tx) => rawInsertItem(tx, s, 50));
    const { barrier, won, lost } = await race(winner, () => h.workOrders.cancel(s.actor, s.workOrderId, cancelBody("zero")), "cancelar atrás do INSERT cru");
    const state = await osState(s);
    t.diagnostic(`[A2] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (INSERT cru)");
    expectNoDeadlock(lost);
    expectFulfilled(lost, "cancelamento");
    assert.deepEqual([state.status, state.decisao], ["cancelled", "zero"]);
    assert.equal(state.ativos, 0, "o zero alcançou o item commitado antes dele");
  });

  test("[A3] item travado × cancelar(zero) × lançar → o lançamento espera o cancelamento na OS e sai 422 work_order_cancelled; 0 item ativo", async (t) => {
    const s = await seed("a3", { items: [100] });
    const winner = await holdWinner(s, async (tx) => {
      await tx.$queryRaw`SELECT id FROM work_order_financial_items WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.itemIds[0]}::uuid FOR UPDATE`;
    });
    const cancelling = captureSettled(h.workOrders.cancel(s.actor, s.workOrderId, cancelBody("zero")));
    let first = "";
    let second = "";
    let creating: Promise<SettledOutcome<unknown>> = Promise.resolve({ status: "fulfilled", value: undefined });
    try {
      first = await waitForOwnBlockedOrSettled(h.admin, { applicationName, blockedBy: winner.pid, loser: cancelling, label: "cancelar(zero) atrás do item travado" });
      creating = captureSettled(h.financials.create(s.actor, s.workOrderId, manualItemBody()));
      second = await waitForOwnBlockedOrSettled(h.admin, { applicationName, minBlocked: 2, loser: creating, label: "lançar atrás do cancelamento" });
    } finally {
      // Barreira em timeout também solta o vencedor (sem transação pendurada).
      winner.release();
    }
    const won = await winner.done;
    const [cancelled, created] = [await cancelling, await creating];
    const state = await osState(s);
    t.diagnostic(`[A3] barreira1=${first} | barreira2=${second} | cancelar=${describe(cancelled)} | lançar=${describe(created)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (item travado)");
    expectNoDeadlock(cancelled);
    expectNoDeadlock(created);
    expectFulfilled(cancelled, "cancelamento");
    expectReason(created, 422, "work_order_cancelled", "lançar perdedor 2");
    assert.equal(state.status, "cancelled");
    assert.equal(state.ativos, 0);
  });

  test("[A4] atomicidade: o evento do cancelamento falha → nada persiste (OS na situação anterior, decisão NULL, 2 itens ativos, 0 evento)", async (t) => {
    const s = await seed("a4", { items: [100, 20] });
    const outcome = await withFailingCancelEvent(s, () => captureSettled(h.workOrders.cancel(s.actor, s.workOrderId, cancelBody("zero"))));
    const state = await osState(s);
    t.diagnostic(`[A4] cancelar=${describe(outcome)} | estado=${JSON.stringify(state)}`);
    assert.equal(outcome.status, "rejected", "o cancelamento tinha de falhar com o evento");
    assert.ok(flatten((outcome as { reason: unknown }).reason).includes(INJECTED_EVENT_MARK), "a recusa veio da falha injetada");
    assert.deepEqual(
      { status: state.status, decisao: state.decisao, ativos: state.ativos, eventos: state.eventos },
      { status: "open", decisao: null, ativos: 2, eventos: 0 },
    );
  });

  test("[A9] cancelar(zero) × faturamento em voo (protocolo novo) → o cancelamento espera a OS, vê o faturado e sai 422 has_invoiced_items; I-Z", async (t) => {
    const s = await seed("a9", { items: [100, 20] });
    const winner = await holdWinner(s, (tx) => rawInvoiceNewProtocol(tx, s, 120));
    const { barrier, won, lost } = await race(winner, () => h.workOrders.cancel(s.actor, s.workOrderId, cancelBody("zero")), "cancelar(zero) atrás do faturamento");
    const state = await osState(s);
    t.diagnostic(`[A9] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (faturamento)");
    expectNoDeadlock(lost);
    expectReason(lost, 422, "has_invoiced_items", "cancelar(zero) perdedor");
    assert.deepEqual([state.status, state.decisao], ["open", null], "a OS segue na situação anterior");
    assert.deepEqual([state.titulos, state.faturados], [1, 2]);
    assertInvariantIZ(state, "A9");
  });

  // ------------------------------------------------------------- P-23.3 — ordem total das travas

  test("[A10] ordem: OS travada pelo cancelamento, faturamento atrás dela; o cancelamento pede os itens e commita → 0 impasse, faturar 422 work_order_cancelled", async (t) => {
    const s = await seed("a10", { items: [100, 20] });
    const winner = await holdWinner(
      s,
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM work_orders WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.workOrderId}::uuid FOR UPDATE`;
      },
      async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM work_order_financial_items
           WHERE tenant_id = ${s.tenantId}::uuid AND work_order_id = ${s.workOrderId}::uuid AND deleted_at IS NULL
           ORDER BY created_at, id
             FOR UPDATE
        `;
        await cancelRow(tx, s, "keep");
      },
    );
    const { barrier, won, lost } = await race(winner, () => h.invoicing.invoice(s.actor, s.workOrderId, {}), "faturar atrás da OS travada");
    const state = await osState(s);
    t.diagnostic(`[A10] barreira=${barrier} | vencedor=${describe(won)} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectNoDeadlock(won);
    expectNoDeadlock(lost);
    expectFulfilled(won, "vencedor (cancelamento que pede os itens depois da OS)");
    expectReason(lost, 422, "work_order_cancelled", "faturar perdedor");
    assert.equal(state.titulos, 0);
  });

  test("[A7] regressão N=20 sem barreira: cancelar(zero) × lançar, × faturar e × editar → 0 impasse; OS cancelada/zero sem item ativo; I-Z", async (t) => {
    const base = await seed("a7");
    const pairs: Array<{ name: string; items: number[]; other: (s: Seed) => Promise<unknown>; otherOk: Array<[number, string]>; cancelOk: Array<[number, string]> }> = [
      { name: "lançar", items: [], other: (s) => h.financials.create(s.actor, s.workOrderId, manualItemBody()), otherOk: [[422, "work_order_cancelled"]], cancelOk: [] },
      { name: "faturar", items: [100, 20], other: (s) => h.invoicing.invoice(s.actor, s.workOrderId, {}), otherOk: [[422, "work_order_cancelled"]], cancelOk: [[422, "has_invoiced_items"]] },
      { name: "editar", items: [100], other: (s) => h.financials.update(s.actor, s.workOrderId, s.itemIds[0]!, { quantity: 2 }), otherOk: [[422, "work_order_cancelled"]], cancelOk: [] },
    ];
    const tally: Record<string, Record<string, number>> = {};
    for (const pair of pairs) {
      tally[pair.name] = {};
      for (let round = 0; round < 20; round += 1) {
        const s = await newWorkOrderIn(base, `a7-${pair.name}-${round}`, { items: pair.items });
        const [cancelled, other] = await Promise.all([
          captureSettled(h.workOrders.cancel(s.actor, s.workOrderId, cancelBody("zero"))),
          captureSettled(pair.other(s)),
        ]);
        const key = `${describe(cancelled)} × ${describe(other)}`;
        tally[pair.name]![key] = (tally[pair.name]![key] ?? 0) + 1;
        expectNoDeadlock(cancelled);
        expectNoDeadlock(other);
        expectFulfilledOrReason(cancelled, pair.cancelOk, `rodada ${round} (${pair.name}): cancelar`);
        expectFulfilledOrReason(other, pair.otherOk, `rodada ${round} (${pair.name}): ${pair.name}`);
        const state = await osState(s);
        if (state.status === "cancelled") {
          assert.equal(state.ativosNaoFat, 0, `rodada ${round} (${pair.name}): OS cancelada/zero com item ativo não faturado ${JSON.stringify(state)}`);
        }
        assertInvariantIZ(state, `rodada ${round} (${pair.name})`);
      }
    }
    t.diagnostic(`[A7] desfechos=${JSON.stringify(tally)}`);
  });

  // ------------------------------------------------------------- R-08 — espera longa vira 503, nunca 500

  for (const [id, label, act] of [
    ["A11", "lançar", (s: Seed) => h.financials.create(s.actor, s.workOrderId, manualItemBody())],
    ["A11b", "editar", (s: Seed) => h.financials.update(s.actor, s.workOrderId, s.itemIds[0]!, { quantity: 3 })],
    ["A11c", "apagar", (s: Seed) => h.financials.delete(s.actor, s.workOrderId, s.itemIds[0]!)],
  ] as const) {
    test(`[${id}] ${label} item × UPDATE da OS segurado 6,5 s depois da barreira → 503 work_order_financial_transient_conflict; nada persiste`, async (t) => {
      const s = await seed(id.toLowerCase(), { items: id === "A11" ? [] : [100] });
      const winner = await holdWinner(s, async (tx) => {
        await tx.$executeRaw`UPDATE work_orders SET priority = 'high' WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.workOrderId}::uuid`;
      });
      const { barrier, won, lost } = await race(winner, () => act(s), `${label} atrás do UPDATE da OS`, { holdAfterBlockedMs: HOLD_PAST_TX_TIMEOUT_MS });
      const state = await osState(s);
      const item = s.itemIds[0] ? await itemRow(s.itemIds[0]) : undefined;
      t.diagnostic(`[${id}] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)} | item=${item ? `${Number(item.quantity)}/${item.deleted_at !== null}` : "-"}`);
      expectFulfilled(won, "vencedor (UPDATE da OS)");
      expectReason(lost, 503, "work_order_financial_transient_conflict", `${label} perdedor`);
      if (id === "A11") assert.equal(state.ativos, 0, "nenhum item novo");
      if (item) {
        assert.equal(Number(item.quantity), 1, "a quantidade não mudou");
        assert.equal(item.deleted_at, null, "o item não foi apagado");
      }
    });
  }

  test("[A12] cancelar × trava compartilhada da OS segurada 6,5 s depois da barreira → 503 work_order_cancel_transient_conflict; nada persiste", async (t) => {
    const s = await seed("a12");
    const winner = await holdWinner(s, async (tx) => {
      await tx.$queryRaw`SELECT id FROM work_orders WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.workOrderId}::uuid FOR SHARE`;
    });
    const { barrier, won, lost } = await race(winner, () => h.workOrders.cancel(s.actor, s.workOrderId, cancelBody("keep")), "cancelar atrás da trava compartilhada", { holdAfterBlockedMs: HOLD_PAST_TX_TIMEOUT_MS });
    const state = await osState(s);
    t.diagnostic(`[A12] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (trava compartilhada)");
    expectReason(lost, 503, "work_order_cancel_transient_conflict", "cancelar perdedor");
    assert.deepEqual({ status: state.status, decisao: state.decisao, eventos: state.eventos }, { status: "open", decisao: null, eventos: 0 });
  });

  // ------------------------------------------------------------- P-23.4 (Q1 = A) — CAS de situação

  test("[A13] concluir × cancelamento(zero) em voo → o concluir não sobrescreve: 409 invalid_status_transition; OS cancelled/zero", async (t) => {
    const s = await seed("a13", { status: "in_progress" });
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "zero"));
    const { barrier, won, lost } = await race(winner, () => h.workOrders.changeStatus(s.actor, s.workOrderId, { status: "completed" }), "concluir atrás do cancelamento");
    const state = await osState(s);
    t.diagnostic(`[A13] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectReason(lost, 409, "invalid_status_transition", "concluir perdedor");
    assert.deepEqual([state.status, state.decisao], ["cancelled", "zero"]);
  });

  test("[A14] atribuir × cancelamento(zero) em voo → a atribuição não sobrescreve: 409 invalid_status_transition; OS cancelled, 0 atribuição", async (t) => {
    const s = await seed("a14");
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "zero"));
    const { barrier, won, lost } = await race(winner, () => h.workOrders.assign(s.actor, s.workOrderId, { operatorId: randomUUID() }), "atribuir atrás do cancelamento");
    const state = await osState(s);
    t.diagnostic(`[A14] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectReason(lost, 409, "invalid_status_transition", "atribuir perdedor");
    assert.equal(state.status, "cancelled");
    assert.equal(state.atribuicoes, 0, "nenhuma linha nova em work_order_assignments");
  });

  test("[A15] despachar × cancelamento(zero) em voo → o despacho não sobrescreve: 409 invalid_status_transition; OS cancelled, 0 atribuição", async (t) => {
    const s = await seed("a15");
    const winner = await holdWinner(s, (tx) => lockAndCancel(tx, s, "zero"));
    const { barrier, won, lost } = await race(winner, () => h.workOrders.assignFromDispatch(s.actor, dispatchInput(s)), "despachar atrás do cancelamento");
    const state = await osState(s);
    t.diagnostic(`[A15] barreira=${barrier} | perdedor=${describe(lost)} | estado=${JSON.stringify(state)}`);
    expectFulfilled(won, "vencedor (cancelamento)");
    expectReason(lost, 409, "invalid_status_transition", "despachar perdedor");
    assert.equal(state.status, "cancelled");
    assert.equal(state.atribuicoes, 0);
  });

  test("[A15b] (C23R2-01) o cancelamento commita entre a leitura do serviço e o repositório do despacho → a OS cancelada não ganha técnico: 409; 0 atribuição", async (t) => {
    const s = await seed("a15b");
    let midCancel: SettledOutcome<unknown> | undefined;
    const hooked = h.workOrdersWith({
      // Roda entre a checagem de situação do serviço e a escrita do repositório (work-order.service.ts, assignFromDispatch).
      resolveActorOperatorProfileId: async () => {
        midCancel = await captureSettled(h.workOrders.cancel(s.actor, s.workOrderId, cancelBody("keep")));
        return undefined;
      },
      hasActiveDispatchAtSite: async () => false,
    });
    const lost = await captureSettled(hooked.assignFromDispatch(s.actor, dispatchInput(s)));
    const state = await osState(s);
    t.diagnostic(`[A15b] cancelamento no meio=${midCancel ? describe(midCancel) : "não rodou"} | despachar=${describe(lost)} | estado=${JSON.stringify(state)}`);
    assert.ok(midCancel, "o gancho rodou o cancelamento no meio");
    expectFulfilled(midCancel, "cancelamento no meio");
    expectReason(lost, 409, "invalid_status_transition", "despachar depois do cancelamento");
    assert.deepEqual({ status: state.status, decisao: state.decisao, tecnico: state.tecnico, atribuicoes: state.atribuicoes }, { status: "cancelled", decisao: "keep", tecnico: null, atribuicoes: 0 });
  });
}

// ------------------------------------------------------------------------------------------- arnês

type Harness = Awaited<ReturnType<typeof bootstrap>>;
let harness: Harness | undefined;

function hx(): Harness {
  assert.ok(harness, "arnês não inicializado");
  return harness;
}

// Atalho dos testes e helpers: o arnês do arquivo, criado no `before`.
const h = new Proxy({} as Harness, { get: (_target, property) => (hx() as never)[property] });

async function bootstrap(connection: string) {
  const [
    { PrismaPg },
    { PrismaClient },
    { env },
    { withTenantRls },
    titles,
    itemPrisma,
    financialService,
    workOrderService,
    workOrderPrisma,
    { createPrismaApplicableTariffResolver },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/config/env.js"),
    import("../src/database/rls.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/work-order-financials/work-order-financial-prisma.repository.js"),
    import("../src/modules/work-order-financials/work-order-financial.service.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/work-orders/work-order-prisma.repository.js"),
    import("../src/modules/service-quotes/service-quote.service.js"),
  ]);
  assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "assert do modo: esta suíte só é prova no caminho prisma");

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  await assertApplicationNamePropagated(admin, applicationName);
  const role: EphemeralRole = await createEphemeralRole(admin as never, connection);

  const workOrders = await workOrderService.createDefaultWorkOrderService();
  const workOrderRepository = await workOrderPrisma.createPrismaWorkOrderRepository();
  const tariffResolver = await createPrismaApplicableTariffResolver();
  const tenantIds: string[] = [];

  const built = {
    admin: admin as any,
    role,
    withTenantRls,
    deriveCompetencia: titles.deriveCompetencia as (date: Date) => string,
    workOrders,
    // O serviço de OS REAL sobre o repositório Prisma real, com os resolvedores que o teste injeta (A15b).
    workOrdersWith: (references: Record<string, unknown>) => new workOrderService.WorkOrderService(workOrderRepository, references as never),
    financials: await financialService.createDefaultWorkOrderFinancialService(),
    invoicing: await financialService.createDefaultWorkOrderInvoicingService(),
    // A8 — o serviço financeiro com o repositório sobre o PAPEL EFÊMERO (NOSUPERUSER, sem BYPASSRLS).
    roleFinancials: new financialService.WorkOrderFinancialService(
      new itemPrisma.RlsPrismaWorkOrderFinancialItemRepository(role.client as never),
      workOrders,
      tariffResolver,
    ),
    tenantIds,
    async close(): Promise<void> {
      try {
        for (const tenantId of tenantIds) {
          await admin.$executeRawUnsafe("DELETE FROM work_order_financial_items WHERE tenant_id = $1::uuid", tenantId);
          // Complementares antes dos originais (a FK do pai é RESTRICT).
          await admin.$executeRawUnsafe("DELETE FROM financial_titles WHERE tenant_id = $1::uuid AND parent_title_id IS NOT NULL", tenantId);
          for (const table of [
            "financial_entries",
            "financial_titles",
            "financial_period_closes",
            "work_order_events",
            "work_order_assignments",
            "audit_logs",
            "cloud_usage_events",
            "work_orders",
            "users",
          ]) {
            await admin.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = $1::uuid`, tenantId);
          }
          await admin.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
        }
      } finally {
        await role.drop();
        await admin.$disconnect();
      }
    },
  };
  harness = built;
  return built;
}

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function seed(tag: string, options: { status?: string; items?: number[] } = {}): Promise<Seed> {
  const marca = `${tag}-${suffix()}`;
  const tenant = await h.admin.tenant.create({ data: { name: `SAN3-23 ${marca}`, slug: `san323-${marca}` } });
  h.tenantIds.push(tenant.id);
  const user = await h.withTenantRls(h.admin, tenant.id, (tx: any) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "Gestor B-SAN3-23", email: `san323-${marca}@example.com` } }),
  );
  const actor: Actor = { tenantId: tenant.id, userId: user.id, roles: ["manager"], permissions: PERMISSIONS };
  return newWorkOrderIn({ tenantId: tenant.id, userId: user.id, workOrderId: "", status: "", itemIds: [], actor }, marca, options);
}

async function newWorkOrderIn(base: Seed, marca: string, options: { status?: string; items?: number[] } = {}): Promise<Seed> {
  const status = options.status ?? "open";
  const workOrder = await h.admin.workOrder.create({
    data: { tenant_id: base.tenantId, code: `WO-${marca}`, title: `OS ${marca}`, customer_name: "Cliente B-SAN3-23", status },
  });
  const itemIds: string[] = [];
  for (const [index, amount] of (options.items ?? []).entries()) {
    const item = await h.admin.workOrderFinancialItem.create({
      data: {
        tenant_id: base.tenantId,
        work_order_id: workOrder.id,
        description: `Item ${index + 1}`,
        quantity: 1,
        unit_amount: amount,
        total_amount: amount,
        currency: "BRL",
        source: "manual",
      },
    });
    itemIds.push(item.id as string);
  }
  return { ...base, workOrderId: workOrder.id, status, itemIds };
}

function manualItemBody() {
  return { source: "manual", description: "Pedágio da corrida", unit_amount: 15, quantity: 1 };
}

function cancelBody(decision: "keep" | "zero") {
  return { reason: "Cancelamento da corrida B-SAN3-23", financial_decision: decision };
}

function dispatchInput(s: Seed) {
  return { workOrderId: s.workOrderId, operatorUserId: s.userId, dispatchId: randomUUID(), source: "field_dispatch" as const };
}

type TxClient = {
  $executeRaw: (q: TemplateStringsArray, ...v: unknown[]) => Promise<number>;
  $queryRaw: (q: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
};
type Winner = { readonly pid: number; readonly release: () => void; readonly done: Promise<SettledOutcome<unknown>> };

function barrierGate() {
  let ready!: () => void;
  let go!: () => void;
  const isReady = new Promise<void>((resolve) => (ready = resolve));
  const mayGo = new Promise<void>((resolve) => (go = resolve));
  return { ready, go, isReady, mayGo };
}

/**
 * O VENCEDOR: SQL próprio numa transação aberta com o contexto da organização. `held` roda antes do portão
 * (é o que o perdedor encontra travado); `afterRelease`, se houver, roda depois do portão e antes do commit (A10).
 */
async function holdWinner(s: Seed, held: (tx: TxClient) => Promise<unknown>, afterRelease?: (tx: TxClient) => Promise<unknown>): Promise<Winner> {
  const gate = barrierGate();
  let pid = 0;
  const done = captureSettled(
    h.admin.$transaction(
      async (tx: TxClient) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${s.tenantId}, true)`;
        const rows = (await tx.$queryRaw`SELECT pg_backend_pid() AS pid`) as Array<{ pid: number }>;
        pid = Number(rows[0]!.pid);
        await held(tx);
        gate.ready();
        await gate.mayGo;
        if (afterRelease) await afterRelease(tx);
      },
      { maxWait: 10_000, timeout: 60_000 },
    ),
  );
  await Promise.race([
    gate.isReady,
    done.then((outcome) => {
      throw new Error(`o vencedor terminou antes da barreira: ${describe(outcome)}`);
    }),
  ]);
  return { pid, release: gate.go, done };
}

/** Perdedor contra um vencedor: barreira causal (atrás do pid do vencedor) ou resolvido; depois solta o vencedor. */
async function race(winner: Winner, act: () => Promise<unknown>, label: string, options: { holdAfterBlockedMs?: number } = {}) {
  const lost = captureSettled(act());
  let barrier: string;
  try {
    barrier = await waitForOwnBlockedOrSettled(h.admin, { applicationName, blockedBy: winner.pid, loser: lost, label });
    if (options.holdAfterBlockedMs && barrier.startsWith("bloqueado")) {
      // O cenário (não sincronização): a trava do vencedor dura mais que os 5 s do `$transaction` do perdedor, que já
      // está DENTRO da transação dele (a barreira o viu bloqueado). Contar daqui dá margem garantida de 1,5 s.
      await new Promise((resolve) => setTimeout(resolve, options.holdAfterBlockedMs));
    }
  } finally {
    // Barreira em timeout também solta o vencedor: o caso falha com o diagnóstico e não deixa transação pendurada.
    winner.release();
  }
  const won = await winner.done;
  return { barrier, won, lost: await lost };
}

async function lockAndCancel(tx: TxClient, s: Seed, decision: "keep" | "zero"): Promise<void> {
  await tx.$queryRaw`SELECT id FROM work_orders WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.workOrderId}::uuid FOR UPDATE`;
  await cancelRow(tx, s, decision);
}

async function cancelRow(tx: TxClient, s: Seed, decision: "keep" | "zero"): Promise<void> {
  await tx.$executeRaw`
    UPDATE work_orders
       SET status = 'cancelled', financial_cancellation_decision = ${decision},
           cancellation_reason = 'Cancelamento do vencedor B-SAN3-23', cancelled_at = now()
     WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.workOrderId}::uuid
  `;
  if (decision === "zero") {
    await tx.$executeRaw`
      UPDATE work_order_financial_items SET deleted_at = now()
       WHERE tenant_id = ${s.tenantId}::uuid AND work_order_id = ${s.workOrderId}::uuid AND deleted_at IS NULL AND invoiced_at IS NULL
    `;
  }
}

async function rawInsertItem(tx: TxClient, s: Seed, amount: number): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO work_order_financial_items (tenant_id, work_order_id, description, quantity, unit_amount, total_amount, currency, source)
    VALUES (${s.tenantId}::uuid, ${s.workOrderId}::uuid, 'Item cru do vencedor', 1, ${amount}, ${amount}, 'BRL', 'manual')
  `;
}

/** A9 — o faturamento NO PROTOCOLO NOVO, em SQL cru: trava compartilhada da OS → itens em ordem → título → carimbo. */
async function rawInvoiceNewProtocol(tx: TxClient, s: Seed, amount: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM work_orders WHERE tenant_id = ${s.tenantId}::uuid AND id = ${s.workOrderId}::uuid FOR SHARE`;
  const locked = (await tx.$queryRaw`
    SELECT id FROM work_order_financial_items
     WHERE tenant_id = ${s.tenantId}::uuid AND work_order_id = ${s.workOrderId}::uuid AND deleted_at IS NULL AND invoiced_at IS NULL
     ORDER BY created_at, id
       FOR UPDATE
  `) as Array<{ id: string }>;
  assert.equal(locked.length, s.itemIds.length, "o vencedor travou todos os itens");
  const period = h.deriveCompetencia(new Date());
  const titles = (await tx.$queryRaw`
    INSERT INTO financial_titles (tenant_id, direction, party_type, party_name, amount, currency, issue_date, due_date,
                                  paid_amount, status, competencia, work_order_id)
    VALUES (${s.tenantId}::uuid, 'receivable', 'customer', 'Cliente B-SAN3-23', ${amount}, 'BRL', now(), now(), 0, 'open', ${period},
            ${s.workOrderId}::uuid)
    RETURNING id
  `) as Array<{ id: string }>;
  await tx.$executeRaw`
    UPDATE work_order_financial_items SET invoiced_at = now(), title_id = ${titles[0]!.id}::uuid
     WHERE tenant_id = ${s.tenantId}::uuid AND work_order_id = ${s.workOrderId}::uuid AND deleted_at IS NULL AND invoiced_at IS NULL
  `;
}

// A4 — gatilho TEMPORÁRIO que faz o INSERT do evento de cancelamento falhar, restrito à OS do caso (precedente
// `o6r07c-b-scope-db.test.ts`): nome único, `DROP` no `finally` e a prova de que não sobrou nada no catálogo.
const INJECTED_EVENT_MARK = "SAN323_INJ_EVENTO";

async function withFailingCancelEvent<T>(s: Seed, body: () => Promise<T>): Promise<T> {
  assert.match(s.workOrderId, /^[0-9a-f-]{36}$/);
  const name = `san323_inj_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await h.admin.$executeRawUnsafe(`CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION '${INJECTED_EVENT_MARK}'; END $f$`);
  let result: T;
  try {
    await h.admin.$executeRawUnsafe(
      `CREATE TRIGGER ${name} BEFORE INSERT ON work_order_events FOR EACH ROW WHEN (NEW.work_order_id = '${s.workOrderId}'::uuid AND NEW.event_type = 'work_order_cancelled') EXECUTE FUNCTION ${name}()`,
    );
    result = await body();
  } finally {
    await h.admin.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON work_order_events`);
    await h.admin.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${name}()`);
  }
  const rows = (await h.admin.$queryRawUnsafe(
    "SELECT (SELECT count(*)::int FROM pg_trigger WHERE tgname = $1) AS gatilhos, (SELECT count(*)::int FROM pg_proc WHERE proname = $1) AS funcoes",
    name,
  )) as Array<{ gatilhos: number; funcoes: number }>;
  assert.deepEqual([rows[0]!.gatilhos, rows[0]!.funcoes], [0, 0], `o gatilho ${name} sobrou no catálogo`);
  return result;
}

async function osState(s: Seed) {
  const workOrder = await h.admin.workOrder.findUniqueOrThrow({ where: { id: s.workOrderId } });
  const items = await h.admin.workOrderFinancialItem.findMany({ where: { tenant_id: s.tenantId, work_order_id: s.workOrderId } });
  const titles = await h.admin.financialTitle.findMany({ where: { tenant_id: s.tenantId, work_order_id: s.workOrderId } });
  const eventos = await h.admin.workOrderEvent.count({ where: { tenant_id: s.tenantId, work_order_id: s.workOrderId } });
  const atribuicoes = await h.admin.workOrderAssignment.count({ where: { tenant_id: s.tenantId, work_order_id: s.workOrderId } });
  return {
    status: workOrder.status as string,
    decisao: (workOrder.financial_cancellation_decision ?? null) as string | null,
    tecnico: (workOrder.assigned_user_id ?? null) as string | null,
    ativos: items.filter((item: any) => item.deleted_at === null).length,
    ativosNaoFat: items.filter((item: any) => item.deleted_at === null && item.invoiced_at === null).length,
    faturados: items.filter((item: any) => item.deleted_at === null && item.invoiced_at !== null).length,
    titulos: titles.filter((title: any) => title.deleted_at === null && title.direction === "receivable" && title.status !== "cancelled").length,
    eventos,
    atribuicoes,
  };
}

/** I-Z (R-01b): OS `cancelled` com decisão `zero` ⇒ 0 item faturado ativo ∧ 0 título receivable ativo da OS. */
function assertInvariantIZ(state: Awaited<ReturnType<typeof osState>>, label: string): void {
  if (state.status !== "cancelled" || state.decisao !== "zero") return;
  assert.deepEqual([state.faturados, state.titulos], [0, 0], `${label}: I-Z violada — OS cancelled/zero com faturado ou título ${JSON.stringify(state)}`);
}

async function itemRow(id: string): Promise<any> {
  return h.admin.workOrderFinancialItem.findUniqueOrThrow({ where: { id } });
}

function flatten(error: unknown): string {
  try {
    return `${String((error as Error)?.message ?? "")} ${JSON.stringify(error, Object.getOwnPropertyNames(error as object))}`;
  } catch {
    return String(error);
  }
}

function describe(outcome: SettledOutcome<unknown>): string {
  if (outcome.status !== "rejected") return "fulfilled";
  const reason = outcome.reason as { statusCode?: unknown; reason?: unknown; code?: unknown };
  if (reason?.statusCode !== undefined) return `rejected ${String(reason.statusCode)}/${String(reason.reason ?? "")}`;
  return `rejected ${String(reason?.code ?? "")}: ${flatten(reason).replace(/\s+/g, " ").slice(0, 220)}`;
}

function expectFulfilled(outcome: SettledOutcome<unknown>, label: string): void {
  assert.equal(outcome.status, "fulfilled", `${label}: era para passar e falhou (${describe(outcome)})`);
}

function expectReason(outcome: SettledOutcome<unknown>, statusCode: number, reason: string, label: string): void {
  assert.equal(outcome.status, "rejected", `${label}: era para recusar e passou`);
  const error = (outcome as { reason: { statusCode?: number; reason?: string } }).reason;
  assert.equal(error?.statusCode, statusCode, `${label}: status (${describe(outcome)})`);
  assert.equal(error?.reason, reason, `${label}: motivo (${describe(outcome)})`);
}

function expectFulfilledOrReason(outcome: SettledOutcome<unknown>, allowed: Array<[number, string]>, label: string): void {
  if (outcome.status === "fulfilled") return;
  const error = (outcome as { reason: { statusCode?: number; reason?: string } }).reason;
  const ok = allowed.some(([statusCode, reason]) => error?.statusCode === statusCode && error?.reason === reason);
  assert.ok(ok, `${label}: desfecho fora do conjunto permitido (${describe(outcome)})`);
}

/** P-23.3: nenhuma corrida termina em impasse cru (o 503 traduzido do faturamento cai na asserção do motivo). */
function expectNoDeadlock(outcome: SettledOutcome<unknown>): void {
  if (outcome.status === "fulfilled") return;
  const text = flatten((outcome as { reason: unknown }).reason);
  assert.doesNotMatch(text, /40P01|deadlock detected/i, `a corrida terminou em impasse (${describe(outcome)})`);
}
