import type { JobHandler } from "../../infra/jobs/job.registry.js";
import type { CloudCostAllocationStrategy } from "./cloud-cost-allocation.types.js";
import { createDefaultCloudCostAllocationService } from "./cloud-cost-allocation.service.js";

export const CLOUD_COST_ALLOCATION_RUN_JOB = "cloud-cost-allocation.run" as const;

export type CloudCostAllocationRunJobPayload = {
  readonly runId?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly strategy?: CloudCostAllocationStrategy;
  readonly createdBy?: string;
};

export function createCloudCostAllocationRunJobHandler(): JobHandler<CloudCostAllocationRunJobPayload> {
  return async (payload) => {
    const service = await createDefaultCloudCostAllocationService();

    if (payload.runId) {
      await service.executeAllocationRun(payload.runId);
      return;
    }

    if (!payload.periodStart || !payload.periodEnd) {
      throw new Error("cloud-cost-allocation.run requires runId or periodStart/periodEnd.");
    }

    await service.allocateCostsForPeriod({
      periodStart: new Date(payload.periodStart),
      periodEnd: new Date(payload.periodEnd),
      strategy: payload.strategy,
      createdBy: payload.createdBy,
    });
  };
}
