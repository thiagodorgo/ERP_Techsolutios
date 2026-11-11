import type { JobHandler } from "../../infra/jobs/job.registry.js";
import {
  defaultImportTriggerLogger,
  enqueueOnDefaultJobQueue,
  errorCode,
  runImportCatchUp,
  type CloudCostAllocationEnqueue,
  type ImportTriggerLogger,
} from "./cloud-cost-allocation.import-trigger.js";
import type { CloudCostAllocationStrategy } from "./cloud-cost-allocation.types.js";
import {
  createDefaultCloudCostAllocationService,
  type CloudCostAllocationService,
} from "./cloud-cost-allocation.service.js";

export const CLOUD_COST_ALLOCATION_RUN_JOB = "cloud-cost-allocation.run" as const;

/** B-ASS-09a · P5 — a varredura de recuperação do rateio automático roda de 6 em 6 horas. */
export const IMPORT_CATCH_UP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** O 1º tique sai 1 minuto depois do boot do worker, para não disputar a subida com as outras varreduras. */
export const IMPORT_CATCH_UP_FIRST_DELAY_MS = 60 * 1000;

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
  /** Só os testes injetam; em produção é o serviço padrão (Prisma), a fila padrão e a varredura de verdade. */
  readonly getService?: () => Promise<CloudCostAllocationService>;
  readonly enqueue?: CloudCostAllocationEnqueue;
  readonly runCatchUp?: () => Promise<unknown>;
  readonly logger?: ImportTriggerLogger;
};

export function createCloudCostAllocationRunJobHandler(
  deps: CloudCostAllocationRunJobDeps = {},
): JobHandler<CloudCostAllocationRunJobPayload> {
  const getService = deps.getService ?? createDefaultCloudCostAllocationService;
  const enqueue = deps.enqueue ?? enqueueOnDefaultJobQueue;
  const logger = deps.logger ?? defaultImportTriggerLogger;
  const runCatchUp = deps.runCatchUp ?? (async () => runImportCatchUp({ allocation: await getService(), enqueue, logger }));

  return async (payload) => {
    if (payload.mode === "import_catch_up") {
      try {
        await runCatchUp();
      } catch (error) {
        // R2-04 — falha GERAL da varredura (ex.: não listou). NÃO relança: a retentativa da fila (3 tentativas) somada ao
        // reenfileiramento abaixo multiplicaria a cadeia recorrente (a classe M-1 do #505, `P-JOBS-REENFILEIRA-MULTIPLICA`).
        logger.error({ code: errorCode(error) }, "cloud_cost_auto_allocation_catch_up_failed");
        // B-ASS-09a R2-04 não relança
      }
      // Reenfileira UMA vez por execução, para manter a recorrência viva.
      await enqueue("cloud-cost-allocation.run", { mode: "import_catch_up" }, { delayMs: IMPORT_CATCH_UP_INTERVAL_MS });
      return;
    }

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

/**
 * B-ASS-09a · P5 — o 1º tique da varredura (auto-reenfileirante de 6 em 6 h). Chamado por `job-worker.bootstrap.ts`
 * quando o worker sobe (flag ligada + persistência Prisma), no padrão de `enqueueInitialSubscriptionMeasureDaily`.
 * Cada boot abre uma cadeia; a varredura é idempotente (id v5 + reivindicação), então a duplicata só repete trabalho.
 */
export async function enqueueInitialCloudAllocationImportCatchUp(
  enqueue: CloudCostAllocationEnqueue = enqueueOnDefaultJobQueue,
): Promise<void> {
  await enqueue("cloud-cost-allocation.run", { mode: "import_catch_up" }, { delayMs: IMPORT_CATCH_UP_FIRST_DELAY_MS });
}
