import type { JobHandler } from "../../infra/jobs/job.registry.js";
import type { CloudChargeCalculationStrategy } from "./cloud-charge.types.js";
import { createDefaultCloudChargeService } from "./cloud-charge.service.js";

export const CLOUD_CHARGES_CALCULATE_JOB = "cloud-charges.calculate" as const;

export type CloudChargesCalculateJobPayload = {
  readonly runId?: string;
  readonly sourceAllocationRunId?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly strategy?: CloudChargeCalculationStrategy;
  readonly createdBy?: string;
};

export function createCloudChargesCalculateJobHandler(): JobHandler<CloudChargesCalculateJobPayload> {
  return async (payload) => {
    const service = await createDefaultCloudChargeService();

    if (payload.runId) {
      await service.executeCalculationRun(payload.runId);
      return;
    }

    if (!payload.sourceAllocationRunId || !payload.periodStart || !payload.periodEnd) {
      throw new Error("cloud-charges.calculate requires runId or sourceAllocationRunId with periodStart/periodEnd.");
    }

    await service.calculateTenantChargesForAllocationRun({
      sourceAllocationRunId: payload.sourceAllocationRunId,
      periodStart: new Date(payload.periodStart),
      periodEnd: new Date(payload.periodEnd),
      strategy: payload.strategy,
      createdBy: payload.createdBy,
    });
  };
}
