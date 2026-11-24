import { getDefaultJobQueue } from "../../infra/jobs/job.queue.js";
import type { JobHandler } from "../../infra/jobs/job.registry.js";
import {
  COMMISSION_RECONCILE_SCAN_INTERVAL_MS,
  runCommissionReconcileScan,
} from "./commission-reconcile.service.js";

// B-COMISSAO-MOTOR (F3, §3.4) — job recorrente auto-reenfileirante `commissions.reconcile`.
// Espelha `impound.reconcile-removals`: reusa o scheduler in-process (job.worker.ts; setInterval → dequeue →
// registry), varre as organizações ativas dentro de `withTenantRls` e re-enfileira a si mesmo a cada 60 s.
export function createCommissionsReconcileJobHandler(): JobHandler {
  return async () => {
    try {
      await runCommissionReconcileScan();
    } finally {
      await getDefaultJobQueue().enqueue(
        "commissions.reconcile",
        {},
        { delayMs: COMMISSION_RECONCILE_SCAN_INTERVAL_MS },
      );
    }
  };
}

export async function enqueueInitialCommissionsReconcileScan(): Promise<void> {
  await getDefaultJobQueue().enqueue(
    "commissions.reconcile",
    {},
    { delayMs: COMMISSION_RECONCILE_SCAN_INTERVAL_MS },
  );
}
