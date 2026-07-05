import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCriticalQueue,
  deriveActiveDispatchRows,
  deriveDashboardAlerts,
  deriveDashboardEvents,
  deriveDashboardKpis,
  deriveEnrichedDashboardKpis,
  deriveFieldStatusRows,
  dispatchStatusMeta,
  fieldStatusMeta,
  isWorkOrderOverdue,
  pickCriticalWorkOrders,
  type EnrichedDashboardInput,
} from "../src/modules/dashboard/dashboard.adapter";
import type { DispatchListItem } from "../src/modules/operations/dispatches/dispatches.types";
import type { FieldLocationItem } from "../src/modules/operations/map/operations-map.types";
import type { OperationalApproval } from "../src/modules/work-orders/approval.types";
import type { WorkOrderListItem, WorkOrdersData } from "../src/modules/work-orders/work-orders.types";

function makeData(): WorkOrdersData {
  return {
    items: [
      { id: "1", code: "OS-1", title: "A", customerName: "C", address: "X", status: "open", priority: "urgent" } as never,
      { id: "2", code: "OS-2", title: "B", customerName: "C", address: "X", status: "in_progress", priority: "high" } as never,
      { id: "3", code: "OS-3", title: "C", customerName: "C", address: "X", status: "completed", priority: "low" } as never,
    ],
    pagination: { total: 3, limit: 20, offset: 0 },
    source: "api",
  };
}

test("deriveDashboardKpis conta abertas, criticas, em atendimento e concluidas", () => {
  const kpis = deriveDashboardKpis(makeData());
  const byId = Object.fromEntries(kpis.map((k) => [k.id, k.value]));
  assert.equal(byId.open, "2"); // open + in_progress
  assert.equal(byId.critical, "2"); // urgent + high
  assert.equal(byId.in_progress, "1");
  assert.equal(byId.completed, "1");
});

test("pickCriticalWorkOrders retorna apenas urgente/alta", () => {
  const critical = pickCriticalWorkOrders(makeData());
  assert.equal(critical.length, 2);
  assert.ok(critical.every((w) => w.priority === "urgent" || w.priority === "high"));
});

// ---------------------------------------------------------------------------
// B-124 — Dashboard enriquecido (despachos + localizações + aprovações).
// ---------------------------------------------------------------------------

const NOW = new Date("2026-07-05T12:00:00Z");

function wo(partial: Partial<WorkOrderListItem>): WorkOrderListItem {
  return {
    id: "wo-1",
    code: "OS-1001",
    title: "Manutenção preventiva",
    customerName: "Cliente",
    status: "open",
    priority: "medium",
    createdAt: "2026-07-05T08:00:00Z",
    ...partial,
  } as WorkOrderListItem;
}

function dispatch(partial: Partial<DispatchListItem>): DispatchListItem {
  return {
    id: "dp-1",
    workOrderId: "wo-1",
    workOrderCode: "OS-1001",
    operatorUserId: "op-1",
    status: "assigned",
    priority: "medium",
    createdAt: "2026-07-05T09:00:00Z",
    ...partial,
  } as DispatchListItem;
}

function loc(partial: Partial<FieldLocationItem>): FieldLocationItem {
  return {
    id: "loc-1",
    operatorId: "op-1",
    displayName: "Operador Um",
    status: "on_route",
    latitude: -23.5,
    longitude: -46.6,
    capturedAt: "2026-07-05T11:50:00Z",
    isStale: false,
    ...partial,
  } as FieldLocationItem;
}

function approval(partial: Partial<OperationalApproval>): OperationalApproval {
  return {
    id: "apr-1",
    entityType: "work_order",
    entityId: "wo-1",
    workOrderId: "wo-1",
    status: "pending_approval",
    requestedBy: "op-1",
    requestedAt: "2026-07-05T10:00:00Z",
    pendingReason: "OS concluída aguardando validação.",
    decidedBy: null,
    decidedAt: null,
    note: null,
    reason: null,
    safeMessage: "Aprovacao pendente.",
    ...partial,
  } as OperationalApproval;
}

