import { JobQueue, getDefaultJobQueue } from "./job.queue.js";
import { JobRegistry, getDefaultJobRegistry } from "./job.registry.js";
import {
  captureJobExecution,
  type JobExecutionUsageSource,
} from "../../modules/cloud-usage/cloud-usage.capture.js";

export type JobWorkerOptions = {
  readonly queue?: JobQueue;
  readonly registry?: JobRegistry;
  readonly pollIntervalMs?: number;
  readonly logger?: Pick<Console, "info" | "warn" | "error">;
  readonly captureJobExecution?: (job: JobExecutionUsageSource) => Promise<void>;
};

export class JobWorker {
  private readonly queue: JobQueue;
  private readonly registry: JobRegistry;
  private readonly logger: Pick<Console, "info" | "warn" | "error">;
  private readonly captureJobExecution: (job: JobExecutionUsageSource) => Promise<void>;
  private timer: NodeJS.Timeout | undefined;
  private lastSuccessfulTickAtValue: Date | undefined;

  constructor(options: JobWorkerOptions = {}) {
    this.queue = options.queue ?? getDefaultJobQueue();
    this.registry = options.registry ?? getDefaultJobRegistry();
    this.logger = options.logger ?? console;
    this.captureJobExecution = options.captureJobExecution ?? captureJobExecution;
  }

  /**
   * Ω6R-DIN-006 — instante do último tick que RESOLVEU (com job ou com fila vazia). É o sinal que
   * o `/health/worker` lê. `undefined` = o laço ainda não completou nenhum tick.
   */
  get lastSuccessfulTickAt(): Date | undefined {
    return this.lastSuccessfulTickAtValue;
  }

  /**
   * O carimbo mora AQUI, depois de `runTick()` resolver — e NÃO no topo do callback do
   * `setInterval`. A diferença é o ponto: um tick que REJEITA (Redis fora ⇒ `dequeue` lança) não
   * pode contar como vivo. Marcado no topo, o worker inútil responderia "up"; marcado aqui, o
   * sinal envelhece e vira `stale`, que é a verdade.
   */
  async processNextJob(): Promise<boolean> {
    const processed = await this.runTick();

    this.lastSuccessfulTickAtValue = new Date();

    return processed;
  }

  private async runTick(): Promise<boolean> {
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
      if (job.tenantId) {
        await this.captureJobExecution(job);
      }
      await this.queue.complete(job);
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
