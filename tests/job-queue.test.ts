import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

import { JobQueue } from "../src/infra/jobs/job.queue.js";
import { JobRegistry } from "../src/infra/jobs/job.registry.js";
import { JobWorker } from "../src/infra/jobs/job.worker.js";
import { getRedisClient } from "../src/infra/redis/redis.client.js";

const redis = getRedisClient();
const silentLogger = {
  info() {},
  warn() {},
  error() {},
};

test("Redis job queue enqueues, dequeues and completes a job", async () => {
  await assertRedisAvailable();
  const queue = createTestQueue();
  const job = await queue.enqueue(
    "notification-dispatch",
    {
      message: "hello",
    },
    {
      tenantId: "tenant-a",
      userId: "user-a",
      correlationId: "corr-a",
    },
  );

  const dequeued = await queue.dequeue();

  assert.equal(dequeued?.id, job.id);
  assert.equal(dequeued?.status, "processing");
  assert.equal(dequeued?.tenantId, "tenant-a");
  assert.equal(dequeued?.correlationId, "corr-a");

  await queue.complete(dequeued);
  assert.equal(await queue.getJob(job.id), null);
});

test("job worker retries with backoff and then completes", async () => {
  await assertRedisAvailable();
  const queue = createTestQueue();
  const registry = new JobRegistry();
  let attempts = 0;

  registry.register("notification-dispatch", async () => {
    attempts += 1;

    if (attempts === 1) {
      throw new Error("temporary failure");
    }
  });

  const worker = new JobWorker({ queue, registry, logger: silentLogger });
  const job = await queue.enqueue("notification-dispatch", {}, { maxAttempts: 3, backoffMs: 60_000 });

  assert.equal(await worker.processNextJob(), true);
  const retrying = await queue.getJob(job.id);
  assert.equal(retrying?.status, "retrying");
  assert.equal(retrying?.attempts, 1);

  assert.equal(await worker.processNextJob(), false);
  await queue.promoteDueJobs(new Date(Date.now() + 61_000));
  assert.equal(await worker.processNextJob(), true);

  assert.equal(attempts, 2);
  assert.equal(await queue.getJob(job.id), null);
  assert.deepEqual(await queue.getFailedJobs(), []);
});

test("job worker moves exhausted failures to dead-letter list", async () => {
  await assertRedisAvailable();
  const queue = createTestQueue();
  const registry = new JobRegistry();

  registry.register("audit-log-fanout", async () => {
    throw new Error("permanent failure");
  });

  const worker = new JobWorker({ queue, registry, logger: silentLogger });
  const job = await queue.enqueue("audit-log-fanout", {}, { maxAttempts: 1 });

  assert.equal(await worker.processNextJob(), true);

  const failed = await queue.getFailedJobs();
  assert.equal(failed.length, 1);
  assert.equal(failed[0]?.id, job.id);
  assert.equal(failed[0]?.status, "failed");
  assert.equal(failed[0]?.attempts, 1);
  assert.equal(failed[0]?.lastError, "permanent failure");
});

function createTestQueue(): JobQueue {
  return new JobQueue({
    redis,
    prefix: `test:jobs:${randomUUID()}`,
  });
}

async function assertRedisAvailable(): Promise<void> {
  assert.equal(await redis.ping(), true);
}
