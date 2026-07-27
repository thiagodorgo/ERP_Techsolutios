import { getDefaultJobQueue } from "../../infra/jobs/job.queue.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import { CHARGING_ACCRUAL_SCAN_INTERVAL_MS, runDailyAccrualScan } from "./charge.accrual.service.js";

// Ω5P PR-07 — job recorrente AUTO-REENFILEIRANTE `charging.accrue-daily`. Espelha `impound.reconcile-removals`:
// reusa o scheduler in-process (job.worker.ts; setInterval → dequeue → registry), varre os tenants ativos,
// acumula as diárias faltantes e re-enfileira a si mesmo com delay fixo (1h) — recorrência SEM lib nova. O worker
// só sobe atrás da flag JOBS_WORKER_ENABLED (default OFF) em src/server.ts → CI/testes NUNCA sobem o loop. Roda
// como SISTEMA (ator null, fora do RBAC HTTP). Idempotente (period_seq): reexecução/catch-up não duplica.
export function createChargingAccrueDailyJobHandler(): JobHandler {
  return async () => {
    try {
      await runDailyAccrualScan(new Date());
    } finally {
      // Re-enfileira SEMPRE (mesmo se a varredura falhar) para manter a recorrência (catch-up) viva.
      await getDefaultJobQueue().enqueue("charging.accrue-daily", {}, { delayMs: CHARGING_ACCRUAL_SCAN_INTERVAL_MS });
    }
  };
}

// Enfileira o 1º tick. Chamado por src/server.ts quando o worker é ligado (flag ON + persistence=prisma).
export async function enqueueInitialChargingAccrueScan(): Promise<void> {
  await getDefaultJobQueue().enqueue("charging.accrue-daily", {}, { delayMs: CHARGING_ACCRUAL_SCAN_INTERVAL_MS });
}
