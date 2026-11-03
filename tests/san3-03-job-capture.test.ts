import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { JobQueue } from "../src/infra/jobs/job.queue.js";
import { JobRegistry } from "../src/infra/jobs/job.registry.js";
import type { JobEnvelope } from "../src/infra/jobs/job.types.js";
import { JobWorker } from "../src/infra/jobs/job.worker.js";
import { getRedisClient } from "../src/infra/redis/redis.client.js";
import {
  appendCloudUsageInMemory,
  buildJobExecutionUsageEvents,
  createMemoryCloudUsageService,
  resetCloudUsageRuntimeForTests,
} from "../src/modules/cloud-usage/index.js";

class RecordingQueue extends JobQueue {
  readonly calls: string[] = [];
  private next: JobEnvelope | null;

  constructor(job: JobEnvelope) {
    super({ redis: getRedisClient() });
    this.next = job;
  }

  override async dequeue(): Promise<JobEnvelope | null> {
    const job = this.next;
    this.next = null;
    return job;
  }

  override async complete(job: JobEnvelope): Promise<JobEnvelope> {
    this.calls.push("complete");
    return { ...job, status: "completed" };
  }

  override async fail(job: JobEnvelope): Promise<JobEnvelope> {
    this.calls.push("fail");
    return { ...job, status: "retrying", attempts: job.attempts + 1 };
  }
}

test("T-JOB-1 · job produz as duas unidades com chaves estáveis", () => {
  const job = source();
  const events = buildJobExecutionUsageEvents(job);
  assert.deepEqual(events.map((event) => event.metricKey), ["job.executed", "job_executions_count"]);
  assert.deepEqual(events.map((event) => event.idempotencyKey), [
    `${job.id}:job.executed`,
    `${job.id}:job_executions_count`,
  ]);
  assert.ok(events.every((event) => event.tenantId === job.tenantId));
});

test("T-JOB-2 · handler, captura aguardada e complete rodam nessa ordem", async () => {
  const calls: string[] = [];
  const { worker, queue } = setup(source(), calls, async () => {
    calls.push("capture");
  });

  await worker.processNextJob();

  assert.deepEqual(calls, ["handler", "capture"]);
  assert.deepEqual(queue.calls, ["complete"]);
});

test("T-JOB-3 · falha na captura impede complete e leva o job a retry", async () => {
  const calls: string[] = [];
  const { worker, queue } = setup(source(), calls, async () => {
    calls.push("capture");
    throw new Error("falha injetada na medicao");
  });

  await worker.processNextJob();

  assert.deepEqual(calls, ["handler", "capture"]);
  assert.deepEqual(queue.calls, ["fail"]);
});

test("T-JOB-4 · replay do mesmo job não duplica as unidades em memória", async () => {
  resetCloudUsageRuntimeForTests();
  const job = source();
  const capture = async (current: JobEnvelope) => {
    await appendCloudUsageInMemory(buildJobExecutionUsageEvents(current));
  };
  await setup(job, [], capture).worker.processNextJob();
  await setup(job, [], capture).worker.processNextJob();

  const summary = await createMemoryCloudUsageService().getTenantUsageSummary(job.tenantId!);
  assert.deepEqual(summary.metrics.map((metric) => metric.quantity), [1, 1]);
  resetCloudUsageRuntimeForTests();
});

function setup(job: JobEnvelope, calls: string[], capture: (job: JobEnvelope) => Promise<void>) {
  const queue = new RecordingQueue(job);
  const registry = new JobRegistry();
  registry.register(job.name, async () => {
    calls.push("handler");
  });
  const worker = new JobWorker({
    queue,
    registry,
    captureJobExecution: capture,
    logger: { info() {}, warn() {}, error() {} },
  });
  return { worker, queue };
}

function source(): JobEnvelope {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: "notification-dispatch",
    payload: {},
    status: "processing",
    attempts: 0,
    maxAttempts: 3,
    backoffMs: 1000,
    tenantId: randomUUID(),
    correlationId: randomUUID(),
    runAfter: now,
    createdAt: now,
    updatedAt: now,
  };
}
