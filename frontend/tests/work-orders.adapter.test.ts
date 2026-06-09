import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptWorkOrdersResponse,
  adaptWorkOrderTimelineResponse,
  calculateWorkOrdersSummary,
  filterWorkOrders,
  validateWorkOrderForm,
} from "../src/modules/work-orders/work-orders.adapter";

test("work orders adapter tolera snake_case e camelCase", () => {
  const data = adaptWorkOrdersResponse({
    items: [
      {
        id: "wo-1",
        code: "OS-1",
        title: "Atendimento",
        status: "open",
        priority: "urgent",
        customer_name: "Cliente A",
        service_address: "Rua A",
        assigned_operator_id: "operator-1",
        scheduled_for: "2026-06-09T12:00:00.000Z",
        created_at: "2026-06-09T10:00:00.000Z",
      },
      {
        id: "wo-2",
        code: "OS-2",
        title: "Entrega",
        status: "completed",
        priority: "low",
        customerName: "Cliente B",
        createdAt: "2026-06-09T11:00:00.000Z",
      },
    ],
    pagination: { limit: 20, offset: 0, total: 2 },
  });

  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].customerName, "Cliente A");
  assert.equal(data.items[0].assignedOperatorId, "operator-1");
  assert.equal(data.pagination.total, 2);
  assert.equal(calculateWorkOrdersSummary(data.items).urgent, 1);
});

test("work orders filtros aplicam status, prioridade e busca", () => {
  const data = adaptWorkOrdersResponse({
    items: [
      { id: "wo-1", code: "OS-1", title: "Coleta", status: "open", priority: "urgent", customerName: "Atlas", createdAt: "2026-06-09T10:00:00.000Z" },
      { id: "wo-2", code: "OS-2", title: "Entrega", status: "completed", priority: "low", customerName: "Beta", createdAt: "2026-06-09T11:00:00.000Z" },
    ],
  });

  const filtered = filterWorkOrders(data.items, {
    search: "atlas",
    status: "open",
    priority: "urgent",
    assignedOperatorId: "",
    from: "",
    to: "",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].code, "OS-1");
});

test("work orders timeline e formulario validam contrato", () => {
  const timeline = adaptWorkOrderTimelineResponse({
    data: [
      {
        id: "event-1",
        event_type: "work_order_created",
        message: "Criada",
        created_at: "2026-06-09T10:00:00.000Z",
      },
    ],
  });

  assert.equal(timeline[0].eventType, "work_order_created");
  assert.deepEqual(
    validateWorkOrderForm({ title: "", priority: "", serviceLatitude: "-91", serviceLongitude: "10", scheduledFor: "" }),
    ["Titulo obrigatorio.", "Prioridade obrigatoria.", "Latitude invalida."],
  );
});
