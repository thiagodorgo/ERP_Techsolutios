import { Gavel, LogIn, ShieldCheck, Unlock, type LucideIcon } from "lucide-react";

import { ApiError, apiRequest } from "../../../services/api/client";
import { adaptProcessDetailResponse } from "./processes.adapter";
import type { ImpoundStatus, ProcessDetail, ProcessesApiContext } from "./processes.types";

// ── (6) Ações da FSM — descritor ESTÁTICO que ESPELHA `ENABLED_EDGES` do backend ────────────────────────────
// Fonte de verdade: src/modules/impound/impound.transitions.ts (`ENABLED_EDGES` / `GUARDS` kind:"enabled").
// A §4.2 tem 14 estados, mas HOJE só 4 arestas custódia-nativas estão habilitadas; o resto (liberação/leilão/
// reciclagem) é legal-mas-deferido (backend → 409 transition_not_enabled_yet, dono é PR-10/12/14).
//
// >>> ESPELHO de ENABLED_EDGES — cresce em PR-10/12/14 conforme o backend habilitar novas arestas. <<<
//     Se este descritor divergir do backend, a UI apenas deixa de oferecer/oferece um botão que o backend
//     recusará com 409 defensivo (transitionErrorMessage trata) — nunca quebra. Manter em sincronia manual.
export type FsmAction = {
  readonly from: ImpoundStatus;
  readonly to: ImpoundStatus;
  readonly label: string;
  readonly description: string;
  readonly reasonRequired: boolean; // §§14-15 — fundamento do ato (bloqueio/desbloqueio judicial)
  readonly requiresInspection: boolean; // I3 — graduação só com vistoria de recepção completa (art. 9º I)
  readonly tone: "primary" | "danger";
  readonly icon: LucideIcon;
};

export const FSM_ACTIONS: readonly FsmAction[] = [
  {
    from: "IN_REMOVAL",
    to: "RECEPTION",
    label: "Registrar chegada ao pátio",
    description: "Confirma a entrada do veículo no pátio; inicia a contagem de diárias (t0).",
    reasonRequired: false,
    requiresInspection: false,
    tone: "primary",
    icon: LogIn,
  },
  {
    from: "RECEPTION",
    to: "ACTIVE_CUSTODY",
    label: "Graduar para custódia ativa",
    description: "Conclui a recepção e coloca o processo em custódia ativa (exige vistoria de recepção completa).",
    reasonRequired: false,
    requiresInspection: true,
    tone: "primary",
    icon: ShieldCheck,
  },
  {
    from: "ACTIVE_CUSTODY",
    to: "JUDICIAL_HOLD",
    label: "Registrar bloqueio judicial",
    description: "Registra o bloqueio por ordem judicial. Informe o fundamento do ato (art. 15).",
    reasonRequired: true,
    requiresInspection: false,
    tone: "danger",
    icon: Gavel,
  },
  {
    from: "JUDICIAL_HOLD",
    to: "ACTIVE_CUSTODY",
    label: "Levantar bloqueio judicial",
    description: "Levanta o bloqueio judicial e retorna o processo à custódia ativa. Informe o fundamento.",
    reasonRequired: true,
    requiresInspection: false,
    tone: "primary",
    icon: Unlock,
  },
];

// Ações habilitadas a partir do estado atual — a UI exibe botão SÓ para estas (esconde o que não é acionável).
export function actionsFrom(status: ImpoundStatus | null | undefined): FsmAction[] {
  if (!status) return [];
  return FSM_ACTIONS.filter((action) => action.from === status);
}

// Predicado PURO de habilitação do submit (usado pelo painel e testado direto no smoke). Defense-in-depth: o
// backend re-checa I3/reason (guardReceptionInspection/guardReasonRequired).
export function isTransitionSubmitEnabled(
  action: FsmAction,
  state: { readonly reason: string; readonly inspectionComplete: boolean },
): boolean {
  if (action.requiresInspection && !state.inspectionComplete) return false;
  if (action.reasonRequired && !state.reason.trim()) return false;
  return true;
}

// 409/403 → mensagem PT-BR (white-label). O `reason` vem do corpo do erro do backend ({error:{code,reason}}).
export function transitionErrorMessage(reason: string | null | undefined, status?: number): string {
  switch (reason) {
    case "transition_not_enabled_yet":
      return "Ação ainda não disponível nesta versão.";
    case "invalid_transition":
      return "Transição inválida a partir do estado atual do processo.";
    case "reason_required":
      return "Informe o fundamento desta transição.";
    case "reception_inspection_incomplete":
      return "Conclua a vistoria de recepção antes de graduar para custódia ativa.";
    default:
      if (status === 401 || status === 403) return "Sessão expirada ou sem permissão para alterar o estado.";
      if (status === 409) return "O estado do processo mudou. Recarregue o dossiê e tente novamente.";
      return "Não foi possível concluir a transição.";
  }
}

// Erro tipado da transição — carrega o `reason` do corpo (o cliente HTTP padrão descarta o body do erro; aqui
// lemos o corpo para distinguir os 409 exigidos pela fatia). NÃO vaza corpo cru para a UI.
export class TransitionError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(transitionErrorMessage(reason, status));
    this.name = "TransitionError";
  }
}

// POST /impound-processes/:id/transitions {to, reason?} (impound:transition) via o cliente HTTP COMPARTILHADO
// (`apiRequest`: base URL, Bearer, headers de mock, refresh-retry de 401 + limpeza de sessão) — MESMO caminho de
// allocate/vacate/move/createCharge. O `ApiError` carrega `reason` (discriminador estável do backend) para os 4
// casos 409 (transition_not_enabled_yet / invalid_transition / reason_required / reception_inspection_incomplete).
// `inspection_complete` NÃO é enviado — a guarda I3 lê a vistoria REAL no backend (impound.service.ts).
export async function transitionProcess(
  context: ProcessesApiContext,
  processId: string,
  to: ImpoundStatus,
  reason?: string,
): Promise<ProcessDetail | null> {
  const body: Record<string, unknown> = { to };
  if (reason?.trim()) body.reason = reason.trim();
  try {
    const response = await apiRequest<unknown>(`/impound-processes/${encodeURIComponent(processId)}/transitions`, {
      ...context,
      method: "POST",
      body,
    });
    return adaptProcessDetailResponse(response);
  } catch (err) {
    if (err instanceof ApiError) {
      throw new TransitionError(err.status, err.reason ?? null);
    }
    throw err;
  }
}
