import assert from "node:assert/strict";
import test from "node:test";

import {
  computeOperations,
  consolidateOperations,
  type GroupPanelWorkOrderRow,
} from "../src/modules/group-panel/group-panel.sla.js";
import type { WorkOrderStatus } from "../src/modules/work-orders/work-order.types.js";
import type { FinancialSummary } from "../src/modules/financial-summary/financial-summary.types.js";
import { GroupPanelService } from "../src/modules/group-panel/group-panel.service.js";
import type { GroupPanelReaders } from "../src/modules/group-panel/group-panel.types.js";

const NOW = new Date("2026-11-22T15:00:00.000Z"); // 12h em São Paulo

function row(input: {
  createdAt?: string;
  status?: WorkOrderStatus;
  scheduledFor?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  assignedUserId?: string | null;
} = {}): GroupPanelWorkOrderRow {
  const date = (value: string | null | undefined) => (value === null || value === undefined ? null : new Date(value));
  return {
    status: input.status ?? "open",
    createdAt: new Date(input.createdAt ?? "2026-11-10T15:00:00.000Z"),
    scheduledFor: date(input.scheduledFor),
    arrivedAt: date(input.arrivedAt),
    completedAt: date(input.completedAt),
    assignedUserId: input.assignedUserId ?? null,
  };
}

test("SLA-1: média mensal usa abertura até No local", () => {
  const result = computeOperations([
    row({ createdAt: "2026-11-02T12:00:00Z", arrivedAt: "2026-11-02T12:30:00Z" }),
    row({ createdAt: "2026-11-03T12:00:00Z", arrivedAt: "2026-11-03T13:30:00Z" }),
  ], NOW);
  assert.equal(result.arrivalAvgMinutes, 60);
  assert.equal(result.arrivalCount, 2);
});

test("SLA-2: agendamento não desloca o início decidido pelo dono", () => {
  const result = computeOperations([
    row({
      createdAt: "2026-11-02T12:00:00Z",
      scheduledFor: "2026-11-02T13:00:00Z",
      arrivedAt: "2026-11-02T13:30:00Z",
    }),
  ], NOW);
  assert.equal(result.arrivalAvgMinutes, 90);
});

test("SLA-3: cancelado e recusado ficam fora", () => {
  const result = computeOperations([
    row({ status: "cancelled", arrivedAt: "2026-11-10T16:00:00Z" }),
    row({ status: "rejected", arrivedAt: "2026-11-10T16:00:00Z" }),
  ], NOW);
  assert.equal(result.arrivalAvgMinutes, null);
  assert.equal(result.arrivalCount, 0);
});

test("SLA-4: pátio sem chegada no mês devolve média nula", () => {
  const result = computeOperations([row({ status: "completed", completedAt: "2026-11-10T17:00:00Z" })], NOW);
  assert.equal(result.arrivalAvgMinutes, null);
  assert.equal(result.arrivalMissingCount, 1);
});

test("SLA-5: chegada anterior à abertura fica fora", () => {
  const result = computeOperations([row({ arrivedAt: "2026-11-10T14:59:00Z" })], NOW);
  assert.equal(result.arrivalCount, 0);
  assert.equal(result.arrivalAvgMinutes, null);
});

test("SLA-6: média do grupo é ponderada pelos chamados, não média das médias", () => {
  const patioA = computeOperations([row({ arrivedAt: "2026-11-10T15:30:00Z" })], NOW);
  const patioB = computeOperations([
    row({ arrivedAt: "2026-11-10T16:30:00Z" }),
    row({ arrivedAt: "2026-11-10T16:30:00Z" }),
    row({ arrivedAt: "2026-11-10T16:30:00Z" }),
  ], NOW);
  assert.equal(consolidateOperations([patioA, patioB]).arrivalAvgMinutes, 75);
});

test("SLA-7: virada do mês usa São Paulo", () => {
  const now = new Date("2026-12-01T03:30:00Z"); // 00:30 de 01/12 em São Paulo
  const result = computeOperations([
    row({ createdAt: "2026-12-01T02:30:00Z", arrivedAt: "2026-12-01T02:50:00Z" }), // 30/11 23:30
    row({ createdAt: "2026-12-01T03:05:00Z", arrivedAt: "2026-12-01T03:25:00Z" }), // 01/12 00:05
  ], now);
  assert.equal(result.openedPreviousMonth, 1);
  assert.equal(result.openedThisMonth, 1);
  assert.equal(result.arrivalCount, 1);
});

test("OPS-1: conta hoje, sete dias, em andamento e atrasados", () => {
  const result = computeOperations([
    row({ createdAt: "2026-11-22T14:00:00Z", status: "on_route" }),
    row({ createdAt: "2026-11-20T14:00:00Z", status: "on_site", scheduledFor: "2026-11-20T13:00:00Z" }),
    row({ createdAt: "2026-11-01T14:00:00Z", status: "open" }),
  ], NOW);
  assert.equal(result.openedToday, 1);
  assert.equal(result.openedThisWeek, 2);
  assert.equal(result.inProgress, 2);
  assert.equal(result.overdue, 1);
});

