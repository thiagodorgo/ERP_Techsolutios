import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { createDefaultCloudUsageService } from "./cloud-usage.service.js";

export const CLOUD_USAGE_AGGREGATE_DAILY_JOB = "cloud-usage.aggregate-daily";

export function createCloudUsageAggregateDailyJobHandler(): JobHandler {
  return async (payload) => {
    const rawDate = typeof payload.date === "string" ? payload.date : new Date().toISOString();
    const date = new Date(rawDate);
    const service = await createDefaultCloudUsageService();

    await service.aggregateDailyUsage(Number.isNaN(date.getTime()) ? new Date() : date);
  };
}
