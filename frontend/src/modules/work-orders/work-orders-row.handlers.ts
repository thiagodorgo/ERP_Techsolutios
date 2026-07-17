import { updateDispatchStatus } from "../operations/dispatches/dispatches.service";
import { findActiveDispatch } from "./active-dispatch.service";
import { advanceWorkOrderStatus } from "./work-orders.service";
import { nextForwardStatus } from "./work-orders-row.logic";
import type { WorkOrderListItem, WorkOrdersApiContext } from "./work-orders.types";

// Ω3F-9 (pós-análise M1) — handlers das ações de linha extraídos como funções de efeito com DEPS INJETADAS,
// para que a FIAÇÃO da página seja testável no mesmo harness SSR (a lição do próprio bloco: handler testado
// ≠ handler LIGADO). A WorkOrdersPage só injeta os setters de state e decide o que fazer com o retorno.

export type RevokeTarget = { readonly workOrder: WorkOrderListItem; readonly dispatchId: string };

export type RowActionDeps = {
  readonly context: WorkOrdersApiContext;
  readonly refresh: () => Promise<void>;
  readonly setBusy: (id: string, value: boolean) => void;
  readonly setError: (id: string, value: string | null) => void;
};

// Avança o status forward-only (reusa PATCH /status). Erro do backend vira mensagem por-linha; a lista não quebra.
export async function runAdvance(deps: RowActionDeps, order: WorkOrderListItem): Promise<void> {
  const next = nextForwardStatus(order.status);
  if (!next) return;
  deps.setError(order.id, null);
  deps.setBusy(order.id, true);
  try {
    await advanceWorkOrderStatus(deps.context, order.id, next);
    await deps.refresh();
  } catch {
    deps.setError(order.id, "Não foi possível dar andamento agora.");
  } finally {
    deps.setBusy(order.id, false);
  }
}

// Descobre o envio ativo da OS (lazy). Devolve o alvo do prompt, ou null sinalizando ausência/erro por-linha.
export async function runRevokeDiscovery(
  deps: Omit<RowActionDeps, "refresh">,
  order: WorkOrderListItem,
): Promise<RevokeTarget | null> {
  deps.setError(order.id, null);
  deps.setBusy(order.id, true);
  try {
    const dispatch = await findActiveDispatch(deps.context, order.id);
    if (!dispatch) {
      deps.setError(order.id, "Nenhum envio ativo para esta OS.");
      return null;
    }
    return { workOrder: order, dispatchId: dispatch.id };
  } catch {
    deps.setError(order.id, "Não foi possível consultar o envio.");
    return null;
  } finally {
    deps.setBusy(order.id, false);
  }
}

export type RevokeConfirmDeps = {
  readonly context: WorkOrdersApiContext;
  readonly refresh: () => Promise<void>;
};

// Confirma o revogar (cancela o despacho com motivo). Devolve `true` no sucesso ou a mensagem de erro a exibir.
export async function runRevokeConfirm(
  deps: RevokeConfirmDeps,
  target: RevokeTarget,
  reason: string,
): Promise<true | string> {
  try {
    await updateDispatchStatus(deps.context, target.dispatchId, { status: "cancelled", reason });
    await deps.refresh();
    return true;
  } catch {
    return "Não foi possível revogar o envio. Ele pode já ter sido finalizado.";
  }
}