test("OPS-2: chamados do mês, concluídos e percentual", () => {
  const result = computeOperations([
    row({ status: "completed", completedAt: "2026-11-11T15:00:00Z" }),
    row({ status: "open" }),
    row({ createdAt: "2026-10-31T15:00:00Z", status: "completed" }),
  ], NOW);
  assert.equal(result.openedThisMonth, 2);
  assert.equal(result.completedThisMonth, 1);
  assert.equal(result.openedPreviousMonth, 1);
  assert.equal(result.completionRatePct, 50);
});

test("OPS-3: zero chamado no mês produz percentual nulo", () => {
  const result = computeOperations([row({ createdAt: "2026-10-10T15:00:00Z" })], NOW);
  assert.equal(result.openedThisMonth, 0);
  assert.equal(result.completionRatePct, null);
});

test("OPS-4: consolidado soma contagens e recalcula percentual", () => {
  const patioA = computeOperations([row({ status: "completed" })], NOW);
  const patioB = computeOperations([row(), row(), row()], NOW);
  const result = consolidateOperations([patioA, patioB]);
  assert.equal(result.openedThisMonth, 4);
  assert.equal(result.completedThisMonth, 1);
  assert.equal(result.completionRatePct, 25);
});

test("OPS-5: status pré-campo e terminal não entram em andamento", () => {
  const statuses: WorkOrderStatus[] = ["open", "assigned", "accepted", "completed", "cancelled", "rejected"];
  assert.equal(computeOperations(statuses.map((status) => row({ status })), NOW).inProgress, 0);
});

test("OPS-6: os quatro status canônicos entram em andamento", () => {
  const statuses: WorkOrderStatus[] = ["on_route", "on_site", "in_progress", "paused"];
  assert.equal(computeOperations(statuses.map((status) => row({ status })), NOW).inProgress, 4);
});

test("OPS-7: serviço lê cada pátio e entrega chamados/SLA por pátio e consolidados", async () => {
  const readers = serviceReaders({
    a: [row({ status: "completed", arrivedAt: "2026-11-10T15:30:00Z", completedAt: "2026-11-10T16:00:00Z" })],
    b: [row({ status: "on_site", arrivedAt: "2026-11-10T16:30:00Z" })],
  });
  const result = await new GroupPanelService(readers, () => NOW).getSummary(ACTOR);
  assert.equal(result.organizations[0]?.operations.summary?.arrivalAvgMinutes, 30);
  assert.equal(result.organizations[1]?.operations.summary?.arrivalAvgMinutes, 90);
  assert.equal(result.consolidated?.operations.arrivalAvgMinutes, 60);
  assert.equal(result.consolidated?.operations.openedThisMonth, 2);
});

const ACTOR = { userId: "u-a", tenantId: "a", email: "gestor@example.com", roles: ["manager"], authType: "jwt" as const };

function serviceReaders(workOrdersByTenant: Readonly<Record<string, readonly GroupPanelWorkOrderRow[]>>): GroupPanelReaders {
  const tenantIds = Object.keys(workOrdersByTenant);
  return {
    async identityMemberships() {
      return tenantIds.map((tenantId) => ({ tenantId, tenantName: `Pátio ${tenantId}`, userId: `u-${tenantId}` }));
    },
    async groupMemberships(ids) {
      return ids.map((tenantId) => ({ tenantId, groupId: "g", validFrom: "2026-01-01", validTo: null }));
    },
    async managerMarks() {
      return [{ groupId: "g", revokedAt: null }];
    },
    async authorization() {
      return {
        roles: ["manager"],
        permissions: ["financial_entries:read", "dashboard:read", "users.read", "work_orders:read"],
      };
    },
    async modules() {
      return ["finance"];
    },
    async financeSummary() {
      return emptyFinance();
    },
    async workOrders({ tenantId }) {
      return workOrdersByTenant[tenantId] ?? [];
    },
    async staffRows() {
      return [];
    },
    async recordView() {},
  };
}

function emptyFinance(): FinancialSummary {
  return {
    receivable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
    payable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
    settledThisMonth: { competencia: "2026-11", inflow: 0, outflow: 0 },
    cash: { totalBalance: 0, accountCount: 0, currency: "BRL" },
    cheques: { pendingReceivedCount: 0, pendingReceivedAmount: 0, pendingIssuedCount: 0, pendingIssuedAmount: 0, linkedPendingCount: 0, linkedPendingAmount: 0 },
    cashFlow: [],
    recentTitles: [],
  };
}
