import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import { adaptDispatchesResponse } from "../operations/dispatches/dispatches.adapter";
import type { DispatchListItem } from "../operations/dispatches/dispatches.types";
import { isActiveDispatch } from "./work-orders-row.logic";
import type { WorkOrdersApiContext } from "./work-orders.types";

// Ω3F-9 (D-Ω3F-9-REVOGAR) — descoberta LAZY do envio (despacho) ativo de uma OS, disparada só no clique de
// "Revogar envio" (zero GET por linha no render). Reusa GET /operations/dispatches?workOrderId=X (perm
// field_dispatch:read). NÃO usa listDispatchesFromApi de propósito: aquele mascara "lista vazia" com dados
// mock de demonstração — aqui, vazio TEM de significar "sem envio". Devolve o primeiro despacho ATIVO (não
// terminal) ou null. Erros de rede NÃO são engolidos: quem chama trata (mensagem por-linha).
export async function findActiveDispatch(
  context: WorkOrdersApiContext,
  workOrderId: string,
): Promise<DispatchListItem | null> {
  if (isMockMode()) return null; // modo demonstração não tem envio real a revogar

  const response = await apiRequest<unknown>(
    `/operations/dispatches?workOrderId=${encodeURIComponent(workOrderId)}`,
    context,
  );
  const data = adaptDispatchesResponse(response, "api");
  // Re-filtra por workOrderId no cliente (endurecimento): confiamos no filtro tenant+workOrderId do backend,
  // mas se algum dia o serializer devolver despacho de outra OS, nunca revogamos o envio errado.
  return data.items.find((dispatch) => dispatch.workOrderId === workOrderId && isActiveDispatch(dispatch.status)) ?? null;
}
