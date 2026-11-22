import assert from "node:assert/strict";
import test from "node:test";

import {
  computeStaff,
  consolidateStaff,
  type GroupPanelStaffRow,
} from "../src/modules/group-panel/group-panel.staff.js";
import type { FinancialSummary } from "../src/modules/financial-summary/financial-summary.types.js";
import { GroupPanelService } from "../src/modules/group-panel/group-panel.service.js";
import type { GroupPanelReaders } from "../src/modules/group-panel/group-panel.types.js";

function staff(input: Partial<GroupPanelStaffRow> & Pick<GroupPanelStaffRow, "userId">): GroupPanelStaffRow {
  return {
    userId: input.userId,
    identityId: input.identityId ?? null,
    localKey: input.localKey ?? `tenant:${input.userId}`,
    active: input.active ?? true,
    profiles: input.profiles ?? ["field_technician"],
  };
}

test("STF-1: ativos são contados por pátio", () => {
  const result = computeStaff([staff({ userId: "u1" }), staff({ userId: "u2" })], []);
  assert.equal(result.activeUsers, 2);
});

test("STF-2: usuário com dois perfis conta uma vez no total e uma vez em cada perfil", () => {
  const result = computeStaff([staff({ userId: "u1", profiles: ["manager", "field_technician"] })], []);
  assert.equal(result.activeUsers, 1);
  assert.deepEqual(result.byProfile, [
    { profile: "field_technician", count: 1 },
    { profile: "manager", count: 1 },
  ]);
});

test("STF-3: a mesma pessoa ativa em três pátios conta uma vez no grupo", () => {
  const identityId = "person-1";
  const blocks = ["a", "b", "c"].map((tenant) =>
    computeStaff([staff({ userId: `u-${tenant}`, identityId, localKey: `${tenant}:u-${tenant}` })], []),
  );
  const result = consolidateStaff(blocks);
  assert.equal(result.activeUsers, 1);
  assert.deepEqual(result.byProfile, [{ profile: "field_technician", count: 1 }]);
});

test("STF-4: inativo fica fora de todas as contagens", () => {
  const result = computeStaff([staff({ userId: "u1", active: false })], ["u1"]);
  assert.equal(result.activeUsers, 0);
  assert.equal(result.inServiceNow, 0);
  assert.deepEqual(result.byProfile, []);
});

test("STF-5: atendimento agora conta técnicos distintos atribuídos", () => {
  const result = computeStaff(
    [staff({ userId: "u1", identityId: "p1" }), staff({ userId: "u2", identityId: "p2" })],
    ["u1", "u1", "u2"],
  );
  assert.equal(result.inServiceNow, 2);
});

test("STF-6: fallback local não une contas sem identidade entre pátios", () => {
  const result = consolidateStaff([
    computeStaff([staff({ userId: "u1", identityId: null, localKey: "a:u1" })], []),
    computeStaff([staff({ userId: "u1", identityId: null, localKey: "b:u1" })], []),
  ]);
  assert.equal(result.activeUsers, 2);
});

test("STF-7: serviço deduplica a mesma pessoa nos pátios e no atendimento do grupo", async () => {
  const readers: GroupPanelReaders = {
    async identityMemberships() {
      return [
        { tenantId: "a", tenantName: "Pátio A", userId: "gestor-a" },
        { tenantId: "b", tenantName: "Pátio B", userId: "gestor-b" },
      ];
    },
    async groupMemberships(ids) {
      return ids.map((tenantId) => ({ tenantId, groupId: "g", validFrom: "2026-01-01", validTo: null }));
    },
    async managerMarks() {
      return [{ groupId: "g", revokedAt: null }];
    },
    async authorization() {
      return { roles: ["manager"], permissions: ["financial_entries:read", "dashboard:read", "users.read", "work_orders:read"] };
    },
    async modules() {
      return ["finance"];
    },
    async financeSummary() {
      return emptyFinance();
    },
    async workOrders({ tenantId }) {
      return [{ status: "on_site", createdAt: new Date("2026-11-10T15:00:00Z"), scheduledFor: null, arrivedAt: new Date("2026-11-10T15:30:00Z"), completedAt: null, assignedUserId: `tech-${tenantId}` }];
    },
    async staffRows({ tenantId }) {
      return [staff({ userId: `tech-${tenantId}`, identityId: "same-person", localKey: `${tenantId}:tech`, profiles: ["field_technician"] })];
    },
    async recordView() {},
  };
  const actor = { userId: "gestor-a", tenantId: "a", email: "gestor@example.com", roles: ["manager"], authType: "jwt" as const };
  const result = await new GroupPanelService(readers, () => new Date("2026-11-22T15:00:00Z")).getSummary(actor);
  assert.deepEqual(result.organizations.map((organization) => organization.staff.summary?.activeUsers), [1, 1]);
  assert.equal(result.consolidated?.staff.activeUsers, 1);
  assert.equal(result.consolidated?.staff.inServiceNow, 1);
});

test("STF-8: pátio sem users.read fica sem_permissao e não entra no consolidado", async () => {
  const base = new Map<string, GroupPanelStaffRow[]>([
    ["a", [staff({ userId: "tech-a", identityId: "p-a", localKey: "a:tech" })]],
    ["b", [staff({ userId: "tech-b", identityId: "p-b", localKey: "b:tech" })]],
  ]);
  const readers: GroupPanelReaders = {
    async identityMemberships() {
      return [...base.keys()].map((tenantId) => ({ tenantId, tenantName: `Pátio ${tenantId}`, userId: `gestor-${tenantId}` }));
    },
    async groupMemberships(ids) {
      return ids.map((tenantId) => ({ tenantId, groupId: "g", validFrom: "2026-01-01", validTo: null }));
    },
    async managerMarks() {
      return [{ groupId: "g", revokedAt: null }];
    },
    async authorization({ tenantId }) {
      return {
        roles: ["manager"],
        permissions: tenantId === "a" ? ["financial_entries:read", "users.read", "work_orders:read"] : ["financial_entries:read", "work_orders:read"],
      };
    },
    async modules() { return ["finance"]; },
    async financeSummary() { return emptyFinance(); },
    async workOrders() { return []; },
    async staffRows({ tenantId }) { return base.get(tenantId) ?? []; },
    async recordView() {},
  };
  const actor = { userId: "gestor-a", tenantId: "a", email: "gestor@example.com", roles: ["manager"], authType: "jwt" as const };
  const result = await new GroupPanelService(readers, () => new Date("2026-11-22T15:00:00Z")).getSummary(actor);
  assert.deepEqual(result.organizations.map((organization) => organization.staff.status), ["ok", "sem_permissao"]);
  assert.equal(result.consolidated?.staff.activeUsers, 1);
});

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
