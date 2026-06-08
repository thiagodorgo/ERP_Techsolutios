import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { publishDomainEvent } from "../src/infra/events/domain-event.publisher.js";
import { JobQueue } from "../src/infra/jobs/job.queue.js";
import { getRedisClient } from "../src/infra/redis/redis.client.js";

const redis = getRedisClient();

test("domain event publishes mapped checklist attachment job", async () => {
  await assertRedisAvailable();
  const queue = new JobQueue({
    redis,
    prefix: `test:events:${randomUUID()}`,
  });

  const result = await publishDomainEvent(
    "checklist_run.attachment_uploaded",
    {
      runId: "run-1",
      attachmentId: "att-1",
    },
    {
      tenantId: "tenant-a",
      actorId: "user-a",
      correlationId: "corr-a",
    },
    {
      queue,
    },
  );

  assert.equal(result.published, true);
  assert.equal(result.event.name, "checklist_run.attachment_uploaded");
  assert.equal(result.event.tenantId, "tenant-a");
  assert.equal(typeof result.enqueuedJobId, "string");

  const job = await queue.dequeue();
  assert.equal(job?.name, "checklist-attachment-postprocess");
  assert.equal(job?.tenantId, "tenant-a");
  assert.equal(job?.userId, "user-a");
  assert.equal(job?.correlationId, "corr-a");
  assert.equal((job?.payload.event as { name?: string }).name, "checklist_run.attachment_uploaded");
});

test("domain event publishes mapped notification job for checklist completion", async () => {
  await assertRedisAvailable();
  const queue = new JobQueue({
    redis,
    prefix: `test:events:${randomUUID()}`,
  });

  const result = await publishDomainEvent(
    "checklist_run.completed",
    {
      runId: "run-1",
      status: "completed",
    },
    {
      tenantId: "tenant-a",
      actorId: "user-a",
      correlationId: "corr-a",
    },
    {
      queue,
    },
  );

  assert.equal(result.published, true);
  assert.equal(typeof result.enqueuedJobId, "string");

  const job = await queue.dequeue();
  assert.equal(job?.name, "notification-dispatch");
  assert.equal(job?.tenantId, "tenant-a");
  assert.equal((job?.payload.event as { name?: string }).name, "checklist_run.completed");
});

test("domain event without job mapping succeeds without enqueue", async () => {
  const result = await publishDomainEvent("auth.session.created", {
    sessionId: "session-1",
  });

  assert.equal(result.published, true);
  assert.equal(result.enqueuedJobId, undefined);
});

test("domain event publish can fail open when Redis enqueue fails", async () => {
  const queue = {
    async enqueue() {
      throw new Error("redis unavailable");
    },
  } as unknown as JobQueue;
  const warnings: unknown[] = [];
  const result = await publishDomainEvent(
    "checklist_run.attachment_uploaded",
    {
      runId: "run-1",
    },
    {
      tenantId: "tenant-a",
    },
    {
      queue,
      logger: {
        warn(...input: unknown[]) {
          warnings.push(input);
        },
      },
    },
  );

  assert.equal(result.published, false);
  assert.match(result.error ?? "", /redis unavailable/);
  assert.equal(warnings.length, 1);
});

async function assertRedisAvailable(): Promise<void> {
  assert.equal(await redis.ping(), true);
}
