import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("approval service suporta OS, checklist e evidencia com decisao segura", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    {
      createMemoryApprovalService,
      getApprovalAuditEventsForTests,
      resetApprovalRuntimeForTests,
    },
    {
      getMemoryNotificationRepositoryForTests,
      resetNotificationRuntimeForTests,
    },
  ] = await Promise.all([
    import("../src/modules/work-orders/approval.service.js"),
    import("../src/modules/notifications/notification.service.js"),
  ]);

  resetApprovalRuntimeForTests();
  resetNotificationRuntimeForTests();
  const service = createMemoryApprovalService();
  const tenantId = randomUUID();
  const requesterId = randomUUID();
  const deciderId = randomUUID();
  const actor = approvalActor(tenantId, deciderId);

  try {
    const workOrder = await service.request({
      tenantId,
      entityType: "work_order",
      entityId: randomUUID(),
      workOrderId: randomUUID(),
      requestedByUserId: requesterId,
      pendingReason: "OS concluida.",
    });
    const checklist = await service.request({
      tenantId,
      entityType: "checklist_run",
      entityId: randomUUID(),
      workOrderId: workOrder.workOrderId,
      requestedByUserId: requesterId,
      pendingReason: "Checklist concluido com divergencia.",
    });
    const evidence = await service.request({
      tenantId,
      entityType: "evidence",
      entityId: "evidence-safe-reference",
      workOrderId: workOrder.workOrderId,
      requestedByUserId: requesterId,
      pendingReason: "Evidencia pronta para conferencia.",
    });

    assert.deepEqual(
      (await service.listPending(actor)).map((approval) => approval.entityType).sort(),
      ["checklist_run", "evidence", "work_order"],
    );

    const approved = await service.approve(actor, workOrder.id, {
      note: "Conferido com evidencias.",
    });
    const rejected = await service.reject(actor, checklist.id, {
      reason: "Foto obrigatoria ausente.",
    });

    assert.equal(approved.status, "approved");
    assert.equal(approved.decidedByUserId, deciderId);
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.rejectionReason, "Foto obrigatoria ausente.");
    assert.equal((await service.get(actor, evidence.id)).status, "pending_approval");

    await assert.rejects(
      async () => service.reject(actor, evidence.id, {}),
      (error: unknown) =>
        isApprovalError(error, 400, "required_field"),
    );
    await assert.rejects(
      () => service.approve(actor, approved.id, {}),
      (error: unknown) =>
        isApprovalError(error, 409, "approval_already_decided"),
    );

    const auditEvents = getApprovalAuditEventsForTests();
    assert.equal(auditEvents.some((event) => event.action === "approval.approved"), true);
    assert.equal(auditEvents.some((event) => event.action === "approval.rejected"), true);
    for (const event of auditEvents) {
      const serialized = JSON.stringify(event);
      for (const unsafe of ["Authorization", "Bearer", "accessToken", "base64", "file_data", "local_path", "storage_key", "bucket"]) {
        assert.equal(serialized.includes(unsafe), false);
      }
    }

    const notifications = await getMemoryNotificationRepositoryForTests().listByRecipient({
      tenantId,
      recipientUserId: requesterId,
    });
    assert.equal(notifications.length, 2);
    assert.equal(notifications.every((notification) => notification.actionUrl === `/work-orders/${workOrder.workOrderId}`), true);
  } finally {
    resetApprovalRuntimeForTests();
    resetNotificationRuntimeForTests();
  }
});

test("approval service isola tenants", async () => {
  const { createMemoryApprovalService, resetApprovalRuntimeForTests } =
    await import("../src/modules/work-orders/approval.service.js");
  resetApprovalRuntimeForTests();
  const service = createMemoryApprovalService();
  const tenantA = randomUUID();
  const approval = await service.request({
    tenantId: tenantA,
    entityType: "work_order",
    entityId: randomUUID(),
    requestedByUserId: randomUUID(),
    pendingReason: "Pendente.",
  });

  try {
    await assert.rejects(
      () => service.get(approvalActor(randomUUID(), randomUUID()), approval.id),
      (error: unknown) => isApprovalError(error, 404, "not_found"),
    );
  } finally {
    resetApprovalRuntimeForTests();
  }
});

function approvalActor(tenantId: string, userId: string) {
  return {
    tenantId,
    userId,
    roles: ["manager"],
    permissions: ["work_orders:read", "work_orders:update"],
  } as never;
}

function isApprovalError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "reason" in error &&
    error.statusCode === statusCode &&
    error.reason === reason
  );
}
