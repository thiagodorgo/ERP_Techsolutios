import { isMockMode } from "../../config/env";
import { mockEvidence, mockTimeline, mockWorkOrders } from "../../mocks/work-orders/workOrders";
import type { WorkOrder } from "./types";

// B-SAN3-01 ciclo 2 (P3) — repositório LEGADO, sem rota viva (só as páginas de `src/pages/WorkOrder*Page.tsx`, que
// nenhuma rota monta, o importam). Continuava entregando OS de demonstração sem perguntar pelo modo: aqui o mock só é
// alcançável no ramo verdadeiro de `isMockMode()`; fora dele, falha alto em vez de inventar. B-SAN3-01b: o guard `[G1]`
// (`work-orders-honest-errors.test.tsx`) prova isso por alcance em profundidade arbitrária (barrel de N níveis, re-export
// local, `default`, namespace, `import()`) sobre as raízes enumeradas do disco e todo o fecho de import delas, e o `[G1b]`
// prova que nenhuma raiz inventa entidade inline (`id`/`code` constante) em ramo de falha. O que o guard não prova: ramo
// de falha sem `catch`/`.catch(`/`??`/`||`, identidade por outra chave ou não constante, dado de demonstração fora de
// `*.mock`/`mocks/`. A remoção do legado é da `P-SAN3-01-OS-LEGADO-MORTO` (exige `frontend/src/pages/**`).
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
