import type { JobEnvelope, JobName, JobPayload } from "./job.types.js";
import { createAwsCurImportCostFileJobHandler } from "../../modules/cloud-costs/aws-cur.jobs.js";
import { createCloudUsageAggregateDailyJobHandler } from "../../modules/cloud-usage/cloud-usage.jobs.js";
import { createNotificationDispatchJobHandler } from "../../modules/notifications/notification.jobs.js";

export type JobHandler<TPayload extends JobPayload = JobPayload> = (
  payload: TPayload,
  job: JobEnvelope<TPayload>,
) => Promise<void> | void;

export class JobRegistry {
  private readonly handlers = new Map<JobName, JobHandler>();

  register<TPayload extends JobPayload>(name: JobName, handler: JobHandler<TPayload>): void {
    this.handlers.set(name, handler as JobHandler);
  }

  get(name: JobName): JobHandler | undefined {
    return this.handlers.get(name);
  }
}

let defaultRegistry: JobRegistry | undefined;

export function getDefaultJobRegistry(): JobRegistry {
  defaultRegistry ??= createDefaultJobRegistry();
  return defaultRegistry;
}

export function resetDefaultJobRegistryForTests(): void {
  defaultRegistry = undefined;
}

function createDefaultJobRegistry(): JobRegistry {
  const registry = new JobRegistry();

  registry.register("aws-cur.import-cost-file", createAwsCurImportCostFileJobHandler());
  registry.register("checklist-attachment-postprocess", async () => {
    // Placeholder for future checksum enrichment, thumbnail generation, AV scan or cloud sync.
  });
  registry.register("cloud-usage.aggregate-daily", createCloudUsageAggregateDailyJobHandler());
  registry.register("notification-dispatch", createNotificationDispatchJobHandler());
  registry.register("audit-log-fanout", async () => {
    // Placeholder for future audit fanout/export.
  });

  return registry;
}
