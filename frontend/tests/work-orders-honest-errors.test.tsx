import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ts from "typescript";

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

// Ciclo 2 — Emenda 3 (r), C2-N2 (propriedade P2: o que não se reconhece cai no ERRO, nunca no vazio). Um 200 cujo
// corpo não traz lista nenhuma (`items`/`data`) não prova "a organização não tem OS": é resposta que a web não
// entende. Vermelho no objeto `bb540fb3`: virava `source: "api"` com 0 itens → estado "vazio" com KPIs "0".
test("[L6] lista 200 SEM lista no corpo → erro (source 'fallback' → estado 'error'), nunca vazio; formas legítimas de vazio seguem vazias", async () => {
  const { listWorkOrdersFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const { initialListState, nextListState } = await import("../src/modules/work-orders/work-orders.state");
  for (const body of [{}, { data: {} }, { items: null, pagination: PAGINATION }, { data: null }, { ok: true }]) {
    const data = await withFetch(routes([[/\/work-orders(\?|$)/, () => json(200, body)]]), () => listWorkOrdersFromApi(CTX, {}));
    const label = JSON.stringify(body);
    assert.equal(data.items.length, 0, label);
    assert.equal(data.source, "fallback", `${label}: resposta sem lista não é "vazio"`);
    assert.equal(typeof data.fallbackReason, "string", label);
    assert.notEqual(data.forbidden, true, `${label}: não é falta de permissão`);
    assert.equal(nextListState(initialListState, data, false).status, "error", label);
  }
  // Controle: as formas que o adapter reconhece como LISTA continuam sendo vazio de verdade.
  for (const body of [{ items: [], pagination: PAGINATION }, { data: [] }, { data: { items: [] } }, []]) {
    const data = await withFetch(routes([[/\/work-orders(\?|$)/, () => json(200, body)]]), () => listWorkOrdersFromApi(CTX, {}));
    assert.equal(data.source, "api", JSON.stringify(body));
    assert.equal(nextListState(initialListState, data, false).status, "empty", JSON.stringify(body));
  }
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

// =============================== F. Ciclo 2 · P1 — uma verdade para "sem permissão" ===============================
// C4-01: a verdade "sem permissão" vivia em dois campos (`source×forbidden` no service, `status×forbidden` no estado)
// sem teste que os amarrasse — quando divergiam, vencia o lado benigno. Agora o `forbidden` do RESULTADO do service
// decide ANTES de qualquer outra classificação, e o estado só carrega `status`.

const FORBIDDEN_LIST = {
  items: [],
  pagination: PAGINATION,
  source: "fallback" as const,
  fallbackReason: "Sem permissão para consultar as ordens de serviço.",
  forbidden: true,
};

const KPIS_ANY = { abertas: 3, andamento: 2, atrasadas: 1, concluidas: 4, semTecnico: 1, atrasadasEmCampo: 1 };

test("[F1] cadeia da lista 403: service → reducer → classificação → painel 'forbidden' e KPIs sem dígito", async () => {
  const { listWorkOrdersFromApi } = await import("../src/modules/work-orders/work-orders.service");
  const { initialListState, nextListState, listStatusKind } = await import("../src/modules/work-orders/work-orders.state");
  const { WorkOrdersKpiGrid, WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const result = await withFetch(routes([[/\/work-orders(\?|$)/, FORBIDDEN]]), () => listWorkOrdersFromApi(CTX, {}));
  const state = nextListState(initialListState, result, false);
  assert.equal(state.status, "forbidden");
  const degraded = listStatusKind(state.status) === "failure";
  assert.equal(degraded, true, "sem permissão é falha para a grade: nunca número");
  const html = renderToString(
    <>
      <WorkOrdersKpiGrid kpis={KPIS_ANY} kpiDetails={null} skeleton={false} degraded={degraded} />
      <WorkOrdersLoadState status={state.status} message={state.error} />
    </>,
  );
  assert.match(html, /data-state="forbidden"/);
  assert.doesNotMatch(html, /data-state="(empty|error)"/);
  const values = kpiValues(html);
  assert.equal(values.length, 4);
  for (const v of values) assert.doesNotMatch(v, /\d/, `KPI sem permissão não mostra número: "${v}"`);
});

test("[F1b] 403 em SEGUNDO PLANO com 3 OS na tela → 'forbidden', a lista sai (0 itens) e NÃO fica 'desatualizada'", async () => {
  const { initialListState, nextListState } = await import("../src/modules/work-orders/work-orders.state");
  const loaded = nextListState(initialListState, API_OK, false);
  assert.equal(loaded.data.items.length, 3);
  const next = nextListState(loaded, FORBIDDEN_LIST, true);
  assert.equal(next.status, "forbidden");
  assert.equal(next.data.items.length, 0, "permissão revogada não deixa a lista antiga na tela");
  assert.equal(next.stale, false);
});

test("[F2] cadeia do detalhe 403: service → reducer → view 'forbidden'", async () => {
  const { getWorkOrderFromApi, getWorkOrderTimeline } = await import("../src/modules/work-orders/work-orders.service");
  const { initialDetailState, nextDetailState } = await import("../src/modules/work-orders/work-orders.state");
  const { WorkOrderDetailView } = await import("../src/modules/work-orders/pages/WorkOrderDetailPage");
  const [detailResult, timelineResult] = await withFetch(routes([[/\/work-orders\/wo-403(\/timeline)?$/, FORBIDDEN]]), () =>
    Promise.allSettled([getWorkOrderFromApi(CTX, "wo-403"), getWorkOrderTimeline(CTX, "wo-403")]),
  );
  const state = nextDetailState(initialDetailState, { detail: detailResult, timeline: timelineResult }, false);
  assert.equal(state.status, "forbidden");
  const html = renderToString(
    <MemoryRouter>
      <WorkOrderDetailView
        workOrder={state.workOrder}
        timeline={state.timeline}
        loading={false}
        status={state.status}
        error={state.error}
        stale={state.stale}
        lastUpdatedAt={state.lastUpdatedAt}
        timelineUnavailable={state.timelineUnavailable}
        context={CTX}
        permissions={["work_orders:read"]}
        activeTab="informacoes-gerais"
        onSelectTab={() => undefined}
        onRefresh={() => undefined}
      />
    </MemoryRouter>,
  );
  assert.match(html, /data-state="forbidden"/);
  assert.doesNotMatch(html, /data-state="(not-found|error)"/);
});

test("[F2b] detalhe 403 em SEGUNDO PLANO com OS na tela → 'forbidden', a OS sai e NÃO fica 'desatualizada'", async () => {
  const { initialDetailState, nextDetailState } = await import("../src/modules/work-orders/work-orders.state");
  const loaded = nextDetailState(
    initialDetailState,
    { detail: { status: "fulfilled", value: { workOrder: detail("wo-1", "OS-1"), source: "api" } }, timeline: { status: "fulfilled", value: [] } },
    false,
  );
  const next = nextDetailState(
    loaded,
    {
      detail: { status: "fulfilled", value: { workOrder: null, source: "fallback", forbidden: true, fallbackReason: "Sem permissão para consultar esta ordem de serviço." } },
      timeline: { status: "rejected", reason: new Error("403") },
    },
    true,
  );
  assert.equal(next.status, "forbidden");
  assert.equal(next.workOrder, null);
  assert.equal(next.stale, false);
});

test("[F3] a flag `forbidden` do resultado decide ANTES de `source`: 403 marcado como 'api' ou 'mock' continua 'forbidden'", async () => {
  const { initialListState, nextListState } = await import("../src/modules/work-orders/work-orders.state");
  for (const source of ["api", "mock", "fallback"] as const) {
    const next = nextListState(initialListState, { items: [], pagination: PAGINATION, source, forbidden: true }, false);
    assert.equal(next.status, "forbidden", `source "${source}" com forbidden:true`);
    assert.equal(next.data.items.length, 0);
  }
});

test("[F4] o estado não carrega uma 2ª verdade: nenhuma chave `forbidden`/`notFound` em lista nem detalhe, em nenhum estado", async () => {
  const { initialDetailState, initialListState, nextDetailState, nextListState } = await import("../src/modules/work-orders/work-orders.state");
  const loaded = nextListState(initialListState, API_OK, false);
  const lists = [
    initialListState,
    loaded,
    nextListState(initialListState, API_EMPTY, false),
    nextListState(initialListState, FALLBACK, false),
    nextListState(initialListState, FORBIDDEN_LIST, false),
    nextListState(loaded, FALLBACK, true),
  ];
  const ok = { status: "fulfilled" as const, value: { workOrder: detail("wo-1", "OS-1"), source: "api" as const } };
  const loadedDetail = nextDetailState(initialDetailState, { detail: ok, timeline: { status: "fulfilled", value: [] } }, false);
  const rejectedTimeline = { status: "rejected" as const, reason: new Error("x") };
  const details = [
    initialDetailState,
    loadedDetail,
    nextDetailState(initialDetailState, { detail: { status: "fulfilled", value: { workOrder: null, source: "api", notFound: true } }, timeline: rejectedTimeline }, false),
    nextDetailState(initialDetailState, { detail: { status: "fulfilled", value: { workOrder: null, source: "fallback", forbidden: true } }, timeline: rejectedTimeline }, false),
    nextDetailState(initialDetailState, { detail: { status: "rejected", reason: new Error("x") }, timeline: rejectedTimeline }, false),
    nextDetailState(loadedDetail, { detail: { status: "rejected", reason: new Error("x") }, timeline: rejectedTimeline }, true),
  ];
  for (const state of [...lists, ...details]) {
    assert.doesNotMatch(JSON.stringify(state), /"(forbidden|notFound)":/, `estado com 2ª verdade: ${JSON.stringify(state).slice(0, 160)}`);
  }
});

// =============================== N. Ciclo 2 · P2 — enumeração fechada, default = ERRO ===============================
// C4-03: um status novo na lista caía no painel vazio com KPIs 0. Agora todo status é classificado num `Record`
// exaustivo (membro novo sem classificação quebra o `tsc`) e, em runtime, o não classificado cai no ERRO.

test("[N1] lista com status NÃO previsto → painel de ERRO (role=alert), nunca o vazio", async () => {
  const { WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const html = renderToString(<WorkOrdersLoadState status={"unavailable" as never} message="Serviço indisponível." onRetry={() => undefined} />);
  assert.match(html, /data-state="error"/);
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /data-state="(empty|forbidden)"/);
});

test("[N2] classificação exaustiva (lista e detalhe): cada status com sua classe; desconhecido → 'failure'", async () => {
  const { DETAIL_STATUS_KIND, LIST_STATUS_KIND, detailStatusKind, listStatusKind } = await import("../src/modules/work-orders/work-orders.state");
  assert.deepEqual(
    { ...LIST_STATUS_KIND },
    { loading: "pending", ready: "data", empty: "data", error: "failure", forbidden: "failure" },
  );
  assert.deepEqual(
    { ...DETAIL_STATUS_KIND },
    { loading: "pending", ready: "data", "not-found": "failure", forbidden: "failure", error: "failure" },
  );
  for (const unknown of ["unavailable", "toString", "constructor", "", "__proto__"]) {
    assert.equal(listStatusKind(unknown as never), "failure", `lista: status "${unknown}"`);
    assert.equal(detailStatusKind(unknown as never), "failure", `detalhe: status "${unknown}"`);
  }
});

test("[N3] detalhe com status NÃO previsto → estado de ERRO (a view cai no erro por padrão — simetria com a lista)", async () => {
  const { WorkOrderDetailView } = await import("../src/modules/work-orders/pages/WorkOrderDetailPage");
  const html = renderToString(
    <MemoryRouter>
      <WorkOrderDetailView
        workOrder={null}
        timeline={[]}
        loading={false}
        status={"unavailable" as never}
        error="Serviço indisponível."
        stale={false}
        lastUpdatedAt={null}
        timelineUnavailable={false}
        context={CTX}
        permissions={["work_orders:read"]}
        activeTab="informacoes-gerais"
        onSelectTab={() => undefined}
        onRefresh={() => undefined}
      />
    </MemoryRouter>,
  );
  assert.match(html, /data-state="error"/);
  assert.doesNotMatch(html, /data-state="(not-found|forbidden)"/);
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

// =============================== G. Ciclo 2 · P3 → B-SAN3-01b — mock só por ALCANCE (AST), em qualquer profundidade ===============================
// C4-02 (ciclo 2): o G1 do ciclo 1 era LÉXICO e deixou passar o `else`, o comentário, a constante sem prefixo e o service NOVO —
// a propriedade passou a ser decidida sobre a árvore sintática. C4-01/C4-02 do `B-SAN3-01` (ciclo 2, `P-SAN3-01B-GUARD-ALCANCE-
// MENOR-QUE-AS-RAIZES`): o G1 do ciclo 2 resolvia re-export de UM nível e varria só as duas pastas — `N-BARREL2` (barrel de 2
// níveis), `N-LITERAL` (entidade inventada inline) e `N-FORA-RAIZ` (o arquivo de fronteira) ficavam verdes. Este bloco deriva o
// guard da PROPRIEDADE, não de lista escrita à mão (CE-G1):
//   · P-A (mock por alcance) — em nenhum arquivo ESCANEADO um identificador cuja ORIGEM é módulo de mock (`*.mock.ts(x)` ou sob
//     `mocks/`) — por import direto, barrel de N NÍVEIS (`export *` / `export { a as b } from` / `export * as ns from`), re-export
//     LOCAL de binding importado (`import {x} from mock; export { x as y }`), `export default x`, `import * as`, default ou
//     `import()` dinâmico — é alcançável fora do ramo VERDADEIRO de `isMockMode()` importado de `config/env`;
//   · P-B (entidade fabricada inline) — em nenhum arquivo das RAÍZES um literal de objeto com IDENTIDADE (`id`/`code`) de valor
//     CONSTANTE (string/número/template) nasce em RAMO DE FALHA (corpo de `catch`, callback de `.catch(`, direita de `??`/`||`)
//     fora do ramo verdadeiro de `isMockMode()`;
//   · RAÍZES = todo *.ts/*.tsx de `modules/work-orders/**` e `modules/operations/dispatches/**` MAIS o arquivo de fronteira
//     `modules/registry/service-quotes/useServiceQuoteReferences.ts`, ENUMERADOS DO DISCO (arquivo novo entra sozinho), sem
//     *.test.* e sem os próprios módulos de mock; FECHO = tudo que as raízes importam (estático não-tipo, re-export, `import()`),
//     em profundidade, dentro de `src/` (especificador relativo) — um helper FORA das raízes que embrulha o mock é fabricação na
//     tela de OS do mesmo jeito;
//   · permitido = só o ramo VERDADEIRO de `isMockMode()` de `config/env`: o `then` de `if (isMockMode())`, o `whenTrue` de
//     `isMockMode() ? … : …` e a direita de `isMockMode() && …`. `else`, `!isMockMode()`, `isMockMode` declarado no arquivo ou
//     importado de outro módulo NÃO valem; comentário não existe na AST. Sem lista de exceção; default = NEGAR.
// O que o guard NÃO prova (residual declarado — §0.5 L1 do plano; hoje sem membro, medido por `grep`/`find`):
//   R1 import por especificador nu ou alias (`@/`, `~/`) — `grep -rn -E 'from "(@|~)/' frontend/src` → 0;
//   R2 ramo de falha escrito sem `catch`/`.catch(`/`??`/`||` (ex.: `if (!ok) return { id: "x" }`);
//   R3 identidade por outra chave (`uuid`, `numero`) ou valor não constante (`String(Date.now())`);
//   R4 dado de demonstração fora da convenção `*.mock.ts(x)`/`mocks/` — `find frontend/src -iname '*demo*' …` → 0;
//   R5 `import x = require()` — `grep` → 0.
// O algoritmo é o de `gen/alcance.mjs` (Apêndice A do plano), sobre o MESMO host abstrato (`GuardHost.read`): [G2] roda sobre
// arquivos virtuais, [G1]/[G1b]/[G3] sobre o disco.

type GuardHost = { readonly read: (path: string) => string | null };

const diskHost: GuardHost = { read: (path) => (existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : null) };

const slash = (path: string) => path.split("\\").join("/");
const isMockModulePath = (path: string) => /(^|\/)mocks\//.test(slash(path)) || /\.mock\.tsx?$/.test(slash(path));
const isEnvModulePath = (path: string) => /(^|\/)config\/env\.tsx?$/.test(slash(path));
const isTestPath = (path: string) => /\.test\./.test(slash(path));

function resolveModule(host: GuardHost, from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null; // especificador nu = node_modules (residual R1 declarado)
  const base = resolve(dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (/\.tsx?$/.test(candidate) && host.read(candidate) !== null) return candidate;
  }
  return null;
}

function parseModule(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

const hasExportModifier = (node: ts.Node) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** Nomes que um módulo DECLARA e exporta (função/classe/enum/const exportadas, `export default`). */
function declaredExports(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st)) names.add("default");
    if (!hasExportModifier(st)) continue;
    const isDefault = (ts.getModifiers(st) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) names.add(isDefault ? "default" : st.name.text);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
  }
  return names;
}

type ImportBinding = { readonly target: string; readonly imported: string }; // imported = "*" (namespace) | "default" | nome
type MockOrigin = "all" | Set<string>; // "all" = o módulo inteiro é mock; Set = nomes exportados cuja origem é mock (vazio = nenhum)
type MockRef = { readonly where: string; readonly name: string; readonly target: string; readonly guarded: boolean };
type FileScan = {
  readonly refs: MockRef[];
  readonly literals: string[];
  readonly failureObjects: number;
  readonly edges: string[];
};

/** O guard sobre um host: caches por host (parse e origem), para [G2] isolar cada fixture e [G1]/[G3] não reparsear barrels. */
function createGuard(host: GuardHost) {
  const parsed = new Map<string, ts.SourceFile>();
  const parse = (path: string): ts.SourceFile => {
    let sf = parsed.get(path);
    if (!sf) {
      sf = parseModule(path, host.read(path) ?? "");
      parsed.set(path, sf);
    }
    return sf;
  };

  /** Bindings de VALOR importados por um arquivo: local → { target, imported }. */
  function importBindings(file: string): Map<string, ImportBinding> {
    const out = new Map<string, ImportBinding>();
    for (const st of parse(file).statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const clause = st.importClause;
      if (!clause || clause.isTypeOnly) continue;
      const target = resolveModule(host, file, st.moduleSpecifier.text);
      if (!target) continue;
      if (clause.name) out.set(clause.name.text, { target, imported: "default" });
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) out.set(bindings.name.text, { target, imported: "*" });
      if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) if (!el.isTypeOnly) out.set(el.name.text, { target, imported: (el.propertyName ?? el.name).text });
      }
    }
    return out;
  }

  // ORIGEM MOCK em profundidade arbitrária — ponto fixo sobre re-exports, com memo e guarda de ciclo.
  const originMemo = new Map<string, MockOrigin>();
  function mockOrigin(file: string, stack = new Set<string>()): MockOrigin {
    if (isMockModulePath(file)) return "all";
    const memo = originMemo.get(file);
    if (memo) return memo;
    if (stack.has(file) || host.read(file) === null) return new Set();
    stack.add(file);
    const names = new Set<string>();
    const has = (target: string, name: string) => {
      const origin = mockOrigin(target, stack);
      return origin === "all" || origin.has(name);
    };
    const any = (target: string) => {
      const origin = mockOrigin(target, stack);
      return origin === "all" || origin.size > 0;
    };
    const imports = importBindings(file);
    for (const st of parse(file).statements) {
      if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
        if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
          const target = resolveModule(host, file, st.moduleSpecifier.text);
          if (!target) continue;
          const origin = mockOrigin(target, stack);
          if (!st.exportClause) {
            // `export * from` — tudo menos default (do módulo de mock inteiro, ou do que o barrel abaixo já marcou como mock)
            const reexported = origin === "all" ? declaredExports(parse(target)) : origin;
            for (const name of reexported) if (name !== "default") names.add(name);
          } else if (ts.isNamespaceExport(st.exportClause)) {
            if (any(target)) names.add(st.exportClause.name.text); // `export * as ns from`
          } else {
            for (const el of st.exportClause.elements) if (!el.isTypeOnly && has(target, (el.propertyName ?? el.name).text)) names.add(el.name.text);
          }
        } else if (st.exportClause && ts.isNamedExports(st.exportClause)) {
          // `export { a as b }` de binding IMPORTADO (re-export local)
          for (const el of st.exportClause.elements) {
            const binding = imports.get((el.propertyName ?? el.name).text);
            if (binding && (binding.imported === "*" ? any(binding.target) : has(binding.target, binding.imported))) names.add(el.name.text);
          }
        }
      }
      if (ts.isExportAssignment(st) && ts.isIdentifier(st.expression)) {
        // `export default x` de binding importado
        const binding = imports.get(st.expression.text);
        if (binding && (binding.imported === "*" ? any(binding.target) : has(binding.target, binding.imported))) names.add("default");
      }
    }
    stack.delete(file);
    originMemo.set(file, names);
    return names;
  }

  const isMockBinding = (binding: ImportBinding) => {
    const origin = mockOrigin(binding.target);
    return origin === "all" || (binding.imported === "*" ? origin.size > 0 : origin.has(binding.imported));
  };

  function analyze(file: string, label: string): FileScan {
    const sf = parse(file);
    const imports = importBindings(file);

    let authority: string | null = null;
    for (const [local, binding] of imports) if (isEnvModulePath(binding.target) && binding.imported === "isMockMode") authority = local;
    // Autoridade LOCAL anula a guarda: se o nome do `isMockMode` importado também é declarado no arquivo (const, function,
    // parâmetro, classe), nenhuma chamada a ele conta como `isMockMode()` de `config/env`.
    if (authority !== null) {
      const name = authority;
      const shadowed = (node: ts.Node): boolean => {
        const declared =
          (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isParameter(node) || ts.isClassDeclaration(node)) &&
          node.name !== undefined &&
          ts.isIdentifier(node.name) &&
          node.name.text === name;
        return declared || (ts.forEachChild(node, shadowed) ?? false);
      };
      if (shadowed(sf)) authority = null;
    }
    const isGuard = (expr: ts.Expression) =>
      authority !== null && ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === authority && expr.arguments.length === 0;

    // Alcançável em modo real = não está no ramo verdadeiro de NENHUMA guarda ancestral.
    const guarded = (node: ts.Node): boolean => {
      let child: ts.Node = node;
      for (let parent = node.parent; parent && !ts.isSourceFile(parent); child = parent, parent = parent.parent) {
        if (ts.isIfStatement(parent) && isGuard(parent.expression) && child === parent.thenStatement) return true;
        if (ts.isConditionalExpression(parent) && isGuard(parent.condition) && child === parent.whenTrue) return true;
        if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && isGuard(parent.left) && child === parent.right) return true;
      }
      return false;
    };
    // Ramo de FALHA (P-B): corpo de `catch`, callback de `.catch(`, direita de `??`/`||`.
    const inFailure = (node: ts.Node): string | null => {
      let child: ts.Node = node;
      for (let parent = node.parent; parent && !ts.isSourceFile(parent); child = parent, parent = parent.parent) {
        if (ts.isCatchClause(parent) && child === parent.block) return "catch";
        if (
          ts.isBinaryExpression(parent) &&
          child === parent.right &&
          (parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || parent.operatorToken.kind === ts.SyntaxKind.BarBarToken)
        ) {
          return ts.tokenToString(parent.operatorToken.kind) ?? "??";
        }
        if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression) && parent.expression.name.text === "catch" && parent.arguments.some((arg) => arg === child)) {
          return ".catch(";
        }
      }
      return null;
    };

    const line = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const mockLocals = new Map<string, ImportBinding>();
    for (const [local, binding] of imports) if (isMockBinding(binding)) mockLocals.set(local, binding);
    const isNamePosition = (id: ts.Identifier) => {
      const p = id.parent;
      return (
        (ts.isPropertyAccessExpression(p) && p.name === id) ||
        (ts.isPropertyAssignment(p) && p.name === id) ||
        (ts.isQualifiedName(p) && p.right === id) ||
        ts.isExportSpecifier(p) ||
        ts.isImportSpecifier(p) ||
        ts.isImportClause(p) ||
        ts.isNamespaceImport(p)
      );
    };
    const constLike = (expr: ts.Expression | undefined) =>
      expr !== undefined && (ts.isStringLiteralLike(expr) || ts.isNumericLiteral(expr) || ts.isTemplateExpression(expr) || ts.isNoSubstitutionTemplateLiteral(expr));

    const refs: MockRef[] = [];
    const literals: string[] = [];
    let failureObjects = 0;
    const edges: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) return;
      if (ts.isIdentifier(node) && !isNamePosition(node)) {
        const binding = mockLocals.get(node.text);
        if (binding) refs.push({ where: `${label}:${line(node)}`, name: node.text, target: binding.target, guarded: guarded(node) });
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const [arg] = node.arguments;
        const target = arg && ts.isStringLiteralLike(arg) ? resolveModule(host, file, arg.text) : null;
        if (target) {
          edges.push(target);
          const origin = mockOrigin(target);
          if (origin === "all" || origin.size > 0) refs.push({ where: `${label}:${line(node)}`, name: `import("${arg.text}")`, target, guarded: guarded(node) });
        }
      }
      if (ts.isObjectLiteralExpression(node)) {
        const where = inFailure(node);
        if (where !== null && !guarded(node)) {
          failureObjects += 1;
          const identity = node.properties.filter(
            (p): p is ts.PropertyAssignment =>
              ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && ["id", "code"].includes(p.name.text) && constLike(p.initializer),
          );
          if (identity.length > 0) {
            literals.push(`${label}:${line(node)} {${identity.map((p) => `${(p.name as ts.Identifier | ts.StringLiteral).text}: ${p.initializer.getText(sf)}`).join(", ")}} em ${where}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    for (const st of sf.statements) {
      if ((ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
        const typeOnly = ts.isImportDeclaration(st) ? (st.importClause ? st.importClause.isTypeOnly : false) : st.isTypeOnly;
        if (typeOnly) continue;
        const target = resolveModule(host, file, st.moduleSpecifier.text);
        if (target) edges.push(target);
      }
    }
    return { refs, literals, failureObjects, edges };
  }

  return { analyze, mockOrigin };
}

type ReachScan = {
  /** arquivos raiz analisados */
  readonly roots: string[];
  /** fecho fora das raízes, em profundidade (sem módulos de mock, sem testes) */
  readonly closure: string[];
  readonly rootRefs: MockRef[];
  readonly rootLeaks: string[];
  readonly closureLeaks: string[];
  readonly rootLiterals: string[];
  readonly rootFailureObjects: number;
};

/** Varre RAÍZES (lista dada: do disco em [G1]/[G3], virtual em [G2]) + FECHO de import; rótulos relativos a `labelRoot`. */
function scanReach(host: GuardHost, rootFiles: readonly string[], labelRoot: string): ReachScan {
  const guard = createGuard(host);
  const label = (file: string) => slash(relative(labelRoot, file));
  const roots = rootFiles.filter((file) => !isTestPath(file) && !isMockModulePath(file) && host.read(file) !== null).sort();
  const rootSet = new Set(roots);
  const seen = new Map<string, FileScan>();
  const parentOf = new Map<string, string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file) || isMockModulePath(file) || isTestPath(file)) continue;
    const scan = guard.analyze(file, label(file));
    seen.set(file, scan);
    for (const target of scan.edges) {
      if (!seen.has(target) && !parentOf.has(target)) parentOf.set(target, file);
      queue.push(target);
    }
  }
  const pathTo = (file: string) => {
    const chain: string[] = [];
    for (let current: string | undefined = file; current; current = parentOf.get(current)) {
      chain.unshift(label(current));
      if (rootSet.has(current)) break;
    }
    return chain.join(" → ");
  };
  const leak = (ref: MockRef) => `${ref.where} ${ref.name} ← ${label(ref.target)}`;
  const closure = [...seen.keys()].filter((file) => !rootSet.has(file)).sort();
  const rootScans = roots.map((file) => seen.get(file)!);
  return {
    roots,
    closure,
    rootRefs: rootScans.flatMap((scan) => scan.refs),
    rootLeaks: rootScans.flatMap((scan) => scan.refs.filter((ref) => !ref.guarded).map(leak)),
    closureLeaks: closure.flatMap((file) =>
      seen
        .get(file)!
        .refs.filter((ref) => !ref.guarded)
        .map((ref) => `${leak(ref)}   [caminho: ${pathTo(file)}]`),
    ),
    rootLiterals: rootScans.flatMap((scan) => scan.literals),
    rootFailureObjects: rootScans.reduce((sum, scan) => sum + scan.failureObjects, 0),
  };
}

function listSources(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) listSources(path, acc);
    else if (/\.tsx?$/.test(name) && !isTestPath(path) && !isMockModulePath(path)) acc.push(path);
  }
  return acc;
}

const FRONTEND_ROOT = fileURLToPath(new URL("../", import.meta.url));
// As RAÍZES: duas pastas + o arquivo de fronteira (a linha do §5 do PLANO_SAN3 — `useServiceQuoteReferences.ts` consome a lista de
// OS e estava FORA do alcance do G1 do ciclo 2: `N-FORA-RAIZ`).
const GUARDED_DIRS = [
  fileURLToPath(new URL("../src/modules/work-orders/", import.meta.url)),
  fileURLToPath(new URL("../src/modules/operations/dispatches/", import.meta.url)),
];
const GUARDED_FILES = [fileURLToPath(new URL("../src/modules/registry/service-quotes/useServiceQuoteReferences.ts", import.meta.url))];
// Sítio SABIDO (denominador de [G1]): `work-orders.service.ts` referencia `getMockWorkOrdersData` atrás de `isMockMode()`.
const KNOWN_SITE = { file: "src/modules/work-orders/work-orders.service.ts", name: "getMockWorkOrdersData" };

function scanGuardedRoots(): ReachScan & { readonly filesPerDir: number[] } {
  const perDir = GUARDED_DIRS.map((dir) => listSources(dir));
  const scan = scanReach(diskHost, [...perDir.flat(), ...GUARDED_FILES], FRONTEND_ROOT);
  return { ...scan, filesPerDir: perDir.map((files) => files.length) };
}

test("[G1] alcance real: em work-orders/**, operations/dispatches/**, no arquivo de fronteira e em todo o FECHO de import, nenhum identificador de origem mock (em QUALQUER profundidade de re-export) é alcançável fora do ramo verdadeiro de isMockMode()", (t) => {
  const scan = scanGuardedRoots();
  t.diagnostic(`[G1] raízes=${scan.roots.length} (por pasta ${scan.filesPerDir.join("/")} + ${GUARDED_FILES.length} arquivo) · fecho=${scan.closure.length} · referências de origem mock nas raízes=${scan.rootRefs.length} (guardadas=${scan.rootRefs.filter((ref) => ref.guarded).length}) · vazamentos raiz/fecho=${scan.rootLeaks.length}/${scan.closureLeaks.length}`);
  // Denominadores: a varredura tem de ENXERGAR as raízes, o arquivo de fronteira, o fecho e as referências legítimas ao mock
  // (as que ficam atrás de isMockMode()) — e um sítio SABIDO. Um guard que não resolve import nenhum passaria "verde" sem olhar nada.
  assert.ok(scan.filesPerDir.every((n) => n > 0), `arquivos varridos por pasta-raiz: ${scan.filesPerDir.join(" / ")}`);
  for (const file of GUARDED_FILES) assert.ok(scan.roots.includes(file), `arquivo de fronteira presente nas raízes: ${slash(relative(FRONTEND_ROOT, file))}`);
  assert.ok(scan.closure.length > 0, `fecho de import fora das raízes: ${scan.closure.length} arquivo(s)`);
  assert.ok(scan.rootRefs.length >= 10, `referências de origem mock vistas nas raízes: ${scan.rootRefs.length}`);
  const known = scan.rootRefs.find((ref) => ref.where.startsWith(`${KNOWN_SITE.file}:`) && ref.name === KNOWN_SITE.name);
  assert.ok(known, `sítio sabido visto: ${KNOWN_SITE.file} → ${KNOWN_SITE.name}`);
  assert.equal(known.guarded, true, "o sítio sabido está atrás de isMockMode() (o guard distingue guardado de solto)");
  assert.deepEqual(scan.rootLeaks, [], "identificador de origem mock alcançável em modo real (raízes)");
  assert.deepEqual(scan.closureLeaks, [], "identificador de origem mock alcançável em modo real (fecho de import das raízes)");
});

test("[G1b] entidade fabricada inline: nas raízes nenhum literal de objeto com identidade (`id`/`code`) CONSTANTE nasce em ramo de falha (catch / .catch( / ?? / ||) fora de isMockMode()", (t) => {
  const scan = scanGuardedRoots();
  t.diagnostic(`[G1b] literais de objeto em ramo de falha vistos nas raízes=${scan.rootFailureObjects} · com identidade constante=${scan.rootLiterals.length}`);
  // Denominador: o varredor tem de ENXERGAR literais de objeto em ramo de falha (os legítimos, sem identidade — ex.: `{ items: [], … }`).
  assert.ok(scan.rootFailureObjects >= 10, `literais de objeto em ramo de falha vistos nas raízes: ${scan.rootFailureObjects}`);
  assert.deepEqual(scan.rootLiterals, [], "literal com identidade constante em ramo de falha (entidade inventada)");
});

// Arquivos virtuais para o auto-teste do guard (G2): o mesmo código do G1, sobre um host em memória.
const VIRTUAL = resolve(tmpdir(), "b-san3-01-g2-virtual");
const VIRTUAL_FILES: Record<string, string> = {
  "config/env.ts": "export function isMockMode() { return false; }\n",
  "fake-env.ts": "export function isMockMode() { return true; }\n",
  "x.mock.ts": "export function getMockX() { return 1; }\nexport const mockItems = [1];\n",
  "barrel.ts": 'export * from "./x.mock";\nexport const real = 1;\n',
  // B-SAN3-01b — as formas do §0.5 L1 do plano (controles C1–C12 do gerador)
  "reexport-a.ts": 'export * from "./x.mock";\n',
  "reexport-b.ts": 'export * from "./reexport-a";\n',
  "reexport-c.ts": 'export { getMockX as detalheDemo } from "./reexport-b";\n',
  "reexport-local.ts": 'import { getMockX } from "./x.mock";\nexport { getMockX as fallbackDetail };\n',
  "reexport-default.ts": 'import { getMockX } from "./x.mock";\nexport default getMockX;\n',
  "barrel-ns.ts": 'export * as demo from "./x.mock";\n',
  "lib/wo-demo.ts": 'export * from "../x.mock";\n',
  "lib/wo-demo2.ts": 'import { getMockX } from "../x.mock";\nexport const demo = (id: string) => getMockX();\n',
};
const virtualHost = (fixture: string): GuardHost => {
  const table = new Map(Object.entries({ ...VIRTUAL_FILES, "a.ts": fixture }).map(([k, v]) => [slash(join(VIRTUAL, k)), v]));
  return { read: (path) => table.get(slash(path)) ?? null };
};
const ENV = 'import { isMockMode } from "./config/env";\n';
const MOCK = 'import { getMockX, mockItems } from "./x.mock";\n';
type G2Fixture = {
  readonly label: string;
  readonly code: string;
  /** vazamentos na raiz `a.ts` */
  readonly leaks: number;
  /** referências de origem mock VISTAS na raiz (guardadas ou não) */
  readonly refs: number;
  /** literais com identidade constante em ramo de falha na raiz (P-B) */
  readonly literals?: number;
  /** vazamentos no FECHO (arquivos que `a.ts` importa) */
  readonly closureLeaks?: number;
};
const G2_FIXTURES: readonly G2Fixture[] = [
  { label: "(a) `?? getMockX()` solto", code: `${MOCK}export async function f(r: unknown) { return adapt(r) ?? getMockX(); }`, leaks: 1, refs: 1 },
  { label: "(b) `else` de `if (isMockMode()) {}`", code: `${ENV}${MOCK}export function f() { if (isMockMode()) { return 0; } else { return getMockX(); } }`, leaks: 1, refs: 1 },
  { label: "(c) código com comentário citando isMockMode()", code: `${ENV}${MOCK}export function f(r: unknown) {\n  if (isMockMode()) return 0;\n  return adapt(r) ?? getMockX(); // isMockMode()\n}`, leaks: 1, refs: 1 },
  { label: "(d) constante `mockItems` sem o prefixo getMock", code: `${MOCK}export const items = (r: unknown[]) => (r.length ? r : mockItems);`, leaks: 1, refs: 1 },
  { label: "(e) bloco `if (isMockMode()) { … }`", code: `${ENV}${MOCK}export function f() { if (isMockMode()) { const c = getMockX(); return c; } return 0; }`, leaks: 0, refs: 1 },
  { label: "(f) `isMockMode() ? mock : real`", code: `${ENV}${MOCK}export const f = (real: number) => (isMockMode() ? getMockX() : real);`, leaks: 0, refs: 1 },
  { label: "(g) `isMockMode() && mock`", code: `${ENV}${MOCK}export const f = () => isMockMode() && mockItems;`, leaks: 0, refs: 1 },
  { label: "(h) `isMockMode` local", code: `${MOCK}const isMockMode = () => true;\nexport function f() { if (isMockMode()) return getMockX(); return 0; }`, leaks: 1, refs: 1 },
  { label: "(i) import de config/env sombreado por declaração local", code: `${ENV}${MOCK}export function f(isMockMode: () => boolean) { if (isMockMode()) return getMockX(); return 0; }`, leaks: 1, refs: 1 },
  { label: "(j) isMockMode importado de OUTRO módulo", code: `import { isMockMode } from "./fake-env";\n${MOCK}export function f() { if (isMockMode()) return getMockX(); return 0; }`, leaks: 1, refs: 1 },
  { label: "(k) forma negada `!isMockMode()` com mock no else", code: `${ENV}${MOCK}export function f() { if (!isMockMode()) return 0; else return getMockX(); }`, leaks: 1, refs: 1 },
  { label: "(l) via barrel um nível", code: `import { getMockX } from "./barrel";\nexport const f = () => getMockX();`, leaks: 1, refs: 1 },
  { label: "(m) `import * as M` de mock", code: `import * as M from "./x.mock";\nexport const f = () => M.getMockX();`, leaks: 1, refs: 1 },
  { label: "(n) `import()` dinâmico de mock", code: `export async function f() { const m = await import("./x.mock"); return m.getMockX(); }`, leaks: 1, refs: 1 },
  { label: "(o) nome real do barrel não é mock", code: `import { real } from "./barrel";\nexport const f = () => real;`, leaks: 0, refs: 0 },
  // ---- B-SAN3-01b: as 12 formas do §0.5 L1 (C1–C12), mais o namespace re-exportado ----
  { label: "(p) C1 barrel de 1 nível (a forma que o G1 do ciclo 2 pegava)", code: `import { getMockX } from "./reexport-a";\nexport const f = () => getMockX();`, leaks: 1, refs: 1 },
  { label: "(q) C2 barrel de 2 NÍVEIS (N-BARREL2)", code: `import { getMockX } from "./reexport-b";\nexport const f = () => getMockX();`, leaks: 1, refs: 1 },
  { label: "(r) C3 barrel de 3 níveis com RENOME", code: `import { detalheDemo } from "./reexport-c";\nexport const f = () => detalheDemo();`, leaks: 1, refs: 1 },
  { label: "(s) C4 literal INLINE com identidade constante em catch (N-LITERAL)", code: `export async function f(p: Promise<unknown>) { try { return await p; } catch { return { id: "", code: "OS-FALLBACK", title: "Ordem indisponível", status: "open" }; } }`, leaks: 0, refs: 0, literals: 1 },
  { label: "(t) C5 barrel FORA das raízes", code: `import { getMockX } from "./lib/wo-demo";\nexport const f = () => getMockX();`, leaks: 1, refs: 1 },
  { label: "(u) C6 helper FORA das raízes que embrulha o mock — só o FECHO pega", code: `import { demo } from "./lib/wo-demo2";\nexport const f = () => demo("x");`, leaks: 0, refs: 0, closureLeaks: 1 },
  { label: "(v) C7 re-export LOCAL de binding importado", code: `import { fallbackDetail } from "./reexport-local";\nexport const f = () => fallbackDetail();`, leaks: 1, refs: 1 },
  { label: "(w) C8 arquivo-raiz avulso importando mock sem guarda (a forma do N-FORA-RAIZ)", code: `${MOCK}export const workOrderOptionsFallback = () => mockItems.map((o) => ({ id: String(o), label: String(o) }));`, leaks: 1, refs: 1 },
  { label: "(x) C9 NEGATIVO: mock no ramo verdadeiro via barrel de 2 níveis", code: `${ENV}import { getMockX } from "./reexport-b";\nexport const f = () => (isMockMode() ? getMockX() : null);`, leaks: 0, refs: 1 },
  { label: "(y) C10 `export default` de binding de mock (o consumidor E o barrel vazam)", code: `import d from "./reexport-default";\nexport const f = () => d();`, leaks: 1, refs: 1, closureLeaks: 1 },
  { label: "(z) C11 NEGATIVO `{ id, workOrder: null }` em catch + POSITIVO `r ?? { code: \"OS-DEMO\" }`", code: `export async function a(p: Promise<unknown>, id: string) { try { return await p; } catch { return { id, workOrder: null }; } }\nexport const b = (r: { code?: string } | null) => r ?? { code: "OS-DEMO" };`, leaks: 0, refs: 0, literals: 1 },
  { label: "(aa) C12 `import()` dinâmico via barrel de 2 níveis", code: `export async function f() { const m = await import("./reexport-b"); return m.getMockX(); }`, leaks: 1, refs: 1 },
  { label: "(ab) `export * as ns from mock` consumido solto", code: `import { demo } from "./barrel-ns";\nexport const f = () => demo.getMockX();`, leaks: 1, refs: 1 },
  { label: "(ac) NEGATIVO: literal com identidade fora de ramo de falha (construção legítima)", code: `export const make = (id: string) => ({ id, code: "OS-" + id, status: "open" });\nexport const empty = () => ({ items: [], pagination: { limit: 20, offset: 0, total: 0 } });`, leaks: 0, refs: 0, literals: 0 },
];

test("[G2] auto-teste do guard por alcance: as formas que vazam ficam vermelhas (raiz OU fecho), as guardadas ficam verdes, com `leaks`, `refs`, `literals` e `closureLeaks` esperados", () => {
  for (const fixture of G2_FIXTURES) {
    const scan = scanReach(virtualHost(fixture.code), [join(VIRTUAL, "a.ts")], VIRTUAL);
    assert.equal(scan.rootLeaks.length, fixture.leaks, `${fixture.label} → vazamentos na raiz ${JSON.stringify(scan.rootLeaks)}`);
    assert.equal(scan.rootRefs.length, fixture.refs, `${fixture.label}: referências de origem mock VISTAS na raiz`);
    assert.equal(scan.rootLiterals.length, fixture.literals ?? 0, `${fixture.label} → literais com identidade em ramo de falha ${JSON.stringify(scan.rootLiterals)}`);
    assert.equal(scan.closureLeaks.length, fixture.closureLeaks ?? 0, `${fixture.label} → vazamentos no fecho ${JSON.stringify(scan.closureLeaks)}`);
  }
});

test("[G3] a enumeração vem do DISCO: arquivo novo numa pasta varrida com barrel de 3 níveis, literal inline em catch e helper FORA da pasta (fecho) ficam vermelhos com a lista exata", () => {
  const dir = mkdtempSync(join(tmpdir(), "b-san3-01b-g3-"));
  try {
    const src = join(dir, "src");
    mkdirSync(join(src, "config"), { recursive: true });
    mkdirSync(join(src, "modules", "x"), { recursive: true });
    mkdirSync(join(src, "lib"), { recursive: true });
    writeFileSync(join(src, "config", "env.ts"), VIRTUAL_FILES["config/env.ts"]);
    writeFileSync(join(src, "modules", "x", "x.mock.ts"), VIRTUAL_FILES["x.mock.ts"]);
    writeFileSync(join(src, "modules", "x", "reexport-a.ts"), 'export * from "./x.mock";\n');
    writeFileSync(join(src, "modules", "x", "reexport-b.ts"), 'export * from "./reexport-a";\n');
    writeFileSync(join(src, "modules", "x", "reexport-c.ts"), 'export { getMockX as detalheDemo } from "./reexport-b";\n');
    writeFileSync(join(src, "modules", "x", "guardado.service.ts"), `import { isMockMode } from "../../config/env";\n${MOCK}export function f() { if (isMockMode()) return getMockX(); return 0; }\n`);
    writeFileSync(join(src, "modules", "x", "novo.service.ts"), 'import { detalheDemo } from "./reexport-c";\nexport function f() { return detalheDemo(); }\n');
    writeFileSync(join(src, "modules", "x", "literal.service.ts"), 'export async function g(p: Promise<unknown>) {\n  try { return await p; } catch { return { id: "", code: "OS-FALLBACK" }; }\n}\n');
    writeFileSync(join(src, "lib", "wo-demo2.ts"), 'import { getMockX } from "../modules/x/x.mock";\nexport const demo = () => getMockX();\n');
    writeFileSync(join(src, "modules", "x", "fecho.service.ts"), 'import { demo } from "../../lib/wo-demo2";\nexport const h = () => demo();\n');
    const roots = listSources(join(src, "modules", "x"));
    const scan = scanReach(diskHost, roots, src);
    assert.deepEqual(
      scan.roots.map((file) => slash(relative(src, file))),
      ["modules/x/fecho.service.ts", "modules/x/guardado.service.ts", "modules/x/literal.service.ts", "modules/x/novo.service.ts", "modules/x/reexport-a.ts", "modules/x/reexport-b.ts", "modules/x/reexport-c.ts"],
      "env fica fora da pasta; o módulo de mock não é varrido; os barrels e os services novos entram sozinhos",
    );
    assert.deepEqual(scan.closure.map((file) => slash(relative(src, file))), ["config/env.ts", "lib/wo-demo2.ts"], "o fecho alcança o helper FORA da pasta");
    assert.equal(scan.rootRefs.length, 2, "guardado.service (guardado) + novo.service (solto)");
    assert.deepEqual(scan.rootLeaks, ["modules/x/novo.service.ts:2 detalheDemo ← modules/x/reexport-c.ts"]);
    assert.deepEqual(scan.closureLeaks, ["lib/wo-demo2.ts:2 getMockX ← modules/x/x.mock.ts   [caminho: modules/x/fecho.service.ts → lib/wo-demo2.ts]"]);
    assert.deepEqual(scan.rootLiterals, ['modules/x/literal.service.ts:2 {id: "", code: "OS-FALLBACK"} em catch']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// =============================== S. Fiação — a página liga o handler testado ===============================

test("[S1] WorkOrderCreatePage chama runCreateWorkOrder e NÃO chama createWorkOrder direto (handler testado = ligado)", async () => {
  const page = await readFile(new URL("../src/modules/work-orders/pages/WorkOrderCreatePage.tsx", import.meta.url), "utf8");
  assert.match(page, /runCreateWorkOrder\(/);
  assert.doesNotMatch(page, /(?<!run)createWorkOrder\(/, "a página não chama o service direto");
  assert.doesNotMatch(page, /import \{[^}]*\bcreateWorkOrder\b[^}]*\} from "\.\.\/work-orders\.service"/);
});

// =============================== W. Ciclo 2 · P4 → B-SAN3-01b — fiação dos hooks vigiada por COMPORTAMENTO ===============================
// C4-04 (ciclo 2): a regra "desatualizado mantém os dados" (R1/R4) só existe se o hook repassar o `background` do `refresh` ao
// reducer. Os vigias `[W1]`/`[W2]` eram REGEX sobre o texto dos hooks (A-03 da ata: `N-W1TXT` — `const background = false`
// dentro do callback — mantinha o regex verde). Saíram daqui e vivem em `tests/work-orders-page-live.test.tsx`, por
// comportamento: a página REAL com o hook REAL, 3 OS na tela, 500 no tick do auto-refresh → `data-state="stale"` com as
// linhas mantidas (lista) e com a OS no DOM (detalhe). Nenhum hook foi tocado para isso.

// =============================== V. Ciclo 2 · P5 — estado desenhado = estado renderizado ===============================
// C3-B1/A1/A2/A3: os painéis reproduzem a ficha de `docs/claude-code-handoff/ERP Web.dc.html` l.362-382 (borda,
// círculo 60×60 com ícone, título 16/800 #334155, detalhe 13 #94A3B8, botão cheio). Os tokens saem LITERALMENTE no
// HTML do SSR; hover (#1D4ED8) e foco (outline 2px #2563EB) vêm das classes `.pat-btn`/`.pat-btn--primary` do
// app.css e são medidos no navegador pela junta.

type HtmlEl = { readonly tag: string; readonly attrs: Readonly<Record<string, string>>; readonly children: Array<HtmlEl | string> };

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const decodeHtml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Árvore mínima do HTML do renderToString (bem-formado): tags, atributos e texto. */
function parseHtml(html: string): HtmlEl {
  const root: HtmlEl = { tag: "#root", attrs: {}, children: [] };
  const stack: HtmlEl[] = [root];
  const token = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
  for (const m of html.matchAll(token)) {
    if (m[1]) {
      while (stack.length > 1 && stack.pop()?.tag !== m[1]);
    } else if (m[2]) {
      const attrs = Object.fromEntries([...(m[3] ?? "").matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map((a) => [a[1], decodeHtml(a[2] ?? "")]));
      const el: HtmlEl = { tag: m[2], attrs, children: [] };
      stack[stack.length - 1].children.push(el);
      if (!m[4] && !VOID_TAGS.has(m[2])) stack.push(el);
    } else if (m[5]) {
      stack[stack.length - 1].children.push(decodeHtml(m[5]));
    }
  }
  return root;
}

const elementsOf = (el: HtmlEl) => el.children.filter((c): c is HtmlEl => typeof c !== "string");
const textOf = (el: HtmlEl): string => el.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("");
const classesOf = (el: HtmlEl) => (el.attrs.class ?? "").split(/\s+/).filter(Boolean);
function findAll(el: HtmlEl, match: (e: HtmlEl) => boolean, acc: HtmlEl[] = []): HtmlEl[] {
  for (const child of elementsOf(el)) {
    if (match(child)) acc.push(child);
    findAll(child, match, acc);
  }
  return acc;
}
function styleOf(el: HtmlEl): Record<string, string> {
  return Object.fromEntries(
    (el.attrs.style ?? "")
      .split(";")
      .filter((d) => d.includes(":"))
      .map((d) => [d.slice(0, d.indexOf(":")).trim(), d.slice(d.indexOf(":") + 1).trim()]),
  );
}
const firstElement = (html: string) => {
  const [first] = elementsOf(parseHtml(html));
  assert.ok(first, "o render produziu um elemento");
  return first;
};

type PanelSpec = { border: string | null; padding: string; icon: string; iconSize: string; circleBg: string; iconColor: string; detailMax: string };
const SPEC_ERROR: PanelSpec = { border: "1px solid #FECACA", padding: "50px 32px", icon: "lucide-triangle-alert", iconSize: "28", circleBg: "#FEF2F2", iconColor: "#DC2626", detailMax: "340px" };
const SPEC_FORBIDDEN: PanelSpec = { border: "1px solid #E2E8F0", padding: "50px 32px", icon: "lucide-shield", iconSize: "26", circleBg: "#F1F5F9", iconColor: "#94A3B8", detailMax: "340px" };
const SPEC_EMPTY: PanelSpec = { border: "1px solid #E2E8F0", padding: "54px 32px", icon: "lucide-clipboard-list", iconSize: "28", circleBg: "#F1F5F9", iconColor: "#94A3B8", detailMax: "330px" };
const SPEC_NOT_FOUND: PanelSpec = { ...SPEC_FORBIDDEN, icon: "lucide-clipboard-list", iconSize: "28" };

/** Confere a ficha do painel na raiz renderizada; devolve os botões para o caso afirmar as ações. */
function assertPanelSpec(root: HtmlEl, spec: PanelSpec, label: string): HtmlEl[] {
  const s = styleOf(root);
  if (spec.border === null) {
    assert.equal(s.border, undefined, `${label}: embutido não tem borda própria`);
    assert.equal(s["border-radius"], undefined, `${label}: embutido não tem raio próprio`);
  } else {
    assert.equal(s.border, spec.border, `${label}: borda`);
    assert.equal(s["border-radius"], "13px", `${label}: raio`);
  }
  assert.equal(s.background, "#fff", `${label}: fundo`);
  assert.equal(s.padding, spec.padding, `${label}: padding`);
  assert.equal(s["text-align"], "center", `${label}: centrado`);
  assert.equal(s.display, "flex", label);
  assert.equal(s["flex-direction"], "column", label);
  assert.equal(s["align-items"], "center", label);
  assert.equal(s.gap, "10px", label);

  const [circle, title, detailEl] = elementsOf(root);
  assert.ok(circle && title && detailEl, `${label}: círculo, título e detalhe`);
  const svgs = findAll(circle, (e) => e.tag === "svg");
  assert.equal(svgs.length, 1, `${label}: um ícone no círculo`);
  assert.ok(classesOf(svgs[0]).includes(spec.icon), `${label}: ícone ${spec.icon} (veio ${svgs[0].attrs.class})`);
  assert.equal(svgs[0].attrs.width, spec.iconSize, `${label}: tamanho do ícone`);
  const c = styleOf(circle);
  assert.deepEqual(
    [c.width, c.height, c["border-radius"], c.background, c.color],
    ["60px", "60px", "50%", spec.circleBg, spec.iconColor],
    `${label}: círculo 60×60`,
  );
  const t = styleOf(title);
  assert.deepEqual([t["font-size"], t["font-weight"], t.color], ["16px", "800", "#334155"], `${label}: título 16/800 #334155`);
  const d = styleOf(detailEl);
  assert.deepEqual([d["font-size"], d.color, d["max-width"], d["line-height"]], ["13px", "#94A3B8", spec.detailMax, "1.5"], `${label}: detalhe`);

  const buttons = findAll(root, (e) => e.tag === "button");
  for (const b of buttons) {
    assert.equal(b.attrs.type, "button", `${label}: botão type=button`);
    assert.ok(classesOf(b).includes("pat-btn"), `${label}: botão com a classe do padrão (hover/foco) — veio "${b.attrs.class}"`);
    const bs = styleOf(b);
    assert.deepEqual([bs["margin-top"], bs["border-radius"], bs["font-size"]], ["6px", "10px", "13px"], `${label}: medidas do botão`);
  }
  return buttons;
}

test("[V1] lista em ERRO: ficha do protótipo (borda #FECACA, alerta vermelho 28, título 16/800) e 'Tentar novamente' cheio", async () => {
  const { WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const root = firstElement(renderToString(<WorkOrdersLoadState status="error" message="A consulta falhou." onRetry={() => undefined} />));
  assert.equal(root.attrs["data-state"], "error");
  assert.equal(root.attrs.role, "alert");
  const buttons = assertPanelSpec(root, SPEC_ERROR, "lista erro");
  assert.equal(buttons.length, 1);
  assert.deepEqual(classesOf(buttons[0]), ["pat-btn", "pat-btn--primary"]);
  assert.equal(styleOf(buttons[0]).padding, "10px 20px");
  assert.equal(textOf(buttons[0]), "Tentar novamente");
});

test("[V2] lista SEM PERMISSÃO: borda neutra, escudo cinza 26, sem botão e sem role=alert", async () => {
  const { WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const html = renderToString(<WorkOrdersLoadState status="forbidden" />);
  const root = firstElement(html);
  assert.equal(root.attrs["data-state"], "forbidden");
  assert.equal(root.attrs.role, undefined);
  assert.equal(assertPanelSpec(root, SPEC_FORBIDDEN, "lista sem permissão").length, 0);
  assert.doesNotMatch(html, /role="alert"/);
});

test("[V3] lista VAZIA: ficha 54px 32px com prancheta; CTA 'Nova OS' só quando há ação de criar; embutido sem borda própria", async () => {
  const { WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const withCreate = firstElement(renderToString(<WorkOrdersLoadState status="empty" onCreate={() => undefined} />));
  assert.equal(withCreate.attrs["data-state"], "empty");
  assert.equal(withCreate.attrs.role, undefined);
  const buttons = assertPanelSpec(withCreate, SPEC_EMPTY, "vazio com criar");
  assert.equal(buttons.length, 1);
  assert.deepEqual(classesOf(buttons[0]), ["pat-btn", "pat-btn--primary"]);
  assert.equal(styleOf(buttons[0]).padding, "10px 18px");

  const withoutCreate = firstElement(renderToString(<WorkOrdersLoadState status="empty" />));
  assert.equal(assertPanelSpec(withoutCreate, SPEC_EMPTY, "vazio sem criar").length, 0, "sem permissão de criar, sem CTA");

  const embedded = firstElement(renderToString(<WorkOrdersLoadState status="empty" filtered embedded />));
  assert.equal(embedded.attrs["data-state"], "empty");
  assertPanelSpec(embedded, { ...SPEC_EMPTY, border: null }, "vazio embutido (filtro)");
});

test("[V4] detalhe: sem permissão / não encontrada / erro com a ficha do tom, botões do padrão e nada de #BFDBFE", async () => {
  const { WorkOrderDetailView } = await import("../src/modules/work-orders/pages/WorkOrderDetailPage");
  const render = (status: "forbidden" | "not-found" | "error") =>
    renderToString(
      <MemoryRouter>
        <WorkOrderDetailView
          workOrder={null}
          timeline={[]}
          loading={false}
          status={status}
          error="A consulta falhou."
          stale={false}
          lastUpdatedAt={null}
          timelineUnavailable={false}
          context={CTX}
          permissions={["work_orders:read"]}
          activeTab="informacoes-gerais"
          onSelectTab={() => undefined}
          onRefresh={() => undefined}
        />
      </MemoryRouter>,
    );
  const cases = [
    ["forbidden", SPEC_FORBIDDEN, 1],
    ["not-found", SPEC_NOT_FOUND, 1],
    ["error", SPEC_ERROR, 2],
  ] as const;
  for (const [status, spec, count] of cases) {
    const html = render(status);
    assert.doesNotMatch(html, /#BFDBFE/i, `${status}: sem o botão secundário antigo`);
    const root = firstElement(html);
    assert.equal(root.attrs["data-state"], status);
    assert.equal(root.attrs.role, status === "error" ? "alert" : undefined, `${status}: role=alert só no erro`);
    const buttons = assertPanelSpec(root, spec, `detalhe ${status}`);
    assert.equal(buttons.length, count, `${status}: ações`);
    assert.ok(classesOf(buttons[0]).includes("pat-btn--primary"), `${status}: a 1ª ação é a primária`);
    assert.equal(styleOf(buttons[0]).padding, "10px 20px");
    if (status === "error") {
      assert.equal(textOf(buttons[0]), "Tentar novamente");
      assert.deepEqual(classesOf(buttons[1]), ["pat-btn"], "a 2ª ação do erro é a secundária do padrão");
    }
  }
});

test("[V5] grade de KPI degradada: 4 tiles neutros (#94A3B8 sobre #F1F5F9), sem selo e sem cor de sucesso/perigo", async () => {
  const { WorkOrdersKpiGrid } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const html = renderToString(<WorkOrdersKpiGrid kpis={KPIS_ANY} kpiDetails={null} skeleton={false} degraded />);
  const tiles = findAll(parseHtml(html), (e) => classesOf(e).includes("pat-kpi__tile"));
  assert.equal(tiles.length, 4);
  for (const tile of tiles) {
    const s = styleOf(tile);
    assert.deepEqual([s.color, s.background], ["#94A3B8", "#F1F5F9"], "tile neutro sobre '—'");
  }
  assert.doesNotMatch(html, /#15803D|#DC2626|#F0FDF4|#FEF2F2|#FCA5A5/i, "nenhuma cor afirma 'sob controle'/'agir agora' sobre '—'");
  assert.doesNotMatch(html, /pat-kpi__tag/);
  assert.deepEqual(kpiValues(html), ["—", "—", "—", "—"]);
});

test("[V6] os estados se distinguem A OLHO: erro × sem permissão por cor da borda E ícone; sem permissão × vazio por ícone e título", async () => {
  const { WorkOrdersLoadState } = await import("../src/modules/work-orders/pages/WorkOrdersPage");
  const panel = (status: "error" | "forbidden" | "empty") => {
    const root = firstElement(renderToString(<WorkOrdersLoadState status={status} message="x" onRetry={() => undefined} />));
    const [circle, title] = elementsOf(root);
    const svg = circle ? findAll(circle, (e) => e.tag === "svg")[0] : undefined;
    return { border: styleOf(root).border, icon: svg ? classesOf(svg).find((c) => c.startsWith("lucide-")) : undefined, title: title ? textOf(title) : "" };
  };
  const error = panel("error");
  const forbidden = panel("forbidden");
  const empty = panel("empty");
  assert.ok(error.border && forbidden.border, "os dois painéis têm borda");
  assert.notEqual(error.border, forbidden.border, "erro × sem permissão: borda");
  assert.ok(error.icon && forbidden.icon && empty.icon, "os três painéis têm ícone");
  assert.notEqual(error.icon, forbidden.icon, "erro × sem permissão: ícone");
  assert.notEqual(forbidden.icon, empty.icon, "sem permissão × vazio: ícone");
  assert.notEqual(forbidden.title, empty.title, "sem permissão × vazio: título");
});
