import { getDefaultJobQueue } from "../../infra/jobs/job.queue.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { IMPOUND_NOTIFY_DUE_SCAN_INTERVAL_MS, runImpoundNotifyDueScan } from "./impound.notifications.sweep.service.js";

// Ω5P PR-09 — job recorrente AUTO-REENFILEIRANTE `impound.notify-due`. Espelha `charging.accrue-daily`: reusa o
// scheduler in-process (job.worker.ts; setInterval → dequeue → registry), varre os tenants ativos, marca as
// notificações DEVIDAS faltantes e re-enfileira a si mesmo com delay fixo (1h) — recorrência SEM lib nova. O worker
// só sobe atrás da flag JOBS_WORKER_ENABLED (default OFF) em src/server.ts → CI/testes NUNCA sobem o loop. Roda
// como SISTEMA (ator null, fora do RBAC HTTP). Idempotente ((tenant,process,kind)): reexecução/catch-up não dupla.
export function createImpoundNotifyDueJobHandler(): JobHandler {
  return async () => {
    try {
      await runImpoundNotifyDueScan(new Date());
    } finally {
      // Re-enfileira SEMPRE (mesmo se a varredura falhar) para manter a recorrência (catch-up) viva.
      await getDefaultJobQueue().enqueue("impound.notify-due", {}, { delayMs: IMPOUND_NOTIFY_DUE_SCAN_INTERVAL_MS });
    }
  };
}

// Enfileira o 1º tick. Chamado por src/server.ts quando o worker é ligado (flag ON + persistence=prisma).
export async function enqueueInitialImpoundNotifyDueScan(): Promise<void> {
  await getDefaultJobQueue().enqueue("impound.notify-due", {}, { delayMs: IMPOUND_NOTIFY_DUE_SCAN_INTERVAL_MS });
}
