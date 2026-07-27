import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptStatement } from "./charges.adapter";
import type { ChargeCreateInput, ChargeStatementView, ChargesApiContext } from "./charges.types";

// Guia de débitos (memória de cálculo, RN-DIA-06). Caminho REAL = /charges/statement (4 segmentos; SEM query —
// asOf é "agora" server-side). D-007: modo mock → null (guia vazia honesta, NUNCA fabricar linhas de dinheiro).
export async function getStatement(context: ChargesApiContext, processId: string): Promise<ChargeStatementView | null> {
  if (isMockMode() || !processId) return null;
  const response = await apiRequest<unknown>(`/impound-processes/${encodeURIComponent(processId)}/charges/statement`, context);
  return adaptStatement(response);
}

// Lançamento manual (charging:create) — ADDITIONAL | ADJUSTMENT. DAILY é engine-only (backend → 422
// daily_is_engine_only): a UI nem oferece. A atomicidade/regra (append-only, alvo do ajuste) vive no backend;
// a UI molda e delega ao 409/422.
export async function createCharge(context: ChargesApiContext, processId: string, input: ChargeCreateInput): Promise<void> {
  await apiRequest<unknown>(`/impound-processes/${encodeURIComponent(processId)}/charges`, {
    ...context,
    method: "POST",
    body: toCreateBody(input),
  });
}

// Corpo em snake_case (contrato do backend — charge.service.ts createManual). ADDITIONAL: quantity × unit_amount
// (total calculado no backend se omitido). ADJUSTMENT: total_amount ASSINADO (delta) + adjustment_of_charge_id
// (obrigatório; unit_amount é a MAGNITUDE >= 0 exigida pelo CHECK do ledger).
function toCreateBody(input: ChargeCreateInput): Record<string, unknown> {
  const body: Record<string, unknown> = { kind: input.kind, currency: input.currency ?? "BRL" };
  if (input.description?.trim()) body.description = input.description.trim();

  if (input.kind === "ADJUSTMENT") {
    if (input.adjustmentOfChargeId) body.adjustment_of_charge_id = input.adjustmentOfChargeId;
    if (input.totalAmount) body.total_amount = input.totalAmount; // assinado (pode ser negativo = estorno)
    body.quantity = input.quantity ?? "1";
    if (input.unitAmount) body.unit_amount = input.unitAmount; // magnitude (>= 0)
    return body;
  }

  // ADDITIONAL — quantidade × valor unitário; total_amount omitido ⇒ backend calcula (aritmética de centavos).
  body.quantity = input.quantity ?? "1";
  if (input.unitAmount) body.unit_amount = input.unitAmount;
  if (input.totalAmount) body.total_amount = input.totalAmount;
  return body;
}
