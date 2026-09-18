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

// =============================== G. Ciclo 2 · P3 — mock só por ALCANCE (AST), não por texto ===============================
// C4-02: o G1 do ciclo 1 era LÉXICO (linha que cita `getMock` e não cita `isMockMode()`), e deixou passar o `else` de
// `if (isMockMode()) {}`, a linha com comentário citando `isMockMode()`, a constante `mock…` sem o prefixo e o service
// NOVO. A propriedade agora é decidida sobre a árvore sintática do TypeScript:
//   · escopo = todo *.ts/*.tsx de `modules/work-orders/**` e `modules/operations/dispatches/**`, ENUMERADO DO DISCO
//     (arquivo novo entra sozinho), sem *.test.* e sem os próprios módulos de mock;
//   · origem mock = o IMPORT (não o nome): módulo `*.mock.ts(x)` ou sob `mocks/`, direto ou via barrel um nível
//     (`export *` / `export { … } from`); `import * as M`, default e `import()` dinâmico também contam;
//   · permitido = só o ramo VERDADEIRO de `isMockMode()` importado de `config/env` — o `then` de `if (isMockMode())`,
//     o `whenTrue` de `isMockMode() ? … : …` e a direita de `isMockMode() && …`. Forma positiva única: `else`,
//     `!isMockMode()`, `isMockMode` declarado no arquivo ou importado de outro módulo NÃO valem;
//   · comentário não existe na AST. Sem lista de exceção.

type GuardHost = { readonly read: (path: string) => string | null };

const diskHost: GuardHost = { read: (path) => (existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : null) };

const slash = (path: string) => path.split("\\").join("/");
const isMockModulePath = (path: string) => /(^|\/)mocks\//.test(slash(path)) || /\.mock\.tsx?$/.test(slash(path));
const isEnvModulePath = (path: string) => /(^|\/)config\/env\.tsx?$/.test(slash(path));

function resolveModule(host: GuardHost, from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
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

/** Nomes que um módulo exporta (declarações exportadas, listas locais `export { a }` e `export default`). */
function exportedNames(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st)) names.add("default");
    if (ts.isExportDeclaration(st) && !st.moduleSpecifier && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) names.add(el.name.text);
    }
    if (!hasExportModifier(st)) continue;
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) names.add(st.name.text);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
  }
  return names;
}

/** `"all"` = o próprio módulo é de mock; `Set` = barrel que re-exporta esses nomes de mock; `null` = não é mock. */
function mockOrigin(host: GuardHost, target: string): "all" | Set<string> | null {
  if (isMockModulePath(target)) return "all";
  const text = host.read(target);
  if (text === null) return null;
  const reexported = new Set<string>();
  for (const st of parseModule(target, text).statements) {
    if (!ts.isExportDeclaration(st) || !st.moduleSpecifier || !ts.isStringLiteral(st.moduleSpecifier) || st.isTypeOnly) continue;
    const inner = resolveModule(host, target, st.moduleSpecifier.text);
    if (!inner || !isMockModulePath(inner)) continue;
    if (st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) if (!el.isTypeOnly) reexported.add(el.name.text);
    } else if (!st.exportClause) {
      const innerText = host.read(inner);
      if (innerText !== null) for (const name of exportedNames(parseModule(inner, innerText))) reexported.add(name);
    } else {
      return "all"; // `export * as ns from "./x.mock"`: o namespace inteiro é mock
    }
  }
  return reexported.size > 0 ? reexported : null;
}

type MockScan = { readonly refs: number; readonly leaks: string[] };

function scanMockReach(host: GuardHost, file: string, text: string, label = file): MockScan {
  const sf = parseModule(file, text);
  const mockNames = new Set<string>();
  const mockNamespaces = new Map<string, "all" | Set<string>>();
  const dynamicMock = (spec: string) => {
    const target = resolveModule(host, file, spec);
    return target !== null && mockOrigin(host, target) !== null;
  };
  let authority: string | null = null;

  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const clause = st.importClause;
    if (!clause || clause.isTypeOnly) continue;
    const target = resolveModule(host, file, st.moduleSpecifier.text);
    if (!target) continue;
    const bindings = clause.namedBindings;
    if (isEnvModulePath(target) && bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) if (!el.isTypeOnly && (el.propertyName ?? el.name).text === "isMockMode") authority = el.name.text;
    }
    const origin = mockOrigin(host, target);
    if (!origin) continue;
    if (clause.name && (origin === "all" || origin.has("default"))) mockNames.add(clause.name.text);
    if (bindings && ts.isNamespaceImport(bindings)) mockNamespaces.set(bindings.name.text, origin);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        if (el.isTypeOnly) continue;
        if (origin === "all" || origin.has((el.propertyName ?? el.name).text)) mockNames.add(el.name.text);
      }
    }
  }

  // Autoridade LOCAL anula a guarda: se o nome do `isMockMode` importado também é declarado no arquivo (const,
  // function, parâmetro, classe), nenhuma chamada a ele conta como `isMockMode()` de `config/env`.
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
      if (
        ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
        isGuard(parent.left) &&
        child === parent.right
      ) {
        return true;
      }
    }
    return false;
  };

  let refs = 0;
  const leaks: string[] = [];
  const count = (node: ts.Node, what: string) => {
    refs += 1;
    if (!guarded(node)) leaks.push(`${label}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} ${what}`);
  };
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
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node) && !isNamePosition(node)) {
      if (mockNames.has(node.text)) count(node, node.text);
      const ns = mockNamespaces.get(node.text);
      if (ns !== undefined) {
        const p = node.parent;
        const benign = ns !== "all" && ts.isPropertyAccessExpression(p) && p.expression === node && !ns.has(p.name.text);
        if (!benign) count(node, node.text);
      }
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteralLike(arg) && dynamicMock(arg.text)) count(node, `import("${arg.text}")`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { refs, leaks };
}

