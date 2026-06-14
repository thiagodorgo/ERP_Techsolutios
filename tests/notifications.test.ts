import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryNotificationRepository,
  NotificationRecipientResolver,
  NotificationService,
  type NotificationRecipientCandidate,
} from "../src/modules/notifications/index.js";

test("notification service creates, lists and updates only the actor inbox", async () => {
  const repository = new InMemoryNotificationRepository();
  const service = new NotificationService(repository);
  const actor = {
    tenantId: "tenant-a",
    userId: "user-a",
    roles: ["tenant_admin"],
    permissions: ["notifications:read", "notifications:update"],
  } as const;

  const created = await service.createNotification({
    tenantId: actor.tenantId,
    recipientUserId: actor.userId,
    type: "checklist_run.completed",
    title: "Checklist concluido",
    message: "Uma execucao foi concluida.",
    severity: "success",
    metadata: {
      source: "test-suite",
      password: "must-redact",
      nested: {
        storageKey: "tenant-a/private-path",
      },
    },
  });
  await service.createNotification({
    tenantId: actor.tenantId,
    recipientUserId: "user-b",
    type: "checklist_run.completed",
    title: "Outra inbox",
    message: "Nao deve aparecer.",
  });
  await service.createNotification({
    tenantId: "tenant-b",
    recipientUserId: actor.userId,
    type: "checklist_run.completed",
    title: "Outro tenant",
    message: "Nao deve aparecer.",
  });

  const list = await service.listMyNotifications(actor);
  assert.equal(list.length, 1);
  assert.equal(list[0]?.id, created.id);
  assert.equal(list[0]?.metadata.password, "[REDACTED]");
  assert.deepEqual(list[0]?.metadata.nested, { storageKey: "[REDACTED]" });
  assert.equal(await service.countUnread(actor), 1);

  const read = await service.markAsRead(actor, created.id);
  assert.equal(read.status, "read");
  assert.equal(await service.countUnread(actor), 0);

  const archived = await service.archiveNotification(actor, created.id);
  assert.equal(archived.status, "archived");

  await assert.rejects(
    () => service.markAsRead({ ...actor, userId: "user-b" }, created.id),
    (error: { reason?: string }) => error.reason === "notification_not_found",
  );
});

test("notification service marks all unread notifications for one user", async () => {
  const repository = new InMemoryNotificationRepository();
  const service = new NotificationService(repository);
  const actor = {
    tenantId: "tenant-a",
    userId: "user-a",
    roles: ["tenant_admin"],
    permissions: ["notifications:read", "notifications:update"],
  } as const;

  await service.createNotification({
    tenantId: actor.tenantId,
    recipientUserId: actor.userId,
    type: "one",
    title: "One",
    message: "One",
  });
  await service.createNotification({
    tenantId: actor.tenantId,
    recipientUserId: actor.userId,
    type: "two",
    title: "Two",
    message: "Two",
  });
  await service.createNotification({
    tenantId: actor.tenantId,
    recipientUserId: "user-b",
    type: "three",
    title: "Three",
    message: "Three",
  });

  assert.equal(await service.markAllAsRead(actor), 2);
  assert.equal(await service.countUnread(actor), 0);
  assert.equal(await service.countUnread({ ...actor, userId: "user-b" }), 1);
});

test("notification job creates notifications from checklist domain events", async () => {
  const repository = new InMemoryNotificationRepository();
  repository.setRecipientCandidatesForTests("tenant-a", [
    candidate("operator-a", ["operator"], ["checklist_runs:read"]),
    candidate("manager-a", ["manager"], ["checklist_runs:read", "notifications:read"]),
    candidate("inactive-admin", ["tenant_admin"], ["checklist_runs:read"], "inactive"),
    candidate("actor-a", ["tenant_admin"], ["checklist_runs:read"]),
  ]);
  const service = new NotificationService(repository, new NotificationRecipientResolver(repository));

  const created = await service.createFromDomainEvent({
    id: "event-1",
    name: "checklist_run.completed",
    tenantId: "tenant-a",
    actorId: "actor-a",
    correlationId: "corr-a",
    occurredAt: new Date("2026-06-08T12:00:00.000Z").toISOString(),
    payload: {
      runId: "run-a",
      templateId: "template-a",
      status: "completed",
    },
  });

  assert.equal(created.length, 2);
  assert.deepEqual(
    created.map((notification) => notification.recipientUserId).sort(),
    ["manager-a", "operator-a"],
  );

  const duplicated = await service.createFromDomainEvent({
    id: "event-1",
    name: "checklist_run.completed",
    tenantId: "tenant-a",
    actorId: "actor-a",
    correlationId: "corr-a",
    occurredAt: new Date("2026-06-08T12:00:00.000Z").toISOString(),
    payload: {
      runId: "run-a",
    },
  });

  assert.equal(new Set(duplicated.map((notification) => notification.id)).size, 2);
  assert.deepEqual(
    duplicated.map((notification) => notification.id).sort(),
    created.map((notification) => notification.id).sort(),
  );
});

test("notification resolver preserves recipient order, deduplicates and stops at the safe limit", async () => {
  const repository = new InMemoryNotificationRepository();
  repository.setRecipientCandidatesForTests("tenant-a", [
    candidate("actor-a", ["tenant_admin"], ["checklist_runs:read"]),
    candidate("inactive-a", ["tenant_admin"], ["checklist_runs:read"], "inactive"),
    candidate("recipient-01", ["operator"], ["checklist_runs:read"]),
    candidate("recipient-01", ["operator"], ["checklist_runs:read"]),
    ...Array.from({ length: 25 }, (_, index) =>
      candidate(`recipient-${String(index + 2).padStart(2, "0")}`, ["operator"], ["checklist_runs:read"]),
    ),
  ]);

  const recipients = await new NotificationRecipientResolver(repository).resolve({
    id: "event-limit",
    name: "checklist_run.completed",
    tenantId: "tenant-a",
    actorId: "actor-a",
    correlationId: "corr-limit",
    occurredAt: new Date("2026-06-12T12:00:00.000Z").toISOString(),
    payload: {},
  });

  assert.equal(recipients.length, 20);
  assert.equal(recipients[0], "recipient-01");
  assert.equal(recipients[19], "recipient-20");
  assert.equal(new Set(recipients).size, recipients.length);
  assert.equal(recipients.includes("actor-a"), false);
  assert.equal(recipients.includes("inactive-a"), false);
});

function candidate(
  userId: string,
  roles: NotificationRecipientCandidate["roles"],
  permissions: NotificationRecipientCandidate["permissions"],
  status = "active",
): NotificationRecipientCandidate {
  return {
    userId,
    roles,
    permissions,
    status,
  };
}
