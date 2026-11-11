import type { JobHandler } from "../../infra/jobs/job.registry.js";
import type { CloudCostAllocationStrategy } from "./cloud-cost-allocation.types.js";
import {
  createDefaultCloudCostAllocationService,
  type CloudCostAllocationService,
} from "./cloud-cost-allocation.service.js";

export const CLOUD_COST_ALLOCATION_RUN_JOB = "cloud-cost-allocation.run" as const;

export type CloudCostAllocationRunJobPayload = {
  readonly runId?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly strategy?: CloudCostAllocationStrategy;
  readonly createdBy?: string;
  /**
   * B-ASS-09a — o rateio automático usa o MESMO job, sem nome novo (a lista fechada de jobs do `san3-05` não muda):
   * `import_auto` executa as runs automáticas `pending` de `importId`. Sem `mode`, o caminho é o de antes.
   */
  readonly mode?: "import_auto" | "import_catch_up";
  readonly importId?: string;
};

export type CloudCostAllocationRunJobDeps = {
  /** Só os testes injetam; em produção é o serviço padrão (Prisma). */
  readonly getService?: () => Promise<CloudCostAllocationService>;
};

export function createCloudCostAllocationRunJobHandler(
  deps: CloudCostAllocationRunJobDeps = {},
): JobHandler<CloudCostAllocationRunJobPayload> {
  const getService = deps.getService ?? createDefaultCloudCostAllocationService;

  return async (payload) => {
    if (payload.mode === "import_auto") {
      if (!payload.importId) {
        throw new Error("cloud-cost-allocation.run mode import_auto requires importId.");
      }
      const service = await getService();
      await service.executeImportRuns(payload.importId);
      return;
    }

    const service = await getService();

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
