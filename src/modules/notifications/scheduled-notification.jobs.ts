import { getDefaultJobQueue } from "../../infra/jobs/job.queue.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import {
  SCHEDULED_NOTIFICATION_SCAN_INTERVAL_MS,
  runScheduledNotificationScan,
} from "./scheduled-notification.service.js";

// Ω4C PR-04 (D-Ω4C-NOTIF-SCHEDULER) — job recorrente AUTO-REENFILEIRANTE `notifications.scan-due`. Reusa o
// scheduler in-process `job.worker.ts` (setInterval → dequeue → registry): a cada tick varre os tenants ativos
// e dispara as ocorrências devidas, depois re-enfileira a si mesmo com delay fixo (60s) via o ZSET de atrasados
// já existente — recorrência SEM lib nova (node-cron PROIBIDO). O worker só sobe atrás da flag
// JOBS_WORKER_ENABLED (default OFF) em src/server.ts → CI/testes (que importam app.ts) NUNCA sobem o loop.
export function createNotificationsScanDueJobHandler(): JobHandler {
  return async () => {
    try {
      await runScheduledNotificationScan(new Date());
    } finally {
      // Re-enfileira SEMPRE (mesmo se a varredura falhar) para manter a recorrência viva.
      await getDefaultJobQueue().enqueue(
        "notifications.scan-due",
        {},
        { delayMs: SCHEDULED_NOTIFICATION_SCAN_INTERVAL_MS },
      );
    }
  };
}

// Enfileira o 1º tick. Chamado por src/server.ts quando o worker é ligado (flag ON + persistence=prisma).
export async function enqueueInitialScheduledNotificationScan(): Promise<void> {
  await getDefaultJobQueue().enqueue("notifications.scan-due", {}, { delayMs: SCHEDULED_NOTIFICATION_SCAN_INTERVAL_MS });
}
