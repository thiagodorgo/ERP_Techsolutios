import type { ListWorkOrderFinancialResult, WorkOrderFinancialItem } from "./work-order-financial.types.js";

// §2.8 (allowlist) — o DTO NUNCA emite tenant_id (tenant é resolvido pelo ator autenticado) nem
// client_action_id (token interno da fila offline — espelho do DTO de anexos). Dinheiro SEMPRE
// acompanhado da moeda.
export function toWorkOrderFinancialItemDto(item: WorkOrderFinancialItem) {
  return {
    id: item.id,
    workOrderId: item.workOrderId,
    tariffId: item.tariffId ?? null,
    priceTableId: item.priceTableId ?? null,
    description: item.description,
    quantity: item.quantity,
    unitAmount: item.unitAmount,
    totalAmount: item.totalAmount,
    currency: item.currency,
    source: item.source,
    notes: item.notes ?? null,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// B1 (crítico + lição recorrente) — o list DTO emite TODOS os campos que a tela lê: cada linha com
// dinheiro + moeda + proveniência (tariffId), e o TOTAL AGREGADO já somado no backend (só itens
// não-deletados). O front NUNCA soma — a classe de bug que reprovou 4 blocos.
export function toWorkOrderFinancialListDto(result: ListWorkOrderFinancialResult) {
  return {
    items: result.items.map(toWorkOrderFinancialItemDto),
    totalAmount: result.totalAmount,
    currency: result.currency,
  };
}
