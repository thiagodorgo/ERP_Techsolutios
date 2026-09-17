import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { ApiError } from "../src/services/api/client";
import type { WorkOrderDetail, WorkOrderEvent, WorkOrderListItem, WorkOrderStatus } from "../src/modules/work-orders/work-orders.types";

// Shim não-destrutivo (o service importa client.ts → auth.storage → localStorage).
const g = globalThis as unknown as { window?: { localStorage?: unknown; dispatchEvent?: unknown } };
g.window ??= {};
g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
g.window.dispatchEvent ??= () => true;

// B-SAN3-01 (P-008, item 4 do gate SAN3) — a web deixa de fabricar OS/despacho quando o backend recusa ou
// responde vazio. Toda a suíte roda em modo REAL (`VITE_USE_MOCKS` ≠ "true"): o modo mock explícito é o
// interruptor de demonstração e fica fora deste bloco (plano §1). Asserções de COMPORTAMENTO: contagens,
// `source`, flags, `navigate` chamado/não chamado, `data-state`, igualdade do payload — nunca "contém OS-000101".
// Cada ID abaixo é o do §6.2 do plano; os marcados "vermelho no head-base" falham antes do conserto (§6.3).
process.env.VITE_USE_MOCKS = "false";

// CE-G2 (§7 do plano): contexto nominal de `manager`, que tem `work_orders:read` + `work_orders:create` +
// `field_dispatch:*` no catálogo. Os casos 403 são o caso NEGATIVO — o stub devolve 403 e é isso que se afirma.
const CTX = { role: "manager", permissions: ["work_orders:read", "work_orders:create"], tenantId: "ten-000001", token: "tok" };

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const PAGINATION = { limit: 20, offset: 0, total: 0 };

