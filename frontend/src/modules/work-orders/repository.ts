import { isMockMode } from "../../config/env";
import { mockEvidence, mockTimeline, mockWorkOrders } from "../../mocks/work-orders/workOrders";
import type { WorkOrder } from "./types";

// B-SAN3-01 ciclo 2 (P3) — repositório LEGADO, sem rota viva (só as páginas de `src/pages/WorkOrder*Page.tsx`, que
// nenhuma rota monta, o importam). Continuava entregando OS de demonstração sem perguntar pelo modo: dentro do
// escopo do guard G1 por alcance, o mock só é alcançável no ramo verdadeiro de `isMockMode()`; fora dele, falha
// alto em vez de inventar. A remoção do legado é da `P-SAN3-01-OS-LEGADO-MORTO` (exige `frontend/src/pages/**`).
const UNAVAILABLE = "work_orders_legacy_repository_unavailable";

export async function listWorkOrders(): Promise<WorkOrder[]> {
  if (isMockMode()) return mockWorkOrders;
  throw new Error(UNAVAILABLE);
}

export async function getWorkOrder(workOrderId: string) {
  if (isMockMode()) {
    const workOrder = mockWorkOrders.find((item) => item.id === workOrderId) ?? mockWorkOrders[0];
    return { workOrder, timeline: mockTimeline, evidence: mockEvidence };
  }
  throw new Error(UNAVAILABLE);
}

export async function createWorkOrderDraft(input: Partial<WorkOrder>) {
  if (isMockMode()) return { id: "wo-draft", code: "OS-RASCUNHO", ...input };
  throw new Error(UNAVAILABLE);
}
