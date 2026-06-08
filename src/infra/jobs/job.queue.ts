import { randomUUID } from "node:crypto";

import { getRedisClient, type RedisClient, type RedisValue } from "../redis/redis.client.js";
import type { EnqueueJobOptions, JobEnvelope, JobName, JobPayload } from "./job.types.js";

export type JobQueueOptions = {
  readonly redis?: RedisClient;
  readonly prefix?: string;
};

export class JobQueue {
  private readonly redis: RedisClient;
  private readonly prefix: string;

  constructor(options: JobQueueOptions = {}) {
    this.redis = options.redis ?? getRedisClient();
    this.prefix = options.prefix ?? "erp:jobs";
  }

  async enqueue<TPayload extends JobPayload>(
    name: JobName,
    payload: TPayload,
    options: EnqueueJobOptions = {},
  ): Promise<JobEnvelope<TPayload>> {
    const now = new Date();
    const delayMs = options.delayMs ?? 0;
    const envelope: JobEnvelope<TPayload> = {
      id: randomUUID(),
      name,
      payload,
      status: delayMs > 0 ? "retrying" : "queued",
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      backoffMs: options.backoffMs ?? 1_000,
      tenantId: options.tenantId,
      userId: options.userId,
      correlationId: options.correlationId ?? randomUUID(),
      runAfter: new Date(now.getTime() + delayMs).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await this.save(envelope);

    if (delayMs > 0) {
      await this.redis.command("ZADD", this.delayedKey, String(new Date(envelope.runAfter).getTime()), envelope.id);
    } else {
      await this.redis.command("RPUSH", this.pendingKey, envelope.id);
    }

    return envelope;
  }

  async dequeue(now = new Date()): Promise<JobEnvelope | null> {
    await this.promoteDueJobs(now);

    const jobId = await this.redis.command("LPOP", this.pendingKey);

    if (typeof jobId !== "string") {
      return null;
    }

    const envelope = await this.getJob(jobId);

    if (!envelope) {
      return null;
    }

    const processing = {
      ...envelope,
      status: "processing" as const,
      updatedAt: now.toISOString(),
    };

    await this.save(processing);

    return processing;
  }

  async complete(job: JobEnvelope, now = new Date()): Promise<JobEnvelope> {
    const completed = {
      ...job,
      status: "completed" as const,
      updatedAt: now.toISOString(),
    };

    await this.redis.command("DEL", this.dataKey(job.id));

    return completed;
  }

  async fail(job: JobEnvelope, error: unknown, now = new Date()): Promise<JobEnvelope> {
    const attempts = job.attempts + 1;
    const lastError = serializeError(error);

    if (attempts >= job.maxAttempts) {
      const failed = {
        ...job,
        status: "failed" as const,
        attempts,
        lastError,
        updatedAt: now.toISOString(),
      };

      await this.save(failed);
      await this.redis.command("RPUSH", this.failedKey, failed.id);

      return failed;
    }

    const retryDelayMs = calculateBackoffMs(job.backoffMs, attempts);
    const retrying = {
      ...job,
      status: "retrying" as const,
      attempts,
      lastError,
      runAfter: new Date(now.getTime() + retryDelayMs).toISOString(),
      updatedAt: now.toISOString(),
    };

    await this.save(retrying);
    await this.redis.command("ZADD", this.delayedKey, String(new Date(retrying.runAfter).getTime()), retrying.id);

    return retrying;
  }

  async getFailedJobs(limit = 100): Promise<JobEnvelope[]> {
    const ids = await this.redis.command("LRANGE", this.failedKey, "0", String(Math.max(0, limit - 1)));

    if (!Array.isArray(ids)) return [];

    const jobs: JobEnvelope[] = [];

    for (const id of ids) {
      if (typeof id !== "string") continue;
      const job = await this.getJob(id);
      if (job) jobs.push(job);
    }

    return jobs;
  }

  async getJob(id: string): Promise<JobEnvelope | null> {
    const value = await this.redis.command("GET", this.dataKey(id));

    if (typeof value !== "string") {
      return null;
    }

    return JSON.parse(value) as JobEnvelope;
  }

  async promoteDueJobs(now = new Date(), limit = 100): Promise<number> {
    const ids = await this.redis.command(
      "ZRANGEBYSCORE",
      this.delayedKey,
      "-inf",
      String(now.getTime()),
      "LIMIT",
      "0",
      String(limit),
    );

    if (!Array.isArray(ids) || ids.length === 0) {
      return 0;
    }

    let promoted = 0;

    for (const value of ids) {
      if (typeof value !== "string") continue;
      const removed = await this.redis.command("ZREM", this.delayedKey, value);
      if (removed !== 1) continue;

      const job = await this.getJob(value);
      if (!job) continue;

      await this.save({
        ...job,
        status: "queued",
        updatedAt: now.toISOString(),
      });
      await this.redis.command("RPUSH", this.pendingKey, value);
      promoted += 1;
    }

    return promoted;
  }

  private async save(job: JobEnvelope): Promise<void> {
    await this.redis.command("SET", this.dataKey(job.id), JSON.stringify(job));
  }

  private dataKey(id: string): string {
    return `${this.prefix}:data:${id}`;
  }

  private get pendingKey(): string {
    return `${this.prefix}:pending`;
  }

  private get delayedKey(): string {
    return `${this.prefix}:delayed`;
  }

  private get failedKey(): string {
    return `${this.prefix}:failed`;
  }
}

let defaultQueue: JobQueue | undefined;

export function getDefaultJobQueue(): JobQueue {
  defaultQueue ??= new JobQueue();
  return defaultQueue;
}

export function resetDefaultJobQueueForTests(): void {
  defaultQueue = undefined;
}

function calculateBackoffMs(baseBackoffMs: number, attempts: number): number {
  return baseBackoffMs * 2 ** Math.max(0, attempts - 1);
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown job error.";
}

export function assertRedisString(value: RedisValue): string {
  if (typeof value !== "string") {
    throw new Error("Expected Redis string response.");
  }

  return value;
}