async function withFetch<T>(impl: FetchImpl, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = impl as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

/** Stub por rota (regex sobre a URL). Rota não prevista lança — nenhum caso passa por acidente. */
function routes(table: ReadonlyArray<readonly [RegExp, (init?: RequestInit) => Response | Promise<Response>]>): FetchImpl {
  return async (input, init) => {
    const url = String(input);
    for (const [pattern, handler] of table) if (pattern.test(url)) return handler(init);
    throw new Error(`rota não prevista no stub: ${url}`);
  };
}

const wo = (id: string, code: string, extra: Record<string, unknown> = {}) => ({
  id,
  code,
  title: `Atendimento ${code}`,
  status: "open",
  priority: "high",
  created_at: "2026-09-01T10:00:00.000Z",
  ...extra,
});

const detail = (id: string, code: string): WorkOrderDetail => ({
  id,
  code,
  title: `Atendimento ${code}`,
  status: "assigned" as WorkOrderStatus,
  priority: "high",
  customerName: "Cliente Exemplo",
  serviceAddress: "Rua A, 100",
  assignedOperatorId: "op-1",
  createdAt: "2026-09-01T10:00:00.000Z",
  links: null,
});

const NOT_FOUND = () => json(404, { error: { code: "WORK_ORDER_NOT_FOUND", reason: "not_found", message: "" } });
const FORBIDDEN = () => json(403, { error: { code: "FORBIDDEN", reason: "forbidden", message: "" } });
const SERVER_ERROR = () => new Response("boom", { status: 500 });
const NETWORK_DOWN: FetchImpl = async () => {
  throw new TypeError("Failed to fetch");
};

// =============================== L. Lista — listWorkOrdersFromApi ===============================

test("[L1] lista 200 vazia → items.length 0, source 'api', sem fallbackReason (não fabrica 6 OS)", async () => {
  const { listWorkOrdersFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const data = await withFetch(
    routes([[/\/work-orders(\?|$)/, () => json(200, { items: [], pagination: PAGINATION })]]),
    () => listWorkOrdersFromApi(CTX, {}),
  );
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "api");
  assert.equal(data.fallbackReason, undefined);
});

test("[L2] lista 500 → items 0, source 'fallback', fallbackReason string, forbidden false", async () => {
  const { listWorkOrdersFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const data = await withFetch(routes([[/\/work-orders(\?|$)/, SERVER_ERROR]]), () => listWorkOrdersFromApi(CTX, {}));
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
  assert.equal(typeof data.fallbackReason, "string");
  assert.equal(data.forbidden, false);
});

test("[L3] lista 403 → forbidden true, items 0 (acesso não permitido ≠ erro de sistema)", async () => {
  const { listWorkOrdersFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const data = await withFetch(routes([[/\/work-orders(\?|$)/, FORBIDDEN]]), () => listWorkOrdersFromApi(CTX, {}));
  assert.equal(data.forbidden, true);
  assert.equal(data.items.length, 0);
});

test("[L4] lista 200 com 2 itens → 2 itens, source 'api' (regressão)", async () => {
  const { listWorkOrdersFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const data = await withFetch(
    routes([[/\/work-orders(\?|$)/, () => json(200, { items: [wo("wo-1", "OS-1"), wo("wo-2", "OS-2")], pagination: { ...PAGINATION, total: 2 } })]]),
    () => listWorkOrdersFromApi(CTX, {}),
  );
  assert.equal(data.items.length, 2);
  assert.equal(data.source, "api");
});

test("[L5] lista com rede fora (fetch lança TypeError) → source 'fallback', sem throw", async () => {
  const { listWorkOrdersFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const data = await withFetch(NETWORK_DOWN, () => listWorkOrdersFromApi(CTX, {}));
  assert.equal(data.source, "fallback");
  assert.equal(data.items.length, 0);
});

// =============================== C. Criar — runCreateWorkOrder / createErrorMessage ===============================

const PAYLOAD = {
  title: "Reboque do veículo do cliente",
  description: "Digitado pelo operador",
  priority: "high" as const,
  serviceAddress: "Rua A, 100",
  scheduledFor: null,
};

function createSpies() {
  const navigations: string[] = [];
  const errors: Array<string | null> = [];
  const saving: boolean[] = [];
  return {
    context: CTX,
    navigate: (to: string) => {
      navigations.push(to);
    },
    setSaving: (v: boolean) => {
      saving.push(v);
    },
    setError: (v: string | null) => {
      errors.push(v);
    },
    get navigations() {
      return navigations;
    },
    get errors() {
      return errors;
    },
    get saving() {
      return saving;
    },
  };
}

test("[C1] create 201 com OS → navega 1x para /work-orders/<id>, sem mensagem, saving termina false", async () => {
  const { runCreateWorkOrder } = await import("../src/modules/work-orders/work-orders-create.handlers");
  const d = createSpies();
  await withFetch(
    routes([[/\/work-orders$/, () => json(201, { data: wo("wo-new", "OS-000201") })]]),
    () => runCreateWorkOrder(d, PAYLOAD),
  );
  assert.deepEqual(d.navigations, ["/work-orders/wo-new"]);
  assert.ok(d.errors.every((v) => v === null), "nunca setou mensagem de erro");
  assert.equal(d.saving.at(-1), false);
});

test("[C2] create 422 destination_required → NÃO navega, mensagem, payload intacto, saving(false) por último", async () => {
  const { runCreateWorkOrder } = await import("../src/modules/work-orders/work-orders-create.handlers");
  const d = createSpies();
  const before = structuredClone(PAYLOAD);
  await withFetch(
    routes([[/\/work-orders$/, () => json(422, { error: { code: "WORK_ORDER_UNPROCESSABLE", reason: "destination_required", message: "" } })]]),
    () => runCreateWorkOrder(d, PAYLOAD),
  );
  assert.equal(d.navigations.length, 0, "recusa não navega para OS inexistente");
  const last = d.errors.at(-1);
  assert.equal(typeof last, "string");
  assert.ok((last as string).length > 0);
  assert.deepEqual(PAYLOAD, before, "o que o operador digitou não muda no erro");
  assert.equal(d.saving.at(-1), false);
});

test("[C3] create 400 invalid_customer_reference → sem navegar; mensagem DIFERENTE da do 422", async () => {
  const { runCreateWorkOrder, createErrorMessage } = await import("../src/modules/work-orders/work-orders-create.handlers");
  const d = createSpies();
  await withFetch(
    routes([[/\/work-orders$/, () => json(400, { error: { code: "WORK_ORDER_INVALID", reason: "invalid_customer_reference", message: "" } })]]),
    () => runCreateWorkOrder(d, PAYLOAD),
  );
  assert.equal(d.navigations.length, 0);
  const msg = d.errors.at(-1);
  assert.equal(typeof msg, "string");
  const destination = createErrorMessage(new ApiError(422, "x", "WORK_ORDER_UNPROCESSABLE", "destination_required"));
  assert.notEqual(msg, destination, "a tabela por `reason` distingue vínculo inválido de destino obrigatório");
});

test("[C4] create 200 sem OS ({ data: {} }) → service rejeita invalid_work_order_response; handler não navega e avisa", async () => {
  const { createWorkOrder } = await import("../src/modules/work-orders/work-orders.service");
  const { runCreateWorkOrder } = await import("../src/modules/work-orders/work-orders-create.handlers");
  const stub = routes([[/\/work-orders$/, () => json(200, { data: {} })]]);
  await withFetch(stub, () => assert.rejects(() => createWorkOrder(CTX, PAYLOAD), /invalid_work_order_response/));
  const d = createSpies();
  await withFetch(stub, () => runCreateWorkOrder(d, PAYLOAD));
  assert.equal(d.navigations.length, 0);
  assert.equal(typeof d.errors.at(-1), "string");
});

test("[C5] create 403 → sem navegar, mensagem", async () => {
  const { runCreateWorkOrder } = await import("../src/modules/work-orders/work-orders-create.handlers");
  const d = createSpies();
  await withFetch(routes([[/\/work-orders$/, FORBIDDEN]]), () => runCreateWorkOrder(d, PAYLOAD));
  assert.equal(d.navigations.length, 0);
  assert.equal(typeof d.errors.at(-1), "string");
  assert.equal(d.saving.at(-1), false);
});

test("[C6] create com rede fora (fetch lança) → sem navegar, mensagem", async () => {
  const { runCreateWorkOrder } = await import("../src/modules/work-orders/work-orders-create.handlers");
  const d = createSpies();
  await withFetch(NETWORK_DOWN, () => runCreateWorkOrder(d, PAYLOAD));
  assert.equal(d.navigations.length, 0);
  assert.equal(typeof d.errors.at(-1), "string");
  assert.equal(d.saving.at(-1), false);
});

test("[C7] createErrorMessage: nenhuma mensagem vaza reason/code/status/'API'/'fallback' (§3 do contrato)", async () => {
  const { createErrorMessage } = await import("../src/modules/work-orders/work-orders-create.handlers");
  const cases: Array<[unknown, string]> = [
    [new ApiError(422, "x", "WORK_ORDER_UNPROCESSABLE", "destination_required"), "destination_required"],
    [new ApiError(400, "x", "WORK_ORDER_INVALID", "invalid_customer_reference"), "invalid_customer_reference"],
    [new ApiError(400, "x", "WORK_ORDER_INVALID", "invalid_vehicle_reference"), "invalid_vehicle_reference"],
    [new ApiError(403, "Sessão expirada ou sem permissão."), "403"],
    [new ApiError(409, "Conflito de dados. Recarregue e tente novamente."), "409"],
    [new ApiError(500, "Falha no servidor. Tente novamente em instantes."), "500"],
    [new Error("invalid_work_order_response"), "invalid_work_order_response"],
    [new TypeError("Failed to fetch"), "rede"],
  ];
  for (const [err, label] of cases) {
    const msg = createErrorMessage(err);
    assert.equal(typeof msg, "string", label);
    assert.ok(msg.length > 0, label);
    assert.doesNotMatch(msg, /\d{3}/, `${label}: sem dígitos de status`);
    assert.doesNotMatch(msg, /\bAPI\b|fallback|mock|_reference|_required|_response|WORK_ORDER_/, `${label}: sem termo técnico`);
  }
});

// =============================== D. Detalhe — getWorkOrderFromApi ===============================

test("[D1] detalhe 404 → workOrder null, notFound true, forbidden não é true", async () => {
  const { getWorkOrderFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const result = await withFetch(routes([[/\/work-orders\/wo-404$/, NOT_FOUND]]), () => getWorkOrderFromApi(CTX, "wo-404"));
  assert.equal(result.workOrder, null);
  assert.equal(result.notFound, true);
  assert.notEqual(result.forbidden, true);
});

test("[D2] detalhe 403 → workOrder null, forbidden true", async () => {
  const { getWorkOrderFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const result = await withFetch(routes([[/\/work-orders\/wo-403$/, FORBIDDEN]]), () => getWorkOrderFromApi(CTX, "wo-403"));
  assert.equal(result.workOrder, null);
  assert.equal(result.forbidden, true);
});

test("[D3] detalhe 500 → workOrder null, source 'fallback', fallbackReason", async () => {
  const { getWorkOrderFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const result = await withFetch(routes([[/\/work-orders\/wo-500$/, SERVER_ERROR]]), () => getWorkOrderFromApi(CTX, "wo-500"));
  assert.equal(result.workOrder, null);
  assert.equal(result.source, "fallback");
  assert.equal(typeof result.fallbackReason, "string");
});

test("[D4] detalhe 200 sem OS ({ data: {} }) → workOrder null, source 'fallback'", async () => {
  const { getWorkOrderFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const result = await withFetch(routes([[/\/work-orders\/wo-x$/, () => json(200, { data: {} })]]), () => getWorkOrderFromApi(CTX, "wo-x"));
  assert.equal(result.workOrder, null);
  assert.equal(result.source, "fallback");
});

test("[D5] detalhe 200 válido → workOrder.id é o pedido, source 'api' (regressão)", async () => {
  const { getWorkOrderFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const result = await withFetch(
    routes([[/\/work-orders\/wo-77$/, () => json(200, { data: wo("wo-77", "OS-000077") })]]),
    () => getWorkOrderFromApi(CTX, "wo-77"),
  );
  assert.equal(result.workOrder?.id, "wo-77");
  assert.equal(result.source, "api");
});

// =============================== T. Timeline — getWorkOrderTimeline ===============================

test("[T1] timeline 200 vazia → 0 eventos (não fabrica 3)", async () => {
  const { getWorkOrderTimeline } = await import("../src/modules/work-orders/work-orders.service");
  const events = await withFetch(routes([[/\/timeline$/, () => json(200, { data: [] })]]), () => getWorkOrderTimeline(CTX, "wo-1"));
  assert.equal(events.length, 0);
});

test("[T2] timeline 500 → rejeita com ApiError status 500 (o hook decide o estado)", async () => {
  const { getWorkOrderTimeline } = await import("../src/modules/work-orders/work-orders.service");
  await withFetch(routes([[/\/timeline$/, SERVER_ERROR]]), () =>
    assert.rejects(
      () => getWorkOrderTimeline(CTX, "wo-1"),
      (err: unknown) => err instanceof ApiError && err.status === 500,
    ),
  );
});

test("[T3] timeline 200 com 2 eventos fora de ordem → 2, ordenados por createdAt (regressão)", async () => {
  const { getWorkOrderTimeline } = await import("../src/modules/work-orders/work-orders.service");
  const events = await withFetch(
    routes([
      [
        /\/timeline$/,
        () =>
          json(200, {
            data: [
              { id: "e2", event_type: "work_order_assigned", message: "Atribuída", created_at: "2026-09-01T12:00:00.000Z" },
              { id: "e1", event_type: "work_order_created", message: "Criada", created_at: "2026-09-01T10:00:00.000Z" },
            ],
          }),
      ],
    ]),
    () => getWorkOrderTimeline(CTX, "wo-1"),
  );
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((e) => e.id), ["e1", "e2"]);
});

// =============================== M. Mutações 2xx-sem-OS ===============================

const EMPTY_2XX = routes([[/\/work-orders\//, () => json(200, { data: {} })]]);

test("[M1] updateWorkOrder 200 sem OS → rejeita invalid_work_order_response", async () => {
  const { updateWorkOrder } = await import("../src/modules/work-orders/work-orders.service");
  await withFetch(EMPTY_2XX, () => assert.rejects(() => updateWorkOrder(CTX, "wo-1", { title: "x" }), /invalid_work_order_response/));
});

test("[M2] advanceWorkOrderStatus 200 sem OS → rejeita invalid_work_order_response", async () => {
  const { advanceWorkOrderStatus } = await import("../src/modules/work-orders/work-orders.service");
  await withFetch(EMPTY_2XX, () => assert.rejects(() => advanceWorkOrderStatus(CTX, "wo-1", "accepted"), /invalid_work_order_response/));
});

test("[M3] assignWorkOrder 200 sem OS → rejeita invalid_work_order_response", async () => {
  const { assignWorkOrder } = await import("../src/modules/work-orders/work-orders.service");
  await withFetch(EMPTY_2XX, () => assert.rejects(() => assignWorkOrder(CTX, "wo-1", { operatorId: "op-1" }), /invalid_work_order_response/));
});

test("[M4] cancelWorkOrder 200 sem OS → rejeita invalid_work_order_response", async () => {
  const { cancelWorkOrder } = await import("../src/modules/work-orders/work-orders.service");
  await withFetch(EMPTY_2XX, () =>
    assert.rejects(() => cancelWorkOrder(CTX, "wo-1", { financialDecision: "keep", reason: "cliente desistiu" }), /invalid_work_order_response/),
  );
});

test("[M5] correctMileage 200 sem OS → rejeita invalid_work_order_response", async () => {
  const { correctMileage } = await import("../src/modules/work-orders/work-orders.service");
  await withFetch(EMPTY_2XX, () => assert.rejects(() => correctMileage(CTX, "wo-1", { mileageStart: 10 }), /invalid_work_order_response/));
});

test("[M6] runAdvance com 200 sem OS → mensagem por-linha, SEM refresh (o throw novo cai onde o espelho já capturava)", async () => {
  const { runAdvance } = await import("../src/modules/work-orders/work-orders-row.handlers");
  const errors: Array<[string, string | null]> = [];
  let refreshed = 0;
  const deps = {
    context: CTX,
    refresh: async () => {
      refreshed += 1;
    },
    setBusy: () => undefined,
    setError: (id: string, v: string | null) => {
      errors.push([id, v]);
    },
  };
  const order: WorkOrderListItem = { id: "wo-1", code: "OS-1", title: "x", status: "on_route", priority: "high", createdAt: "2026-09-01T10:00:00.000Z" };
  await withFetch(EMPTY_2XX, () => runAdvance(deps, order));
  assert.equal(refreshed, 0);
  assert.ok(errors.some(([id, v]) => id === "wo-1" && typeof v === "string" && v.length > 0));
});

// =============================== X. Despachos — dispatches.service ===============================

const DISPATCH = (id: string, workOrderId: string) => ({
  id,
  work_order_id: workOrderId,
  operator_user_id: "usr-1",
  status: "assigned",
  priority: "high",
  created_at: "2026-09-01T10:00:00.000Z",
});

test("[X1] despachos 200 vazio (+ OS 200 vazio no enriquecimento) → items 0, source 'api' (não fabrica 4)", async () => {
  const { listDispatchesFromApi } = await import("../src/modules/operations/dispatches/dispatches.service");
  const data = await withFetch(
    routes([
      [/\/operations\/dispatches(\?|$)/, () => json(200, { items: [], pagination: PAGINATION })],
      [/\/work-orders(\?|$)/, () => json(200, { items: [], pagination: PAGINATION })],
    ]),
    () => listDispatchesFromApi(CTX, {}),
  );
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "api");
});

test("[X2] despachos 500 → items 0, source 'fallback'", async () => {
  const { listDispatchesFromApi } = await import("../src/modules/operations/dispatches/dispatches.service");
  const data = await withFetch(routes([[/\/operations\/dispatches(\?|$)/, SERVER_ERROR]]), () => listDispatchesFromApi(CTX, {}));
  assert.equal(data.items.length, 0);
  assert.equal(data.source, "fallback");
});

test("[X3] despachos 403 → fallbackReason DIFERENTE do 500 (sem permissão ≠ erro de sistema)", async () => {
  const { listDispatchesFromApi } = await import("../src/modules/operations/dispatches/dispatches.service");
  const forbidden = await withFetch(routes([[/\/operations\/dispatches(\?|$)/, FORBIDDEN]]), () => listDispatchesFromApi(CTX, {}));
  const failed = await withFetch(routes([[/\/operations\/dispatches(\?|$)/, SERVER_ERROR]]), () => listDispatchesFromApi(CTX, {}));
  assert.equal(forbidden.items.length, 0);
  assert.equal(typeof forbidden.fallbackReason, "string");
  assert.notEqual(forbidden.fallbackReason, failed.fallbackReason);
});

const EMPTY_2XX_DISPATCH = routes([[/\/operations\/dispatches/, () => json(200, { data: {} })]]);

test("[X4] createDispatch 200 sem despacho → rejeita invalid_dispatch_response", async () => {
  const { createDispatch } = await import("../src/modules/operations/dispatches/dispatches.service");
  await withFetch(EMPTY_2XX_DISPATCH, () =>
    assert.rejects(() => createDispatch(CTX, { workOrderId: "wo-1", operatorUserId: "usr-1", priority: "high" }), /invalid_dispatch_response/),
  );
});

test("[X5] updateDispatchStatus 200 sem despacho → rejeita invalid_dispatch_response", async () => {
  const { updateDispatchStatus } = await import("../src/modules/operations/dispatches/dispatches.service");
  await withFetch(EMPTY_2XX_DISPATCH, () => assert.rejects(() => updateDispatchStatus(CTX, "d-1", { status: "accepted" }), /invalid_dispatch_response/));
});

test("[X6] reassignDispatch 200 sem despacho → rejeita invalid_dispatch_response", async () => {
  const { reassignDispatch } = await import("../src/modules/operations/dispatches/dispatches.service");
  await withFetch(EMPTY_2XX_DISPATCH, () => assert.rejects(() => reassignDispatch(CTX, "d-1", { operatorUserId: "usr-2" }), /invalid_dispatch_response/));
});

test("[X7] despachos 200 com 1 item + OS 500 no enriquecimento → 1 item sem código de OS, sem throw (regressão)", async () => {
  const { listDispatchesFromApi } = await import("../src/modules/operations/dispatches/dispatches.service");
  const data = await withFetch(
    routes([
      [/\/operations\/dispatches(\?|$)/, () => json(200, { items: [DISPATCH("d-1", "wo-9")], pagination: { ...PAGINATION, total: 1 } })],
      [/\/work-orders(\?|$)/, SERVER_ERROR],
    ]),
    () => listDispatchesFromApi(CTX, {}),
  );
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].workOrderCode, undefined);
  assert.equal(data.source, "api");
});

test("[X8] getDispatchFromApi 404 → dispatch null + notFound (emenda (a) do orquestrador)", async () => {
  const { getDispatchFromApi } = await import("../src/modules/operations/dispatches/dispatches.service");
  const result = await withFetch(
    routes([[/\/operations\/dispatches\/d-404$/, () => json(404, { error: { code: "DISPATCH_NOT_FOUND", reason: "not_found", message: "" } })]]),
    () => getDispatchFromApi(CTX, "d-404"),
  );
  assert.equal(result.dispatch, null);
  assert.equal(result.notFound, true);
});

test("[X9] getDispatchFromApi 500 → dispatch null + fallbackReason (emenda (a) do orquestrador)", async () => {
  const { getDispatchFromApi } = await import("../src/modules/operations/dispatches/dispatches.service");
  const result = await withFetch(routes([[/\/operations\/dispatches\/d-500$/, SERVER_ERROR]]), () => getDispatchFromApi(CTX, "d-500"));
  assert.equal(result.dispatch, null);
  assert.equal(typeof result.fallbackReason, "string");
});

// =============================== R. Reducers puros — work-orders.state ===============================

const THREE = [detail("wo-1", "OS-1"), detail("wo-2", "OS-2"), detail("wo-3", "OS-3")];
const API_OK = { items: THREE, pagination: { ...PAGINATION, total: 3 }, source: "api" as const };
const API_EMPTY = { items: [], pagination: PAGINATION, source: "api" as const };
const FALLBACK = { items: [], pagination: PAGINATION, source: "fallback" as const, fallbackReason: "Não foi possível consultar.", forbidden: false };

test("[R1] nextListState(prev com 3 itens, fallback, background=true) → mantém os 3, stale true, error preenchido", async () => {
  const { initialListState, nextListState } = await import("../src/modules/work-orders/work-orders.state");
  const loaded = nextListState(initialListState, API_OK, false);
  const next = nextListState(loaded, FALLBACK, true);
  assert.equal(next.data.items.length, 3);
  assert.equal(next.stale, true);
  assert.equal(typeof next.error, "string");
});

test("[R2] nextListState(vazio, fallback, background=false) → items 0, estado 'error'", async () => {
  const { initialListState, nextListState } = await import("../src/modules/work-orders/work-orders.state");
  const next = nextListState(initialListState, FALLBACK, false);
  assert.equal(next.data.items.length, 0);
  assert.equal(next.status, "error");
  assert.equal(next.stale, false);
});

test("[R3] nextListState(vazio, api vazio) → estado 'empty', stale false", async () => {
  const { initialListState, nextListState } = await import("../src/modules/work-orders/work-orders.state");
  const next = nextListState(initialListState, API_EMPTY, false);
  assert.equal(next.status, "empty");
  assert.equal(next.stale, false);
  assert.equal(next.error, null);
});

test("[R4] nextDetailState(prev com OS, detalhe rejeitado, background=true) → mantém a OS, stale true", async () => {
  const { initialDetailState, nextDetailState } = await import("../src/modules/work-orders/work-orders.state");
  const loaded = nextDetailState(
    initialDetailState,
    { detail: { status: "fulfilled", value: { workOrder: detail("wo-1", "OS-1"), source: "api" } }, timeline: { status: "fulfilled", value: [] } },
    false,
  );
  const next = nextDetailState(
    loaded,
    { detail: { status: "rejected", reason: new Error("boom") }, timeline: { status: "rejected", reason: new Error("boom") } },
    true,
  );
  assert.equal(next.workOrder?.id, "wo-1");
  assert.equal(next.stale, true);
});

test("[R5] nextDetailState(vazio, { notFound }) → estado 'not-found', workOrder null", async () => {
  const { initialDetailState, nextDetailState } = await import("../src/modules/work-orders/work-orders.state");
  const next = nextDetailState(
    initialDetailState,
    { detail: { status: "fulfilled", value: { workOrder: null, source: "api", notFound: true } }, timeline: { status: "rejected", reason: new Error("404") } },
    false,
  );
  assert.equal(next.status, "not-found");
  assert.equal(next.workOrder, null);
});

test("[R6] nextDetailState(_, detalhe ok + timeline rejeitada) → timeline vazia, timelineUnavailable true", async () => {
  const { initialDetailState, nextDetailState } = await import("../src/modules/work-orders/work-orders.state");
  const next = nextDetailState(
    initialDetailState,
    { detail: { status: "fulfilled", value: { workOrder: detail("wo-1", "OS-1"), source: "api" } }, timeline: { status: "rejected", reason: new Error("500") } },
    false,
  );
  assert.equal(next.status, "ready");
  assert.equal(next.timeline.length, 0);
  assert.equal(next.timelineUnavailable, true);
});

// =============================== P. Painéis SSR — estados §7 distintos, sem número no erro ===============================

const KPIS_ZERO = { abertas: 0, andamento: 0, atrasadas: 0, concluidas: 0, semTecnico: 0, atrasadasEmCampo: 0 };

function kpiValues(html: string): string[] {
  return [...html.matchAll(/pat-kpi__value">([^<]*)</g)].map((m) => m[1]);
}

test("[P1] lista em ERRO: [data-state=error] com role=alert, sem [data-state=empty], 0 linhas, KPIs sem dígito", async () => {
  const { WorkOrdersKpiGrid, WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const html = renderToString(
    <>
      <WorkOrdersKpiGrid kpis={KPIS_ZERO} kpiDetails={null} skeleton={false} degraded />
      <WorkOrdersLoadState status="error" message="Não foi possível consultar." onRetry={() => undefined} />
    </>,
  );
  assert.match(html, /data-state="error"/);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /data-state="empty"/);
  assert.doesNotMatch(html, /pat-os-row/);
  const values = kpiValues(html);
  assert.equal(values.length, 4);
  for (const v of values) assert.doesNotMatch(v, /\d/, `KPI no erro não mostra número: "${v}"`);
  assert.doesNotMatch(html, /\bAPI\b|fallback|mock/);
});

test("[P2] lista SEM PERMISSÃO: [data-state=forbidden], sem alerta de erro de sistema", async () => {
  const { WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const html = renderToString(<WorkOrdersLoadState status="forbidden" />);
  assert.match(html, /data-state="forbidden"/);
  assert.doesNotMatch(html, /data-state="error"/);
  assert.doesNotMatch(html, /pat-os-row/);
});

test("[P3] lista VAZIA de verdade: [data-state=empty], sem role=alert", async () => {
  const { WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const html = renderToString(<WorkOrdersLoadState status="empty" />);
  assert.match(html, /data-state="empty"/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.doesNotMatch(html, /data-state="error"/);
});

test("[P4] detalhe: not-found / forbidden / error / stale são 4 estados distintos; no stale a OS continua no HTML", async () => {
  const { WorkOrderDetailView } = await import("../src/modules/work-orders/pages/WorkOrderDetailPage");
  const base = {
    timeline: [] as WorkOrderEvent[],
    loading: false,
    error: null as string | null,
    stale: false,
    lastUpdatedAt: "2026-09-17T10:00:00.000Z",
    timelineUnavailable: false,
    context: CTX,
    permissions: ["work_orders:read"] as readonly string[],
    activeTab: "informacoes-gerais" as const,
    onSelectTab: () => undefined,
    onRefresh: () => undefined,
  };
  const render = (props: Partial<Parameters<typeof WorkOrderDetailView>[0]>) =>
    renderToString(
      <MemoryRouter>
        <WorkOrderDetailView {...base} workOrder={null} status="not-found" {...props} />
      </MemoryRouter>,
    );

  const notFound = render({ status: "not-found" });
  const forbidden = render({ status: "forbidden" });
  const failed = render({ status: "error", error: "Não foi possível consultar." });
  const stale = render({ status: "ready", stale: true, workOrder: detail("wo-1", "OS-000901") });

  assert.match(notFound, /data-state="not-found"/);
  assert.match(forbidden, /data-state="forbidden"/);
  assert.match(failed, /data-state="error"/);
  assert.match(stale, /data-state="stale"/);
  // Nenhum estado sem OS renderiza cabeçalho de OS nem abas.
  for (const html of [notFound, forbidden, failed]) {
    assert.doesNotMatch(html, /OS-0/);
    assert.doesNotMatch(html, /Seções da ordem de serviço/);
  }
  // No stale a OS continua na tela.
  assert.match(stale, /OS-000901/);
  // Os 4 são distintos entre si.
  assert.equal(new Set([notFound, forbidden, failed, stale]).size, 4);
  // §3 — nenhuma cópia técnica.
  for (const html of [notFound, forbidden, failed, stale]) assert.doesNotMatch(html, /\bAPI\b|fallback|mock|dados locais/);
});

// =============================== G. Guard estrutural — mock só atrás de isMockMode() ===============================

/**
 * Devolve as linhas de CÓDIGO que citam `getMock*` FORA de um ramo `isMockMode()` (import e linha só de
 * comentário excluídos — comentário não alcança o mock). Um ramo é a própria linha `if (isMockMode()) …` ou o
 * bloco `if (isMockMode()) { … }` até a chave que fecha.
 */
function mockLeaks(source: string): number[] {
  const leaks: number[] = [];
  let depth = 0;
  source.split(/\r?\n/).forEach((line, index) => {
    const opensBlock = /if \(isMockMode\(\)\) \{/.test(line);
    const inBlock = depth > 0;
    if (opensBlock || inBlock) depth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
    const allowed = /^\s*(import\b|\/\/)/.test(line) || /isMockMode\(\)/.test(line) || inBlock || opensBlock;
    if (/getMock/.test(line) && !allowed) leaks.push(index + 1);
    if (depth < 0) depth = 0;
  });
  return leaks;
}

test("[G1] work-orders.service e dispatches.service: todo getMock* fica atrás de isMockMode() — e o guard pega a mutação", async () => {
  // Auto-teste do guard: reintroduzir `?? getMockWorkOrderDetail(id)` fora do ramo mock TEM de ser pego.
  assert.deepEqual(mockLeaks("if (isMockMode()) return getMockX();\nreturn adapt(r) ?? getMockWorkOrderDetail(id);"), [2]);
  assert.deepEqual(mockLeaks("if (isMockMode()) {\n  const c = getMockX();\n  return c;\n}\nreturn adapt(r);"), []);
  // Comentário não alcança o mock; código com comentário no fim da linha continua sendo código.
  assert.deepEqual(mockLeaks("// antes: ?? getMockWorkOrderDetail(id)\nreturn adapt(r);"), []);
  assert.deepEqual(mockLeaks("return adapt(r) ?? getMockWorkOrderDetail(id); // volta do mock"), [1]);

  for (const file of ["frontend/src/modules/work-orders/work-orders.service.ts", "frontend/src/modules/operations/dispatches/dispatches.service.ts"]) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), "utf8");
    assert.deepEqual(mockLeaks(source), [], `${file}: getMock* fora de isMockMode()`);
  }
});

// =============================== S. Fiação — a página liga o handler testado ===============================

test("[S1] WorkOrderCreatePage chama runCreateWorkOrder e NÃO chama createWorkOrder direto (handler testado = ligado)", async () => {
  const page = await readFile(new URL("../src/modules/work-orders/pages/WorkOrderCreatePage.tsx", import.meta.url), "utf8");
  assert.match(page, /runCreateWorkOrder\(/);
  assert.doesNotMatch(page, /(?<!run)createWorkOrder\(/, "a página não chama o service direto");
  assert.doesNotMatch(page, /import \{[^}]*\bcreateWorkOrder\b[^}]*\} from "\.\.\/work-orders\.service"/);
});
