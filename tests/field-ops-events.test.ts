import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { publishDomainEvent } from "../src/infra/events/domain-event.publisher.js";
import { DOMAIN_EVENT_NAMES } from "../src/infra/events/domain-event.types.js";
import type { JobQueue } from "../src/infra/jobs/job.queue.js";
import type { JobEnvelope, JobName, JobPayload } from "../src/infra/jobs/job.types.js";

type CapturedJob = { name: JobName; payload: JobPayload; tenantId?: string; userId?: string; correlationId?: string };

function makeCapturingQueue(): { jobs: CapturedJob[]; queue: JobQueue } {
  const jobs: CapturedJob[] = [];
  const queue = {
    async enqueue(name: JobName, payload: JobPayload, options: { tenantId?: string; userId?: string; correlationId?: string } = {}): Promise<JobEnvelope> {
      jobs.push({ name, payload, tenantId: options.tenantId, userId: options.userId, correlationId: options.correlationId });
      return {
        id: randomUUID(),
        name,
        payload,
        status: "queued",
        attempts: 0,
        maxAttempts: 3,
        backoffMs: 1000,
        tenantId: options.tenantId,
        userId: options.userId,
        correlationId: options.correlationId ?? randomUUID(),
        runAfter: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  } as unknown as JobQueue;
  return { jobs, queue };
}

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

test("field_location.updated generates field-ops-event-fanout job with no coordinates", async () => {
  const tenantId = randomUUID();
  const operatorUserId = randomUUID();
  const entityId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

  const result = await publishDomainEvent(
    "field_location.updated",
    {
      entity_type: "field_operator_location",
      entity_id: entityId,
      operator_user_id: operatorUserId,
      source: "mobile",
    },
    { tenantId, actorId: operatorUserId },
    { queue },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.actorId, operatorUserId);
  assert.equal(result.event.name, "field_location.updated");
  assert.equal(result.event.payload.entity_id, entityId);
  assert.equal(result.event.payload.operator_user_id, operatorUserId);
  assert.ok(!("latitude" in result.event.payload), "payload must not contain latitude");
  assert.ok(!("longitude" in result.event.payload), "payload must not contain longitude");
  assert.ok(!("lat" in result.event.payload), "payload must not contain lat");
  assert.ok(!("lng" in result.event.payload), "payload must not contain lng");
  assert.equal(typeof result.enqueuedJobId, "string");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.name, "field-ops-event-fanout");
  assert.equal(jobs[0]?.tenantId, tenantId);
  assert.equal(jobs[0]?.userId, operatorUserId);
});

test("field_dispatch.created generates field-ops-event-fanout job with dispatch metadata", async () => {
  const tenantId = randomUUID();
  const dispatchId = randomUUID();
  const workOrderId = randomUUID();
  const operatorUserId = randomUUID();
  const actorId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

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
    { queue },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.entity_id, dispatchId);
  assert.equal(result.event.payload.work_order_id, workOrderId);
  assert.equal(result.event.payload.operator_user_id, operatorUserId);
  assert.equal(result.event.payload.status, "assigned");
  assert.equal(typeof result.enqueuedJobId, "string");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.name, "field-ops-event-fanout");
  assert.equal(jobs[0]?.tenantId, tenantId);
  assert.equal(jobs[0]?.userId, actorId);
});

test("field_dispatch.status_changed generates fanout job with from and to status", async () => {
  const tenantId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

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
    { queue },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.from_status, "assigned");
  assert.equal(result.event.payload.to_status, "on_route");
  assert.equal(typeof result.enqueuedJobId, "string");
  assert.equal(jobs[0]?.name, "field-ops-event-fanout");
  assert.equal(jobs[0]?.tenantId, tenantId);
});

test("field_dispatch.cancelled generates fanout job with to_status = cancelled", async () => {
  const tenantId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

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
    { queue },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.from_status, "on_route");
  assert.equal(result.event.payload.to_status, "cancelled");
  assert.equal(typeof result.enqueuedJobId, "string");
  assert.equal(jobs[0]?.name, "field-ops-event-fanout");
  assert.equal(jobs[0]?.tenantId, tenantId);
});

test("field_dispatch.reassigned preserves previous_operator_user_id in fanout job", async () => {
  const tenantId = randomUUID();
  const previousOperatorUserId = randomUUID();
  const newOperatorUserId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

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
    { queue },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.operator_user_id, newOperatorUserId);
  assert.equal(result.event.payload.previous_operator_user_id, previousOperatorUserId);
  assert.notEqual(
    result.event.payload.operator_user_id,
    result.event.payload.previous_operator_user_id,
  );
  assert.equal(typeof result.enqueuedJobId, "string");
  assert.equal(jobs[0]?.name, "field-ops-event-fanout");

  const capturedEvent = jobs[0]?.payload.event as Record<string, unknown> | undefined;
  assert.equal((capturedEvent?.payload as Record<string, unknown>)?.previous_operator_user_id, previousOperatorUserId);
});

