import type { ChecklistRunStatus } from "./types";

/**
 * CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — estado de TRAVA da vistoria, na linguagem do negócio.
 *
 * O backend responde 409 em qualquer escrita numa vistoria concluída (é a prova do estado do veículo) ou
 * cancelada. A tela não pode só desabilitar o botão e ficar muda: precisa dizer POR QUE não dá mais para
 * escrever e qual é a saída (pedir a reabertura ao gestor, que cria uma nova versão preservando esta).
 *
 * Fica em módulo próprio porque a tela de execuções (PR-05) mostra a mesma trava — a cópia tem de ser UMA só.
 */
export type ChecklistRunLock = {
  readonly title: string;
  readonly notice: string;
};

export function describeChecklistRunLock(status: ChecklistRunStatus | undefined | null): ChecklistRunLock | null {
  if (status === "completed" || status === "completed_with_divergence") {
    return {
      title: "Vistoria concluída — somente leitura",
      notice:
        "Vistoria concluída e assinada. Ela é a prova do estado do veículo e não pode mais ser alterada — para corrigir, peça a reabertura ao gestor: uma nova versão é criada e esta fica preservada no histórico.",
    };
  }

  if (status === "cancelled") {
    return {
      title: "Vistoria cancelada — somente leitura",
      notice:
        "Vistoria cancelada. Ela não recebe mais preenchimento — inicie uma nova vistoria pela ordem de serviço.",
    };
  }

  return null;
}

export function isChecklistRunLocked(status: ChecklistRunStatus | undefined | null): boolean {
  return describeChecklistRunLock(status) !== null;
}
