import type { DispatchStatus } from "../operations/dispatches/dispatches.types";
import type { WorkOrderStatus } from "./work-orders.types";

// Ω3F-9 — lógica PURA das ações de linha da lista de OS (dar andamento · revogar envio · badge de atraso).
// Predicados exportados e testados diretamente; os componentes os LIGAM ao JSX (lição do Ω3F-6:
// predicado testado ≠ predicado LIGADO). Nada aqui bate na rede.

// Rótulos PT-BR dos status (§11.2: a UI nunca mostra o valor técnico `on_route`). FONTE ÚNICA de rótulo —
// a WorkOrdersPage consome este mapa (tanto no chip de STATUS quanto no botão "Dar andamento"), sem manter
// uma segunda tabela de rótulos.
export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  open: "Aberta",
  assigned: "Atribuída",
  accepted: "Aceita",
  on_route: "Em rota",
  on_site: "No local",
  in_progress: "Em atendimento",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
  rejected: "Recusada",
};

// D-Ω3F-9-ANDAMENTO — mapa de PRÓXIMO passo único, forward-only. Espelha WORK_ORDER_STATUS_TRANSITIONS
// do backend (src/modules/work-orders/work-order.validators.ts) MENOS: `cancelled` (JAMAIS — reabriria a
// porta dos fundos que o Ω3F-6a/6b fechou, P-Ω3F6-STATUS-BYPASS), os terminais, `open` (precisa de
// operador via assign, não é ação de 1 clique) e `in_progress` (bifurca completed[dinheiro] | paused —
// fica no hub/detalhe). O backend é a autoridade final: transição inválida volta 409.
const QUICK_ADVANCE: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  assigned: "accepted",
  accepted: "on_route",
  on_route: "on_site",
  on_site: "in_progress",
  paused: "in_progress",
};

export function nextForwardStatus(status: WorkOrderStatus): WorkOrderStatus | null {
  return QUICK_ADVANCE[status] ?? null;
}

// Rótulo do botão: "Dar andamento → <próximo estado em PT-BR>". null quando não há avanço de 1 clique.
export function advanceLabel(status: WorkOrderStatus): string | null {
  const next = nextForwardStatus(status);
  return next ? `Dar andamento → ${WORK_ORDER_STATUS_LABEL[next]}` : null;
}

// Dar andamento exige `work_orders:status` E um próximo passo válido. A UI só molda; o backend decide.
export function canAdvanceRow(permissions: readonly string[], status: WorkOrderStatus): boolean {
  return permissions.includes("work_orders:status") && nextForwardStatus(status) !== null;
}

// D-Ω3F-9-REVOGAR — status de OS a partir dos quais PODE existir um envio (despacho) ativo a revogar.
// `open` ainda não tem envio; terminais não revogam. A EXISTÊNCIA real do despacho é confirmada no clique
// (descoberta lazy via findActiveDispatch), não aqui.
const REVOCABLE_WO_STATUSES: readonly WorkOrderStatus[] = [
  "assigned",
  "accepted",
  "on_route",
  "on_site",
  "in_progress",
  "paused",
];

// Revogar envio precisa das DUAS permissões que o fluxo usa: `field_dispatch:read` (descobrir o despacho
// ativo via GET /operations/dispatches?workOrderId=X) e `field_dispatch:cancel` (o cancelamento em si). Todo
// portador de cancel também tem read hoje (verificado na junta), mas exigir ambas evita o beco de um papel
// com cancel sem read ver o botão e só colher "não foi possível consultar o envio".
export function canRevokeDispatch(permissions: readonly string[], status: WorkOrderStatus): boolean {
  return (
    permissions.includes("field_dispatch:cancel") &&
    permissions.includes("field_dispatch:read") &&
    REVOCABLE_WO_STATUSES.includes(status)
  );
}

// Um despacho é ATIVO (revogável) enquanto não terminal. Espelha assertNonTerminalStatus do backend
// (src/modules/field-dispatch/field-dispatch.validators.ts): só completed/cancelled/failed são terminais.
export function isActiveDispatch(status: DispatchStatus): boolean {
  return status !== "completed" && status !== "cancelled" && status !== "failed";
}

// D-Ω3F-9-BADGE — atraso DERIVADO (zero migration; NÃO há campo de prazo real — ver P-Ω3F-9-SLA-FIELD).
// Atrasada = agendada para o passado E ainda não finalizada. `critical` quando vencida há mais de 24h.
// Não reproduz "Xh restantes" do protótipo (isso exige deadline real).
const FINAL_WO_STATUSES: readonly WorkOrderStatus[] = ["completed", "cancelled", "rejected"];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type DelaySeverity = "warn" | "critical";
export type WorkOrderDelay = { readonly delayed: boolean; readonly severity: DelaySeverity | null };

export function isWorkOrderDelayed(
  scheduledFor: string | null | undefined,
  status: WorkOrderStatus,
  now: number = Date.now(),
): WorkOrderDelay {
  if (!scheduledFor || FINAL_WO_STATUSES.includes(status)) return { delayed: false, severity: null };
  const scheduled = new Date(scheduledFor).getTime();
  if (Number.isNaN(scheduled) || scheduled >= now) return { delayed: false, severity: null };
  return { delayed: true, severity: now - scheduled > ONE_DAY_MS ? "critical" : "warn" };
}
