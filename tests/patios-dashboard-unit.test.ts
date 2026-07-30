import assert from "node:assert/strict";
import test from "node:test";

import { computeDeadlineAlerts, type DeadlineAlertSource } from "../src/modules/patios-dashboard/patios-dashboard.notifications.js";
import { toPatiosDashboardSummaryDto } from "../src/modules/patios-dashboard/patios-dashboard.dto.js";
import { emptyProcessesByPhase, PHASE_BUCKET_BY_STATUS } from "../src/modules/patios-dashboard/patios-dashboard.types.js";
import { IMPOUND_STATUSES } from "../src/modules/impound/impound.types.js";
import type { ProcessNotification } from "../src/modules/impound/impound.notifications.types.js";

// Ω5P PR-20 — testes puros (zero I/O) do painel gerencial: (a) computeDeadlineAlerts REUSA computeNotificationSchedule/
// isNotificationTrailComplete do PR-09 (nunca recalcula o prazo do zero — o plano é explícito sobre isso); (b) todo
// status da FSM tem bucket de fase (nenhum processo "sem fase"); (c) o DTO é uma allowlist (§2.8).

const T0 = new Date("2026-01-01T00:00:00.000Z");
const PROFILE = { ownerNotifDays: 10, noticeEdictDay: 30 };

function notification(kind: "OWNER_INITIAL" | "COMPLEMENTARY_EDICT", status: ProcessNotification["status"], reason?: string): ProcessNotification {
  return {
    id: `notif-${kind}-${status}`,
    tenantId: "tenant",
    processId: "process",
    kind,
    status,
    dueAt: T0,
    reason,
    createdAt: T0,
    updatedAt: T0,
  };
}

test("computeDeadlineAlerts: marco vencido SEM notificação ⇒ alerta", () => {
  const now = new Date(T0.getTime() + 40 * 86_400_000); // t0+40d: os 2 marcos (10d/30d) já venceram
  const sources: DeadlineAlertSource[] = [{ processId: "p1", enteredAt: T0, profile: PROFILE, notifications: [] }];
  const alerts = computeDeadlineAlerts(sources, now);
  assert.equal(alerts.length, 2, "2 marcos vencidos, nenhum resolvido");
  assert.deepEqual(
    alerts.map((a) => a.kind),
    ["OWNER_INITIAL", "COMPLEMENTARY_EDICT"],
    "ordenado por dueAt",
  );
  assert.equal(alerts[0].processId, "p1");
});

test("computeDeadlineAlerts: marco ISSUED não gera alerta; marco WAIVED com fundamento não gera alerta", () => {
  const now = new Date(T0.getTime() + 40 * 86_400_000);
  const sources: DeadlineAlertSource[] = [
    {
      processId: "p1",
      enteredAt: T0,
      profile: PROFILE,
      notifications: [notification("OWNER_INITIAL", "ISSUED"), notification("COMPLEMENTARY_EDICT", "WAIVED", "Regularizado")],
    },
  ];
  assert.equal(computeDeadlineAlerts(sources, now).length, 0, "trilha completa (ISSUED + WAIVED fundamentado) ⇒ zero alertas");
});

test("computeDeadlineAlerts: WAIVED sem fundamento (reason vazio) ainda conta como pendente", () => {
  const now = new Date(T0.getTime() + 40 * 86_400_000);
  const sources: DeadlineAlertSource[] = [
    { processId: "p1", enteredAt: T0, profile: PROFILE, notifications: [notification("OWNER_INITIAL", "WAIVED", "  ")] },
  ];
  const alerts = computeDeadlineAlerts(sources, now);
  assert.ok(alerts.some((a) => a.kind === "OWNER_INITIAL"), "WAIVED sem motivo não fecha o marco (mesma regra de isNotificationTrailComplete)");
});

test("computeDeadlineAlerts: marco AINDA NÃO vencido não gera alerta", () => {
  const now = new Date(T0.getTime() + 5 * 86_400_000); // t0+5d: nenhum marco venceu ainda (10d/30d)
  const sources: DeadlineAlertSource[] = [{ processId: "p1", enteredAt: T0, profile: PROFILE, notifications: [] }];
  assert.equal(computeDeadlineAlerts(sources, now).length, 0);
});

test("computeDeadlineAlerts: perfil sem prazo válido (0/negativo) não fabrica marco (fail-closed, mesma regra do PR-09)", () => {
  const now = new Date(T0.getTime() + 100 * 86_400_000);
  const sources: DeadlineAlertSource[] = [{ processId: "p1", enteredAt: T0, profile: { ownerNotifDays: 0, noticeEdictDay: -1 }, notifications: [] }];
  assert.equal(computeDeadlineAlerts(sources, now).length, 0, "sem prazo válido ⇒ sem marco ⇒ sem alerta");
});

test("PHASE_BUCKET_BY_STATUS: todo status da FSM (14) tem bucket — nenhum processo fica sem fase", () => {
  for (const status of IMPOUND_STATUSES) {
    assert.ok(PHASE_BUCKET_BY_STATUS[status], `status ${status} sem bucket`);
  }
  assert.equal(Object.keys(PHASE_BUCKET_BY_STATUS).length, IMPOUND_STATUSES.length);
});

test("emptyProcessesByPhase: todos os 5 buckets zerados (nunca undefined)", () => {
  const empty = emptyProcessesByPhase();
  assert.deepEqual(empty, { RECEPTION: 0, CUSTODY: 0, RELEASE: 0, AUCTION: 0, CLOSED: 0 });
});

test("toPatiosDashboardSummaryDto: allowlist §2.8 — nenhum tenantId/campo interno vaza no envelope público", () => {
  const dto = toPatiosDashboardSummaryDto({
    occupancy: [{ yardId: "y1", yardName: "Pátio 1", totalSpots: 10, occupiedSpots: 4, freeSpots: 6, blockedSpots: 0 }],
    totalProcesses: 4,
    processesByPhase: { RECEPTION: 1, CUSTODY: 1, RELEASE: 0, AUCTION: 1, CLOSED: 1 },
    overdueNotifications: 2,
    releaseQueueDepth: 0,
    openLots: 1,
    auctionRevenue: { currentMonthTotal: "0.00", grandTotal: "1000.00", byBeneficiary: [{ beneficiaryKind: "AUCTION_COST", totalAmount: "400.00" }] },
    deadlineAlerts: [{ processId: "p1", kind: "OWNER_INITIAL", dueAt: T0.toISOString() }],
  });
  const serialized = JSON.stringify(dto);
  assert.equal(serialized.includes("tenantId"), false);
  assert.equal(serialized.includes("tenant_id"), false);
  const allowedTopLevel = new Set([
    "occupancy",
    "totalProcesses",
    "processesByPhase",
    "overdueNotifications",
    "releaseQueueDepth",
    "openLots",
    "auctionRevenue",
    "deadlineAlerts",
  ]);
  for (const key of Object.keys(dto)) {
    assert.ok(allowedTopLevel.has(key), `chave inesperada no DTO: ${key}`);
  }
});
