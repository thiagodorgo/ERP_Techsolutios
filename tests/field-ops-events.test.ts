import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { publishDomainEvent } from "../src/infra/events/domain-event.publisher.js";
import { DOMAIN_EVENT_NAMES } from "../src/infra/events/domain-event.types.js";

test("DOMAIN_EVENT_NAMES includes all field ops event names", () => {
  const fieldOpsEvents = [
    "field_location.updated",
    "field_dispatch.created",
    "field_dispatch.status_changed",
    "field_dispatch.cancelled",
    "field_dispatch.reassigned",
    "work_order.status_changed",
  ] as const;

  for (const name of fieldOpsEvents) {
    assert.ok(
      (DOMAIN_EVENT_NAMES as readonly string[]).includes(name),
      `Expected ${name} in DOMAIN_EVENT_NAMES`,
    );
  }
});

test("field_location.updated event is tenant-scoped and contains no coordinates", async () => {
  const tenantId = randomUUID();
  const operatorUserId = randomUUID();
  const entityId = randomUUID();

  const result = await publishDomainEvent(
    "field_location.updated",
    {
      entity_type: "field_operator_location",
      entity_id: entityId,
      operator_user_id: operatorUserId,
      source: "mobile",
    },
    { tenantId, actorId: operatorUserId },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.actorId, operatorUserId);
  assert.equal(result.event.name, "field_location.updated");
  assert.equal(result.event.payload.entity_id, entityId);
  assert.equal(result.event.payload.operator_user_id, operatorUserId);
  assert.ok(!("latitude" in result.event.payload), "payload must not contain latitude");
  assert.ok(!("longitude" in result.event.payload), "payload must not contain longitude");
  assert.equal(result.enqueuedJobId, undefined, "no job mapping for field_location.updated");
});

test("field_dispatch.created event carries dispatch metadata", async () => {
  const tenantId = randomUUID();
  const dispatchId = randomUUID();
  const workOrderId = randomUUID();
  const operatorUserId = randomUUID();
  const actorId = randomUUID();

  const result = await publishDomainEvent(
    "field_dispatch.created",
    {
      entity_type: "field_dispatch",
      entity_id: dispatchId,
      work_order_id: workOrderId,
      operator_user_id: operatorUserId,
      status: "assigned",
    },
    { tenantId, actorId },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.entity_id, dispatchId);
  assert.equal(result.event.payload.work_order_id, workOrderId);
  assert.equal(result.event.payload.operator_user_id, operatorUserId);
  assert.equal(result.event.payload.status, "assigned");
  assert.equal(result.enqueuedJobId, undefined);
});

test("field_dispatch.status_changed event carries from and to status", async () => {
  const tenantId = randomUUID();

  const result = await publishDomainEvent(
    "field_dispatch.status_changed",
    {
      entity_type: "field_dispatch",
      entity_id: randomUUID(),
      work_order_id: randomUUID(),
      operator_user_id: randomUUID(),
      from_status: "assigned",
      to_status: "on_route",
    },
    { tenantId },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.from_status, "assigned");
  assert.equal(result.event.payload.to_status, "on_route");
  assert.equal(result.enqueuedJobId, undefined);
});

test("field_dispatch.cancelled event is tenant-scoped with cancellation from_status", async () => {
  const tenantId = randomUUID();

  const result = await publishDomainEvent(
    "field_dispatch.cancelled",
    {
      entity_type: "field_dispatch",
      entity_id: randomUUID(),
      work_order_id: randomUUID(),
      operator_user_id: randomUUID(),
      from_status: "on_route",
      to_status: "cancelled",
    },
    { tenantId },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.from_status, "on_route");
  assert.equal(result.event.payload.to_status, "cancelled");
  assert.equal(result.enqueuedJobId, undefined);
});

test("field_dispatch.reassigned event carries previous and new operator", async () => {
  const tenantId = randomUUID();
  const previousOperatorUserId = randomUUID();
  const newOperatorUserId = randomUUID();

  const result = await publishDomainEvent(
    "field_dispatch.reassigned",
    {
      entity_type: "field_dispatch",
      entity_id: randomUUID(),
      work_order_id: randomUUID(),
      operator_user_id: newOperatorUserId,
      previous_operator_user_id: previousOperatorUserId,
    },
    { tenantId },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.operator_user_id, newOperatorUserId);
  assert.equal(result.event.payload.previous_operator_user_id, previousOperatorUserId);
  assert.notEqual(
    result.event.payload.operator_user_id,
    result.event.payload.previous_operator_user_id,
  );
  assert.equal(result.enqueuedJobId, undefined);
});

test("work_order.status_changed event carries from and to status", async () => {
  const tenantId = randomUUID();
  const workOrderId = randomUUID();

  const result = await publishDomainEvent(
    "work_order.status_changed",
    {
      entity_type: "work_order",
      entity_id: workOrderId,
      code: "OS-000001",
      from_status: "open",
      to_status: "in_progress",
    },
    { tenantId },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.entity_id, workOrderId);
  assert.equal(result.event.payload.code, "OS-000001");
  assert.equal(result.event.payload.from_status, "open");
  assert.equal(result.event.payload.to_status, "in_progress");
  assert.equal(result.enqueuedJobId, undefined);
});

test("field ops events do not cross tenant boundaries", async () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  const resultA = await publishDomainEvent(
    "field_dispatch.created",
    { entity_type: "field_dispatch", entity_id: randomUUID() },
    { tenantId: tenantA },
  );
  const resultB = await publishDomainEvent(
    "field_dispatch.created",
    { entity_type: "field_dispatch", entity_id: randomUUID() },
    { tenantId: tenantB },
  );

  assert.equal(resultA.event.tenantId, tenantA);
  assert.equal(resultB.event.tenantId, tenantB);
  assert.notEqual(resultA.event.tenantId, resultB.event.tenantId);
  assert.notEqual(resultA.event.id, resultB.event.id);
  assert.notEqual(resultA.event.correlationId, resultB.event.correlationId);
});

test("field ops events have unique ids and correlation ids", async () => {
  const tenantId = randomUUID();

  const [r1, r2] = await Promise.all([
    publishDomainEvent("field_location.updated", { entity_type: "field_operator_location", entity_id: randomUUID() }, { tenantId }),
    publishDomainEvent("field_location.updated", { entity_type: "field_operator_location", entity_id: randomUUID() }, { tenantId }),
  ]);

  assert.notEqual(r1.event.id, r2.event.id);
  assert.notEqual(r1.event.correlationId, r2.event.correlationId);
  assert.ok(typeof r1.event.occurredAt === "string" && r1.event.occurredAt.length > 0);
});
