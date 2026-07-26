import { getDefaultJobQueue } from "../../infra/jobs/job.queue.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { IMPOUND_RECONCILE_SCAN_INTERVAL_MS, runImpoundReconcileScan } from "./impound.reconcile.service.js";

// Ω5P PR-06 (D-Ω5P-REC-03 / D-Ω5P-RECON-B) — job recorrente AUTO-REENFILEIRANTE `impound.reconcile-removals`.
// Espelha `notifications.scan-due`: reusa o scheduler in-process (job.worker.ts; setInterval → dequeue →
// registry), varre os tenants ativos, abre a custódia das remoções concluídas sem processo e re-enfileira a si
// mesmo com delay fixo (60s) — recorrência SEM lib nova (node-cron PROIBIDO). O worker só sobe atrás da flag
// JOBS_WORKER_ENABLED (default OFF) em src/server.ts → CI/testes (que importam app.ts) NUNCA sobem o loop.
export function createImpoundReconcileRemovalsJobHandler(): JobHandler {
  return async () => {
    try {
      await runImpoundReconcileScan(new Date());
    } finally {
      // Re-enfileira SEMPRE (mesmo se a varredura falhar) para manter a recorrência (catch-up) viva.
      await getDefaultJobQueue().enqueue("impound.reconcile-removals", {}, { delayMs: IMPOUND_RECONCILE_SCAN_INTERVAL_MS });
    }
  };
}

// Enfileira o 1º tick. Chamado por src/server.ts quando o worker é ligado (flag ON + persistence=prisma).
export async function enqueueInitialImpoundReconcileScan(): Promise<void> {
  await getDefaultJobQueue().enqueue("impound.reconcile-removals", {}, { delayMs: IMPOUND_RECONCILE_SCAN_INTERVAL_MS });
}