test("work_order.status_changed generates fanout job with from and to status", async () => {
  const tenantId = randomUUID();
  const workOrderId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

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
    { queue },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.tenantId, tenantId);
  assert.equal(result.event.payload.entity_id, workOrderId);
  assert.equal(result.event.payload.code, "OS-000001");
  assert.equal(result.event.payload.from_status, "open");
  assert.equal(result.event.payload.to_status, "in_progress");
  assert.equal(typeof result.enqueuedJobId, "string");
  assert.equal(jobs[0]?.name, "field-ops-event-fanout");
  assert.equal(jobs[0]?.tenantId, tenantId);
});

test("all 6 field ops events generate field-ops-event-fanout jobs", async () => {
  const tenantId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

  const events = [
    ["field_location.updated", { entity_type: "field_operator_location", entity_id: randomUUID(), operator_user_id: randomUUID(), source: "mobile" }],
    ["field_dispatch.created", { entity_type: "field_dispatch", entity_id: randomUUID(), work_order_id: randomUUID(), operator_user_id: randomUUID(), status: "assigned" }],
    ["field_dispatch.status_changed", { entity_type: "field_dispatch", entity_id: randomUUID(), work_order_id: randomUUID(), operator_user_id: randomUUID(), from_status: "assigned", to_status: "on_route" }],
    ["field_dispatch.cancelled", { entity_type: "field_dispatch", entity_id: randomUUID(), work_order_id: randomUUID(), operator_user_id: randomUUID(), from_status: "on_route", to_status: "cancelled" }],
    ["field_dispatch.reassigned", { entity_type: "field_dispatch", entity_id: randomUUID(), work_order_id: randomUUID(), operator_user_id: randomUUID(), previous_operator_user_id: randomUUID() }],
    ["work_order.status_changed", { entity_type: "work_order", entity_id: randomUUID(), code: "OS-000001", from_status: "open", to_status: "in_progress" }],
  ] as const;

  for (const [name, payload] of events) {
    await publishDomainEvent(name, payload, { tenantId }, { queue });
  }

  assert.equal(jobs.length, 6);
  for (const job of jobs) {
    assert.equal(job.name, "field-ops-event-fanout");
    assert.equal(job.tenantId, tenantId);
  }
});

test("fanout job preserves actorId and correlationId when present", async () => {
  const tenantId = randomUUID();
  const actorId = randomUUID();
  const correlationId = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

  const result = await publishDomainEvent(
    "field_dispatch.created",
    { entity_type: "field_dispatch", entity_id: randomUUID(), work_order_id: randomUUID(), operator_user_id: randomUUID(), status: "assigned" },
    { tenantId, actorId, correlationId },
    { queue },
  );

  assert.equal(result.event.actorId, actorId);
  assert.equal(result.event.correlationId, correlationId);
  assert.equal(jobs[0]?.userId, actorId);
  assert.equal(jobs[0]?.correlationId, correlationId);
});

test("fanout enqueue failure does not break the primary operation (fail-open)", async () => {
  const failingQueue = {
    async enqueue() {
      throw new Error("redis unavailable");
    },
  } as unknown as JobQueue;

  const warnings: unknown[] = [];

  const result = await publishDomainEvent(
    "field_dispatch.created",
    { entity_type: "field_dispatch", entity_id: randomUUID(), work_order_id: randomUUID(), operator_user_id: randomUUID(), status: "assigned" },
    { tenantId: randomUUID() },
    {
      queue: failingQueue,
      logger: { warn(...args: unknown[]) { warnings.push(args); } },
    },
  );

  assert.equal(result.published, false);
  assert.match(result.error ?? "", /redis unavailable/);
  assert.equal(warnings.length, 1);
});

test("field ops events from different tenants generate separate tenant-scoped jobs", async () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const { jobs, queue } = makeCapturingQueue();

  await publishDomainEvent("field_dispatch.created", { entity_type: "field_dispatch", entity_id: randomUUID() }, { tenantId: tenantA }, { queue });
  await publishDomainEvent("field_dispatch.created", { entity_type: "field_dispatch", entity_id: randomUUID() }, { tenantId: tenantB }, { queue });

  assert.equal(jobs.length, 2);
  assert.equal(jobs[0]?.tenantId, tenantA);
  assert.equal(jobs[1]?.tenantId, tenantB);
  assert.notEqual(jobs[0]?.tenantId, jobs[1]?.tenantId);
});

test("field ops events have unique ids and correlation ids", async () => {
  const tenantId = randomUUID();
  const { queue } = makeCapturingQueue();

  const [r1, r2] = await Promise.all([
    publishDomainEvent("field_location.updated", { entity_type: "field_operator_location", entity_id: randomUUID() }, { tenantId }, { queue }),
    publishDomainEvent("field_location.updated", { entity_type: "field_operator_location", entity_id: randomUUID() }, { tenantId }, { queue }),
  ]);

  assert.notEqual(r1.event.id, r2.event.id);
  assert.notEqual(r1.event.correlationId, r2.event.correlationId);
  assert.ok(typeof r1.event.occurredAt === "string" && r1.event.occurredAt.length > 0);
});