function listSources(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) listSources(path, acc);
    else if (/\.tsx?$/.test(name) && !/\.test\./.test(name) && !isMockModulePath(path)) acc.push(path);
  }
  return acc;
}

function scanDirs(dirs: readonly string[], root: string) {
  let refs = 0;
  const leaks: string[] = [];
  const files = dirs.map((dir) => {
    const found = listSources(dir);
    for (const file of found) {
      const scan = scanMockReach(diskHost, file, readFileSync(file, "utf8"), slash(relative(root, file)));
      refs += scan.refs;
      leaks.push(...scan.leaks);
    }
    return found.length;
  });
  return { files, refs, leaks };
}

const FRONTEND_ROOT = fileURLToPath(new URL("../", import.meta.url));
const GUARDED_DIRS = [
  fileURLToPath(new URL("../src/modules/work-orders/", import.meta.url)),
  fileURLToPath(new URL("../src/modules/operations/dispatches/", import.meta.url)),
];

test("[G1] alcance real: em work-orders/** e operations/dispatches/** nenhum identificador de origem mock é alcançável fora do ramo verdadeiro de isMockMode()", () => {
  const { files, refs, leaks } = scanDirs(GUARDED_DIRS, FRONTEND_ROOT);
  // Denominador: a varredura tem de ENXERGAR os dois módulos e as referências legítimas ao mock (as que ficam atrás
  // de isMockMode()); um guard que não resolve import nenhum passaria "verde" sem olhar nada.
  assert.ok(files[0] > 0 && files[1] > 0, `arquivos varridos por módulo: ${files.join(" / ")}`);
  assert.ok(refs >= 10, `referências de origem mock vistas: ${refs}`);
  assert.deepEqual(leaks, [], "identificador de origem mock alcançável em modo real");
});

// Arquivos virtuais para o auto-teste do guard (G2): o mesmo código do G1, sobre um host em memória.
const VIRTUAL = resolve(tmpdir(), "b-san3-01-g2-virtual");
const VIRTUAL_FILES: Record<string, string> = {
  "config/env.ts": "export function isMockMode() { return false; }\n",
  "fake-env.ts": "export function isMockMode() { return true; }\n",
  "x.mock.ts": "export function getMockX() { return 1; }\nexport const mockItems = [1];\n",
  "barrel.ts": 'export * from "./x.mock";\nexport const real = 1;\n',
};
const virtualHost = (fixture: string): GuardHost => {
  const table = new Map(Object.entries({ ...VIRTUAL_FILES, "a.ts": fixture }).map(([k, v]) => [slash(join(VIRTUAL, k)), v]));
  return { read: (path) => table.get(slash(path)) ?? null };
};
const ENV = 'import { isMockMode } from "./config/env";\n';
const MOCK = 'import { getMockX, mockItems } from "./x.mock";\n';
const G2_FIXTURES: ReadonlyArray<readonly [label: string, code: string, leaks: number, refs: number]> = [
  ["(a) `?? getMockX()` solto", `${MOCK}export async function f(r: unknown) { return adapt(r) ?? getMockX(); }`, 1, 1],
  ["(b) `else` de `if (isMockMode()) {}`", `${ENV}${MOCK}export function f() { if (isMockMode()) { return 0; } else { return getMockX(); } }`, 1, 1],
  ["(c) código com comentário citando isMockMode()", `${ENV}${MOCK}export function f(r: unknown) {\n  if (isMockMode()) return 0;\n  return adapt(r) ?? getMockX(); // isMockMode()\n}`, 1, 1],
  ["(d) constante `mockItems` sem o prefixo getMock", `${MOCK}export const items = (r: unknown[]) => (r.length ? r : mockItems);`, 1, 1],
  ["(e) bloco `if (isMockMode()) { … }`", `${ENV}${MOCK}export function f() { if (isMockMode()) { const c = getMockX(); return c; } return 0; }`, 0, 1],
  ["(f) `isMockMode() ? mock : real`", `${ENV}${MOCK}export const f = (real: number) => (isMockMode() ? getMockX() : real);`, 0, 1],
  ["(g) `isMockMode() && mock`", `${ENV}${MOCK}export const f = () => isMockMode() && mockItems;`, 0, 1],
  ["(h) `isMockMode` local", `${MOCK}const isMockMode = () => true;\nexport function f() { if (isMockMode()) return getMockX(); return 0; }`, 1, 1],
  ["(i) import de config/env sombreado por declaração local", `${ENV}${MOCK}export function f(isMockMode: () => boolean) { if (isMockMode()) return getMockX(); return 0; }`, 1, 1],
  ["(j) isMockMode importado de OUTRO módulo", `import { isMockMode } from "./fake-env";\n${MOCK}export function f() { if (isMockMode()) return getMockX(); return 0; }`, 1, 1],
  ["(k) forma negada `!isMockMode()` com mock no else", `${ENV}${MOCK}export function f() { if (!isMockMode()) return 0; else return getMockX(); }`, 1, 1],
  ["(l) via barrel um nível", `import { getMockX } from "./barrel";\nexport const f = () => getMockX();`, 1, 1],
  ["(m) `import * as M` de mock", `import * as M from "./x.mock";\nexport const f = () => M.getMockX();`, 1, 1],
  ["(n) `import()` dinâmico de mock", `export async function f() { const m = await import("./x.mock"); return m.getMockX(); }`, 1, 1],
  ["(o) nome real do barrel não é mock", `import { real } from "./barrel";\nexport const f = () => real;`, 0, 0],
];