function input(partial: Partial<EnrichedDashboardInput>): EnrichedDashboardInput {
  return {
    workOrders: [],
    dispatches: [],
    locations: [],
    pendingApprovals: [],
    unread: 0,
    now: NOW,
    ...partial,
  };
}

test("isWorkOrderOverdue detecta agenda vencida apenas em status não final", () => {
  assert.equal(isWorkOrderOverdue(wo({ scheduledFor: "2026-07-05T10:00:00Z" }), NOW), true);
  assert.equal(isWorkOrderOverdue(wo({ scheduledFor: "2026-07-05T14:00:00Z" }), NOW), false);
  assert.equal(isWorkOrderOverdue(wo({ scheduledFor: "2026-07-05T10:00:00Z", status: "completed" }), NOW), false);
  assert.equal(isWorkOrderOverdue(wo({ scheduledFor: undefined }), NOW), false);
});

test("deriveEnrichedDashboardKpis produz 8 cards derivados dos dados (nunca fixos)", () => {
  const kpis = deriveEnrichedDashboardKpis(
    input({
      workOrders: [
        wo({ id: "a", scheduledFor: "2026-07-05T10:00:00Z" }), // atrasada
        wo({ id: "b", status: "in_progress" }),
        wo({ id: "c", status: "completed" }),
      ],
      dispatches: [dispatch({ id: "d1", status: "on_route" }), dispatch({ id: "d2", status: "completed" })],
      locations: [loc({ id: "l1" }), loc({ id: "l2", isStale: true }), loc({ id: "l3", status: "offline" })],
      pendingApprovals: [approval({})],
      unread: 4,
    }),
  );
  assert.equal(kpis.length, 8);
  const byId = Object.fromEntries(kpis.map((k) => [k.id, k.value]));
  assert.equal(byId.open, "2");
  assert.equal(byId.in_service, "1");
  assert.equal(byId.overdue, "1");
  assert.equal(byId.approvals, "1");
  assert.equal(byId.dispatches, "1"); // apenas on_route é ativo
  assert.equal(byId.field, "1"); // l1 (l2 stale, l3 offline)
  assert.equal(byId.stale, "1");
  assert.equal(byId.unread, "4");
});

test("deriveEnrichedDashboardKpis com tudo vazio zera valores sem quebrar", () => {
  const kpis = deriveEnrichedDashboardKpis(input({ unread: null }));
  assert.equal(kpis.length, 8);
  assert.ok(kpis.filter((k) => k.id !== "unread").every((k) => k.value === "0"));
  assert.equal(kpis.find((k) => k.id === "unread")?.value, "—");
});

test("buildCriticalQueue ordena por criticidade: atrasada > prioritária > sem sinal > aprovação > sem operador", () => {
  const queue = buildCriticalQueue(
    input({
      workOrders: [
        wo({ id: "sem-op", assignedOperatorId: undefined, priority: "medium" }),
        wo({ id: "alta", priority: "high", assignedOperatorId: "op-9" }),
        wo({ id: "atrasada", scheduledFor: "2026-07-05T09:00:00Z", assignedOperatorId: "op-9" }),
      ],
      locations: [loc({ id: "stale-1", isStale: true, capturedAt: "2026-07-05T11:00:00Z" })],
      pendingApprovals: [approval({ id: "apr-9", workOrderId: "wo-alvo" })],
    }),
  );
  assert.deepEqual(
    queue.map((item) => item.kind),
    ["os_atrasada", "os_prioritaria", "campo_sem_sinal", "aprovacao_pendente", "os_sem_operador"],
  );
  assert.equal(queue[0].action.label, "Abrir OS");
  assert.equal(queue[2].action.label, "Abrir mapa");
  assert.equal(queue[3].action.label, "Ver aprovação");
  assert.equal(queue[3].action.to, "/work-orders/wo-alvo");
});

