import { ApiError } from "../../services/api/client";
import { createWorkOrder } from "./work-orders.service";
import type { WorkOrderCreatePayload, WorkOrdersApiContext } from "./work-orders.types";

// B-SAN3-01 (P-008) — o "Salvar OS" da página de criação como função de efeito com DEPS INJETADAS (espelho de
// `runAdvance` em work-orders-row.handlers.ts, lição Ω3F-9: handler testado ≠ handler LIGADO — o teste S1
// confere a fiação). A regra inteira do bloco está aqui: recusa do backend vira MENSAGEM na própria página,
// NUNCA navega sem `workOrder.id`, e o formulário (que continua montado) preserva o que o operador digitou.

export type CreateWorkOrderDeps = {
  readonly context: WorkOrdersApiContext;
  readonly navigate: (to: string) => void;
  readonly setSaving: (value: boolean) => void;
  readonly setError: (value: string | null) => void;
};

export async function runCreateWorkOrder(deps: CreateWorkOrderDeps, payload: WorkOrderCreatePayload): Promise<void> {
  deps.setSaving(true);
  deps.setError(null);
  try {
    const workOrder = await createWorkOrder(deps.context, payload);
    // Sem id não há para onde ir — e navegar para uma OS inexistente era exatamente o defeito.
    if (!workOrder.id) throw new Error("invalid_work_order_response");
    deps.navigate(`/work-orders/${workOrder.id}`);
  } catch (err) {
    deps.setError(createErrorMessage(err));
  } finally {
    deps.setSaving(false);
  }
}

const INVALID_REFERENCE = /^invalid_[a-z_]+_reference$/;

/**
 * Mensagem de negócio por `reason`/status do backend (§4.3-4 do plano). Nunca expõe `reason`, `code`, status
 * HTTP ou termo técnico (§3 do contrato) — o teste C7 varre cada entrada.
 */
export function createErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.reason === "destination_required") return "Este tipo de serviço exige endereço de destino.";
    if (err.reason && INVALID_REFERENCE.test(err.reason)) return "Um dos vínculos informados não é válido nesta organização.";
    if (err.status === 403) return "Sem permissão para criar ordens de serviço.";
    return err.safeMessage;
  }
  if (err instanceof Error && err.message === "invalid_work_order_response") {
    return "O servidor não devolveu a OS criada. Confira a lista antes de tentar de novo — ela pode ter sido criada.";
  }
  return "Não foi possível salvar a ordem de serviço. Verifique a conexão e tente novamente.";
}