test("[G2] auto-teste do guard por alcance: formas que vazam ficam vermelhas, formas guardadas ficam verdes", () => {
  for (const [label, code, leaks, refs] of G2_FIXTURES) {
    const scan = scanMockReach(virtualHost(code), join(VIRTUAL, "a.ts"), code, "a.ts");
    assert.equal(scan.leaks.length, leaks, `${label} → ${JSON.stringify(scan.leaks)}`);
    assert.equal(scan.refs, refs, `${label}: referências de origem mock VISTAS`);
  }
});

test("[G3] a enumeração vem do DISCO: arquivo novo num diretório varrido, importando mock sem guarda, fica vermelho", () => {
  const dir = mkdtempSync(join(tmpdir(), "b-san3-01-g3-"));
  try {
    mkdirSync(join(dir, "config"));
    writeFileSync(join(dir, "config", "env.ts"), VIRTUAL_FILES["config/env.ts"]);
    writeFileSync(join(dir, "x.mock.ts"), VIRTUAL_FILES["x.mock.ts"]);
    writeFileSync(join(dir, "guardado.service.ts"), `${ENV}${MOCK}export function f() { if (isMockMode()) return getMockX(); return 0; }\n`);
    writeFileSync(join(dir, "novo.service.ts"), `${MOCK}export function f() { return mockItems; }\n`);
    const { files, refs, leaks } = scanDirs([dir], dir);
    assert.deepEqual(files, [3], "env + guardado + novo (o módulo de mock não é varrido)");
    assert.equal(refs, 2);
    assert.deepEqual(leaks, ["novo.service.ts:2 mockItems"]);
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

// =============================== W. Ciclo 2 · P4 — fiação dos hooks vigiada ===============================
// C4-04: a regra "desatualizado mantém os dados" (R1/R4) só existe se o hook repassar o `background` do `refresh`
// ao reducer — trocar por `false` no hook deixava 47/47 verdes. Como o S1 vigia o create, W1/W2 vigiam a fiação.

test("[W1] useWorkOrders repassa o `background` do refresh ao nextListState", async () => {
  const hook = await readFile(new URL("../src/modules/work-orders/useWorkOrders.ts", import.meta.url), "utf8");
  assert.match(hook, /useCallback\(\s*async\s*\(\s*background\s*=\s*false\s*\)/, "o refresh recebe `background`");
  assert.match(hook, /nextListState\(\s*prev\s*,\s*result\s*,\s*background\s*\)/, "e o entrega ao reducer");
  assert.equal(hook.match(/nextListState\(/g)?.length, 1, "uma única chamada ao reducer");
});

test("[W2] useWorkOrderDetail repassa o `background` do refresh ao nextDetailState", async () => {
  const hook = await readFile(new URL("../src/modules/work-orders/useWorkOrderDetail.ts", import.meta.url), "utf8");
  assert.match(hook, /useCallback\(\s*async\s*\(\s*background\s*=\s*false\s*\)/, "o refresh recebe `background`");
  assert.match(hook, /nextDetailState\(\s*prev\s*,\s*\{\s*detail\s*,\s*timeline\s*\}\s*,\s*background\s*\)/, "e o entrega ao reducer");
  assert.equal(hook.match(/nextDetailState\(/g)?.length, 1, "uma única chamada ao reducer");
});

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
