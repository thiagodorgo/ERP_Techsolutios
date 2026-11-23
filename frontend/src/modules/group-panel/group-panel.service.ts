import { isMockMode } from "../../config/env";
import { ApiError, apiRequest } from "../../services/api/client";
import { adaptGroupPanelScope, adaptGroupPanelSummary } from "./group-panel.adapter";
import type { GroupPanelApiContext, GroupPanelFailure, GroupPanelResult, GroupPanelScope, GroupPanelSummary } from "./group-panel.types";

// B-GRUPO-GESTOR-1b — as duas leituras do Painel do grupo (molde de `finance/dashboard/financial-summary.service.ts`).
// As rotas não recebem parâmetro: nenhum identificador de organização vai no caminho, na query nem no corpo (P-E do
// plano); o contexto é o mesmo de toda chamada da sessão. D-007: modo mock devolve o Painel VAZIO (sem número
// inventado); erro real devolve a falha classificada, para a tela distinguir "acesso não permitido" de "erro".

export const GROUP_PANEL_SCOPE_ROUTE = "/group-panel/scope";
export const GROUP_PANEL_SUMMARY_ROUTE = "/group-panel/summary";

const MOCK_SCOPE: GroupPanelScope = { inGroup: false, overLimit: false, omittedCount: 0, organizations: [] };

export async function getGroupPanelScope(context: GroupPanelApiContext): Promise<GroupPanelResult<GroupPanelScope>> {
  if (isMockMode()) return { ok: true, data: MOCK_SCOPE };
  try {
    const adapted = adaptGroupPanelScope(await apiRequest<unknown>(GROUP_PANEL_SCOPE_ROUTE, context));
    return adapted.ok ? { ok: true, data: adapted.data } : { ok: false, failure: invalidPayload() };
  } catch (error) {
    return { ok: false, failure: classifyGroupPanelError(error) };
  }
}

export async function getGroupPanelSummary(context: GroupPanelApiContext): Promise<GroupPanelResult<GroupPanelSummary>> {
  if (isMockMode()) {
    return {
      ok: true,
      data: { generatedAt: new Date().toISOString(), coverage: { complete: true, included: 0, failed: [], reason: null, withoutAccess: [] }, consolidated: null, organizations: [] },
    };
  }
  try {
    const adapted = adaptGroupPanelSummary(await apiRequest<unknown>(GROUP_PANEL_SUMMARY_ROUTE, context));
    return adapted.ok ? { ok: true, data: adapted.data } : { ok: false, failure: invalidPayload() };
  } catch (error) {
    return { ok: false, failure: classifyGroupPanelError(error) };
  }
}

/** 403 do servidor é "acesso não permitido" (o servidor é a autoridade); o resto é erro com nova tentativa. */
export function classifyGroupPanelError(error: unknown): GroupPanelFailure {
  if (error instanceof ApiError && error.status === 403) {
    return { kind: "forbidden", reason: error.reason === "not_group_manager" ? "not_group_manager" : "sem_permissao" };
  }
  if (error instanceof ApiError && error.status >= 500) {
    return { kind: "error", message: "O servidor não conseguiu ler os pátios agora. Nenhum número foi mostrado." };
  }
  return { kind: "error", message: "Não foi possível consultar o Painel do grupo." };
}

function invalidPayload(): GroupPanelFailure {
  return { kind: "error", message: "A resposta do servidor veio incompleta. Nenhum número foi mostrado." };
}
