import assert from "node:assert/strict";
import test from "node:test";

import { deriveDashboardKpis, pickCriticalWorkOrders } from "../src/modules/dashboard/dashboard.adapter";
import type { WorkOrdersData } from "../src/modules/work-orders/work-orders.types";

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
