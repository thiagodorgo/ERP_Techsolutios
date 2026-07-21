import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import { adaptStatementGroup, adaptStatementLedger, emptyLedger } from "./statement.adapter";
import type {
  ProfessionalStatementGroup,
  ProfessionalStatementLedger,
  StatementAdjustmentPayload,
  StatementApiContext,
  StatementQuery,
} from "./statement.types";

// EXT-03 — extrato de UM profissional (operatorProfileId OBRIGATÓRIO na query). D-007: nunca fabricar
// linhas; modo mock → razão vazio; 403 → estado "acesso não permitido" (§7); erro real → fallback vazio.
export async function getProfessionalStatement(
  context: StatementApiContext,
  operatorProfileId: string,
  params: StatementQuery = {},
): Promise<ProfessionalStatementLedger> {
  if (isMockMode()) {
    return emptyLedger(operatorProfileId, "mock");
  }

  try {
    const response = await apiRequest<unknown>(`/professional-statements${buildQuery(operatorProfileId, params)}`, context);
    return adaptStatementLedger(response, operatorProfileId, "api");
  } catch (error) {
    // §7 — 403 é o estado "acesso não permitido" (a UI molda; o backend é a autoridade). Distinto do
    // fallback genérico para não mascarar revogação de permissão / dado desatualizado.
    if (error instanceof ApiError && error.status === 403) {
      return emptyLedger(operatorProfileId, "forbidden");
    }
    return emptyLedger(operatorProfileId, "fallback", "Não foi possível consultar o extrato do profissional.");
  }
}

// D-Ω4C-EXTRATO-CREATE-SCOPE — o POST cria SOMENTE AJUSTE (o backend força entry_type=adjustment). Enviamos
// snake_case (contrato documentado); a direção é escolhida (débito OU crédito).
export async function createStatementAdjustment(
  context: StatementApiContext,
  payload: StatementAdjustmentPayload,
): Promise<ProfessionalStatementGroup | null> {
  const response = await apiRequest<unknown>("/professional-statements", {
    ...context,
    method: "POST",
    body: {
      operator_profile_id: payload.operatorProfileId,
      direction: payload.direction,
      description: payload.description,
      amount: payload.amount,
      installment_total: payload.installmentTotal,
      first_due_date: payload.firstDueDate,
    },
  });
  return adaptStatementGroup(response);
}

// RN-EXT-01 — DELETE lógico ("retirar do extrato"). Trava com 409 se houver parcela liquidada; o chamador
// mapeia o 409 para a mensagem do AutEM (interpretRemoveError).
export async function removeStatementGroup(context: StatementApiContext, groupId: string): Promise<ProfessionalStatementGroup | null> {
  const response = await apiRequest<unknown>(`/professional-statements/${groupId}`, {
    ...context,
    method: "DELETE",
  });
  return adaptStatementGroup(response);
}

function buildQuery(operatorProfileId: string, params: StatementQuery): string {
  const query = new URLSearchParams();
  query.set("operator_profile_id", operatorProfileId);
  if (params.entryType?.trim()) query.set("entry_type", params.entryType.trim());
  if (params.from?.trim()) query.set("from", params.from.trim());
  if (params.to?.trim()) query.set("to", params.to.trim());
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return `?${query.toString()}`;
}
