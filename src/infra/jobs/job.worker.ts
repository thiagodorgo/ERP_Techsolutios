import { JobQueue, getDefaultJobQueue } from "./job.queue.js";
import { JobRegistry, getDefaultJobRegistry } from "./job.registry.js";
import { recordCloudUsageBestEffort } from "../../modules/cloud-usage/cloud-usage.service.js";

export type JobWorkerOptions = {
  readonly queue?: JobQueue;
  readonly registry?: JobRegistry;
  readonly pollIntervalMs?: number;
  readonly logger?: Pick<Console, "info" | "warn" | "error">;
};

export class JobWorker {
  private readonly queue: JobQueue;
  private readonly registry: JobRegistry;
  private readonly logger: Pick<Console, "info" | "warn" | "error">;
  private timer: NodeJS.Timeout | undefined;

  constructor(options: JobWorkerOptions = {}) {
    this.queue = options.queue ?? getDefaultJobQueue();
    this.registry = options.registry ?? getDefaultJobRegistry();
    this.logger = options.logger ?? console;
  }

  async processNextJob(): Promise<boolean> {
    const job = await this.queue.dequeue();

    if (!job) {
      return false;
    }

    const handler = this.registry.get(job.name);

    if (!handler) {
      await this.queue.fail(job, new Error(`No handler registered for job ${job.name}.`));
      this.logger.warn({ jobId: job.id, jobName: job.name }, "Job failed because no handler is registered.");
      return true;
    }

    try {
      await handler(job.payload, job);
      await this.queue.complete(job);
      if (job.tenantId) {
        recordCloudUsageBestEffort({
          tenantId: job.tenantId,
          sourceType: "job",
          sourceId: job.id,
          metricKey: "job.executed",
          quantity: 1,
          unit: "count",
          occurredAt: new Date(),
          idempotencyKey: `${job.id}:job.executed`,
          metadata: {
            jobName: job.name,
            correlationId: job.correlationId,
          },
        });
        recordCloudUsageBestEffort({
          tenantId: job.tenantId,
          sourceType: "job",
          sourceId: job.id,
          metricKey: "job_executions_count",
          quantity: 1,
          unit: "count",
          occurredAt: new Date(),
          idempotencyKey: `${job.id}:job_executions_count`,
          metadata: {
            jobName: job.name,
            correlationId: job.correlationId,
          },
        });
      }
      this.logger.info({ jobId: job.id, jobName: job.name }, "Job completed.");
    } catch (error) {
      const failed = await this.queue.fail(job, error);
      this.logger.error({ jobId: job.id, jobName: job.name, status: failed.status }, "Job failed.");
    }

    return true;
  }

  start(pollIntervalMs = 1_000): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.processNextJob().catch((error: unknown) => {
        this.logger.error({ error }, "Job worker tick failed.");
      });
    }, pollIntervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }
}

export function startWorker(options: JobWorkerOptions = {}): JobWorker {
  const worker = new JobWorker(options);
  worker.start(options.pollIntervalMs);
  return worker;
}