test("buildCriticalQueue não repete a mesma OS em dois grupos (fica no mais crítico)", () => {
  const queue = buildCriticalQueue(
    input({
      workOrders: [wo({ id: "dupla", priority: "urgent", assignedOperatorId: undefined, scheduledFor: "2026-07-05T09:00:00Z" })],
    }),
  );
  assert.equal(queue.length, 1);
  assert.equal(queue[0].kind, "os_atrasada");
});

test("dispatchStatusMeta tolera status desconhecido sem quebrar", () => {
  assert.equal(dispatchStatusMeta("on_route").label, "Em rota");
  assert.equal(dispatchStatusMeta("algo_novo_do_backend").label, "Status desconhecido");
  assert.equal(dispatchStatusMeta("algo_novo_do_backend").tone, "neutral");
});

test("deriveActiveDispatchRows exclui terminais e mantém desconhecido com rótulo seguro", () => {
  const rows = deriveActiveDispatchRows([
    dispatch({ id: "d1", status: "in_service" }),
    dispatch({ id: "d2", status: "completed" }),
    dispatch({ id: "d3", status: "cancelled" }),
    dispatch({ id: "d4", status: "failed" }),
    dispatch({ id: "d5", status: "estado_desconhecido" as DispatchListItem["status"], workOrderCode: undefined, workOrderTitle: undefined, observation: null }),
  ]);
  assert.deepEqual(rows.map((row) => row.id), ["d1", "d5"]);
  assert.equal(rows[1].statusLabel, "Status desconhecido");
  assert.equal(rows[1].title, "Despacho");
  assert.equal(rows[1].subtitle, "Sem descrição");
});

test("fieldStatusMeta: stale sobrepõe status e ausência de OS vira detalhe de horário", () => {
  assert.equal(fieldStatusMeta(loc({ isStale: true, status: "in_service" })).label, "Sem sinal recente");
  assert.equal(fieldStatusMeta(loc({ status: "offline" })).label, "Offline");
  const rows = deriveFieldStatusRows([loc({ id: "l1", isStale: true }), loc({ id: "l2", currentWorkOrder: { id: "w", code: "OS-9", title: "Troca", status: "in_progress", priority: "high" } })], NOW);
  assert.equal(rows[0].id, "l1"); // stale primeiro
  assert.ok(rows[1].detail.includes("OS-9"));
});

test("deriveDashboardAlerts só cria alertas com ocorrência e todos com ação", () => {
  assert.deepEqual(deriveDashboardAlerts(input({})), []);
  const alerts = deriveDashboardAlerts(
    input({
      workOrders: [wo({ id: "u", priority: "urgent" }), wo({ id: "o", scheduledFor: "2026-07-05T09:00:00Z" })],
      dispatches: [dispatch({ id: "d", status: "draft" })],
      locations: [loc({ id: "l", isStale: true })],
      pendingApprovals: [approval({})],
    }),
  );
  assert.equal(alerts.length, 5);
  assert.ok(alerts.every((alert) => alert.action !== undefined));
  assert.equal(alerts[0].severity, "critical"); // ordenado por severidade
  assert.equal(alerts[alerts.length - 1].severity, "info");
});

test("deriveDashboardEvents deriva das listas carregadas (OS + despachos) em ordem decrescente", () => {
  const events = deriveDashboardEvents(
    input({
      workOrders: [wo({ id: "w1", updatedAt: "2026-07-05T11:00:00Z" })],
      dispatches: [dispatch({ id: "d1", status: "on_route", updatedAt: "2026-07-05T11:30:00Z" })],
    }),
  );
  assert.equal(events.length, 2);
  assert.equal(events[0].id, "dp-d1"); // mais recente primeiro
  assert.equal(events[1].id, "os-w1");
  assert.ok(events[0].title.startsWith("Despacho"));
});
